import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  History as HistoryIcon,
  Layers,
  Activity,
  ShieldAlert,
  Calendar,
  ChevronRight,
  RotateCw,
  Info,
  Clock,
  Eye,
  FileText,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getFarmerHistory } from '../services/history';
import type { HistoryItem, HistoryFilter } from '../types/history.types';
import type { NormalizedError } from '../types/api.types';

// Clearly isolated demo-only records for UI/UX inspection
const DEMO_PREVIEW_RECORDS: HistoryItem[] = [
  {
    id: 'demo-hist-1',
    type: 'soil_evaluation',
    title: 'Soil Health Assessment — Gangetic Loam',
    summary:
      'SOC deficient at 0.42%. Neutral pH (6.8). Prescribed fermented Jeevamrit root drench and Dhaincha green manuring.',
    date: '10 Sep 2026, 11:20 AM',
    status_or_confidence: 'Deficient SOC',
    tags: ['Regenerative Plan', 'Non-Chemical'],
    details: {
      ph: 6.8,
      organic_carbon: '0.42%',
      recommended_amendments: ['Fermented Jeevamrit (200 L/acre)', 'Trichoderma Enriched FYM (100 kg/acre)'],
      rotation: 'Kharif: Pearl Millet (Bajra) + Pigeon Pea (Arhar)',
    },
  },
  {
    id: 'demo-hist-2',
    type: 'diagnosis',
    title: 'Crop Disease Diagnosis — Early Leaf Spot',
    summary:
      'Identified fungal foliar lesions on tomato/potato foliage. Confidence HIGH (91%). Prescribed neem seed kernel spray.',
    date: '08 Sep 2026, 09:45 AM',
    status_or_confidence: 'Confidence: HIGH (91%)',
    tags: ['Multimodal Leaf Pathology', 'Neem Spray'],
    details: {
      pathogen: 'Alternaria solani',
      remedy: 'Neem Oil (5ml/L) + fermented buttermilk spray',
      prevention: 'Contour drainage & canopy aeration',
    },
  },
  {
    id: 'demo-hist-3',
    type: 'early_warning',
    title: 'Telemetry Risk Alert — Fungal Blight Humidity Anomaly',
    summary:
      'Canopy saturation trigger (>90% RH for 48h). Prophylactic bio-fungicide broadcast recommended before rains.',
    date: '05 Sep 2026, 06:00 AM',
    status_or_confidence: 'Risk: HIGH',
    tags: ['Satellite & Weather Fusion', 'Proactive Alert'],
    details: {
      trigger: '48h relative humidity elevation',
      sentinel_index: 'NDVI 0.52',
    },
  },
];

