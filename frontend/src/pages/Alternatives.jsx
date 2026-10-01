import { useNavigate } from 'react-router-dom';
import AlternativesSection from '../components/AlternativesSection';

export default function Alternatives() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-md">
        <div className="max-w-6xl mx-auto px-4 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-navy">Alternativas</h1>
            <p className="text-gray-600">Oro y bitcoin para complementar tu plan</p>
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-1.5 text-gray-500 active:text-gray-700 text-sm font-medium border border-gray-200 rounded-full px-3 py-2 min-h-[40px]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span className="hidden sm:inline">Volver al dashboard</span>
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <AlternativesSection />

        {/* Disclaimer legal */}
        <p className="text-xs text-gray-400 text-center mt-10 max-w-2xl mx-auto leading-relaxed">
          Esta herramienta es solo informativa y educativa. No constituye asesoramiento financiero ni una recomendación de inversión. Invierte bajo tu propia responsabilidad.
        </p>
      </div>
    </div>
  );
}
