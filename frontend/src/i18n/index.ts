import type { SupportedLanguage, TranslationDictionary } from '../types/i18n.types';
import { en } from './en';
import { hi } from './hi';
import { bn } from './bn';
import { te } from './te';
import { ta } from './ta';
import { mr } from './mr';

export const dictionaries: Record<SupportedLanguage, TranslationDictionary> = {
  en,
  hi,
  bn,
  te,
  ta,
  mr,
};

export * from './languages';
