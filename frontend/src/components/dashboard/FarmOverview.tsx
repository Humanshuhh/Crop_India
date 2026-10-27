import React from 'react';
import { Link } from 'react-router-dom';
import {
  Layers,
  Trees,
  ClipboardList,
  ShieldAlert,
  Sprout,
  Plus,
  ArrowRight,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import type { DashboardMetrics, CropItem } from '../../types/dashboard.types';

interface FarmOverviewProps {
  metrics: DashboardMetrics;
  cropsList: CropItem[];
}

export const FarmOverview: React.FC<FarmOverviewProps> = ({
  metrics,
  cropsList,
}) => {
  const { t } = useLanguage();

  return (
    <div className="space-y-6">
      {/* 1. Four Farm Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Land */}
        <div className="p-5 rounded-3xl border border-stone-200 bg-white shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
              {t('dashboardTotalLand')}
            </span>
            <span className="p-2 rounded-xl bg-blue-50 text-blue-700">
              <Layers className="w-4 h-4" aria-hidden="true" />
            </span>
          </div>
          <div>
            {metrics.totalLand.isRecorded ? (
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
                  {metrics.totalLand.value}
                </span>
                <span className="text-xs font-semibold text-stone-500 uppercase">
                  {metrics.totalLand.unit}
                </span>
              </div>
            ) : (
              <span className="text-sm font-semibold text-stone-400 italic">
                {t('dashboardNotRecorded')}
              </span>
            )}
            <p className="text-[11px] text-stone-400 pt-0.5">{t('dashboardDeclaredArea')}</p>
          </div>
        </div>

        {/* Metric 2: Registered Crops */}
        <div className="p-5 rounded-3xl border border-stone-200 bg-white shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
              {t('dashboardRegisteredCrops')}
            </span>
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
              <Trees className="w-4 h-4" aria-hidden="true" />
            </span>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
                {metrics.registeredCropsCount}
              </span>
              <span className="text-xs font-semibold text-stone-500">
                {metrics.registeredCropsCount === 1 ? t('dashboardCropSingular') : t('dashboardCropPlural')}
              </span>
            </div>
            <p className="text-[11px] text-stone-400 pt-0.5">{t('dashboardActiveInventory')}</p>
          </div>
        </div>

        {/* Metric 3: Recent Assessments */}
        <div className="p-5 rounded-3xl border border-stone-200 bg-white shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
              {t('dashboardRecentAssessments')}
            </span>
            <span className="p-2 rounded-xl bg-teal-50 text-teal-700">
              <ClipboardList className="w-4 h-4" aria-hidden="true" />
            </span>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
                {metrics.recentAssessmentsCount !== null ? metrics.recentAssessmentsCount : '—'}
              </span>
            </div>
            <p className="text-[11px] text-stone-400 pt-0.5">
              {metrics.recentAssessmentsCount !== null
                ? t('dashboardLast30Days')
                : t('dashboardSignInToTrack')}
            </p>
          </div>
        </div>

        {/* Metric 4: Active Alerts */}
        <div className="p-5 rounded-3xl border border-stone-200 bg-white shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
              {t('dashboardActiveAlerts')}
            </span>
            <span
              className={`p-2 rounded-xl ${
                metrics.activeAlertsCount && metrics.activeAlertsCount > 0
                  ? 'bg-red-50 text-red-700'
                  : 'bg-stone-100 text-stone-600'
              }`}
            >
              <ShieldAlert className="w-4 h-4" aria-hidden="true" />
            </span>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span
                className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${
                  metrics.activeAlertsCount && metrics.activeAlertsCount > 0
                    ? 'text-red-600'
                    : 'text-stone-900'
                }`}
              >
                {metrics.activeAlertsStatus === 'ready'
                  ? metrics.activeAlertsCount
                  : '—'}
              </span>
              {metrics.activeAlertsStatus === 'ready' && (
                <span className="text-xs font-semibold text-stone-500">
                  {metrics.activeAlertsCount === 1 ? t('dashboardAlertSingular') : t('dashboardAlertPlural')}
                </span>
              )}
            </div>
            <p className="text-[11px] text-stone-400 pt-0.5">
              {metrics.activeAlertsStatus === 'no_location'
                ? t('dashboardCoordRequired')
                : metrics.activeAlertsStatus === 'error'
                ? t('dashboardTelemetryOffline')
                : t('dashboardSatelliteRisk')}
            </p>
          </div>
        </div>
      </div>

      {/* 2. Simplified Registered Crops Table */}
      <div className="rounded-3xl border border-stone-200 bg-white shadow-xs overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <Sprout className="w-5 h-5 text-emerald-700" aria-hidden="true" />
              <h3 className="text-base sm:text-lg font-bold text-stone-900">
                {t('dashboardRegisteredCrops')}
              </h3>
            </div>
            <p className="text-xs text-stone-500">{t('dashboardCatalogedCrops')}</p>
          </div>

          <Link
            to="/profile"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{t('dashboardManageCrops')}</span>
          </Link>
        </div>

        {cropsList.length === 0 ? (
          <div className="p-8 text-center space-y-2">
            <p className="text-xs text-stone-500">
              {t('dashboardNoCropsInventory')}
            </p>
            <Link
              to="/profile"
              className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:underline"
            >
              <span>{t('dashboardAddCropsCta')}</span>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50/70 border-b border-stone-100 text-stone-500 uppercase tracking-wider font-bold text-[10px]">
                <tr>
                  <th scope="col" className="py-3 px-5 sm:px-6">{t('dashboardCropNameCol')}</th>
                  <th scope="col" className="py-3 px-5 sm:px-6">{t('dashboardProfileStatusCol')}</th>
                  <th scope="col" className="py-3 px-5 sm:px-6 text-right">{t('dashboardQuickActionCol')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {cropsList.map((crop, idx) => (
                  <tr key={`${crop.name}-${idx}`} className="hover:bg-stone-50/50 transition-colors">
                    <td className="py-3.5 px-5 sm:px-6 font-semibold text-stone-900">
                      {crop.name}
                    </td>
                    <td className="py-3.5 px-5 sm:px-6">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                        <span>{crop.status}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-5 sm:px-6 text-right">
                      <Link
                        to="/fasal-rog-pehchan"
                        className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-900 font-semibold"
                      >
                        <span>{t('dashboardDiagnoseAction')}</span>
                        <ArrowRight className="w-3 h-3" aria-hidden="true" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
