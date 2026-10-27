import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  MapPin,
  FileSpreadsheet,
  Leaf,
  CloudSun,
  Satellite,
  Sparkles,
  HelpCircle,
  Layers,
  RotateCw,
  Info,
  CheckCircle2,
  Thermometer,
  CloudRain,
  Wind,
  Shield,
  ShieldAlert,
  Droplets,
  Volume2,
} from 'lucide-react';
import { fetchWeatherForecast } from '../services/telemetry';
import type { WeatherForecastData } from '../types/telemetry.types';
import { useLanguage } from '../context/LanguageContext';
import { useVoice } from '../context/VoiceContext';
import { evaluateSoil } from '../services/soil';
import type { SoilHealthInput } from '../types/soil.types';
import type { NormalizedError } from '../types/api.types';
import { VoiceReaderButton } from '../components/common/VoiceReaderButton';
import { ErrorMessage } from '../components/common/ErrorMessage';
import { useResultCache } from '../context/ResultCacheContext';
import { useAuth } from '../context/AuthContext';
import {
  CachedWeather,
  getSessionWeatherCache,
  setSessionWeatherCache,
  isCoordinateMatch,
  WEATHER_CACHE_TTL_MS,
} from '../context/ResultCacheContext';
import { getSavedFarmerProfile } from '../services/farmer';

