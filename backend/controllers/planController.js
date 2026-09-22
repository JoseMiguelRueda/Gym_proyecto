const db = require('../config/db');

// Listar todos los planes con métricas desde la vista optimizada
exports.getPlanes = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM vw_planes_resumen ORDER BY Precio ASC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener planes vía vista:', error);
    res.status(500).json({ error: 'Error al obtener planes', details: error.message });
  }
};

// Crear nuevo plan mediante procedimiento almacenado
exports.createPlan = async (req, res) => {
  const { Nombre_Plan, Duracion, Precio, Descripcion } = req.body;
  try {
    if (!Nombre_Plan || !Duracion || Precio === undefined) {
      return res.status(400).json({ error: 'Nombre_Plan, Duracion y Precio son obligatorios' });
    }

    const procRes = await db.query(
      'CALL sp_crear_plan($1, $2, $3, $4, NULL)',
      [Nombre_Plan, parseInt(Duracion, 10), parseFloat(Precio), Descripcion || '']
    );

    const newId = procRes.rows[0]?.p_id_plan;
    const result = await db.query('SELECT * FROM vw_planes_resumen WHERE idPlan = $1', [newId]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error al crear plan vía procedimiento:', error);
    res.status(500).json({ error: 'Error al registrar plan', details: error.message });
  }
};

// Actualizar plan mediante procedimiento almacenado
exports.updatePlan = async (req, res) => {
  const { id } = req.params;
  const { Nombre_Plan, Duracion, Precio, Descripcion } = req.body;
  try {
    await db.query(
      'CALL sp_actualizar_plan($1, $2, $3, $4)',
      [
        id,
        Nombre_Plan || null,
        Duracion ? parseInt(Duracion, 10) : null,
        Precio !== undefined ? parseFloat(Precio) : null,
        Descripcion !== undefined ? Descripcion : null,
      ]
    );

    const result = await db.query('SELECT * FROM vw_planes_resumen WHERE idPlan = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Plan no encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error al actualizar plan vía procedimiento:', error);
    res.status(500).json({ error: 'Error al actualizar plan', details: error.message });
  }
};

// Eliminar plan mediante procedimiento almacenado
exports.deletePlan = async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('CALL sp_eliminar_plan($1)', [id]);
    res.json({ message: 'Plan eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar plan vía procedimiento:', error);
    res.status(500).json({ error: 'No se puede eliminar el plan porque tiene membresías asociadas', details: error.message });
  }
};
