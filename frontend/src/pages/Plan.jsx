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
  const [showScenariosModal, setShowScenariosModal] = useState(false);
  
  const scenarios = useMemo(() => ({
    conservative: simulateScenario(registrationData?.birthDate, monthlyContribution, 'conservative'),
    historic: simulateScenario(registrationData?.birthDate, monthlyContribution, 'historic'),
    optimistic: simulateScenario(registrationData?.birthDate, monthlyContribution, 'optimistic')
  }), [registrationData?.birthDate, monthlyContribution]);
  
  const loading = false;
  const active = scenarios[activeScenario] || {};
  
  const scenarioTitles = {
    conservative: 'Conservador',
    historic: 'Histórico',
    optimistic: 'Optimista'
  };
  
  const selectScenario = (type) => {
    setActiveScenario(type);
    setShowScenariosModal(false);
  };
  
  const ScenarioCard = ({ type, title, description }) => {
    const data = scenarios[type] || {};
    return (
      <div
        onClick={() => selectScenario(type)}
        className={`cursor-pointer p-5 rounded-lg border-2 transition ${
          activeScenario === type
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-200 bg-white hover:border-blue-300'
        }`}
      >
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-bold text-lg">{title}</h3>
          {type === 'historic' && (
            <span className="text-xs bg-blue-100 text-blue-700 font-semibold px-2 py-0.5 rounded-full">Recomendado</span>
          )}
        </div>
        <p className="text-sm text-gray-600 leading-relaxed mb-3">{description}</p>
        {data.patrimonioEstimado ? (
          <div className="text-sm text-gray-700 border-t border-gray-100 pt-3">
            <p>Patrimonio estimado: <strong className="text-navy">€{data.patrimonioEstimado.toLocaleString('es-ES', { maximumFractionDigits: 0 })}</strong></p>
            <p>Renta mensual neta: <strong className="text-green-600">€{data.dividendosMensualNeto?.toFixed(2)}</strong></p>
          </div>
        ) : null}
      </div>
    );
  };
  
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
          <div className="mt-4 pt-4 border-t border-gray-100 text-sm text-gray-600">
            <p className="font-semibold text-navy mb-1">Cómo repartes cada aportación</p>
            <p>Un <strong>70%</strong> va al <strong>Fondo Monetario</strong> (tu reserva para aprovechar las caídas) y un <strong>30%</strong> siempre al <strong>S&amp;P 500</strong> (renta variable, para no perder la subida continua del mercado). Cuando el S&amp;P 500 toca su EMA200, mueves el Monetario al S&amp;P 500.</p>
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
        
        {/* Aviso si falta la fecha de nacimiento */}
        {!registrationData?.birthDate && (
          <div className="mb-8 bg-amber-50 border-l-4 border-amber-500 p-4 text-sm text-amber-800 rounded">
            No hemos encontrado tu fecha de nacimiento, así que la estimación usa un horizonte por defecto de 30 años. Vuelve al <a href="/onboarding" className="underline font-semibold">registro</a> para obtener un cálculo ajustado a tu edad.
          </div>
        )}
        
        {/* Escenario por defecto: solo el Histórico. El resto se ven en un modal. */}
        <div className="mb-8 bg-white p-6 rounded-lg shadow-md">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-blue-500 font-semibold mb-1">Proyección recomendada</p>
              <h3 className="font-bold text-lg text-navy">Escenario Histórico · 10% anual</h3>
              <p className="text-sm text-gray-600 mt-1">
                Basado en la rentabilidad media histórica del S&amp;P 500 a largo plazo.
              </p>
            </div>
            <button
              onClick={() => setShowScenariosModal(true)}
              className="shrink-0 border-2 border-blue-500 text-blue-600 hover:bg-blue-50 font-semibold py-2.5 px-4 rounded-lg transition text-sm min-h-[44px]"
            >
              Ver otros escenarios
            </button>
          </div>
          {activeScenario !== 'historic' && (
            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between gap-3 flex-wrap">
              <p className="text-sm text-gray-700">
                Mostrando el escenario <strong>{scenarioTitles[activeScenario]}</strong> ({(ANNUAL_RETURNS[activeScenario] * 100).toFixed(0)}% anual).
              </p>
              <button
                onClick={() => setActiveScenario('historic')}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium underline"
              >
                Volver al recomendado
              </button>
            </div>
          )}
        </div>
        
        {/* Resultados del simulador */}
        {!loading && active.patrimonioEstimado && (
          <div className="bg-white p-8 rounded-lg shadow-md mb-8">
            <h2 className="text-2xl font-bold text-navy mb-2">Escenario {scenarioTitles[activeScenario]}</h2>
            <p className="text-sm text-gray-600 mb-6">
              Cálculo basado en <strong>{active.yearsUntilRetirement} años</strong> hasta tu jubilación (a los {RETIREMENT_AGE} años){registrationData?.birthDate ? `, en ${new Date(registrationData.birthDate).getFullYear() + RETIREMENT_AGE}` : ''}.
            </p>
            
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
              <strong>Disclaimer:</strong> Estimación orientativa basada en datos históricos y en tu fecha de jubilación (a los {RETIREMENT_AGE} años), asumiendo aportaciones mensuales constantes de €{monthlyContribution.toFixed(2)} hasta entonces. La rentabilidad pasada no garantiza la futura. No constituye asesoramiento financiero.
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
      
      {/* Modal: otros escenarios */}
      {showScenariosModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4"
          onClick={() => setShowScenariosModal(false)}
        >
          <div
            className="bg-white w-full sm:max-w-2xl sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-navy">Escenarios de proyección</h2>
              <button
                onClick={() => setShowScenariosModal(false)}
                className="text-gray-400 hover:text-gray-700 text-2xl leading-none"
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>
            <div className="p-6">
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm text-gray-700 mb-5">
                Todos son proyecciones del <strong>mismo plan de inversión</strong> (mismo reparto 70/30 y los mismos fondos). Lo único que cambia es la <strong>rentabilidad media anual estimada</strong> que usamos para el cálculo. No son perfiles de riesgo distintos.
              </div>
              <div className="grid grid-cols-1 gap-4">
                <ScenarioCard type="conservative" title="Conservador" description="7% retorno anual medio estimado (hipótesis prudente)" />
                <ScenarioCard type="historic" title="Histórico" description="10% retorno anual medio estimado (media histórica del S&P 500)" />
                <ScenarioCard type="optimistic" title="Optimista" description="13% retorno anual medio estimado (hipótesis optimista)" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
