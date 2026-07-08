const cron = require('node-cron');
const axios = require('axios');
const config = require('../config');
const { sendEmail } = require('../services/emailService');

let pool;

function initializeCronJobs(dbPool) {
  pool = dbPool;
  
  console.log('📅 Inicializando cron jobs...');
  
  // Diario a las 8:00 AM España - Revisar EMA200 y enviar señales de compra
  cron.schedule('0 8 * * *', dailyEMA200Check, {
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
 * Tarea diaria: Revisar EMA200 del S&P 500
 * Si precio <= EMA200: enviar señal de compra
 */
async function dailyEMA200Check() {
  console.log(`\n⏰ [${new Date().toISOString()}] Ejecutando: Daily EMA200 Check`);
  
  try {
    // Obtener datos de Twelve Data
    const response = await axios.get('https://api.twelvedata.com/time_series', {
      params: {
        symbol: 'SPY',
        interval: 'week',
        // Se necesitan >= 200 velas semanales para calcular la EMA200 correctamente.
        outputsize: 260,
        apikey: config.twelveDataApiKey
      }
    });
    
    if (!response.data.values || response.data.values.length === 0) {
      console.error('Error: No data from Twelve Data');
      return;
    }
    
    // Sin suficientes datos no se puede calcular una EMA200 fiable.
    if (response.data.values.length < 200) {
      console.error(`Error: datos insuficientes para EMA200 (${response.data.values.length} velas). Se omite la comprobación.`);
      return;
    }
    
    const latestWeek = response.data.values[0];
    const currentPrice = parseFloat(latestWeek.close);
    
    // Calcular EMA200 manualmente (simplificado)
    const ema200 = calculateEMA(response.data.values, 200);
    
    console.log(`📊 Precio SPY: $${currentPrice} | EMA200: $${ema200.toFixed(2)}`);
    
    const isBelow = currentPrice <= ema200;
    const signal = isBelow ? 'buy' : null;
    
    // FALLO 1 arreglado: solo se avisa en el CRUCE a la baja, no todos los días
    // que el precio siga por debajo. Miramos el último estado ANTES de insertar
    // el de hoy para detectar la transición (arriba -> abajo).
    const prev = await pool.query(
      'SELECT signal FROM ema200_history ORDER BY date DESC, id DESC LIMIT 1'
    );
    const prevBelow = prev.rows.length > 0 && prev.rows[0].signal === 'buy';
    
    // Guardar en historial (esto "rearma" la alerta: cuando el precio vuelve a
    // subir por encima, prevBelow pasa a false y un nuevo cruce volverá a avisar).
    await pool.query(
      'INSERT INTO ema200_history (date, price, ema200, signal) VALUES ($1, $2, $3, $4)',
      [new Date().toISOString().split('T')[0], currentPrice, ema200, signal]
    );
    
    // Cruce fresco a la baja: estaba por encima y ahora ha tocado/cruzado.
    const freshCross = isBelow && !prevBelow;
    
    if (freshCross) {
      console.log('🎯 ¡SEÑAL DE COMPRA DETECTADA (nuevo cruce)!');
      
      // Obtener todos los usuarios aprobados
      const users = await pool.query(
        'SELECT * FROM users WHERE status = $1',
        ['approved']
      );
      
      // Enviar email a cada usuario
      for (const user of users.rows) {
        try {
          await sendEmail({
            to: user.email,
            subject: '¡Es el momento! El S&P 500 ha tocado la EMA200',
            template: 'buy_signal',
            data: {
              name: user.name || 'Inversor',
              currentPrice,
              ema200: ema200.toFixed(2)
            }
          });
        } catch (emailErr) {
          console.error(`No se pudo enviar señal de compra a ${user.email}:`, emailErr.message);
        }
        
        // Registrar envío
        await pool.query(
          'INSERT INTO email_log (user_id, email_type, subject) VALUES ($1, $2, $3)',
          [user.id, 'buy_signal', 'Señal de compra EMA200']
        );
      }
    } else if (isBelow) {
      console.log('ℹ️  Precio sigue por debajo de la EMA200 (ya avisado, no se reenvía).');
    }
    
    // Si el mercado se ha recuperado (por encima de la EMA200), intentar completar
    // los tramos de rotación que quedaron en pausa por un crash anterior.
    if (!isBelow) {
      await resumePausedRotations();
    }
    
  } catch (error) {
    console.error('❌ Error en dailyEMA200Check:', error.message);
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
    // Estado de mercado más reciente
    const latestEMA = await pool.query(
      'SELECT * FROM ema200_history ORDER BY date DESC, id DESC LIMIT 1'
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
  dailyEMA200Check,
  checkRotationAnniversary,
  processRotationTranche,
  resumePausedRotations,
  _setPool: (p) => { pool = p; }
};
