const axios = require('axios');
const config = require('../config');

const brevoBaseUrl = 'https://api.brevo.com/v3';

/**
 * Plantillas de email
 */
const emailTemplates = {
  motivation: {
    subject: '¿Ya has aportado este mes? Tu jubilación te lo agradecerá',
    html: (data) => `
      <h2>¡Hola ${data.name}!</h2>
      <p>Es el <strong>primer día del mes</strong> y es el momento perfecto para hacer tu aportación mensual de <strong>€${data.monthlyContribution}</strong>.</p>
      <p>Recuerda: <strong>la consistencia es la clave</strong>. Cada euro que aportes hoy será exponencialmente más grande en tu jubilación.</p>
      
      <p style="background-color: #eef6ff; padding: 15px; border-radius: 5px;">
        <strong>Cómo repartir tu aportación:</strong><br>
        • <strong>70%</strong> al <strong>Fondo Monetario</strong> (${config.funds.espera.isin}) — tu "pólvora seca" reservada para aprovechar las caídas importantes.<br>
        • <strong>30%</strong> al <strong>${config.funds.crecimiento.name}</strong> (${config.funds.crecimiento.isin}) — siempre invertido en renta variable, para no perderte la subida continua del mercado.
      </p>
      
      <p>Los mercados caen, dan miedo y generan dudas. Precisamente en esos momentos es cuando esta estrategia actúa. Mientras otros se asustan, tú sigues invirtiendo.</p>
      <p><a href="https://www.myinvestor.es" style="background-color: #003366; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Aporta ahora en MyInvestor</a></p>
      <p style="color: #666; font-size: 12px; margin-top: 30px;">Tu jubilación automática — EMA200 Strategy</p>
    `
  },
  
  buy_signal: {
    subject: '¡Es el momento! El S&P 500 ha tocado la EMA200',
    html: (data) => `
      <h2>¡Oportunidad de compra! 🎯</h2>
      <p>El S&P 500 ha tocado su nivel de soporte (EMA200 semanal).</p>
      <p><strong>Precio actual:</strong> $${data.currentPrice}</p>
      <p><strong>EMA200 semanal:</strong> $${data.ema200}</p>
      <p>Este es exactamente el momento para el que fue diseñada esta estrategia.</p>
      
      <h3>¿Qué hacer?</h3>
      <ol>
        <li>Ve a tu cuenta de MyInvestor</li>
        <li>En el <strong>Fondo Monetario</strong> (${config.funds.espera.isin}), vende la parte que quieras invertir (esta es tu "pólvora seca" reservada para las caídas)</li>
        <li>Compra el <strong>${config.funds.crecimiento.name}</strong> (${config.funds.crecimiento.isin})</li>
      </ol>
      
      <p style="background-color: #fffacd; padding: 15px; border-radius: 5px;">
        <strong>Nota:</strong> Históricamente, esta estrategia ha generado oportunidades de compra cada 2-3 años. Este es el tipo de momento que genera rentabilidad a largo plazo.
      </p>
      
      <p style="background-color: #eef6ff; padding: 15px; border-radius: 5px;">
        <strong>Recuerda tu reparto habitual:</strong> cada vez que aportas dinero nuevo, un <strong>70%</strong> va al Fondo Monetario (pólvora para aprovechar caídas como esta) y un <strong>30%</strong> siempre al ${config.funds.crecimiento.name}, para no perderte la subida continua del mercado.
      </p>
      
      <p><a href="https://www.myinvestor.es" style="background-color: #003366; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Accede a MyInvestor</a></p>
      <p style="color: #666; font-size: 12px; margin-top: 30px;">Tu jubilación automática — EMA200 Strategy</p>
    `
  },
  
  sp500_sell: {
    subject: '⚠️ Alerta de salida: S&P 500 cruza bajista la EMA200',
    html: (data) => `
      <h2>⚠️ Señal de salida detectada</h2>
      <p>Hola ${data.name},</p>
      <p>El S&P 500 acaba de cruzar <strong>por debajo</strong> de su EMA200 semanal.</p>
      <p><strong>Precio actual:</strong> $${data.currentPrice}</p>
      <p><strong>EMA200 semanal:</strong> $${data.ema200}</p>
      
      <p style="background-color: #fff3cd; padding: 15px; border-radius: 5px;">
        <strong>Contexto:</strong> Este es un momento de prudencia. El mercado ha entrado en tendencia bajista según la EMA200. Es el momento de proteger capital moviendo posiciones del ${config.funds.crecimiento.name} al Fondo Monetario hasta que el mercado se recupere.
      </p>
      
      <h3>¿Qué hacer?</h3>
      <ol>
        <li>Ve a tu cuenta de MyInvestor</li>
        <li>En el <strong>${config.funds.crecimiento.name}</strong> (${config.funds.crecimiento.isin}), vende la parte que quieras proteger</li>
        <li>Compra el <strong>Fondo Monetario</strong> (${config.funds.espera.isin}) para guardar esa "pólvora seca" hasta la próxima oportunidad de compra</li>
      </ol>
      
      <p style="background-color: #eef6ff; padding: 15px; border-radius: 5px;">
        <strong>Recuerda:</strong> La disciplina es clave. No vendas por pánico, vende por estrategia. Te avisaremos cuando el mercado vuelva a tocar la EMA200 al alza para reinvertir.
      </p>
      
      <p><a href="https://www.myinvestor.es" style="background-color: #003366; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Accede a MyInvestor</a></p>
      <p style="color: #666; font-size: 12px; margin-top: 30px;">Tu jubilación automática — EMA200 Strategy</p>
    `
  },
  
  gold_buy: {
    subject: '🟡 Oportunidad: Gold cruza alcista la EMA200',
    html: (data) => `
      <h2>✅ Señal de entrada en Gold</h2>
      <p>Hola ${data.name},</p>
      <p>El <strong>WisdomTree Physical Gold</strong> (ISIN: JE00B8DFY052) acaba de cruzar <strong>por encima</strong> de su EMA200 semanal.</p>
      <p><strong>Precio actual:</strong> $${data.currentPrice}</p>
      <p><strong>EMA200 semanal:</strong> $${data.ema200}</p>
      
      <p style="background-color: #fffacd; padding: 15px; border-radius: 5px;">
        <strong>Contexto:</strong> El oro ha entrado en tendencia alcista. Este activo suele funcionar como protección contra inflación y crisis. Puede ser un buen momento para considerar añadirlo a tu cartera.
      </p>
      
      <h3>¿Qué hacer?</h3>
      <p>Esta es solo una alerta informativa. Si decides invertir en oro:</p>
      <ol>
        <li>Ve a tu cuenta de MyInvestor o tu broker</li>
        <li>Busca el ETF <strong>WisdomTree Physical Gold</strong> con ISIN: <strong>JE00B8DFY052</strong></li>
        <li>Considera el tamaño de posición según tu estrategia personal</li>
      </ol>
      
      <p style="background-color: #eef6ff; padding: 15px; border-radius: 5px;">
        <strong>Recuerda:</strong> Este activo es complementario a tu estrategia principal de S&P 500. No sustituye tu plan de jubilación, solo lo diversifica.
      </p>
      
      <p style="color: #666; font-size: 12px; margin-top: 30px;">Tu jubilación automática — Alertas Alternativas</p>
    `
  },
  
  gold_sell: {
    subject: '🟡 Alerta: Gold cruza bajista la EMA200',
    html: (data) => `
      <h2>⚠️ Señal de salida en Gold</h2>
      <p>Hola ${data.name},</p>
      <p>El <strong>WisdomTree Physical Gold</strong> (ISIN: JE00B8DFY052) acaba de cruzar <strong>por debajo</strong> de su EMA200 semanal.</p>
      <p><strong>Precio actual:</strong> $${data.currentPrice}</p>
      <p><strong>EMA200 semanal:</strong> $${data.ema200}</p>
      
      <p style="background-color: #fff3cd; padding: 15px; border-radius: 5px;">
        <strong>Contexto:</strong> El oro ha entrado en tendencia bajista según la EMA200. Puede ser momento de considerar reducir posiciones o salir temporalmente hasta que recupere la tendencia alcista.
      </p>
      
      <h3>¿Qué hacer?</h3>
      <p>Esta es solo una alerta informativa. Si tienes posiciones en oro, considera:</p>
      <ol>
        <li>Revisar tu exposición actual al oro</li>
        <li>Evaluar si quieres mantener o reducir posiciones</li>
        <li>Esperar a la próxima señal de entrada (cruce alcista) para reinvertir</li>
      </ol>
      
      <p style="background-color: #eef6ff; padding: 15px; border-radius: 5px;">
        <strong>Recuerda:</strong> La disciplina de seguir la EMA200 también aplica a las salidas. Te avisaremos cuando el oro vuelva a cruzar al alza.
      </p>
      
      <p style="color: #666; font-size: 12px; margin-top: 30px;">Tu jubilación automática — Alertas Alternativas</p>
    `
  },
  
  btc_buy: {
    subject: '₿ Oportunidad: Bitcoin ETP cruza alcista la EMA200',
    html: (data) => `
      <h2>✅ Señal de entrada en Bitcoin ETP</h2>
      <p>Hola ${data.name},</p>
      <p>El <strong>iShares Bitcoin ETP</strong> (ISIN: XS2940466316) acaba de cruzar <strong>por encima</strong> de su EMA200 semanal.</p>
      <p><strong>Precio actual:</strong> $${data.currentPrice}</p>
      <p><strong>EMA200 semanal:</strong> $${data.ema200}</p>
      
      <p style="background-color: #fffacd; padding: 15px; border-radius: 5px;">
        <strong>Contexto:</strong> Bitcoin ha entrado en tendencia alcista. Este ETP ofrece exposición regulada a Bitcoin sin necesidad de gestionar wallets. Recuerda que es un activo de alta volatilidad.
      </p>
      
      <h3>¿Qué hacer?</h3>
      <p>Esta es solo una alerta informativa. Si decides invertir en Bitcoin:</p>
      <ol>
        <li>Ve a tu cuenta de MyInvestor o tu broker</li>
        <li>Busca el ETP <strong>iShares Bitcoin ETP</strong> con ISIN: <strong>XS2940466316</strong></li>
        <li>Considera el tamaño de posición adecuado para tu perfil de riesgo</li>
      </ol>
      
      <p style="background-color: #fff3cd; padding: 15px; border-radius: 5px;">
        <strong>⚠️ Importante:</strong> Bitcoin es un activo de muy alta volatilidad. Solo invierte capital que puedas permitirte perder. No debe representar más de un pequeño porcentaje de tu cartera.
      </p>
      
      <p style="background-color: #eef6ff; padding: 15px; border-radius: 5px;">
        <strong>Recuerda:</strong> Este activo es complementario a tu estrategia principal de S&P 500. No sustituye tu plan de jubilación, solo lo diversifica.
      </p>
      
      <p style="color: #666; font-size: 12px; margin-top: 30px;">Tu jubilación automática — Alertas Alternativas</p>
    `
  },
  
  btc_sell: {
    subject: '₿ Alerta: Bitcoin ETP cruza bajista la EMA200',
    html: (data) => `
      <h2>⚠️ Señal de salida en Bitcoin ETP</h2>
      <p>Hola ${data.name},</p>
      <p>El <strong>iShares Bitcoin ETP</strong> (ISIN: XS2940466316) acaba de cruzar <strong>por debajo</strong> de su EMA200 semanal.</p>
      <p><strong>Precio actual:</strong> $${data.currentPrice}</p>
      <p><strong>EMA200 semanal:</strong> $${data.ema200}</p>
      
      <p style="background-color: #fff3cd; padding: 15px; border-radius: 5px;">
        <strong>Contexto:</strong> Bitcoin ha entrado en tendencia bajista según la EMA200. Dada su alta volatilidad, puede ser momento de proteger capital reduciendo o cerrando posiciones temporalmente.
      </p>
      
      <h3>¿Qué hacer?</h3>
      <p>Esta es solo una alerta informativa. Si tienes posiciones en Bitcoin ETP, considera:</p>
      <ol>
        <li>Revisar tu exposición actual a Bitcoin</li>
        <li>Evaluar si quieres mantener, reducir o salir completamente</li>
        <li>Esperar a la próxima señal de entrada (cruce alcista) para reinvertir</li>
      </ol>
      
      <p style="background-color: #eef6ff; padding: 15px; border-radius: 5px;">
        <strong>Recuerda:</strong> La disciplina de seguir la EMA200 también aplica a las salidas. Las correcciones de Bitcoin pueden ser severas. Te avisaremos cuando vuelva a cruzar al alza.
      </p>
      
      <p style="color: #666; font-size: 12px; margin-top: 30px;">Tu jubilación automática — Alertas Alternativas</p>
    `
  },
  
  rotation_active: {
    subject: (data) => `Es momento de proteger lo que has construido — Tramo ${data.rotationYear} de 5`,
    html: (data) => `
      <h2>Inicio de rotación a fondos defensivos</h2>
      <p>Has invertido sabiamente y el mercado ha recompensado tu disciplina. Ahora es el momento de <strong>proteger lo que has construido</strong>.</p>
      
      <p><strong>Tu plan:</strong> Rotar el <strong>20%</strong> de tu posición en ${config.funds.crecimiento.name} hacia el Fondo de Dividendos (Tramo ${data.rotationYear} de 5).</p>
      
      <p>Esta rotación gradual te permitirá vivir de los dividendos en tu jubilación mientras mantienes exposición al crecimiento.</p>
      
      <h3>¿Qué hacer?</h3>
      <ol>
        <li>Ve a MyInvestor</li>
        <li>En el <strong>${config.funds.crecimiento.name}</strong> (${config.funds.crecimiento.isin}), vende el <strong>20%</strong> de tu posición</li>
        <li>Compra el Fondo de Dividendos (${config.funds.jubilacion.isin})</li>
      </ol>
      
      <p><a href="https://www.myinvestor.es" style="background-color: #003366; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Accede a MyInvestor</a></p>
      <p style="color: #666; font-size: 12px; margin-top: 30px;">Tu jubilación automática — EMA200 Strategy</p>
    `
  },
  
  rotation_pause: {
    subject: 'Mercado inestable — Pausamos tu rotación este año',
    html: (data) => `
      <h2>Pausa estratégica en tu rotación</h2>
      <p>El S&P 500 está pasando por un período de corrección (por debajo de su EMA200 semanal).</p>
      <p><strong>Por seguridad, pausamos tu rotación este año.</strong></p>
      
      <p style="background-color: #fff3cd; padding: 15px; border-radius: 5px;">
        <strong>¿Qué significa?</strong> No hagas nada. Nos encargaremos de avisarte cuando el mercado se recupere y sea el momento de completar la rotación.
      </p>
      
      <p>Esta es la disciplina que hace que esta estrategia funcione. <strong>El pánico vende en pérdidas. La disciplina espera y compra en oportunidades.</strong></p>
      
      <p>Te avisaremos cuando sea el momento.</p>
      <p style="color: #666; font-size: 12px; margin-top: 30px;">Tu jubilación automática — EMA200 Strategy</p>
    `
  },
  
  registration_pending: {
    subject: 'Tu cuenta está pendiente de activación',
    html: (data) => `
      <h2>¡Bienvenido a tu jubilación automática!</h2>
      <p>Hola ${data.name},</p>
      <p>Tu cuenta ha sido registrada correctamente. Ahora está <strong>pendiente de aprobación por el administrador</strong>.</p>
      <p>Recibirás un email cuando sea aprobada y entonces comenzarás a recibir las alertas automáticas.</p>
      <p style="color: #666; font-size: 12px; margin-top: 30px;">Tu jubilación automática — EMA200 Strategy</p>
    `
  },
  
  admin_new_registration: {
    subject: 'Nuevo registro pendiente de aprobación',
    html: (data) => `
      <h2>Nuevo usuario pendiente de aprobación</h2>
      <p>Se acaba de registrar un nuevo usuario en la plataforma y está esperando tu aprobación:</p>
      <table style="border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 6px 12px; color: #666;">Nombre</td><td style="padding: 6px 12px; font-weight: bold;">${data.name || '—'}</td></tr>
        <tr><td style="padding: 6px 12px; color: #666;">Email</td><td style="padding: 6px 12px; font-weight: bold;">${data.email}</td></tr>
        <tr><td style="padding: 6px 12px; color: #666;">Fecha de nacimiento</td><td style="padding: 6px 12px; font-weight: bold;">${data.birthDate || '—'}</td></tr>
        <tr><td style="padding: 6px 12px; color: #666;">Aportación mensual</td><td style="padding: 6px 12px; font-weight: bold;">${data.monthlyContribution ? data.monthlyContribution + ' €' : '—'}</td></tr>
      </table>
      <p>Entra en el <strong>Panel de administración</strong> (pestaña "Administración" en tu cuenta) para aprobarlo o rechazarlo.</p>
      ${data.adminUrl ? `<p><a href="${data.adminUrl}" style="display: inline-block; background: #001f3f; color: #fff; padding: 12px 20px; border-radius: 8px; text-decoration: none; font-weight: bold;">Ir al panel de administración</a></p>` : ''}
      <p style="color: #666; font-size: 12px; margin-top: 30px;">Tu jubilación automática — EMA200 Strategy</p>
    `
  }
};

