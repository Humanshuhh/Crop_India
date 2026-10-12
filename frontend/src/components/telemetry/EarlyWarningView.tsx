import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  Calendar,
  Clock,
  ChevronRight,
  Volume2,
  Square,
  ListOrdered,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useVoice } from '../../context/VoiceContext';
import { fetchEarlyWarningAlerts } from '../../services/telemetry';
import type { LiveAlertEntry } from '../../types/telemetry.types';
import type { FarmerProfile } from '../../types/profile.types';

type RiskLevel = 'HIGH' | 'MODERATE' | 'LOW' | 'CRITICAL' | string;

export interface EarlyWarningViewProps {
  profile: FarmerProfile | null;
}

export const EarlyWarningView: React.FC<EarlyWarningViewProps> = ({ profile }) => {
  const { t } = useLanguage();
  const { isSpeaking, activeContentId, speak, stop } = useVoice();

  // Active state
  const [advisories, setAdvisories] = useState<LiveAlertEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [activeFilter, setActiveFilter] = useState<'ALL' | 'HIGH' | 'MODERATE' | 'LOW'>('ALL');
  const [expandedWarningId, setExpandedWarningId] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.latitude && profile?.longitude) {
      setIsLoading(true);
      setErrorMsg(null);
      fetchEarlyWarningAlerts(Number(profile.latitude), Number(profile.longitude))
        .then(res => {
          if (res.active_alerts) {
            setAdvisories(res.active_alerts);
          }
        })
        .catch(err => {
          setErrorMsg(err.userMessage || 'Failed to load early warning alerts.');
        })
        .finally(() => setIsLoading(false));
    }
  }, [profile?.latitude, profile?.longitude]);

  const hasRealTelemetry = advisories.length > 0;

  const filteredAdvisories =
  activeFilter === 'ALL'
    ? advisories
    : advisories.filter((a) => a.severity === activeFilter);

  const getRiskBadgeStyles = (level: RiskLevel) => {
    switch (level) {
      case 'HIGH':
      case 'CRITICAL':
        return 'bg-red-100 text-red-900 border-red-300';
      case 'MODERATE':
        return 'bg-amber-100 text-amber-900 border-amber-300';
      case 'LOW':
      default:
        return 'bg-emerald-100 text-emerald-900 border-emerald-300';
    }
  };

  const formatTimestamp = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString([], {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="space-y-6">
      {/* View Header with Status Notice */}
      <div className="rounded-2xl border border-stone-200 bg-stone-50 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 text-xs font-bold text-amber-900 uppercase tracking-wider">
            <ShieldAlert className="w-4 h-4 text-amber-700" />
            <span>Predictive Early Warning Engine</span>
          </div>
          <h3 className="text-lg font-bold text-stone-900">
            Satellite & Microclimate Anomaly Detection
          </h3>
          <p className="text-xs text-stone-600">
            Fuses multi-spectral satellite telemetry, weather time-series, and pre-symptomatic plant pathology models.
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div className="inline-flex rounded-xl bg-stone-100 p-1 border border-stone-200">
          {(['ALL', 'HIGH', 'MODERATE', 'LOW'] as const).map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setActiveFilter(filter)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                activeFilter === filter
                  ? 'bg-white text-stone-900 shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              {filter === 'ALL' ? 'All Alerts' : `${filter} Risk`}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-stone-500 font-medium">
            Endpoint: <code className="font-mono bg-stone-100 px-1.5 py-0.5 rounded text-[11px]">GET /api/v1/early-warning/alerts</code>
          </span>
        </div>
      </div>

      {/* Loading, Error, or Missing Location State */}
      {!hasRealTelemetry && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50/70 p-6 sm:p-8 space-y-5 shadow-2xs">
          {!profile?.latitude ? (
            <div className="flex items-start gap-3.5">
              <span className="p-2.5 rounded-2xl bg-amber-100 text-amber-900 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </span>
              <div className="space-y-1.5">
                <h4 className="font-bold text-sm sm:text-base text-amber-950">
                  {t('telemetryNoLocationTitle')}
                </h4>
                <p className="text-xs sm:text-sm text-amber-900/90 leading-relaxed max-w-2xl">
                  {t('telemetryNoLocationDesc')}
                </p>
              </div>
            </div>
          ) : isLoading ? (
            <div className="flex items-start gap-3.5">
              <span className="p-2.5 rounded-2xl bg-amber-100 text-amber-900 shrink-0">
                <Clock className="w-6 h-6 animate-pulse" />
              </span>
              <div className="space-y-1.5">
                <h4 className="font-bold text-sm sm:text-base text-amber-950">
                  {t('telemetryLoadingAlerts')}
                </h4>
              </div>
            </div>
          ) : errorMsg ? (
            <div className="flex items-start gap-3.5">
              <span className="p-2.5 rounded-2xl bg-red-100 text-red-900 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </span>
              <div className="space-y-1.5">
                <h4 className="font-bold text-sm sm:text-base text-red-950">
                  {t('telemetryFetchError')}
                </h4>
                <p className="text-xs sm:text-sm text-red-900/90 leading-relaxed max-w-2xl">
                  {errorMsg}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3.5">
              <span className="p-2.5 rounded-2xl bg-amber-100 text-amber-900 shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </span>
              <div className="space-y-1.5">
                <h4 className="font-bold text-sm sm:text-base text-amber-950">
                  {t('telemetryNoAlertsTitle')}
                </h4>
                <p className="text-xs sm:text-sm text-amber-900/90 leading-relaxed max-w-2xl">
                  {t('telemetryNoAlertsDesc')}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty State (when server returns empty list or filter has no matches) */}
      {(hasRealTelemetry) && filteredAdvisories.length === 0 && (
        <div className="rounded-2xl border border-stone-200 p-10 text-center bg-white space-y-3 shadow-2xs">
          <ShieldCheck className="w-10 h-10 text-emerald-600 mx-auto" />
          <h4 className="font-bold text-sm sm:text-base text-stone-900">
            No Active Anomalies in this Filter
          </h4>
          <p className="text-xs sm:text-sm text-stone-500 max-w-sm mx-auto">
            Satellite and microclimate telemetry indicate nominal conditions for this risk category.
          </p>
        </div>
      )}

      {/* Advisory Cards List */}
      {(hasRealTelemetry) && filteredAdvisories.length > 0 && (
        <div className="space-y-4">
          {filteredAdvisories.map((advisory) => {
            const isExpanded = expandedWarningId === advisory.id;
            const isSpeakingThis = isSpeaking && activeContentId === advisory.id;

            return (
              <div
                key={advisory.id}
                className="rounded-2xl border border-stone-200 bg-white overflow-hidden shadow-2xs transition-all hover:border-stone-300"
              >
                {/* Advisory Card Header */}
                <div
                  onClick={() =>
                    setExpandedWarningId(isExpanded ? null : advisory.id)
                  }
                  className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none"
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-extrabold border shrink-0 ${getRiskBadgeStyles(
                        advisory.severity
                      )}`}
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>{advisory.severity} RISK</span>
                    </span>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-sm sm:text-base text-stone-900">
                          {advisory.type ||
                            ((advisory.severity !== 'LOW')
                              ? 'Stress Anomaly Detected'
                              : 'Nominal Vegetative Vitality')}
                        </h4>
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-stone-100 text-stone-700 border border-stone-200">
                          {Math.round(advisory.confidence * 100)}% Confidence
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500">
                        <span className="font-mono text-[11px] text-stone-400">
                          ID: {advisory.id}
                        </span>
                        <span>•</span>
                        <span className={(advisory.severity !== 'LOW') ? 'text-amber-700 font-semibold' : 'text-emerald-700 font-semibold'}>
                          {(advisory.severity !== 'LOW') ? 'Anomaly Detected' : 'Normal Vitality'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-auto text-xs text-stone-400">
                    {advisory.detected_at && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{formatTimestamp(advisory.detected_at)}</span>
                      </span>
                    )}
                    <ChevronRight
                      className={`w-4 h-4 text-stone-400 transition-transform ${
                        isExpanded ? 'rotate-90' : ''
                      }`}
                    />
                  </div>
                </div>

                {/* Expandable Details Section */}
                {isExpanded && (
                  <div className="px-5 pb-5 pt-2 border-t border-stone-100 bg-stone-50/50 space-y-4 text-xs sm:text-sm">
                    {/* Proactive Actions List */}
                    {advisory.proactive_actions && advisory.proactive_actions.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900 uppercase tracking-wider">
                          <ListOrdered className="w-4 h-4 text-emerald-700 shrink-0" />
                          <span>Proactive Agronomic Actions:</span>
                        </div>
                        <ol className="space-y-2 list-none">
                          {advisory.proactive_actions.map((action, idx) => (
                            <li
                              key={idx}
                              className="flex items-start gap-2.5 bg-white border border-stone-200 rounded-xl p-3 text-stone-800 shadow-2xs"
                            >
                              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px] shrink-0 mt-0.5">
                                {idx + 1}
                              </span>
                              <span className="leading-relaxed">{action}</span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}

                    {/* Spoken Voice Advisory */}
                    {advisory.spoken_advisory && (
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-emerald-950 flex items-center gap-1.5 text-xs uppercase tracking-wider">
                            <ShieldCheck className="w-4 h-4 text-emerald-700" />
                            <span>Spoken Voice Advisory</span>
                          </span>

                          <button
                            type="button"
                            onClick={() => {
                              if (isSpeakingThis) {
                                stop();
                              } else {
                                speak(advisory.spoken_advisory, advisory.id);
                              }
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-100 hover:bg-emerald-200 text-emerald-900 transition-colors"
                            aria-label={isSpeakingThis ? 'Stop listening' : 'Listen to advisory spoken aloud'}
                          >
                            {isSpeakingThis ? (
                              <>
                                <Square className="w-3.5 h-3.5 text-emerald-900 fill-current" />
                                <span>Stop</span>
                              </>
                            ) : (
                              <>
                                <Volume2 className="w-3.5 h-3.5 text-emerald-800" />
                                <span>Listen Aloud</span>
                              </>
                            )}
                          </button>
                        </div>
                        <p className="text-emerald-950 leading-relaxed text-sm">
                          {advisory.spoken_advisory}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
