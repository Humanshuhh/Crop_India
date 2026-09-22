import type { LanguageOption } from '../types/i18n.types';

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'en', name: 'English', nativeName: 'English', voiceLangCode: 'en-IN' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', voiceLangCode: 'hi-IN' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', voiceLangCode: 'bn-IN' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', voiceLangCode: 'te-IN' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', voiceLangCode: 'ta-IN' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', voiceLangCode: 'mr-IN' },
];