export const KhetSwasthya: React.FC = () => {
  const { t, language } = useLanguage();
  const { isSpeaking, activeContentId, currentSentenceIndex } = useVoice();
  const { soilCache, setSoilCache } = useResultCache();
  const { user } = useAuth();

  const farmerId = user
    ? (user.uid.startsWith('FARM_') || user.uid.startsWith('KS-')
        ? user.uid
        : `KS-${user.uid.slice(0, 8).toUpperCase()}`)
    : undefined;

  const coords = soilCache.coords;
  const inputOrigin = soilCache.inputOrigin;
  const shcValues = soilCache.shcValues;
  const report = soilCache.report;
  const submittedData = soilCache.submittedData;

  const setCoords = (val: React.SetStateAction<{ latitude: string; longitude: string }>) =>
    setSoilCache((p) => ({
      ...p,
      coords: typeof val === 'function' ? (val as any)(p.coords) : val,
    }));

  const setInputOrigin = (val: React.SetStateAction<'OFFICIAL_SHC' | 'FARMER_ESTIMATE'>) =>
    setSoilCache((p) => ({
      ...p,
      inputOrigin: typeof val === 'function' ? (val as any)(p.inputOrigin) : val,
    }));

  const setShcValues = (
    val: React.SetStateAction<{
      ph: string;
      soc: string;
      n: string;
      p: string;
      k: string;
      zn: string;
    }>
  ) =>
    setSoilCache((p) => ({
      ...p,
      shcValues: typeof val === 'function' ? (val as any)(p.shcValues) : val,
    }));

  // 1. Auto-populate coordinates from saved farmer profile if coordinates are currently empty
  useEffect(() => {
    const hasCurrentCoords = Boolean(coords.latitude.trim() && coords.longitude.trim());
    if (hasCurrentCoords) return;

    const savedProfile = getSavedFarmerProfile(user?.uid || null);
    if (!savedProfile?.latitude || !savedProfile?.longitude) return;

    const latNum = parseFloat(String(savedProfile.latitude).trim());
    const lonNum = parseFloat(String(savedProfile.longitude).trim());

    if (
      !isNaN(latNum) &&
      !isNaN(lonNum) &&
      Number.isFinite(latNum) &&
      Number.isFinite(lonNum) &&
      latNum >= -90.0 &&
      latNum <= 90.0 &&
      lonNum >= -180.0 &&
      lonNum <= 180.0
    ) {
      setCoords({
        latitude: String(savedProfile.latitude).trim(),
        longitude: String(savedProfile.longitude).trim(),
      });
    }
  }, [user?.uid, coords.latitude, coords.longitude]);

  // Validated numeric coordinates
  const parsedCoords = useMemo(() => {
    const latStr = coords.latitude.trim();
    const lonStr = coords.longitude.trim();
    if (!latStr || !lonStr) return null;

    const lat = parseFloat(latStr);
    const lon = parseFloat(lonStr);

    if (
      !isNaN(lat) &&
      !isNaN(lon) &&
      Number.isFinite(lat) &&
      Number.isFinite(lon) &&
      lat >= -90.0 &&
      lat <= 90.0 &&
      lon >= -180.0 &&
      lon <= 180.0
    ) {
      return { lat, lon };
    }
    return null;
  }, [coords.latitude, coords.longitude]);

  // Active cached weather for current user and current coordinates
  const activeCache = useMemo<CachedWeather | null>(() => {
    if (!parsedCoords) return null;
    const userScope = user?.uid || null;

    // Check in-memory shared cache first
    const memCache = soilCache.weatherCache;
    if (
      memCache &&
      memCache.userScope === userScope &&
      isCoordinateMatch(memCache.latitude, memCache.longitude, parsedCoords.lat, parsedCoords.lon)
    ) {
      return memCache;
    }

    // Fall back to session storage cache
    const sessCache = getSessionWeatherCache(userScope);
    if (
      sessCache &&
      isCoordinateMatch(sessCache.latitude, sessCache.longitude, parsedCoords.lat, parsedCoords.lon)
    ) {
      return sessCache;
    }

    return null;
  }, [parsedCoords, user?.uid, soilCache.weatherCache]);

  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Initialize weatherData with cached data if available for the active coordinates
  const [weatherData, setWeatherData] = useState<WeatherForecastData | null>(() => activeCache?.data || null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const currentWeather = weatherData?.current;
  const weatherDataRef = useRef(weatherData);
  weatherDataRef.current = weatherData;

  // In-flight request tracking and mount lifecycle
  const inFlightRef = useRef<{ lat: number; lon: number; reqId: number } | null>(null);
  const reqIdRef = useRef(0);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const isSubmitting = soilCache.status === 'loading';
  const error = soilCache.error;

  const setSoilCacheProp = <K extends keyof typeof soilCache>(key: K, val: typeof soilCache[K]) =>
    setSoilCache((p) => ({ ...p, [key]: val }));

  const setError = (val: NormalizedError | null) => setSoilCacheProp('error', val);
  const setStatus = (val: 'idle' | 'loading' | 'success' | 'error') => setSoilCacheProp('status', val);

  const loadWeather = useCallback(
    async (lat: number, lon: number, options?: { force?: boolean; isBackground?: boolean }) => {
      if (
        !Number.isFinite(lat) ||
        !Number.isFinite(lon) ||
        lat < -90 ||
        lat > 90 ||
        lon < -180 ||
        lon > 180
      ) {
        setWeatherData(null);
        setWeatherError('Please enter valid latitude and longitude values.');
        return;
      }

      // In-flight deduplication: prevent redundant concurrent requests for identical coordinates
      if (
        !options?.force &&
        inFlightRef.current &&
        isCoordinateMatch(inFlightRef.current.lat, inFlightRef.current.lon, lat, lon)
      ) {
        return;
      }

      const reqId = ++reqIdRef.current;
      inFlightRef.current = { lat, lon, reqId };

      setWeatherLoading(true);
      setWeatherError(null);

      // Only clear displayed data if there is no valid cache for these coordinates
      const currentW = weatherDataRef.current;
      if (!options?.isBackground && (!currentW || !isCoordinateMatch(currentW.latitude, currentW.longitude, lat, lon))) {
        setWeatherData(null);
      }

      try {
        const response = await fetchWeatherForecast(lat, lon);

        // Abort if unmounted or superseded by a newer request
        if (!isMountedRef.current || reqIdRef.current !== reqId) return;

        if (response.status !== 'success' || !response.data) {
          throw new Error('Weather forecast is unavailable for this location.');
        }

        const now = Date.now();
        const userScope = user?.uid || null;
        const newCache: CachedWeather = {
          data: response.data,
          latitude: lat,
          longitude: lon,
          timestamp: now,
          userScope,
        };

        setWeatherData(response.data);
        setWeatherError(null);

        // Persist to shared context cache & sessionStorage
        setSoilCache((prev) => ({ ...prev, weatherCache: newCache }));
        setSessionWeatherCache(newCache);
      } catch (err: unknown) {
        if (!isMountedRef.current || reqIdRef.current !== reqId) return;

        const message =
          typeof err === 'object' &&
          err !== null &&
          'message' in err &&
          typeof err.message === 'string'
            ? err.message
            : 'Weather forecast is currently unavailable. Please try again.';

        setWeatherError(message);
      } finally {
        if (isMountedRef.current && reqIdRef.current === reqId) {
          inFlightRef.current = null;
          setWeatherLoading(false);
        }
      }
    },
    [user?.uid, setSoilCache]
  );

  // 2. Automatic Weather Loading Effect
  useEffect(() => {
    if (!parsedCoords) {
      setWeatherData(null);
      setWeatherError(null);
      return;
    }

    const { lat, lon } = parsedCoords;

    // Check if we have matching cache for these coordinates
    if (activeCache) {
      if (!weatherData || !isCoordinateMatch(weatherData.latitude, weatherData.longitude, lat, lon)) {
        setWeatherData(activeCache.data);
      }

      const isFresh = Date.now() - activeCache.timestamp < WEATHER_CACHE_TTL_MS;
      if (isFresh) {
        // Cache is fresh (< 15 min): render immediately without issuing network request
        return;
      }

      // Cache is expired (>= 15 min): revalidate in background while displaying cached forecast
      void loadWeather(lat, lon, { isBackground: true });
      return;
    }

    // No cache for these coordinates: fetch automatically
    void loadWeather(lat, lon, { isBackground: false });
  }, [parsedCoords, activeCache, loadWeather]);

  const handleFetchWeather = () => {
    if (!parsedCoords) {
      setWeatherError('Please enter valid latitude and longitude values.');
      setWeatherData(null);
      return;
    }

    // Manual click explicitly forces a fresh request bypassing the fresh cache
    void loadWeather(parsedCoords.lat, parsedCoords.lon, { force: true });
  };

  // GPS Device Location Handler: user-initiated only
  const handleDetectLocation = () => {
    setGpsError(null);
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser.');
      return;
    }

    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const latitude = pos.coords.latitude;
        const longitude = pos.coords.longitude;

        setGpsLoading(false);

        // Update coordinate input state without altering saved farm profile
        setCoords({
          latitude: latitude.toFixed(4),
          longitude: longitude.toFixed(4),
        });
      },
      (err) => {
        setGpsLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          setGpsError('Location access was denied. You can manually enter your farm coordinates.');
        } else {
          setGpsError('Unable to detect location. Please type coordinates manually.');
        }
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleInputChange = (field: keyof typeof shcValues, val: string) => {
    setShcValues((prev) => ({ ...prev, [field]: val }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setError(null);

    const lat = parseFloat(coords.latitude);
    const lon = parseFloat(coords.longitude);

    if (isNaN(lat) || lat < -90 || lat > 90) {
      setError({
        category: 'VALIDATION_ERROR',
        userMessage: 'Please enter a valid latitude between -90 and 90.',
      });
      setStatus('error');
      return;
    }

    if (isNaN(lon) || lon < -180 || lon > 180) {
      setError({
        category: 'VALIDATION_ERROR',
        userMessage: 'Please enter a valid longitude between -180 and 180.',
      });
      setStatus('error');
      return;
    }

    const payload: SoilHealthInput = {
      latitude: lat,
      longitude: lon,
      ph: shcValues.ph ? parseFloat(shcValues.ph) : undefined,
      organic_carbon_percent: shcValues.soc ? parseFloat(shcValues.soc) : undefined,
      nitrogen_kg_ha: shcValues.n ? parseFloat(shcValues.n) : undefined,
      phosphorus_kg_ha: shcValues.p ? parseFloat(shcValues.p) : undefined,
      potassium_kg_ha: shcValues.k ? parseFloat(shcValues.k) : undefined,
      zinc_ppm: shcValues.zn ? parseFloat(shcValues.zn) : undefined,
      target_language: language,
      farmer_id: farmerId,
    };

    setStatus('loading');
    try {
      const res = await evaluateSoil(payload, language);
      setSoilCache((p) => ({
        ...p,
        report: res,
        submittedData: {
          provenance: inputOrigin,
          coords: { ...coords },
          values: { ...shcValues },
        },
        status: 'success',
        error: null,
      }));
      setTimeout(() => {
        document.getElementById('soil-report-section')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err) {
      setSoilCache((p) => ({ ...p, status: 'error', error: err as NormalizedError }));
    }
  };

  const textToRead = report
    ? report.spoken_summary || report.soil_health_assessment || ''
    : '';

  const reportSentences = report
    ? textToRead
        .split(/(?<=[.?!।\n])\s+/)
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  const isVoiceReadingThisReport = isSpeaking && activeContentId === 'soil-advisory-report';

  return (
    <div className="w-full max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10 space-y-10 animate-fadeIn">
      {/* 1. Page Introduction */}
      <section aria-label="Page Introduction" className="space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
          <Layers className="w-4 h-4 text-emerald-600" aria-hidden="true" />
          <span>Regenerative Soil Assessment</span>
        </div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-stone-900 tracking-tight">
          {t('khetTitle')}
        </h1>
        <p className="text-stone-600 text-sm sm:text-base leading-relaxed max-w-3xl">
          {t('khetSubtitle')}
        </p>
      </section>

      {/* Main Soil Form */}
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* 2. Farm Location Card */}
        <section
          aria-label="Farm Location"
          className="rounded-3xl border border-stone-200 bg-white p-6 sm:p-8 shadow-sm space-y-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-100">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <MapPin className="w-5 h-5 text-emerald-700" aria-hidden="true" />
                </span>
                <h2 className="text-lg sm:text-xl font-bold text-stone-900">
                  {t('locationSectionTitle')}
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-stone-500">
                {t('locationHelp')}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 self-start sm:self-auto shrink-0">
              {coords.latitude && coords.longitude ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Location Configured</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                  <MapPin className="w-3.5 h-3.5 text-amber-600" />
                  <span>Coordinates Required</span>
                </span>
              )}

              <button
                type="button"
                onClick={handleDetectLocation}
                disabled={gpsLoading}
                className="inline-flex items-center justify-center gap-2 min-h-11 px-4 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs sm:text-sm font-semibold border border-stone-300 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 shrink-0 disabled:opacity-60 cursor-pointer"
              >
                <MapPin className={`w-4 h-4 text-emerald-700 ${gpsLoading ? 'animate-bounce' : ''}`} />
                <span>{gpsLoading ? t('locationFetching') : t('useMyLocationBtn')}</span>
              </button>
            </div>
          </div>

          {gpsError && (
            <div
              role="alert"
              className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs sm:text-sm flex items-start gap-2.5"
            >
              <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <span>{gpsError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label htmlFor="lat-input" className="block text-xs font-bold text-stone-700">
                {t('latitudeLabel')} <span className="text-stone-400 font-normal">(Decimal Degrees)</span>
              </label>
              <input
                id="lat-input"
                type="number"
                step="any"
                required
                value={coords.latitude}
                onChange={(e) => setCoords((prev) => ({ ...prev, latitude: e.target.value }))}
                className="w-full h-12 px-4 rounded-xl border border-stone-300 bg-stone-50 text-stone-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors"
                placeholder="e.g. 26.8467"
              />
              <p className="text-[11px] text-stone-500">
                Valid range: -90.0° to +90.0° (Indian latitude approx. 8° to 37° N)
              </p>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="lon-input" className="block text-xs font-bold text-stone-700">
                {t('longitudeLabel')} <span className="text-stone-400 font-normal">(Decimal Degrees)</span>
              </label>
              <input
                id="lon-input"
                type="number"
                step="any"
                required
                value={coords.longitude}
                onChange={(e) => setCoords((prev) => ({ ...prev, longitude: e.target.value }))}
                className="w-full h-12 px-4 rounded-xl border border-stone-300 bg-stone-50 text-stone-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors"
                placeholder="e.g. 80.9462"
              />
              <p className="text-[11px] text-stone-500">
                Valid range: -180.0° to +180.0° (Indian longitude approx. 68° to 97° E)
              </p>
            </div>
          </div>
        </section>

        {/* 3. Soil Health Card Inputs Card */}
        <section
          aria-label="Soil Health Measurements"
          className="rounded-3xl border border-stone-200 bg-white p-6 sm:p-8 shadow-sm space-y-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-100">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-700" aria-hidden="true" />
                </span>
                <h2 className="text-lg sm:text-xl font-bold text-stone-900">
                  {t('shcSectionTitle')}
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-stone-500">
                {t('shcHelp')}
              </p>
            </div>

            {/* Provenance Selector (Segmented Control) */}
            <div
              className="inline-flex p-1 bg-stone-100 rounded-2xl border border-stone-200/80 self-start sm:self-auto shrink-0"
              role="radiogroup"
              aria-label="Soil Data Source"
            >
              <button
                type="button"
                role="radio"
                aria-checked={inputOrigin === 'OFFICIAL_SHC'}
                onClick={() => setInputOrigin('OFFICIAL_SHC')}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  inputOrigin === 'OFFICIAL_SHC'
                    ? 'bg-white text-emerald-800 shadow-sm border border-stone-200/80 font-bold'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Shield className="w-3.5 h-3.5 text-emerald-600" />
                <span>Official Soil Health Card</span>
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={inputOrigin === 'FARMER_ESTIMATE'}
                onClick={() => setInputOrigin('FARMER_ESTIMATE')}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  inputOrigin === 'FARMER_ESTIMATE'
                    ? 'bg-white text-emerald-800 shadow-sm border border-stone-200/80 font-bold'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>Farmer Estimate</span>
              </button>
            </div>
          </div>

          {/* Source status indicator */}
          <div className="text-xs text-stone-600 bg-stone-50 border border-stone-200/80 px-4 py-2.5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>
                Recorded Provenance:{' '}
                <strong className="text-stone-900 font-semibold">
                  {inputOrigin === 'OFFICIAL_SHC'
                    ? 'Official Soil Health Card / Lab Test'
                    : 'Farmer Self-Assessment / Estimated'}
                </strong>
              </span>
            </div>
            <span className="text-[11px] text-stone-500">
              {inputOrigin === 'OFFICIAL_SHC'
                ? 'Calibrated against ICAR Soil Health Card benchmarks'
                : 'Estimated values for initial regenerative screening'}
            </span>
          </div>

          {/* 6 Measurement inputs in a clean 3-col grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* pH */}
            <div className="space-y-1.5">
              <label htmlFor="ph-input" className="block text-xs font-bold text-stone-700">
                Soil pH <span className="text-stone-400 font-normal">(1.0 – 14.0)</span>
              </label>
              <input
                id="ph-input"
                type="number"
                step="0.1"
                min="1"
                max="14"
                value={shcValues.ph}
                onChange={(e) => handleInputChange('ph', e.target.value)}
                className="w-full h-12 px-4 rounded-xl border border-stone-300 bg-stone-50 text-stone-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors"
                placeholder="e.g. 7.2"
              />
              <p className="text-[11px] text-stone-500 leading-snug">
                Reference: 6.5–7.5 neutral range; varies by crop and soil type
              </p>
            </div>

            {/* SOC */}
            <div className="space-y-1.5">
              <label htmlFor="soc-input" className="block text-xs font-bold text-stone-700">
                Soil Organic Carbon — SOC <span className="text-stone-400 font-normal">(%)</span>
              </label>
              <input
                id="soc-input"
                type="number"
                step="0.01"
                min="0"
                max="10"
                value={shcValues.soc}
                onChange={(e) => handleInputChange('soc', e.target.value)}
                className="w-full h-12 px-4 rounded-xl border border-stone-300 bg-stone-50 text-stone-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors"
                placeholder="e.g. 0.42"
              />
              <p className="text-[11px] text-stone-500 leading-snug">
                Threshold: &lt; 0.50% indicates critical depletion; target &gt; 0.75%
              </p>
            </div>

            {/* Nitrogen */}
            <div className="space-y-1.5">
              <label htmlFor="n-input" className="block text-xs font-bold text-stone-700">
                Available Nitrogen — N <span className="text-stone-400 font-normal">(kg/ha)</span>
              </label>
              <input
                id="n-input"
                type="number"
                step="1"
                min="0"
                value={shcValues.n}
                onChange={(e) => handleInputChange('n', e.target.value)}
                className="w-full h-12 px-4 rounded-xl border border-stone-300 bg-stone-50 text-stone-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors"
                placeholder="e.g. 210"
              />
              <p className="text-[11px] text-stone-500 leading-snug">
                Reference: 280–560 kg/ha for medium rating; varies by crop
              </p>
            </div>

            {/* Phosphorus */}
            <div className="space-y-1.5">
              <label htmlFor="p-input" className="block text-xs font-bold text-stone-700">
                Available Phosphorus — P <span className="text-stone-400 font-normal">(kg/ha)</span>
              </label>
              <input
                id="p-input"
                type="number"
                step="0.1"
                min="0"
                value={shcValues.p}
                onChange={(e) => handleInputChange('p', e.target.value)}
                className="w-full h-12 px-4 rounded-xl border border-stone-300 bg-stone-50 text-stone-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors"
                placeholder="e.g. 14"
              />
              <p className="text-[11px] text-stone-500 leading-snug">
                Reference: 10–25 kg/ha for medium rating; depends on soil fixation
              </p>
            </div>

            {/* Potassium */}
            <div className="space-y-1.5">
              <label htmlFor="k-input" className="block text-xs font-bold text-stone-700">
                Available Potassium — K <span className="text-stone-400 font-normal">(kg/ha)</span>
              </label>
              <input
                id="k-input"
                type="number"
                step="1"
                min="0"
                value={shcValues.k}
                onChange={(e) => handleInputChange('k', e.target.value)}
                className="w-full h-12 px-4 rounded-xl border border-stone-300 bg-stone-50 text-stone-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors"
                placeholder="e.g. 160"
              />
              <p className="text-[11px] text-stone-500 leading-snug">
                Reference: 110–280 kg/ha for medium rating; depends on texture
              </p>
            </div>

            {/* Zinc */}
            <div className="space-y-1.5">
              <label htmlFor="zn-input" className="block text-xs font-bold text-stone-700">
                Available Zinc — Zn <span className="text-stone-400 font-normal">(ppm)</span>
              </label>
              <input
                id="zn-input"
                type="number"
                step="0.01"
                min="0"
                value={shcValues.zn}
                onChange={(e) => handleInputChange('zn', e.target.value)}
                className="w-full h-12 px-4 rounded-xl border border-stone-300 bg-stone-50 text-stone-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors"
                placeholder="e.g. 0.48"
              />
              <p className="text-[11px] text-stone-500 leading-snug">
                Threshold: &lt; 0.60 ppm indicates micronutrient deficiency
              </p>
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <ErrorMessage
              error={error}
              onRetry={() => handleSubmit({ preventDefault: () => {} } as React.FormEvent)}
            />
          )}

          {/* Action Footer: Generate Soil Advisory */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-stone-100">
            <div className="flex items-center gap-2 text-xs text-stone-500">
              <Shield className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Non-chemical, regenerative biological remediation protocols</span>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto min-h-12 px-8 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm sm:text-base shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 flex items-center justify-center gap-2.5 disabled:opacity-60 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <RotateCw className="w-5 h-5 animate-spin" />
                  <span>{t('evaluatingSoil')}</span>
                </>
              ) : (
                <>
                  <Leaf className="w-5 h-5" />
                  <span>{t('evaluateSoilBtn')}</span>
                </>
              )}
            </button>
          </div>
        </section>
      </form>

      {/* 4. Real Diagnostic & Regenerative Advisory Report (Scroll Target) */}
      {report && (
        <section
          id="soil-report-section"
          className="rounded-3xl border-2 border-emerald-500/80 bg-white p-6 sm:p-8 md:p-10 shadow-lg space-y-8 animate-fadeIn"
          aria-label="Soil Advisory Results"
        >
          {/* Result Header with Voice Button & Metadata */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-6">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 uppercase tracking-wider">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Generated Advisory Report</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-stone-900">
                {t('soilResultTitle')}
              </h2>
              <div className="flex flex-wrap items-center gap-2 text-xs text-stone-600 pt-1">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-700 font-medium">
                  Zone: <strong className="text-stone-900 font-semibold">Farmer-provided location</strong>
                </span>
                <span>•</span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-medium border border-emerald-200">
                  Data: <strong className="text-emerald-950 font-semibold">
                    {inputOrigin === 'OFFICIAL_SHC'
                      ? 'Official Soil Health Card'
                      : 'Farmer Self-Assessment'}
                  </strong>
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:items-end gap-2 shrink-0">
              <VoiceReaderButton
                textToRead={textToRead}
                contentId="soil-advisory-report"
                sentences={reportSentences}
                label={t('voiceReadAloud')}
              />
            </div>
          </div>

          {/* Spoken Script Box with Sentence-level visual tracking */}
          {report.spoken_summary && (
            <div className="rounded-2xl border border-stone-200 p-5 bg-stone-50 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5 text-emerald-700" />
                  <span>{t('spokenAdvisoryTitle')}</span>
                </h3>
                {isVoiceReadingThisReport && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                    <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                    Speaking Now
                  </span>
                )}
              </div>
              <p className="text-sm text-stone-800 italic leading-relaxed">
                {isVoiceReadingThisReport ? (
                  reportSentences.map((sentence, idx) => (
                    <span
                      key={idx}
                      className={`transition-all duration-150 ${
                        currentSentenceIndex === idx
                          ? 'bg-amber-200 text-stone-950 px-1 py-0.5 rounded-sm font-semibold not-italic shadow-2xs'
                          : ''
                      }`}
                    >
                      {sentence}{' '}
                    </span>
                  ))
                ) : (
                  `"${report.spoken_summary}"`
                )}
              </p>
            </div>
          )}

          {/* Section 1: Soil Advisory / Condition & Summary */}
          <div className="space-y-2.5">
            <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-700" />
              <span>Soil Condition & Advisory</span>
            </h3>

            <div className="text-base text-stone-800 leading-relaxed bg-emerald-50/50 p-5 rounded-2xl border border-emerald-200 shadow-2xs">
              <p className="font-medium text-stone-900">
                {report.soil_health_assessment || ''}
              </p>
            </div>
          </div>

          {/* Section 2: Immediate Biological Action (Amendments) */}
          {report.biological_amendments && report.biological_amendments.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
                <Leaf className="w-5 h-5 text-emerald-700" />
                <span>{t('biologicalAmendmentsTitle')} (Immediate Action)</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {report.biological_amendments.map((action, idx) => (
                  <div
                    key={idx}
                    className="p-5 rounded-2xl border border-emerald-200 bg-white shadow-2xs hover:border-emerald-400 transition-colors space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm sm:text-base text-emerald-950 flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-emerald-700 text-white text-xs font-bold flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <span>{action.name}</span>
                      </span>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                        Organic
                      </span>
                    </div>

                    <div className="text-xs font-semibold text-emerald-900 pl-8">
                      Target Deficiency: {action.target_deficiency}
                    </div>

                    <div className="text-xs sm:text-sm text-stone-700 pl-8 space-y-1">
                      <div>
                        <strong className="text-stone-900">Preparation:</strong>{' '}
                        {action.preparation_or_sourcing}
                      </div>
                      <div>
                        <strong className="text-stone-900">Dosage & Application:</strong>{' '}
                        {action.dosage_and_application}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 3: Regenerative Crop Rotation Recommendations */}
          {report.regenerative_crop_rotations && report.regenerative_crop_rotations.length > 0 && (
            <div className="space-y-3 pt-2">
              <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
                <RotateCw className="w-4 h-4 text-emerald-700" />
                <span>{t('cropRotationTitle')} (Regenerative Cycle)</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs sm:text-sm text-stone-700">
                {report.regenerative_crop_rotations.map((rec, i) => (
                  <div
                    key={i}
                    className="rounded-2xl bg-stone-50 border border-stone-200 p-4 space-y-2 shadow-2xs"
                  >
                    <div className="font-bold text-stone-900 text-sm flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 border-b border-stone-200 pb-1.5">
                      <span>{rec.season}</span>
                      <span className="text-emerald-800 font-semibold">{rec.recommended_crop}</span>
                    </div>

                    <div className="text-xs text-stone-600">
                      <span className="font-semibold text-stone-800">Role:</span> {rec.ecological_role}
                    </div>

                    <div className="text-xs text-stone-600">
                      <span className="font-semibold text-stone-800">Water:</span> {rec.water_requirement}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 4: Cultural Water Practices & Agronomic Rationale */}
          {report.cultural_water_practices && report.cultural_water_practices.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-stone-100">
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-emerald-700" />
                <span>Agronomic Rationale & Water Conservation</span>
              </h3>
              <ul className="space-y-2 text-xs sm:text-sm text-stone-700 bg-stone-50 p-4 rounded-2xl border border-stone-200">
                {report.cultural_water_practices.map((practice, idx) => (
                  <li key={idx} className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{practice}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Section 5: Technical Soil Parameters (Supporting Parameters) */}
          {submittedData && (
            <div className="rounded-2xl border border-stone-200 bg-stone-50/80 p-5 space-y-3 pt-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-200/80 pb-3">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-stone-600" />
                  <span className="text-xs font-bold uppercase tracking-wider text-stone-600">
                    Supporting Laboratory & Diagnostic Parameters
                  </span>
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white border border-stone-300 text-stone-800 shadow-2xs">
                  <Shield className="w-3.5 h-3.5 text-emerald-700" />
                  <span>
                    Provenance:{' '}
                    <strong className="text-stone-950 font-bold">
                      {submittedData.provenance === 'OFFICIAL_SHC'
                        ? 'Official Soil Health Card / Lab Test'
                        : 'Farmer Self-Assessment / Estimated'}
                    </strong>
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 text-xs">
                <div className="bg-white p-3 rounded-xl border border-stone-200 shadow-2xs">
                  <span className="text-stone-500 block text-[11px]">Soil pH</span>
                  <span className="font-bold text-stone-900 text-sm">{submittedData.values.ph || '—'}</span>
                </div>
                <div className="bg-white p-3 rounded-xl border border-stone-200 shadow-2xs">
                  <span className="text-stone-500 block text-[11px]">Organic Carbon</span>
                  <span className="font-bold text-stone-900 text-sm">
                    {submittedData.values.soc ? `${submittedData.values.soc}%` : '—'}
                  </span>
                </div>
                <div className="bg-white p-3 rounded-xl border border-stone-200 shadow-2xs">
                  <span className="text-stone-500 block text-[11px]">Nitrogen (N)</span>
                  <span className="font-bold text-stone-900 text-sm">
                    {submittedData.values.n ? `${submittedData.values.n} kg/ha` : '—'}
                  </span>
                </div>
                <div className="bg-white p-3 rounded-xl border border-stone-200 shadow-2xs">
                  <span className="text-stone-500 block text-[11px]">Phosphorus (P)</span>
                  <span className="font-bold text-stone-900 text-sm">
                    {submittedData.values.p ? `${submittedData.values.p} kg/ha` : '—'}
                  </span>
                </div>
                <div className="bg-white p-3 rounded-xl border border-stone-200 shadow-2xs">
                  <span className="text-stone-500 block text-[11px]">Potassium (K)</span>
                  <span className="font-bold text-stone-900 text-sm">
                    {submittedData.values.k ? `${submittedData.values.k} kg/ha` : '—'}
                  </span>
                </div>
                <div className="bg-white p-3 rounded-xl border border-stone-200 shadow-2xs">
                  <span className="text-stone-500 block text-[11px]">Zinc (Zn)</span>
                  <span className="font-bold text-stone-900 text-sm">
                    {submittedData.values.zn ? `${submittedData.values.zn} ppm` : '—'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Attribution & AI Disclaimer */}
          <div className="pt-6 border-t border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-stone-500">
            <div>
              <strong>{t('sourceAttribution')}:</strong> Kisan Regenerative Agronomy Engine
            </div>
            <div className="text-stone-400 italic text-[11px] max-w-xl text-left sm:text-right">
              {t('aiDisclaimer')}
            </div>
          </div>
        </section>
      )}

      {/* 5. Environmental Telemetry Section (Weather & Sentinel-2) */}
      <section aria-label="Environmental Telemetry Connections" className="space-y-6 pt-4 border-t border-stone-200">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-stone-100 text-stone-700 text-xs font-semibold">
            <Satellite className="w-3.5 h-3.5 text-emerald-600" />
            <span>Environmental Telemetry</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-stone-900 tracking-tight">
            Field Environmental Telemetry Connections
          </h2>
          <p className="text-xs sm:text-sm text-stone-500">
            Live agrometeorological forecast and satellite remote sensing specifications. In accordance with our zero-fabricated-data policy, placeholder numbers are never displayed until live APIs are connected.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          {/* Panel A: Field Weather & 7-Day Outlook */}
          <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm space-y-5 flex flex-col justify-between">
            <div className="space-y-4">
              {/* Panel Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100">
                <div className="flex items-center gap-3">
                  <span className="p-2.5 rounded-2xl bg-amber-50 text-amber-800 border border-amber-200 shrink-0">
                    <CloudSun className="w-5 h-5" />
                  </span>
                  <div>
                    <h3 className="font-bold text-stone-900 text-base">
                      {t('weatherSectionTitle')}
                    </h3>
                    <span className="text-xs text-stone-500 block">
                      Target Feed: IMD / Agrometeorological Grid API
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleFetchWeather}
                  disabled={weatherLoading}
                  className="inline-flex shrink-0 whitespace-nowrap items-center justify-center rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer self-start sm:self-auto"
                >
                  {weatherLoading ? t('weatherFetchLoading') : t('weatherFetchButton')}
                </button>
              </div>

              {/* Weather Error Alert */}
              {weatherError && (
                <div
                  role="alert"
                  className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs sm:text-sm text-rose-800 flex items-start gap-2.5"
                >
                  <Info className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{weatherError}</span>
                </div>
              )}

              {/* Weather Data Display or Clean Empty State */}
              {weatherLoading && !weatherData ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-3 text-stone-500">
                  <RotateCw className="w-8 h-8 animate-spin text-emerald-600" aria-hidden="true" />
                  <p className="text-sm font-medium text-stone-700">{t('weatherStatusLoading')}</p>
                  <p className="text-xs text-stone-400">Fetching agrometeorological forecast for coordinates...</p>
                </div>
              ) : weatherData ? (
                <div className="space-y-4">
                  {/* Current Conditions Metrics */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 rounded-2xl bg-stone-50 border border-stone-200 text-center space-y-1">
                      <Thermometer className="w-4 h-4 text-emerald-700 mx-auto" />
                      <span className="text-[11px] font-semibold text-stone-600 block">
                        Temperature
                      </span>
                      <span className="text-sm font-bold text-stone-900 block">
                        {currentWeather?.temperature_c == null
                          ? '—'
                          : `${currentWeather.temperature_c} °C`}
                      </span>
                    </div>

                    <div className="p-3 rounded-2xl bg-stone-50 border border-stone-200 text-center space-y-1">
                      <CloudRain className="w-4 h-4 text-sky-600 mx-auto" />
                      <span className="text-[11px] font-semibold text-stone-600 block">
                        Rain Chance
                      </span>
                      <span className="text-sm font-bold text-stone-900 block">
                        {currentWeather?.next_12h_rain_chance_pct == null
                          ? '—'
                          : `${currentWeather.next_12h_rain_chance_pct}%`}
                      </span>
                    </div>

                    <div className="p-3 rounded-2xl bg-stone-50 border border-stone-200 text-center space-y-1">
                      <Droplets className="w-4 h-4 text-blue-600 mx-auto" />
                      <span className="text-[11px] font-semibold text-stone-600 block">
                        Humidity
                      </span>
                      <span className="text-sm font-bold text-stone-900 block">
                        {currentWeather?.humidity_pct == null
                          ? '—'
                          : `${currentWeather.humidity_pct}%`}
                      </span>
                    </div>

                    <div className="p-3 rounded-2xl bg-stone-50 border border-stone-200 text-center space-y-1">
                      <Wind className="w-4 h-4 text-teal-600 mx-auto" />
                      <span className="text-[11px] font-semibold text-stone-600 block">
                        Wind Speed
                      </span>
                      <span className="text-sm font-bold text-stone-900 block">
                        {currentWeather?.wind_speed_kmh == null
                          ? '—'
                          : `${currentWeather.wind_speed_kmh} km/h`}
                      </span>
                    </div>
                  </div>

                  {/* 7-Day Outlook Cards */}
                  {weatherData.daily_forecast?.length > 0 && (
                    <div className="space-y-2.5 pt-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                          7-Day Forecast & Spray Advisory
                        </span>
                        <span className="text-xs text-stone-500">
                          Thermal Range & Rain
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        {weatherData.daily_forecast.slice(0, 7).map((day, idx) => {
                          const date = new Date(`${day.date}T00:00:00`);
                          const dayLabel = Number.isNaN(date.getTime())
                            ? day.date
                            : date.toLocaleDateString(undefined, {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                              });

                          return (
                            <div
                              key={day.date || idx}
                              className="rounded-2xl border border-stone-200 bg-stone-50/70 p-2.5 text-center space-y-1.5 hover:border-stone-300 transition-colors"
                            >
                              <span className="text-[11px] font-bold text-stone-800 block truncate">
                                {dayLabel}
                              </span>

                              <div className="whitespace-nowrap text-xs sm:text-sm font-extrabold text-stone-900">
                                {day.temp_max_c == null ? '—' : `${day.temp_max_c}°`}
                                <span className="text-stone-400 font-normal"> / </span>
                                <span className="text-stone-600 font-semibold">
                                  {day.temp_min_c == null ? '—' : `${day.temp_min_c}°`}
                                </span>
                              </div>

                              <div className="text-[10px] text-stone-600 flex items-center justify-center gap-1">
                                <CloudRain className="w-3 h-3 text-sky-600 shrink-0" />
                                <span>
                                  {day.rain_chance_max_pct == null ? '—' : `${day.rain_chance_max_pct}%`}
                                </span>
                                <span className="text-stone-400">•</span>
                                <span>
                                  {day.total_precipitation_mm == null ? '—' : `${day.total_precipitation_mm}mm`}
                                </span>
                              </div>
                            </div>
                          );
                        })}

                        {/* 8th card: Spray Advisory Summary */}
                        <div
                          className={`rounded-2xl border p-2.5 text-center space-y-1 flex flex-col justify-between ${
                            currentWeather?.spray_advisory === 'SAFE_TO_SPRAY'
                              ? 'border-emerald-200 bg-emerald-50/70'
                              : 'border-amber-200 bg-amber-50/70'
                          }`}
                        >
                          <span className="text-[11px] font-bold text-stone-800 block">
                            Spray Advisory
                          </span>

                          {currentWeather?.spray_advisory === 'SAFE_TO_SPRAY' ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 mx-auto" />
                          ) : (
                            <ShieldAlert className="w-4 h-4 text-amber-600 mx-auto" />
                          )}

                          <span
                            className={`text-[11px] font-bold block ${
                              currentWeather?.spray_advisory === 'SAFE_TO_SPRAY'
                                ? 'text-emerald-800'
                                : 'text-amber-900'
                            }`}
                          >
                            {currentWeather?.spray_advisory === 'SAFE_TO_SPRAY'
                              ? 'Safe to spray'
                              : currentWeather?.spray_advisory === 'DO_NOT_SPRAY'
                                ? 'Avoid spraying'
                                : 'Conditions Active'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Compact informative empty state without repeated placeholder dashes */
                <div className="py-8 px-4 rounded-2xl bg-stone-50/80 border border-stone-200 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 mx-auto flex items-center justify-center">
                    <CloudSun className="w-6 h-6" />
                  </div>
                  <div className="space-y-1 max-w-md mx-auto">
                    <h4 className="text-sm font-bold text-stone-900">
                      {coords.latitude && coords.longitude
                        ? 'Invalid Farm Coordinates'
                        : t('weatherStatusTitle')}
                    </h4>
                    <p className="text-xs text-stone-600 leading-relaxed">
                      {coords.latitude && coords.longitude
                        ? 'Please enter valid coordinates with latitude between -90° and 90° and longitude between -180° and 180°.'
                        : t('weatherStatusIdle')}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleDetectLocation}
                    disabled={gpsLoading}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-60"
                  >
                    <MapPin className="w-4 h-4" />
                    <span>{gpsLoading ? t('locationFetching') : t('useMyLocationBtn')}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Bottom Feed Status Notice */}
            <div className="text-xs text-stone-600 leading-relaxed bg-stone-50 p-3 rounded-xl border border-stone-200 flex items-start gap-2.5 mt-2">
              <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <span>
                <strong className="text-stone-900 font-semibold">{t('weatherStatusTitle')}:</strong>{' '}
                {weatherLoading && !weatherData
                  ? t('weatherStatusLoading')
                  : weatherLoading && weatherData
                    ? 'Updating agrometeorological forecast...'
                    : weatherError
                      ? t('weatherStatusError')
                      : weatherData
                        ? 'Agrometeorological forecast synchronized for farm coordinates.'
                        : 'Waiting for farm coordinates to establish environmental telemetry.'}
              </span>
            </div>
          </div>

          {/* Panel B: Sentinel-2 Satellite Vegetation Index (NDVI) */}
          <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm space-y-5 flex flex-col justify-between">
            <div className="space-y-4">
              {/* Panel Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100">
                <div className="flex items-center gap-3">
                  <span className="p-2.5 rounded-2xl bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0">
                    <Satellite className="w-5 h-5" />
                  </span>
                  <div>
                    <h3 className="font-bold text-stone-900 text-base">
                      {t('ndviSectionTitle')}
                    </h3>
                    <span className="text-xs text-stone-500 block">
                      Target Feed: Copernicus Sentinel-2 MSI
                    </span>
                  </div>
                </div>

                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 self-start sm:self-auto shrink-0">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  <span>Pipeline Pending</span>
                </span>
              </div>

              {/* Satellite Constellation Capabilities Card */}
              <div className="p-4 rounded-2xl border border-stone-200 bg-stone-50/80 space-y-2.5 text-xs text-stone-700">
                <div className="font-bold text-stone-900 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Satellite className="w-4 h-4 text-emerald-700" />
                    <span>Sentinel-2 Multispectral Instrument (MSI)</span>
                  </span>
                  <span className="text-[11px] text-stone-500 font-normal">Bands 4 &amp; 8</span>
                </div>
                <p className="leading-relaxed text-stone-600">
                  Copernicus Sentinel-2 provides <strong>10-meter spatial resolution</strong> surface reflectance data with an orbital revisit frequency of <strong>every 5 days</strong> over agricultural regions.
                </p>
                <div className="text-[11px] text-amber-900 font-medium bg-amber-50/80 p-2 rounded-lg border border-amber-200/80">
                  Live satellite telemetry pipeline is not yet connected. In adherence to our zero-fabricated-data policy, no estimated raster indices or synthetic vigor values are displayed.
                </div>
              </div>

              {/* NDVI Reference Legend (Educational Concept) */}
              <div className="space-y-2.5 pt-1">
                <div className="flex items-center justify-between text-xs font-semibold text-stone-700">
                  <span>NDVI Agronomic Reference Ranges</span>
                  <span className="text-[11px] font-normal text-stone-500">Scale: -1.0 to +1.0</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  <div className="p-3 rounded-xl border border-stone-200 bg-white shadow-2xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-stone-800">&lt; 0.10</span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-stone-100 text-stone-600">
                        Non-vegetated
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-500 leading-snug">
                      Water bodies, bare rock, deep shadows, or built structures
                    </p>
                  </div>

                  <div className="p-3 rounded-xl border border-stone-200 bg-white shadow-2xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-stone-800">0.10 – 0.20</span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                        Bare Soil
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-500 leading-snug">
                      Fallow fields, dry crop residue, or prepared seedbeds
                    </p>
                  </div>

                  <div className="p-3 rounded-xl border border-stone-200 bg-white shadow-2xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-stone-800">0.20 – 0.50</span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Emerging Canopy
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-500 leading-snug">
                      Early germination, sparse canopy, or moisture-stressed vegetation
                    </p>
                  </div>

                  <div className="p-3 rounded-xl border border-stone-200 bg-white shadow-2xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-stone-800">0.50 – 0.85+</span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                        Dense Vigor
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-500 leading-snug">
                      Peak vegetative canopy, high biomass, active chlorophyll absorption
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Telemetry Status Notice */}
            <div className="text-xs text-stone-600 leading-relaxed bg-stone-50 p-3 rounded-xl border border-stone-200 flex items-start gap-2.5 mt-2">
              <Info className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
              <span>
                <strong className="text-stone-900 font-semibold">Telemetry Status:</strong> Live Earth Observation raster pipelines are pending backend integration. Direct field NDVI indices will appear once satellite feeds are activated.
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
