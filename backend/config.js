require('dotenv').config();

module.exports = {
  // APIs
  // Las claves se leen de variables de entorno por seguridad.
  // En local, ponlas en backend/.env (ver backend/.env.example).
  // En producción (Render), se configuran como variables de entorno del servicio.
  twelveDataApiKey: process.env.TWELVE_DATA_API_KEY || '',
  brevoApiKey: process.env.BREVO_API_KEY || '',
  
  // Database
  // En producción (Render, Railway, etc.) se usa DATABASE_URL con SSL.
  // En local se usan los parámetros individuales.
  db: process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
      }
    : {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'ema200_jubilacion',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
      },
  
  // Server
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  
  // Admin
  adminEmail: process.env.ADMIN_EMAIL || 'amafo.ws@gmail.com',
  
  // JWT
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-key-change-in-production',
  jwtExpire: '7d',
  
  // Timezone
  timezone: 'Europe/Madrid',
  
  // Fondos ISIN
  funds: {
    espera: { name: 'Fondo Monetario', isin: 'FR0000447823' },
    crecimiento: { name: 'S&P 500', isin: 'IE00BYX5MX67' },
    jubilacion: { name: 'Fondo Dividendos', isin: 'ES0165185010' }
  },
  
  // Edades y jubilación
  retirementAge: 67,
  dividendYield: 0.035, // 3.5% anual
  
  // Email
  emailFrom: 'noreply@app-jubilacion.com',
};
