import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  Layers,
  Bot,
  ShieldAlert,
  History as HistoryIcon,
  MapPin,
  Trees,
  ArrowRight,
  Sparkles,
  PhoneCall,
  CheckCircle2,
  AlertTriangle,
  FileText,
  User,
  ExternalLink,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { getFarmerHistory } from '../services/history';
import type { HistoryItem } from '../types/history.types';
import type { FarmerProfile } from '../types/profile.types';

export const Home: React.FC = () => {
  const { t } = useLanguage();
  const { user } = useAuth();

  const [profile, setProfile] = useState<FarmerProfile | null>(null);
  const [recentHistory, setRecentHistory] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const farmerId = user ? `KS-${user.uid.slice(0, 8).toUpperCase()}` : '';

  // 1. Load Farmer Profile (Local persistence & cloud sync)
  useEffect(() => {
    if (user) {
      try {
        const saved = localStorage.getItem(`kisan_farmer_profile_${user.uid}`);
        if (saved) {
          const parsed = JSON.parse(saved) as FarmerProfile;
          setProfile(parsed);
        }
      } catch (e) {
        console.warn('[Home Dashboard] Could not parse local farmer profile', e);
      }
    } else {
      // Check if a guest/demo profile was configured
      try {
        const saved = localStorage.getItem('kisan_farmer_profile_guest');
        if (saved) {
          setProfile(JSON.parse(saved) as FarmerProfile);
        }
      } catch {
        // ignore
      }
    }
  }, [user]);

  // 2. Load Real Recent Activity from History Service
  useEffect(() => {
    if (farmerId) {
      setHistoryLoading(true);
      getFarmerHistory(farmerId)
        .then((items) => {
          if (Array.isArray(items)) {
            setRecentHistory(items.slice(0, 3));
          }
        })
        .catch(() => {
          // Backend history API may be pending or empty; adherence to zero-fabrication policy
          setRecentHistory([]);
        })
        .finally(() => {
          setHistoryLoading(false);
        });
    }
  }, [farmerId]);

  // Greeting logic: use real farmer name if present, else generic
  const farmerName = profile?.fullName?.trim() || user?.displayName?.trim();
  const greetingText = farmerName ? `Namaste, ${farmerName}` : t('farmerGreeting');

  // Check if profile has genuine location or crops data
  const hasFarmLocation = Boolean(profile?.village || profile?.district || profile?.state);
  const hasFarmCrops = Boolean(profile?.primaryCrops);
  const hasFarmLand = Boolean(profile?.landArea);
  const hasAnyFarmData = hasFarmLocation || hasFarmCrops || hasFarmLand;

  // Active Advisory logic: real advisory only if present in recent evaluations
  const activeAdvisory = recentHistory.find(
    (item) => item.type === 'early_warning' || item.status_or_confidence?.toLowerCase().includes('high')
  );

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10 space-y-8">
      {/* 1. GREETING & FARM CONTEXT SECTION */}
      <section className="bg-stone-900 text-stone-100 rounded-3xl p-6 sm:p-8 md:p-10 border border-stone-800 shadow-xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-800 pb-6">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950 border border-emerald-700/80 text-emerald-400 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{t('appTitle')} — Decision Support</span>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-white">
              {greetingText}
            </h1>
            <p className="text-xs sm:text-sm text-stone-400">
              {t('appTagline')}
            </p>
          </div>

          <Link
            to="/profile"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs sm:text-sm font-semibold border border-stone-700 transition-colors shrink-0 focus:outline-none focus:ring-2 focus:ring-emerald-400 min-h-[44px]"
          >
            <User className="w-4 h-4 text-emerald-400" aria-hidden="true" />
            <span>{hasAnyFarmData ? t('navProfile') : t('setupFarmAction')}</span>
          </Link>
        </div>

        {/* Real Farm Context Bar */}
        {hasAnyFarmData ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1 text-xs">
            {/* Location */}
            <div className="p-3.5 rounded-2xl bg-stone-800/80 border border-stone-700/80 flex items-start gap-3">
              <span className="p-2 rounded-xl bg-emerald-900/60 text-emerald-400 shrink-0">
                <MapPin className="w-4 h-4" aria-hidden="true" />
              </span>
              <div>
                <span className="text-stone-400 block font-medium">{t('locationLabel')}</span>
                <span className="text-stone-100 font-bold text-sm">
                  {[profile?.village, profile?.district, profile?.state].filter(Boolean).join(', ') || '—'}
                </span>
              </div>
            </div>

            {/* Registered Crops */}
            <div className="p-3.5 rounded-2xl bg-stone-800/80 border border-stone-700/80 flex items-start gap-3">
              <span className="p-2 rounded-xl bg-amber-900/60 text-amber-400 shrink-0">
                <Trees className="w-4 h-4" aria-hidden="true" />
              </span>
              <div>
                <span className="text-stone-400 block font-medium">{t('primaryCropsLabel')}</span>
                <span className="text-stone-100 font-bold text-sm truncate max-w-xs block">
                  {profile?.primaryCrops || '—'}
                </span>
              </div>
            </div>

            {/* Land Area */}
            <div className="p-3.5 rounded-2xl bg-stone-800/80 border border-stone-700/80 flex items-start gap-3">
              <span className="p-2 rounded-xl bg-blue-900/60 text-blue-400 shrink-0">
                <Layers className="w-4 h-4" aria-hidden="true" />
              </span>
              <div>
                <span className="text-stone-400 block font-medium">{t('landAreaLabel')}</span>
                <span className="text-stone-100 font-bold text-sm">
                  {profile?.landArea ? `${profile.landArea} ${profile.landUnit || 'acres'}` : '—'}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-stone-800/60 border border-dashed border-stone-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 text-stone-300">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" aria-hidden="true" />
              <span>{t('noFarmProfile')}</span>
            </div>
            <Link
              to="/profile"
              className="text-emerald-400 hover:text-emerald-300 font-semibold underline underline-offset-4 inline-flex items-center gap-1"
            >
              <span>{t('setupFarmAction')}</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </Link>
          </div>
        )}
      </section>

      {/* 2. IMPORTANT REAL ADVISORY / WARNING SECTION */}
      <section aria-label="Farm Advisory Section">
        {activeAdvisory ? (
          <div className="p-6 rounded-3xl bg-amber-50 border-2 border-amber-300 text-stone-900 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-sm uppercase tracking-wider">
                <ShieldAlert className="w-5 h-5 text-amber-700" aria-hidden="true" />
                <span>{t('activeAdvisoryTitle')}</span>
              </div>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-200 text-amber-950">
                {activeAdvisory.status_or_confidence || 'Attention Needed'}
              </span>
            </div>
            <h3 className="text-lg font-bold text-stone-900">{activeAdvisory.title}</h3>
            <p className="text-sm text-stone-700 leading-relaxed">{activeAdvisory.summary}</p>
            <div className="pt-2">
              <Link
                to="/history"
                className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 underline underline-offset-4 inline-flex items-center gap-1"
              >
                <span>{t('viewAllHistory')}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="p-5 rounded-2xl bg-white border border-stone-200 shadow-2xs flex items-center gap-3.5">
            <span className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700 shrink-0">
              <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
            </span>
            <div className="space-y-0.5">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
                {t('activeAdvisoryTitle')}
              </span>
              <p className="text-xs sm:text-sm text-stone-700 font-medium">
                {t('noActiveWarning')}
              </p>
            </div>
          </div>
        )}
      </section>

      {/* 3. CORE QUESTION & QUICK FARMER ACTIONS */}
      <section className="space-y-5" aria-label="Farmer Quick Actions">
        <div className="space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
            Quick Farm Actions
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
            {t('farmerHelpQuestion')}
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Action 1: Crop Disease */}
          <Link
            to="/fasal-rog-pehchan"
            className="group p-6 rounded-3xl border-2 border-stone-200 bg-white hover:border-emerald-600 hover:shadow-md transition-all flex flex-col justify-between space-y-4 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Activity className="w-6 h-6" aria-hidden="true" />
              </div>
              <h3 className="text-lg font-bold text-stone-900 group-hover:text-emerald-800 transition-colors">
                {t('actionFasalTitle')}
              </h3>
              <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                {t('actionFasalDesc')}
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 group-hover:text-emerald-900 pt-2">
              <span>{t('heroCtaFasal')}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </span>
          </Link>

          {/* Action 2: Soil Health */}
          <Link
            to="/khet-swasthya"
            className="group p-6 rounded-3xl border-2 border-stone-200 bg-white hover:border-emerald-600 hover:shadow-md transition-all flex flex-col justify-between space-y-4 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Layers className="w-6 h-6" aria-hidden="true" />
              </div>
              <h3 className="text-lg font-bold text-stone-900 group-hover:text-emerald-800 transition-colors">
                {t('actionKhetTitle')}
              </h3>
              <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                {t('actionKhetDesc')}
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 group-hover:text-emerald-900 pt-2">
              <span>{t('heroCtaKhet')}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </span>
          </Link>

          {/* Action 3: Kisan Mitra */}
          <Link
            to="/assistant"
            className="group p-6 rounded-3xl border-2 border-stone-200 bg-white hover:border-emerald-600 hover:shadow-md transition-all flex flex-col justify-between space-y-4 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Bot className="w-6 h-6" aria-hidden="true" />
              </div>
              <h3 className="text-lg font-bold text-stone-900 group-hover:text-emerald-800 transition-colors">
                {t('actionMitraTitle')}
              </h3>
              <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                {t('actionMitraDesc')}
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 group-hover:text-emerald-900 pt-2">
              <span>{t('navKisanMitra')}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </span>
          </Link>

          {/* Action 4: Early Warnings */}
          <Link
            to="/kisaan-telemetry"
            className="group p-6 rounded-3xl border-2 border-stone-200 bg-white hover:border-emerald-600 hover:shadow-md transition-all flex flex-col justify-between space-y-4 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center group-hover:scale-105 transition-transform">
                <ShieldAlert className="w-6 h-6" aria-hidden="true" />
              </div>
              <h3 className="text-lg font-bold text-stone-900 group-hover:text-emerald-800 transition-colors">
                {t('actionTelemetryTitle')}
              </h3>
              <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                {t('actionTelemetryDesc')}
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 group-hover:text-amber-950 pt-2">
              <span>{t('navTelemetry')}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </span>
          </Link>
        </div>
      </section>

      {/* 4. RECENT ACTIVITY SECTION */}
      <section className="space-y-4" aria-label="Recent Activity">
        <div className="flex items-center justify-between">
          <h2 className="text-lg sm:text-xl font-bold text-stone-900 flex items-center gap-2">
            <HistoryIcon className="w-5 h-5 text-emerald-700" aria-hidden="true" />
            <span>{t('recentActivityTitle')}</span>
          </h2>
          <Link
            to="/history"
            className="text-xs sm:text-sm font-semibold text-emerald-800 hover:text-emerald-950 underline underline-offset-4"
          >
            {t('viewAllHistory')} →
          </Link>
        </div>

        {historyLoading ? (
          <div className="p-8 text-center bg-white rounded-2xl border border-stone-200 text-stone-500 text-sm">
            Loading recent records...
          </div>
        ) : recentHistory.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {recentHistory.map((item) => (
              <div
                key={item.id}
                className="p-5 rounded-2xl bg-white border border-stone-200 shadow-2xs space-y-2 flex flex-col justify-between"
              >
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    {item.type}
                  </span>
                  <h3 className="text-sm font-bold text-stone-900 line-clamp-1">{item.title}</h3>
                  <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed">
                    {item.summary}
                  </p>
                </div>
                <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-400">
                  <span>{item.date}</span>
                  <Link to="/history" className="text-emerald-700 font-semibold hover:underline">
                    Details
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 rounded-2xl bg-stone-50 border border-dashed border-stone-300 text-center space-y-3">
            <FileText className="w-8 h-8 text-stone-400 mx-auto" aria-hidden="true" />
            <p className="text-xs sm:text-sm text-stone-600 max-w-md mx-auto">
              {t('noRecentActivity')}
            </p>
            <div className="flex flex-wrap justify-center gap-3 pt-1">
              <Link
                to="/khet-swasthya"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-medium"
              >
                <span>{t('actionKhetTitle')}</span>
              </Link>
              <Link
                to="/fasal-rog-pehchan"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-white text-xs font-medium"
              >
                <span>{t('actionFasalTitle')}</span>
              </Link>
            </div>
          </div>
        )}
      </section>

      {/* 5. VERIFIED EXTENSION & SUPPORT INFORMATION */}
      <section
        className="p-5 sm:p-6 rounded-2xl bg-emerald-950 text-emerald-100 border border-emerald-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        aria-label="Agricultural Helpline Support"
      >
        <div className="flex items-start gap-3.5">
          <span className="p-2.5 rounded-xl bg-emerald-900 text-emerald-300 shrink-0">
            <PhoneCall className="w-5 h-5" aria-hidden="true" />
          </span>
          <div className="space-y-1">
            <h3 className="font-bold text-sm sm:text-base text-white">
              Official Extension & Advisory Support
            </h3>
            <p className="text-xs sm:text-sm text-emerald-200/90 leading-relaxed">
              {t('supportHelp')}
            </p>
          </div>
        </div>
        <Link
          to="/data-sources"
          className="inline-flex items-center gap-1 text-xs font-bold text-emerald-300 hover:text-white underline underline-offset-4 shrink-0"
        >
          <span>{t('navDataSources')}</span>
          <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
        </Link>
      </section>
    </div>
  );
};