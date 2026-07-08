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
            <li>✓ El mercado cae un 30% → No entres en pánico, es parte del plan</li>
            <li>✓ Recibiste una señal de compra → Actúa sin dudas</li>
            <li>✓ Llega la rotación a dividendos → Sigue las instrucciones exactas</li>
            <li>✓ No entienden tus inversiones → Explícales que tienes un plan a largo plazo</li>
          </ul>
        </div>
        
        <div className="bg-gray-100 border border-gray-300 p-5 mb-8 rounded text-sm text-gray-600 leading-relaxed">
          <h3 className="font-bold text-gray-700 mb-2">Aviso legal importante</h3>
          <p className="mb-2">
            Esta plataforma es una <strong>herramienta educativa y de organización personal</strong>. La información y las alertas que recibes <strong>no constituyen asesoramiento financiero, de inversión, fiscal ni legal</strong>, ni una recomendación personalizada de compra o venta de ningún producto financiero.
          </p>
          <p className="mb-2">
            Toda inversión conlleva riesgos, incluida la posible pérdida del capital invertido. <strong>Las rentabilidades pasadas no garantizan rentabilidades futuras.</strong> Tú eres el único responsable de tus decisiones de inversión.
          </p>
          <p className="mb-2">
            No estamos autorizados ni registrados como entidad de asesoramiento financiero ante la CNMV. Antes de invertir, valora tu situación personal y, si lo necesitas, consulta con un asesor financiero profesional debidamente registrado.
          </p>
          <p>
            Algunos enlaces a MyInvestor pueden ser enlaces de afiliación. Esta plataforma no custodia tu dinero ni ejecuta operaciones en tu nombre.
          </p>
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
              Sé que los mercados subirán y bajarán. Confío en esta estrategia y seguiré sus señales sin excepciones. He leído y acepto el aviso legal anterior, y entiendo que invierto bajo mi propia responsabilidad.
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

/* deploy: disclaimer + orden mensajes - 1783516914 */
