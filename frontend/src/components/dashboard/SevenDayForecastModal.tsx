import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar, Droplets, ArrowUp, ArrowDown, CloudSun, AlertTriangle } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import type { WeatherDailyForecast } from '../../types/telemetry.types';

interface SevenDayForecastModalProps {
  isOpen: boolean;
  onClose: () => void;
  dailyForecast: WeatherDailyForecast[];
  hasCoordinates: boolean;
  isLoading: boolean;
}

function formatDate(dateStr: string): { dayName: string; formattedDate: string } {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) {
      return { dayName: dateStr, formattedDate: '' };
    }
    const dayName = d.toLocaleDateString(undefined, { weekday: 'short' });
    const formattedDate = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    return { dayName, formattedDate };
  } catch {
    return { dayName: dateStr, formattedDate: '' };
  }
}

export const SevenDayForecastModal: React.FC<SevenDayForecastModalProps> = ({
  isOpen,
  onClose,
  dailyForecast,
  hasCoordinates,
  isLoading,
}) => {
  const { t } = useLanguage();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Close on Escape key press, freeze background scroll, and restore exact position on close
  useEffect(() => {
    if (!isOpen) return;

    // Capture exact scroll position before locking
    const scrollY = window.scrollY;
    const originalOverflow = document.body.style.overflow;

    // Freeze background scroll
    document.body.style.overflow = 'hidden';

    // Prevent any browser automatic scroll adjustment
    if (window.scrollY !== scrollY) {
      window.scrollTo(0, scrollY);
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // Focus close button for accessibility without auto-scrolling the viewport
    closeButtonRef.current?.focus({ preventScroll: true });

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
      // Guarantee exact scroll restoration
      window.scrollTo(0, scrollY);
    };
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="forecast-modal-title"
        className="w-[calc(100vw-2rem)] sm:w-full max-w-[620px] max-h-[min(calc(100dvh-3rem),720px)] rounded-3xl border border-stone-200 bg-white p-5 sm:p-6 shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Modal Header - Fixed within panel */}
        <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-stone-200 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
              <Calendar className="w-5 h-5" aria-hidden="true" />
            </span>
            <div>
              <h2
                id="forecast-modal-title"
                className="text-lg sm:text-xl font-bold text-stone-900 tracking-tight"
              >
                {t('dashboardSevenDayForecast')}
              </h2>
              <p className="text-xs text-stone-500">
                Open-Meteo verified agricultural meteorological projection
              </p>
            </div>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            aria-label={t('dashboardClose')}
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Modal Body - Middle scrollable container */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain py-3 sm:py-4 pr-1 focus:outline-none">
          {!hasCoordinates && (
            <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" aria-hidden="true" />
              <div className="space-y-1">
                <h4 className="text-xs font-bold">{t('dashboardNoLocationTitle')}</h4>
                <p className="text-xs text-amber-800 leading-relaxed">
                  {t('dashboardNoLocationDesc')}
                </p>
              </div>
            </div>
          )}

          {hasCoordinates && isLoading && (
            <div className="py-12 text-center text-xs text-stone-500 space-y-2">
              <CloudSun className="w-8 h-8 animate-pulse text-emerald-600 mx-auto" />
              <p>Loading 7-day meteorological forecast...</p>
            </div>
          )}

          {hasCoordinates && !isLoading && dailyForecast.length === 0 && (
            <div className="p-8 text-center text-xs text-stone-500 space-y-1">
              <p className="font-semibold text-stone-700">Forecast Unavailable</p>
              <p>No agricultural daily projection records were returned for this location.</p>
            </div>
          )}

          {hasCoordinates && !isLoading && dailyForecast.length > 0 && (
            <div className="space-y-2">
              {dailyForecast.map((day, idx) => {
                const { dayName, formattedDate } = formatDate(day.date);
                const rainPct = day.rain_chance_max_pct ?? 0;
                const precipMm = day.total_precipitation_mm ?? 0;

                return (
                  <div
                    key={`${day.date}-${idx}`}
                    className="p-3.5 rounded-2xl border border-stone-100 bg-stone-50/70 hover:bg-stone-50 transition-colors flex items-center justify-between gap-3 text-xs"
                  >
                    {/* Day & Date */}
                    <div className="w-24 sm:w-28 shrink-0">
                      <span className="font-bold text-stone-900 block text-sm">
                        {idx === 0 ? 'Today' : dayName}
                      </span>
                      <span className="text-[11px] text-stone-400 block font-medium">
                        {formattedDate}
                      </span>
                    </div>

                    {/* Rain Probability Badge */}
                    <div className="flex items-center gap-1.5 min-w-[70px] sm:min-w-[90px]">
                      <Droplets
                        className={`w-4 h-4 shrink-0 ${
                          rainPct >= 40 ? 'text-blue-600 font-bold' : 'text-stone-400'
                        }`}
                        aria-hidden="true"
                      />
                      <span
                        className={`font-mono text-xs font-semibold ${
                          rainPct >= 40 ? 'text-blue-700' : 'text-stone-600'
                        }`}
                      >
                        {rainPct}%
                      </span>
                      {precipMm > 0 && (
                        <span className="hidden sm:inline text-[10px] text-stone-400 font-mono">
                          ({precipMm}mm)
                        </span>
                      )}
                    </div>

                    {/* Temp Range (High / Low) */}
                    <div className="flex items-center gap-3 text-right font-mono text-xs shrink-0">
                      <span className="inline-flex items-center text-stone-900 font-bold">
                        <ArrowUp className="w-3 h-3 text-red-500 mr-0.5" aria-hidden="true" />
                        {day.temp_max_c != null ? `${Math.round(day.temp_max_c)}°` : '—'}
                      </span>
                      <span className="inline-flex items-center text-stone-500 font-medium">
                        <ArrowDown className="w-3 h-3 text-blue-500 mr-0.5" aria-hidden="true" />
                        {day.temp_min_c != null ? `${Math.round(day.temp_min_c)}°` : '—'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer - Fixed within panel */}
        <div className="pt-3 sm:pt-4 border-t border-stone-100 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-semibold text-xs transition-colors shadow-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {t('dashboardClose')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
