import React from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldAlert,
  AlertTriangle,
  RotateCw,
  ArrowRight,
  Bot,
  MapPin,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import type { AlertsState } from '../../types/dashboard.types';

interface TodaysAdvisoryCardProps {
  alerts: AlertsState;
  hasCoordinates: boolean;
}

export const TodaysAdvisoryCard: React.FC<TodaysAdvisoryCardProps> = ({
  alerts,
  hasCoordinates,
}) => {
  const { t } = useLanguage();

  // Top severity alert is first because useDashboardData already sorted them
  const topAlert = alerts.data[0] || null;

  const severity = topAlert?.severity?.toUpperCase();
  const isHigh = severity === 'HIGH' || severity === 'CRITICAL';
  const isModerate = severity === 'MODERATE';

  return (
    <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4">
      {/* Card Header */}
      <div className="flex items-center justify-between pb-3 border-b border-stone-100">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-800">
          <ShieldAlert className="w-4 h-4 text-emerald-600" aria-hidden="true" />
          <span>{t('dashboardTodaysAdvisory')}</span>
        </div>

        {topAlert && (
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
              isHigh
                ? 'bg-red-50 text-red-900 border-red-300'
                : isModerate
                ? 'bg-amber-50 text-amber-900 border-amber-300'
                : 'bg-emerald-50 text-emerald-900 border-emerald-300'
            }`}
          >
            <span>{topAlert.severity} RISK</span>
          </span>
        )}
      </div>

      {/* Card Body */}
      {alerts.status === 'loading' && (
        <div className="py-8 flex flex-col items-center justify-center space-y-2 text-stone-500">
          <RotateCw className="w-6 h-6 animate-spin text-emerald-600" aria-hidden="true" />
          <p className="text-xs font-medium">Scanning satellite & microclimate telemetry...</p>
        </div>
      )}

      {(alerts.status === 'no_location' || !hasCoordinates) && (
        <div className="py-4 space-y-3">
          <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-stone-50 border border-stone-200 text-stone-600">
            <MapPin className="w-5 h-5 text-stone-400 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-stone-800">{t('dashboardNoLocationTitle')}</h4>
              <p className="text-xs leading-relaxed text-stone-600">
                Satellite anomaly scan requires coordinates.
              </p>
            </div>
          </div>
          <Link
            to="/profile"
            className="inline-flex items-center justify-center w-full px-3 py-2 rounded-xl bg-stone-900 text-white text-xs font-semibold hover:bg-stone-800 transition-colors"
          >
            {t('dashboardSetLocation')}
          </Link>
        </div>
      )}

      {alerts.status === 'error' && (
        <div className="py-4 space-y-2">
          <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900">
            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="space-y-0.5">
              <p className="text-xs font-bold">Telemetry Service Notice</p>
              <p className="text-xs text-amber-800 leading-relaxed">
                {alerts.errorMessage || 'Unable to load predictive early warnings.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {alerts.status === 'ready' && !topAlert && (
        <div className="py-4 space-y-3">
          <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-1 text-stone-600">
            <p className="text-xs font-medium leading-relaxed">
              {t('dashboardNoAlerts')}
            </p>
            <p className="text-[11px] text-stone-500">
              Microclimate and vegetation telemetry indicate nominal indicators for this location.
            </p>
          </div>
          <Link
            to="/assistant"
            className="inline-flex items-center justify-center w-full gap-2 px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-white text-xs font-semibold transition-colors"
          >
            <Bot className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{t('dashboardAskMitra')}</span>
          </Link>
        </div>
      )}

      {alerts.status === 'ready' && topAlert && (
        <div className="space-y-3">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-stone-900 tracking-tight line-clamp-1">
              {topAlert.type || 'Telemetry Anomaly Trigger'}
            </h3>
            <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed pt-1">
              {topAlert.spoken_advisory ||
                (topAlert.proactive_actions && topAlert.proactive_actions[0]) ||
                'Pre-symptomatic telemetry threshold reached.'}
            </p>
          </div>

          {topAlert.proactive_actions && topAlert.proactive_actions.length > 0 && (
            <div className="rounded-xl bg-stone-50 border border-stone-100 p-2.5 space-y-1">
              <span className="text-[10px] uppercase font-bold text-stone-400 block tracking-wider">
                Recommended Action:
              </span>
              <p className="text-xs text-stone-800 font-medium line-clamp-1">
                {topAlert.proactive_actions[0]}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Card Action */}
      <div className="pt-2 border-t border-stone-100">
        <Link
          to="/kisaan-telemetry"
          className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-50 hover:border-stone-400 active:bg-stone-100 font-semibold text-xs transition-colors min-h-[40px]"
        >
          <span>View All Risk Telemetry</span>
          <ArrowRight className="w-3.5 h-3.5 text-stone-500" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
};
