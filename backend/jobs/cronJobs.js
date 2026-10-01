const cron = require('node-cron');
const axios = require('axios');
const config = require('../config');
const { sendEmail } = require('../services/emailService');

let pool;

function initializeCronJobs(dbPool) {
  pool = dbPool;
  
  console.log('📅 Inicializando cron jobs...');
  
  // Semanal (lunes) a las 8:00 AM España - Revisar EMA200 y enviar señales de compra.
  // La EMA200 se calcula sobre velas SEMANALES, por lo que el valor solo cambia una vez
  // por semana. Ejecutar a diario repetía la misma llamada a la API 6 de cada 7 días sin
  // aportar información nueva; pasar a semanal reduce ~85% el consumo de créditos de la API.
  cron.schedule('0 8 * * 1', weeklyEMA200Check, {
    timezone: 'Europe/Madrid'
  });
  
  // Día 1 de cada mes - Enviar email motivacional
  cron.schedule('0 8 1 * *', monthlyMotivation, {
    timezone: 'Europe/Madrid'
  });
  
  // Anual - Revisar si el usuario necesita iniciar rotación
  cron.schedule('0 9 * * *', checkRotationAnniversary, {
    timezone: 'Europe/Madrid'
  });
  
  console.log('✅ Cron jobs inicializados');
}

/**
 * Tarea semanal (lunes): Revisar EMA200 de S&P 500, Gold y Bitcoin.
 * La EMA200 es semanal, así que basta una ejecución por semana.
 */
async function weeklyEMA200Check() {
  console.log(`\n⏰ [${new Date().toISOString()}] Ejecutando: Weekly EMA200 Check`);
  
  try {
    // Monitorear los 3 activos
    // S&P 500: solo nos interesa el cruce BAJISTA, porque para esta estrategia
    // el precio por debajo de la EMA200 es una SEÑAL DE COMPRA (comprar barato
    // con la pólvora seca del Monetario). No hay alerta de venta para el S&P 500.
    await checkAssetEMA200('SPY', 'SPY', 'S&P 500', 'bearish');
    // Oro y Bitcoin: alertas en ambos cruces (entrada al alza y salida a la baja).
    await checkAssetEMA200('XAU/USD', 'GOLD', 'Gold', 'both');
    await checkAssetEMA200('BTC/USD', 'BTC', 'Bitcoin', 'both');
    
    // Si el S&P 500 se ha recuperado, intentar completar rotaciones pausadas
    const latestSPY = await pool.query(
      'SELECT price, ema200 FROM ema200_history WHERE asset_code = $1 ORDER BY date DESC LIMIT 1',
      ['SPY']
    );
    if (latestSPY.rows.length > 0) {
      const { price, ema200 } = latestSPY.rows[0];
      if (parseFloat(price) > parseFloat(ema200)) {
        await resumePausedRotations();
      }
    }
    
  } catch (error) {
    console.error('❌ Error en weeklyEMA200Check:', error.message);
  }
}

/**
 * Revisa la EMA200 de un activo específico y envía alertas según configuración
 * @param {string} symbol - Símbolo para API (SPY, XAU/USD, BTC/USD)
 * @param {string} assetCode - Código interno (SPY, GOLD, BTC)
 * @param {string} assetName - Nombre legible para emails
 * @param {string} crossType - 'bearish' (solo bajista), 'bullish' (solo alcista), 'both' (ambos)
 */
