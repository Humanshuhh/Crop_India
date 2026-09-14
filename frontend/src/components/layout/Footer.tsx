import React from 'react';
import { Link } from 'react-router-dom';
import { Sprout, ShieldCheck, HeartHandshake, ExternalLink } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export const Footer: React.FC = () => {
  const { t } = useLanguage();

  return (
    <footer className="bg-stone-900 text-stone-300 border-t border-stone-800 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Brand & Purpose */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="p-1.5 rounded-md bg-emerald-700 text-stone-50">
                <Sprout className="w-5 h-5" aria-hidden="true" />
              </span>
              <span className="font-bold text-lg text-stone-100 tracking-tight">
                {t('appTitle')}
              </span>
            </div>
            <p className="text-sm text-stone-400 leading-relaxed">
              {t('appSubtitle')}. Built for smallholder farmers with an unyielding commitment to data truth, accessibility, and zero fabricated metrics.
            </p>
          </div>

          {/* Trust & Transparency */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="w-5 h-5 text-emerald-400" aria-hidden="true" />
              <h4 className="font-semibold text-stone-100 text-sm tracking-wide uppercase">
                Data Transparency
              </h4>
            </div>
            <ul className="space-y-2 text-sm text-stone-400">
              <li>
                <Link
                  to="/data-sources"
                  className="hover:text-emerald-300 underline underline-offset-4 focus:outline-none focus:ring-1 focus:ring-emerald-400 inline-flex items-center gap-1"
                >
                  <span>{t('navDataSources')}</span>
                  <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                </Link>
              </li>
              <li>No synthetic weather or simulated soil readings.</li>
              <li>Separate AI guidance from empirical test card records.</li>
            </ul>
          </div>

          {/* Farmer Advisory Disclaimer */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <HeartHandshake className="w-5 h-5 text-emerald-400" aria-hidden="true" />
              <h4 className="font-semibold text-stone-100 text-sm tracking-wide uppercase">
                Advisory Charter
              </h4>
            </div>
            <p className="text-xs text-stone-400 leading-relaxed bg-stone-800/60 p-3 rounded-lg border border-stone-800">
              {t('aiDisclaimer')} For critical agrochemical or land decisions, verify with your district Krishi Vigyan Kendra (KVK).
            </p>
          </div>
        </div>

        <div className="pt-6 border-t border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-stone-500 gap-3">
          <p>© {new Date().getFullYear()} Kisan Sahayak. Digital Public Good for Smallholders.</p>
          <div className="flex flex-wrap items-center gap-4">
            <Link to="/data-sources" className="hover:text-stone-300">
              Methodology
            </Link>
            <Link to="/khet-swasthya" className="hover:text-stone-300">
              Soil Advisory
            </Link>
            <Link to="/fasal-rog-pehchan" className="hover:text-stone-300">
              Leaf Diagnostics
            </Link>
            <Link to="/assistant" className="hover:text-stone-300">
              Kisan Mitra
            </Link>
            <Link to="/history" className="hover:text-stone-300">
              History
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
