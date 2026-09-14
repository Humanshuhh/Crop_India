import React, { useState } from 'react';
import {
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  Calendar,
  Clock,
  Info,
  ChevronRight,
  Eye,
  Volume2,
  Square,
  Activity,
  ListOrdered,
  Satellite,
} from 'lucide-react';
import { useVoice } from '../../context/VoiceContext';
import type { EarlyWarningAdvisory, RiskLevel } from '../../types/earlyWarning.types';

/**
 * Clearly labeled demo-only preview alerts for UI verification.
 * These strictly conform to the actual backend EarlyWarningAdvisory response model.
 */
const DEMO_PREVIEW_ADVISORIES: EarlyWarningAdvisory[] = [
  {
    warning_id: 'warn_demo_01',
    risk_level: 'HIGH',
    anomaly_detected: true,
    predicted_stress_type: 'Incipient Fungal Spore Proliferation (Pre-Symptomatic Blight)',
    confidence_score: 0.88,
    proactive_actions: [
      'Apply prophylactic spray of fermented sour buttermilk (Chaach) diluted 1:10 with water.',
      'Foliar spray of Pseudomonas fluorescens (20g/liter) during early morning hours.',
      'Inspect field bunds and drainage paths to avoid root zone water stagnation.',
    ],
    spoken_advisory:
      'किसान भाई, उपग्रह डेटा के अनुसार आपके खेत में नमी अधिक होने से फफूंद लगने का खतरा है। पत्तों पर लक्षण दिखने से पहले ही खट्टी छाछ या स्यूडोमोनास का छिड़काव करें।',
    timestamp: new Date().toISOString(),
  },
  {
    warning_id: 'warn_demo_02',
    risk_level: 'MODERATE',
    anomaly_detected: true,
    predicted_stress_type: 'Soil Moisture Stress / Canopy Dehydration',
    confidence_score: 0.82,
    proactive_actions: [
      'Apply straw or crop residue mulch to preserve residual root moisture.',
      'Administer light evening irrigation; avoid daytime peak heat.',
      'Spray 2% diluted Jeevamrit to strengthen foliar drought resilience.',
    ],
    spoken_advisory:
      'किसान भाई, उपग्रह डेटा से पता चला है कि खेत की नमी तेजी से घट रही है। फसल को सूखने से बचाने के लिए पुआल की मल्चिंग करें और शाम को हल्की सिंचाई दें।',
    timestamp: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    warning_id: 'warn_demo_03',
    risk_level: 'LOW',
    anomaly_detected: false,
    predicted_stress_type: null,
    confidence_score: 0.95,
    proactive_actions: [
      'Crop vitality index is normal. Continue planned organic maintenance.',
    ],
    spoken_advisory:
      'फसल का स्वास्थ्य सामान्य है। कोई पूर्व चेतावनी आवश्यक नहीं है।',
    timestamp: new Date(Date.now() - 172800000).toISOString(),
  },
];

