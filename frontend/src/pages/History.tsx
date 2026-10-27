import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import {
  History as HistoryIcon,
  Layers,
  Activity,
  ShieldAlert,
  Calendar,
  ChevronRight,
  RotateCw,
  Clock,
  FileText,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getFarmerHistory } from '../services/history';
import type { HistoryItem, HistoryFilter } from '../types/history.types';
import type { NormalizedError } from '../types/api.types';

export const History: React.FC = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<NormalizedError | null>(null);
  const [activeFilter, setActiveFilter] = useState<HistoryFilter>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const farmerId = user
    ? (user.uid.startsWith('FARM_') || user.uid.startsWith('KS-')
        ? user.uid
        : `KS-${user.uid.slice(0, 8).toUpperCase()}`)
    : null;

  const fetchHistory = async () => {
    if (!farmerId) return;
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
    let isCancelled = false;

    if (!farmerId) {
      setHistoryItems([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    getFarmerHistory(farmerId)
      .then((records) => {
        if (!isCancelled) {
          setHistoryItems(records || []);
        }
      })
      .catch((err) => {
        if (!isCancelled) {
          setError(err as NormalizedError);
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [farmerId]);

  const filteredRecords =
    activeFilter === 'all'
      ? historyItems
      : historyItems.filter((item) => item.type === activeFilter);

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
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 space-y-8">
      {/* Header */}
      <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-200">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold">
            <HistoryIcon className="w-3.5 h-3.5" />
            <span>{t('historyBadgeArchives')}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-stone-900 tracking-tight">
            {t('historyPageTitle')}
          </h1>
          <p className="text-stone-600 text-sm sm:text-base">
            {t('historyPageSubtitle')}
          </p>
        </div>
      </div>
      {/* Category Filter Tabs */}
      {user && (
        <div className="w-full flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-xl bg-stone-100 p-1 border border-stone-200" role="tablist">
            {[
              { id: 'all', label: t('historyFilterAll') },
              { id: 'soil_evaluation', label: t('historyFilterSoil') },
              { id: 'diagnosis', label: t('historyFilterPathology') },
              { id: 'early_warning', label: t('historyFilterAlerts') },
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
            <span>{t('historyRefreshBtn')}</span>
          </button>
        </div>
      )}

      {/* Unauthenticated State */}
      {!user && (
        <div className="w-full rounded-2xl border border-stone-200 p-8 sm:p-12 text-center bg-white space-y-5 shadow-2xs">
          <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto border border-emerald-200">
            <HistoryIcon className="w-8 h-8 text-emerald-700" />
          </div>
          <div className="space-y-2 max-w-md mx-auto">
            <h3 className="font-extrabold text-stone-900 text-lg sm:text-xl tracking-tight">
              {t('historyAuthRequiredTitle')}
            </h3>
            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
              {t('historyAuthRequiredBody')}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              to="/login"
              className="inline-flex items-center justify-center px-6 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white font-bold text-xs sm:text-sm shadow-sm transition-colors min-h-[44px]"
            >
              {t('historyLoginBtn')}
            </Link>
            <Link
              to="/signup"
              className="inline-flex items-center justify-center px-6 py-2.5 rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-50 font-bold text-xs sm:text-sm transition-colors min-h-[44px]"
            >
              {t('navSignup')}
            </Link>
          </div>
        </div>
      )}

      {/* Loading State */}
      {user && loading && (
        <div className="w-full rounded-2xl border border-stone-200 p-12 text-center bg-white space-y-3 shadow-2xs">
          <RotateCw className="w-8 h-8 animate-spin text-emerald-700 mx-auto" />
          <p className="text-sm font-semibold text-stone-800">
            {t('historyLoadingText')}
          </p>
        </div>
      )}

      {/* Backend API Pending Banner (when not in demo preview and backend is not yet deployed) */}
      {user && !loading && error && (
        <div className="w-full rounded-2xl border border-amber-300 bg-amber-50/70 p-6 sm:p-8 space-y-4 shadow-2xs">
          <div className="flex items-start gap-3">
            <span className="p-2.5 rounded-xl bg-amber-100 text-amber-900 shrink-0">
              <Clock className="w-5 h-5" />
            </span>
            <div className="space-y-1">
              <h4 className="font-bold text-sm sm:text-base text-amber-950">
                {t('historyErrorTitle')}
              </h4>
              <p className="text-xs sm:text-sm text-amber-900/90 leading-relaxed">
                {t('historyErrorBody')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {user && !loading && !error && filteredRecords.length === 0 && (
        <div className="w-full rounded-2xl border border-stone-200 p-12 text-center bg-white space-y-4 shadow-2xs">
          <div className="w-14 h-14 rounded-full bg-stone-100 text-stone-400 flex items-center justify-center mx-auto">
            <FileText className="w-7 h-7" />
          </div>
          <div className="space-y-1 max-w-sm mx-auto">
            <h4 className="font-bold text-stone-900 text-base">
              {t('historyEmptyTitle')}
            </h4>
            <p className="text-xs sm:text-sm text-stone-500 leading-relaxed">
              {t('historyEmptyBody')}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              to="/khet-swasthya"
              className="px-4 py-2 rounded-xl bg-emerald-700 text-white font-semibold text-xs hover:bg-emerald-800 transition-colors shadow-2xs"
            >
              {t('historyEmptySoilBtn')}
            </Link>
            <Link
              to="/fasal-rog-pehchan"
              className="px-4 py-2 rounded-xl border border-stone-300 text-stone-700 font-semibold text-xs hover:bg-stone-50 transition-colors"
            >
              {t('historyEmptyDiagnoseBtn')}
            </Link>
          </div>
        </div>
      )}

      {/* Timeline List */}
      {user && !loading && filteredRecords.length > 0 && (
        <div className="w-full space-y-4">
          {filteredRecords.map((item) => {
            const badge = getTypeBadge(item.type);
            const isExpanded = expandedId === item.id;

            return (
              <div
                key={item.id}
                className="w-full rounded-2xl border border-stone-200 bg-white overflow-hidden shadow-2xs transition-all hover:border-stone-300"
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
                        {t('historyRecordSummaryLabel')}
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
                          {t('historyRecordMetricsLabel')}
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
