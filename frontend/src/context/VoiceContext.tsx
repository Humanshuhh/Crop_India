import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useLanguage } from './LanguageContext';
import type { SupportedLanguage } from '../types/i18n.types';

interface VoiceContextType {
  isSpeaking: boolean;
  activeContentId: string | null;
  currentSentenceIndex: number;
  voiceNotice: string | null;
  clearVoiceNotice: () => void;
  speak: (text: string, contentId: string, sentences?: string[]) => void;
  stop: () => void;
  isLanguageVoiceSupported: (lang: SupportedLanguage) => boolean;
}

const VoiceContext = createContext<VoiceContextType | undefined>(undefined);

export const VoiceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { language, currentLanguageMeta } = useLanguage();
  const location = useLocation();

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [activeContentId, setActiveContentId] = useState<string | null>(null);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState<number>(-1);
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

  const sentencesRef = useRef<string[]>([]);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Load available speech synthesis voices
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    const updateVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      setAvailableVoices(voices);
    };

    updateVoices();
    window.speechSynthesis.onvoiceschanged = updateVoices;

    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  const stop = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setActiveContentId(null);
    setCurrentSentenceIndex(-1);
    sentencesRef.current = [];
    utteranceRef.current = null;
  }, []);

  // Rule: Playback MUST stop automatically on route change
  useEffect(() => {
    stop();
  }, [location.pathname, stop]);

  // Rule: Playback MUST stop automatically on language change
  useEffect(() => {
    stop();
  }, [language, stop]);

  // Check whether device has voice for selected language
  const findMatchingVoice = useCallback(
    (targetLang: SupportedLanguage): SpeechSynthesisVoice | null => {
      if (availableVoices.length === 0) return null;

      const langMap: Record<SupportedLanguage, string[]> = {
        en: ['en-IN', 'en-US', 'en-GB', 'en'],
        hi: ['hi-IN', 'hi'],
        bn: ['bn-IN', 'bn-BD', 'bn'],
        te: ['te-IN', 'te'],
        ta: ['ta-IN', 'ta-LK', 'ta'],
        mr: ['mr-IN', 'mr'],
      };

      const preferredCodes = langMap[targetLang] || ['en'];

      for (const code of preferredCodes) {
        const exactMatch = availableVoices.find(
          (v) => v.lang.toLowerCase() === code.toLowerCase()
        );
        if (exactMatch) return exactMatch;
      }

      for (const code of preferredCodes) {
        const prefix = code.split('-')[0].toLowerCase();
        const prefixMatch = availableVoices.find((v) =>
          v.lang.toLowerCase().startsWith(prefix)
        );
        if (prefixMatch) return prefixMatch;
      }

      return null;
    },
    [availableVoices]
  );

  const isLanguageVoiceSupported = useCallback(
    (lang: SupportedLanguage): boolean => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) return false;
      if (availableVoices.length === 0) return true;
      return findMatchingVoice(lang) !== null;
    },
    [availableVoices, findMatchingVoice]
  );

  const speak = (rawText: string, contentId: string, customSentences?: string[]) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setVoiceNotice('Speech synthesis is not supported on this browser.');
      return;
    }

    // Stop any existing playback
    stop();

    // Clean text: strip HTML/SSML tags per requirement §5
    const cleanText = rawText.replace(/<[^>]*>/g, '').trim();
    if (!cleanText) return;

    // Check voice support for current language
    const voice = findMatchingVoice(language);
    if (!voice && availableVoices.length > 0) {
      setVoiceNotice(
        `Voice playback in ${currentLanguageMeta.name} (${currentLanguageMeta.nativeName}) is not available on this device.`
      );
      return;
    }

    // Sentence splitting for visual tracking
    const sentences =
      customSentences && customSentences.length > 0
        ? customSentences
        : cleanText
            .split(/(?<=[.?!।\n])\s+/)
            .map((s) => s.trim())
            .filter(Boolean);

    sentencesRef.current = sentences;
    setActiveContentId(contentId);
    setCurrentSentenceIndex(0);
    setIsSpeaking(true);
    setVoiceNotice(null);

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utteranceRef.current = utterance;

    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    } else {
      utterance.lang = currentLanguageMeta.voiceLangCode;
    }

    utterance.rate = 0.95; // Slightly slower pace for clarity in agricultural terms
    utterance.pitch = 1.0;

    // Boundary tracking for sentence-level visual highlight
    utterance.onboundary = (event) => {
      if (event.name === 'sentence' || event.name === 'word') {
        const charIndex = event.charIndex;
        let cumulative = 0;
        for (let i = 0; i < sentences.length; i++) {
          cumulative += sentences[i].length + 1;
          if (charIndex < cumulative) {
            setCurrentSentenceIndex(i);
            break;
          }
        }
      }
    };

    utterance.onend = () => {
      stop();
    };

    utterance.onerror = (e) => {
      if (e.error !== 'interrupted' && e.error !== 'canceled') {
        console.error('[Kisan Sahayak Voice] Utterance error:', e);
        setVoiceNotice('Voice playback encountered an error.');
      }
      stop();
    };

    window.speechSynthesis.speak(utterance);
  };

  const clearVoiceNotice = () => setVoiceNotice(null);

  return (
    <VoiceContext.Provider
      value={{
        isSpeaking,
        activeContentId,
        currentSentenceIndex,
        voiceNotice,
        clearVoiceNotice,
        speak,
        stop,
        isLanguageVoiceSupported,
      }}
    >
      {children}
    </VoiceContext.Provider>
  );
};

export const useVoice = (): VoiceContextType => {
  const context = useContext(VoiceContext);
  if (!context) {
    throw new Error('useVoice must be used within a VoiceProvider');
  }
  return context;
};
