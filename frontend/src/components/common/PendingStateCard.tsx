import React from 'react';
import { Clock, Info, ChevronRight, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

interface PendingStateCardProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  tag?: string;
  className?: string;
  onClick?: () => void;
  isSelected?: boolean;
  actionText?: string;
}

/**
 * Honest Pending State Component per §5.
 * Distinct from loading (spinner) and error (alert).
 * Supports both static cards and interactive layer selectors.
 * Shows real layout chrome with calm, honest disclosure.
 */
export const PendingStateCard: React.FC<PendingStateCardProps> = ({
  title,
  description,
  icon,
  tag,
  className = '',
  onClick,
  isSelected = false,
  actionText,
}) => {
  const { t } = useLanguage();

  const isInteractive = Boolean(onClick);

  const cardContent = (
    <>
      {/* Header: fixed 2-col grid — icon gets its natural size, content div takes all remaining space.
          The content div is overflow-hidden + min-w-0, so the badge can NEVER escape the card. */}
      <div className="grid grid-cols-[auto_1fr] items-start gap-x-2.5 mb-3">
        {/* Col 1 — icon, always shrinks to its own size */}
        <span
          className={`p-2.5 rounded-xl transition-colors ${
            isSelected
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'bg-stone-200/90 text-stone-700 group-hover:bg-emerald-100 group-hover:text-emerald-800'
          }`}
        >
          {icon || <Clock className="w-5 h-5" aria-hidden="true" />}
        </span>

        {/* Col 2 — title + badge, fully contained within remaining card width */}
        <div className="min-w-0 overflow-hidden pt-0.5 flex flex-col gap-1.5">
          <h3 className="font-bold text-stone-900 text-base md:text-lg leading-snug">
            {title}
          </h3>
          <span
            className={`self-start inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full transition-colors max-w-full ${
              isSelected
                ? 'text-emerald-800 bg-emerald-100 border border-emerald-300'
                : 'text-amber-800 bg-amber-100/90 border border-amber-300/80'
            }`}
          >
            {isSelected ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" aria-hidden="true" />
                <span className="truncate">Selected Layer</span>
              </>
            ) : (
              <>
                <Info className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span className="truncate">{tag || t('pendingIntegrationTitle')}</span>
              </>
            )}
          </span>
        </div>
      </div>

      <p className="text-sm text-stone-600 leading-relaxed pl-0.5 mb-4">
        {description}
      </p>

      <div className="pt-3 border-t border-stone-200 flex flex-wrap items-center justify-between gap-2 text-xs text-stone-500">
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            className={`shrink-0 inline-block w-2 h-2 rounded-full ${
              isSelected ? 'bg-emerald-600' : 'bg-amber-500'
            }`}
            aria-hidden="true"
          ></span>
          <span className="truncate">{t('pendingIntegrationSubtitle')}</span>
        </div>

        {isInteractive && (
          <span
            className={`shrink-0 inline-flex items-center gap-1 font-semibold text-xs transition-colors ${
              isSelected ? 'text-emerald-800' : 'text-stone-600 group-hover:text-emerald-700'
            }`}
          >
            <span>{actionText || (isSelected ? 'Active Viewer' : 'Inspect Layer')}</span>
            <ChevronRight className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          </span>
        )}
      </div>
    </>
  );

  if (isInteractive) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`group text-left w-full rounded-2xl border p-5 sm:p-6 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2 active:scale-[0.99] select-none cursor-pointer ${
          isSelected
            ? 'border-2 border-emerald-700 bg-white shadow-md ring-2 ring-emerald-600/20'
            : 'border-stone-300/80 bg-stone-50/80 hover:bg-white hover:border-emerald-600 hover:shadow-xs'
        } ${className}`}
        aria-pressed={isSelected}
        aria-label={`${title} - ${isSelected ? 'Active Layer' : 'Click to inspect layer specifications'}`}
      >
        {cardContent}
      </button>
    );
  }

  return (
    <div
      className={`rounded-2xl border border-stone-300/80 bg-stone-100/70 p-5 sm:p-6 text-stone-800 shadow-xs transition-colors ${className}`}
      role="region"
      aria-label={`${title} - ${t('pendingIntegrationTitle')}`}
    >
      {cardContent}
    </div>
  );
};
