const express = require('express');
const jwt = require('jsonwebtoken');
const bcryptjs = require('bcryptjs');
const config = require('../config');
const { sendPINRecovery, sendEmail } = require('../services/emailService');

const router = express.Router();

let pool;

/**
 * Inicializar pool de base de datos
 */
router.use((req, res, next) => {
  if (!pool && req.app.locals.pool) {
    pool = req.app.locals.pool;
  }
  next();
});

/**
 * POST /api/auth/register
 * Registrar nuevo usuario
 */
router.post('/register', async (req, res) => {
  try {
    const { email, name, birthDate, monthlyContribution, pin } = req.body;
    
    // Validaciones
    if (!email || !birthDate || !monthlyContribution || !pin) {
      return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }
    
    if (!/^[a-zA-Z0-9]{4}$/.test(pin)) {
      return res.status(400).json({ error: 'El PIN debe ser de 4 caracteres alfanuméricos (letras o números)' });
    }
    
    // Hashear PIN
    const pinHash = await bcryptjs.hash(pin, 10);
    
    // Insertar usuario ya activo (alta libre: no requiere aprobación del administrador)
    const result = await pool.query(
      `INSERT INTO users (email, name, birth_date, monthly_contribution, pin_hash, status, approved_at)
       VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
       RETURNING id, email, name, birth_date, monthly_contribution, status, created_at`,
      [email, name || null, birthDate, monthlyContribution, pinHash, 'approved']
    );
    
    const user = result.rows[0];
    
    // Enviar email de bienvenida (no bloqueante: si el email falla, el registro no debe fallar)
    try {
      await sendEmail({
        to: email,
        subject: '¡Bienvenido! Tu jubilación automática comienza',
        html: `
          <h2>¡Bienvenido a tu jubilación automática!</h2>
          <p>Hola ${name || 'Inversor'},</p>
          <p>Tu cuenta ya está <strong>activa</strong>. Puedes acceder a la plataforma con tu email y PIN, y empezarás a recibir alertas automáticas en los momentos clave.</p>
          <p style="background-color: #d4edda; padding: 15px; border-radius: 5px; color: #155724;">
            <strong>Tu jubilación está en piloto automático.</strong> Te avisaremos en cada momento exacto en que debas actuar.
          </p>
          <p style="color: #666; font-size: 12px; margin-top: 30px;">Esta plataforma es una herramienta informativa y educativa. No constituye asesoramiento financiero ni una recomendación de inversión.</p>
        `
      });
    } catch (emailError) {
      console.error('⚠️  No se pudo enviar el email de bienvenida (el usuario se creó igualmente):', emailError.response?.data || emailError.message);
    }
    
    // Notificar al administrador del nuevo registro (no bloqueante, solo informativo)
    try {
      await sendEmail({
        to: config.adminEmail,
        subject: 'Nuevo usuario dado de alta',
        html: `
          <p>Se ha dado de alta un nuevo usuario:</p>
          <ul>
            <li><strong>Nombre:</strong> ${name || 'Inversor'}</li>
            <li><strong>Email:</strong> ${email}</li>
            <li><strong>Aportación mensual:</strong> €${monthlyContribution}</li>
          </ul>
          <p>Puedes verlo en tu <a href="${config.frontendUrl}/admin">panel de administración</a>.</p>
        `
      });
    } catch (adminEmailError) {
      console.error('⚠️  No se pudo notificar al administrador del nuevo registro:', adminEmailError.response?.data || adminEmailError.message);
    }
    
    res.status(201).json({
      message: 'Usuario registrado y activado correctamente.',
      user
    });
    
  } catch (error) {
    console.error('Error en register:', error);
    
    // Manejo de email duplicado
    if (error.code === '23505') {
      return res.status(409).json({ error: 'El email ya está registrado' });
    }
    
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/auth/login
 * Iniciar sesión con email + PIN
 */
router.post('/login', async (req, res) => {
  try {
    const { email, pin } = req.body;
    
    if (!email || !pin) {
      return res.status(400).json({ error: 'Email y PIN requeridos' });
    }
    
    // Buscar usuario
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Email o PIN incorrecto' });
    }
    
    const user = result.rows[0];
    
    // Verificar PIN
    const pinMatches = await bcryptjs.compare(pin, user.pin_hash);
    if (!pinMatches) {
      return res.status(401).json({ error: 'Email o PIN incorrecto' });
    }
    
    // Generar JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      config.jwtSecret,
      { expiresIn: config.jwtExpire }
    );
    
    // Calcular años hasta jubilación
    const birthDate = new Date(user.birth_date);
    const today = new Date();
    const retirementDate = new Date(birthDate.getFullYear() + 67, birthDate.getMonth(), birthDate.getDate());
    const yearsUntilRetirement = Math.max(0, (retirementDate - today) / (1000 * 60 * 60 * 24 * 365.25));
    
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        birthDate: user.birth_date,
        monthlyContribution: user.monthly_contribution,
        yearsUntilRetirement: yearsUntilRetirement.toFixed(1),
        approvedAt: user.approved_at
      }
    });
    
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/auth/forgot-pin
 * Recuperar PIN olvidado
 */
router.post('/forgot-pin', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email requerido' });
    }
    
    // Buscar usuario
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    // Generar nuevo PIN alfanumérico aleatorio de 4 caracteres
    // Se excluyen caracteres ambiguos (0/O, 1/I/l) para facilitar la lectura.
    const pinChars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    let newPin = '';
    for (let i = 0; i < 4; i++) {
      newPin += pinChars.charAt(Math.floor(Math.random() * pinChars.length));
    }
    const pinHash = await bcryptjs.hash(newPin, 10);
    
    // Actualizar PIN en base de datos
    await pool.query(
      'UPDATE users SET pin_hash = $1 WHERE email = $2',
      [pinHash, email]
    );
    
    // Enviar PIN por email
    await sendPINRecovery(email, newPin);
    
    res.json({ message: 'Se ha enviado un nuevo PIN a tu email' });
    
  } catch (error) {
    console.error('Error en forgot-pin:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Middleware: Verificar JWT
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Token requerido' });
  }
  
  jwt.verify(token, config.jwtSecret, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token inválido o expirado' });
    }
    req.user = user;
    next();
  });
}

router.authenticateToken = authenticateToken;

module.exports = router;
