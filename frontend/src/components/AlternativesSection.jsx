import { useState, useEffect } from 'react';
import { alternativesAPI } from '../services/alternativesApi';

// Metadatos estáticos de cada activo alternativo. El estado (enabled) se
// obtiene del backend; el resto es información fija de presentación.
const ASSET_META = {
  GOLD: {
    icon: '🟡',
    name: 'WisdomTree Physical Gold',
    short: 'Oro físico',
    isin: 'JE00B8DFY052',
    description:
      'Oro físico como refugio de valor. Históricamente protege frente a la inflación y la incertidumbre de los mercados.',
    accent: 'border-yellow-400',
  },
  BTC: {
    icon: '₿',
    name: 'iShares Bitcoin ETP',
    short: 'Bitcoin',
    isin: 'XS2940466316',
    description:
      'Exposición a Bitcoin mediante un ETP regulado. Activo de alto riesgo y alta volatilidad: considéralo solo como una parte muy pequeña de tu cartera.',
    accent: 'border-orange-400',
  },
};

const ASSET_ORDER = ['GOLD', 'BTC'];

export default function AlternativesSection() {
  const [assets, setAssets] = useState(null); // { GOLD: {enabled}, BTC: {enabled} }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [togglingCode, setTogglingCode] = useState(null);
  const [copiedIsin, setCopiedIsin] = useState(null);

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await alternativesAPI.getStatus();
      const map = {};
      (res.data.assets || []).forEach((a) => {
        map[a.code] = { enabled: a.enabled };
      });
      setAssets(map);
    } catch (err) {
      setError('No se pudo cargar el estado de las alertas. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (code) => {
    if (!assets) return;
    const current = assets[code]?.enabled || false;
    const next = !current;
    // Actualización optimista
    setAssets((prev) => ({ ...prev, [code]: { enabled: next } }));
    setTogglingCode(code);
    try {
      await alternativesAPI.toggle(code, next);
    } catch (err) {
      // Revertir si falla
      setAssets((prev) => ({ ...prev, [code]: { enabled: current } }));
      setError('No se pudo guardar el cambio. Inténtalo de nuevo.');
    } finally {
      setTogglingCode(null);
    }
  };

  const handleCopyIsin = (isin) => {
    navigator.clipboard.writeText(isin);
    setCopiedIsin(isin);
    setTimeout(() => setCopiedIsin((c) => (c === isin ? null : c)), 2000);
  };

  if (loading) {
    return (
      <div className="bg-white p-8 rounded-lg shadow-md text-center text-gray-600">
        Cargando alternativas...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Intro */}
      <div className="bg-blue-50 border-l-4 border-blue-500 p-5 rounded-lg">
        <h3 className="font-bold text-navy mb-1">Activos alternativos</h3>
        <p className="text-gray-700 text-sm">
          Complementa tu plan con oro y bitcoin. Activa las alertas EMA200 de cada activo para recibir
          un email cuando cruce su media móvil de 200 semanas, tanto al alza (posible entrada) como a la
          baja (posible salida). El S&amp;P 500 mantiene sus alertas siempre activas.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Tarjetas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {ASSET_ORDER.map((code) => {
          const meta = ASSET_META[code];
          const enabled = assets?.[code]?.enabled || false;
          const isToggling = togglingCode === code;
          return (
            <div
              key={code}
              className={`bg-white p-6 rounded-lg shadow-md border-l-4 ${meta.accent} border-t border-r border-b border-gray-100 flex flex-col`}
            >
              {/* Cabecera: icono + nombre */}
              <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl leading-none">{meta.icon}</span>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">{meta.short}</p>
                  <h4 className="text-lg font-bold text-navy leading-tight">{meta.name}</h4>
                </div>
              </div>

              {/* Descripción */}
              <p className="text-gray-600 text-sm mb-4 flex-grow">{meta.description}</p>

              {/* ISIN copiable */}
              <div className="bg-gray-50 p-3 rounded-lg flex items-center justify-between mb-4 gap-2">
                <code className="text-sm font-mono font-bold text-navy break-all">{meta.isin}</code>
                <button
                  onClick={() => handleCopyIsin(meta.isin)}
                  className="shrink-0 bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white px-3 py-2 rounded-lg font-semibold text-sm min-h-[40px]"
                >
                  {copiedIsin === meta.isin ? '✓ Copiado' : 'Copiar ISIN'}
                </button>
              </div>

              {/* Estado actual (placeholder hasta integrar el monitor EMA200) */}
              <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 mb-4">
                <span className="text-sm text-gray-600">Estado actual</span>
                <span className="text-sm font-semibold text-gray-400">Pendiente de datos</span>
              </div>

              {/* Toggle de alertas */}
              <div className="flex items-center justify-between border-t border-gray-100 pt-4">
                <div>
                  <p className="font-semibold text-navy text-sm">Alertas EMA200</p>
                  <p className={`text-xs font-medium ${enabled ? 'text-green-600' : 'text-gray-400'}`}>
                    {enabled ? 'Activadas' : 'Desactivadas'}
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={enabled}
                  aria-label={`Alertas EMA200 de ${meta.name}`}
                  disabled={isToggling}
                  onClick={() => handleToggle(code)}
                  className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 disabled:opacity-60 ${
                    enabled ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 ${
                      enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