async function checkAssetEMA200(symbol, assetCode, assetName, crossType) {
  try {
    console.log(`\n📊 Revisando ${assetName} (${symbol})...`);
    
    // Obtener datos de Twelve Data
    const response = await axios.get('https://api.twelvedata.com/time_series', {
      params: {
        symbol: symbol,
        interval: 'week',
        outputsize: 260,
        apikey: config.twelveDataApiKey
      }
    });
    
    if (!response.data.values || response.data.values.length === 0) {
      console.error(`Error: No data from Twelve Data for ${assetName}`);
      return;
    }
    
    if (response.data.values.length < 200) {
      console.error(`Error: datos insuficientes para ${assetName} (${response.data.values.length} velas)`);
      return;
    }
    
    const latestWeek = response.data.values[0];
    const currentPrice = parseFloat(latestWeek.close);
    const ema200 = calculateEMA(response.data.values, 200);
    
    console.log(`   Precio: ${currentPrice.toFixed(2)} | EMA200: ${ema200.toFixed(2)}`);
    
    const isBelow = currentPrice <= ema200;
    let signal = null;
    
    // Determinar señal según posición actual
    if (isBelow && (crossType === 'bearish' || crossType === 'both')) {
      signal = 'sell'; // Bajista
    } else if (!isBelow && (crossType === 'bullish' || crossType === 'both')) {
      signal = 'buy'; // Alcista
    }
    
    // Obtener estado anterior
    const prev = await pool.query(
      'SELECT signal FROM ema200_history WHERE asset_code = $1 ORDER BY date DESC LIMIT 1',
      [assetCode]
    );
    const prevSignal = prev.rows.length > 0 ? prev.rows[0].signal : null;
    
    // Guardar en historial
    await pool.query(
      'INSERT INTO ema200_history (asset_code, date, price, ema200, signal) VALUES ($1, $2, $3, $4, $5)',
      [assetCode, new Date().toISOString().split('T')[0], currentPrice, ema200, signal]
    );
    
    // Detectar cruces frescos
    const freshBearishCross = signal === 'sell' && prevSignal !== 'sell';
    const freshBullishCross = signal === 'buy' && prevSignal !== 'buy';
    
    // Enviar alertas según el tipo de cruce detectado
    if (freshBearishCross) {
      console.log(`   ⚠️ CRUCE BAJISTA detectado para ${assetName}`);
      await sendCrossAlerts(assetCode, assetName, 'sell', currentPrice, ema200);
    }
    
    if (freshBullishCross) {
      console.log(`   ✅ CRUCE ALCISTA detectado para ${assetName}`);
      await sendCrossAlerts(assetCode, assetName, 'buy', currentPrice, ema200);
    }
    
    if (!freshBearishCross && !freshBullishCross) {
      console.log(`   ℹ️  Sin cruces nuevos para ${assetName}`);
    }
    
  } catch (error) {
    console.error(`❌ Error revisando ${assetName}:`, error.message);
  }
}

/**
 * Envía alertas de cruce EMA200 a usuarios según configuración
 * @param {string} assetCode - SPY, GOLD, BTC
 * @param {string} assetName - Nombre legible
 * @param {string} crossDirection - 'buy' (alcista) o 'sell' (bajista)
 * @param {number} price - Precio actual
 * @param {number} ema200 - EMA200 actual
 */
async function sendCrossAlerts(assetCode, assetName, crossDirection, price, ema200) {
  try {
    let users = [];
    
    if (assetCode === 'SPY') {
      // S&P 500: enviar a TODOS los usuarios (sin filtro de alternative_alerts)
      const result = await pool.query(
        'SELECT * FROM users WHERE status = $1',
        ['approved']
      );
      users = result.rows;
    } else {
      // Gold o Bitcoin: solo usuarios con alerta activada
      const result = await pool.query(
        `SELECT u.* FROM users u
         INNER JOIN alternative_alerts aa ON u.id = aa.user_id
         WHERE u.status = $1 AND aa.asset_code = $2 AND aa.enabled = true`,
        ['approved', assetCode]
      );
      users = result.rows;
    }
    
    if (users.length === 0) {
      console.log(`   📭 No hay usuarios para notificar sobre ${assetName}`);
      return;
    }
    
    // Determinar plantilla de email
    let template;
    if (assetCode === 'SPY') {
      // ESTRATEGIA S&P 500: el cruce BAJISTA (precio por debajo de la EMA200) NO es
      // una señal de venta, sino una SEÑAL DE COMPRA 🎯. Es el momento de usar la
      // "pólvora seca" del Fondo Monetario para comprar barato. Por eso el único
      // aviso del S&P 500 usa la plantilla 'buy_signal'.
      template = 'buy_signal';
    } else if (crossDirection === 'buy') {
      template = assetCode === 'GOLD' ? 'gold_buy' : 'btc_buy';
    } else {
      template = assetCode === 'GOLD' ? 'gold_sell' : 'btc_sell';
    }
    
    // Enviar emails
    for (const user of users) {
      try {
        await sendEmail({
          to: user.email,
          template: template,
          data: {
            name: user.name || 'Inversor',
            assetName: assetName,
            currentPrice: price.toFixed(2),
            ema200: ema200.toFixed(2)
          }
        });
        
        // Para el S&P 500 el cruce bajista es una señal de compra, así que lo
        // registramos como 'buy_signal' para que el historial sea coherente.
        const emailType = assetCode === 'SPY' ? 'buy_signal' : `${assetCode}_${crossDirection}`;
        await pool.query(
          'INSERT INTO email_log (user_id, email_type, subject) VALUES ($1, $2, $3)',
          [user.id, emailType, `Alerta ${assetName} EMA200`]
        );
      } catch (emailErr) {
        console.error(`   ❌ Error enviando alerta a ${user.email}:`, emailErr.message);
      }
    }
    
    console.log(`   ✉️  Enviadas ${users.length} alertas de ${assetName}`);
    
  } catch (error) {
    console.error(`❌ Error enviando alertas de ${assetName}:`, error.message);
  }
}

/**
 * Tarea mensual (día 1): Enviar email motivacional
 */
