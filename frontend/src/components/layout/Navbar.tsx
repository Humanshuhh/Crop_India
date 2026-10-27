import React, { useState, useEffect } from 'react';
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
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
  const location = useLocation();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);

  // Automatically close menus on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setLangDropdownOpen(false);
  }, [location.pathname]);

  // Lock body scroll when mobile menu is open to eliminate secondary background scrollbar
  useEffect(() => {
    if (!mobileMenuOpen) return;

    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
    };
  }, [mobileMenuOpen]);

  // Close menus on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false);
        setLangDropdownOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close mobile drawer when resizing up to desktop viewports (>= 1280px)
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1280) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  type NavLinkItem = {
    to: string;
    label: string;
    icon: React.ReactNode;
    badge?: string;
  };

  const navLinks: NavLinkItem[] = [
    { to: '/', label: t('navHome'), icon: <Sprout className="w-4 h-4" /> },
    { to: '/khet-swasthya', label: t('navKhetSwasthya'), icon: <Layers className="w-4 h-4" /> },
    { to: '/fasal-rog-pehchan', label: t('navFasalRog'), icon: <Activity className="w-4 h-4" /> },
    { to: '/assistant', label: t('navKisanMitra'), icon: <Bot className="w-4 h-4" /> },
    {
      to: '/kisaan-telemetry',
      label: t('navTelemetry'),
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
    <header className="sticky top-0 z-50 w-full bg-slate-900 text-slate-100 border-b border-slate-800 shadow-md h-16 md:h-18 shrink-0">
      <div className="w-full max-w-[1600px] h-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-full gap-3 sm:gap-4 lg:gap-6">
          {/* Brand Logo — display only */}
          <div className="flex items-center gap-2.5 py-1 pr-2 shrink-0">
            <img
              src="/images/kisan-sahayak-logo.png"
              alt={t('appTitle')}
              className="w-9 h-9 sm:w-10 sm:h-10 md:w-11 md:h-11 object-contain shrink-0"
            />
            <div className="flex flex-col">
              <span className="font-bold text-lg md:text-xl tracking-tight text-stone-50 leading-tight">
                {t('appTitle')}
              </span>
            </div>
          </div>

          {/* Desktop Navigation Links (>= 1280px) */}
          <nav
            className="hidden xl:flex items-center justify-center gap-1.5 xl:gap-2 2xl:gap-3 shrink-0"
            aria-label="Main navigation"
          >
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `px-2.5 xl:px-3 py-1.5 xl:py-2 rounded-lg text-xs 2xl:text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-400 flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'bg-emerald-600 text-white font-semibold shadow-xs'
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

          {/* Right Header Controls: Language + Auth (Desktop >= 1280px) */}
          <div className="hidden xl:flex items-center gap-2.5 xl:gap-3.5 shrink-0">
            {/* Language Selector Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setLangDropdownOpen(!langDropdownOpen)}
                className="flex items-center gap-1.5 min-h-[40px] px-2.5 xl:px-3 py-1.5 rounded-xl text-xs xl:text-sm font-medium text-stone-200 hover:text-white hover:bg-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-400 border border-stone-700 transition-colors cursor-pointer"
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
                        className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between hover:bg-stone-800 transition-colors cursor-pointer ${
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
              <div className="flex items-center gap-2 border-l border-stone-700/80 pl-2.5 xl:pl-3 shrink-0">
                <Link
                  to="/profile"
                  className="flex items-center gap-2 min-h-[40px] text-stone-300 hover:text-white group px-2 py-1 rounded-xl hover:bg-stone-800 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  title={t('navProfile')}
                  aria-label={t('navProfile')}
                >
                  <span className="w-8 h-8 rounded-full bg-emerald-800 flex items-center justify-center text-white font-bold group-hover:bg-emerald-700 transition-colors text-xs overflow-hidden shrink-0">
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt={user.name || 'User avatar'} className="w-full h-full object-cover" />
                    ) : user.name ? (
                      user.name.charAt(0).toUpperCase()
                    ) : user.phone ? (
                      user.phone.charAt(0)
                    ) : (
                      'F'
                    )}
                  </span>
                  <span className="max-w-24 2xl:max-w-32 truncate font-medium text-xs">{user.name || user.phone}</span>
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="min-h-[40px] min-w-[40px] rounded-xl text-stone-300 hover:text-white hover:bg-stone-800 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-colors shrink-0 cursor-pointer"
                  aria-label={t('navLogout')}
                  title={t('navLogout')}
                >
                  <LogOut className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 border-l border-stone-700/80 pl-2.5 xl:pl-3 shrink-0">
                <Link
                  to="/login"
                  className="min-h-[40px] px-3 py-1.5 rounded-xl text-xs xl:text-sm font-medium text-stone-200 hover:text-white hover:bg-stone-800 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-colors shrink-0"
                >
                  {t('navLogin')}
                </Link>
                <Link
                  to="/signup"
                  className="min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs xl:text-sm font-medium bg-emerald-700 hover:bg-emerald-600 text-white shadow-xs flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-colors shrink-0"
                >
                  {t('navSignup')}
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Header Controls (< 1280px): Language Popover + Drawer Toggle */}
          <div className="flex items-center gap-1.5 xl:hidden shrink-0">
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setLangDropdownOpen(!langDropdownOpen);
                  if (mobileMenuOpen) setMobileMenuOpen(false);
                }}
                className="min-h-[44px] min-w-[44px] rounded-xl text-stone-300 hover:text-white flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-emerald-400 cursor-pointer"
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
                        className={`w-full text-left px-4 py-3 text-sm flex items-center justify-between hover:bg-stone-800 transition-colors min-h-[44px] cursor-pointer ${
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
              className={`min-h-[44px] min-w-[44px] rounded-xl text-stone-200 hover:text-white flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-emerald-400 cursor-pointer transition-colors ${
                mobileMenuOpen ? 'bg-stone-800 text-white' : 'hover:bg-stone-800'
              }`}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-navigation-drawer"
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6 text-emerald-400" aria-hidden="true" />
              ) : (
                <Menu className="w-6 h-6" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Backdrop & Drawer (< 1280px) */}
      {mobileMenuOpen && (
        <>
          {/* Backdrop: anchors right below the fixed navbar */}
          <div
            className="fixed inset-0 top-16 md:top-18 z-40 bg-black/60 backdrop-blur-xs xl:hidden"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Container: positioned directly below the fixed navbar without covering it */}
          <div
            id="mobile-navigation-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Mobile Navigation"
            className="fixed top-16 md:top-18 left-0 right-0 z-50 w-full max-h-[calc(100dvh-4rem-env(safe-area-inset-bottom,0px))] md:max-h-[calc(100dvh-4.5rem-env(safe-area-inset-bottom,0px))] bg-stone-900 border-t border-stone-800 shadow-2xl flex flex-col overflow-hidden xl:hidden"
          >
            {/* Drawer Persistent Header: Always Visible at Top with Close Button */}
            <div className="flex items-center justify-between px-4 py-3 bg-stone-900 border-b border-stone-800 shrink-0">
              <div className="flex items-center gap-2">
                <img
                  src="/images/kisan-sahayak-logo.png"
                  alt={t('appTitle')}
                  className="w-7 h-7 object-contain shrink-0"
                />
                <span className="font-bold text-xs sm:text-sm text-stone-200 tracking-tight">
                  {t('appTitle')}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="min-h-[38px] px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 hover:text-white flex items-center gap-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-400 cursor-pointer transition-colors"
                aria-label="Close navigation menu"
              >
                <X className="w-4 h-4 text-emerald-400" aria-hidden="true" />
                <span>Close</span>
              </button>
            </div>

            {/* Scrollable Drawer Content */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-4 pt-3 pb-8 space-y-4">
              {/* 1. TOP: Profile Card */}
            {user && (
              <div className="pb-3 border-b border-stone-800">
                <Link
                  to="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between bg-stone-800/80 p-3 rounded-xl hover:bg-stone-800 transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-9 h-9 rounded-full bg-emerald-800 flex items-center justify-center text-white font-bold text-sm overflow-hidden shrink-0 border border-emerald-600/40">
                      {user.avatarUrl ? (
                        <img src={user.avatarUrl} alt={user.name || 'User avatar'} className="w-full h-full object-cover" />
                      ) : user.name ? (
                        user.name.charAt(0).toUpperCase()
                      ) : user.phone ? (
                        user.phone.charAt(0)
                      ) : (
                        'F'
                      )}
                    </span>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-white flex items-center gap-1.5">
                        <UserIcon className="w-3.5 h-3.5 text-emerald-400 shrink-0" aria-hidden="true" />
                        <span className="truncate">{user.name || t('navProfile')}</span>
                      </div>
                      <div className="text-xs text-stone-400 truncate">
                        {user.phone || t('navProfile')}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs text-emerald-400 font-semibold group-hover:translate-x-0.5 transition-transform shrink-0 ml-2">
                    {t('navOpen')} &rarr;
                  </span>
                </Link>
              </div>
            )}

            {/* 2. MIDDLE: Navigation Links */}
            <div className="space-y-1">
              {navLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3.5 py-3 rounded-xl text-base font-medium transition-colors ${
                      isActive
                        ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                        : 'text-stone-300 hover:bg-stone-800 hover:text-white'
                    }`
                  }
                >
                  <span className="flex items-center gap-3">
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

            {/* 3. Language Selector */}
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
                    className={`min-h-[44px] px-3 py-2 rounded-xl text-sm font-medium border text-left flex items-center justify-between transition-colors cursor-pointer ${
                      language === item.code
                        ? 'border-emerald-500 bg-emerald-950/60 text-emerald-300 font-semibold'
                        : 'border-stone-700 text-stone-300 bg-stone-800/50 hover:bg-stone-800 hover:text-white'
                    }`}
                  >
                    <span>{item.nativeName}</span>
                    <span className="text-[11px] text-stone-400 font-mono uppercase">
                      {item.code}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* 4. BOTTOM: Separate Authentication Actions */}
            <div className="pt-3 border-t border-stone-800 pb-2">
              {user ? (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full min-h-[48px] px-4 py-3 rounded-xl bg-red-950/40 hover:bg-red-900/60 border border-red-800/60 text-red-200 hover:text-white text-sm font-semibold flex items-center justify-center gap-2.5 shadow-xs transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 cursor-pointer"
                >
                  <LogOut className="w-4 h-4 text-red-300" aria-hidden="true" />
                  <span>{t('navLogout')}</span>
                </button>
              ) : (
                <div className="grid grid-cols-2 gap-2.5">
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="min-h-[48px] rounded-xl border border-stone-700 text-stone-200 font-medium text-sm flex items-center justify-center hover:bg-stone-800 transition-colors"
                  >
                    {t('navLogin')}
                  </Link>
                  <Link
                    to="/signup"
                    onClick={() => setMobileMenuOpen(false)}
                    className="min-h-[48px] rounded-xl bg-emerald-700 text-white font-medium text-sm flex items-center justify-center hover:bg-emerald-600 shadow-xs transition-colors"
                  >
                    {t('navSignup')}
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </>
      )}
    </header>
  );
};
