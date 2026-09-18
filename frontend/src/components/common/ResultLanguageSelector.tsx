import React, { useId } from 'react';
import { Globe } from 'lucide-react';
import type { SupportedLanguage } from '../../types/i18n.types';
import { SUPPORTED_LANGUAGES } from '../../i18n';

export interface ResultLanguageSelectorProps {
  id?: string;
  label?: string;
  value: SupportedLanguage;
  onChange: (language: SupportedLanguage) => void;
  helperText?: string;
  className?: string;
  compact?: boolean;
  disabled?: boolean;
}

export const ResultLanguageSelector: React.FC<ResultLanguageSelectorProps> = ({
  id,
  label = 'Result Language',
  value,
  onChange,
  helperText,
  className = '',
  compact = false,
  disabled = false,
}) => {
  const generatedId = useId();
  const selectId = id || `result-lang-${generatedId}`;

  if (compact) {
    return (
      <div className={`inline-flex items-center gap-2 ${className}`}>
        <label
          htmlFor={selectId}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-700 whitespace-nowrap cursor-pointer"
        >
          <Globe className="w-3.5 h-3.5 text-emerald-700 shrink-0" aria-hidden="true" />
          <span>{label}:</span>
        </label>
        <select
          id={selectId}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value as SupportedLanguage)}
          className="min-h-[44px] px-3 py-2 text-xs sm:text-sm font-medium rounded-xl border border-stone-300 bg-white text-stone-900 shadow-2xs hover:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {SUPPORTED_LANGUAGES.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.nativeName === lang.name ? lang.name : `${lang.nativeName} (${lang.name})`}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div className={`space-y-1.5 ${className}`}>
      <label
        htmlFor={selectId}
        className="flex items-center gap-1.5 text-xs font-semibold text-stone-700 uppercase tracking-wider cursor-pointer"
      >
        <Globe className="w-3.5 h-3.5 text-emerald-700 shrink-0" aria-hidden="true" />
        <span>{label}</span>
      </label>
      <select
        id={selectId}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value as SupportedLanguage)}
        className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white text-stone-900 text-sm font-medium shadow-2xs hover:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {SUPPORTED_LANGUAGES.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.nativeName === lang.name ? lang.name : `${lang.nativeName} (${lang.name})`}
          </option>
        ))}
      </select>
      {helperText && (
        <p className="text-[11px] text-stone-500 leading-tight">
          {helperText}
        </p>
      )}
    </div>
  );
};

