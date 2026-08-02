# Frontend EMA200 Jubilación - Vite/React (build) + serve estático
FROM node:22-alpine AS build

WORKDIR /app

# VITE_API_URL debe inyectarse en BUILD (Vite lo compila en el bundle)
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# --- Etapa de servido estático ---
FROM node:22-alpine

WORKDIR /app
RUN npm install -g serve@14

COPY --from=build /app/dist ./dist

ENV PORT=8080
EXPOSE 8080

# serve escucha en el puerto indicado por -l
CMD ["sh", "-c", "serve -s dist -l ${PORT}"]
