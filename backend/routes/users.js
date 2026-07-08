const express = require('express');
const { authenticateToken } = require('./auth');
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
 * GET /api/users/profile
 * Obtener perfil del usuario actual
 */
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await pool.query(
      'SELECT id, email, name, birth_date, monthly_contribution, created_at, approved_at FROM users WHERE id = $1',
      [req.user.userId]
    );
    
    if (user.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    const userData = user.rows[0];
    
    // Calcular años hasta jubilación
    const birthDate = new Date(userData.birth_date);
    const today = new Date();
    const retirementDate = new Date(birthDate.getFullYear() + config.retirementAge, birthDate.getMonth(), birthDate.getDate());
    const yearsUntilRetirement = Math.max(0, (retirementDate - today) / (1000 * 60 * 60 * 24 * 365.25));
    
    res.json({
      ...userData,
      yearsUntilRetirement: parseFloat(yearsUntilRetirement.toFixed(1))
    });
    
  } catch (error) {
    console.error('Error en profile:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/users/profile
 * Actualizar perfil del usuario
 */
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { name, monthlyContribution } = req.body;
    const userId = req.user.userId;
    
    // Actualizar solo nombre y aportación (otros campos no son editables)
    const result = await pool.query(
      `UPDATE users SET name = COALESCE($1, name), monthly_contribution = COALESCE($2, monthly_contribution)
       WHERE id = $3
       RETURNING id, email, name, birth_date, monthly_contribution`,
      [name || null, monthlyContribution || null, userId]
    );
    
    res.json(result.rows[0]);
    
  } catch (error) {
    console.error('Error en PUT profile:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/users/simulation
 * Obtener simulación de jubilación
 * Query params: monthlyContribution (opcional), scenario (conservative, historic, optimistic)
 */
router.get('/simulation', authenticateToken, async (req, res) => {
  try {
    const { monthlyContribution, scenario = 'historic' } = req.query;
    
    // Obtener datos del usuario
    const user = await pool.query(
      'SELECT birth_date, monthly_contribution FROM users WHERE id = $1',
      [req.user.userId]
    );
    
    if (user.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    const userData = user.rows[0];
    const monthlyAmount = parseFloat(monthlyContribution) || parseFloat(userData.monthly_contribution);
    
    // Calcular años hasta jubilación
    const birthDate = new Date(userData.birth_date);
    const today = new Date();
    const retirementDate = new Date(birthDate.getFullYear() + config.retirementAge, birthDate.getMonth(), birthDate.getDate());
    const yearsUntilRetirement = Math.max(0, (retirementDate - today) / (1000 * 60 * 60 * 24 * 365.25));
    
    // Definir retornos anuales según escenario
    const returns = {
      conservative: 0.07,
      historic: 0.10,
      optimistic: 0.13
    };
    
    const annualReturn = returns[scenario] || returns.historic;
    
    // Simular crecimiento
    let patrimonio = 0;
    const monthlyReturn = Math.pow(1 + annualReturn, 1/12) - 1;
    const monthsUntilRetirement = Math.floor(yearsUntilRetirement * 12);
    
    for (let i = 0; i < monthsUntilRetirement; i++) {
      patrimonio = patrimonio * (1 + monthlyReturn) + monthlyAmount;
    }
    
    // Calcular dividendos anuales (3.5% sobre patrimonio final)
    const dividendosAnuales = patrimonio * config.dividendYield;
    const dividendosMensual = dividendosAnuales / 12;
    
    // Aplicar retenciones fiscales españolas
    const retenciones = {
      'hasta_6000': 0.19,
      '6000_50000': 0.21,
      'mayor_50000': 0.23
    };
    
    let retension = 0;
    if (dividendosAnuales <= 6000) {
      retension = dividendosAnuales * retenciones.hasta_6000;
    } else if (dividendosAnuales <= 50000) {
      retension = (6000 * retenciones.hasta_6000) + ((dividendosAnuales - 6000) * retenciones['6000_50000']);
    } else {
      retension = (6000 * retenciones.hasta_6000) + (44000 * retenciones['6000_50000']) + ((dividendosAnuales - 50000) * retenciones.mayor_50000);
    }
    
    const dividendosNetos = dividendosAnuales - retension;
    const dividendosNetosMensual = dividendosNetos / 12;
    
    res.json({
      scenario,
      monthlyContribution: monthlyAmount,
      yearsUntilRetirement: parseFloat(yearsUntilRetirement.toFixed(1)),
      annualReturn: (annualReturn * 100).toFixed(1),
      patrimonioEstimado: parseFloat(patrimonio.toFixed(2)),
      dividendosAnualesBrutos: parseFloat(dividendosAnuales.toFixed(2)),
      dividendosMensualBruto: parseFloat(dividendosMensual.toFixed(2)),
      retension: parseFloat(retension.toFixed(2)),
      dividendosAnualesNetos: parseFloat(dividendosNetos.toFixed(2)),
      dividendosMensualNeto: parseFloat(dividendosNetosMensual.toFixed(2))
    });
    
  } catch (error) {
    console.error('Error en simulation:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/users/alerts
 * Obtener estado de alertas del usuario
 */
router.get('/alerts', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Obtener historial de emails enviados
    const emailHistory = await pool.query(
      `SELECT email_type, COUNT(*) as count, MAX(sent_at) as last_sent
       FROM email_log
       WHERE user_id = $1
       GROUP BY email_type
       ORDER BY last_sent DESC`,
      [userId]
    );
    
    // Obtener historial de rotación
    const rotationHistory = await pool.query(
      'SELECT * FROM rotation_history WHERE user_id = $1 ORDER BY rotation_year ASC',
      [userId]
    );
    
    res.json({
      emailHistory: emailHistory.rows,
      rotationHistory: rotationHistory.rows,
      alertsActive: true,
      alertTypes: [
        { name: 'Motivación mensual', frequency: 'Día 1 de cada mes', status: 'active' },
        { name: 'Señal de compra', frequency: 'Cuando S&P500 toca EMA200', status: 'active' },
        { name: 'Rotación a dividendos', frequency: '20% anual (5 años antes jubilación)', status: 'active' }
      ]
    });
    
  } catch (error) {
    console.error('Error en alerts:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/users/account
 * Eliminar permanentemente la cuenta del usuario y todos sus datos relacionados.
 * Requiere confirmación explícita: body { confirm: "ELIMINAR" }
 */
router.delete('/account', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const { confirm } = req.body;
    if (confirm !== 'ELIMINAR') {
      return res.status(400).json({ error: 'Debes escribir ELIMINAR para confirmar el borrado de la cuenta.' });
    }

    const userId = req.user.userId;

    await client.query('BEGIN');
    // Borrar primero los registros que referencian al usuario (claves foráneas)
    await client.query('DELETE FROM email_log WHERE user_id = $1', [userId]);
    await client.query('DELETE FROM rotation_history WHERE user_id = $1', [userId]);
    const result = await client.query('DELETE FROM users WHERE id = $1 RETURNING email', [userId]);
    await client.query('COMMIT');

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    console.log(`🗑️  Cuenta eliminada: ${result.rows[0].email}`);
    res.json({ message: 'Cuenta eliminada correctamente' });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al eliminar cuenta:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

module.exports = router;
