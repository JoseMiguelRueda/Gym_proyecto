const db = require('../config/db');

// Listar todos los entrenadores con sus horarios y total de alumnos
exports.getEntrenadores = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        e.*,
        COUNT(DISTINCT c.idCliente) AS total_clientes,
        COALESCE(
          json_agg(
            json_build_object('idHorario', h.idHorario, 'Dia', h.Dia, 'Horario', h.Horario)
          ) FILTER (WHERE h.idHorario IS NOT NULL), '[]'
        ) AS horarios
      FROM Entrenador e
      LEFT JOIN Cliente c ON e.idEntrenador = c.idEntrenador AND c.Estado = 'Activo'
      LEFT JOIN Horario h ON e.idEntrenador = h.idEntrenador
      GROUP BY e.idEntrenador
      ORDER BY e.Nombre ASC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener entrenadores:', error);
    res.status(500).json({ error: 'Error al obtener entrenadores', details: error.message });
  }
};

// Detalle de un entrenador
exports.getEntrenadorById = async (req, res) => {
  const { id } = req.params;
  try {
    const entrenadorRes = await db.query('SELECT * FROM Entrenador WHERE idEntrenador = $1', [id]);
    if (entrenadorRes.rows.length === 0) {
      return res.status(404).json({ error: 'Entrenador no encontrado' });
    }

    const horariosRes = await db.query('SELECT * FROM Horario WHERE idEntrenador = $1', [id]);
    const clientesRes = await db.query('SELECT idCliente, Nombre, Carnet, Telefono, Estado FROM Cliente WHERE idEntrenador = $1', [id]);

    res.json({
      entrenador: entrenadorRes.rows[0],
      horarios: horariosRes.rows,
      clientes: clientesRes.rows,
    });
  } catch (error) {
    console.error('Error al obtener entrenador:', error);
    res.status(500).json({ error: 'Error al obtener entrenador', details: error.message });
  }
};

// Crear entrenador
exports.createEntrenador = async (req, res) => {
  const { Nombre, Carnet, Telefono, Email } = req.body;
  try {
    if (!Nombre || !Carnet) {
      return res.status(400).json({ error: 'Nombre y Carnet son requeridos' });
    }

    const result = await db.query(
      `INSERT INTO Entrenador (Nombre, Carnet, Telefono, Email) VALUES ($1, $2, $3, $4) RETURNING *`,
      [Nombre, Carnet, Telefono || null, Email || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Ya existe un entrenador con ese carnet' });
    }
    console.error('Error al crear entrenador:', error);
    res.status(500).json({ error: 'Error al registrar entrenador', details: error.message });
  }
};

// Actualizar entrenador
exports.updateEntrenador = async (req, res) => {
  const { id } = req.params;
  const { Nombre, Carnet, Telefono, Email } = req.body;
  try {
    const result = await db.query(
      `UPDATE Entrenador SET Nombre = $1, Carnet = $2, Telefono = $3, Email = $4 WHERE idEntrenador = $5 RETURNING *`,
      [Nombre, Carnet, Telefono, Email, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Entrenador no encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error al actualizar entrenador:', error);
    res.status(500).json({ error: 'Error al actualizar entrenador', details: error.message });
  }
};

// Eliminar entrenador
exports.deleteEntrenador = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query('DELETE FROM Entrenador WHERE idEntrenador = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Entrenador no encontrado' });
    }
    res.json({ message: 'Entrenador eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar entrenador:', error);
    res.status(500).json({ error: 'No se puede eliminar el entrenador porque tiene registros asociados', details: error.message });
  }
};

// Agregar horario a un entrenador
exports.addHorario = async (req, res) => {
  const { idEntrenador, Dia, Horario } = req.body;
  try {
    if (!idEntrenador || !Dia || !Horario) {
      return res.status(400).json({ error: 'idEntrenador, Dia y Horario son obligatorios' });
    }
    const result = await db.query(
      `INSERT INTO Horario (idEntrenador, Dia, Horario) VALUES ($1, $2, $3) RETURNING *`,
      [idEntrenador, Dia, Horario]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error al agregar horario:', error);
    res.status(500).json({ error: 'Error al agregar horario', details: error.message });
  }
};

// Eliminar horario
exports.deleteHorario = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query('DELETE FROM Horario WHERE idHorario = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Horario no encontrado' });
    }
    res.json({ message: 'Horario eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar horario:', error);
    res.status(500).json({ error: 'Error al eliminar horario', details: error.message });
  }
};
