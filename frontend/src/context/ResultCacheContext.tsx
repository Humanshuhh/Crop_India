import React, { createContext, useContext, useState } from 'react';
import type { CropDiagnosisResponse } from '../types/diagnosis.types';
import type { RegenerativeAdvisoryResponse } from '../types/soil.types';
import type { AssistantMessage } from '../types/assistant.types';
import type { NormalizedError } from '../types/api.types';

export type RequestStatus = 'idle' | 'loading' | 'success' | 'error';

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
    coords: { latitude: '26.8467', longitude: '80.9462' },
    shcValues: { ph: '7.2', soc: '0.42', n: '210', p: '14', k: '160', zn: '0.48' },
  },
  setSoilCache: () => {},
  assistantCache: { messages: [], showDemoPreview: false, inputText: '', selectedImage: null, imagePreviewUrl: null },
  setAssistantCache: () => {},
};

const ResultCacheContext = createContext<ResultCacheContextType>(defaultContext);

export const ResultCacheProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cropCache, setCropCache] = useState<CropCache>(defaultContext.cropCache);
  const [soilCache, setSoilCache] = useState<SoilCache>(defaultContext.soilCache);
  const [assistantCache, setAssistantCache] = useState<AssistantCache>(defaultContext.assistantCache);

  return (
    <ResultCacheContext.Provider
      value={{
        cropCache,
        setCropCache,
        soilCache,
        setSoilCache,
        assistantCache,
        setAssistantCache,
      }}
    >
      {children}
    </ResultCacheContext.Provider>
  );
};

export const useResultCache = () => useContext(ResultCacheContext);

