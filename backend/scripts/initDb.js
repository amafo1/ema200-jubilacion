const { Pool } = require('pg');
const config = require('../config');
const { initSchema } = require('../db/schema');

const pool = new Pool(config.db);

async function initializeDatabase() {
  try {
    console.log('📊 Inicializando base de datos...');

    // En local (sin DATABASE_URL) creamos la base de datos si no existe.
    // En producción (DATABASE_URL) la base de datos ya viene aprovisionada
    // por el proveedor (Render, Railway, etc.), así que este paso se omite.
    if (!process.env.DATABASE_URL) {
      const adminPool = new Pool({
        ...config.db,
        database: 'postgres',
      });

      const dbExists = await adminPool.query(
        'SELECT 1 FROM pg_database WHERE datname = $1',
        [config.db.database]
      );

      if (!dbExists.rows.length) {
        console.log(`Creando base de datos: ${config.db.database}`);
        await adminPool.query(`CREATE DATABASE ${config.db.database}`);
      }

      await adminPool.end();
    }

    // Crear tablas (esquema compartido, idempotente)
    console.log('Creando tablas...');
    await initSchema(pool);

    console.log('✅ Base de datos inicializada correctamente');
    await pool.end();
  } catch (error) {
    console.error('❌ Error al inicializar base de datos:', error);
    process.exit(1);
  }
}

initializeDatabase();
