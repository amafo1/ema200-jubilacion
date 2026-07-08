import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAPI } from '../services/api';

export default function AdminPanel() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('pending');
  const [pendingUsers, setPendingUsers] = useState([]);
  const [activeUsers, setActiveUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rejectReason, setRejectReason] = useState({});
  const [rejectingUser, setRejectingUser] = useState(null);
  
  useEffect(() => {
    loadAdminData();
  }, []);
  
  const loadAdminData = async () => {
    try {
      const [pendingRes, activeRes, statsRes] = await Promise.all([
        adminAPI.getPendingUsers(),
        adminAPI.getActiveUsers(),
        adminAPI.getStats()
      ]);
      
      setPendingUsers(pendingRes.data);
      setActiveUsers(activeRes.data);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Error loading admin data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleApproveUser = async (userId) => {
    try {
      await adminAPI.approveUser(userId);
      setPendingUsers(pendingUsers.filter(u => u.id !== userId));
      loadAdminData();
    } catch (error) {
      console.error('Error approving user:', error);
    }
  };
  
  const handleRejectUser = async (userId) => {
    try {
      await adminAPI.rejectUser(userId, rejectReason[userId] || '');
      setPendingUsers(pendingUsers.filter(u => u.id !== userId));
      setRejectingUser(null);
      setRejectReason({});
      loadAdminData();
    } catch (error) {
      console.error('Error rejecting user:', error);
    }
  };
  
  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Cargando panel administrativo...</div>;
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-md">
        <div className="max-w-6xl mx-auto px-4 py-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-navy">Panel Administrativo</h1>
          <button
            onClick={() => navigate('/')}
            className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg"
          >
            Salir
          </button>
        </div>
      </div>
      
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <p className="text-gray-600 text-sm">Total usuarios</p>
              <p className="text-3xl font-bold text-navy">{stats.users.total}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <p className="text-gray-600 text-sm">Aprobados</p>
              <p className="text-3xl font-bold text-green-600">{stats.users.approved}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <p className="text-gray-600 text-sm">Pendientes</p>
              <p className="text-3xl font-bold text-yellow-600">{stats.users.pending}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <p className="text-gray-600 text-sm">Señales de compra</p>
              <p className="text-3xl font-bold text-blue-600">{stats.buySignals}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <p className="text-gray-600 text-sm">Emails enviados</p>
              <p className="text-3xl font-bold text-purple-600">{stats.emails.total}</p>
            </div>
          </div>
        )}
        
        {/* Tabs */}
        <div className="flex gap-4 mb-8 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-2 font-bold border-b-2 transition ${
              activeTab === 'pending'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-800'
            }`}
          >
            ⏳ Pendientes ({pendingUsers.length})
          </button>
          <button
            onClick={() => setActiveTab('active')}
            className={`px-4 py-2 font-bold border-b-2 transition ${
              activeTab === 'active'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-800'
            }`}
          >
            ✓ Aprobados ({activeUsers.filter(u => u.status === 'approved').length})
          </button>
        </div>
        
        {/* Pending Users */}
        {activeTab === 'pending' && (
          <div className="space-y-4">
            {pendingUsers.length === 0 ? (
              <div className="bg-white p-8 rounded-lg shadow-md text-center">
                <p className="text-gray-600">No hay usuarios pendientes de aprobación</p>
              </div>
            ) : (
              pendingUsers.map((user) => (
                <div key={user.id} className="bg-white p-6 rounded-lg shadow-md">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-navy">{user.name || 'Sin nombre'}</h3>
                      <p className="text-gray-600 text-sm">{user.email}</p>
                      <p className="text-gray-500 text-xs mt-1">
                        Registrado: {new Date(user.created_at).toLocaleDateString('es-ES')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Aportación mensual</p>
                      <p className="text-2xl font-bold text-navy">€{user.monthly_contribution}</p>
                    </div>
                  </div>
                  
                  <div className="mb-4 p-4 bg-gray-50 rounded">
                    <p className="text-sm text-gray-600">Fecha de nacimiento</p>
                    <p className="font-semibold">{new Date(user.birth_date).toLocaleDateString('es-ES')}</p>
                  </div>
                  
                  {rejectingUser === user.id && (
                    <div className="mb-4 p-4 bg-red-50 rounded border border-red-200">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Razón del rechazo (opcional)</label>
                      <textarea
                        value={rejectReason[user.id] || ''}
                        onChange={(e) => setRejectReason({ ...rejectReason, [user.id]: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
                        rows="3"
                        placeholder="Explica el motivo del rechazo..."
                      />
                    </div>
                  )}
                  
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleApproveUser(user.id)}
                      className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg transition"
                    >
                      ✓ Aprobar
                    </button>
                    {rejectingUser === user.id ? (
                      <>
                        <button
                          onClick={() => handleRejectUser(user.id)}
                          className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg transition"
                        >
                          Confirmar rechazo
                        </button>
                        <button
                          onClick={() => {
                            setRejectingUser(null);
                            setRejectReason({});
                          }}
                          className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg transition"
                        >
                          Cancelar
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setRejectingUser(user.id)}
                        className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg transition"
                      >
                        ✗ Rechazar
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
        
        {/* Active Users */}
        {activeTab === 'active' && (
          <div className="space-y-4">
            {activeUsers.length === 0 ? (
              <div className="bg-white p-8 rounded-lg shadow-md text-center">
                <p className="text-gray-600">No hay usuarios aprobados aún</p>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-md overflow-x-auto">
                <table className="w-full min-w-[640px]">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-6 py-3 text-left font-semibold text-gray-700">Nombre</th>
                      <th className="px-6 py-3 text-left font-semibold text-gray-700">Email</th>
                      <th className="px-6 py-3 text-left font-semibold text-gray-700">Aportación</th>
                      <th className="px-6 py-3 text-left font-semibold text-gray-700">Años para jubilación</th>
                      <th className="px-6 py-3 text-left font-semibold text-gray-700">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeUsers.map((user) => (
                      <tr key={user.id} className="border-t border-gray-200 hover:bg-gray-50">
                        <td className="px-6 py-4 font-semibold text-navy">{user.name || '—'}</td>
                        <td className="px-6 py-4 text-gray-700">{user.email}</td>
                        <td className="px-6 py-4 text-gray-700">€{user.monthly_contribution}</td>
                        <td className="px-6 py-4 text-gray-700">{user.years_until_retirement || '—'}</td>
                        <td className="px-6 py-4">
                          {user.status === 'approved' ? (
                            <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">Aprobado</span>
                          ) : (
                            <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-semibold">Rechazado</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
