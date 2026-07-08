import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { userAPI, fundAPI } from '../services/api';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [profile, setProfile] = useState(null);
  const [funds, setFunds] = useState([]);
  const [simulation, setSimulation] = useState(null);
  const [emaHistory, setEmaHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  
  useEffect(() => {
    loadDashboardData();
  }, []);
  
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
            className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg"
          >
            Cerrar sesión
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
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <p className="text-gray-600 text-sm">Aportación mensual</p>
                <p className="text-3xl font-bold text-navy">€{profile?.monthly_contribution?.toLocaleString('es-ES', { maximumFractionDigits: 2 })}</p>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-md">
                <p className="text-gray-600 text-sm">Años hasta jubilación</p>
                <p className="text-3xl font-bold text-blue-600">{profile?.yearsUntilRetirement?.toFixed(1)}</p>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-md">
                <p className="text-gray-600 text-sm">Patrimonio estimado</p>
                <p className="text-3xl font-bold text-green-600">€{simulation?.patrimonioEstimado?.toLocaleString('es-ES', { maximumFractionDigits: 0 })}</p>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-md">
                <p className="text-gray-600 text-sm">Renta mensual neta</p>
                <p className="text-3xl font-bold text-purple-600">€{simulation?.dividendosMensualNeto?.toFixed(2)}</p>
              </div>
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
        )}
        
        {/* Funds Tab */}
        {activeTab === 'funds' && (
          <div className="space-y-4">
            {funds.map((fund) => (
              <div key={fund.isin} className="bg-white p-6 rounded-lg shadow-md">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="text-sm text-gray-600">{fund.role}</p>
                    <h3 className="text-xl font-bold text-navy">{fund.name}</h3>
                    <p className="text-gray-600 text-sm mt-1">{fund.description}</p>
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded flex items-center justify-between">
                  <code className="text-lg font-mono font-bold text-navy">{fund.isin}</code>
                  <button
                    onClick={() => navigator.clipboard.writeText(fund.isin)}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded font-semibold text-sm"
                  >
                    Copiar ISIN
                  </button>
                </div>
              </div>
            ))}
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
                  <p className="text-gray-800 font-semibold">{profile?.birth_date}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-lg">
              <h3 className="font-bold text-red-900 mb-2">Zona de peligro</h3>
              <button
                onClick={handleLogout}
                className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg"
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
