import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

const RETIREMENT_AGE = 67;
const DIVIDEND_YIELD = 0.035; // 3.5% anual
const ANNUAL_RETURNS = { conservative: 0.07, historic: 0.10, optimistic: 0.13 };

/**
 * Simulación de jubilación calculada en cliente.
 * Durante el onboarding el usuario aún no tiene sesión (token), por lo que
 * replicamos aquí la misma lógica del backend para no depender de la API.
 */
function simulateScenario(birthDate, monthlyAmount, scenario) {
  const annualReturn = ANNUAL_RETURNS[scenario] ?? ANNUAL_RETURNS.historic;

  let yearsUntilRetirement = 30;
  if (birthDate) {
    const birth = new Date(birthDate);
    const today = new Date();
    const retirementDate = new Date(birth.getFullYear() + RETIREMENT_AGE, birth.getMonth(), birth.getDate());
    yearsUntilRetirement = Math.max(0, (retirementDate - today) / (1000 * 60 * 60 * 24 * 365.25));
  }

  const monthlyReturn = Math.pow(1 + annualReturn, 1 / 12) - 1;
  const monthsUntilRetirement = Math.floor(yearsUntilRetirement * 12);

  let patrimonio = 0;
  for (let i = 0; i < monthsUntilRetirement; i++) {
    patrimonio = patrimonio * (1 + monthlyReturn) + monthlyAmount;
  }

  const dividendosAnuales = patrimonio * DIVIDEND_YIELD;

  // Retenciones fiscales españolas por tramos.
  let retension = 0;
  if (dividendosAnuales <= 6000) {
    retension = dividendosAnuales * 0.19;
  } else if (dividendosAnuales <= 50000) {
    retension = 6000 * 0.19 + (dividendosAnuales - 6000) * 0.21;
  } else {
    retension = 6000 * 0.19 + 44000 * 0.21 + (dividendosAnuales - 50000) * 0.23;
  }

  const dividendosNetos = dividendosAnuales - retension;

  return {
    scenario,
    yearsUntilRetirement: parseFloat(yearsUntilRetirement.toFixed(1)),
    patrimonioEstimado: parseFloat(patrimonio.toFixed(2)),
    dividendosAnualesBrutos: parseFloat(dividendosAnuales.toFixed(2)),
    retension: parseFloat(retension.toFixed(2)),
    dividendosAnualesNetos: parseFloat(dividendosNetos.toFixed(2)),
    dividendosMensualNeto: parseFloat((dividendosNetos / 12).toFixed(2))
  };
}

export default function Plan() {
  const navigate = useNavigate();
  const registrationData = useAuthStore(state => state.registrationData);
  
  const [monthlyContribution, setMonthlyContribution] = useState(
    parseFloat(registrationData?.monthlyContribution) || 500
  );
  const [activeScenario, setActiveScenario] = useState('historic');
  
  const scenarios = useMemo(() => ({
    conservative: simulateScenario(registrationData?.birthDate, monthlyContribution, 'conservative'),
    historic: simulateScenario(registrationData?.birthDate, monthlyContribution, 'historic'),
    optimistic: simulateScenario(registrationData?.birthDate, monthlyContribution, 'optimistic')
  }), [registrationData?.birthDate, monthlyContribution]);
  
  const loading = false;
  const active = scenarios[activeScenario] || {};
  
  const ScenarioCard = ({ type, title, description }) => (
    <div
      onClick={() => setActiveScenario(type)}
      className={`cursor-pointer p-6 rounded-lg border-2 transition ${
        activeScenario === type
          ? 'border-blue-500 bg-blue-50'
          : 'border-gray-200 bg-white hover:border-blue-300'
      }`}
    >
      <h3 className="font-bold text-lg mb-2">{title}</h3>
      <p className="text-sm text-gray-600">{description}</p>
    </div>
  );
  
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-navy mb-4 text-center">Tu plan personalizado</h1>
        
        {/* Timeline */}
        <div className="mb-12 bg-white p-6 rounded-lg shadow-md">
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-sm sm:justify-between">
            <span className="font-bold text-navy">HOY</span>
            <span className="text-gray-600">Acumulas en Monetario</span>
            <span className="text-gray-400">→</span>
            <span className="text-gray-600">Señal S&P500</span>
            <span className="text-gray-400">→</span>
            <span className="text-gray-600">Creces</span>
            <span className="text-gray-400">→</span>
            <span className="font-bold text-green-600">JUBILACIÓN {registrationData?.birthDate ? new Date(registrationData.birthDate).getFullYear() + 67 : '20XX'}</span>
          </div>
        </div>
        
        {/* Aportación mensual editable */}
        <div className="mb-8 bg-white p-6 rounded-lg shadow-md">
          <label className="block text-sm font-medium text-gray-700 mb-3">Aportación mensual: €{monthlyContribution.toFixed(2)}</label>
          <input
            type="range"
            min="50"
            max="5000"
            step="50"
            value={monthlyContribution}
            onChange={(e) => setMonthlyContribution(parseInt(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-2">
            <span>€50</span>
            <span>€5000</span>
          </div>
        </div>
        
        {/* Selección de escenarios */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <ScenarioCard type="conservative" title="Conservador" description="7% retorno anual (bajo riesgo)" />
          <ScenarioCard type="historic" title="Histórico" description="10% retorno anual (recomendado)" />
          <ScenarioCard type="optimistic" title="Optimista" description="13% retorno anual (alto riesgo)" />
        </div>
        
        {/* Resultados del simulador */}
        {!loading && active.patrimonioEstimado && (
          <div className="bg-white p-8 rounded-lg shadow-md mb-8">
            <h2 className="text-2xl font-bold text-navy mb-6">Escenario {activeScenario}</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-blue-50 p-6 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Patrimonio estimado</p>
                <p className="text-3xl font-bold text-navy">€{active.patrimonioEstimado?.toLocaleString('es-ES', { maximumFractionDigits: 0 })}</p>
              </div>
              
              <div className="bg-green-50 p-6 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Renta mensual neta en jubilación</p>
                <p className="text-3xl font-bold text-green-600">€{active.dividendosMensualNeto?.toFixed(2)}</p>
              </div>
              
              <div className="bg-orange-50 p-6 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Dividendos brutos anuales</p>
                <p className="text-2xl font-bold text-orange-600">€{active.dividendosAnualesBrutos?.toLocaleString('es-ES', { maximumFractionDigits: 2 })}</p>
              </div>
              
              <div className="bg-red-50 p-6 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Retención fiscal anual</p>
                <p className="text-2xl font-bold text-red-600">€{active.retension?.toLocaleString('es-ES', { maximumFractionDigits: 2 })}</p>
              </div>
            </div>
            
            <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 text-sm text-gray-700">
              <strong>Disclaimer:</strong> Estimación orientativa basada en datos históricos. La rentabilidad pasada no garantiza la futura. No constituye asesoramiento financiero.
            </div>
          </div>
        )}
        
        <div className="flex gap-4">
          <button
            onClick={() => navigate(-1)}
            className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-3 rounded-lg transition"
          >
            Atrás
          </button>
          <button
            onClick={() => navigate('/alerts')}
            className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 rounded-lg transition"
          >
            Continuar
          </button>
        </div>
      </div>
    </div>
  );
}
