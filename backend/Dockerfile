# Backend EMA200 Jubilación - Node.js/Express
FROM node:22-alpine

WORKDIR /app

# Instalar dependencias de producción (usa lockfile)
COPY package*.json ./
RUN npm ci --omit=dev

# Copiar el resto del código
COPY . .

# Northflank inyectará PORT; la app usa process.env.PORT || 5000
ENV PORT=8080
EXPOSE 8080

CMD ["node", "index.js"]
