# Quick Start - EMA200 App

Inicio rápido en 5 minutos.

## 1️⃣ Requisitos Previos

- Node.js 18+ instalado
- PostgreSQL instalado y ejecutándose
- Terminal/CMD

## 2️⃣ Clonar Repositorio

```bash
cd /home/ubuntu/ema200-jubilacion
```

## 3️⃣ Inicializar Base de Datos

```bash
cd backend

# Crear base de datos (si no existe)
createdb ema200_jubilacion

# Inicializar tablas
npm run db:init

cd ..
```

## 4️⃣ Iniciar Backend

```bash
cd backend
npm start
```

✅ Backend ejecutándose en `http://localhost:5000`

**En otra terminal:**

## 5️⃣ Iniciar Frontend

```bash
cd frontend
npm run dev
```

✅ Frontend ejecutándose en `http://localhost:5173`

## 6️⃣ Probar la Aplicación

### Acceso público
- Landing: `http://localhost:5173/`
- Registro: `http://localhost:5173/onboarding`
- Login: `http://localhost:5173/login`

### Panel Administrativo
- URL: `http://localhost:5173/admin`
- Email requerido: `amafo.ws@gmail.com`

## 7️⃣ Crear Usuario de Prueba

### Registrarse
1. Ir a `http://localhost:5173/onboarding`
2. Completar formulario:
   - Email: `test@example.com`
   - Nombre: `Juan`
   - Fecha nacimiento: `15/05/1980`
   - Aportación: `500€`
   - PIN: `1234`
3. Aceptar compromiso

### Aprobar Usuario
1. Ir a `http://localhost:5173/admin`
2. Click en "Aprobar"

### Acceder
1. Ir a `http://localhost:5173/login`
2. Email: `test@example.com`
3. PIN: `1234`

## 8️⃣ Explorar Features

### Dashboard
- Ver plan personalizado
- Simulaciones (7%, 10%, 13% retorno)
- Fondos ISIN copiables
- Historial EMA200

### Emails Automáticos
Se envían automáticamente a través de Brevo:
- Motivación mensual (día 1)
- Señales de compra (cuando EMA200)
- Instrucciones de rotación

### Cron Jobs
Ejecutándose automáticamente:
- 08:00 AM: Revisar EMA200
- 01:00 AM (día 1): Email motivación
- 09:00 AM: Verificar aniversarios

## 📊 Verificar Datos

```bash
# Conectar a PostgreSQL
psql -U postgres -d ema200_jubilacion

# Ver usuarios
SELECT * FROM users;

# Ver emails enviados
SELECT * FROM email_log;

# Ver historial EMA200
SELECT * FROM ema200_history;

# Ver rotación
SELECT * FROM rotation_history;
```

## 🛑 Detener la Aplicación

Presiona `Ctrl+C` en ambas terminales.

## 🐛 Troubleshooting

### "Error: connect ECONNREFUSED 127.0.0.1:5432"
- PostgreSQL no está ejecutándose
- Iniciar: `brew services start postgresql` (Mac) o `sudo service postgresql start` (Linux)

### "Error: database ema200_jubilacion does not exist"
- Ejecutar: `npm run db:init` en carpeta backend

### Port 5173 ya en uso
- Frontend: Cambia a otro puerto con `npm run dev -- --port 5174`

### Port 5000 ya en uso
- Backend: Cambia PORT en `backend/config.js`

## 📚 Documentación Completa

- **README.md**: Arquitectura completa y stack
- **DEPLOYMENT.md**: Opciones de deployment a producción
- **Briefing**: `/home/ubuntu/Uploads/briefing_app_jubilacion.txt`

## 🚀 Siguiente Paso

Para producción, ver **DEPLOYMENT.md** para opciones de:
- Docker
- Railway
- Render
- Heroku
- AWS

## 💡 Comandos Útiles

```bash
# Backend solo
cd backend && npm start

# Frontend solo
cd frontend && npm run dev

# Build frontend para producción
cd frontend && npm run build

# Ver logs de la BD
psql -U postgres -d ema200_jubilacion -c "SELECT * FROM email_log ORDER BY sent_at DESC LIMIT 5;"

# Reiniciar base de datos
npm run db:init (desde backend/)
```

---

¡Listo! 🎉 La aplicación está lista para usar y desarrollar.
