import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import type { CropDiagnosisResponse } from '../types/diagnosis.types';
import type { RegenerativeAdvisoryResponse } from '../types/soil.types';
import type { AssistantMessage } from '../types/assistant.types';
import type { NormalizedError } from '../types/api.types';
import type { WeatherForecastData } from '../types/telemetry.types';
import { useAuth } from './AuthContext';

export type RequestStatus = 'idle' | 'loading' | 'success' | 'error';

export const WEATHER_CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

export interface CachedWeather {
  data: WeatherForecastData;
  latitude: number;
  longitude: number;
  timestamp: number;
  userScope: string | null;
}

export function isCoordinateMatch(lat1: number, lon1: number, lat2: number, lon2: number): boolean {
  return Math.abs(lat1 - lat2) < 0.001 && Math.abs(lon1 - lon2) < 0.001;
}

export function getSessionWeatherCache(userScope: string | null): CachedWeather | null {
  if (typeof window === 'undefined' || typeof sessionStorage === 'undefined') return null;
  try {
    const key = `kisan_weather_cache_${userScope || 'guest'}`;
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedWeather;
    if (!parsed || !parsed.data || typeof parsed.timestamp !== 'number') return null;
    if (parsed.userScope !== (userScope || null)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function setSessionWeatherCache(cache: CachedWeather): void {
  if (typeof window === 'undefined' || typeof sessionStorage === 'undefined') return;
  try {
    const key = `kisan_weather_cache_${cache.userScope || 'guest'}`;
    sessionStorage.setItem(key, JSON.stringify(cache));
  } catch {}
}

export function clearSessionWeatherCache(userScope: string | null): void {
  if (typeof window === 'undefined' || typeof sessionStorage === 'undefined') return;
  try {
    const key = `kisan_weather_cache_${userScope || 'guest'}`;
    sessionStorage.removeItem(key);
  } catch {}
}

export type CropCache = {
  result: CropDiagnosisResponse | null;
  selectedFile: File | null;
  imagePreviewUrl: string | null;
  status: RequestStatus;
  error: NormalizedError | null;
};

export type SoilCache = {
  report: RegenerativeAdvisoryResponse | null;
  submittedData: any | null;
  status: RequestStatus;
  error: NormalizedError | null;
  inputOrigin: 'OFFICIAL_SHC' | 'FARMER_ESTIMATE';
  coords: { latitude: string; longitude: string };
  shcValues: {
    ph: string;
    soc: string;
    n: string;
    p: string;
    k: string;
    zn: string;
  };
  weatherCache: CachedWeather | null;
};

export type AssistantCache = {
  messages: AssistantMessage[];
  showDemoPreview: boolean;
  inputText: string;
  selectedImage: File | null;
  imagePreviewUrl: string | null;
};

interface ResultCacheContextType {
  cropCache: CropCache;
  setCropCache: React.Dispatch<React.SetStateAction<CropCache>>;
  soilCache: SoilCache;
  setSoilCache: React.Dispatch<React.SetStateAction<SoilCache>>;
  assistantCache: AssistantCache;
  setAssistantCache: React.Dispatch<React.SetStateAction<AssistantCache>>;
  resetCaches: () => void;
}

const defaultContext: ResultCacheContextType = {
  cropCache: { result: null, selectedFile: null, imagePreviewUrl: null, status: 'idle', error: null },
  setCropCache: () => {},
  soilCache: {
    report: null,
    submittedData: null,
    status: 'idle',
    error: null,
    inputOrigin: 'OFFICIAL_SHC',
    coords: { latitude: '', longitude: '' },
    shcValues: { ph: '', soc: '', n: '', p: '', k: '', zn: '' },
    weatherCache: null,
  },
  setSoilCache: () => {},
  assistantCache: { messages: [], showDemoPreview: false, inputText: '', selectedImage: null, imagePreviewUrl: null },
  setAssistantCache: () => {},
  resetCaches: () => {},
};

const ResultCacheContext = createContext<ResultCacheContextType>(defaultContext);

export const ResultCacheProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [cropCache, setCropCache] = useState<CropCache>(defaultContext.cropCache);
  const [soilCache, setSoilCache] = useState<SoilCache>(defaultContext.soilCache);
  const [assistantCache, setAssistantCache] = useState<AssistantCache>(defaultContext.assistantCache);
  const currentUidRef = useRef<string | null>(user?.uid || null);

  const resetCaches = () => {
    setCropCache(defaultContext.cropCache);
    setSoilCache(defaultContext.soilCache);
    setAssistantCache(defaultContext.assistantCache);
    clearSessionWeatherCache(currentUidRef.current);
  };

  // Invalidate in-memory caches whenever authenticated identity changes or logs out
  useEffect(() => {
    const nextUid = user?.uid || null;
    if (currentUidRef.current !== nextUid) {
      currentUidRef.current = nextUid;
      resetCaches();
    }
  }, [user?.uid]);

  return (
    <ResultCacheContext.Provider
      value={{
        cropCache,
        setCropCache,
        soilCache,
        setSoilCache,
        assistantCache,
        setAssistantCache,
        resetCaches,
      }}
    >
      {children}
    </ResultCacheContext.Provider>
  );
};

export const useResultCache = () => useContext(ResultCacheContext);
