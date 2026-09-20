import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Sparkles,
  HelpCircle,
  Activity,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { VoiceReaderButton } from './VoiceReaderButton';

export interface ActionItem {
  title?: string;
  detail: string;
  badge?: string;
}

export interface AdvisorySectionProps {
  title: string;
  badge?: string;
  severity?: 'normal' | 'warning' | 'critical';
  advisorySummary: string;
  immediateActions: (ActionItem | string)[];
  rationale?: string | string[];
  technicalDetails?: React.ReactNode;
  voiceContentId?: string;
  spokenSummary?: string;
}

export const AdvisorySection: React.FC<AdvisorySectionProps> = ({
  title,
  badge,
  severity = 'normal',
  advisorySummary,
  immediateActions,
  rationale,
  technicalDetails,
  voiceContentId,
  spokenSummary,
}) => {
  const { t } = useLanguage();
  const [techDetailsOpen, setTechDetailsOpen] = useState(false);

  const textToRead = spokenSummary || advisorySummary;
  const sentences = textToRead
    ? textToRead
        .split(/(?<=[.?!।\n])\s+/)
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  const severityStyles = {
    normal: {
      border: 'border-emerald-500',
      badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      icon: <Sparkles className="w-5 h-5 text-emerald-600 shrink-0" aria-hidden="true" />,
    },
    warning: {
      border: 'border-amber-500',
      badgeBg: 'bg-amber-100 text-amber-900 border-amber-300',
      icon: <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" aria-hidden="true" />,
    },
    critical: {
      border: 'border-rose-500',
      badgeBg: 'bg-rose-100 text-rose-900 border-rose-300',
      icon: <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" aria-hidden="true" />,
    },
  };

  const currentSeverity = severityStyles[severity] || severityStyles.normal;

  return (
    <section
      className={`rounded-3xl border-2 ${currentSeverity.border} bg-white p-6 sm:p-8 md:p-10 shadow-lg space-y-8 animate-fadeIn`}
      aria-label="Agronomic Advisory"
    >
      {/* 1. ADVISORY HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-5">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 uppercase tracking-wider">
              {currentSeverity.icon}
              <span>{t('advisorySectionHeader')}</span>
            </div>
            {badge && (
              <span
                className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${currentSeverity.badgeBg}`}
              >
                {badge}
              </span>
            )}
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
            {title}
          </h2>
        </div>

        {voiceContentId && textToRead && (
          <div className="flex items-center">
            <VoiceReaderButton
              textToRead={textToRead}
              contentId={voiceContentId}
              sentences={sentences}
              label={t('voiceReadAloud')}
            />
          </div>
        )}
      </div>

      {/* Advisory Summary Banner */}
      <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-stone-800 text-sm sm:text-base leading-relaxed">
        <p className="font-medium text-emerald-950">{advisorySummary}</p>
      </div>

      {/* 2. WHAT TO DO (IMMEDIATE ACTIONABLE STEPS) */}
      {immediateActions && immediateActions.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-base sm:text-lg font-bold text-stone-900 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" aria-hidden="true" />
            <span>{t('advisoryImmediateAction')}</span>
          </h3>

          <div className="grid grid-cols-1 gap-3">
            {immediateActions.map((action, idx) => {
              const isObj = typeof action === 'object' && action !== null;
              const actionTitle = isObj ? action.title : undefined;
              const actionDetail = isObj ? action.detail : action;
              const actionBadge = isObj ? action.badge : undefined;

              return (
                <div
                  key={idx}
                  className="p-4 sm:p-5 rounded-2xl border border-stone-200 bg-stone-50 hover:bg-white hover:border-emerald-300 transition-colors shadow-2xs space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-stone-900 text-sm sm:text-base flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-emerald-700 text-white text-xs font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <span>{actionTitle || `Step ${idx + 1}`}</span>
                    </span>
                    {actionBadge && (
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                        {actionBadge}
                      </span>
                    )}
                  </div>
                  <p className="text-xs sm:text-sm text-stone-700 pl-8 leading-relaxed">
                    {actionDetail}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. WHY (AGRONOMIC RATIONALE) */}
      {rationale && (
        <div className="space-y-2 pt-2 border-t border-stone-100">
          <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-stone-600 flex items-center gap-1.5">
            <HelpCircle className="w-4 h-4 text-emerald-700 shrink-0" aria-hidden="true" />
            <span>{t('advisoryWhyTitle')}</span>
          </h3>
          <div className="text-xs sm:text-sm text-stone-700 bg-stone-50 p-4 rounded-xl border border-stone-200 leading-relaxed">
            {Array.isArray(rationale) ? (
              <ul className="space-y-1.5 list-disc list-inside">
                {rationale.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            ) : (
              <p>{rationale}</p>
            )}
          </div>
        </div>
      )}

      {/* 4. SUPPORTING TECHNICAL DETAILS (SECONDARY / COLLAPSIBLE) */}
      {technicalDetails && (
        <div className="pt-3 border-t border-stone-200">
          <button
            type="button"
            onClick={() => setTechDetailsOpen(!techDetailsOpen)}
            className="w-full flex items-center justify-between p-3.5 rounded-xl bg-stone-100 hover:bg-stone-200/80 text-stone-800 text-xs sm:text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
            aria-expanded={techDetailsOpen}
          >
            <span className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-stone-600" aria-hidden="true" />
              <span>{t('advisoryTechnicalDetails')}</span>
            </span>
            {techDetailsOpen ? (
              <ChevronUp className="w-4 h-4 text-stone-500" aria-hidden="true" />
            ) : (
              <ChevronDown className="w-4 h-4 text-stone-500" aria-hidden="true" />
            )}
          </button>

          {techDetailsOpen && (
            <div className="mt-3 p-4 rounded-xl border border-stone-200 bg-stone-50 animate-fadeIn">
              {technicalDetails}
            </div>
          )}
        </div>
      )}
    </section>
  );
};
