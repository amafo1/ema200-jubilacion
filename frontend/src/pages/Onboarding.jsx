import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { authAPI } from '../services/api';

export default function Onboarding() {
  const navigate = useNavigate();
  const setRegistrationData = useAuthStore(state => state.setRegistrationData);
  
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    birthDate: '',
    monthlyContribution: '',
    pin: '',
    pinConfirm: ''
  });
  
  const [recommendation, setRecommendation] = useState(null);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [isinCopied, setIsinCopied] = useState(false);

  const DIVIDEND_FUND_ISIN = 'ES0165185010';

  const calculateRetirementRecommendation = (birthDate) => {
    if (!birthDate) return null;
    
    const birth = new Date(birthDate);
    const today = new Date();
    const retirementDate = new Date(birth.getFullYear() + 67, birth.getMonth(), birth.getDate());
    const yearsUntilRetirement = (retirementDate - today) / (1000 * 60 * 60 * 24 * 365.25);
    
    if (yearsUntilRetirement > 15) {
      return {
        yearsLeft: Math.floor(yearsUntilRetirement),
        message: 'Momento ideal. Estrategia completa.',
        description: 'Tienes más de 15 años. Podrás completar varios ciclos de inversión antes de jubilarte.',
        blocked: false
      };
    } else if (yearsUntilRetirement > 10) {
      return {
        yearsLeft: Math.floor(yearsUntilRetirement),
        message: 'Buen momento. Tendrás 2-3 ciclos completos.',
        description: 'La estrategia te permitirá participar en múltiples oportunidades de compra y venta.',
        blocked: false
      };
    } else if (yearsUntilRetirement >= 7) {
      return {
        yearsLeft: Math.floor(yearsUntilRetirement),
        message: 'Estrategia viable pero la rotación a dividendos empezará pronto.',
        description: 'Aún tienes tiempo, pero comenzarás a proteger tu patrimonio en los próximos años.',
        blocked: false
      };
    }
    
    // Menos de 7 años hasta la jubilación: la plataforma no es adecuada.
    return {
      yearsLeft: Math.max(0, Math.floor(yearsUntilRetirement)),
      message: 'Esta plataforma no es adecuada para tu horizonte de inversión.',
      description: 'Esta plataforma está diseñada para horizontes de inversión de 7 años o más. Te recomendamos invertir directamente en el fondo de dividendos o consultar con un asesor financiero.',
      blocked: true
    };
  };

  const copyISIN = async () => {
    try {
      await navigator.clipboard.writeText(DIVIDEND_FUND_ISIN);
      setIsinCopied(true);
      setTimeout(() => setIsinCopied(false), 2000);
    } catch (err) {
      setIsinCopied(false);
    }
  };
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (name === 'birthDate') {
      const rec = calculateRetirementRecommendation(value);
      setRecommendation(rec);
    }
    
    // Limpiar error al cambiar
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };
  
  const validate = () => {
    const newErrors = {};
    
    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email válido requerido';
    }
    
    if (!formData.birthDate) {
      newErrors.birthDate = 'Fecha de nacimiento requerida';
    }
    
    if (!formData.monthlyContribution || parseFloat(formData.monthlyContribution) <= 0) {
      newErrors.monthlyContribution = 'Aportación mensual válida requerida';
    }
    
    if (!formData.pin || formData.pin.length !== 4) {
      newErrors.pin = 'PIN debe ser de 4 dígitos';
    }
    
    if (formData.pin !== formData.pinConfirm) {
      newErrors.pinConfirm = 'Los PINs no coinciden';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Bloqueo total si el horizonte es menor a 7 años.
    if (recommendation?.blocked) return;
    
    if (!validate()) return;
    
    setLoading(true);
    try {
      await authAPI.register({
        email: formData.email,
        name: formData.name || null,
        birthDate: formData.birthDate,
        monthlyContribution: parseFloat(formData.monthlyContribution),
        pin: formData.pin
      });
      
      setRegistrationData(formData);
      navigate('/commitment');
    } catch (error) {
      setErrors({ submit: error.response?.data?.error || 'Error al registrar' });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold text-navy mb-8 text-center">Tu plan de jubilación</h1>
        
        <form onSubmit={handleSubmit} className="space-y-6 bg-white p-8 rounded-lg shadow-md">
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition ${
                errors.email ? 'border-red-500' : 'border-gray-300'
              }`}
              required
            />
            {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
          </div>
          
          {/* Nombre */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Nombre (opcional)</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
            />
          </div>
          
          {/* Fecha de nacimiento */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Fecha de nacimiento *</label>
            <input
              type="date"
              name="birthDate"
              value={formData.birthDate}
              onChange={handleChange}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition ${
                errors.birthDate ? 'border-red-500' : 'border-gray-300'
              }`}
              required
            />
            {errors.birthDate && <p className="text-red-500 text-sm mt-1">{errors.birthDate}</p>}
            
            {/* Recomendación automática */}
            {recommendation && !recommendation.blocked && (
              <div className={`mt-4 p-4 rounded-lg ${
                recommendation.yearsLeft > 15 ? 'bg-green-50 border border-green-200' :
                recommendation.yearsLeft > 10 ? 'bg-blue-50 border border-blue-200' :
                'bg-yellow-50 border border-yellow-200'
              }`}>
                <p className="font-semibold text-gray-800">{recommendation.message}</p>
                <p className="text-sm text-gray-600 mt-1">{recommendation.description}</p>
              </div>
            )}

            {/* Bloqueo: menos de 7 años hasta la jubilación */}
            {recommendation && recommendation.blocked && (
              <div className="mt-4 rounded-lg border-2 border-amber-400 bg-amber-50 p-4">
                <div className="flex items-start gap-3">
                  <svg className="h-6 w-6 flex-shrink-0 text-amber-500" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <div className="min-w-0">
                    <p className="font-bold text-amber-800">No puedes continuar con el registro</p>
                    <p className="mt-1 text-sm text-amber-700">{recommendation.description}</p>

                    {/* Tarjeta ISIN del fondo de dividendos */}
                    <div className="mt-4 rounded-lg border border-amber-300 bg-white p-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Fondo de Dividendos (Jubilación)</p>
                      <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <code className="font-mono text-base font-bold text-navy break-all">{DIVIDEND_FUND_ISIN}</code>
                        <button
                          type="button"
                          onClick={copyISIN}
                          className="inline-flex items-center justify-center rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-600"
                        >
                          {isinCopied ? '✓ ISIN copiado' : 'Copiar ISIN'}
                        </button>
                      </div>
                    </div>

                    {/* CTA afiliado MyInvestor */}
                    <div className="mt-4">
                      <a
                        href="https://newapp.myinvestor.es/do/signup?promotionalCode=D52OP"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-500 px-4 py-3 text-base font-bold text-white shadow-sm transition hover:bg-green-600"
                      >
                        Abrir cuenta en MyInvestor
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                      </a>
                      <p className="mt-2 text-center text-xs text-amber-700">
                        Aquí encontrarás el fondo de dividendos (ES0165185010)
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Aportación mensual */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Aportación mensual (€) *</label>
            <input
              type="number"
              name="monthlyContribution"
              value={formData.monthlyContribution}
              onChange={handleChange}
              placeholder="Ej: 500"
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition ${
                errors.monthlyContribution ? 'border-red-500' : 'border-gray-300'
              }`}
              required
              step="0.01"
              min="0"
            />
            {errors.monthlyContribution && <p className="text-red-500 text-sm mt-1">{errors.monthlyContribution}</p>}
          </div>
          
          {/* PIN */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">PIN de 4 dígitos *</label>
            <input
              type="password"
              name="pin"
              value={formData.pin}
              onChange={handleChange}
              placeholder="0000"
              maxLength="4"
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition ${
                errors.pin ? 'border-red-500' : 'border-gray-300'
              }`}
              required
            />
            {errors.pin && <p className="text-red-500 text-sm mt-1">{errors.pin}</p>}
          </div>
          
          {/* Confirmar PIN */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Confirmar PIN *</label>
            <input
              type="password"
              name="pinConfirm"
              value={formData.pinConfirm}
              onChange={handleChange}
              placeholder="0000"
              maxLength="4"
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition ${
                errors.pinConfirm ? 'border-red-500' : 'border-gray-300'
              }`}
              required
            />
            {errors.pinConfirm && <p className="text-red-500 text-sm mt-1">{errors.pinConfirm}</p>}
          </div>
          
          {errors.submit && <p className="text-red-500 text-sm">{errors.submit}</p>}
          
          <button
            type="submit"
            disabled={loading || recommendation?.blocked}
            className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg transition duration-200"
          >
            {loading ? 'Registrando...' : recommendation?.blocked ? 'No disponible para tu horizonte' : 'Continuar'}
          </button>
        </form>
        
        <p className="text-center text-gray-600 text-sm mt-4">
          ¿Ya tienes cuenta? <a href="/login" className="text-blue-500 hover:underline">Inicia sesión</a>
        </p>
      </div>
    </div>
  );
}