export const History: React.FC = () => {
  const { user } = useAuth();

  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<NormalizedError | null>(null);
  const [activeFilter, setActiveFilter] = useState<HistoryFilter>('all');
  const [showDemoPreview, setShowDemoPreview] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>('demo-hist-1');

  const farmerId = user ? `KS-${user.uid.slice(0, 8).toUpperCase()}` : 'default_farmer';

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const records = await getFarmerHistory(farmerId);
      setHistoryItems(records || []);
    } catch (err) {
      setError(err as NormalizedError);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [farmerId]);

  const displayedRecords = showDemoPreview ? DEMO_PREVIEW_RECORDS : historyItems;

  const filteredRecords =
    activeFilter === 'all'
      ? displayedRecords
      : displayedRecords.filter((item) => item.type === activeFilter);

  const getTypeBadge = (type: HistoryItem['type']) => {
    switch (type) {
      case 'soil_evaluation':
        return {
          label: 'Soil Health',
          icon: <Layers className="w-3.5 h-3.5" />,
          style: 'bg-emerald-100 text-emerald-900 border-emerald-300',
        };
      case 'diagnosis':
        return {
          label: 'Leaf Pathology',
          icon: <Activity className="w-3.5 h-3.5" />,
          style: 'bg-teal-100 text-teal-900 border-teal-300',
        };
      case 'early_warning':
        return {
          label: 'Risk Anomaly',
          icon: <ShieldAlert className="w-3.5 h-3.5" />,
          style: 'bg-amber-100 text-amber-900 border-amber-300',
        };
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-200">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold">
            <HistoryIcon className="w-3.5 h-3.5" />
            <span>Advisory Archives</span>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-stone-900 tracking-tight">
            Diagnostic & Advisory History
          </h1>
          <p className="text-stone-600 text-sm sm:text-base">
            Timeline of past soil evaluations, crop disease diagnoses, and early warning risk alerts.
          </p>
        </div>

        {/* Development Preview Toggle */}
        <button
          type="button"
          onClick={() => setShowDemoPreview(!showDemoPreview)}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all border self-start sm:self-auto ${
            showDemoPreview
              ? 'bg-amber-100 border-amber-300 text-amber-900 shadow-2xs'
              : 'bg-white border-stone-300 text-stone-700 hover:bg-stone-50'
          }`}
        >
          <Eye className="w-4 h-4" />
          <span>{showDemoPreview ? 'Viewing Demo Timeline Preview' : 'Inspect Demo UI Hierarchy'}</span>
        </button>
      </div>

      {/* Demo Notice Banner */}
      {showDemoPreview && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-950 flex items-start gap-2.5 shadow-2xs animate-fadeIn">
          <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">UI Timeline Preview Active: </span>
            <span>
              These sample cards illustrate the chronological timeline layout for Soil, Disease, and Alert records. No simulated backend queries are performed.
            </span>
          </div>
        </div>
      )}

      {/* Category Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-xl bg-stone-100 p-1 border border-stone-200" role="tablist">
          {[
            { id: 'all', label: 'All Records' },
            { id: 'soil_evaluation', label: 'Soil Health' },
            { id: 'diagnosis', label: 'Crop Pathology' },
            { id: 'early_warning', label: 'Risk Alerts' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveFilter(tab.id as HistoryFilter)}
              className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                activeFilter === tab.id
                  ? 'bg-white text-stone-900 shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={fetchHistory}
          disabled={loading}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 hover:text-emerald-900 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200"
        >
          <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Check Server Feed</span>
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="rounded-2xl border border-stone-200 p-12 text-center bg-white space-y-3 shadow-2xs">
          <RotateCw className="w-8 h-8 animate-spin text-emerald-700 mx-auto" />
          <p className="text-sm font-semibold text-stone-800">
            Querying advisory history archive...
          </p>
        </div>
      )}

      {/* Backend API Pending Banner (when not in demo preview and backend is not yet deployed) */}
      {!loading && !showDemoPreview && error && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50/70 p-6 sm:p-8 space-y-4 shadow-2xs">
          <div className="flex items-start gap-3">
            <span className="p-2.5 rounded-xl bg-amber-100 text-amber-900 shrink-0">
              <Clock className="w-5 h-5" />
            </span>
            <div className="space-y-1">
              <h4 className="font-bold text-sm sm:text-base text-amber-950">
                History Retrieval Endpoints Pending Backend Deployment
              </h4>
              <p className="text-xs sm:text-sm text-amber-900/90 leading-relaxed">
                The frontend history service boundary is prepared and ready. Backend retrieval endpoints for historical leaf diagnoses and soil evaluations have not yet been deployed by the backend team.
              </p>
            </div>
          </div>
          <div className="pt-3 border-t border-amber-200 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setShowDemoPreview(true)}
              className="px-4 py-2 rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-semibold text-xs transition-colors shadow-2xs"
            >
              Preview Timeline UI Structure & Details
            </button>
            <span className="text-xs text-amber-800 italic">
              Live evaluations run on Khet Swasthya & Fasal Rog Pehchan are processed live in session memory.
            </span>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredRecords.length === 0 && (
        <div className="rounded-2xl border border-stone-200 p-12 text-center bg-white space-y-4 shadow-2xs">
          <div className="w-14 h-14 rounded-full bg-stone-100 text-stone-400 flex items-center justify-center mx-auto">
            <FileText className="w-7 h-7" />
          </div>
          <div className="space-y-1 max-w-sm mx-auto">
            <h4 className="font-bold text-stone-900 text-base">No Historical Records Yet</h4>
            <p className="text-xs sm:text-sm text-stone-500 leading-relaxed">
              You haven't run any evaluations yet or the cloud history archive is currently empty.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              to="/khet-swasthya"
              className="px-4 py-2 rounded-xl bg-emerald-700 text-white font-semibold text-xs hover:bg-emerald-800 transition-colors shadow-2xs"
            >
              Run Soil Evaluation
            </Link>
            <Link
              to="/fasal-rog-pehchan"
              className="px-4 py-2 rounded-xl border border-stone-300 text-stone-700 font-semibold text-xs hover:bg-stone-50 transition-colors"
            >
              Diagnose Crop Leaf
            </Link>
          </div>
        </div>
      )}

      {/* Timeline List */}
      {!loading && filteredRecords.length > 0 && (
        <div className="space-y-4">
          {filteredRecords.map((item) => {
            const badge = getTypeBadge(item.type);
            const isExpanded = expandedId === item.id;

            return (
              <div
                key={item.id}
                className="rounded-2xl border border-stone-200 bg-white overflow-hidden shadow-2xs transition-all hover:border-stone-300"
              >
                {/* Header Row */}
                <div
                  onClick={() => setExpandedId(isExpanded ? null : item.id)}
                  className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none"
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-extrabold border shrink-0 ${badge.style}`}
                    >
                      {badge.icon}
                      <span>{badge.label}</span>
                    </span>

                    <div className="space-y-0.5">
                      <h4 className="font-bold text-sm sm:text-base text-stone-900">
                        {item.title}
                      </h4>
                      <p className="text-xs text-stone-600 line-clamp-1">
                        {item.summary}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-auto text-xs text-stone-400">
                    <span className="flex items-center gap-1 font-mono">
                      <Calendar className="w-3 h-3" />
                      <span>{item.date}</span>
                    </span>
                    {item.status_or_confidence && (
                      <span className="px-2 py-0.5 rounded bg-stone-100 font-semibold text-stone-700 text-[11px]">
                        {item.status_or_confidence}
                      </span>
                    )}
                    <ChevronRight
                      className={`w-4 h-4 text-stone-400 transition-transform ${
                        isExpanded ? 'rotate-90' : ''
                      }`}
                    />
                  </div>
                </div>

                {/* Expandable Details Row */}
                {isExpanded && (
                  <div className="px-5 pb-5 pt-3 border-t border-stone-100 bg-stone-50/60 space-y-3 text-xs sm:text-sm">
                    <div className="space-y-1">
                      <span className="font-bold uppercase tracking-wider text-[11px] text-stone-500 block">
                        Record Summary:
                      </span>
                      <p className="text-stone-700 leading-relaxed">
                        {item.summary}
                      </p>
                    </div>

                    {/* Metadata tags */}
                    {item.tags && item.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {item.tags.map((tag, idx) => (
                          <span
                            key={idx}
                            className="px-2.5 py-0.5 rounded-md bg-stone-200/80 text-stone-800 text-[11px] font-medium"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Structured Details */}
                    {item.details && (
                      <div className="p-4 rounded-xl bg-white border border-stone-200 space-y-2 mt-2">
                        <span className="font-bold uppercase tracking-wider text-[10px] text-stone-400 block">
                          Recorded Metrics:
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          {Object.entries(item.details).map(([k, v]) => (
                            <div key={k} className="p-2 rounded-lg bg-stone-50 border border-stone-100">
                              <span className="font-semibold text-stone-600 capitalize block">
                                {k.replace(/_/g, ' ')}:
                              </span>
                              <span className="text-stone-900 font-mono text-[11px]">
                                {Array.isArray(v) ? v.join(', ') : String(v)}
                              </span>
                            </div>
                          ))}
                        </div>
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
