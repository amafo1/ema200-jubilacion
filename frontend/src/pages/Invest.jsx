import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Invest() {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(null);
  
  const myinvestorLink = 'https://newapp.myinvestor.es/do/signup?promotionalCode=D52OP';
  
  const handleCopyISIN = (isin) => {
    navigator.clipboard.writeText(isin);
    setCopied(isin);
    setTimeout(() => setCopied(null), 2000);
  };
  
  const funds = [
    { role: 'Espera', name: 'Fondo Monetario', isin: 'FR0000447823' },
    { role: 'Crecimiento', name: 'S&P 500', isin: 'IE00BYX5MX67' },
    { role: 'Jubilación', name: 'Fondo Dividendos', isin: 'ES0165185010' }
  ];
  
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-navy mb-8 text-center">Dónde invertir</h1>
        
        {/* Info Text */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
          <p className="text-gray-800 leading-relaxed mb-4">
            Para seguir este plan necesitas una cuenta en <strong>MyInvestor</strong>. Es gratuita, sin comisiones de custodia y además tú y quien te lo recomienda recibís <strong>25 euros cada uno</strong> simplemente invirtiendo 100 euros en fondos en los primeros 3 meses.
          </p>
          
          <h3 className="font-bold text-gray-800 mb-3">Condiciones:</h3>
          <ul className="space-y-2 text-gray-700 ml-4">
            <li>✓ Tener 1.000 euros en cuenta, O</li>
            <li>✓ Contratar un depósito, O</li>
            <li>✓ Invertir 100 euros en fondos, carteras, planes o acciones/ETF</li>
            <li>✓ Mantener durante 3 meses desde apertura</li>
          </ul>
        </div>
        
        {/* Fondos */}
        <h2 className="text-2xl font-bold text-navy mb-4">Tus fondos de inversión</h2>
        <div className="space-y-4 mb-8">
          {funds.map((fund) => (
            <div key={fund.isin} className="bg-white p-6 rounded-lg shadow-md">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm text-gray-600">{fund.role}</p>
                  <h3 className="text-lg font-bold text-navy">{fund.name}</h3>
                </div>
              </div>
              <div className="flex items-center justify-between bg-gray-50 p-3 rounded">
                <code className="text-lg font-mono font-bold text-navy">{fund.isin}</code>
                <button
                  onClick={() => handleCopyISIN(fund.isin)}
                  className={`px-4 py-2 rounded font-semibold transition ${
                    copied === fund.isin
                      ? 'bg-green-500 text-white'
                      : 'bg-blue-500 hover:bg-blue-600 text-white'
                  }`}
                >
                  {copied === fund.isin ? '✓ Copiado' : 'Copiar'}
                </button>
              </div>
            </div>
          ))}
        </div>
        
        {/* CTA destacado afiliado — único punto de apertura de cuenta */}
        <div className="bg-white border-2 border-green-400 p-6 rounded-lg shadow-md mb-4 text-center">
          <p className="text-gray-800 font-semibold mb-1">¿Aún no tienes cuenta?</p>
          <p className="text-sm text-gray-600 mb-4">Abre tu cuenta gratuita con nuestro enlace para encontrar estos fondos y activar el bono.</p>
          <a
            href={myinvestorLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-full items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-bold py-4 px-6 rounded-lg text-lg transition duration-200"
          >
            Abrir cuenta gratuita en MyInvestor
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </a>
        </div>
        
        {/* Important Note */}
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg mb-8 text-sm text-gray-700">
          <p>
            <strong>Nota importante:</strong> El enlace incluye tu código promocional. 
            Al hacer clic se abrirá directamente con la promoción aplicada, garantizándote los 25 euros de bono.
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
            onClick={() => navigate('/dashboard')}
            className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 rounded-lg transition"
          >
            Ir al Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
