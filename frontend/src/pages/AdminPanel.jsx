import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAPI } from '../services/api';

const PAGE_SIZE = 10;

export default function AdminPanel() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    try {
      const [usersRes, statsRes] = await Promise.all([
        adminAPI.getActiveUsers(),
        adminAPI.getStats()
      ]);
      setUsers(usersRes.data);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Error loading admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Cargando panel administrativo...</div>;
  }

  const totalPages = Math.max(1, Math.ceil(users.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const pageUsers = users.slice(startIndex, startIndex + PAGE_SIZE);

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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <p className="text-gray-600 text-sm">Usuarios dados de alta</p>
              <p className="text-3xl font-bold text-navy">{stats.users.total}</p>
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

        {/* Título de la sección */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-navy">Usuarios ({users.length})</h2>
        </div>

        {/* Tabla de usuarios */}
        {users.length === 0 ? (
          <div className="bg-white p-8 rounded-lg shadow-md text-center">
            <p className="text-gray-600">Todavía no hay usuarios dados de alta.</p>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-lg shadow-md overflow-x-auto">
              <table className="w-full min-w-[720px]">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-6 py-3 text-left font-semibold text-gray-700">Nombre</th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-700">Email</th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-700">Aportación</th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-700">Años para jubilación</th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-700">Fecha de alta</th>
                  </tr>
                </thead>
                <tbody>
                  {pageUsers.map((user) => (
                    <tr key={user.id} className="border-t border-gray-200 hover:bg-gray-50">
                      <td className="px-6 py-4 font-semibold text-navy">{user.name || '—'}</td>
                      <td className="px-6 py-4 text-gray-700">{user.email}</td>
                      <td className="px-6 py-4 text-gray-700">€{user.monthly_contribution}</td>
                      <td className="px-6 py-4 text-gray-700">{user.years_until_retirement ?? '—'}</td>
                      <td className="px-6 py-4 text-gray-700">
                        {user.created_at ? new Date(user.created_at).toLocaleDateString('es-ES') : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 rounded-lg font-semibold bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  ‹ Anterior
                </button>
                <span className="text-sm text-gray-600">
                  Página {currentPage} de {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 rounded-lg font-semibold bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  Siguiente ›
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
