const db = require('../config/db');
const { sincronizarMembresiasVencidas } = require('../utils/syncMembresias');

// Obtener todas las métricas analíticas y KPIs para el Dashboard Gerencial
exports.getDashboardStats = async (req, res) => {
  try {
    // Sincronizar membresías vencidas antes de calcular estadísticas
    await sincronizarMembresiasVencidas();

    // 1. Conteo de Clientes
    const clientesCountRes = await db.query(`
      SELECT 
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE Estado = 'Activo') AS activos,
        COUNT(*) FILTER (WHERE Estado = 'Inactivo') AS inactivos
      FROM Cliente
    `);

    // 2. Ingresos del Mes Actual
    const ingresosMesRes = await db.query(`
      SELECT COALESCE(SUM(Monto), 0) AS total_mes
      FROM Pago
      WHERE TO_CHAR(Fecha_Pago, 'YYYY-MM') = TO_CHAR(CURRENT_DATE, 'YYYY-MM')
    `);

    // 3. Total Asistencias Hoy
    const asistenciasHoyRes = await db.query(`
      SELECT COUNT(*) AS total_hoy
      FROM Asistencia
      WHERE Fecha = CURRENT_DATE
    `);

    // 4. Membresías por Vencer (en los próximos 7 días)
    const membresiasPorVencerRes = await db.query(`
      SELECT 
        m.idMembresia,
        c.Nombre AS Cliente_Nombre,
        c.Carnet,
        c.Telefono,
        p.Nombre_Plan,
        m.Fecha_Fin,
        (m.Fecha_Fin - CURRENT_DATE) AS Dias_Restantes
      FROM Membresia m
      JOIN Cliente c ON m.idCliente = c.idCliente
      JOIN Planes p ON m.idPlan = p.idPlan
      WHERE m.Estado = 'Activa' 
        AND m.Fecha_Fin BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '7 days')
      ORDER BY m.Fecha_Fin ASC
    `);

    // 5. Ingresos por Mes (Historial)
    const ingresosPorMesRes = await db.query(`
      SELECT 
        TO_CHAR(Fecha_Pago, 'YYYY-MM') AS mes,
        SUM(Monto) AS total
      FROM Pago
      GROUP BY TO_CHAR(Fecha_Pago, 'YYYY-MM')
      ORDER BY mes ASC
      LIMIT 6
    `);

    // 6. Distribución de Clientes por Plan
    const planesDistribucionRes = await db.query(`
      SELECT 
        p.Nombre_Plan,
        COUNT(m.idMembresia) AS total_clientes,
        SUM(p.Precio) AS ingresos_estimados
      FROM Planes p
      LEFT JOIN Membresia m ON p.idPlan = m.idPlan AND m.Estado = 'Activa'
      GROUP BY p.idPlan, p.Nombre_Plan
      ORDER BY total_clientes DESC
    `);

    // 7. Afluencia de Asistencias recientes
    const asistenciasHistoricoRes = await db.query(`
      SELECT 
        TO_CHAR(Fecha, 'YYYY-MM-DD') AS fecha,
        COUNT(*) AS total
      FROM Asistencia
      WHERE Fecha >= CURRENT_DATE - INTERVAL '7 days'
      GROUP BY Fecha
      ORDER BY Fecha ASC
    `);

    // 8. Total Entrenadores
    const entrenadoresCountRes = await db.query(`SELECT COUNT(*) AS total FROM Entrenador`);

    res.json({
      kpis: {
        totalClientes: parseInt(clientesCountRes.rows[0].total, 10),
        clientesActivos: parseInt(clientesCountRes.rows[0].activos, 10),
        clientesInactivos: parseInt(clientesCountRes.rows[0].inactivos, 10),
        ingresosMes: parseFloat(ingresosMesRes.rows[0].total_mes),
        asistenciasHoy: parseInt(asistenciasHoyRes.rows[0].total_hoy, 10),
        totalEntrenadores: parseInt(entrenadoresCountRes.rows[0].total, 10),
      },
      membresiasPorVencer: membresiasPorVencerRes.rows,
      ingresosPorMes: ingresosPorMesRes.rows,
      planesDistribucion: planesDistribucionRes.rows,
      asistenciasHistorico: asistenciasHistoricoRes.rows,
    });
  } catch (error) {
    console.error('Error al generar métricas de dashboard:', error);
    res.status(500).json({ error: 'Error al generar métricas', details: error.message });
  }
};
