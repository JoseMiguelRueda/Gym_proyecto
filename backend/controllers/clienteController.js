const db = require('../config/db');
const { sincronizarMembresiasVencidas } = require('../utils/syncMembresias');

// Obtener todos los clientes con estado de membresía y entrenador
exports.getClientes = async (req, res) => {
  try {
    // Sincronizar membresías vencidas antes de consultar
    await sincronizarMembresiasVencidas();

    const { busqueda, estado } = req.query;
    let queryText = `
      SELECT 
        c.idCliente,
        c.Nombre,
        c.Carnet,
        c.Telefono,
        c.Email,
        c.Estado,
        c.idEntrenador,
        e.Nombre AS Entrenador_Nombre,
        m.idMembresia,
        p.Nombre_Plan,
        m.Fecha_Inicio,
        m.Fecha_Fin,
        COALESCE(m.Estado, 'Sin Membresía') AS Estado_Membresia,
        CASE 
          WHEN m.Fecha_Fin IS NULL THEN 0
          ELSE (m.Fecha_Fin - CURRENT_DATE)
        END AS Dias_Restantes
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
      WHERE 1=1
    `;
    const params = [];

    if (busqueda) {
      params.push(`%${busqueda}%`);
      queryText += ` AND (c.Nombre ILIKE $${params.length} OR c.Carnet ILIKE $${params.length})`;
    }

    if (estado) {
      params.push(estado);
      queryText += ` AND c.Estado = $${params.length}`;
    }

    queryText += ` ORDER BY c.idCliente DESC`;

    const result = await db.query(queryText, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener clientes:', error);
    res.status(500).json({ error: 'Error al obtener clientes', details: error.message });
  }
};

// Obtener detalle de un cliente con su historial
exports.getClienteById = async (req, res) => {
  const { id } = req.params;
  try {
    const clienteRes = await db.query(
      `SELECT c.*, e.Nombre AS Entrenador_Nombre 
       FROM Cliente c 
       LEFT JOIN Entrenador e ON c.idEntrenador = e.idEntrenador 
       WHERE c.idCliente = $1`,
      [id]
    );

    if (clienteRes.rows.length === 0) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    const cliente = clienteRes.rows[0];

    // Historial de membresías y pagos
    const membresiasRes = await db.query(
      `SELECT m.*, p.Nombre_Plan, p.Precio 
       FROM Membresia m 
       JOIN Planes p ON m.idPlan = p.idPlan 
       WHERE m.idCliente = $1 
       ORDER BY m.Fecha_Inicio DESC`,
      [id]
    );

    // Historial de asistencias
    const asistenciasRes = await db.query(
      `SELECT * FROM Asistencia WHERE idCliente = $1 ORDER BY Fecha DESC, Hora DESC LIMIT 20`,
      [id]
    );

    res.json({
      cliente,
      membresias: membresiasRes.rows,
      asistencias: asistenciasRes.rows,
    });
  } catch (error) {
    console.error('Error al obtener detalle del cliente:', error);
    res.status(500).json({ error: 'Error al obtener cliente', details: error.message });
  }
};

// Registrar nuevo cliente
exports.createCliente = async (req, res) => {
  const { Nombre, Carnet, Telefono, Email, idEntrenador } = req.body;
  try {
    if (!Nombre || !Carnet) {
      return res.status(400).json({ error: 'Nombre y Carnet son obligatorios' });
    }

    const result = await db.query(
      `INSERT INTO Cliente (Nombre, Carnet, Telefono, Email, Estado, idEntrenador)
       VALUES ($1, $2, $3, $4, 'Activo', $5)
       RETURNING *`,
      [Nombre, Carnet, Telefono || null, Email || null, idEntrenador || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Ya existe un cliente con ese número de carnet' });
    }
    console.error('Error al crear cliente:', error);
    res.status(500).json({ error: 'Error al registrar cliente', details: error.message });
  }
};

// Actualizar datos del cliente
exports.updateCliente = async (req, res) => {
  const { id } = req.params;
  try {
    const fields = [];
    const values = [];
    let idx = 1;

    const columnMapping = {
      Nombre: 'Nombre',
      nombre: 'Nombre',
      Carnet: 'Carnet',
      carnet: 'Carnet',
      Telefono: 'Telefono',
      telefono: 'Telefono',
      Email: 'Email',
      email: 'Email',
      Estado: 'Estado',
      estado: 'Estado',
      idEntrenador: 'idEntrenador',
      identrenador: 'idEntrenador',
    };

    const handledCols = new Set();
    for (const [key, col] of Object.entries(columnMapping)) {
      if (req.body[key] !== undefined && !handledCols.has(col)) {
        fields.push(`${col} = $${idx++}`);
        values.push(req.body[key]);
        handledCols.add(col);
      }
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No se enviaron campos para actualizar' });
    }

    values.push(id);
    const query = `UPDATE Cliente SET ${fields.join(', ')} WHERE idCliente = $${idx} RETURNING *`;
    const result = await db.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'El carnet ingresado ya está asignado a otro cliente' });
    }
    console.error('Error al actualizar cliente:', error);
    res.status(500).json({ error: 'Error al actualizar cliente', details: error.message });
  }
};

// Cambiar estado del cliente (Activo / Inactivo) con lógica de negocio
exports.updateEstado = async (req, res) => {
  const { id } = req.params;
  const { Estado } = req.body;
  try {
    if (!Estado || !['Activo', 'Inactivo'].includes(Estado)) {
      return res.status(400).json({ error: 'Estado no válido. Debe ser Activo o Inactivo' });
    }

    // Si se da de baja manualmente, inactivar sus membresías activas
    if (Estado === 'Inactivo') {
      await db.query(
        `UPDATE Membresia SET Estado = 'Inactiva' WHERE idCliente = $1 AND Estado = 'Activa'`,
        [id]
      );
    }

    const result = await db.query(
      `UPDATE Cliente SET Estado = $1 WHERE idCliente = $2 RETURNING *`,
      [Estado, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    // Si se reactiva, verificar si tiene membresía vigente
    let aviso = null;
    if (Estado === 'Activo') {
      const membresiaVigente = await db.query(
        `SELECT idMembresia FROM Membresia 
         WHERE idCliente = $1 AND Estado = 'Activa' AND Fecha_Fin >= CURRENT_DATE 
         LIMIT 1`,
        [id]
      );
      if (membresiaVigente.rows.length === 0) {
        aviso = 'Cliente reactivado, pero no cuenta con membresía vigente. Requiere renovación para habilitar acceso.';
      }
    }

    res.json({
      message: `Cliente ${Estado === 'Activo' ? 'reactivado' : 'dado de baja'} exitosamente`,
      aviso,
      cliente: result.rows[0],
    });
  } catch (error) {
    console.error('Error al actualizar estado del cliente:', error);
    res.status(500).json({ error: 'Error al actualizar estado del cliente', details: error.message });
  }
};

// Baja lógica del cliente (inactiva también sus membresías activas)
exports.deleteCliente = async (req, res) => {
  const { id } = req.params;
  try {
    // Inactivar membresías activas del cliente
    await db.query(
      `UPDATE Membresia SET Estado = 'Inactiva' WHERE idCliente = $1 AND Estado = 'Activa'`,
      [id]
    );

    const result = await db.query(
      `UPDATE Cliente SET Estado = 'Inactivo' WHERE idCliente = $1 RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    res.json({ message: 'Cliente dado de baja exitosamente', cliente: result.rows[0] });
  } catch (error) {
    console.error('Error al dar de baja al cliente:', error);
    res.status(500).json({ error: 'Error al dar de baja al cliente', details: error.message });
  }
};
