import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import type { NormalizedError } from '../../types/api.types';
import { useLanguage } from '../../context/LanguageContext';

interface ErrorMessageProps {
  error: NormalizedError | string | null;
  onRetry?: () => void;
  className?: string;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({ error, onRetry, className = '' }) => {
  const { t } = useLanguage();

  if (!error) return null;

  const message = typeof error === 'string' ? error : error.userMessage;
  const category = typeof error === 'string' ? 'ERROR' : error.category;

  return (
    <div
      role="alert"
      className={`p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-900 shadow-xs ${className}`}
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" aria-hidden="true" />
        <div className="flex-1">
          <div className="flex items-center justify-between gap-2 mb-1">
            <h4 className="font-semibold text-sm text-rose-950">
              {category === 'VALIDATION_ERROR'
                ? 'Check Input Information'
                : category === 'BACKEND_UNREACHABLE'
                ? 'Service Temporarily Offline'
                : t('error')}
            </h4>
          </div>
          <p className="text-sm text-rose-800 leading-relaxed">{message}</p>

          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-medium hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-1"
            >
              <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{t('retry')}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
