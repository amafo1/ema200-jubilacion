const express = require('express');
const config = require('../config');

const router = express.Router();
let pool;

router.use((req, res, next) => {
  if (!pool && req.app.locals.pool) {
    pool = req.app.locals.pool;
  }
  next();
});

/**
 * Middleware: Verificar que es administrador
 * Se usa el email del administrador configurado
 */
function authenticateAdmin(req, res, next) {
  const adminEmail = req.headers['x-admin-email'];
  
  if (adminEmail !== config.adminEmail) {
    return res.status(403).json({ error: 'Acceso denegado. Solo el administrador puede acceder.' });
  }
  
  req.adminEmail = adminEmail;
  next();
}

/**
 * GET /api/admin/active-users
 * Obtener la lista de TODOS los usuarios dados de alta.
 * Con el alta libre ya no hay estados pendiente/rechazado: todos los usuarios
 * están activos. Se ordena por fecha de alta (los más recientes primero).
 */
router.get('/active-users', authenticateAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        id, 
        email, 
        name, 
        birth_date, 
        monthly_contribution, 
        status,
        approved_at,
        created_at,
        EXTRACT(YEAR FROM AGE(make_timestamp(EXTRACT(YEAR FROM birth_date)::int + 67, 
                                            EXTRACT(MONTH FROM birth_date)::int, 
                                            EXTRACT(DAY FROM birth_date)::int, 0, 0, 0)::date))::int as years_until_retirement
       FROM users
       ORDER BY created_at DESC`
    );
    
    res.json(result.rows);
    
  } catch (error) {
    console.error('Error en active-users:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/admin/stats
 * Estadísticas generales del sistema
 */
router.get('/stats', authenticateAdmin, async (req, res) => {
  try {
    const totalUsers = await pool.query('SELECT COUNT(*) as count FROM users');
    
    const emailStats = await pool.query(
      `SELECT email_type, COUNT(*) as count FROM email_log GROUP BY email_type`
    );
    
    const buySignals = await pool.query(
      `SELECT COUNT(*) as count FROM ema200_history WHERE signal = $1`,
      ['buy']
    );
    
    res.json({
      users: {
        total: totalUsers.rows[0].count
      },
      emails: {
        total: emailStats.rows.reduce((sum, row) => sum + parseInt(row.count), 0),
        byType: emailStats.rows
      },
      buySignals: buySignals.rows[0].count,
      adminEmail: config.adminEmail
    });
    
  } catch (error) {
    console.error('Error en stats:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
