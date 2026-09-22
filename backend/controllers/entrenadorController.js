const db = require('../config/db');

// Listar todos los entrenadores con sus horarios y total de alumnos desde la vista
exports.getEntrenadores = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM vw_entrenadores_resumen ORDER BY Nombre ASC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener entrenadores vía vista:', error);
    res.status(500).json({ error: 'Error al obtener entrenadores', details: error.message });
  }
};

// Detalle de un entrenador mediante función analítica
exports.getEntrenadorById = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query('SELECT fn_obtener_entrenador_detalle($1) AS data', [id]);
    const data = result.rows[0]?.data;

    if (!data || !data.entrenador) {
      return res.status(404).json({ error: 'Entrenador no encontrado' });
    }

    res.json(data);
  } catch (error) {
    console.error('Error al obtener entrenador vía función:', error);
    res.status(500).json({ error: 'Error al obtener entrenador', details: error.message });
  }
};

// Crear entrenador mediante procedimiento almacenado
exports.createEntrenador = async (req, res) => {
  const { Nombre, Carnet, Telefono, Email } = req.body;
  try {
    if (!Nombre || !Carnet) {
      return res.status(400).json({ error: 'Nombre y Carnet son requeridos' });
    }

    const procRes = await db.query(
      'CALL sp_crear_entrenador($1, $2, $3, $4, NULL)',
      [Nombre, Carnet, Telefono || null, Email || null]
    );

    const newId = procRes.rows[0]?.p_id_entrenador;
    const result = await db.query('SELECT * FROM Entrenador WHERE idEntrenador = $1', [newId]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505' || (error.message && error.message.includes('Ya existe un entrenador'))) {
      return res.status(400).json({ error: 'Ya existe un entrenador con ese carnet' });
    }
    console.error('Error al crear entrenador vía procedimiento:', error);
    res.status(500).json({ error: 'Error al registrar entrenador', details: error.message });
  }
};

// Actualizar entrenador mediante procedimiento almacenado
exports.updateEntrenador = async (req, res) => {
  const { id } = req.params;
  const { Nombre, Carnet, Telefono, Email } = req.body;
  try {
    await db.query(
      'CALL sp_actualizar_entrenador($1, $2, $3, $4, $5)',
      [id, Nombre || null, Carnet || null, Telefono || null, Email || null]
    );

    const result = await db.query('SELECT * FROM Entrenador WHERE idEntrenador = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Entrenador no encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505' || (error.message && error.message.includes('ya pertenece a otro entrenador'))) {
      return res.status(400).json({ error: 'El carnet ingresado ya pertenece a otro entrenador' });
    }
    console.error('Error al actualizar entrenador vía procedimiento:', error);
    res.status(500).json({ error: 'Error al actualizar entrenador', details: error.message });
  }
};

// Eliminar entrenador mediante procedimiento almacenado
exports.deleteEntrenador = async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('CALL sp_eliminar_entrenador($1)', [id]);
    res.json({ message: 'Entrenador eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar entrenador vía procedimiento:', error);
    res.status(500).json({ error: 'No se puede eliminar el entrenador porque tiene registros asociados', details: error.message });
  }
};

// Agregar horario a un entrenador mediante procedimiento almacenado
exports.addHorario = async (req, res) => {
  const { idEntrenador, Dia, Horario } = req.body;
  try {
    if (!idEntrenador || !Dia || !Horario) {
      return res.status(400).json({ error: 'idEntrenador, Dia y Horario son obligatorios' });
    }

    const procRes = await db.query(
      'CALL sp_agregar_horario($1, $2, $3, NULL)',
      [idEntrenador, Dia, Horario]
    );

    const newId = procRes.rows[0]?.p_id_horario;
    const result = await db.query('SELECT * FROM Horario WHERE idHorario = $1', [newId]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error al agregar horario vía procedimiento:', error);
    res.status(500).json({ error: 'Error al agregar horario', details: error.message });
  }
};

// Eliminar horario mediante procedimiento almacenado
exports.deleteHorario = async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('CALL sp_eliminar_horario($1)', [id]);
    res.json({ message: 'Horario eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar horario vía procedimiento:', error);
    res.status(500).json({ error: 'Error al eliminar horario', details: error.message });
  }
};
