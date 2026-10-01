import api from './api';

// API de activos alternativos (Gold / Bitcoin ETP)
// Reutiliza la instancia axios central (api), que ya añade el token JWT.
export const alternativesAPI = {
  // Obtiene el estado de las alertas EMA200 del usuario para cada activo
  getStatus: () => api.get('/alternatives/status'),

  // Activa/desactiva las alertas de un activo concreto
  toggle: (assetCode, enabled) =>
    api.put('/alternatives/toggle', { assetCode, enabled }),
};

export default alternativesAPI;
