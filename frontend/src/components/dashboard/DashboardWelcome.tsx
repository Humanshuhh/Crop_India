import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Layers, User, ArrowRight, Compass } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import type { FarmerProfile } from '../../types/profile.types';

interface DashboardWelcomeProps {
  profile: FarmerProfile | null;
  hasCoordinates: boolean;
}

export const DashboardWelcome: React.FC<DashboardWelcomeProps> = ({
  profile,
  hasCoordinates,
}) => {
  const { t } = useLanguage();

  const farmerName = profile?.fullName?.trim();
  const greetingText = farmerName ? `Namaste, ${farmerName}` : t('farmerGreeting');

  // Location string: clean, readable, removes duplicates
  const locationParts = [profile?.village, profile?.district, profile?.state]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part));

  const readableLocation = locationParts.length > 0 ? locationParts.join(', ') : null;

  const hasLand = Boolean(profile?.landArea && profile.landArea.trim() !== '');
  const landDisplay = hasLand ? `${profile!.landArea} ${profile?.landUnit || 'acres'}` : null;

  const bannerSrc = `${import.meta.env.BASE_URL.replace(/\/$/, '')}/images/farm-landscape-banner.png`;

  return (
    <section
      aria-label="Welcome and Farm Overview"
      className="relative w-full overflow-hidden bg-gradient-to-br from-sky-100 via-emerald-50 to-amber-50 border-b border-stone-200/60"
    >
      {/* Scenic Agricultural Landscape Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <img
          src={bannerSrc}
          alt=""
          aria-hidden="true"
          className="w-full h-full object-cover object-[center_32%]"
          onError={(e) => {
            // CSS gradient fallback: hide image so background gradient shows seamlessly
            (e.currentTarget as HTMLElement).style.display = 'none';
          }}
        />

        {/* Restrained light gradient overlay for text readability over lighter scene portion */}
        <div className="absolute inset-0 bg-gradient-to-r from-stone-50/95 via-stone-50/75 to-transparent sm:via-stone-50/45 pointer-events-none" />

        {/* Soft bottom blend to gracefully meet overlapping dashboard cards */}
        <div className="absolute inset-x-0 bottom-0 h-16 sm:h-24 bg-gradient-to-t from-stone-50 via-stone-50/40 to-transparent pointer-events-none" />
      </div>

      {/* Foreground Hero Content */}
      <div className="relative z-10 w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16 sm:pt-12 sm:pb-24 md:pt-16 md:pb-28">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2.5 max-w-2xl">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 leading-tight">
              {greetingText}
            </h1>

            <p className="text-sm sm:text-base md:text-lg text-slate-700 font-medium">
              Here's what's happening on your farm today.
            </p>

            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 pt-2 text-xs sm:text-sm text-slate-800">
              {/* Readable Location */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/85 backdrop-blur-sm border border-stone-200/90 shadow-2xs">
                <MapPin className="w-4 h-4 text-emerald-700 shrink-0" aria-hidden="true" />
                <span>{readableLocation || 'Location not configured'}</span>
              </div>

              {/* Landholding */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/85 backdrop-blur-sm border border-stone-200/90 shadow-2xs">
                <Layers className="w-4 h-4 text-teal-700 shrink-0" aria-hidden="true" />
                <span>{landDisplay || 'Landholding unrecorded'}</span>
              </div>

              {/* Coordinates status indicator */}
              {!hasCoordinates && (
                <Link
                  to="/profile"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50/90 hover:bg-amber-100/90 backdrop-blur-sm border border-amber-300/80 text-xs text-amber-900 font-semibold transition-colors shadow-2xs"
                >
                  <Compass className="w-3.5 h-3.5 text-amber-700 shrink-0" aria-hidden="true" />
                  <span>Set GPS coordinates for live weather &rarr;</span>
                </Link>
              )}
            </div>
          </div>

          {/* Profile / Farm Setup Action */}
          <div className="flex items-center gap-3 shrink-0 self-start md:self-end">
            <Link
              to="/profile"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white text-xs sm:text-sm font-semibold transition-all shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 min-h-[44px]"
            >
              <User className="w-4 h-4" aria-hidden="true" />
              <span>{profile ? t('navProfile') : t('setupFarmAction')}</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};