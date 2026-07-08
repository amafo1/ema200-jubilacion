#!/bin/bash

# Script para iniciar la aplicación EMA200

echo "🚀 Iniciando EMA200 - App de Jubilación Automática"
echo "=================================================="

# Crear directorios de logs
mkdir -p logs

# Iniciar Backend
echo ""
echo "📡 Iniciando Backend (Node.js)..."
cd backend
npm start > ../logs/backend.log 2>&1 &
BACKEND_PID=$!
echo "Backend iniciado con PID: $BACKEND_PID"
cd ..

# Esperar a que backend esté listo
sleep 3

# Iniciar Frontend
echo ""
echo "🎨 Iniciando Frontend (React)..."
cd frontend
npm run dev > ../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
echo "Frontend iniciado con PID: $FRONTEND_PID"
cd ..

echo ""
echo "=================================================="
echo "✅ Aplicación iniciada correctamente!"
echo ""
echo "🔗 URLs:"
echo "  - Frontend:  http://localhost:5173"
echo "  - Backend:   http://localhost:5000"
echo "  - Admin:     http://localhost:5173/admin"
echo ""
echo "📊 Logs:"
echo "  - Backend:   logs/backend.log"
echo "  - Frontend:  logs/frontend.log"
echo ""
echo "Para detener la aplicación, presiona Ctrl+C"
echo "=================================================="

# Mantener el script ejecutándose
wait
