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
      description: 'Fondo monetario de bajo riesgo. Recibe el 70% de cada aportación como "pólvora seca" para aprovechar las caídas importantes del mercado.',
      position: 1
    },
    {
      role: 'crecimiento',
      name: config.funds.crecimiento.name,
      isin: config.funds.crecimiento.isin,
      description: 'Fondo indexado mundial (desarrollados + emergentes, con EE. UU. como mayor peso). Recibe el 30% de cada aportación, siempre invertido para no perder la subida continua del mercado. Cuando llega una señal de compra, se le suma el capital acumulado en el Monetario.',
      position: 2
    },
    {
      role: 'jubilacion',
      name: config.funds.jubilacion.name,
      isin: config.funds.jubilacion.isin,
      description: 'Fondo de dividendos para generar renta en jubilación. En los últimos 5 años se rota el 20% anual desde el fondo de crecimiento.',
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
