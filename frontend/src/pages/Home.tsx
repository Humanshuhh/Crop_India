import React from 'react';
import { Link } from 'react-router-dom';
import {
  Layers,
  Activity,
  ShieldCheck,
  Volume2,
  FileText,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Bot,
  ShieldAlert,
  History as HistoryIcon,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export const Home: React.FC = () => {
  const { t } = useLanguage();

  return (
    <div className="space-y-16 py-6 md:py-12">
      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-stone-900 text-stone-100 rounded-3xl p-6 sm:p-10 md:p-16 border border-stone-800 shadow-xl relative overflow-hidden">
          <div className="max-w-3xl space-y-6 relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-900/80 border border-emerald-700/80 text-emerald-300 text-xs sm:text-sm font-medium">
              <Sparkles className="w-4 h-4" aria-hidden="true" />
              <span>Digital Public Good for Smallholders</span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
              {t('heroTitle')}
            </h1>

            <p className="text-base sm:text-lg text-stone-300 leading-relaxed">
              {t('heroDescription')}
            </p>

            <div className="flex flex-col sm:flex-row flex-wrap gap-3.5 pt-4">
              <Link
                to="/khet-swasthya"
                className="inline-flex items-center justify-center gap-2.5 min-h-12 px-6 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-semibold text-sm sm:text-base shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 active:scale-98"
              >
                <Layers className="w-5 h-5" aria-hidden="true" />
                <span>{t('heroCtaKhet')}</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Link>

              <Link
                to="/fasal-rog-pehchan"
                className="inline-flex items-center justify-center gap-2.5 min-h-12 px-6 py-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-100 font-semibold text-sm sm:text-base border border-stone-700 transition-all focus:outline-none focus:ring-2 focus:ring-stone-400 active:scale-98"
              >
                <Activity className="w-5 h-5" aria-hidden="true" />
                <span>{t('heroCtaFasal')}</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Link>

              <Link
                to="/assistant"
                className="inline-flex items-center justify-center gap-2.5 min-h-12 px-6 py-3 rounded-xl bg-emerald-950/90 hover:bg-emerald-900 text-emerald-200 hover:text-white font-semibold text-sm sm:text-base border border-emerald-700/60 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-400 active:scale-98"
              >
                <Bot className="w-5 h-5 text-emerald-400" aria-hidden="true" />
                <span>Ask Kisan Mitra</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Core Values Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight">
            {t('coreValuesTitle')}
          </h2>
          <p className="mt-2 text-sm sm:text-base text-stone-600">
            Honest engineering designed around the lived reality of smallholder agriculture.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Zero Fake Data */}
          <div className="rounded-2xl border border-stone-200 bg-white p-6 sm:p-8 shadow-xs">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center mb-4">
              <ShieldCheck className="w-6 h-6" aria-hidden="true" />
            </div>
            <h3 className="text-lg font-bold text-stone-900 mb-2">
              {t('zeroFakeDataTitle')}
            </h3>
            <p className="text-sm text-stone-600 leading-relaxed">
              {t('zeroFakeDataDesc')}
            </p>
          </div>

          {/* Voice & Accessibility */}
          <div className="rounded-2xl border border-stone-200 bg-white p-6 sm:p-8 shadow-xs">
            <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center mb-4">
              <Volume2 className="w-6 h-6" aria-hidden="true" />
            </div>
            <h3 className="text-lg font-bold text-stone-900 mb-2">
              {t('accessibilityTitle')}
            </h3>
            <p className="text-sm text-stone-600 leading-relaxed">
              {t('accessibilityDesc')}
            </p>
          </div>

          {/* Transparency */}
          <div className="rounded-2xl border border-stone-200 bg-white p-6 sm:p-8 shadow-xs">
            <div className="w-12 h-12 rounded-xl bg-stone-100 text-stone-800 flex items-center justify-center mb-4">
              <FileText className="w-6 h-6" aria-hidden="true" />
            </div>
            <h3 className="text-lg font-bold text-stone-900 mb-2">
              {t('transparencyTitle')}
            </h3>
            <p className="text-sm text-stone-600 leading-relaxed">
              {t('transparencyDesc')}
            </p>
          </div>
        </div>
      </section>

      {/* Feature Cards Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight">
              {t('exploreFeaturesTitle')}
            </h2>
            <p className="text-xs sm:text-sm text-stone-600 mt-1">
              Field-ready agricultural tools built with authentic agronomic models.
            </p>
          </div>
          <Link
            to="/data-sources"
            className="text-xs sm:text-sm font-semibold text-emerald-800 hover:text-emerald-950 underline underline-offset-4 hidden sm:inline-block"
          >
            {t('navDataSources')} →
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Card 1: Khet Swasthya */}
          <div className="rounded-2xl border border-stone-200 bg-white p-6 sm:p-7 flex flex-col justify-between shadow-xs hover:border-emerald-300 transition-colors">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="p-3 rounded-xl bg-emerald-50 text-emerald-700">
                  <Layers className="w-6 h-6" aria-hidden="true" />
                </span>
                <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  Live Advisory API
                </span>
              </div>
              <h3 className="text-xl font-bold text-stone-900">
                {t('khetTitle')}
              </h3>
              <p className="text-sm text-stone-600 leading-relaxed">
                Input Soil Health Card test values to receive agro-climatic zone classification, soil deficit warnings, and chemical-free biological restoration protocols.
              </p>
              <ul className="space-y-2 text-xs sm:text-sm text-stone-700 pt-2">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>GPS agro-climatic zone resolution</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Soil organic carbon deficit warnings</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Regenerative green manuring & rotation plans</span>
                </li>
              </ul>
            </div>
            <div className="pt-6 mt-6 border-t border-stone-100">
              <Link
                to="/khet-swasthya"
                className="w-full inline-flex items-center justify-center gap-2 min-h-12 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-medium text-sm transition-colors"
              >
                <span>{t('heroCtaKhet')}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Card 2: Fasal Rog Pehchan */}
          <div className="rounded-2xl border border-stone-200 bg-white p-6 sm:p-7 flex flex-col justify-between shadow-xs hover:border-emerald-300 transition-colors">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="p-3 rounded-xl bg-emerald-50 text-emerald-700">
                  <Activity className="w-6 h-6" aria-hidden="true" />
                </span>
                <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  Multimodal Leaf API
                </span>
              </div>
              <h3 className="text-xl font-bold text-stone-900">
                {t('fasalTitle')}
              </h3>
              <p className="text-sm text-stone-600 leading-relaxed">
                Capture or upload an image of a diseased crop leaf to identify visual symptoms, pathogen classification, authentic confidence rating, and home bio-remedies.
              </p>
              <ul className="space-y-2 text-xs sm:text-sm text-stone-700 pt-2">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Phone camera capture or image upload</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Authentic diagnosis confidence levels</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Eco-friendly, chemical-free home remedies</span>
                </li>
              </ul>
            </div>
            <div className="pt-6 mt-6 border-t border-stone-100">
              <Link
                to="/fasal-rog-pehchan"
                className="w-full inline-flex items-center justify-center gap-2 min-h-12 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-medium text-sm transition-colors"
              >
                <span>{t('heroCtaFasal')}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Card 3: Kisan Mitra (Farmer Assistant) */}
          <div className="rounded-2xl border border-stone-200 bg-white p-6 sm:p-7 flex flex-col justify-between shadow-xs hover:border-emerald-300 transition-colors">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="p-3 rounded-xl bg-emerald-50 text-emerald-700">
                  <Bot className="w-6 h-6" aria-hidden="true" />
                </span>
                <span className="text-xs font-semibold text-amber-900 bg-amber-100 px-2.5 py-1 rounded-full border border-amber-300">
                  Voice & Vision Ready
                </span>
              </div>
              <h3 className="text-xl font-bold text-stone-900">
                Kisan Mitra Assistant
              </h3>
              <p className="text-sm text-stone-600 leading-relaxed">
                Multilingual agricultural assistant for natural farming inquiries, bio-fertilizer preparation recipes (Jeevamrit, Beejamrit), and seasonal crop care via speech or text.
              </p>
              <ul className="space-y-2 text-xs sm:text-sm text-stone-700 pt-2">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Native Indian language speech-to-text</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Structured step-by-step guidance</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Verified agronomic source citations</span>
                </li>
              </ul>
            </div>
            <div className="pt-6 mt-6 border-t border-stone-100">
              <Link
                to="/assistant"
                className="w-full inline-flex items-center justify-center gap-2 min-h-12 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-medium text-sm transition-colors"
              >
                <span>Consult Kisan Mitra</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Card 4: Kisaan Telemetry & Early Warning */}
          <div className="rounded-2xl border border-stone-200 bg-white p-6 sm:p-7 flex flex-col justify-between shadow-xs hover:border-emerald-300 transition-colors">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="p-3 rounded-xl bg-amber-50 text-amber-800">
                  <ShieldAlert className="w-6 h-6" aria-hidden="true" />
                </span>
                <span className="text-xs font-semibold text-stone-700 bg-stone-100 px-2.5 py-1 rounded-full border border-stone-300">
                  Telemetry Specification
                </span>
              </div>
              <h3 className="text-xl font-bold text-stone-900">
                {t('navTelemetry')} & Early Warning
              </h3>
              <p className="text-sm text-stone-600 leading-relaxed">
                Proactive risk monitoring combining satellite vegetation indices (Sentinel-2 NDVI), microclimate weather forecasts, and disease outbreak warnings.
              </p>
              <ul className="space-y-2 text-xs sm:text-sm text-stone-700 pt-2">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>High, Moderate & Low risk classification</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Foliar moisture microclimate alerts</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Proactive preventative biocontrol measures</span>
                </li>
              </ul>
            </div>
            <div className="pt-6 mt-6 border-t border-stone-100">
              <Link
                to="/kisaan-telemetry"
                className="w-full inline-flex items-center justify-center gap-2 min-h-12 px-4 py-2.5 rounded-xl border border-stone-300 hover:bg-stone-50 text-stone-800 font-medium text-sm transition-colors"
              >
                <span>Inspect Telemetry Prototype</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Card 5: Diagnostic History */}
          <div className="rounded-2xl border border-stone-200 bg-white p-6 sm:p-7 flex flex-col justify-between shadow-xs hover:border-emerald-300 transition-colors">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="p-3 rounded-xl bg-stone-100 text-stone-700">
                  <HistoryIcon className="w-6 h-6" aria-hidden="true" />
                </span>
                <span className="text-xs font-semibold text-stone-700 bg-stone-100 px-2.5 py-1 rounded-full border border-stone-300">
                  Chronological Timeline
                </span>
              </div>
              <h3 className="text-xl font-bold text-stone-900">
                Farm Advisory History
              </h3>
              <p className="text-sm text-stone-600 leading-relaxed">
                Centralized record of all past soil card evaluations, crop leaf pathology scans, and early warning risk alerts saved on your device.
              </p>
              <ul className="space-y-2 text-xs sm:text-sm text-stone-700 pt-2">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Categorized timeline filters</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Detailed previous prescription views</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Honest local-first memory retention</span>
                </li>
              </ul>
            </div>
            <div className="pt-6 mt-6 border-t border-stone-100">
              <Link
                to="/history"
                className="w-full inline-flex items-center justify-center gap-2 min-h-12 px-4 py-2.5 rounded-xl border border-stone-300 hover:bg-stone-50 text-stone-800 font-medium text-sm transition-colors"
              >
                <span>View Advisory History</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
