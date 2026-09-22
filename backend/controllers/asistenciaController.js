const db = require('../config/db');

// Validar estado de membresía de un cliente para acceso en recepción mediante función PL/pgSQL
exports.validarCliente = async (req, res) => {
  const { carnet } = req.params;
  try {
    // La función fn_validar_acceso_cliente sincroniza membresías vencidas, consulta
    // la vista consolidada vw_clientes_detalle y evalúa vigencia, pagos y asistencias previas
    const result = await db.query('SELECT fn_validar_acceso_cliente($1) AS data', [carnet]);
    const data = result.rows[0]?.data;

    if (!data || !data.cliente) {
      return res.status(404).json({
        permitido: false,
        motivo: data?.motivo || 'Cliente no encontrado en el sistema',
      });
    }

    res.json(data);
  } catch (error) {
    console.error('Error al validar cliente vía función PL/pgSQL:', error);
    res.status(500).json({ error: 'Error al validar cliente', details: error.message });
  }
};

// Registrar ingreso / asistencia mediante procedimiento almacenado y validación por Trigger
exports.registrarAsistencia = async (req, res) => {
  const { idCliente } = req.body;
  try {
    if (!idCliente) {
      return res.status(400).json({ error: 'idCliente es obligatorio' });
    }

    // sp_registrar_asistencia inserta la asistencia y el trigger trg_validar_asistencia en PostgreSQL
    // garantiza a nivel motor que el cliente esté activo y tenga membresía vigente y pagada.
    const procRes = await db.query(
      'CALL sp_registrar_asistencia($1, NULL, NULL, NULL)',
      [idCliente]
    );

    const newId = procRes.rows[0]?.p_id_asistencia;

    // Obtener detalles para el ticket de confirmación desde la vista consolidada
    const asistenciaInfo = await db.query(
      'SELECT * FROM vw_asistencias_detalle WHERE idAsistencia = $1',
      [newId]
    );

    const row = asistenciaInfo.rows[0] || {};

    res.status(201).json({
      message: 'Ingreso registrado correctamente',
      asistencia: {
        idAsistencia: row.idasistencia || newId,
        Fecha: row.fecha || procRes.rows[0]?.p_fecha,
        Hora: row.hora || procRes.rows[0]?.p_hora,
        idCliente,
      },
      cliente: {
        Nombre: row.cliente_nombre,
        Carnet: row.cliente_carnet,
      },
    });
  } catch (error) {
    // Si el trigger de PostgreSQL lanzó la excepción de membresía inactiva, vencida o impaga
    if (error.message && error.message.includes('Acceso denegado')) {
      return res.status(403).json({ error: error.message });
    }
    console.error('Error al registrar asistencia vía procedimiento:', error);
    res.status(500).json({ error: 'Error al registrar asistencia', details: error.message });
  }
};

// Obtener lista de asistencias desde la vista optimizada vw_asistencias_detalle
exports.getAsistencias = async (req, res) => {
  try {
    const { fecha, idCliente } = req.query;
    let queryText = 'SELECT * FROM vw_asistencias_detalle WHERE 1=1';
    const params = [];

    if (fecha) {
      params.push(fecha);
      queryText += ` AND Fecha = $${params.length}`;
    }

    if (idCliente) {
      params.push(idCliente);
      queryText += ` AND idCliente = $${params.length}`;
    }

    queryText += ' ORDER BY Fecha DESC, Hora DESC LIMIT 100';

    const result = await db.query(queryText, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener asistencias vía vista:', error);
    res.status(500).json({ error: 'Error al obtener asistencias', details: error.message });
  }
};
