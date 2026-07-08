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
    
    // Guardar en historial
    await pool.query(
      'INSERT INTO ema200_history (date, price, ema200, signal) VALUES ($1, $2, $3, $4)',
      [new Date().toISOString().split('T')[0], currentPrice, ema200, currentPrice <= ema200 ? 'buy' : null]
    );
    
    // Si hay señal de compra
    if (currentPrice <= ema200) {
      console.log('🎯 ¡SEÑAL DE COMPRA DETECTADA!');
      
      // Obtener todos los usuarios aprobados
      const users = await pool.query(
        'SELECT * FROM users WHERE status = $1',
        ['approved']
      );
      
      // Enviar email a cada usuario
      for (const user of users.rows) {
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
        
        // Registrar envío
        await pool.query(
          'INSERT INTO email_log (user_id, email_type, subject) VALUES ($1, $2, $3)',
          [user.id, 'buy_signal', 'Señal de compra EMA200']
        );
      }
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
      
      // Si quedan 5 años o menos, iniciar rotación
      if (yearsUntilRetirement <= 5 && yearsUntilRetirement > 0) {
        const rotationYear = 6 - Math.ceil(yearsUntilRetirement);
        
        // Verificar si ya existe registro
        const existing = await pool.query(
          'SELECT * FROM rotation_history WHERE user_id = $1 AND rotation_year = $2',
          [user.id, rotationYear]
        );
        
        if (existing.rows.length === 0) {
          console.log(`👤 Usuario ${user.email}: Iniciando rotación año ${rotationYear}`);
          
          // Crear registro de rotación
          await pool.query(
            'INSERT INTO rotation_history (user_id, rotation_year, status) VALUES ($1, $2, $3)',
            [user.id, rotationYear, 'pending']
          );
          
          // Enviar email de rotación (si no está en crash)
          await checkAndSendRotationEmail(user, rotationYear);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error en checkRotationAnniversary:', error.message);
  }
}

/**
 * Enviar email de rotación considerando estado del mercado
 */
async function checkAndSendRotationEmail(user, rotationYear) {
  try {
    // Obtener último precio del EMA200
    const latestEMA = await pool.query(
      'SELECT * FROM ema200_history ORDER BY date DESC LIMIT 1'
    );
    
    if (latestEMA.rows.length === 0) return;
    
    const { price, ema200 } = latestEMA.rows[0];
    const isCrash = price <= ema200;
    
    if (isCrash) {
      // Mercado en crash: pausa la rotación
      await sendEmail({
        to: user.email,
        subject: 'Mercado inestable — Pausamos tu rotación este año',
        template: 'rotation_pause',
        data: {
          name: user.name || 'Inversor',
          rotationYear
        }
      });
    } else {
      // Mercado normal: procede con rotación
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
    }
    
  } catch (error) {
    console.error('Error en checkAndSendRotationEmail:', error.message);
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
  calculateYearsUntilRetirement
};
