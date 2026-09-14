import React, { useState } from 'react';
import {
  MapPin,
  FileSpreadsheet,
  AlertTriangle,
  Leaf,
  CloudSun,
  Satellite,
  Calendar,
  Layers,
  RotateCw,
  Info,
  CheckCircle2,
  Thermometer,
  CloudRain,
  Wind,
  Shield,
  Clock,
  Droplets,
  Volume2,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useVoice } from '../context/VoiceContext';
import { evaluateSoil } from '../services/soil';
import type { SoilHealthInput, RegenerativeAdvisoryResponse } from '../types/soil.types';
import type { NormalizedError } from '../types/api.types';
import { VoiceReaderButton } from '../components/common/VoiceReaderButton';
import { LanguageNotice } from '../components/common/LanguageNotice';
import { ErrorMessage } from '../components/common/ErrorMessage';

export const KhetSwasthya: React.FC = () => {
  const { t, language } = useLanguage();
  const { isSpeaking, activeContentId, currentSentenceIndex } = useVoice();

  // Location form state
  const [coords, setCoords] = useState<{ latitude: string; longitude: string }>({
    latitude: '26.8467', // Default sample (Gangetic Plains)
    longitude: '80.9462',
  });
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Data origin tracking per §4.2: Official Lab Card vs Farmer Self-Input
  const [inputOrigin, setInputOrigin] = useState<'OFFICIAL_SHC' | 'FARMER_ESTIMATE'>('OFFICIAL_SHC');

  // Soil health card inputs state
  const [shcValues, setShcValues] = useState<{
    ph: string;
    soc: string;
    n: string;
    p: string;
    k: string;
    zn: string;
  }>({
    ph: '7.2',
    soc: '0.42',
    n: '210',
    p: '14',
    k: '160',
    zn: '0.48',
  });

  // Submission, report, and error states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<NormalizedError | null>(null);
  const [report, setReport] = useState<RegenerativeAdvisoryResponse | null>(null);
  const [submittedData, setSubmittedData] = useState<{
    provenance: 'OFFICIAL_SHC' | 'FARMER_ESTIMATE';
    coords: { latitude: string; longitude: string };
    values: typeof shcValues;
  } | null>(null);

  // GPS Device Location Handler
  const handleDetectLocation = () => {
    setGpsError(null);
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser.');
      return;
    }

    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({
          latitude: pos.coords.latitude.toFixed(4),
          longitude: pos.coords.longitude.toFixed(4),
        });
        setGpsLoading(false);
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
    setError(null);

    const lat = parseFloat(coords.latitude);
    const lon = parseFloat(coords.longitude);

    if (isNaN(lat) || lat < -90 || lat > 90) {
      setError({
        category: 'VALIDATION_ERROR',
        userMessage: 'Please enter a valid latitude between -90 and 90.',
      });
      return;
    }

    if (isNaN(lon) || lon < -180 || lon > 180) {
      setError({
        category: 'VALIDATION_ERROR',
        userMessage: 'Please enter a valid longitude between -180 and 180.',
      });
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
    };

    setIsSubmitting(true);
    try {
      const res = await evaluateSoil(payload);
      setReport(res);
      setSubmittedData({
        provenance: inputOrigin,
        coords: { ...coords },
        values: { ...shcValues },
      });
      setTimeout(() => {
        document.getElementById('soil-report-section')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err) {
      setError(err as NormalizedError);
    } finally {
      setIsSubmitting(false);
    }
  };

 const textToRead = report
  ? (report.spoken_summary || report.soil_health_assessment || '')
  : '';
  // Prepare sentences for sentence-level visual tracking per §7
  const reportSentences = report
    ? textToRead
        .split(/(?<=[.?!।\n])\s+/)
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  const isVoiceReadingThisReport = isSpeaking && activeContentId === 'soil-advisory-report';

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 space-y-10">
      {/* Header */}
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold">
          <Layers className="w-4 h-4" />
          <span>Regenerative Soil Advisory</span>
        </div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-stone-900 tracking-tight">
          {t('khetTitle')}
        </h1>
        <p className="text-stone-600 text-sm sm:text-base leading-relaxed max-w-3xl">
          {t('khetSubtitle')}
        </p>
      </div>

      {/* Main Input Form */}
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Step 1: Location */}
        <section className="rounded-2xl border border-stone-200 bg-white p-6 sm:p-8 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-emerald-700" aria-hidden="true" />
                <span>{t('locationSectionTitle')}</span>
              </h2>
              <p className="text-xs sm:text-sm text-stone-500 mt-1">
                {t('locationHelp')}
              </p>
            </div>
            <button
              type="button"
              onClick={handleDetectLocation}
              disabled={gpsLoading}
              className="inline-flex items-center justify-center gap-2 min-h-12 px-4 py-2 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs sm:text-sm font-semibold border border-stone-300 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 shrink-0 disabled:opacity-60"
            >
              <MapPin className={`w-4 h-4 text-emerald-700 ${gpsLoading ? 'animate-bounce' : ''}`} />
              <span>{gpsLoading ? t('locationFetching') : t('useMyLocationBtn')}</span>
            </button>
          </div>

          {gpsError && (
            <div role="alert" className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
              <Info className="w-4 h-4 text-amber-700 shrink-0" />
              <span>{gpsError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="lat-input" className="block text-xs font-semibold text-stone-700 mb-1.5">
                {t('latitudeLabel')}
              </label>
              <input
                id="lat-input"
                type="number"
                step="any"
                required
                value={coords.latitude}
                onChange={(e) => setCoords((prev) => ({ ...prev, latitude: e.target.value }))}
                className="w-full min-h-12 px-3.5 py-2.5 rounded-lg border border-stone-300 bg-stone-50 text-stone-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent"
                placeholder="e.g. 26.8467"
              />
            </div>
            <div>
              <label htmlFor="lon-input" className="block text-xs font-semibold text-stone-700 mb-1.5">
                {t('longitudeLabel')}
              </label>
              <input
                id="lon-input"
                type="number"
                step="any"
                required
                value={coords.longitude}
                onChange={(e) => setCoords((prev) => ({ ...prev, longitude: e.target.value }))}
                className="w-full min-h-12 px-3.5 py-2.5 rounded-lg border border-stone-300 bg-stone-50 text-stone-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent"
                placeholder="e.g. 80.9462"
              />
            </div>
          </div>
        </section>

        {/* Step 2: Soil Health Card Metrics */}
        <section className="rounded-2xl border border-stone-200 bg-white p-6 sm:p-8 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-700" aria-hidden="true" />
                <span>{t('shcSectionTitle')}</span>
              </h2>
              <p className="text-xs sm:text-sm text-stone-500 mt-1">
                {t('shcHelp')}
              </p>
            </div>

            {/* Provenance Selector per §4.2 */}
            <div className="inline-flex rounded-lg border border-stone-300 p-1 bg-stone-100/80 text-xs font-medium self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setInputOrigin('OFFICIAL_SHC')}
                className={`px-3 py-1.5 rounded-md transition-all ${
                  inputOrigin === 'OFFICIAL_SHC'
                    ? 'bg-emerald-700 text-white font-semibold shadow-xs'
                    : 'text-stone-700 hover:text-stone-950'
                }`}
              >
                Official Soil Health Card / Lab Test
              </button>
              <button
                type="button"
                onClick={() => setInputOrigin('FARMER_ESTIMATE')}
                className={`px-3 py-1.5 rounded-md transition-all ${
                  inputOrigin === 'FARMER_ESTIMATE'
                    ? 'bg-emerald-700 text-white font-semibold shadow-xs'
                    : 'text-stone-700 hover:text-stone-950'
                }`}
              >
                Farmer Self-Assessment / Estimated
              </button>
            </div>
          </div>

          <div className="text-xs text-stone-500 bg-stone-50 border border-stone-200 p-2.5 rounded-lg flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>
              Recorded as:{' '}
              <strong className="text-stone-800 font-semibold">
                {inputOrigin === 'OFFICIAL_SHC'
                  ? 'Official Soil Health Card / Lab Test'
                  : 'Farmer Self-Assessment / Estimated'}
              </strong>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
            {/* pH */}
            <div className="space-y-1.5">
              <label htmlFor="ph-input" className="block text-xs font-semibold text-stone-700">
                Soil pH (1–14)
              </label>
              <input
                id="ph-input"
                type="number"
                step="0.1"
                min="1"
                max="14"
                value={shcValues.ph}
                onChange={(e) => handleInputChange('ph', e.target.value)}
                className="w-full min-h-12 px-3.5 py-2.5 rounded-lg border border-stone-300 bg-stone-50 text-stone-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                placeholder="e.g. 7.2"
              />
              <p className="text-[11px] text-stone-500 leading-tight">
                Reference range: 6.5–7.5; varies by crop and soil type
              </p>
            </div>

            {/* SOC */}
            <div className="space-y-1.5">
              <label htmlFor="soc-input" className="block text-xs font-semibold text-stone-700">
                Soil Organic Carbon — SOC (%)
              </label>
              <input
                id="soc-input"
                type="number"
                step="0.01"
                min="0"
                max="10"
                value={shcValues.soc}
                onChange={(e) => handleInputChange('soc', e.target.value)}
                className="w-full min-h-12 px-3.5 py-2.5 rounded-lg border border-stone-300 bg-stone-50 text-stone-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                placeholder="e.g. 0.42"
              />
              <p className="text-[11px] text-stone-500 leading-tight">
                Project degradation threshold: &lt; 0.50% indicates critical depletion; varies by climate and soil type
              </p>
            </div>

            {/* Nitrogen (kg/ha) */}
            <div className="space-y-1.5">
              <label htmlFor="n-input" className="block text-xs font-semibold text-stone-700">
                Available Nitrogen — N (kg/ha)
              </label>
              <input
                id="n-input"
                type="number"
                step="1"
                min="0"
                value={shcValues.n}
                onChange={(e) => handleInputChange('n', e.target.value)}
                className="w-full min-h-12 px-3.5 py-2.5 rounded-lg border border-stone-300 bg-stone-50 text-stone-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                placeholder="e.g. 210"
              />
              <p className="text-[11px] text-stone-500 leading-tight">
                Reference guideline: typically 280–560 kg/ha for medium rating; varies by crop demand
              </p>
            </div>

            {/* Phosphorus (kg/ha) */}
            <div className="space-y-1.5">
              <label htmlFor="p-input" className="block text-xs font-semibold text-stone-700">
                Available Phosphorus — P (kg/ha)
              </label>
              <input
                id="p-input"
                type="number"
                step="0.1"
                min="0"
                value={shcValues.p}
                onChange={(e) => handleInputChange('p', e.target.value)}
                className="w-full min-h-12 px-3.5 py-2.5 rounded-lg border border-stone-300 bg-stone-50 text-stone-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                placeholder="e.g. 14"
              />
              <p className="text-[11px] text-stone-500 leading-tight">
                Reference guideline: typically 10–25 kg/ha for medium rating; depends on soil fixation
              </p>
            </div>

            {/* Potassium (kg/ha) */}
            <div className="space-y-1.5">
              <label htmlFor="k-input" className="block text-xs font-semibold text-stone-700">
                Available Potassium — K (kg/ha)
              </label>
              <input
                id="k-input"
                type="number"
                step="1"
                min="0"
                value={shcValues.k}
                onChange={(e) => handleInputChange('k', e.target.value)}
                className="w-full min-h-12 px-3.5 py-2.5 rounded-lg border border-stone-300 bg-stone-50 text-stone-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                placeholder="e.g. 160"
              />
              <p className="text-[11px] text-stone-500 leading-tight">
                Reference guideline: typically 110–280 kg/ha for medium rating; depends on soil texture
              </p>
            </div>

            {/* Zinc (ppm) */}
            <div className="space-y-1.5">
              <label htmlFor="zn-input" className="block text-xs font-semibold text-stone-700">
                Available Zinc — Zn (ppm)
              </label>
              <input
                id="zn-input"
                type="number"
                step="0.01"
                min="0"
                value={shcValues.zn}
                onChange={(e) => handleInputChange('zn', e.target.value)}
                className="w-full min-h-12 px-3.5 py-2.5 rounded-lg border border-stone-300 bg-stone-50 text-stone-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                placeholder="e.g. 0.48"
              />
              <p className="text-[11px] text-stone-500 leading-tight">
                Reference threshold: &lt; 0.60 ppm generally indicates micronutrient deficiency
              </p>
            </div>
          </div>
        </section>

        {/* Error Alert */}
        {error && <ErrorMessage error={error} onRetry={() => handleSubmit({ preventDefault: () => {} } as React.FormEvent)} />}

        {/* Submit Button */}
        <div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto min-h-14 px-8 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-base shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2 flex items-center justify-center gap-3 disabled:opacity-60"
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
      </form>

      {/* Honest Pending Integrations Section with Real Layout Chrome (§5) */}
      <div className="pt-6 border-t border-stone-200 space-y-6">
        <div>
          <h2 className="text-sm font-bold text-stone-900 uppercase tracking-wider">
            Field Environmental Telemetry Connections
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Real interface layout rendered below. In adherence to our zero-fabricated-data policy, placeholder numbers are never displayed until live APIs are connected.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Weather Layout Chrome with Honest Pending Status */}
          <div className="rounded-2xl border border-stone-300/80 bg-white p-6 shadow-xs space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="p-2.5 rounded-xl bg-amber-50 text-amber-800 border border-amber-200">
                  <CloudSun className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-bold text-stone-900 text-base">
                    {t('weatherSectionTitle')}
                  </h3>
                  <span className="text-xs text-stone-500">Target Feed: IMD / Agrometeorological Grid API</span>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-300 px-2.5 py-1 rounded-full">
                <Clock className="w-3 h-3" />
                Feed Pending Integration
              </span>
            </div>

            {/* Real 7-Day Forecast Grid Chrome (Zero placeholder/guessed numbers) */}
            <div className="space-y-2 pt-1">
              <span className="text-xs font-semibold text-stone-600 block">7-Day Forecast Slots</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
                {['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7'].map((day, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-dashed border-stone-300 bg-stone-50/80 p-2 text-center space-y-1"
                  >
                    <span className="text-[11px] font-bold text-stone-700 block">{day}</span>
                    <CloudSun className="w-4 h-4 text-stone-400 mx-auto" />
                    <span className="inline-block text-[10px] text-amber-800 font-medium bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
                      Pending
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Metrics Grid: Temperature, Rainfall Probability, Humidity, Wind */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-stone-100">
              <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-center space-y-1">
                <Thermometer className="w-4 h-4 text-stone-500 mx-auto" />
                <span className="text-[11px] font-semibold text-stone-700 block">Temperature</span>
                <span className="inline-block text-[10px] font-medium text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                  Pending Integration
                </span>
              </div>
              <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-center space-y-1">
                <CloudRain className="w-4 h-4 text-stone-500 mx-auto" />
                <span className="text-[11px] font-semibold text-stone-700 block">Rain Probability</span>
                <span className="inline-block text-[10px] font-medium text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                  Pending Integration
                </span>
              </div>
              <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-center space-y-1">
                <Droplets className="w-4 h-4 text-stone-500 mx-auto" />
                <span className="text-[11px] font-semibold text-stone-700 block">Relative Humidity</span>
                <span className="inline-block text-[10px] font-medium text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                  Pending Integration
                </span>
              </div>
              <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-center space-y-1">
                <Wind className="w-4 h-4 text-stone-500 mx-auto" />
                <span className="text-[11px] font-semibold text-stone-700 block">Wind Velocity</span>
                <span className="inline-block text-[10px] font-medium text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                  Pending Integration
                </span>
              </div>
            </div>

            <div className="text-xs text-stone-600 leading-relaxed bg-amber-50/70 p-3.5 rounded-xl border border-amber-200 flex items-start gap-2.5">
              <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <span>
                <strong className="text-amber-950 font-semibold">Feed Status:</strong> Live agrometeorology and weather forecasting endpoints are pending backend integration. In adherence to our zero-fabricated-data policy, no placeholder values or guessed numbers are displayed.
              </span>
            </div>
          </div>

          {/* Sentinel-2 NDVI Layout Chrome with Honest Pending Status */}
          <div className="rounded-2xl border border-stone-300/80 bg-white p-6 shadow-xs space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="p-2.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <Satellite className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-bold text-stone-900 text-base">
                    {t('ndviSectionTitle')}
                  </h3>
                  <span className="text-xs text-stone-500">Target Feed: Copernicus Sentinel-2 Multispectral Instrument (MSI)</span>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-300 px-2.5 py-1 rounded-full">
                <Clock className="w-3 h-3" />
                Telemetry Pending
              </span>
            </div>

            {/* Sentinel-2 Specifications */}
            <div className="p-4 rounded-xl border border-stone-200 bg-stone-50/80 space-y-2 text-xs text-stone-700">
              <div className="font-bold text-stone-900 flex items-center gap-2">
                <Satellite className="w-4 h-4 text-emerald-700" />
                <span>Satellite Constellation Capabilities</span>
              </div>
              <p className="leading-relaxed text-stone-600">
                Copernicus Sentinel-2 provides <strong>10-meter spatial resolution</strong> surface reflectance data (Bands 4 and 8) with an orbital revisit frequency of <strong>every 5 days</strong> over agricultural regions.
              </p>
              <div className="pt-1 text-[11px] text-amber-800 font-medium">
                Live satellite telemetry pipeline is not yet connected. No live raster indices or vegetation vigor values are currently active.
              </div>
            </div>

            {/* NDVI Reference Legend (No simulated gradients, no simulated charts) */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between text-xs font-semibold text-stone-700">
                <span>NDVI Reference Legend (Educational Concept)</span>
                <span className="text-[11px] font-normal text-stone-500">Vegetation Index Range (-1 to +1)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-lg border border-stone-200 bg-white">
                  <span className="font-bold text-stone-800 block">&lt; 0.10</span>
                  <span className="text-[11px] text-stone-500">Water bodies, snow, or bare rocky surfaces</span>
                </div>
                <div className="p-2.5 rounded-lg border border-stone-200 bg-white">
                  <span className="font-bold text-stone-800 block">0.10 – 0.20</span>
                  <span className="text-[11px] text-stone-500">Bare farm soil, fallow fields, dry residue</span>
                </div>
                <div className="p-2.5 rounded-lg border border-stone-200 bg-white">
                  <span className="font-bold text-stone-800 block">0.20 – 0.50</span>
                  <span className="text-[11px] text-stone-500">Sparse canopy, early germination, moisture stress</span>
                </div>
                <div className="p-2.5 rounded-lg border border-stone-200 bg-white">
                  <span className="font-bold text-stone-800 block">0.50 – 0.85+</span>
                  <span className="text-[11px] text-stone-500">Dense vegetative canopy, active crop vigor</span>
                </div>
              </div>
            </div>

            <div className="text-xs text-stone-600 leading-relaxed bg-amber-50/70 p-3.5 rounded-xl border border-amber-200 flex items-start gap-2.5">
              <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <span>
                <strong className="text-amber-950 font-semibold">Telemetry Status:</strong> Live Earth Observation raster pipelines are pending backend integration. Actual field NDVI values will be displayed once satellite telemetry feeds are connected.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Real Diagnostic & Regenerative Advisory Report */}
      {report && (
        <section
          id="soil-report-section"
          className="rounded-3xl border-2 border-emerald-600 bg-white p-6 sm:p-8 md:p-10 shadow-lg space-y-8 animate-fadeIn"
          aria-label="Soil Advisory Results"
        >
          {/* Result Header with Voice Button & Language Notice */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-6">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 uppercase tracking-wider">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Generated Advisory Report</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-stone-900">
                {t('soilResultTitle')}
              </h2>
              <div className="flex flex-wrap items-center gap-2 text-xs text-stone-600">
                <span>
                  Agro-Climatic Zone: <strong className="text-stone-900 font-semibold">Farmer-provided location</strong>
                </span>
                <span>•</span>
                <span>
                  Data Provenance:{' '}
                  <strong className="text-stone-900 font-semibold">
                    {inputOrigin === 'OFFICIAL_SHC'
                      ? 'Official Soil Health Card / Lab Test'
                      : 'Farmer Self-Assessment / Estimated'}
                  </strong>
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:items-end gap-2">
              <VoiceReaderButton
                textToRead={textToRead}
                contentId="soil-advisory-report"
                sentences={reportSentences}
                label={t('voiceReadAloud')}
              />
              <LanguageNotice />
            </div>
          </div>

          {/* Submitted Soil Data & Provenance Card (§2) */}
          {submittedData && (
            <div className="rounded-2xl border border-stone-200 bg-stone-50/80 p-5 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-200/80 pb-3">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                  <span className="text-xs font-bold uppercase tracking-wider text-stone-700">
                    Submitted Soil Parameters & Origin
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
                <div className="bg-white p-2.5 rounded-xl border border-stone-200">
                  <span className="text-stone-500 block text-[11px]">Soil pH</span>
                  <span className="font-bold text-stone-900 text-sm">{submittedData.values.ph || '—'}</span>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-stone-200">
                  <span className="text-stone-500 block text-[11px]">Organic Carbon</span>
                  <span className="font-bold text-stone-900 text-sm">
                    {submittedData.values.soc ? `${submittedData.values.soc}%` : '—'}
                  </span>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-stone-200">
                  <span className="text-stone-500 block text-[11px]">Nitrogen (N)</span>
                  <span className="font-bold text-stone-900 text-sm">
                    {submittedData.values.n ? `${submittedData.values.n} kg/ha` : '—'}
                  </span>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-stone-200">
                  <span className="text-stone-500 block text-[11px]">Phosphorus (P)</span>
                  <span className="font-bold text-stone-900 text-sm">
                    {submittedData.values.p ? `${submittedData.values.p} kg/ha` : '—'}
                  </span>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-stone-200">
                  <span className="text-stone-500 block text-[11px]">Potassium (K)</span>
                  <span className="font-bold text-stone-900 text-sm">
                    {submittedData.values.k ? `${submittedData.values.k} kg/ha` : '—'}
                  </span>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-stone-200">
                  <span className="text-stone-500 block text-[11px]">Zinc (Zn)</span>
                  <span className="font-bold text-stone-900 text-sm">
                    {submittedData.values.zn ? `${submittedData.values.zn} ppm` : '—'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Critical Degradation Alert */}
          {false && (
            <div
              role="alert"
              className="p-4 rounded-xl border border-rose-300 bg-rose-50 text-rose-900 flex items-start gap-3"
            >
              <AlertTriangle className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" aria-hidden="true" />
              <div className="space-y-1">
                <h3 className="font-bold text-sm sm:text-base text-rose-950">
                  Critical Soil Degradation Warning
                </h3>
                <p className="text-xs sm:text-sm text-rose-800 leading-relaxed">
                  {t('criticallyDegradedWarning')}
                </p>
              </div>
            </div>
          )}

          {/* Soil Health Summary with Sentence-level visual tracking (§7) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider text-stone-500">
                Soil Condition & Summary
              </h3>
              {isVoiceReadingThisReport && !report.spoken_summary && (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                  <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                  Reading Aloud
                </span>
              )}
            </div>
            <div className="text-base text-stone-800 leading-relaxed bg-stone-50 p-5 rounded-2xl border border-stone-200">
  {isVoiceReadingThisReport ? (
    <p>
      {reportSentences.map((sentence, idx) => (
        <span
          key={idx}
          className={`transition-all duration-150 ${
            currentSentenceIndex === idx
              ? 'bg-amber-200 text-stone-950 px-1 py-0.5 rounded-sm font-semibold shadow-2xs'
              : ''
          }`}
        >
          {sentence}{' '}
        </span>
      ))}
    </p>
  ) : (
    <p>{report.soil_health_assessment || report.spoken_summary || ''}</p>
  )}
</div>
          </div>

          {/* Biological Amendments List */}
{report.biological_amendments && report.biological_amendments.length > 0 && (
  <div className="space-y-3">
    <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
      <Leaf className="w-5 h-5 text-emerald-700" />
      <span>{t('biologicalAmendmentsTitle')}</span>
    </h3>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {report.biological_amendments.map((action, idx) => (
        <div
          key={idx}
          className="p-4 rounded-xl border border-emerald-100 bg-emerald-50/60 space-y-2"
        >
          <div className="font-bold text-sm text-emerald-950">
            {action.name}
          </div>

          <div className="text-xs font-semibold text-emerald-800">
            Target: {action.target_deficiency}
          </div>

          <div className="text-xs text-stone-700 leading-relaxed">
            <span className="font-semibold">Preparation:</span>{' '}
            {action.preparation_or_sourcing}
          </div>

          <div className="text-xs text-stone-700 leading-relaxed">
            <span className="font-semibold">Dosage:</span>{' '}
            {action.dosage_and_application}
          </div>
        </div>
      ))}
    </div>
  </div>
)}

          {/* Crop Rotation & Sowing Window Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {/* Rotation */}
  {report.regenerative_crop_rotations &&
    report.regenerative_crop_rotations.length > 0 && (
      <div className="rounded-2xl border border-stone-200 p-5 bg-stone-50/80 space-y-3">
        <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
          <RotateCw className="w-4 h-4 text-emerald-700" />
          <span>{t('cropRotationTitle')}</span>
        </h3>

        <div className="space-y-3 text-xs sm:text-sm text-stone-700">
          {report.regenerative_crop_rotations.map((rec, i) => (
            <div
              key={i}
              className="rounded-xl bg-white border border-stone-200 p-3 space-y-1.5"
            >
              <div className="font-bold text-stone-900">
                {rec.season}: {rec.recommended_crop}
              </div>

              <div>
                <span className="font-semibold">Ecological role:</span>{' '}
                {rec.ecological_role}
              </div>

              <div>
                <span className="font-semibold">Water requirement:</span>{' '}
                {rec.water_requirement}
              </div>
            </div>
          ))}
        </div>
      </div>
    )}

            {/* Sowing Advice */}
            {false && (
              <div className="rounded-2xl border border-stone-200 p-5 bg-stone-50/80 space-y-3">
                <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-emerald-700" />
                  <span>{t('sowingWindowAdviceTitle')}</span>
                </h3>
                <p className="text-xs sm:text-sm text-stone-700 leading-relaxed">
  Sowing window information is not currently available.
</p>
              </div>
            )}
          </div>

          {/* Spoken Script Box with Sentence-level visual tracking (§7) */}
          {report.spoken_summary && (
            <div className="rounded-2xl border border-stone-200 p-5 bg-stone-100/70 space-y-2">
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

          {/* Source Attribution & Disclaimer per §9 */}
          <div className="pt-6 border-t border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-stone-500">
            <div>
              <strong>{t('sourceAttribution')}:</strong> Kisan Regenerative Agronomy Engine (Gemini)
            </div>
            <div className="text-stone-400 italic text-[11px]">
              {t('aiDisclaimer')}
            </div>
          </div>
        </section>
      )}
    </div>
  );
};
