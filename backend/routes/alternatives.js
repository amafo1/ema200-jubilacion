const express = require('express');
const { authenticateToken } = require('./auth');

const router = express.Router();
let pool;

router.use((req, res, next) => {
  if (!pool && req.app.locals.pool) {
    pool = req.app.locals.pool;
  }
  next();
});

// Activos alternativos soportados. El código es la clave interna; el ISIN y el
// nombre se devuelven para que el frontend pueda mostrarlos de forma consistente.
const ASSETS = {
  GOLD: { code: 'GOLD', name: 'WisdomTree Physical Gold', isin: 'JE00B8DFY052' },
  BTC: { code: 'BTC', name: 'iShares Bitcoin ETP', isin: 'XS2940466316' },
};

/**
 * GET /api/alternatives/status
 * Devuelve el estado de las alertas EMA200 del usuario para cada activo alternativo.
 * Si no existe fila en la BD para un activo, se considera desactivado (enabled: false).
 */
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const result = await pool.query(
      'SELECT asset_code, enabled FROM alternative_alerts WHERE user_id = $1',
      [userId]
    );

    // Mapa de estado actual por activo
    const enabledMap = {};
    result.rows.forEach((row) => {
      enabledMap[row.asset_code] = row.enabled;
    });

    const assets = Object.values(ASSETS).map((asset) => ({
      code: asset.code,
      name: asset.name,
      isin: asset.isin,
      enabled: enabledMap[asset.code] === true,
    }));

    res.json({ assets });
  } catch (error) {
    console.error('Error en alternatives/status:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/alternatives/toggle
 * Body: { assetCode: 'GOLD' | 'BTC', enabled: boolean }
 * Activa o desactiva las alertas EMA200 del usuario para un activo concreto.
 */
router.put('/toggle', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { assetCode, enabled } = req.body;

    if (!assetCode || !ASSETS[assetCode]) {
      return res.status(400).json({ error: 'Activo no válido' });
    }
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ error: 'El campo "enabled" debe ser booleano' });
    }

    // Upsert: inserta la fila o actualiza el estado si ya existe (clave única user+asset)
    const result = await pool.query(
      `INSERT INTO alternative_alerts (user_id, asset_code, enabled, created_at, updated_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id, asset_code)
       DO UPDATE SET enabled = EXCLUDED.enabled, updated_at = CURRENT_TIMESTAMP
       RETURNING asset_code, enabled`,
      [userId, assetCode, enabled]
    );

    res.json({
      assetCode: result.rows[0].asset_code,
      enabled: result.rows[0].enabled,
    });
  } catch (error) {
    console.error('Error en alternatives/toggle:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