async function monthlyMotivation() {
  console.log(`\n⏰ [${new Date().toISOString()}] Ejecutando: Monthly Motivation`);
  
  try {
    const users = await pool.query(
      'SELECT * FROM users WHERE status = $1',
      ['approved']
    );
    
    for (const user of users.rows) {
      await sendEmail({
        to: user.email,
        subject: '¿Ya has aportado este mes? Tu jubilación te lo agradecerá',
        template: 'motivation',
        data: {
          name: user.name || 'Inversor',
          monthlyContribution: user.monthly_contribution
        }
      });
      
      await pool.query(
        'INSERT INTO email_log (user_id, email_type, subject) VALUES ($1, $2, $3)',
        [user.id, 'motivation', 'Motivación mensual']
      );
    }
    
    console.log(`✅ Se enviaron ${users.rows.length} emails de motivación`);
    
  } catch (error) {
    console.error('❌ Error en monthlyMotivation:', error.message);
  }
}

/**
 * Tarea diaria: Revisar aniversarios de usuarios para rotación de fondos
 */
async function checkRotationAnniversary() {
  console.log(`\n⏰ [${new Date().toISOString()}] Ejecutando: Check Rotation Anniversary`);
  
  try {
    const users = await pool.query(
      'SELECT * FROM users WHERE status = $1',
      ['approved']
    );
    
    for (const user of users.rows) {
      const birthDate = new Date(user.birth_date);
      const yearsUntilRetirement = calculateYearsUntilRetirement(birthDate);
      
      // Si quedan 5 años o menos, procesar el tramo de rotación de este año
      if (yearsUntilRetirement <= 5 && yearsUntilRetirement > 0) {
        const rotationYear = 6 - Math.ceil(yearsUntilRetirement);
        
        // Verificar si ya existe registro para este tramo
        const existing = await pool.query(
          'SELECT * FROM rotation_history WHERE user_id = $1 AND rotation_year = $2',
          [user.id, rotationYear]
        );
        
        if (existing.rows.length === 0) {
          // Tramo nuevo: procesarlo por primera vez
          console.log(`👤 Usuario ${user.email}: Procesando rotación tramo ${rotationYear}`);
          await processRotationTranche(user, rotationYear, null);
        } else if (existing.rows[0].status === 'paused') {
          // FALLO 2 arreglado: el tramo quedó pausado por un crash anterior.
          // Reintentamos: si el mercado ya se recuperó, se completará ahora.
          console.log(`👤 Usuario ${user.email}: Reintentando tramo pausado ${rotationYear}`);
          await processRotationTranche(user, rotationYear, existing.rows[0].id);
        }
        // Si el tramo ya está 'completed', no se hace nada.
      }
    }
    
  } catch (error) {
    console.error('❌ Error en checkRotationAnniversary:', error.message);
  }
}

/**
 * Procesa un tramo de rotación según el estado del mercado.
 * - Mercado sano (precio > EMA200): completa el tramo y avisa (rotation_active).
 * - Mercado en crash (precio <= EMA200): pausa el tramo y avisa (rotation_pause),
 *   dejándolo en estado 'paused' para completarlo cuando el mercado se recupere.
 *
 * @param {object} user
 * @param {number} rotationYear  Tramo 1..5
 * @param {number|null} existingId  id del registro si ya existía (tramo en pausa), o null si es nuevo
 */
