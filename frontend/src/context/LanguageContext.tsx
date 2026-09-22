import React, { createContext, useContext, useState, useEffect } from 'react';
import type { SupportedLanguage, TranslationDictionary, LanguageOption } from '../types/i18n.types';
import { dictionaries, SUPPORTED_LANGUAGES } from '../i18n';

interface LanguageContextType {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  t: (key: keyof TranslationDictionary) => string;
  isFallback: (key: keyof TranslationDictionary) => boolean;
  supportedLanguages: LanguageOption[];
  currentLanguageMeta: LanguageOption;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const LANGUAGE_STORAGE_KEY = 'kisan_sahayak_lang';

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<SupportedLanguage>(() => {
    const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY) as SupportedLanguage;
    if (saved && SUPPORTED_LANGUAGES.some((l) => l.code === saved)) {
      return saved;
    }
    return 'en';
  });

  const setLanguage = (lang: SupportedLanguage) => {
    if (SUPPORTED_LANGUAGES.some((l) => l.code === lang)) {
      setLanguageState(lang);
      localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
      document.documentElement.lang = lang;
    }
  };

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const t = (key: keyof TranslationDictionary): string => {
    const activeDict = dictionaries[language];
    if (activeDict && activeDict[key]) {
      return activeDict[key];
    }
    // Graceful fallback to English with no false claim
    return dictionaries.en[key] || String(key);
  };

  const isFallback = (key: keyof TranslationDictionary): boolean => {
    if (language === 'en') return false;
    const activeDict = dictionaries[language];
    return !activeDict || !activeDict[key];
  };

  const currentLanguageMeta =
    SUPPORTED_LANGUAGES.find((l) => l.code === language) || SUPPORTED_LANGUAGES[0];

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t,
        isFallback,
        supportedLanguages: SUPPORTED_LANGUAGES,
        currentLanguageMeta,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
