import React from 'react';
import { Database, ShieldCheck, CheckCircle2, Clock, AlertTriangle, Info } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { DATA_SOURCES } from '../data/dataSources';

export const DataSources: React.FC = () => {
  const { t } = useLanguage();

  const integrated = DATA_SOURCES.filter((s) => s.status === 'integrated');
  const pending = DATA_SOURCES.filter((s) => s.status === 'pending');

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 space-y-10">
      {/* Header */}
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold">
          <Database className="w-4 h-4" />
          <span>Trust &amp; Methodology</span>
        </div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-stone-900 tracking-tight">
          {t('dataSourcesTitle')}
        </h1>
        <p className="text-stone-600 text-sm sm:text-base leading-relaxed max-w-3xl">
          {t('dataSourcesSubtitle')}
        </p>
      </div>

      {/* AI Governance & Disclaimer Box per §9 */}
      <section className="rounded-2xl border-2 border-emerald-600/30 bg-emerald-50/50 p-6 sm:p-8 space-y-4 shadow-xs">
        <div className="flex items-center gap-2.5 text-emerald-950 font-bold text-lg">
          <ShieldCheck className="w-6 h-6 text-emerald-700 shrink-0" />
          <h2>{t('aiGovernanceTitle')}</h2>
        </div>
        <p className="text-sm text-stone-700 leading-relaxed">
          {t('aiGovernanceNotice')}
        </p>
        <div className="pt-2 text-xs text-stone-600 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
          <span>Never take actions involving restricted pesticides solely on automated suggestions.</span>
        </div>
      </section>

      {/* Section: Actively Integrated Sources */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 border-b border-stone-200 pb-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-700" />
          <h2 className="text-xl font-bold text-stone-900">
            {t('integratedSourcesTitle')}
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {integrated.map((src) => (
            <div
              key={src.id}
              className="rounded-xl border border-stone-200 bg-white p-6 shadow-xs space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-bold text-stone-900">{src.name}</h3>
                  <span className="text-xs text-stone-500 font-medium">Provider: {src.provider}</span>
                </div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold self-start sm:self-auto">
                  <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                  {t('dsStatusConnected')}
                </span>
              </div>

              <p className="text-sm text-stone-700 leading-relaxed">
                <strong>What it provides:</strong> {src.whatItProvides}
              </p>

              {/* Honesty caveat note */}
              {src.honestyCaveat === 'partialGisCoverage' && (
                <div className="flex items-start gap-2 rounded-lg bg-blue-50 border border-blue-200 px-3 py-2.5 text-xs text-blue-900">
                  <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-blue-700" />
                  <span>{t('dsPartialGisCoverageNote')}</span>
                </div>
              )}

              {src.updateCadence && (
                <div className="text-xs text-stone-500 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span><strong>Update cadence:</strong> {src.updateCadence}</span>
                </div>
              )}

              <div className="pt-3 border-t border-stone-100 text-xs font-mono text-stone-500">
                {src.attributionText}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Section: Pending & Roadmap Sources */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 border-b border-stone-200 pb-3">
          <Clock className="w-5 h-5 text-amber-700" />
          <h2 className="text-xl font-bold text-stone-900">
            {t('pendingSourcesTitle')}
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {pending.map((src) => (
            <div
              key={src.id}
              className="rounded-xl border border-stone-300/70 bg-stone-50/80 p-6 space-y-3 text-stone-700"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-bold text-stone-900">{src.name}</h3>
                  <span className="text-xs text-stone-500 font-medium">Target: {src.provider}</span>
                </div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-semibold self-start sm:self-auto border border-amber-300">
                  {t('dsStatusPending')}
                </span>
              </div>

              <p className="text-sm text-stone-600 leading-relaxed">
                <strong>Planned telemetry:</strong> {src.whatItProvides}
              </p>

              {/* Sentinel estimated-layer caveat */}
              {src.honestyCaveat === 'sentinelEstimatedNote' && (
                <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5 text-xs text-amber-900">
                  <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-700" />
                  <span>{t('dsSentinelEstimatedNote')}</span>
                </div>
              )}

              <div className="pt-3 border-t border-stone-200 text-xs text-stone-500 italic">
                Status: {src.attributionText}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