async function processRotationTranche(user, rotationYear, existingId) {
  try {
    // Estado de mercado más reciente DEL S&P 500. La rotación a dividendos se
    // decide SIEMPRE según el S&P 500 (asset_code = 'SPY'), nunca según el Oro
    // ni el Bitcoin, aunque la tabla ema200_history también guarde sus lecturas.
    const latestEMA = await pool.query(
      "SELECT * FROM ema200_history WHERE asset_code = 'SPY' ORDER BY date DESC, id DESC LIMIT 1"
    );
    
    // Sin datos de mercado todavía: crear el tramo como pendiente y esperar
    // a que haya una lectura de EMA200 (no perdemos el tramo).
    if (latestEMA.rows.length === 0) {
      if (existingId === null) {
        await pool.query(
          'INSERT INTO rotation_history (user_id, rotation_year, status, percentage) VALUES ($1, $2, $3, $4)',
          [user.id, rotationYear, 'paused', 20 * rotationYear]
        );
      }
      console.log('Sin datos de EMA200 aún; tramo queda en pausa a la espera.');
      return;
    }
    
    const { price, ema200 } = latestEMA.rows[0];
    const isCrash = parseFloat(price) <= parseFloat(ema200);
    
    if (isCrash) {
      // Mercado en crash: pausar el tramo. Solo avisamos la primera vez
      // (si ya estaba en pausa, no reenviamos el email de pausa).
      if (existingId === null) {
        await pool.query(
          'INSERT INTO rotation_history (user_id, rotation_year, status, percentage) VALUES ($1, $2, $3, $4)',
          [user.id, rotationYear, 'paused', 20 * rotationYear]
        );
        try {
          await sendEmail({
            to: user.email,
            subject: 'Mercado inestable — Pausamos tu rotación este año',
            template: 'rotation_pause',
            data: { name: user.name || 'Inversor', rotationYear }
          });
        } catch (emailErr) {
          console.error(`No se pudo enviar email de pausa a ${user.email}:`, emailErr.message);
        }
        await pool.query(
          'INSERT INTO email_log (user_id, email_type, subject) VALUES ($1, $2, $3)',
          [user.id, `rotation_pause_${rotationYear}`, 'Rotación en pausa']
        );
      } else {
        console.log(`Tramo ${rotationYear} sigue en pausa (mercado aún por debajo de la EMA200).`);
      }
    } else {
      // Mercado sano: completar el tramo (nuevo o reactivado desde pausa).
      if (existingId === null) {
        await pool.query(
          'INSERT INTO rotation_history (user_id, rotation_year, status, percentage, completed_at) VALUES ($1, $2, $3, $4, NOW())',
          [user.id, rotationYear, 'completed', 20 * rotationYear]
        );
      } else {
        await pool.query(
          'UPDATE rotation_history SET status = $1, completed_at = NOW() WHERE id = $2',
          ['completed', existingId]
        );
      }
      try {
        await sendEmail({
          to: user.email,
          subject: `Es momento de proteger lo que has construido — Tramo ${rotationYear} de 5`,
          template: 'rotation_active',
          data: {
            name: user.name || 'Inversor',
            rotationYear,
            percentage: 20 * rotationYear
          }
        });
      } catch (emailErr) {
        console.error(`No se pudo enviar email de rotación a ${user.email}:`, emailErr.message);
      }
      await pool.query(
        'INSERT INTO email_log (user_id, email_type, subject) VALUES ($1, $2, $3)',
        [user.id, `rotation_active_${rotationYear}`, `Rotación tramo ${rotationYear}`]
      );
      console.log(`✅ Tramo ${rotationYear} completado para ${user.email}.`);
    }
    
  } catch (error) {
    console.error('Error en processRotationTranche:', error.message);
  }
}

/**
 * Reactiva los tramos de rotación que quedaron en pausa por un crash, cuando el
 * mercado se recupera (precio > EMA200). Se llama desde el chequeo diario de EMA200.
 * Así el tramo no se pierde: se completa en cuanto el mercado vuelve a estar sano,
 * sin esperar al siguiente aniversario.
 */
async function resumePausedRotations() {
  try {
    const paused = await pool.query(
      `SELECT rh.id, rh.rotation_year, u.email, u.name
       FROM rotation_history rh
       JOIN users u ON u.id = rh.user_id
       WHERE rh.status = 'paused' AND u.status = 'approved'`
    );
    
    if (paused.rows.length === 0) return;
    
    console.log(`🔄 Recuperando ${paused.rows.length} tramo(s) de rotación en pausa...`);
    for (const row of paused.rows) {
      // Recuperamos el usuario completo (necesitamos user.id para los logs).
      const u = await pool.query('SELECT * FROM users WHERE email = $1', [row.email]);
      if (u.rows.length === 0) continue;
      await processRotationTranche(u.rows[0], row.rotation_year, row.id);
    }
    
  } catch (error) {
    console.error('Error en resumePausedRotations:', error.message);
  }
}

/**
 * Función auxiliar: Calcular EMA200
 * (Implementación simplificada)
 */
function calculateEMA(values, period) {
  if (values.length < period) return parseFloat(values[0].close);
  
  const k = 2 / (period + 1);
  let ema = parseFloat(values[period - 1].close);
  
  for (let i = period - 2; i >= 0; i--) {
    const price = parseFloat(values[i].close);
    ema = price * k + ema * (1 - k);
  }
  
  return ema;
}

/**
 * Función auxiliar: Calcular años hasta jubilación
 */
function calculateYearsUntilRetirement(birthDate) {
  const today = new Date();
  const retirementDate = new Date(birthDate.getFullYear() + config.retirementAge, birthDate.getMonth(), birthDate.getDate());
  const yearsLeft = (retirementDate - today) / (1000 * 60 * 60 * 24 * 365.25);
  return Math.max(0, yearsLeft);
}

module.exports = {
  initializeCronJobs,
  calculateYearsUntilRetirement,
  // Exportados para pruebas unitarias (no usar en producción):
  weeklyEMA200Check,
  checkRotationAnniversary,
  processRotationTranche,
  resumePausedRotations,
  _setPool: (p) => { pool = p; }
};