/**
 * Enviar email a través de Brevo
 */
async function sendEmail({ to, subject, template, data, html }) {
  try {
    let finalSubject = subject;
    let htmlContent = html || '';
    
    // Si es una plantilla, obtenerla (tiene prioridad sobre html directo)
    if (template && emailTemplates[template]) {
      const tmpl = emailTemplates[template];
      finalSubject = typeof tmpl.subject === 'function' ? tmpl.subject(data) : tmpl.subject;
      htmlContent = tmpl.html(data);
    }
    
    const payload = {
      sender: {
        email: config.emailFrom,
        name: 'EMA200 Jubilación'
      },
      to: [{ email: to }],
      subject: finalSubject,
      htmlContent: htmlContent
    };
    
    const response = await axios.post(
      `${brevoBaseUrl}/smtp/email`,
      payload,
      {
        headers: {
          'api-key': config.brevoApiKey,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log(`✉️  Email enviado a ${to}: ${finalSubject}`);
    return response.data;
    
  } catch (error) {
    console.error(`❌ Error enviando email a ${to}:`, error.response?.data || error.message);
    throw error;
  }
}

/**
 * Enviar email de recuperación de PIN
 */
async function sendPINRecovery(email, newPin) {
  return sendEmail({
    to: email,
    subject: 'Recuperación de PIN - Tu jubilación automática',
    html: `
      <h2>Recuperación de PIN</h2>
      <p>Tu nuevo PIN de 4 caracteres es: <strong>${newPin}</strong></p>
      <p>Utilízalo para acceder a tu cuenta.</p>
      <p style="background-color: #fff3cd; padding: 10px; border-radius: 5px; color: #856404;">
        Por seguridad, no compartas este PIN con nadie.
      </p>
    `
  });
}

module.exports = {
  sendEmail,
  sendPINRecovery
};
