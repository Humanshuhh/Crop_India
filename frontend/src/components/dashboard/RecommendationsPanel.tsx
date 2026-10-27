import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Bot, ArrowRight, ShieldAlert, CloudSun, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import type { RecommendationItem } from '../../types/dashboard.types';

interface RecommendationsPanelProps {
  recommendations: RecommendationItem[];
}

export const RecommendationsPanel: React.FC<RecommendationsPanelProps> = ({
  recommendations,
}) => {
  const { t } = useLanguage();

  return (
    <section aria-label="Recommendations for Your Farm" className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-emerald-700" aria-hidden="true" />
          <h2 className="text-xl sm:text-2xl font-extrabold text-stone-900 tracking-tight">
            {t('dashboardRecommendations')}
          </h2>
        </div>
        <span className="text-xs text-stone-500 font-medium hidden sm:inline">
          Derived from live agrometeorological & telemetry feeds
        </span>
      </div>

      {recommendations.length === 0 ? (
        <div className="p-6 rounded-3xl border border-stone-200 bg-white shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <span className="p-2.5 rounded-2xl bg-emerald-50 text-emerald-700 shrink-0">
              <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
            </span>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-stone-900">
                No active risk advisories for your farm
              </h3>
              <p className="text-xs text-stone-600 leading-relaxed max-w-xl">
                Current satellite vegetation indices and weather conditions show no active stress anomalies. Have specific questions about your crop cycle?
              </p>
            </div>
          </div>

          <Link
            to="/assistant"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold transition-colors shrink-0"
          >
            <Bot className="w-4 h-4" aria-hidden="true" />
            <span>{t('dashboardAskMitra')}</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {recommendations.map((rec) => {
            const isAlert = rec.category === 'alert';
            const isHigh = rec.severity === 'HIGH';

            return (
              <div
                key={rec.id}
                className="p-5 rounded-3xl border border-stone-200 bg-white shadow-xs hover:border-stone-300 transition-all flex flex-col justify-between space-y-3"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                        isHigh
                          ? 'bg-red-50 text-red-900 border-red-200'
                          : isAlert
                          ? 'bg-amber-50 text-amber-900 border-amber-200'
                          : 'bg-blue-50 text-blue-900 border-blue-200'
                      }`}
                    >
                      {isAlert ? (
                        <ShieldAlert className="w-3 h-3" aria-hidden="true" />
                      ) : (
                        <CloudSun className="w-3 h-3" aria-hidden="true" />
                      )}
                      <span>{isAlert ? `${rec.severity || 'RISK'} ADVISORY` : 'SPRAY WINDOW'}</span>
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-stone-900">{rec.title}</h3>
                  <p className="text-xs text-stone-600 leading-relaxed">{rec.description}</p>
                </div>

                {rec.actionLink && (
                  <div className="pt-2 border-t border-stone-100 flex justify-end">
                    <Link
                      to={rec.actionLink}
                      className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-900"
                    >
                      <span>{rec.actionText || 'Learn More'}</span>
                      <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                    </Link>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
