import { useNavigate } from 'react-router-dom';

export default function Alerts() {
  const navigate = useNavigate();
  // Durante el onboarding la cuenta siempre está pendiente de aprobación.
  const accountStatus = 'pending';
  
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-navy mb-8 text-center">Alertas configuradas</h1>
        
        {/* Alert Box */}
        <div className="space-y-4 mb-8">
          {/* Motivación */}
          <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-lg text-navy">📧 Motivación mensual</h3>
                <p className="text-gray-600 text-sm mt-1">Día 1 de cada mes</p>
              </div>
              <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">Activa</span>
            </div>
          </div>
          
          {/* Señal de Compra */}
          <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-green-500">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-lg text-navy">🎯 Señal de compra</h3>
                <p className="text-gray-600 text-sm mt-1">Cuando S&P 500 toca EMA200 semanal por abajo</p>
              </div>
              <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">Activa</span>
            </div>
          </div>
          
          {/* Rotación */}
          <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-purple-500">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-lg text-navy">💰 Rotación a dividendos</h3>
                <p className="text-gray-600 text-sm mt-1">Rotación gradual 20% anual (5 años antes jubilación)</p>
              </div>
              <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">Activa</span>
            </div>
          </div>
        </div>
        
        {/* Status Message */}
        {accountStatus === 'pending' && (
          <div className="bg-yellow-50 border-l-4 border-yellow-500 p-6 rounded-lg mb-8">
            <h3 className="font-bold text-yellow-900 mb-2">⏳ Tu cuenta está pendiente de activación</h3>
            <p className="text-yellow-800">El administrador revisará tu solicitud en breve. Una vez aprobada, comenzarás a recibir estas alertas automáticamente.</p>
          </div>
        )}
        
        {/* Final Message */}
        <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded-lg mb-8">
          <p className="text-gray-800 leading-relaxed">
            <strong>Todo listo. Ya puedes olvidarte.</strong> Te avisamos en cada momento.
          </p>
          <p className="text-sm text-gray-600 mt-2">
            Tus alertas se enviarán automáticamente a tu email. No necesitas hacer nada más.
          </p>
        </div>
        
        <div className="flex gap-4">
          <button
            onClick={() => navigate(-1)}
            className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-3 rounded-lg transition"
          >
            Atrás
          </button>
          <button
            onClick={() => navigate('/invest')}
            className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 rounded-lg transition"
          >
            Continuar
          </button>
        </div>
      </div>
    </div>
  );
}
