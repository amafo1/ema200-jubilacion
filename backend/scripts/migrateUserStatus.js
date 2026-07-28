/**
 * Migración ÚNICA: aprobar a todos los usuarios que ya existían antes de
 * introducir el sistema de aprobación (status pending/approved/rejected).
 *
 * Ejecutar una sola vez tras desplegar la funcionalidad:
 *   node scripts/migrateUserStatus.js
 *
 * A partir de esta migración, los NUEVOS registros seguirán entrando como
 * 'pending' y deberán ser aprobados por el administrador. Este script solo
 * afecta a los usuarios existentes en el momento de su ejecución.
 */
const { Pool } = require('pg');
const config = require('../config');
const { initSchema } = require('../db/schema');

async function main() {
  const pool = new Pool(config.db);

  try {
    // Asegurar que las columnas status/approved_at existen
    await initSchema(pool);

    // Aprobar a todos los usuarios existentes (los que estén sin aprobar)
    const result = await pool.query(
      `UPDATE users
       SET status = 'approved', approved_at = COALESCE(approved_at, CURRENT_TIMESTAMP)
       WHERE status IS DISTINCT FROM 'approved'
       RETURNING id, email, status`
    );

    console.log(`✅ Migración completada. Usuarios aprobados: ${result.rows.length}`);
    result.rows.forEach((u) => console.log(`   - #${u.id} ${u.email} -> ${u.status}`));
  } catch (error) {
    console.error('❌ Error en la migración:', error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();
