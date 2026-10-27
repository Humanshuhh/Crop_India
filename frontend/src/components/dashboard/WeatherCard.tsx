import React from 'react';
import { Link } from 'react-router-dom';
import {
  CloudSun,
  Droplets,
  Wind,
  Calendar,
  AlertTriangle,
  RotateCw,
  MapPin,
  CheckCircle2,
  ShieldAlert,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import type { WeatherState } from '../../types/dashboard.types';

interface WeatherCardProps {
  weather: WeatherState;
  onOpenForecast: () => void;
}

function getWeatherConditionText(code: number | null | undefined): string {
  if (code == null) return 'Conditions Active';
  if (code === 0) return 'Clear Sky';
  if (code === 1 || code === 2) return 'Mainly Clear / Partly Cloudy';
  if (code === 3) return 'Overcast';
  if (code >= 45 && code <= 48) return 'Foggy / Low Visibility';
  if (code >= 51 && code <= 55) return 'Light Drizzle';
  if (code >= 61 && code <= 65) return 'Rain Showers';
  if (code >= 71 && code <= 77) return 'Cold Precipitation';
  if (code >= 80 && code <= 82) return 'Scattered Showers';
  if (code >= 95) return 'Thunderstorm Warning';
  return 'Precipitation Active';
}

export const WeatherCard: React.FC<WeatherCardProps> = ({
  weather,
  onOpenForecast,
}) => {
  const { t } = useLanguage();

  const isSafeToSpray = weather.data?.current?.spray_advisory === 'SAFE_TO_SPRAY';
  const temp = weather.data?.current?.temperature_c;
  const humidity = weather.data?.current?.humidity_pct;
  const wind = weather.data?.current?.wind_speed_kmh;
  const condition = getWeatherConditionText(weather.data?.current?.weather_code);

  return (
    <div
      id="weather-section"
      className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4"
    >
      {/* Card Header */}
      <div className="flex items-center justify-between pb-3 border-b border-stone-100">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-800">
          <CloudSun className="w-4 h-4 text-emerald-600" aria-hidden="true" />
          <span>{t('dashboardWeatherToday')}</span>
        </div>

        {weather.status === 'ready' && (
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${
              isSafeToSpray
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : 'bg-amber-50 text-amber-900 border-amber-300'
            }`}
          >
            {isSafeToSpray ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
            ) : (
              <ShieldAlert className="w-3.5 h-3.5 text-amber-600" aria-hidden="true" />
            )}
            <span>{isSafeToSpray ? t('dashboardSafeToSpray') : t('dashboardAvoidSpray')}</span>
          </span>
        )}
      </div>

      {/* Card Body */}
      {weather.status === 'loading' && (
        <div className="py-8 flex flex-col items-center justify-center space-y-2 text-stone-500">
          <RotateCw className="w-6 h-6 animate-spin text-emerald-600" aria-hidden="true" />
          <p className="text-xs font-medium">Fetching agrometeorological feed...</p>
        </div>
      )}

      {weather.status === 'no_location' && (
        <div className="py-4 space-y-3">
          <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-amber-50 border border-amber-200">
            <MapPin className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-amber-950">{t('dashboardNoLocationTitle')}</h4>
              <p className="text-xs text-amber-900/90 leading-relaxed">
                {t('dashboardNoLocationDesc')}
              </p>
            </div>
          </div>
          <Link
            to="/profile"
            className="inline-flex items-center justify-center w-full px-3 py-2 rounded-xl bg-stone-900 text-white text-xs font-semibold hover:bg-stone-800 transition-colors"
          >
            {t('dashboardSetLocation')}
          </Link>
        </div>
      )}

      {weather.status === 'error' && (
        <div className="py-4 space-y-2">
          <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-900">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="space-y-0.5">
              <p className="text-xs font-bold">Weather Feed Offline</p>
              <p className="text-xs text-red-700 leading-relaxed">
                {weather.errorMessage || 'Unable to contact open weather telemetry.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {weather.status === 'ready' && weather.data && (
        <div className="space-y-4">
          {/* Main Temperature & Condition */}
          <div className="flex items-baseline justify-between gap-2">
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl sm:text-4xl font-extrabold text-stone-900 tracking-tight">
                  {temp != null ? `${Math.round(temp)}°` : '—'}
                </span>
                <span className="text-sm font-semibold text-stone-500">C</span>
              </div>
              <p className="text-xs font-medium text-stone-600 pt-0.5">{condition}</p>
            </div>

            <div className="text-right space-y-0.5">
              <span className="text-[11px] font-semibold text-stone-400 block uppercase">
                Rain (12h)
              </span>
              <span className="text-sm font-bold text-stone-800 font-mono">
                {weather.data.current.next_12h_rain_chance_pct}%
              </span>
            </div>
          </div>

          {/* Secondary Telemetry Grid */}
          <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-stone-100 text-xs">
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-stone-50 border border-stone-100">
              <Droplets className="w-4 h-4 text-blue-600 shrink-0" aria-hidden="true" />
              <div>
                <span className="text-stone-400 text-[10px] block uppercase font-medium">Humidity</span>
                <span className="font-bold text-stone-800 font-mono">
                  {humidity != null ? `${humidity}%` : '—'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-stone-50 border border-stone-100">
              <Wind className="w-4 h-4 text-teal-600 shrink-0" aria-hidden="true" />
              <div>
                <span className="text-stone-400 text-[10px] block uppercase font-medium">Wind</span>
                <span className="font-bold text-stone-800 font-mono">
                  {wind != null ? `${Math.round(wind)} km/h` : '—'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Card Action */}
      <div className="pt-2 border-t border-stone-100">
        <button
          type="button"
          onClick={onOpenForecast}
          disabled={weather.status !== 'ready'}
          className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-50 hover:border-stone-400 active:bg-stone-100 font-semibold text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[40px]"
        >
          <Calendar className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
          <span>{t('dashboardSevenDayForecast')}</span>
        </button>
      </div>
    </div>
  );
};
