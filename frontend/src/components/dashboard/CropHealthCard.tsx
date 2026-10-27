import React from 'react';
import { Link } from 'react-router-dom';
import { Activity, ShieldCheck, ArrowRight, RotateCw, Calendar } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import type { HistoryState } from '../../types/dashboard.types';

interface CropHealthCardProps {
  history: HistoryState;
}

function formatScanDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export const CropHealthCard: React.FC<CropHealthCardProps> = ({ history }) => {
  const { t } = useLanguage();
  const latest = history.latestDiagnosis;

  return (
    <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4">
      {/* Card Header */}
      <div className="flex items-center justify-between pb-3 border-b border-stone-100">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-800">
          <Activity className="w-4 h-4 text-emerald-600" aria-hidden="true" />
          <span>{t('dashboardCropHealth')}</span>
        </div>

        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-stone-100 text-stone-600 border border-stone-200">
          <span>{t('dashboardLastScanDate')}</span>
        </span>
      </div>

      {/* Card Body */}
      {history.status === 'loading' && (
        <div className="py-8 flex flex-col items-center justify-center space-y-2 text-stone-500">
          <RotateCw className="w-6 h-6 animate-spin text-emerald-600" aria-hidden="true" />
          <p className="text-xs font-medium">Loading recent pathology scans...</p>
        </div>
      )}

      {history.status !== 'loading' && !latest && (
        <div className="py-4 space-y-3">
          <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-1.5 text-stone-600">
            <p className="text-xs font-medium leading-relaxed">
              {t('dashboardNoDiagnosis')}
            </p>
          </div>
          <Link
            to="/fasal-rog-pehchan"
            className="inline-flex items-center justify-center w-full gap-2 px-3 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold transition-colors shadow-xs"
          >
            <span>Scan Crop Leaf Now</span>
            <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </Link>
        </div>
      )}

      {history.status !== 'loading' && latest && (
        <div className="space-y-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-bold text-stone-900 tracking-tight line-clamp-1">
                {latest.title}
              </h3>
            </div>
            <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed pt-1">
              {latest.summary}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
            {/* Timestamp */}
            {latest.date && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-stone-100 text-stone-600 font-mono">
                <Calendar className="w-3 h-3 text-stone-400" aria-hidden="true" />
                <span>{formatScanDate(latest.date)}</span>
              </span>
            )}

            {/* Confidence Badge */}
            {latest.status_or_confidence && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200">
                <ShieldCheck className="w-3 h-3 text-emerald-600" aria-hidden="true" />
                <span>{latest.status_or_confidence}</span>
              </span>
            )}
          </div>
        </div>
      )}

      {/* Card Action */}
      <div className="pt-2 border-t border-stone-100">
        <Link
          to="/fasal-rog-pehchan"
          className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-50 hover:border-stone-400 active:bg-stone-100 font-semibold text-xs transition-colors min-h-[40px]"
        >
          <span>Open Pathology Scanner</span>
          <ArrowRight className="w-3.5 h-3.5 text-stone-500" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
};
