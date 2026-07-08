// Esquema de la base de datos y función de inicialización compartida.
// Se usa tanto en el arranque del servidor (index.js) como en el script initDb.js.

const schema = `
-- Tabla de usuarios
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  birth_date DATE NOT NULL,
  monthly_contribution DECIMAL(10, 2) NOT NULL,
  pin_hash VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected
  approved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de historial EMA200
CREATE TABLE IF NOT EXISTS ema200_history (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  ema200 DECIMAL(10, 2) NOT NULL,
  signal VARCHAR(50), -- 'buy' si price <= ema200
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de emails enviados
CREATE TABLE IF NOT EXISTS email_log (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  email_type VARCHAR(100), -- 'motivation', 'buy_signal', 'rotation_year_X', etc
  subject VARCHAR(255),
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(50) DEFAULT 'sent' -- sent, failed
);

-- Tabla de rotación de fondos
CREATE TABLE IF NOT EXISTS rotation_history (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  rotation_year INTEGER, -- año 1-5 de rotación
  status VARCHAR(50) DEFAULT 'pending', -- pending, completed, paused
  percentage INTEGER DEFAULT 20,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, rotation_year)
);

-- Índices para optimizar queries
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_ema200_date ON ema200_history(date);
CREATE INDEX IF NOT EXISTS idx_email_log_user ON email_log(user_id);
`;

// Crea las tablas/índices en la base de datos (idempotente).
async function initSchema(pool) {
  const statements = schema.split(';').filter((s) => s.trim());
  for (const statement of statements) {
    if (statement.trim()) {
      await pool.query(statement);
    }
  }
}

module.exports = { schema, initSchema };
