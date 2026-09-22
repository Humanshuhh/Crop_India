import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

const ONBOARDING_KEY = 'kisan_onboarding_done';

export const Welcome: React.FC = () => {
  const { language, setLanguage, t, supportedLanguages } = useLanguage();
  const navigate = useNavigate();

  const handleLanguageSelect = (code: string) => {
    // setLanguage handles localStorage + document.lang — no reload needed
    setLanguage(code as Parameters<typeof setLanguage>[0]);
  };

  const handleContinue = () => {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    navigate('/');
  };

  const handleLogin = () => {
    navigate('/login');
  };

  const handleSignup = () => {
    navigate('/signup');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-stone-50 to-emerald-100 flex flex-col items-center justify-center px-4 py-8 animate-fadeIn">
      {/* Logo / Brand */}
      <div className="mb-6 flex flex-col items-center gap-2">
        <div className="w-16 h-16 rounded-2xl bg-emerald-700 flex items-center justify-center shadow-lg">
          <span className="text-3xl">🌾</span>
        </div>
        <span className="text-emerald-800 font-bold text-xl tracking-wide">Crop India</span>
      </div>

      {/* Greeting */}
      <h1 className="text-3xl sm:text-4xl font-bold text-stone-900 text-center leading-tight mb-3">
        {t('welcomeGreeting')}
      </h1>
      <p className="text-stone-600 text-center text-base sm:text-lg max-w-md mb-8">
        {t('welcomeSubtitle')}
      </p>

      {/* Language selection label */}
      <p className="text-xs font-semibold uppercase tracking-widest text-stone-400 mb-3">
        {t('welcomeSelectLanguage')}
      </p>

      {/* Language cards grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full max-w-sm mb-8">
        {supportedLanguages.map((lang) => {
          const isSelected = language === lang.code;
          return (
            <button
              key={lang.code}
              onClick={() => handleLanguageSelect(lang.code)}
              className={[
                'flex flex-col items-center justify-center gap-1 rounded-xl border-2 py-4 px-2 transition-all duration-150 min-h-[72px] cursor-pointer select-none',
                isSelected
                  ? 'border-emerald-600 bg-emerald-50 shadow-md ring-2 ring-emerald-300'
                  : 'border-stone-200 bg-white hover:border-emerald-400 hover:bg-emerald-50 active:scale-95',
              ].join(' ')}
              aria-pressed={isSelected}
              aria-label={`${lang.name} – ${lang.nativeName}`}
            >
              <span className="text-lg font-bold text-stone-800 leading-tight">
                {lang.nativeName}
              </span>
              <span className="text-xs text-stone-500">{lang.name}</span>
              {isSelected && (
                <span className="mt-1 text-emerald-600 text-sm font-bold leading-none">✓</span>
              )}
            </button>
          );
        })}
      </div>

      {/* CTA buttons */}
      <div className="flex flex-col gap-3 w-full max-w-sm">
        <button
          onClick={handleContinue}
          className="w-full min-h-14 rounded-2xl bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white text-lg font-semibold shadow-md transition-colors duration-150"
        >
          {t('welcomeContinueBtn')}
        </button>
        <div className="flex gap-3">
          <button
            onClick={handleLogin}
            className="flex-1 min-h-12 rounded-xl border-2 border-emerald-700 text-emerald-800 font-semibold text-sm hover:bg-emerald-50 active:bg-emerald-100 transition-colors duration-150"
          >
            {t('welcomeLoginBtn')}
          </button>
          <button
            onClick={handleSignup}
            className="flex-1 min-h-12 rounded-xl border-2 border-stone-300 text-stone-700 font-semibold text-sm hover:bg-stone-100 active:bg-stone-200 transition-colors duration-150"
          >
            {t('welcomeSignupBtn')}
          </button>
        </div>
      </div>
    </div>
  );
};

