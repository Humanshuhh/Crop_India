import React, { useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import {
  Sprout,
  Menu,
  X,
  Globe,
  User as UserIcon,
  LogOut,
  ChevronDown,
  Activity,
  Layers,
  FileText,
  Bot,
  History as HistoryIcon,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import type { SupportedLanguage } from '../../types/i18n.types';

export const Navbar: React.FC = () => {
  const { language, setLanguage, t, supportedLanguages, currentLanguageMeta } = useLanguage();
  const { user, signOutUser, role } = useAuth();
  const navigate = useNavigate();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);

  const handleLogout = async () => {
    await signOutUser();
    navigate('/');
    setMobileMenuOpen(false);
  };

  const selectLanguage = (code: SupportedLanguage) => {
    setLanguage(code);
    setLangDropdownOpen(false);
    setMobileMenuOpen(false);
  };

  const navLinks = [
    { to: '/', label: t('navHome'), icon: <Sprout className="w-4 h-4" /> },
    { to: '/khet-swasthya', label: t('navKhetSwasthya'), icon: <Layers className="w-4 h-4" /> },
    { to: '/fasal-rog-pehchan', label: t('navFasalRog'), icon: <Activity className="w-4 h-4" /> },
    { to: '/assistant', label: t('navKisanMitra'), icon: <Bot className="w-4 h-4" /> },
    {
      to: '/kisaan-telemetry',
      label: t('navTelemetry'),
      badge: t('optionalTag'),
      icon: <Activity className="w-4 h-4" />,
    },
    { to: '/history', label: t('navHistory'), icon: <HistoryIcon className="w-4 h-4" /> },
    { to: '/data-sources', label: t('navDataSources'), icon: <FileText className="w-4 h-4" /> },
  ];

  // Conditionally add Admin link only for users with admin role
  if (role === 'admin') {
    navLinks.push({ to: '/admin', label: t('adminNav'), icon: <Activity className="w-4 h-4" /> });
  }


  return (
    <header className="sticky top-0 z-40 bg-stone-900 text-stone-100 border-b border-stone-800 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-18">
          {/* Brand Logo */}
          <Link
            to="/"
            className="flex items-center gap-2.5 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-400 py-1 pr-2"
            aria-label="Kisan Sahayak Home"
          >
            <span className="p-2 rounded-lg bg-emerald-700 text-stone-50 shadow-xs flex items-center justify-center">
              <Sprout className="w-5 h-5 md:w-6 md:h-6" aria-hidden="true" />
            </span>
            <div className="flex flex-col">
              <span className="font-bold text-lg md:text-xl tracking-tight text-stone-50 leading-tight">
                {t('appTitle')}
              </span>
              <span className="text-[11px] text-emerald-400 font-medium hidden sm:inline leading-none">
                {t('appTagline')}
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1.5" aria-label="Main navigation">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `px-3 py-2 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-400 flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-emerald-800/90 text-white font-semibold'
                      : 'text-stone-300 hover:text-white hover:bg-stone-800'
                  }`
                }
              >
                {link.icon}
                <span>{link.label}</span>
                {link.badge && (
                  <span className="ml-1 text-[10px] font-semibold bg-stone-700 text-stone-300 px-1.5 py-0.5 rounded">
                    {link.badge}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>

          {/* Right Header Controls: Language + Auth */}
          <div className="hidden md:flex items-center gap-3">
            {/* Language Selector Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setLangDropdownOpen(!langDropdownOpen)}
                className="flex items-center gap-1.5 min-h-[44px] px-3.5 py-2 rounded-xl text-sm font-medium text-stone-200 hover:text-white hover:bg-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-400 border border-stone-700 transition-colors"
                aria-haspopup="listbox"
                aria-expanded={langDropdownOpen}
                aria-label={t('languageSelectAria')}
              >
                <Globe className="w-4 h-4 text-emerald-400" aria-hidden="true" />
                <span>{currentLanguageMeta.nativeName}</span>
                <ChevronDown className="w-3.5 h-3.5 text-stone-400" aria-hidden="true" />
              </button>

              {langDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setLangDropdownOpen(false)}
                    aria-hidden="true"
                  />
                  <div
                    className="absolute right-0 mt-2 w-48 bg-stone-900 border border-stone-700 rounded-xl shadow-xl py-1 z-40 focus:outline-none animate-fadeIn"
                    role="listbox"
                    aria-label="Select language"
                  >
                    {supportedLanguages.map((item) => (
                      <button
                        key={item.code}
                        type="button"
                        onClick={() => selectLanguage(item.code)}
                        className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between hover:bg-stone-800 transition-colors ${
                          language === item.code
                            ? 'text-emerald-400 font-semibold bg-stone-800/60'
                            : 'text-stone-200'
                        }`}
                        role="option"
                        aria-selected={language === item.code}
                      >
                        <span>{item.nativeName}</span>
                        <span className="text-xs text-stone-400 font-mono">{item.name}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Auth Button */}
            {user ? (
              <div className="flex items-center gap-2 border-l border-stone-700 pl-3">
                <Link
                  to="/profile"
                  className="flex items-center gap-2 min-h-[44px] text-stone-300 hover:text-white group px-2.5 py-1 rounded-xl hover:bg-stone-800 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  title={t('navProfile')}
                  aria-label={t('navProfile')}
                >
                  <span className="w-8 h-8 rounded-full bg-emerald-800 flex items-center justify-center text-white font-bold group-hover:bg-emerald-700 transition-colors text-xs">
                    {user.email ? user.email.charAt(0).toUpperCase() : 'F'}
                  </span>
                  <span className="max-w-28 truncate font-medium text-xs">{user.email}</span>
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="min-h-[44px] min-w-[44px] rounded-xl text-stone-300 hover:text-white hover:bg-stone-800 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-colors"
                  aria-label={t('navLogout')}
                  title={t('navLogout')}
                >
                  <LogOut className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 border-l border-stone-700 pl-3">
                <Link
                  to="/login"
                  className="min-h-[44px] px-3.5 py-2 rounded-xl text-sm font-medium text-stone-200 hover:text-white hover:bg-stone-800 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-colors"
                >
                  {t('navLogin')}
                </Link>
                <Link
                  to="/signup"
                  className="min-h-[44px] px-4 py-2 rounded-xl text-sm font-medium bg-emerald-700 hover:bg-emerald-600 text-white shadow-xs flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-colors"
                >
                  {t('navSignup')}
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Header Controls: Language Popover + Drawer Toggle */}
          <div className="flex items-center gap-1.5 lg:hidden">
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setLangDropdownOpen(!langDropdownOpen);
                  if (mobileMenuOpen) setMobileMenuOpen(false);
                }}
                className="min-h-[44px] min-w-[44px] rounded-xl text-stone-300 hover:text-white flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-emerald-400"
                aria-haspopup="listbox"
                aria-expanded={langDropdownOpen}
                aria-label={t('languageSelectAria')}
              >
                <Globe className="w-5 h-5 text-emerald-400" aria-hidden="true" />
              </button>

              {langDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs"
                    onClick={() => setLangDropdownOpen(false)}
                    aria-hidden="true"
                  />
                  <div
                    className="absolute right-0 mt-2 w-56 bg-stone-900 border border-stone-700 rounded-2xl shadow-2xl py-2 z-50 focus:outline-none animate-fadeIn"
                    role="listbox"
                    aria-label="Select language"
                  >
                    <div className="px-4 py-1.5 mb-1 text-[11px] font-bold text-stone-400 uppercase tracking-wider border-b border-stone-800">
                      {t('languageSelectAria')}
                    </div>
                    {supportedLanguages.map((item) => (
                      <button
                        key={item.code}
                        type="button"
                        onClick={() => selectLanguage(item.code)}
                        className={`w-full text-left px-4 py-3 text-sm flex items-center justify-between hover:bg-stone-800 transition-colors min-h-[44px] ${
                          language === item.code
                            ? 'text-emerald-400 font-semibold bg-stone-800/60'
                            : 'text-stone-200'
                        }`}
                        role="option"
                        aria-selected={language === item.code}
                      >
                        <span className="text-base font-medium">{item.nativeName}</span>
                        <span className="text-xs text-stone-400 font-mono">{item.name}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(!mobileMenuOpen);
                if (langDropdownOpen) setLangDropdownOpen(false);
              }}
              className="min-h-[44px] min-w-[44px] rounded-xl text-stone-200 hover:text-white hover:bg-stone-800 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-emerald-400"
              aria-expanded={mobileMenuOpen}
              aria-label="Toggle mobile menu"
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6" aria-hidden="true" />
              ) : (
                <Menu className="w-6 h-6" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown / Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-stone-800 bg-stone-900 px-4 pt-3 pb-6 space-y-3">
          <div className="space-y-1">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3 py-3 rounded-lg text-base font-medium ${
                    isActive
                      ? 'bg-emerald-800/90 text-white font-semibold'
                      : 'text-stone-300 hover:bg-stone-800 hover:text-white'
                  }`
                }
              >
                <span className="flex items-center gap-2.5">
                  {link.icon}
                  <span>{link.label}</span>
                </span>
                {link.badge && (
                  <span className="text-xs font-semibold bg-stone-700 text-stone-300 px-2 py-0.5 rounded">
                    {link.badge}
                  </span>
                )}
              </NavLink>
            ))}
          </div>

          {/* Mobile Language Selector Grid */}
          <div className="pt-3 border-t border-stone-800">
            <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2">
              {t('languageSelectAria')}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {supportedLanguages.map((item) => (
                <button
                  key={item.code}
                  type="button"
                  onClick={() => selectLanguage(item.code)}
                  className={`min-h-12 px-3 py-2 rounded-lg text-sm font-medium border text-left flex items-center justify-between ${
                    language === item.code
                      ? 'border-emerald-500 bg-emerald-950/60 text-emerald-300 font-semibold'
                      : 'border-stone-700 text-stone-300 bg-stone-800/50'
                  }`}
                >
                  <span>{item.nativeName}</span>
                  <span className="text-[11px] text-stone-400 font-mono uppercase">{item.code}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Mobile Auth Actions */}
          <div className="pt-3 border-t border-stone-800 space-y-2">
            {user ? (
              <>
                <Link
                  to="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between bg-stone-800/80 p-3 rounded-lg hover:bg-stone-800 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-full bg-emerald-800 flex items-center justify-center text-white font-bold text-sm">
                      {user.email ? user.email.charAt(0).toUpperCase() : 'F'}
                    </span>
                    <div>
                      <div className="text-sm font-semibold text-white flex items-center gap-1.5">
                        <UserIcon className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                        <span>{t('navProfile')}</span>
                      </div>
                      <div className="text-xs text-stone-400 truncate max-w-44">{user.email}</div>
                    </div>
                  </div>
                  <span className="text-xs text-emerald-400 font-medium">{t('navOpen')} &rarr;</span>
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full py-2.5 rounded bg-stone-800 text-xs text-stone-300 font-medium hover:text-white hover:bg-stone-700 flex items-center justify-center gap-2"
                >
                  <LogOut className="w-4 h-4" aria-hidden="true" />
                  <span>{t('navLogout')}</span>
                </button>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="min-h-12 rounded-lg border border-stone-700 text-stone-200 font-medium text-sm flex items-center justify-center hover:bg-stone-800"
                >
                  {t('navLogin')}
                </Link>
                <Link
                  to="/signup"
                  onClick={() => setMobileMenuOpen(false)}
                  className="min-h-12 rounded-lg bg-emerald-700 text-white font-medium text-sm flex items-center justify-center hover:bg-emerald-600 shadow-sm"
                >
                  {t('navSignup')}
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};