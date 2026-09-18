import React from 'react';
import { Volume2, Square, AlertCircle } from 'lucide-react';
import { useVoice } from '../../context/VoiceContext';
import { useLanguage } from '../../context/LanguageContext';
import type { SupportedLanguage } from '../../types/i18n.types';

interface VoiceReaderButtonProps {
  textToRead: string;
  contentId: string;
  sentences?: string[];
  label?: string;
  className?: string;
  language?: SupportedLanguage;
}

export const VoiceReaderButton: React.FC<VoiceReaderButtonProps> = ({
  textToRead,
  contentId,
  sentences,
  label,
  className = '',
  language: languageProp,
}) => {
  const {
    isSpeaking,
    activeContentId,
    speak,
    stop,
    voiceNotice,
    voiceNoticeLanguage,
    clearVoiceNotice,
  } = useVoice();
  const { t, language: uiLanguage } = useLanguage();

  const activeLanguage = languageProp || uiLanguage;

  // Clear previous voice notices whenever the active language or UI language changes
  React.useEffect(() => {
    clearVoiceNotice();
  }, [activeLanguage, uiLanguage, clearVoiceNotice]);

  const isCurrentActive = isSpeaking && activeContentId === contentId;

  const handleToggle = () => {
    if (isCurrentActive) {
      stop();
    } else {
      speak(textToRead, contentId, sentences, activeLanguage);
    }
  };

  // Only display notice if it applies to this button's active language
  const shouldShowNotice =
    Boolean(voiceNotice) &&
    (voiceNoticeLanguage === null || voiceNoticeLanguage === activeLanguage);

  return (
    <div className="inline-flex flex-col gap-1.5">
      <button
        type="button"
        onClick={handleToggle}
        className={`inline-flex items-center justify-center gap-2 min-h-12 min-w-12 px-4 py-2.5 rounded-lg font-medium text-sm transition-all focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2 select-none active:scale-98 ${
          isCurrentActive
            ? 'bg-rose-700 text-white hover:bg-rose-800 shadow-sm'
            : 'bg-emerald-700 text-white hover:bg-emerald-800 shadow-sm'
        } ${className}`}
        aria-pressed={isCurrentActive}
        aria-label={isCurrentActive ? t('voiceStop') : (label || t('voiceReadAloud'))}
      >
        {isCurrentActive ? (
          <>
            <Square className="w-4 h-4 fill-current animate-pulse" aria-hidden="true" />
            <span>{t('voiceStop')}</span>
          </>
        ) : (
          <>
            <Volume2 className="w-4 h-4" aria-hidden="true" />
            <span>{label || t('voiceReadAloud')}</span>
          </>
        )}
      </button>

      {shouldShowNotice && (
        <div
          role="status"
          className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded p-2 flex items-start gap-1.5 mt-1 animate-fadeIn"
        >
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="flex-1">
            <p>{voiceNotice}</p>
            <button
              type="button"
              onClick={clearVoiceNotice}
              className="text-amber-900 underline font-semibold mt-1 text-[11px] hover:text-amber-950"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
