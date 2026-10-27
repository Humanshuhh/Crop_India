import React from 'react';
import { Link } from 'react-router-dom';
import {
  Layers,
  Activity,
  Bot,
  CloudSun,
  Satellite,
  History as HistoryIcon,
  ExternalLink,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

interface QuickActionsGridProps {
  onOpenForecastModal: () => void;
}

export const QuickActionsGrid: React.FC<QuickActionsGridProps> = ({
  onOpenForecastModal,
}) => {
  const { t } = useLanguage();

  const handleWeatherClick = () => {
    onOpenForecastModal();
  };

  return (
    <section aria-label="Quick Farm Actions" className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl sm:text-2xl font-extrabold text-stone-900 tracking-tight">
          {t('dashboardQuickActions')}
        </h2>
        <Link
          to="/data-sources"
          className="inline-flex items-center gap-1 text-xs font-semibold text-stone-500 hover:text-emerald-700"
        >
          <span>{t('navDataSources')}</span>
          <ExternalLink className="w-3 h-3" aria-hidden="true" />
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Action 1: Farm Health (Soil) */}
        <Link
          to="/khet-swasthya"
          className="group p-4 rounded-3xl border border-stone-200 bg-white hover:border-emerald-600 hover:shadow-md transition-all flex flex-col justify-between space-y-3 min-h-[140px] focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center group-hover:scale-105 transition-transform">
            <Layers className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-stone-900 group-hover:text-emerald-800 transition-colors line-clamp-1">
              {t('dashboardActionFarmHealth')}
            </h3>
            <p className="text-[11px] text-stone-500 line-clamp-2 leading-snug pt-0.5">
              {t('dashboardActionFarmHealthDesc')}
            </p>
          </div>
        </Link>

        {/* Action 2: Detect Crop Disease */}
        <Link
          to="/fasal-rog-pehchan"
          className="group p-4 rounded-3xl border border-stone-200 bg-white hover:border-emerald-600 hover:shadow-md transition-all flex flex-col justify-between space-y-3 min-h-[140px] focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center group-hover:scale-105 transition-transform">
            <Activity className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-stone-900 group-hover:text-emerald-800 transition-colors line-clamp-1">
              {t('dashboardActionDetectDisease')}
            </h3>
            <p className="text-[11px] text-stone-500 line-clamp-2 leading-snug pt-0.5">
              {t('dashboardActionDetectDiseaseDesc')}
            </p>
          </div>
        </Link>

        {/* Action 3: Kisan Mitra */}
        <Link
          to="/assistant"
          className="group p-4 rounded-3xl border border-stone-200 bg-white hover:border-emerald-600 hover:shadow-md transition-all flex flex-col justify-between space-y-3 min-h-[140px] focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center group-hover:scale-105 transition-transform">
            <Bot className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-stone-900 group-hover:text-emerald-800 transition-colors line-clamp-1">
              {t('actionMitraTitle')}
            </h3>
            <p className="text-[11px] text-stone-500 line-clamp-2 leading-snug pt-0.5">
              {t('dashboardActionMitraDesc')}
            </p>
          </div>
        </Link>

        {/* Action 4: Weather & Advisory */}
        <button
          type="button"
          onClick={handleWeatherClick}
          className="group text-left p-4 rounded-3xl border border-stone-200 bg-white hover:border-emerald-600 hover:shadow-md transition-all flex flex-col justify-between space-y-3 min-h-[140px] focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
        >
          <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-800 flex items-center justify-center group-hover:scale-105 transition-transform">
            <CloudSun className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-stone-900 group-hover:text-emerald-800 transition-colors line-clamp-1">
              {t('dashboardActionWeatherOutlook')}
            </h3>
            <p className="text-[11px] text-stone-500 line-clamp-2 leading-snug pt-0.5">
              {t('dashboardActionForecastDesc')}
            </p>
          </div>
        </button>

        {/* Action 5: Telemetry */}
        <Link
          to="/kisaan-telemetry"
          className="group p-4 rounded-3xl border border-stone-200 bg-white hover:border-emerald-600 hover:shadow-md transition-all flex flex-col justify-between space-y-3 min-h-[140px] focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center group-hover:scale-105 transition-transform">
            <Satellite className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-stone-900 group-hover:text-emerald-800 transition-colors line-clamp-1">
              {t('navTelemetry')}
            </h3>
            <p className="text-[11px] text-stone-500 line-clamp-2 leading-snug pt-0.5">
              {t('dashboardActionTelemetryDesc')}
            </p>
          </div>
        </Link>

        {/* Action 6: History */}
        <Link
          to="/history"
          className="group p-4 rounded-3xl border border-stone-200 bg-white hover:border-emerald-600 hover:shadow-md transition-all flex flex-col justify-between space-y-3 min-h-[140px] focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <div className="w-10 h-10 rounded-2xl bg-teal-100 text-teal-800 flex items-center justify-center group-hover:scale-105 transition-transform">
            <HistoryIcon className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-stone-900 group-hover:text-emerald-800 transition-colors line-clamp-1">
              {t('navHistory')}
            </h3>
            <p className="text-[11px] text-stone-500 line-clamp-2 leading-snug pt-0.5">
              {t('dashboardActionHistoryTimelineDesc')}
            </p>
          </div>
        </Link>
      </div>
    </section>
  );
};
