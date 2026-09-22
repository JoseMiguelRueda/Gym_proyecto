const db = require('../config/db');

// Obtener todas las métricas analíticas y KPIs para el Dashboard mediante función almacenada
exports.getDashboardStats = async (req, res) => {
  try {
    // La función fn_obtener_dashboard() en PostgreSQL sincroniza estados y compila
    // KPIs, alertas, distribución y series temporales desde las vistas del sistema.
    const result = await db.query('SELECT fn_obtener_dashboard() AS data');
    res.json(result.rows[0].data);
  } catch (error) {
    console.error('Error al generar métricas de dashboard vía función PL/pgSQL:', error);
    res.status(500).json({ error: 'Error al generar métricas', details: error.message });
  }
};
