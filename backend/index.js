const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const config = require('./config');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const adminRoutes = require('./routes/admin');
const fundRoutes = require('./routes/funds');
const { initializeCronJobs } = require('./jobs/cronJobs');
const { initSchema } = require('./db/schema');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Database connection
const pool = new Pool(config.db);

// Test DB connection e inicialización de tablas (idempotente).
// Esto permite desplegar sin ejecutar ningún script manual: al arrancar,
// el servidor crea las tablas si no existen.
pool.query('SELECT NOW()', async (err, res) => {
  if (err) {
    console.error('Error conectando a PostgreSQL:', err);
    return;
  }
  console.log('✅ Conectado a PostgreSQL:', res.rows[0]);
  try {
    await initSchema(pool);
    console.log('✅ Tablas verificadas/creadas correctamente');
  } catch (schemaErr) {
    console.error('Error inicializando el esquema de la base de datos:', schemaErr);
  }
});

// Pasar pool a las rutas
app.locals.pool = pool;

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/funds', fundRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

// Test endpoint para verificar IP autorizada en Brevo
app.get('/test-brevo-ip', async (req, res) => {
  try {
    const { sendEmail } = require('./services/emailService');
    await sendEmail(
      config.adminEmail,
      'Prueba de IP autorizada en Brevo',
      `<h1>✅ Funciona!</h1><p>Este correo se envió desde Railway el ${new Date().toLocaleString('es-ES', { timeZone: config.timezone })}.</p><p>La IP de Railway está correctamente autorizada en Brevo.</p>`
    );
    res.json({ 
      success: true, 
      message: 'Correo de prueba enviado correctamente',
      timestamp: new Date() 
    });
  } catch (error) {
    console.error('Error enviando correo de prueba:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      details: error.response?.body || 'Sin detalles adicionales'
    });
  }
});

// Inicializar cron jobs
initializeCronJobs(pool);

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: err.message });
});

// Iniciar servidor
app.listen(config.port, () => {
  console.log(`🚀 Servidor ejecutándose en puerto ${config.port}`);
  console.log(`📧 Admin email: ${config.adminEmail}`);
  console.log(`🌍 Timezone: ${config.timezone}`);
});

module.exports = { app, pool };
