# EMA200 - App de Jubilación Automática

Aplicación web para inversores novatos residentes en España que automatiza una estrategia de jubilación basada en tres fondos de MyInvestor y el EMA200 del S&P 500.

## Stack Tecnológico

- **Frontend**: React + Vite + Tailwind CSS
- **Backend**: Node.js + Express
- **Base de datos**: PostgreSQL
- **APIs externas**: Twelve Data (datos de mercado), Brevo (emails)
- **Scheduler**: Node-cron (tareas automáticas)

## Estructura del Proyecto

```
ema200-jubilacion/
├── backend/
│   ├── config.js              # Configuración y credenciales
│   ├── index.js               # Servidor Express
│   ├── routes/                # Rutas API
│   │   ├── auth.js            # Autenticación
│   │   ├── users.js           # Perfil y simulaciones
│   │   ├── funds.js           # Información de fondos
│   │   └── admin.js           # Panel administrativo
│   ├── services/
│   │   └── emailService.js    # Envío de emails
│   ├── jobs/
│   │   └── cronJobs.js        # Tareas automáticas
│   └── scripts/
│       └── initDb.js          # Inicialización de BD
│
├── frontend/
│   ├── src/
│   │   ├── pages/             # Componentes de página
│   │   │   ├── Landing.jsx
│   │   │   ├── Onboarding.jsx
│   │   │   ├── Commitment.jsx
│   │   │   ├── Plan.jsx
│   │   │   ├── Alerts.jsx
│   │   │   ├── Invest.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   └── AdminPanel.jsx
│   │   ├── services/
│   │   │   └── api.js         # Cliente HTTP
│   │   ├── stores/
│   │   │   └── authStore.js   # Estado global
│   │   ├── App.jsx            # Router
│   │   └── main.jsx           # Entry point
│   └── public/
│       └── index.html         # HTML base
│
└── README.md
```

## Instalación y Setup

### 1. Clonar repositorio

```bash
cd ema200-jubilacion
```

### 2. Configurar Backend

```bash
cd backend

# Instalar dependencias (ya están instaladas)
# npm install

# Inicializar base de datos
npm run db:init

# Iniciar servidor (en desarrollo)
npm run dev
# o en producción:
npm start
```

El backend se ejecutará en `http://localhost:5000`

### 3. Configurar Frontend

```bash
cd frontend

# Instalar dependencias (ya están instaladas)
# npm install

# Iniciar en desarrollo
npm run dev

# o construir para producción:
npm run build
```

El frontend se ejecutará en `http://localhost:5173` (Vite) o `http://localhost:3000` (si se configura)

## Credenciales Configuradas

Las siguientes credenciales están almacenadas en `backend/config.js`:

- **Twelve Data API Key**: `TU_CLAVE_TWELVE_DATA`
- **Brevo API Key**: `TU_CLAVE_BREVO`
- **Admin Email**: `amafo.ws@gmail.com`

## Flujo de la Aplicación

### Usuario Nuevo
1. **Landing** → "Quiero empezar"
2. **Onboarding** → Registrarse con email, PIN, fecha nacimiento, aportación
3. **Commitment** → Aceptar compromiso de disciplina
4. **Plan** → Ver simulación con 3 escenarios (7%, 10%, 13% retorno)
5. **Alerts** → Confirmar alertas activas (pendiente de aprobación admin)
6. **Invest** → Links a MyInvestor con ISINs de fondos
7. **Dashboard** → Acceso después de aprobación

### Usuario Existente
1. **Login** → Email + PIN de 4 dígitos
2. **Dashboard** → Ver plan, fondos e historial

### Administrador
1. **Admin Panel** → `/admin`
2. Aprobar/rechazar usuarios pendientes
3. Ver estadísticas del sistema

## Tareas Automáticas (Cron Jobs)

- **08:00 AM (diario)**: Revisar EMA200 del S&P 500 y enviar alertas de compra si toca soporte
- **01:00 AM (mensual, día 1)**: Enviar email de motivación
- **09:00 AM (diario)**: Revisar aniversarios de usuarios para rotación de fondos

## Fondos Configurados

| Rol | Nombre | ISIN |
|-----|--------|------|
| Espera | Fondo Monetario | FR0000447823 |
| Crecimiento | S&P 500 | IE00BYX5MX67 |
| Jubilación | Fondo Dividendos | ES0165185010 |

## Variables de Entorno

Crear archivo `.env` en `backend/`:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ema200_jubilacion
DB_USER=postgres
DB_PASSWORD=postgres
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:3000
```

## Emails Enviados

La aplicación envía emails automáticos a través de Brevo:

1. **Registro**: Confirmación de registro pendiente
2. **Motivación**: "¿Ya has aportado este mes?" (día 1 de cada mes)
3. **Señal de Compra**: Cuando S&P500 toca EMA200
4. **Rotación**: Instrucciones para rotar a dividendos (años 1-5)
5. **Pausa por Crash**: Cuando mercado está en pérdidas
6. **Recuperación**: Cuando mercado se recupera

## Testing

### Crear usuario de prueba

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "name": "Juan",
    "birthDate": "1980-05-15",
    "monthlyContribution": 500,
    "pin": "1234"
  }'
```

### Iniciar sesión

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "pin": "1234"
  }'
```

### Panel Admin

Acceder a `/admin` en el navegador. Se requiere email de administrador en header.

## Deployment

### Producción

1. **Backend**:
   ```bash
   npm install --production
   npm start
   ```

2. **Frontend**:
   ```bash
   npm run build
   # Servir archivos de dist/ con un servidor web
   ```

3. **Base de datos**:
   - Usar PostgreSQL en hosting de producción (Railway, Render, etc.)

4. **Variables de entorno**:
   - Configurar en el hosting
   - Actualizar URLs de API en frontend

## Notas Importantes

- El PIN se hashea con bcryptjs
- Los tokens JWT expiran en 7 días
- Las sesiones se guardan en localStorage
- El historial EMA200 se guarda en BD para análisis
- Los emails se envían de forma asíncrona sin bloquear
- Todos los cálculos fiscales siguen la legislación española vigente
- La edad de jubilación es 67 años (configurables en config.js)

## Licencia

Propietaria - Todos los derechos reservados
