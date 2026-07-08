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
        <li>En el Fondo Monetario (${config.funds.espera.isin}), vende una parte</li>
        <li>Compra el S&P 500 (${config.funds.crecimiento.isin})</li>
      </ol>
      
      <p style="background-color: #fffacd; padding: 15px; border-radius: 5px;">
        <strong>Nota:</strong> Históricamente, esta estrategia ha generado oportunidades de compra cada 2-3 años. Este es el tipo de momento que genera rentabilidad a largo plazo.
      </p>
      
      <p><a href="https://www.myinvestor.es" style="background-color: #003366; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Accede a MyInvestor</a></p>
      <p style="color: #666; font-size: 12px; margin-top: 30px;">Tu jubilación automática — EMA200 Strategy</p>
    `
  },
  
  rotation_active: {
    subject: (data) => `Es momento de proteger lo que has construido — Tramo ${data.rotationYear} de 5`,
    html: (data) => `
      <h2>Inicio de rotación a fondos defensivos</h2>
      <p>Has invertido sabiamente y el mercado ha recompensado tu disciplina. Ahora es el momento de <strong>proteger lo que has construido</strong>.</p>
      
      <p><strong>Tu plan:</strong> Rotar el <strong>20%</strong> de tu posición en S&P 500 hacia el Fondo de Dividendos (Tramo ${data.rotationYear} de 5).</p>
      
      <p>Esta rotación gradual te permitirá vivir de los dividendos en tu jubilación mientras mantienes exposición al crecimiento.</p>
      
      <h3>¿Qué hacer?</h3>
      <ol>
        <li>Ve a MyInvestor</li>
        <li>En el S&P 500 (${config.funds.crecimiento.isin}), vende el <strong>20%</strong> de tu posición</li>
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
      <p>Tu nuevo PIN de 4 dígitos es: <strong>${newPin}</strong></p>
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
