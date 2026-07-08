import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { authAPI } from '../services/api';

export default function Login() {
  const navigate = useNavigate();
  const { setToken, setUser } = useAuthStore();
  
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState(false);
  
  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const response = await authAPI.login(email, pin);
      setToken(response.data.token);
      setUser(response.data.user);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };
  
  const handleForgotPin = async (e) => {
    e.preventDefault();
    setForgotLoading(true);
    
    try {
      await authAPI.forgotPin(forgotEmail);
      setForgotSuccess(true);
      setTimeout(() => {
        setForgotMode(false);
        setForgotSuccess(false);
        setForgotEmail('');
      }, 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al recuperar PIN');
    } finally {
      setForgotLoading(false);
    }
  };
  
  if (forgotMode) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <h1 className="text-3xl font-bold text-navy mb-8 text-center">Recuperar PIN</h1>
          
          <form onSubmit={handleForgotPin} className="space-y-6 bg-white p-8 rounded-lg shadow-md">
            {forgotSuccess && (
              <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-lg">
                ✓ Se ha enviado un nuevo PIN a tu email
              </div>
            )}
            
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
                {error}
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                type="email"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                required
              />
            </div>
            
            <button
              type="submit"
              disabled={forgotLoading}
              className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-bold py-3 rounded-lg transition"
            >
              {forgotLoading ? 'Enviando...' : 'Enviar nuevo PIN'}
            </button>
            
            <button
              type="button"
              onClick={() => setForgotMode(false)}
              className="w-full text-blue-500 hover:text-blue-600 font-medium"
            >
              Volver al login
            </button>
          </form>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold text-navy mb-8 text-center">Acceder a tu plan</h1>
        
        <form onSubmit={handleLogin} className="space-y-6 bg-white p-8 rounded-lg shadow-md">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg text-sm">
              {error}
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">PIN de 4 dígitos</label>
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value.slice(0, 4))}
              placeholder="0000"
              maxLength="4"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
              required
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-bold py-3 rounded-lg transition"
          >
            {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
          </button>
        </form>
        
        <p className="text-center text-gray-600 text-sm mt-4">
          ¿Olvidaste tu PIN?{' '}
          <button
            onClick={() => setForgotMode(true)}
            className="text-blue-500 hover:underline font-medium"
          >
            Recupéralo aquí
          </button>
        </p>
        
        <p className="text-center text-gray-600 text-sm mt-2">
          ¿No tienes cuenta?{' '}
          <a href="/" className="text-blue-500 hover:underline font-medium">
            Registrate aquí
          </a>
        </p>
      </div>
    </div>
  );
}
