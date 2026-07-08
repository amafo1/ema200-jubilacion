import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { userAPI, fundAPI } from '../services/api';

// Años hasta la jubilación (a los 67) con precisión completa, replicando el backend
// para que las estimaciones coincidan al céntimo con la simulación del servidor.
function preciseYearsUntilRetirement(birthDateStr) {
  if (!birthDateStr) return 0;
  const birthDate = new Date(birthDateStr);
  const today = new Date();
  const retirementDate = new Date(birthDate.getFullYear() + 67, birthDate.getMonth(), birthDate.getDate());
  return Math.max(0, (retirementDate - today) / (1000 * 60 * 60 * 24 * 365.25));
}

// Simulación local — replica exactamente el cálculo del backend (escenario histórico)
// para que la barra actualice las estimaciones de forma instantánea, sin llamadas al servidor.
function simulateRetirement(monthlyAmount, years) {
  const annualReturn = 0.10;   // rentabilidad media histórica del S&P 500
  const dividendYield = 0.035; // 3,5% de dividendos anuales sobre el patrimonio final
  const monthlyReturn = Math.pow(1 + annualReturn, 1 / 12) - 1;
  const months = Math.floor(years * 12);

  let patrimonio = 0;
  for (let i = 0; i < months; i++) {
    patrimonio = patrimonio * (1 + monthlyReturn) + monthlyAmount;
  }

  // Dividendos anuales brutos
  const dividendosAnuales = patrimonio * dividendYield;

  // Retención fiscal española sobre dividendos (tramos)
  let retension = 0;
  if (dividendosAnuales <= 6000) {
    retension = dividendosAnuales * 0.19;
  } else if (dividendosAnuales <= 50000) {
    retension = 6000 * 0.19 + (dividendosAnuales - 6000) * 0.21;
  } else {
    retension = 6000 * 0.19 + 44000 * 0.21 + (dividendosAnuales - 50000) * 0.23;
  }

  const dividendosMensualNeto = (dividendosAnuales - retension) / 12;
  return { patrimonioEstimado: patrimonio, dividendosMensualNeto };
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [profile, setProfile] = useState(null);
  const [funds, setFunds] = useState([]);
  const [simulation, setSimulation] = useState(null);
  const [emaHistory, setEmaHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [monthlyInput, setMonthlyInput] = useState(null); // valor de la barra
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  
  useEffect(() => {
    loadDashboardData();
  }, []);
  
  // Inicializar la barra con la aportación registrada del usuario
  useEffect(() => {
    if (profile && monthlyInput === null) {
      setMonthlyInput(Math.round(Number(profile.monthly_contribution)));
    }
  }, [profile]);
  
  const handleSaveContribution = async () => {
    setSaving(true);
    setSaveMsg('');
    try {
      const res = await userAPI.updateProfile({ monthlyContribution: monthlyInput });
      setProfile((prev) => ({ ...prev, monthly_contribution: res.data.monthly_contribution }));
      setSaveMsg('✓ Aportación guardada');
      setTimeout(() => setSaveMsg(''), 3000);
    } catch (err) {
      setSaveMsg('No se pudo guardar. Inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  };
  
  const loadDashboardData = async () => {
    try {
      const [profileRes, fundsRes, simRes, emaRes] = await Promise.all([
        userAPI.getProfile(),
        fundAPI.getFunds(),
        userAPI.getSimulation({ scenario: 'historic' }),
        fundAPI.getEMAHistory()
      ]);
      
      setProfile(profileRes.data);
      setFunds(fundsRes.data);
      setSimulation(simRes.data);
      setEmaHistory(emaRes.data);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleLogout = () => {
    logout();
    navigate('/');
  };
  
  // La cuenta de administrador nunca se puede eliminar
  const ADMIN_EMAIL = 'amafo.ws@gmail.com';
  const isAdmin = profile?.email === ADMIN_EMAIL;
  
  const handleDeleteAccount = async () => {
    if (isAdmin) {
      setDeleteError('La cuenta de administrador no se puede eliminar.');
      return;
    }
    setDeleting(true);
    setDeleteError('');
    try {
      await userAPI.deleteAccount('ELIMINAR');
      logout();
      navigate('/');
    } catch (err) {
      setDeleteError(err.response?.data?.error || 'No se pudo eliminar la cuenta. Inténtalo de nuevo.');
      setDeleting(false);
    }
  };
  
  // Formatea "1978-01-30T00:00:00.000Z" -> "30/01/1978"
  const formatBirthDate = (value) => {
    if (!value) return '—';
    const d = new Date(value);
    if (isNaN(d)) return String(value).split('T')[0];
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };
  
  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Cargando dashboard...</div>;
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-md">
        <div className="max-w-6xl mx-auto px-4 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-navy">Mi jubilación</h1>
            <p className="text-gray-600">Bienvenido, {profile?.name || 'Inversor'}</p>
          </div>
          <button
            onClick={handleLogout}
            aria-label="Cerrar sesión"
            className="flex items-center gap-1.5 text-gray-500 active:text-gray-700 text-sm font-medium border border-gray-200 rounded-full px-3 py-2 min-h-[40px]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="hidden sm:inline">Salir</span>
          </button>
        </div>
      </div>
      
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Tabs */}
        <div className="flex gap-4 mb-8 border-b border-gray-200 overflow-x-auto">
          {['overview', 'funds', 'history', 'settings'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 font-bold border-b-2 transition whitespace-nowrap ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-800'
              }`}
            >
              {tab === 'overview' && '📊 Resumen'}
              {tab === 'funds' && '💰 Mis fondos'}
              {tab === 'history' && '📈 Historial EMA'}
              {tab === 'settings' && '⚙️ Configuración'}
            </button>
          ))}
        </div>
        
        {/* Overview Tab */}
        {activeTab === 'overview' && (() => {
          const years = preciseYearsUntilRetirement(profile?.birth_date) || (profile?.yearsUntilRetirement ?? 0);
          const liveMonthly = monthlyInput ?? Math.round(Number(profile?.monthly_contribution)) ?? 0;
          const liveSim = simulateRetirement(liveMonthly, years);
          const savedMonthly = Math.round(Number(profile?.monthly_contribution));
          const isChanged = liveMonthly !== savedMonthly;
          return (
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <p className="text-gray-600 text-sm">Aportación mensual</p>
                <p className="text-3xl font-bold text-navy">€{liveMonthly.toLocaleString('es-ES', { maximumFractionDigits: 2 })}</p>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-md">
                <p className="text-gray-600 text-sm">Años hasta jubilación</p>
                <p className="text-3xl font-bold text-blue-600">{profile?.yearsUntilRetirement?.toFixed(1)}</p>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-md">
                <p className="text-gray-600 text-sm">Patrimonio estimado</p>
                <p className="text-3xl font-bold text-green-600">€{liveSim.patrimonioEstimado.toLocaleString('es-ES', { maximumFractionDigits: 0 })}</p>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-md">
                <p className="text-gray-600 text-sm">Renta mensual neta</p>
                <p className="text-3xl font-bold text-purple-600">€{liveSim.dividendosMensualNeto.toFixed(2)}</p>
              </div>
            </div>
            
            {/* Personalización con barra deslizante */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
                <h3 className="font-bold text-navy">Personaliza tu aportación mensual</h3>
                <span className="text-2xl font-bold text-blue-600">€{liveMonthly.toLocaleString('es-ES')}</span>
              </div>
              <p className="text-gray-600 text-sm mb-4">
                Mueve la barra para ver cómo cambian tu patrimonio y tu renta estimada. Los años hasta la jubilación no se
                pueden modificar aquí: quedan fijados en el registro porque determinan tus avisos automáticos.
              </p>
              <input
                type="range"
                min="50"
                max="3000"
                step="50"
                value={liveMonthly}
                onChange={(e) => setMonthlyInput(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>€50</span>
                <span>€3.000</span>
              </div>
              <div className="flex items-center gap-3 mt-4 flex-wrap">
                <button
                  onClick={handleSaveContribution}
                  disabled={!isChanged || saving}
                  className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-2 px-5 rounded-lg transition"
                >
                  {saving ? 'Guardando...' : 'Guardar aportación'}
                </button>
                {isChanged && !saving && (
                  <button
                    onClick={() => setMonthlyInput(savedMonthly)}
                    className="text-gray-500 hover:text-gray-700 text-sm underline"
                  >
                    Restablecer (€{savedMonthly.toLocaleString('es-ES')})
                  </button>
                )}
                {saveMsg && <span className="text-sm font-semibold text-green-600">{saveMsg}</span>}
              </div>
            </div>
            
            {/* Leyenda: cómo se calcula la renta mensual neta */}
            <div className="bg-purple-50 border-l-4 border-purple-500 p-6 rounded-lg">
              <h3 className="font-bold text-gray-800 mb-3">¿Cómo calculamos tu renta mensual neta?</h3>
              <ol className="space-y-2 text-gray-700 text-sm list-decimal list-inside">
                <li>
                  Invertimos tu <strong>aportación mensual (€{liveMonthly.toLocaleString('es-ES')})</strong> durante los{' '}
                  <strong>{years.toFixed(1)} años</strong> que faltan hasta tu jubilación (a los 67).
                </li>
                <li>
                  Aplicamos una <strong>rentabilidad media anual del 10%</strong> (histórica del S&amp;P 500) con interés
                  compuesto → <strong>patrimonio estimado (€{liveSim.patrimonioEstimado.toLocaleString('es-ES', { maximumFractionDigits: 0 })})</strong>.
                </li>
                <li>
                  Al jubilarte, ese patrimonio genera <strong>dividendos anuales del 3,5%</strong> sin necesidad de vender.
                </li>
                <li>
                  Restamos la <strong>retención fiscal española</strong> sobre dividendos: 19% hasta 6.000€, 21% entre
                  6.000€ y 50.000€, y 23% a partir de 50.000€.
                </li>
                <li>
                  El resultado neto dividido entre 12 = tu <strong>renta mensual neta (€{liveSim.dividendosMensualNeto.toFixed(2)})</strong>.
                </li>
              </ol>
              <p className="text-gray-500 text-xs mt-3">
                Es una estimación basada en datos históricos; la rentabilidad real puede variar y no está garantizada.
              </p>
            </div>
            
            {/* Info Box */}
            <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded-lg">
              <h3 className="font-bold text-gray-800 mb-2">Tu plan está activo</h3>
              <p className="text-gray-700">
                Recibirás alertas automáticas en cada momento clave: motivación mensual, señales de compra y avisos de rotación.
                No necesitas hacer nada más que seguir las instrucciones.
              </p>
            </div>
          </div>
          );
        })()}
        
        {/* Funds Tab */}
        {activeTab === 'funds' && (
          <div className="space-y-6">
            {/* CTA de afiliado MyInvestor */}
            <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-6">
              <h3 className="text-lg font-bold text-navy mb-2">¿Aún no tienes cuenta en MyInvestor?</h3>
              <p className="text-gray-700 text-sm mb-4">
                Necesitas una cuenta para invertir en los fondos de tu plan. Es <strong>gratuita, sin comisiones de custodia</strong>,
                y además <strong>tú y quien te lo recomienda recibís 25 euros cada uno</strong> simplemente invirtiendo 100 euros en fondos
                en los primeros 3 meses.
              </p>
              
              <div className="bg-white/70 rounded-lg p-4 mb-4">
                <p className="text-sm font-semibold text-gray-800 mb-2">Condiciones para recibir los 25 €:</p>
                <ul className="space-y-1 text-sm text-gray-700 ml-4">
                  <li>✓ Tener 1.000 euros en cuenta, O</li>
                  <li>✓ Contratar un depósito, O</li>
                  <li>✓ Invertir 100 euros en fondos, carteras, planes o acciones/ETF</li>
                  <li>✓ Mantener durante 3 meses desde apertura</li>
                </ul>
              </div>
              
              <a
                href="https://newapp.myinvestor.es/do/signup?promotionalCode=D52OP"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block w-full sm:w-auto bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-bold py-3 px-6 rounded-lg text-center transition shadow-md"
              >
                Abrir cuenta en MyInvestor →
              </a>
              <p className="text-xs text-gray-600 mt-3">
                El enlace se abre con la promoción aplicada automáticamente.
              </p>
            </div>
            
            {/* Lista de fondos */}
            <div>
              <h3 className="text-xl font-bold text-navy mb-3">Tus fondos de inversión</h3>
              <p className="text-sm text-gray-600 mb-4">
                Copia el ISIN del fondo que necesites → pégalo en el <strong>buscador de fondos</strong> de la app de MyInvestor
                → localízalo y haz la acción que corresponda según el contexto:
              </p>
              <ul className="text-sm text-gray-600 mb-6 ml-4 space-y-1">
                <li>• <strong>Fondo de espera</strong>: añade aquí tu dinero, todas las veces que quieras, mientras el S&amp;P 500 esté por encima de la EMA200.</li>
                <li>• <strong>Fondo de crecimiento</strong>: transfiere tu dinero desde el fondo de espera cuando recibas una señal de compra (S&amp;P 500 cruza a la baja la EMA200).</li>
                <li>• <strong>Fondo de dividendos</strong>: rota el 20% anual durante los últimos 5 años antes de tu jubilación desde el fondo de crecimiento cuando recibas cada aviso.</li>
              </ul>
              
              <div className="space-y-4">
                {funds.map((fund) => (
                  <div key={fund.isin} className="bg-white p-6 rounded-lg shadow-md border border-gray-100">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="text-sm text-gray-500 uppercase tracking-wide">{fund.role}</p>
                        <h4 className="text-lg font-bold text-navy">{fund.name}</h4>
                        <p className="text-gray-600 text-sm mt-1">{fund.description}</p>
                      </div>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg flex items-center justify-between">
                      <code className="text-base font-mono font-bold text-navy">{fund.isin}</code>
                      <button
                        onClick={() => navigator.clipboard.writeText(fund.isin)}
                        className="bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold text-sm min-h-[40px]"
                      >
                        Copiar ISIN
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        
        {/* EMA History Tab */}
        {activeTab === 'history' && emaHistory && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-xl font-bold text-navy mb-4">Historial del EMA200</h3>
              <p className="text-gray-700 mb-4">
                {emaHistory.insight}
              </p>
              <div className="overflow-x-auto">
              <table className="w-full min-w-[480px]">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold text-gray-700">Año</th>
                    <th className="px-4 py-2 text-left font-semibold text-gray-700">Evento</th>
                    <th className="px-4 py-2 text-left font-semibold text-gray-700">Recuperación</th>
                  </tr>
                </thead>
                <tbody>
                  {emaHistory.history?.map((item) => (
                    <tr key={item.year} className="border-t border-gray-200 hover:bg-gray-50">
                      <td className="px-4 py-3 font-semibold text-navy">{item.year}</td>
                      <td className="px-4 py-3 text-gray-700">{item.event}</td>
                      <td className="px-4 py-3 text-gray-600">{item.recovery}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          </div>
        )}
        
        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-xl font-bold text-navy mb-4">Datos personales</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <p className="text-gray-800 font-semibold">{profile?.email}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                  <p className="text-gray-800 font-semibold">{profile?.name || '—'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de nacimiento</label>
                  <p className="text-gray-800 font-semibold">{formatBirthDate(profile?.birth_date)}</p>
                </div>
              </div>
            </div>
            
            {/* Eliminar cuenta — visible pero sobrio */}
            <div className="pt-4 border-t border-gray-100">
              <button
                onClick={() => { setShowDeleteModal(true); setDeleteConfirmText(''); setDeleteError(''); }}
                className="w-full flex items-center justify-center gap-2 text-red-600 active:text-red-700 text-sm font-medium border border-red-200 rounded-lg py-3 min-h-[48px]"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Eliminar cuenta
              </button>
              {isAdmin && (
                <p className="text-xs text-gray-400 text-center mt-2">
                  La cuenta de administrador no puede eliminarse.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Modal de confirmación para eliminar cuenta */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center px-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-red-700 mb-2">Eliminar cuenta</h3>
            <p className="text-gray-700 text-sm mb-4">
              Esta acción es <strong>permanente e irreversible</strong>. Se borrarán todos tus datos y dejarás de recibir
              las alertas automáticas. Para confirmar, escribe <strong>ELIMINAR</strong> en el campo de abajo.
            </p>
            <input
              type="text"
              inputMode="text"
              autoCapitalize="characters"
              autoComplete="off"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="Escribe ELIMINAR"
              className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition mb-2"
            />
            {deleteError && <p className="text-red-500 text-sm mb-2">{deleteError}</p>}
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 mt-4">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="w-full sm:w-auto px-4 py-3 min-h-[48px] text-gray-600 active:text-gray-800 font-medium border border-gray-200 rounded-lg transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText !== 'ELIMINAR' || deleting || isAdmin}
                className="w-full sm:w-auto px-5 py-3 min-h-[48px] bg-red-600 active:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold rounded-lg transition"
              >
                {deleting ? 'Eliminando...' : 'Eliminar mi cuenta'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
