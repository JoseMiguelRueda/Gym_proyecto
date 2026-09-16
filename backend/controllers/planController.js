const db = require('../config/db');

// Listar todos los planes
exports.getPlanes = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        p.*,
        COUNT(m.idMembresia) FILTER (WHERE m.Estado = 'Activa') AS membresias_activas
      FROM Planes p
      LEFT JOIN Membresia m ON p.idPlan = m.idPlan
      GROUP BY p.idPlan
      ORDER BY p.Precio ASC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener planes:', error);
    res.status(500).json({ error: 'Error al obtener planes', details: error.message });
  }
};

// Crear nuevo plan
exports.createPlan = async (req, res) => {
  const { Nombre_Plan, Duracion, Precio, Descripcion } = req.body;
  try {
    if (!Nombre_Plan || !Duracion || Precio === undefined) {
      return res.status(400).json({ error: 'Nombre_Plan, Duracion y Precio son obligatorios' });
    }

    const result = await db.query(
      `INSERT INTO Planes (Nombre_Plan, Duracion, Precio, Descripcion) VALUES ($1, $2, $3, $4) RETURNING *`,
      [Nombre_Plan, parseInt(Duracion, 10), parseFloat(Precio), Descripcion || '']
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error al crear plan:', error);
    res.status(500).json({ error: 'Error al registrar plan', details: error.message });
  }
};

// Actualizar plan
exports.updatePlan = async (req, res) => {
  const { id } = req.params;
  const { Nombre_Plan, Duracion, Precio, Descripcion } = req.body;
  try {
    const result = await db.query(
      `UPDATE Planes SET Nombre_Plan = $1, Duracion = $2, Precio = $3, Descripcion = $4 WHERE idPlan = $5 RETURNING *`,
      [Nombre_Plan, parseInt(Duracion, 10), parseFloat(Precio), Descripcion, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Plan no encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error al actualizar plan:', error);
    res.status(500).json({ error: 'Error al actualizar plan', details: error.message });
  }
};

// Eliminar plan
exports.deletePlan = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query('DELETE FROM Planes WHERE idPlan = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Plan no encontrado' });
    }
    res.json({ message: 'Plan eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar plan:', error);
    res.status(500).json({ error: 'No se puede eliminar el plan porque tiene membresías asociadas', details: error.message });
  }
};
