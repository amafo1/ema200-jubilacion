import { useNavigate } from 'react-router-dom';

export default function Landing() {
  const navigate = useNavigate();
  
  return (
    <div className="relative min-h-screen bg-gradient-to-b from-navy-dark via-navy to-navy-dark flex items-center justify-center px-4">
      <div className="text-center max-w-2xl">
        {/* Icono minimalista */}
        <div className="mb-8 flex justify-center">
          <svg className="w-24 h-24 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
              d="M13 7h8m0 0v8m0-8L5.343 18.657M3 3h8v8H3z" />
          </svg>
        </div>
        
        {/* Titular */}
        <h1 className="text-5xl md:text-6xl font-bold text-white mb-4 leading-tight">
          Tu jubilación en <span className="text-blue-400">piloto automático</span>
        </h1>
        
        {/* Subtítulo */}
        <p className="text-xl text-gray-300 mb-12 leading-relaxed">
          Invierte de forma inteligente y recibe alertas en el momento exacto en que debes actuar.
        </p>
        
        {/* Botón único */}
        <button
          onClick={() => navigate('/onboarding')}
          className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-4 px-8 rounded-lg text-lg transition-colors duration-200 w-full md:w-auto"
        >
          Quiero empezar
        </button>
        
        {/* Enlace a login */}
        <p className="text-gray-300 text-base mt-6">
          ¿Ya tienes cuenta?{' '}
          <button
            onClick={() => navigate('/login')}
            className="text-blue-400 hover:text-blue-300 font-semibold underline transition-colors"
          >
            Inicia sesión
          </button>
        </p>
        
        {/* Pie de página */}
        <p className="text-gray-400 text-sm absolute bottom-8 left-0 right-0 px-4">
          Diseñada para inversores residentes en España
        </p>
      </div>
    </div>
  );
}
