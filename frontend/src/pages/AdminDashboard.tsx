// PROTOTYPE ONLY – production should use Firebase custom claims + server‑side verification
import React, { useEffect, useState } from 'react';
import { Activity, RefreshCw, Server, Cpu, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { checkBackendHealth, type BackendHealthResponse } from '../services/health';

export const AdminDashboard: React.FC = () => {
  const { t } = useLanguage();
  const [healthData, setHealthData] = useState<BackendHealthResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState<boolean>(false);

  const fetchHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await checkBackendHealth();
      setHealthData(data);
    } catch (err: unknown) {
      console.error('[AdminDashboard] Health fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to connect to backend service');
      setHealthData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-stone-200 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-amber-100 text-amber-800">
              <Activity className="w-6 h-6" aria-hidden="true" />
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight">
              {t('adminDashboardTitle')}
            </h1>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-stone-500">
            PROTOTYPE ONLY — role verified via Firestore users collection. Production should use Firebase custom claims + server-side verification.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchHealth}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-stone-900 text-stone-100 hover:bg-stone-800 active:bg-stone-950 text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed min-h-[44px] focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Loading state */}
      {loading && !healthData && (
        <div className="p-12 text-center bg-white rounded-2xl border border-stone-200 shadow-xs">
          <RefreshCw className="w-8 h-8 mx-auto text-emerald-600 animate-spin mb-3" aria-hidden="true" />
          <p className="text-sm font-medium text-stone-600">Querying backend health telemetry...</p>
        </div>
      )}

      {/* Error / No data state */}
      {!loading && error && !healthData && (
        <div className="p-8 text-center bg-red-50 border border-red-200 rounded-2xl space-y-4">
          <div className="inline-flex p-3 rounded-full bg-red-100 text-red-700">
            <AlertTriangle className="w-6 h-6" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-red-900">{t('adminDashboardNoData')}</h3>
            <p className="text-xs text-red-700 mt-1 max-w-md mx-auto">{error}</p>
          </div>
          <button
            type="button"
            onClick={fetchHealth}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-700 hover:bg-red-800 text-white text-xs font-semibold shadow-xs transition-colors min-h-[44px]"
          >
            <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Retry Connection</span>
          </button>
        </div>
      )}

      {/* Real telemetry cards */}
      {healthData && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Status Card */}
            <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-stone-500 mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider">Backend Status</span>
                <Server className="w-5 h-5 text-stone-400" />
              </div>
              <div className="flex items-center gap-2.5">
                {healthData.status === 'healthy' ? (
                  <>
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" aria-hidden="true" />
                    <span className="text-xl font-bold text-emerald-700 capitalize">{healthData.status}</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-6 h-6 text-amber-600 shrink-0" aria-hidden="true" />
                    <span className="text-xl font-bold text-amber-700 capitalize">{healthData.status}</span>
                  </>
                )}
              </div>
              <span className="text-[11px] text-stone-400 mt-2">Core API server liveness</span>
            </div>

            {/* Service Name Card */}
            <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-stone-500 mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider">Service Identifier</span>
                <Cpu className="w-5 h-5 text-stone-400" />
              </div>
              <div>
                <span className="text-lg font-bold text-stone-800 font-mono break-all">{healthData.service}</span>
              </div>
              <span className="text-[11px] text-stone-400 mt-2">Registered microservice</span>
            </div>

            {/* Gemini Configured Card */}
            <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-stone-500 mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider">Gemini Engine</span>
                <Activity className="w-5 h-5 text-stone-400" />
              </div>
              <div className="flex items-center gap-2">
                {healthData.gemini_configured ? (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                    Configured / Active
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                    Not Configured
                  </span>
                )}
              </div>
              <span className="text-[11px] text-stone-400 mt-2">Multimodal AI reasoning engine</span>
            </div>
          </div>

          {/* Technical Diagnostics Collapsible */}
          <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4">
            <button
              type="button"
              onClick={() => setShowRaw(!showRaw)}
              className="text-xs font-semibold text-stone-700 hover:text-stone-900 flex items-center justify-between w-full min-h-[36px]"
            >
              <span>Raw Health Response (Developer Inspection)</span>
              <span>{showRaw ? 'Hide' : 'Show'}</span>
            </button>
            {showRaw && (
              <pre className="mt-3 p-3 bg-stone-900 text-emerald-400 font-mono text-xs rounded-xl overflow-x-auto">
                {JSON.stringify(healthData, null, 2)}
              </pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

