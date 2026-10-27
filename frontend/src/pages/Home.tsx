import React, { useState } from 'react';
import { useDashboardData } from '../hooks/useDashboardData';
import { DashboardWelcome } from '../components/dashboard/DashboardWelcome';
import { WeatherCard } from '../components/dashboard/WeatherCard';
import { SevenDayForecastModal } from '../components/dashboard/SevenDayForecastModal';
import { CropHealthCard } from '../components/dashboard/CropHealthCard';
import { TodaysAdvisoryCard } from '../components/dashboard/TodaysAdvisoryCard';
import { FarmOverview } from '../components/dashboard/FarmOverview';
import { QuickActionsGrid } from '../components/dashboard/QuickActionsGrid';
import { RecommendationsPanel } from '../components/dashboard/RecommendationsPanel';
import { DashboardSkeleton } from '../components/dashboard/DashboardSkeleton';
import { PhoneCall, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

export const Home: React.FC = () => {
  const { t } = useLanguage();
  const [forecastModalOpen, setForecastModalOpen] = useState(false);

  const {
    profile,
    profileLoading,
    weather,
    alerts,
    history,
    metrics,
    cropsList,
    recommendations,
    hasCoordinates,
  } = useDashboardData();

  if (profileLoading && !profile) {
    return (
      <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10">
        <DashboardSkeleton />
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-stone-50 flex flex-col animate-fadeIn">
      {/* 1. Panoramic Scenic Hero (spans full viewport width) */}
      <DashboardWelcome profile={profile} hasCoordinates={hasCoordinates} />

      {/* Main Dashboard Content: Wide desktop composition (1,400–1,500px) */}
      <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 pb-12 space-y-8">
        {/* 2. Three Primary Cards (subtly overlapping lower edge of scenic hero) */}
        <section
          aria-label="Core Farm Telemetry & Advisories"
          className="relative z-20 -mt-8 sm:-mt-12 md:-mt-14 grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch"
        >
          {/* Card 1: Weather Today */}
          <WeatherCard
            weather={weather}
            onOpenForecast={() => setForecastModalOpen(true)}
          />

          {/* Card 2: Crop Health */}
          <CropHealthCard history={history} />

          {/* Card 3: Today's Advisory */}
          <TodaysAdvisoryCard alerts={alerts} hasCoordinates={hasCoordinates} />
        </section>

        {/* 3. Farm Overview: 4 Metrics Grid & Simplified Registered Crops Table */}
        <section aria-label="Farm Overview and Crop Inventory">
          <FarmOverview metrics={metrics} cropsList={cropsList} />
        </section>

        {/* 4. Quick Farm Actions (6 responsive tiles) */}
        <QuickActionsGrid
          onOpenForecastModal={() => setForecastModalOpen(true)}
        />

        {/* 5. Recommendations for Your Farm */}
        <RecommendationsPanel recommendations={recommendations} />

        {/* 6. Verified Extension & Advisory Support Notice */}
        <section
          className="p-5 sm:p-6 rounded-3xl bg-emerald-950 text-emerald-100 border border-emerald-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm"
          aria-label="Agricultural Helpline Support"
        >
          <div className="flex items-start gap-3.5">
            <span className="p-2.5 rounded-2xl bg-emerald-900 text-emerald-300 shrink-0">
              <PhoneCall className="w-5 h-5" aria-hidden="true" />
            </span>
            <div className="space-y-1">
              <h3 className="font-bold text-sm sm:text-base text-white">
                Official Extension & Advisory Support
              </h3>
              <p className="text-xs sm:text-sm text-emerald-200/90 leading-relaxed max-w-xl">
                Backed by verified agronomic guidelines from ICAR and State Agricultural Universities.
              </p>
            </div>
          </div>

          <Link
            to="/data-sources"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-300 hover:text-white underline underline-offset-4 shrink-0 focus:outline-none focus:ring-2 focus:ring-emerald-400 rounded-lg p-1"
          >
            <span>{t('navDataSources')}</span>
            <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
          </Link>
        </section>

        {/* 7. Seven-Day Weather Forecast Modal */}
        <SevenDayForecastModal
          isOpen={forecastModalOpen}
          onClose={() => setForecastModalOpen(false)}
          dailyForecast={weather.data?.daily_forecast || []}
          hasCoordinates={hasCoordinates}
          isLoading={weather.status === 'loading'}
        />
      </div>
    </div>
  );
};