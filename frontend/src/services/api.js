import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE,
});

// Interceptor para agregar token a cada request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Autenticación
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (email, pin) => api.post('/auth/login', { email, pin }),
  forgotPin: (email) => api.post('/auth/forgot-pin', { email }),
};

// Usuario
export const userAPI = {
  getProfile: () => api.get('/users/profile'),
  updateProfile: (data) => api.put('/users/profile', data),
  getSimulation: (params) => api.get('/users/simulation', { params }),
  getAlerts: () => api.get('/users/alerts'),
  deleteAccount: (confirm) => api.delete('/users/account', { data: { confirm } }),
};

// Fondos
export const fundAPI = {
  getFunds: () => api.get('/funds/list'),
  getEMAHistory: () => api.get('/funds/ema-history'),
};

// Admin
export const adminAPI = {
  getPendingUsers: () => api.get('/admin/pending-users', {
    headers: { 'x-admin-email': 'amafo.ws@gmail.com' }
  }),
  getActiveUsers: () => api.get('/admin/active-users', {
    headers: { 'x-admin-email': 'amafo.ws@gmail.com' }
  }),
  approveUser: (userId) => api.post(`/admin/approve-user/${userId}`, {}, {
    headers: { 'x-admin-email': 'amafo.ws@gmail.com' }
  }),
  rejectUser: (userId, reason) => api.post(`/admin/reject-user/${userId}`, { reason }, {
    headers: { 'x-admin-email': 'amafo.ws@gmail.com' }
  }),
  getStats: () => api.get('/admin/stats', {
    headers: { 'x-admin-email': 'amafo.ws@gmail.com' }
  }),
};

export default api;
