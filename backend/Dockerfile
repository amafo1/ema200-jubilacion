FROM node:18-alpine

WORKDIR /app

# Copiar package.json
COPY package*.json ./

# Instalar dependencias
RUN npm install --production

# Copiar código
COPY . .

# Script para inicializar BD
RUN echo '#!/bin/sh\n\
node scripts/initDb.js\n\
npm start' > entrypoint.sh && chmod +x entrypoint.sh

EXPOSE 5000

CMD ["./entrypoint.sh"]
