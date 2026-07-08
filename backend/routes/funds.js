const express = require('express');
const { authenticateToken } = require('./auth');
const config = require('../config');

const router = express.Router();

/**
 * GET /api/funds/list
 * Obtener lista de fondos configurados
 * Requiere autenticación
 */
router.get('/list', authenticateToken, (req, res) => {
  const funds = [
    {
      role: 'espera',
      name: config.funds.espera.name,
      isin: config.funds.espera.isin,
      description: 'Fondo de bajo riesgo para acumular capital en espera',
      position: 1
    },
    {
      role: 'crecimiento',
      name: config.funds.crecimiento.name,
      isin: config.funds.crecimiento.isin,
      description: 'Fondo de crecimiento para aprovechar oportunidades',
      position: 2
    },
    {
      role: 'jubilacion',
      name: config.funds.jubilacion.name,
      isin: config.funds.jubilacion.isin,
      description: 'Fondo de dividendos para generar renta en jubilación',
      position: 3
    }
  ];
  
  res.json(funds);
});

/**
 * GET /api/funds/ema-history
 * Obtener historial del EMA200
 * Para mostrar contexto histórico en la app
 */
router.get('/ema-history', authenticateToken, (req, res) => {
  const history = [
    { year: 2010, event: 'Flash Crash', recovery: 'Recuperación en semanas' },
    { year: 2011, event: 'Crisis deuda europea', recovery: 'Recuperación en meses' },
    { year: 2015, event: 'Corrección China', recovery: 'Recuperación en meses' },
    { year: 2016, event: 'Continuación corrección', recovery: 'Recuperación en meses' },
    { year: 2018, event: 'Diciembre, caída brusca', recovery: 'Recuperación en 3 meses' },
    { year: 2020, event: 'COVID-19', recovery: 'Recuperación en 5 meses' },
    { year: 2022, event: 'Inflación / subida tipos', recovery: 'Recuperación en 12 meses' }
  ];
  
  res.json({
    history,
    averageFrequency: 'Cada 2-3 años',
    insight: 'Históricamente, el S&P 500 toca su EMA200 cada 2-3 años, proporcionando oportunidades de compra de bajo riesgo.'
  });
});

module.exports = router;
