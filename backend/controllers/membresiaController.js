const db = require('../config/db');
const { sincronizarMembresiasVencidas } = require('../utils/syncMembresias');

// Listar membresías utilizando la vista vw_membresias_detalle
exports.getMembresias = async (req, res) => {
  try {
    // Sincronizar membresías vencidas mediante el procedimiento almacenado
    await sincronizarMembresiasVencidas();

    const { estado, idCliente } = req.query;
    let queryText = 'SELECT * FROM vw_membresias_detalle WHERE 1=1';
    const params = [];

    if (estado) {
      params.push(estado);
      queryText += ` AND Estado = $${params.length}`;
    }

    if (idCliente) {
      params.push(idCliente);
      queryText += ` AND idCliente = $${params.length}`;
    }

    queryText += ' ORDER BY idMembresia DESC';

    const result = await db.query(queryText, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener membresías vía vista:', error);
    res.status(500).json({ error: 'Error al obtener membresías', details: error.message });
  }
};

// Crear nueva membresía y opcionalmente registrar el pago mediante procedimiento almacenado
exports.createMembresia = async (req, res) => {
  const { idCliente, idPlan, Fecha_Inicio, registrarPago, Monto, Nro_Comprobante } = req.body;

  try {
    if (!idCliente || !idPlan) {
      return res.status(400).json({ error: 'idCliente e idPlan son obligatorios' });
    }

    const montoVal = (registrarPago || Monto !== undefined && Monto !== null && Monto !== '')
      ? (Monto !== undefined && Monto !== null && Monto !== '' ? parseFloat(Monto) : 0.01) // Si se marca registrarPago sin monto, el proc puede calcularlo o se pasa null
      : null;

    // Si registrarPago es true pero Monto no se especificó, buscar el precio del plan para pasarlo al proc
    let montoFinal = null;
    if (registrarPago || (Monto !== undefined && Monto !== null && Monto !== '')) {
      if (Monto !== undefined && Monto !== null && Monto !== '') {
        montoFinal = parseFloat(Monto);
      } else {
        const planRes = await db.query('SELECT Precio FROM Planes WHERE idPlan = $1', [idPlan]);
        if (planRes.rows.length === 0) {
          return res.status(404).json({ error: 'Plan seleccionado no existe' });
        }
        montoFinal = parseFloat(planRes.rows[0].precio);
      }
    }

    const fechaVal = Fecha_Inicio ? Fecha_Inicio : null;

    // sp_crear_membresia ejecuta la transacción en PostgreSQL, calcula Fecha_Fin,
    // desactiva membresías previas y activa al cliente mediante triggers
    const procRes = await db.query(
      'CALL sp_crear_membresia($1, $2, $3, $4, $5, NULL, NULL)',
      [idCliente, idPlan, fechaVal, montoFinal, Nro_Comprobante || null]
    );

    const newMembresiaId = procRes.rows[0]?.p_id_membresia;
    const newPagoId = procRes.rows[0]?.p_id_pago;

    // Obtener la membresía creada desde la vista consolidada
    const membresiaRes = await db.query(
      'SELECT * FROM vw_membresias_detalle WHERE idMembresia = $1',
      [newMembresiaId]
    );

    let pagoCreado = null;
    if (newPagoId) {
      const pagoRes = await db.query(
        'SELECT * FROM vw_pagos_detalle WHERE idPago = $1',
        [newPagoId]
      );
      pagoCreado = pagoRes.rows[0] || null;
    }

    res.status(201).json({
      membresia: membresiaRes.rows[0] || { idMembresia: newMembresiaId },
      pago: pagoCreado,
      message: 'Membresía creada con éxito. Cliente activado automáticamente.',
    });
  } catch (error) {
    console.error('Error al registrar membresía vía procedimiento:', error);
    res.status(500).json({ error: 'Error al registrar membresía', details: error.message });
  }
};

// Cambiar estado de membresía mediante procedimiento almacenado
exports.updateEstado = async (req, res) => {
  const { id } = req.params;
  const { Estado } = req.body;
  try {
    if (!['Activa', 'Inactiva', 'Vencida', 'Pendiente'].includes(Estado)) {
      return res.status(400).json({ error: 'Estado no válido' });
    }

    // sp_cambiar_estado_membresia activa el trigger trg_sincronizar_cliente_membresia
    // para sincronizar automáticamente el estado del cliente en PostgreSQL
    await db.query('CALL sp_cambiar_estado_membresia($1, $2)', [id, Estado]);

    const result = await db.query(
      'SELECT * FROM vw_membresias_detalle WHERE idMembresia = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Membresía no encontrada' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error al actualizar estado de membresía vía procedimiento:', error);
    res.status(500).json({ error: 'Error al actualizar membresía', details: error.message });
  }
};
