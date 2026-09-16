const db = require('../config/db');

// Listar todos los pagos con datos de membresía y cliente
exports.getPagos = async (req, res) => {
  try {
    const { mes, idCliente } = req.query;
    let queryText = `
      SELECT 
        pg.idPago,
        pg.Monto,
        pg.Fecha_Pago,
        pg.Nro_Comprobante,
        m.idMembresia,
        m.Fecha_Inicio,
        m.Fecha_Fin,
        m.Estado AS Estado_Membresia,
        c.idCliente,
        c.Nombre AS Cliente_Nombre,
        c.Carnet AS Cliente_Carnet,
        p.Nombre_Plan,
        p.Precio AS Plan_Precio
      FROM Pago pg
      JOIN Membresia m ON pg.idMembresia = m.idMembresia
      JOIN Cliente c ON m.idCliente = c.idCliente
      JOIN Planes p ON m.idPlan = p.idPlan
      WHERE 1=1
    `;
    const params = [];

    if (mes) {
      params.push(`${mes}%`);
      queryText += ` AND TO_CHAR(pg.Fecha_Pago, 'YYYY-MM') = $${params.length}`;
    }

    if (idCliente) {
      params.push(idCliente);
      queryText += ` AND c.idCliente = $${params.length}`;
    }

    queryText += ` ORDER BY pg.Fecha_Pago DESC, pg.idPago DESC`;

    const result = await db.query(queryText, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener pagos:', error);
    res.status(500).json({ error: 'Error al obtener pagos', details: error.message });
  }
};

// Registrar un nuevo pago con validación estricta para evitar pagos repetidos o excesivos
exports.createPago = async (req, res) => {
  const { idMembresia, Monto, Fecha_Pago, Nro_Comprobante } = req.body;
  try {
    if (!idMembresia || Monto === undefined || Monto === null) {
      return res.status(400).json({ error: 'idMembresia y Monto son requeridos' });
    }

    // 1. Obtener detalles de la membresía, precio del plan y total ya pagado
    const membresiaRes = await db.query(
      `SELECT 
        m.idMembresia, 
        m.idCliente, 
        m.Estado, 
        m.Fecha_Fin, 
        p.Precio AS plan_precio,
        p.Nombre_Plan,
        COALESCE(SUM(pg.Monto), 0) AS total_pagado
       FROM Membresia m
       JOIN Planes p ON m.idPlan = p.idPlan
       LEFT JOIN Pago pg ON m.idMembresia = pg.idMembresia
       WHERE m.idMembresia = $1
       GROUP BY m.idMembresia, p.Precio, p.Nombre_Plan`,
      [idMembresia]
    );

    if (membresiaRes.rows.length === 0) {
      return res.status(404).json({ error: 'Membresía no encontrada' });
    }

    const { plan_precio, total_pagado, estado, fecha_fin, idcliente } = membresiaRes.rows[0];
    const precioPlan = parseFloat(plan_precio);
    const pagadoHastaAhora = parseFloat(total_pagado);
    const saldoPendiente = Math.max(0, precioPlan - pagadoHastaAhora);

    // 2. Prevenir pagos duplicados/repetidos si ya está totalmente pagada
    if (pagadoHastaAhora >= precioPlan) {
      return res.status(400).json({ 
        error: `Esta membresía ya está totalmente pagada (Precio: Bs. ${precioPlan.toFixed(2)}, Abonado: Bs. ${pagadoHastaAhora.toFixed(2)}). No se permiten pagos adicionales o repetidos.` 
      });
    }

    const montoAbonar = parseFloat(Monto);
    if (isNaN(montoAbonar) || montoAbonar <= 0) {
      return res.status(400).json({ error: 'El monto debe ser un valor numérico positivo mayor a 0' });
    }

    // 3. Prevenir cobros por encima del saldo restante
    if (montoAbonar > saldoPendiente) {
      return res.status(400).json({ 
        error: `El monto ingresado (Bs. ${montoAbonar.toFixed(2)}) excede el saldo pendiente (Bs. ${saldoPendiente.toFixed(2)}).` 
      });
    }

    const comprobante = Nro_Comprobante || `REC-${Date.now().toString().slice(-6)}`;
    const fecha = Fecha_Pago || new Date().toISOString().split('T')[0];

    const result = await db.query(
      `INSERT INTO Pago (Monto, Fecha_Pago, Nro_Comprobante, idMembresia)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [montoAbonar, fecha, comprobante, idMembresia]
    );

    const nuevoTotal = pagadoHastaAhora + montoAbonar;
    const nuevoSaldo = Math.max(0, precioPlan - nuevoTotal);

    // 4. Activar cliente si la membresía está activa y vigente
    const fechaFin = new Date(fecha_fin);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    if (estado === 'Activa' && fechaFin >= hoy) {
      await db.query(
        `UPDATE Cliente SET Estado = 'Activo' WHERE idCliente = $1`,
        [idcliente]
      );
    }

    res.status(201).json({
      ...result.rows[0],
      totalPagado: nuevoTotal,
      saldoPendiente: nuevoSaldo,
      pagadaCompleta: nuevoSaldo === 0,
      message: nuevoSaldo === 0 
        ? 'Pago completado al 100%. Membresía totalmente cancelada.' 
        : `Abono de Bs. ${montoAbonar.toFixed(2)} registrado exitosamente. Saldo pendiente: Bs. ${nuevoSaldo.toFixed(2)}`,
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'El número de comprobante ya existe' });
    }
    console.error('Error al registrar pago:', error);
    res.status(500).json({ error: 'Error al registrar pago', details: error.message });
  }
};
