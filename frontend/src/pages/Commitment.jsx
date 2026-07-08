import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Commitment() {
  const navigate = useNavigate();
  const [accepted, setAccepted] = useState(false);
  
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-2xl bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-3xl font-bold text-navy mb-8 text-center">Tu compromiso</h1>
        
        <div className="bg-blue-50 border-l-4 border-blue-500 p-6 mb-8 rounded">
          <p className="text-gray-800 leading-relaxed text-lg">
            <strong>Esta estrategia solo funciona si la sigues de forma disciplinada.</strong>
          </p>
          <br />
          <p className="text-gray-700 leading-relaxed">
            Los mercados caen, dan miedo y generan dudas. Precisamente en esos momentos es cuando esta estrategia actúa. 
          </p>
          <br />
          <p className="text-gray-700 leading-relaxed">
            Si vendes por pánico o ignoras las alertas, el plan no funcionará.
          </p>
        </div>
        
        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-6 mb-8 rounded">
          <h3 className="font-bold text-gray-800 mb-3">¿Qué significa esto?</h3>
          <ul className="space-y-2 text-gray-700">
            <li>✓ Recibiste una señal de compra → Actúa sin dudas</li>
            <li>✓ El mercado cae un 30% → No entres en pánico, es parte del plan</li>
            <li>✓ Llega la rotación a dividendos → Sigue las instrucciones exactas</li>
            <li>✓ No entienden tus inversiones → Explícales que tienes un plan a largo plazo</li>
          </ul>
        </div>
        
        <div className="flex items-start space-x-4 mb-8">
          <input
            type="checkbox"
            id="accept"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
            className="mt-1 w-5 h-5 text-blue-500 rounded cursor-pointer"
          />
          <label htmlFor="accept" className="cursor-pointer text-gray-700">
            <strong>Entiendo y me comprometo a seguir el plan</strong>
            <p className="text-sm text-gray-600 mt-1">
              Sé que los mercados subirán y bajarán. Confío en esta estrategia y seguiré sus señales sin excepciones.
            </p>
          </label>
        </div>
        
        <button
          onClick={() => navigate('/plan')}
          disabled={!accepted}
          className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-bold py-3 rounded-lg transition duration-200"
        >
          Aceptar y continuar
        </button>
      </div>
    </div>
  );
}
