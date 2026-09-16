const db = require('../config/db');
const { sincronizarMembresiasVencidas } = require('../utils/syncMembresias');

// Validar estado de membresía de un cliente para acceso en recepción
exports.validarCliente = async (req, res) => {
  const { carnet } = req.params;
  try {
    // Sincronizar membresías vencidas antes de validar
    await sincronizarMembresiasVencidas();

    const clienteRes = await db.query(
      `SELECT 
        c.idCliente,
        c.Nombre,
        c.Carnet,
        c.Telefono,
        c.Email,
        c.Estado AS Estado_Cliente,
        e.Nombre AS Entrenador_Nombre,
        m.idMembresia,
        p.Nombre_Plan,
        p.Precio AS Plan_Precio,
        m.Fecha_Inicio,
        m.Fecha_Fin,
        COALESCE(m.Estado, 'Sin Membresía') AS Estado_Membresia,
        CASE 
          WHEN m.Fecha_Fin IS NULL THEN 0
          ELSE (m.Fecha_Fin - CURRENT_DATE)
        END AS Dias_Restantes,
        COALESCE(pagos.total_pagado, 0) AS Total_Pagado
      FROM Cliente c
      LEFT JOIN Entrenador e ON c.idEntrenador = e.idEntrenador
      LEFT JOIN LATERAL (
        SELECT idMembresia, idPlan, Fecha_Inicio, Fecha_Fin, Estado
        FROM Membresia
        WHERE idCliente = c.idCliente
        ORDER BY Fecha_Fin DESC
        LIMIT 1
      ) m ON true
      LEFT JOIN Planes p ON m.idPlan = p.idPlan
      LEFT JOIN LATERAL (
        SELECT COALESCE(SUM(Monto), 0) AS total_pagado
        FROM Pago
        WHERE idMembresia = m.idMembresia
      ) pagos ON true
      WHERE c.Carnet = $1 OR c.idCliente::text = $1`,
      [carnet]
    );

    if (clienteRes.rows.length === 0) {
      return res.status(404).json({
        permitido: false,
        motivo: 'Cliente no encontrado en el sistema',
      });
    }

    const cliente = clienteRes.rows[0];

    // Verificar si ya registró asistencia hoy
    const asistenciaHoyRes = await db.query(
      `SELECT Hora FROM Asistencia WHERE idCliente = $1 AND Fecha = CURRENT_DATE ORDER BY Hora DESC LIMIT 1`,
      [cliente.idcliente]
    );

    const yaIngresoHoy = asistenciaHoyRes.rows.length > 0;
    const horaUltimoIngreso = yaIngresoHoy ? asistenciaHoyRes.rows[0].hora : null;

    // Validación de acceso
    const esActivo = cliente.estado_cliente === 'Activo';
    const membresiaValida = cliente.estado_membresia === 'Activa' && cliente.dias_restantes >= 0;
    const totalPagado = parseFloat(cliente.total_pagado || 0);
    const planPrecio = parseFloat(cliente.plan_precio || 0);
    const saldoPendiente = Math.max(0, planPrecio - totalPagado);
    const tienePagoCompleto = cliente.idmembresia ? (totalPagado >= planPrecio) : false;

    let motivo = 'Membresía activa, vigente y pagada';
    let permitido = true;

    if (cliente.estado_membresia === 'Sin Membresía') {
      permitido = false;
      motivo = 'El cliente no cuenta con ningún plan o membresía registrada';
    } else if (cliente.estado_membresia === 'Vencida' || cliente.dias_restantes < 0) {
      permitido = false;
      const dias = Math.abs(cliente.dias_restantes);
      motivo = dias === 0 ? 'Membresía venció hoy. Requiere renovación.' : `Membresía vencida hace ${dias} día(s). Requiere renovación.`;
    } else if (!tienePagoCompleto && cliente.idmembresia) {
      permitido = false;
      motivo = totalPagado === 0 
        ? `Membresía impaga (Debe Bs. ${saldoPendiente.toFixed(2)}). Requiere cancelar el pago en caja.` 
        : `Membresía con saldo pendiente de Bs. ${saldoPendiente.toFixed(2)}. Requiere completar el pago para acceder.`;
    } else if (!esActivo) {
      permitido = false;
      motivo = 'Cliente dado de baja o inactivo en el sistema';
    } else if (!membresiaValida) {
      permitido = false;
      motivo = `Membresía en estado '${cliente.estado_membresia}'`;
    }

    res.json({
      permitido,
      motivo,
      cliente,
      yaIngresoHoy,
      horaUltimoIngreso,
    });
  } catch (error) {
    console.error('Error al validar cliente:', error);
    res.status(500).json({ error: 'Error al validar cliente', details: error.message });
  }
};

// Registrar ingreso / asistencia
exports.registrarAsistencia = async (req, res) => {
  const { idCliente } = req.body;
  try {
    if (!idCliente) {
      return res.status(400).json({ error: 'idCliente es obligatorio' });
    }

    // Insertar asistencia (el Trigger en PostgreSQL o la validación en código garantizará la vigencia)
    const result = await db.query(
      `INSERT INTO Asistencia (Fecha, Hora, idCliente)
       VALUES (CURRENT_DATE, CURRENT_TIME, $1)
       RETURNING *`,
      [idCliente]
    );

    // Obtener datos del cliente para el ticket de confirmación
    const clienteInfo = await db.query(
      `SELECT c.Nombre, c.Carnet, p.Nombre_Plan
       FROM Cliente c
       LEFT JOIN Membresia m ON c.idCliente = m.idCliente AND m.Estado = 'Activa'
       LEFT JOIN Planes p ON m.idPlan = p.idPlan
       WHERE c.idCliente = $1
       LIMIT 1`,
      [idCliente]
    );

    res.status(201).json({
      message: 'Ingreso registrado correctamente',
      asistencia: result.rows[0],
      cliente: clienteInfo.rows[0] || {},
    });
  } catch (error) {
    // Si el trigger de PostgreSQL lanzó la excepción de membresía inactiva
    if (error.message && error.message.includes('Acceso denegado')) {
      return res.status(403).json({ error: error.message });
    }
    console.error('Error al registrar asistencia:', error);
    res.status(500).json({ error: 'Error al registrar asistencia', details: error.message });
  }
};

// Obtener lista de asistencias
exports.getAsistencias = async (req, res) => {
  try {
    const { fecha, idCliente } = req.query;
    let queryText = `
      SELECT 
        a.idAsistencia,
        a.Fecha,
        a.Hora,
        c.idCliente,
        c.Nombre AS Cliente_Nombre,
        c.Carnet AS Cliente_Carnet,
        e.Nombre AS Entrenador_Nombre
      FROM Asistencia a
      JOIN Cliente c ON a.idCliente = c.idCliente
      LEFT JOIN Entrenador e ON c.idEntrenador = e.idEntrenador
      WHERE 1=1
    `;
    const params = [];

    if (fecha) {
      params.push(fecha);
      queryText += ` AND a.Fecha = $${params.length}`;
    }

    if (idCliente) {
      params.push(idCliente);
      queryText += ` AND a.idCliente = $${params.length}`;
    }

    queryText += ` ORDER BY a.Fecha DESC, a.Hora DESC LIMIT 100`;

    const result = await db.query(queryText, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener asistencias:', error);
    res.status(500).json({ error: 'Error al obtener asistencias', details: error.message });
  }
};