export const EarlyWarningView: React.FC = () => {
  const { isSpeaking, activeContentId, speak, stop } = useVoice();

  // Active state
  const [advisories] = useState<EarlyWarningAdvisory[]>([]);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'HIGH' | 'MODERATE' | 'LOW'>('ALL');
  const [showDemoPreview, setShowDemoPreview] = useState(false);
  const [expandedWarningId, setExpandedWarningId] = useState<string | null>('warn_demo_01');

  // The client currently has no satellite/weather ingestion stream, so real telemetry is not available
  const hasRealTelemetry = advisories.length > 0;

  const displayedAdvisories = showDemoPreview ? DEMO_PREVIEW_ADVISORIES : advisories;

  const filteredAdvisories =
    activeFilter === 'ALL'
      ? displayedAdvisories
      : displayedAdvisories.filter((a) => a.risk_level === activeFilter);

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

        {/* Development Preview Toggle */}
        <button
          type="button"
          onClick={() => setShowDemoPreview(!showDemoPreview)}
          className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all border ${
            showDemoPreview
              ? 'bg-amber-100 border-amber-300 text-amber-900 shadow-2xs'
              : 'bg-white border-stone-300 text-stone-700 hover:bg-stone-100'
          }`}
        >
          <Eye className="w-3.5 h-3.5" />
          <span>{showDemoPreview ? 'Viewing Demo UI Preview' : 'Inspect Demo UI Hierarchy'}</span>
        </button>
      </div>

      {/* Demo Mode Notice */}
      {showDemoPreview && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-950 flex items-start gap-2.5 shadow-2xs animate-fadeIn">
          <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">UI Design Preview Active: </span>
            <span>
              Demonstrating the exact <code className="font-mono bg-amber-100 px-1 py-0.5 rounded">EarlyWarningAdvisory</code> schema layout (risk levels, proactive actions, confidence ratings, and spoken voice advisories). In adherence to our zero-fabricated-data charter, no placeholder API calls are made.
            </span>
          </div>
        </div>
      )}

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
            Endpoint: <code className="font-mono bg-stone-100 px-1.5 py-0.5 rounded text-[11px]">POST /api/v1/early-warning/evaluate-risk</code>
          </span>
        </div>
      </div>

      {/* Honest "Awaiting Telemetry Ingestion" State (when not in demo preview and no live telemetry series exists) */}
      {!showDemoPreview && !hasRealTelemetry && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50/70 p-6 sm:p-8 space-y-5 shadow-2xs">
          <div className="flex items-start gap-3.5">
            <span className="p-2.5 rounded-2xl bg-amber-100 text-amber-900 shrink-0">
              <Clock className="w-6 h-6" />
            </span>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-bold text-sm sm:text-base text-amber-950">
                  Awaiting Telemetry Ingestion
                </h4>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200 text-amber-950">
                  Service Ready
                </span>
              </div>
              <p className="text-xs sm:text-sm text-amber-900/90 leading-relaxed max-w-2xl">
                The predictive early warning endpoint (<code className="font-mono bg-amber-100/80 px-1 py-0.5 rounded font-semibold">POST /api/v1/early-warning/evaluate-risk</code>) evaluates rolling spectral and atmospheric time-series to detect pre-symptomatic crop stress.
              </p>
            </div>
          </div>

          {/* Missing Data Requirements Card */}
          <div className="rounded-xl border border-amber-200 bg-white/80 p-4 space-y-3 text-xs">
            <div className="flex items-center gap-2 font-bold text-amber-950">
              <Activity className="w-4 h-4 text-amber-700" />
              <span>Required Inputs Awaiting Ingestion Pipeline:</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-stone-700">
              <div className="flex items-start gap-2 p-2 rounded-lg bg-stone-50 border border-stone-200">
                <Satellite className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-stone-900 block">Sentinel-2 Spectral Indices</span>
                  <span className="text-stone-500 text-[11px]">Real NDVI (Vigor) & NDWI (Moisture)</span>
                </div>
              </div>
              <div className="flex items-start gap-2 p-2 rounded-lg bg-stone-50 border border-stone-200">
                <Activity className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-stone-900 block">Weather Time-Series</span>
                  <span className="text-stone-500 text-[11px]">Temperature (°C), Relative Humidity (%), Rainfall (mm)</span>
                </div>
              </div>
              <div className="flex items-start gap-2 p-2 rounded-lg bg-stone-50 border border-stone-200">
                <Clock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-stone-900 block">Historical Baseline</span>
                  <span className="text-stone-500 text-[11px]">Farm baseline NDVI (default 0.65)</span>
                </div>
              </div>
              <div className="flex items-start gap-2 p-2 rounded-lg bg-stone-50 border border-stone-200">
                <ShieldCheck className="w-4 h-4 text-purple-700 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-stone-900 block">Geospatial Boundaries</span>
                  <span className="text-stone-500 text-[11px]">Verified latitude & longitude coordinates</span>
                </div>
              </div>
            </div>
            <p className="text-[11px] text-amber-900/80 italic pt-1 border-t border-amber-100">
              Per our zero-fabricated-data policy, placeholder telemetry values are not transmitted. Live evaluations will execute automatically once backend telemetry workers supply real feeds.
            </p>
          </div>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setShowDemoPreview(true)}
              className="px-4 py-2 rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-semibold text-xs transition-colors shadow-2xs"
            >
              Inspect Demo UI Hierarchy
            </button>
            <span className="text-xs text-amber-800">
              Contract, schemas, and service boundary are fully aligned.
            </span>
          </div>
        </div>
      )}

      {/* Empty State (when server returns empty list or filter has no matches) */}
      {(showDemoPreview || hasRealTelemetry) && filteredAdvisories.length === 0 && (
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
      {(showDemoPreview || hasRealTelemetry) && filteredAdvisories.length > 0 && (
        <div className="space-y-4">
          {filteredAdvisories.map((advisory) => {
            const isExpanded = expandedWarningId === advisory.warning_id;
            const isSpeakingThis = isSpeaking && activeContentId === advisory.warning_id;

            return (
              <div
                key={advisory.warning_id}
                className="rounded-2xl border border-stone-200 bg-white overflow-hidden shadow-2xs transition-all hover:border-stone-300"
              >
                {/* Advisory Card Header */}
                <div
                  onClick={() =>
                    setExpandedWarningId(isExpanded ? null : advisory.warning_id)
                  }
                  className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none"
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-extrabold border shrink-0 ${getRiskBadgeStyles(
                        advisory.risk_level
                      )}`}
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>{advisory.risk_level} RISK</span>
                    </span>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-sm sm:text-base text-stone-900">
                          {advisory.predicted_stress_type ||
                            (advisory.anomaly_detected
                              ? 'Stress Anomaly Detected'
                              : 'Nominal Vegetative Vitality')}
                        </h4>
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-stone-100 text-stone-700 border border-stone-200">
                          {Math.round(advisory.confidence_score * 100)}% Confidence
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500">
                        <span className="font-mono text-[11px] text-stone-400">
                          ID: {advisory.warning_id}
                        </span>
                        <span>•</span>
                        <span className={advisory.anomaly_detected ? 'text-amber-700 font-semibold' : 'text-emerald-700 font-semibold'}>
                          {advisory.anomaly_detected ? 'Anomaly Detected' : 'Normal Vitality'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-auto text-xs text-stone-400">
                    {advisory.timestamp && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{formatTimestamp(advisory.timestamp)}</span>
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
                                speak(advisory.spoken_advisory, advisory.warning_id);
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
