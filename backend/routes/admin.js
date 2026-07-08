const express = require('express');
const { sendEmail } = require('../services/emailService');
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
 * GET /api/admin/pending-users
 * Obtener lista de usuarios pendientes de aprobación
 */
router.get('/pending-users', authenticateAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, email, name, birth_date, monthly_contribution, created_at
       FROM users
       WHERE status = $1
       ORDER BY created_at ASC`,
      ['pending']
    );
    
    res.json(result.rows);
    
  } catch (error) {
    console.error('Error en pending-users:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/admin/active-users
 * Obtener lista de todos los usuarios activos/aprobados
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
       WHERE status IN ($1, $2)
       ORDER BY status ASC, approved_at DESC`,
      ['approved', 'rejected']
    );
    
    res.json(result.rows);
    
  } catch (error) {
    console.error('Error en active-users:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/admin/approve-user/:userId
 * Aprobar un usuario
 */
router.post('/approve-user/:userId', authenticateAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    
    const result = await pool.query(
      `UPDATE users
       SET status = $1, approved_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING id, email, name, status, approved_at`,
      ['approved', userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    const user = result.rows[0];
    
    // Enviar email de aprobación (no bloqueante)
    try {
    await sendEmail({
      to: user.email,
      subject: '¡Tu cuenta ha sido aprobada! Tu jubilación automática comienza',
      html: `
        <h2>¡Bienvenido a tu jubilación automática!</h2>
        <p>Hola ${user.name || 'Inversor'},</p>
        <p>Tu cuenta ha sido <strong>aprobada</strong>. Ya puedes acceder a la plataforma y recibirás alertas automáticas en los momentos clave.</p>
        
        <h3>Próximos pasos:</h3>
        <ol>
          <li>Accede a la app con tu email y PIN</li>
          <li>Revisa tu plan personalizado</li>
          <li>Abre una cuenta en MyInvestor si aún no la tienes</li>
          <li>¡Relájate! Las alertas automáticas se encargarán del resto</li>
        </ol>
        
        <p style="background-color: #d4edda; padding: 15px; border-radius: 5px; color: #155724;">
          <strong>Tu jubilación está en piloto automático.</strong> Te avisaremos en cada momento exacto en que debes actuar.
        </p>
        
        <p style="color: #666; font-size: 12px; margin-top: 30px;">Tu jubilación automática — EMA200 Strategy</p>
      `
    });
    } catch (emailError) {
      console.error('⚠️  No se pudo enviar el email de aprobación (el usuario sí fue aprobado):', emailError.response?.data || emailError.message);
    }
    
    console.log(`✅ Usuario ${user.email} aprobado`);
    
    res.json({
      message: 'Usuario aprobado exitosamente',
      user
    });
    
  } catch (error) {
    console.error('Error en approve-user:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/admin/reject-user/:userId
 * Rechazar un usuario
 */
router.post('/reject-user/:userId', authenticateAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;
    
    const result = await pool.query(
      `UPDATE users
       SET status = $1, approved_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING id, email, name, status`,
      ['rejected', userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    const user = result.rows[0];
    
    // Enviar email de rechazo (no bloqueante)
    try {
      await sendEmail({
        to: user.email,
        subject: 'Tu registro no pudo ser procesado',
        html: `
          <p>Hola ${user.name || 'Inversor'},</p>
          <p>Lamentablemente, tu solicitud de registro no pudo ser procesada en este momento.</p>
          ${reason ? `<p><strong>Razón:</strong> ${reason}</p>` : ''}
          <p>Si tienes dudas, por favor contacta con soporte.</p>
        `
      });
    } catch (emailError) {
      console.error('⚠️  No se pudo enviar el email de rechazo (el usuario sí fue rechazado):', emailError.response?.data || emailError.message);
    }
    
    console.log(`❌ Usuario ${user.email} rechazado`);
    
    res.json({
      message: 'Usuario rechazado',
      user
    });
    
  } catch (error) {
    console.error('Error en reject-user:', error);
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
    const approvedUsers = await pool.query('SELECT COUNT(*) as count FROM users WHERE status = $1', ['approved']);
    const pendingUsers = await pool.query('SELECT COUNT(*) as count FROM users WHERE status = $1', ['pending']);
    const rejectedUsers = await pool.query('SELECT COUNT(*) as count FROM users WHERE status = $1', ['rejected']);
    
    const emailStats = await pool.query(
      `SELECT email_type, COUNT(*) as count FROM email_log GROUP BY email_type`
    );
    
    const buySignals = await pool.query(
      `SELECT COUNT(*) as count FROM ema200_history WHERE signal = $1`,
      ['buy']
    );
    
    res.json({
      users: {
        total: totalUsers.rows[0].count,
        approved: approvedUsers.rows[0].count,
        pending: pendingUsers.rows[0].count,
        rejected: rejectedUsers.rows[0].count
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
