import { create } from 'zustand';

// Recuperar los datos de registro guardados (persisten aunque se recargue la página)
function loadRegistrationData() {
  try {
    const raw = localStorage.getItem('registrationData');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export const useAuthStore = create((set) => ({
  user: null,
  token: localStorage.getItem('token') || null,
  isLoggedIn: !!localStorage.getItem('token'),
  
  setUser: (user) => set({ user }),
  setToken: (token) => {
    localStorage.setItem('token', token);
    set({ token, isLoggedIn: true });
  },
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('registrationData');
    set({ user: null, token: null, isLoggedIn: false, registrationData: null });
  },
  
  setRegistrationData: (data) => {
    try {
      localStorage.setItem('registrationData', JSON.stringify(data));
    } catch {
      // Ignorar si el navegador no permite almacenamiento
    }
    set({ registrationData: data });
  },
  registrationData: loadRegistrationData(),
}));
