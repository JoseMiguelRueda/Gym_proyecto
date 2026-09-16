const express = require('express');
const cors = require('cors');
require('dotenv').config();

const db = require('./config/db');

// Importar rutas
const clienteRoutes = require('./routes/clienteRoutes');
const entrenadorRoutes = require('./routes/entrenadorRoutes');
const planRoutes = require('./routes/planRoutes');
const membresiaRoutes = require('./routes/membresiaRoutes');
const pagoRoutes = require('./routes/pagoRoutes');
const asistenciaRoutes = require('./routes/asistenciaRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(express.json());

// Endpoint de prueba y salud
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    service: 'Gym Management API',
  });
});

// Registrar rutas de la API
app.use('/api/clientes', clienteRoutes);
app.use('/api/entrenadores', entrenadorRoutes);
app.use('/api/planes', planRoutes);
app.use('/api/membresias', membresiaRoutes);
app.use('/api/pagos', pagoRoutes);
app.use('/api/asistencias', asistenciaRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Manejo global de rutas no encontradas
app.use((req, res) => {
  res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.originalUrl}` });
});

// Iniciar servidor y verificar conexión a la base de datos
app.listen(PORT, async () => {
  console.log(`🚀 Servidor Backend corriendo en el puerto ${PORT} (http://localhost:${PORT})`);
  try {
    const res = await db.query('SELECT current_database(), current_user, version()');
    console.log(`✅ Conectado a PostgreSQL [BD: ${res.rows[0].current_database} | Usuario: ${res.rows[0].current_user}]`);
  } catch (err) {
    console.warn(`⚠️ Advertencia de conexión a BD: ${err.message}`);
    console.warn(`👉 Recuerda crear la base de datos 'gym_db' y ejecutar 'database/schema_pgadmin4.sql' en pgAdmin 4.`);
  }
});
