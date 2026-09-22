const db = require('../config/db');

// Listar todos los pagos desde la vista optimizada vw_pagos_detalle
exports.getPagos = async (req, res) => {
  try {
    const { mes, idCliente } = req.query;
    let queryText = 'SELECT * FROM vw_pagos_detalle WHERE 1=1';
    const params = [];

    if (mes) {
      params.push(`${mes}`);
      queryText += ` AND TO_CHAR(Fecha_Pago, 'YYYY-MM') = $${params.length}`;
    }

    if (idCliente) {
      params.push(idCliente);
      queryText += ` AND idCliente = $${params.length}`;
    }

    queryText += ' ORDER BY Fecha_Pago DESC, idPago DESC';

    const result = await db.query(queryText, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener pagos vía vista:', error);
    res.status(500).json({ error: 'Error al obtener pagos', details: error.message });
  }
};

// Registrar un nuevo pago mediante procedimiento almacenado y validación por Trigger
exports.createPago = async (req, res) => {
  const { idMembresia, Monto, Fecha_Pago, Nro_Comprobante } = req.body;
  try {
    if (!idMembresia || Monto === undefined || Monto === null) {
      return res.status(400).json({ error: 'idMembresia y Monto son requeridos' });
    }

    const montoNum = parseFloat(Monto);
    if (isNaN(montoNum) || montoNum <= 0) {
      return res.status(400).json({ error: 'El monto debe ser un valor numérico positivo mayor a 0' });
    }

    // El procedimiento sp_registrar_pago ejecuta la inserción y el trigger trg_validar_pago
    // en PostgreSQL verifica a nivel motor que no existan sobrepagos ni pagos duplicados
    const procRes = await db.query(
      'CALL sp_registrar_pago($1, $2, $3, $4, NULL)',
      [idMembresia, montoNum, Fecha_Pago || null, Nro_Comprobante || null]
    );

    const newId = procRes.rows[0]?.p_id_pago;

    // Obtener detalles del pago creado desde la vista
    const pagoRes = await db.query('SELECT * FROM vw_pagos_detalle WHERE idPago = $1', [newId]);
    const pagoRow = pagoRes.rows[0] || {};

    // Obtener balance actualizado de la membresía desde la vista
    const membRes = await db.query('SELECT total_pagado, saldo_pendiente FROM vw_membresias_detalle WHERE idMembresia = $1', [idMembresia]);
    const totalPagado = parseFloat(membRes.rows[0]?.total_pagado || 0);
    const saldoPendiente = parseFloat(membRes.rows[0]?.saldo_pendiente || 0);

    res.status(201).json({
      ...pagoRow,
      totalPagado,
      saldoPendiente,
      pagadaCompleta: saldoPendiente === 0,
      message: saldoPendiente === 0 
        ? 'Pago completado al 100%. Membresía totalmente cancelada.' 
        : `Abono de Bs. ${montoNum.toFixed(2)} registrado exitosamente. Saldo pendiente: Bs. ${saldoPendiente.toFixed(2)}`,
    });
  } catch (error) {
    if (error.code === '23505' || (error.message && error.message.includes('comprobante ya existe'))) {
      return res.status(400).json({ error: 'El número de comprobante ya existe' });
    }
    // Errores levantados por el trigger de validación de pago de PostgreSQL
    if (error.message && (error.message.includes('totalmente cancelada') || error.message.includes('supera el saldo pendiente'))) {
      return res.status(400).json({ error: error.message });
    }
    console.error('Error al registrar pago vía procedimiento:', error);
    res.status(500).json({ error: 'Error al registrar pago', details: error.message });
  }
};
