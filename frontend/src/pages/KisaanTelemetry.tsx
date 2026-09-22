import React, { useState, useEffect } from 'react';
import {
  Satellite,
  Clock,
  Compass,
  Info,
  ArrowLeft,
  Layers,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  AlertCircle,
  Filter,
  Server,
  ShieldAlert,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { PendingStateCard } from '../components/common/PendingStateCard';
import { EarlyWarningView } from '../components/telemetry/EarlyWarningView';
import { checkBackendHealth } from '../services/health';
import { fetchSentinelSurfaceMap, fetchAgroClimaticZones } from '../services/telemetry';
import type { SentinelSurfaceMapResponse, AgroClimaticZonesResponse } from '../types/telemetry.types';
import type { FarmerProfile } from '../types/profile.types';

type TelemetryLayerId = 'agro_climatic' | 'sentinel_ndvi' | 'early_warning';

export const KisaanTelemetry: React.FC = () => {
  const { t } = useLanguage();
  const { user } = useAuth();

  const [profile, setProfile] = useState<FarmerProfile | null>(null);
  
  useEffect(() => {
    if (user) {
      try {
        const saved = localStorage.getItem(`kisan_farmer_profile_${user.uid}`);
        if (saved) setProfile(JSON.parse(saved) as FarmerProfile);
      } catch (e) { }
    } else {
      try {
        const saved = localStorage.getItem('kisan_farmer_profile_guest');
        if (saved) setProfile(JSON.parse(saved) as FarmerProfile);
      } catch { }
    }
  }, [user]);

  // Active selected telemetry layer
  const [selectedLayer, setSelectedLayer] = useState<TelemetryLayerId>('agro_climatic');

  // Interactive filter selection inside Agro-Climatic layer
  const [activeZoneFilter, setActiveZoneFilter] = useState<'all_15' | 'sub_zones' | 'soil_orders'>('all_15');

  // Interactive band selection inside Sentinel-2 layer
  const [activeBand, setActiveBand] = useState<'ndvi' | 'b4_red' | 'b8_nir' | 'rgb'>('ndvi');

  // Interactive feedback notice when user clicks controls
  const [controlNotice, setControlNotice] = useState<string | null>(null);

  // Status check state for backend pipeline
  const [checkingPipeline, setCheckingPipeline] = useState(false);
  const [pipelineStatusMsg, setPipelineStatusMsg] = useState<{
    success: boolean;
    text: string;
  } | null>(null);

  const [sentinelData, setSentinelData] = useState<SentinelSurfaceMapResponse | null>(null);
  const [sentinelLoading, setSentinelLoading] = useState(false);

  const [agroClimaticData, setAgroClimaticData] = useState<AgroClimaticZonesResponse | null>(null);
  const [agroClimaticLoading, setAgroClimaticLoading] = useState(false);

  useEffect(() => {
    if (selectedLayer === 'sentinel_ndvi' && profile?.latitude && profile?.longitude) {
      setSentinelLoading(true);
      fetchSentinelSurfaceMap(Number(profile.latitude), Number(profile.longitude))
        .then(res => setSentinelData(res))
        .catch(() => {})
        .finally(() => setSentinelLoading(false));
    }
  }, [selectedLayer, profile?.latitude, profile?.longitude]);

  useEffect(() => {
    if (selectedLayer === 'agro_climatic') {
      setAgroClimaticLoading(true);
      fetchAgroClimaticZones()
        .then(res => {
          setAgroClimaticData(res);
        })
        .catch(() => {})
        .finally(() => {
          setAgroClimaticLoading(false);
        });
    }
  }, [selectedLayer]);

  const handleSelectLayer = (layer: TelemetryLayerId) => {
    setSelectedLayer(layer);
    setControlNotice(null);
    setPipelineStatusMsg(null);
  };

  const handleZoneFilterChange = (filter: 'all_15' | 'sub_zones' | 'soil_orders', label: string) => {
    setActiveZoneFilter(filter);
    if (agroClimaticData?.features?.length) {
      setControlNotice(`Filter set to: "${label}". Active GeoJSON stream is rendering ${agroClimaticData.features.length} polygons.`);
    } else {
      setControlNotice(
        `Filter set to: "${label}". Spatial vector polygon stream is currently offline awaiting GIS backend integration.`
      );
    }
  };

  const handleBandChange = (band: 'ndvi' | 'b4_red' | 'b8_nir' | 'rgb', label: string) => {
    setActiveBand(band);
    if (sentinelData?.feed_available) {
      setControlNotice(`Spectral channel set to: "${label}". Live raster stream connected.`);
    } else {
      setControlNotice(
        `Spectral channel set to: "${label}". Live Sentinel-2 satellite raster stream is offline awaiting Copernicus pipeline integration.`
      );
    }
  };

  const handleZoomAction = (action: 'in' | 'out' | 'reset') => {
    const actionNames = {
      in: 'Zoom In (+)',
      out: 'Zoom Out (-)',
      reset: 'Reset Viewport',
    };
    
    if (selectedLayer === 'agro_climatic' && agroClimaticData?.features?.length) {
      setControlNotice(`${actionNames[action]} applied to GIS viewport.`);
    } else if (selectedLayer === 'sentinel_ndvi' && sentinelData?.feed_available) {
      setControlNotice(`${actionNames[action]} applied to satellite viewport.`);
    } else {
      setControlNotice(
        `${actionNames[action]} triggered. Interactive viewport adjustments are paused while telemetry feed is offline.`
      );
    }
  };

  const handleCheckPipeline = async (targetEndpoint: string) => {
    setCheckingPipeline(true);
    setPipelineStatusMsg(null);
    try {
      if (targetEndpoint === '/api/v1/telemetry/agro-climatic-zones') {
        const data = await fetchAgroClimaticZones();
        setPipelineStatusMsg({
          success: true,
          text: `${t('telemetryPipelineSuccessPrefix')}${targetEndpoint}${t('telemetryPipelineSuccessMid')}${data.features.length}${t('telemetryPipelineSuccessSuffix')}`,
        });
      } else {
        const health = await checkBackendHealth();
        if (health.status === 'healthy') {
          setPipelineStatusMsg({
            success: false,
            text: `Backend server is operational (status: ${health.status}), but the telemetry endpoint "${targetEndpoint}" is not yet deployed. Ingestion pipeline remains in planned roadmap status.`,
          });
        } else {
          setPipelineStatusMsg({
            success: false,
            text: `Telemetry endpoint "${targetEndpoint}" is currently offline. No live telemetry data is available.`,
          });
        }
      }
    } catch {
      setPipelineStatusMsg({
        success: false,
        text: `Unable to connect to telemetry service at "${targetEndpoint}". Backend ingestion worker is offline.`,
      });
    } finally {
      setCheckingPipeline(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 space-y-10">
      {/* Header with Optional Badge */}
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 border border-amber-300 text-amber-900 text-xs font-semibold">
          <Clock className="w-3.5 h-3.5" />
          <span>{t('telemetryPendingBadge')}</span>
        </div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-stone-900 tracking-tight">
          {t('telemetryTitle')}
        </h1>
        <p className="text-stone-600 text-sm sm:text-base leading-relaxed max-w-3xl">
          {t('telemetrySubtitle')}
        </p>
      </div>

      {/* Honest Scope & Status Banner */}
      <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-6 sm:p-8 space-y-3">
        <div className="flex items-center gap-2 text-amber-900 font-bold text-base">
          <Info className="w-5 h-5 text-amber-700 shrink-0" />
          <span>Telemetric Remote Sensing Notice</span>
        </div>
        <p className="text-sm text-amber-900/90 leading-relaxed">
          {t('telemetryPendingDesc')} In accordance with our zero-fabricated-data charter, interactive maps and simulated satellite tiles are not rendered until genuine geospatial telemetry pipelines are connected. Click a layer below to inspect specifications and service connection status.
        </p>
      </div>

      {/* Interactive Layer Selector Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-stone-500 flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-700" />
            <span>Select Telemetry Layer to Inspect</span>
          </h2>
          <span className="text-xs text-stone-500">Tap a card to switch viewer</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6" role="tablist" aria-label="Telemetry Layers">
          <PendingStateCard
            title={t('agroClimaticMapTitle')}
            description="Visual boundaries for the 15 major Indian agro-climatic zones and sub-regions mapped using official ICAR/Planning Commission geospatial shapefiles."
            icon={<Compass className="w-5 h-5" />}
            tag="Zone Shapefile Pending"
            onClick={() => handleSelectLayer('agro_climatic')}
            isSelected={selectedLayer === 'agro_climatic'}
            actionText={selectedLayer === 'agro_climatic' ? 'Viewing Layer' : 'Inspect Zone Map'}
          />

          <PendingStateCard
            title={t('sentinelNdviMapTitle')}
            description="Multispectral surface reflectance data from Sentinel-2 satellite passes (10-meter resolution) providing 5-day NDVI vegetation vigor updates."
            icon={<Satellite className="w-5 h-5" />}
            tag="Sentinel-2 API Pending"
            onClick={() => handleSelectLayer('sentinel_ndvi')}
            isSelected={selectedLayer === 'sentinel_ndvi'}
            actionText={selectedLayer === 'sentinel_ndvi' ? 'Viewing Layer' : 'Inspect Satellite Map'}
          />

          <PendingStateCard
            title="Early Warning & Anomaly Alerts"
            description="Proactive anomaly monitoring fusing satellite moisture indices, temperature anomalies, and disease susceptibility models."
            icon={<ShieldAlert className="w-5 h-5" />}
            tag="Risk Alerts"
            onClick={() => handleSelectLayer('early_warning')}
            isSelected={selectedLayer === 'early_warning'}
            actionText={selectedLayer === 'early_warning' ? 'Viewing Alerts' : 'Inspect Risk Alerts'}
          />
        </div>
      </div>

      {/* Dedicated Interactive Telemetry Viewport Panel */}
      <section
        className="rounded-3xl border-2 border-stone-300 bg-white p-6 sm:p-8 space-y-6 shadow-xs"
        aria-label="Telemetry Viewport & Specifications"
      >
        {selectedLayer === 'early_warning' ? (
          <EarlyWarningView profile={profile} />
        ) : (
          <>
            {/* Layer Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200 pb-5">
              <div className="flex items-center gap-3">
                <span className="p-3 rounded-2xl bg-emerald-100 text-emerald-800">
                  {selectedLayer === 'agro_climatic' ? (
                    <Compass className="w-6 h-6" />
                  ) : (
                    <Satellite className="w-6 h-6" />
                  )}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                      Active Viewport
                    </span>
                    <span className="text-stone-300">•</span>
                    <span className="text-xs text-stone-500">Estimated Vegetation Layer</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-extrabold text-stone-900">
                    {selectedLayer === 'agro_climatic'
                      ? t('agroClimaticMapTitle')
                      : t('sentinelNdviMapTitle')}
                  </h3>
                </div>
              </div>

              {selectedLayer === 'sentinel_ndvi' && sentinelData ? (
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold self-start sm:self-auto ${sentinelData.feed_available ? 'bg-emerald-50 text-emerald-800 border border-emerald-300' : 'bg-amber-50 text-amber-800 border border-amber-300'}`}>
                  <Clock className="w-3.5 h-3.5" />
                  <span>{sentinelData.feed_available ? t('telemetryConnectedBadge') : t('telemetryFeedPendingBadge')}</span>
                </span>
              ) : selectedLayer === 'agro_climatic' ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-300 self-start sm:self-auto">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{t('telemetryFeedPendingBadge')}</span>
                </span>
              ) : null}
            </div>

        {/* Interactive Controls Toolbar for the Selected Layer */}
        {selectedLayer === 'agro_climatic' ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-stone-700">
                <Filter className="w-3.5 h-3.5 text-emerald-700" />
                <span>Geospatial Boundaries Filter:</span>
              </div>

              {/* Viewport Zoom Controls */}
              <div className="flex items-center gap-1.5" role="toolbar" aria-label="Map Canvas Controls">
                <button
                  type="button"
                  onClick={() => handleZoomAction('in')}
                  className="min-h-10 min-w-10 px-2.5 py-1.5 rounded-lg border border-stone-300 bg-stone-50 hover:bg-stone-100 active:scale-95 text-stone-700 text-xs font-semibold flex items-center gap-1 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  aria-label="Zoom in"
                >
                  <ZoomIn className="w-4 h-4" />
                  <span className="hidden sm:inline">Zoom</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleZoomAction('out')}
                  className="min-h-10 min-w-10 px-2.5 py-1.5 rounded-lg border border-stone-300 bg-stone-50 hover:bg-stone-100 active:scale-95 text-stone-700 text-xs font-semibold flex items-center gap-1 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  aria-label="Zoom out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleZoomAction('reset')}
                  className="min-h-10 px-2.5 py-1.5 rounded-lg border border-stone-300 bg-stone-50 hover:bg-stone-100 active:scale-95 text-stone-700 text-xs font-semibold flex items-center gap-1 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  aria-label="Reset Viewport"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Reset</span>
                </button>
              </div>
            </div>

            {/* Filter Chips */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleZoneFilterChange('all_15', '15 Major Agro-Climatic Zones')}
                className={`min-h-10 px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all active:scale-98 ${
                  activeZoneFilter === 'all_15'
                    ? 'bg-emerald-700 text-white border-emerald-800 shadow-xs'
                    : 'bg-stone-100 text-stone-700 border-stone-300 hover:bg-stone-200'
                }`}
              >
                15 Major Zones (Planning Commission)
              </button>
              <button
                type="button"
                onClick={() => handleZoneFilterChange('sub_zones', '72 Sub-Regional Agro-Zones')}
                className={`min-h-10 px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all active:scale-98 ${
                  activeZoneFilter === 'sub_zones'
                    ? 'bg-emerald-700 text-white border-emerald-800 shadow-xs'
                    : 'bg-stone-100 text-stone-700 border-stone-300 hover:bg-stone-200'
                }`}
              >
                72 Sub-Regional Agro-Zones (NARP)
              </button>
              <button
                type="button"
                onClick={() => handleZoneFilterChange('soil_orders', 'Soil Taxonomy Polygons')}
                className={`min-h-10 px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all active:scale-98 ${
                  activeZoneFilter === 'soil_orders'
                    ? 'bg-emerald-700 text-white border-emerald-800 shadow-xs'
                    : 'bg-stone-100 text-stone-700 border-stone-300 hover:bg-stone-200'
                }`}
              >
                Soil Taxonomy Polygons (NBSS&LUP)
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-stone-700">
                <Filter className="w-3.5 h-3.5 text-emerald-700" />
                <span>Multispectral Channel / Composite:</span>
              </div>

              {/* Viewport Zoom Controls */}
              <div className="flex items-center gap-1.5" role="toolbar" aria-label="Satellite Viewport Controls">
                <button
                  type="button"
                  onClick={() => handleZoomAction('in')}
                  className="min-h-10 min-w-10 px-2.5 py-1.5 rounded-lg border border-stone-300 bg-stone-50 hover:bg-stone-100 active:scale-95 text-stone-700 text-xs font-semibold flex items-center gap-1 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  aria-label="Zoom in"
                >
                  <ZoomIn className="w-4 h-4" />
                  <span className="hidden sm:inline">Zoom</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleZoomAction('out')}
                  className="min-h-10 min-w-10 px-2.5 py-1.5 rounded-lg border border-stone-300 bg-stone-50 hover:bg-stone-100 active:scale-95 text-stone-700 text-xs font-semibold flex items-center gap-1 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  aria-label="Zoom out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleZoomAction('reset')}
                  className="min-h-10 px-2.5 py-1.5 rounded-lg border border-stone-300 bg-stone-50 hover:bg-stone-100 active:scale-95 text-stone-700 text-xs font-semibold flex items-center gap-1 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  aria-label="Reset Viewport"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Reset</span>
                </button>
              </div>
            </div>

            {/* Band Chips */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleBandChange('ndvi', 'NDVI Vegetation Index')}
                className={`min-h-10 px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all active:scale-98 ${
                  activeBand === 'ndvi'
                    ? 'bg-emerald-700 text-white border-emerald-800 shadow-xs'
                    : 'bg-stone-100 text-stone-700 border-stone-300 hover:bg-stone-200'
                }`}
              >
                NDVI Index Composite (B8 + B4)
              </button>
              <button
                type="button"
                onClick={() => handleBandChange('b4_red', 'Band 4 — Red (665 nm)')}
                className={`min-h-10 px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all active:scale-98 ${
                  activeBand === 'b4_red'
                    ? 'bg-emerald-700 text-white border-emerald-800 shadow-xs'
                    : 'bg-stone-100 text-stone-700 border-stone-300 hover:bg-stone-200'
                }`}
              >
                Band 4 — Red (665 nm, 10m)
              </button>
              <button
                type="button"
                onClick={() => handleBandChange('b8_nir', 'Band 8 — Near Infrared (842 nm)')}
                className={`min-h-10 px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all active:scale-98 ${
                  activeBand === 'b8_nir'
                    ? 'bg-emerald-700 text-white border-emerald-800 shadow-xs'
                    : 'bg-stone-100 text-stone-700 border-stone-300 hover:bg-stone-200'
                }`}
              >
                Band 8 — NIR (842 nm, 10m)
              </button>
              <button
                type="button"
                onClick={() => handleBandChange('rgb', 'True Color Surface RGB')}
                className={`min-h-10 px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all active:scale-98 ${
                  activeBand === 'rgb'
                    ? 'bg-emerald-700 text-white border-emerald-800 shadow-xs'
                    : 'bg-stone-100 text-stone-700 border-stone-300 hover:bg-stone-200'
                }`}
              >
                True Color RGB (B4, B3, B2)
              </button>
            </div>
          </div>
        )}

        {/* Interactive Control Feedback Notice */}
        {controlNotice && (
          <div
            role="status"
            className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5 animate-fadeIn"
          >
            <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div className="flex-1">{controlNotice}</div>
            <button
              type="button"
              onClick={() => setControlNotice(null)}
              className="text-amber-700 hover:text-amber-950 text-xs font-semibold underline shrink-0 min-h-6"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Map / Viewport Canvas Shell (Honest Empty State) */}
        <div className="relative rounded-2xl border-2 border-dashed border-stone-300 bg-stone-50/90 h-80 sm:h-96 flex flex-col items-center justify-center p-6 text-center overflow-hidden">
          {/* Subtle Technical Grid Background Lines */}
          <div
            className="absolute inset-0 opacity-[0.04] pointer-events-none"
            style={{
              backgroundImage:
                'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }}
            aria-hidden="true"
          />

          {/* Coordinate Readout Badge in Viewport Corner */}
          <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-xs border border-stone-200 px-2.5 py-1 rounded-md text-[11px] font-mono text-stone-600 shadow-2xs z-20">
            {selectedLayer === 'agro_climatic'
              ? `Center: ${profile?.latitude || '--'}° N, ${profile?.longitude || '--'}° E (Datum: WGS 84)`
              : `Center: ${profile?.latitude || '--'}° N, ${profile?.longitude || '--'}° E`}
          </div>

          {/* Scale / Level Badge in Viewport Corner */}
          <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-xs border border-stone-200 px-2.5 py-1 rounded-md text-[11px] font-mono text-stone-600 shadow-2xs">
            {selectedLayer === 'agro_climatic'
              ? 'Scale 1:2,500,000 • Vector Pipeline Offline'
              : 'Level-2A BOA • Telemetry Pipeline Offline'}
          </div>

          {/* Center Honest Empty State Content */}
          {/* Center Honest Empty State Content or Real Data */}
          <div className="relative z-10 max-w-3xl w-full mx-auto space-y-3 px-4 flex flex-col items-center">
            {selectedLayer === 'sentinel_ndvi' ? (
              !profile?.latitude ? (
                <div className="flex flex-col items-center justify-center p-8 bg-amber-50/90 rounded-2xl border border-amber-200">
                  <AlertCircle className="w-10 h-10 text-amber-600 mb-3" />
                  <h4 className="text-lg font-bold text-amber-900">{t('telemetryNoLocationTitle')}</h4>
                  <p className="text-sm text-amber-800 text-center max-w-md mt-2 mb-4">{t('telemetryNoLocationDesc')}</p>
                  <Link to="/profile" className="px-5 py-2.5 bg-amber-700 text-white rounded-xl text-xs font-semibold hover:bg-amber-800 transition-colors shadow-sm">{t('telemetrySetupProfileBtn')}</Link>
                </div>
              ) : sentinelLoading ? (
                <div className="flex flex-col items-center justify-center p-8">
                  <Satellite className="w-12 h-12 text-emerald-600 animate-pulse mb-4" />
                  <p className="text-stone-600 font-bold animate-pulse text-sm">{t('telemetryLoadingSentinel')}</p>
                </div>
              ) : sentinelData?.feed_available && sentinelData.vegetation_indices ? (
                <div className="bg-white/95 rounded-2xl border border-stone-200 p-6 text-left w-full shadow-md">
                  <div className="flex flex-col sm:flex-row sm:items-start gap-4 border-b border-stone-100 pb-4 mb-4">
                    <Satellite className="w-8 h-8 text-emerald-700 shrink-0" />
                    <div>
                      <h4 className="font-bold text-stone-900 text-lg">{t('telemetryVegetationEstimatedLabel')}</h4>
                      <p className="text-sm text-stone-600">Estimated, not direct satellite measurement</p>
                    </div>
                  </div>
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
                    <div className="flex gap-3 items-start text-blue-900">
                      <Info className="w-5 h-5 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold block text-sm">{t('telemetryVegetationEstimatedLabel')}</span>
                        <span className="text-xs opacity-90 leading-relaxed mt-1 block">{t('telemetryVegetationEstimatedNote')}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 text-center">
                      <div className="text-xs font-bold text-stone-500 uppercase tracking-wide mb-1">{t('telemetryNdviLabel')}</div>
                      <div className="text-2xl font-black text-emerald-700">{sentinelData.vegetation_indices.mean_ndvi.toFixed(2)}</div>
                    </div>
                    <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 text-center">
                      <div className="text-xs font-bold text-stone-500 uppercase tracking-wide mb-1">{t('telemetryNdwiLabel')}</div>
                      <div className="text-2xl font-black text-blue-700">{sentinelData.vegetation_indices.mean_ndwi.toFixed(2)}</div>
                    </div>
                    <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 text-center">
                      <div className="text-xs font-bold text-stone-500 uppercase tracking-wide mb-1">{t('telemetryCanopyLabel')}</div>
                      <div className="text-sm font-extrabold text-stone-800 mt-2.5">Weather-derived estimate</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
                   <Satellite className="w-10 h-10 text-stone-400 mb-4" />
                   <h4 className="text-lg font-bold text-stone-900">{t('telemetryFeedPendingBadge')}</h4>
                   <p className="text-sm text-stone-600 mt-2">{sentinelData?.message || t('telemetryFetchError')}</p>
                </div>
              )
            ) : selectedLayer === 'agro_climatic' ? (
              agroClimaticLoading ? (
                <div className="flex flex-col items-center justify-center p-8">
                  <Compass className="w-12 h-12 text-emerald-600 animate-pulse mb-4" />
                  <p className="text-stone-600 font-bold animate-pulse text-sm">{t('telemetryAgroLoading')}</p>
                </div>
              ) : agroClimaticData?.features?.length ? (
                <div className="bg-white/95 rounded-2xl border border-stone-200 p-6 text-left w-full shadow-md">
                  <div className="flex flex-col sm:flex-row sm:items-start gap-4 border-b border-stone-100 pb-4 mb-4">
                    <Compass className="w-8 h-8 text-emerald-700 shrink-0" />
                    <div>
                      <h4 className="font-bold text-stone-900 text-lg">{t('telemetryAgroConnectedTitle')}</h4>
                      <p className="text-sm text-stone-600">{t('telemetryAgroConnectedSub')}</p>
                    </div>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                    <div className="flex gap-3 items-start text-emerald-900">
                      <Info className="w-5 h-5 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold block text-sm">{t('telemetryAgroPolygonsPrefix')}{agroClimaticData.features.length}</span>
                        <span className="text-xs opacity-90 leading-relaxed mt-1 block">{t('telemetryAgroOperationalPrefix')}{agroClimaticData.features.length}{t('telemetryAgroOperationalSuffix')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="mx-auto w-14 h-14 rounded-2xl bg-stone-200/80 border border-stone-300 flex items-center justify-center text-stone-500 shadow-xs">
                    <Compass className="w-8 h-8 text-emerald-800 animate-pulse" />
                  </div>
                  <div className="space-y-1 text-center max-w-md mx-auto">
                    <h4 className="text-base sm:text-lg font-bold text-stone-900">Geospatial Boundary Map Unavailable</h4>
                    <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                      {agroClimaticData && agroClimaticData.features?.length === 0 ? t('telemetryAgroEmptyDesc') : 'The official ICAR / Planning Commission agro-climatic vector layer is not yet connected to the backend GIS service. In adherence to our zero-fabricated-data charter, no placeholder boundaries or simulated polygons are rendered.'}
                    </p>
                  </div>
                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => handleCheckPipeline('/api/v1/telemetry/agro-climatic-zones')}
                      disabled={checkingPipeline}
                      className="min-h-11 px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs transition-all shadow-xs flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-emerald-600 active:scale-98 disabled:opacity-60"
                    >
                      <Server className="w-4 h-4" />
                      <span>
                        {checkingPipeline ? 'Checking Connection...' : 'Check Pipeline Connection'}
                      </span>
                    </button>
                  </div>
                </>
              )
            ) : null}
          </div>
        </div>

        {/* Live Pipeline Connection Check Result */}
        {pipelineStatusMsg && (
          <div
            role="status"
            className="p-4 rounded-xl border border-amber-300 bg-amber-50 text-amber-900 text-xs sm:text-sm flex items-start gap-3 animate-fadeIn"
          >
            <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="space-y-1 flex-1">
              <span className="font-bold text-amber-950 block">Pipeline Status Report</span>
              <p className="leading-relaxed text-amber-900/90">{pipelineStatusMsg.text}</p>
            </div>
            <button
              type="button"
              onClick={() => setPipelineStatusMsg(null)}
              className="text-amber-800 hover:text-amber-950 text-xs font-semibold underline shrink-0 min-h-6"
            >
              Close
            </button>
          </div>
        )}

        {/* Technical Specifications & Source Attribution Grid */}
        <div className="pt-4 border-t border-stone-200 space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500">
            {selectedLayer === 'agro_climatic'
              ? 'Geospatial Dataset Specifications (ICAR / Planning Commission)'
              : 'Earth Observation Constellation Specifications (Sentinel-2)'}
          </h4>

          {selectedLayer === 'agro_climatic' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-xl border border-stone-200 bg-stone-50">
                <span className="text-stone-500 block text-[11px]">Spatial Coverage</span>
                <span className="font-bold text-stone-900">15 Major National Zones</span>
              </div>
              <div className="p-3 rounded-xl border border-stone-200 bg-stone-50">
                <span className="text-stone-500 block text-[11px]">Sub-Regional Detail</span>
                <span className="font-bold text-stone-900">72 NARP Sub-Zones</span>
              </div>
              <div className="p-3 rounded-xl border border-stone-200 bg-stone-50">
                <span className="text-stone-500 block text-[11px]">Coordinate Datum</span>
                <span className="font-bold text-stone-900">EPSG:4326 (WGS 84)</span>
              </div>
              <div className="p-3 rounded-xl border border-stone-200 bg-stone-50">
                <span className="text-stone-500 block text-[11px]">Statutory Source</span>
                <span className="font-bold text-stone-900">ICAR & NBSS&LUP</span>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-xl border border-stone-200 bg-stone-50">
                <span className="text-stone-500 block text-[11px]">Constellation</span>
                <span className="font-bold text-stone-900">Copernicus Sentinel-2A / 2B</span>
              </div>
              <div className="p-3 rounded-xl border border-stone-200 bg-stone-50">
                <span className="text-stone-500 block text-[11px]">Ground Sample Distance</span>
                <span className="font-bold text-stone-900">10-Meter Resolution</span>
              </div>
              <div className="p-3 rounded-xl border border-stone-200 bg-stone-50">
                <span className="text-stone-500 block text-[11px]">Orbital Repeat Cadence</span>
                <span className="font-bold text-stone-900">Every 5 Days</span>
              </div>
              <div className="p-3 rounded-xl border border-stone-200 bg-stone-50">
                <span className="text-stone-500 block text-[11px]">Spectral Index Products</span>
                <span className="font-bold text-stone-900">NDVI, NDRE, NDWI</span>
              </div>
            </div>
          )}
        </div>
        </>
      )}
      </section>

      {/* Back to Home CTA */}
      <div className="pt-2">
        <Link
          to="/"
          className="inline-flex items-center gap-2 min-h-12 px-5 py-2.5 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 text-stone-800 font-medium text-sm transition-all focus:outline-none focus:ring-2 focus:ring-emerald-600 shadow-2xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Dashboard</span>
        </Link>
      </div>
    </div>
  );
};
