import React from 'react';
import { Globe, Info } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

/**
 * Honest language scope disclosure per Addendum §1.
 * Shows a calm, localized notice directly beside AI result content
 * if the user has selected a regional language while AI outputs are English.
 */
export const LanguageNotice: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { language, t } = useLanguage();

  if (language === 'en') {
    return null;
  }

  return (
    <div
      role="note"
      className={`inline-flex items-center gap-2 px-3 py-2 bg-stone-100/90 border border-stone-300/80 rounded-md text-xs text-stone-700 ${className}`}
    >
      <Info className="w-3.5 h-3.5 text-stone-500 shrink-0" aria-hidden="true" />
      <span className="flex-1 leading-tight">
        {t('aiEnglishOnlyNotice')}
      </span>
      <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase text-stone-600 bg-stone-200 px-1.5 py-0.5 rounded font-semibold">
        <Globe className="w-3 h-3" aria-hidden="true" />
        EN Output
      </span>
    </div>
  );
};
