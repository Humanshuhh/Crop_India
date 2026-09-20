import React from 'react';
import { NavLink } from 'react-router-dom';
import { Sprout, Activity, Layers, Bot, History as HistoryIcon } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export const BottomNav: React.FC = () => {
  const { t } = useLanguage();

  const navItems = [
    {
      to: '/',
      label: t('bottomNavHome'),
      icon: <Sprout className="w-5 h-5" aria-hidden="true" />,
    },
    {
      to: '/fasal-rog-pehchan',
      label: t('bottomNavFasal'),
      icon: <Activity className="w-5 h-5" aria-hidden="true" />,
    },
    {
      to: '/khet-swasthya',
      label: t('bottomNavKhet'),
      icon: <Layers className="w-5 h-5" aria-hidden="true" />,
    },
    {
      to: '/assistant',
      label: t('bottomNavMitra'),
      icon: <Bot className="w-5 h-5" aria-hidden="true" />,
    },
    {
      to: '/history',
      label: t('bottomNavHistory'),
      icon: <HistoryIcon className="w-5 h-5" aria-hidden="true" />,
    },
  ];

  return (
    <nav
      aria-label="Mobile Bottom Navigation"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-stone-900/95 backdrop-blur-md border-t border-stone-800 text-stone-300 shadow-2xl safe-area-bottom"
    >
      <div className="grid grid-cols-5 h-16 max-w-lg mx-auto px-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center min-h-[48px] py-1 px-1 rounded-xl transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-emerald-400 ${
                isActive
                  ? 'text-emerald-400 font-semibold scale-105'
                  : 'text-stone-400 hover:text-stone-200 active:scale-95'
              }`
            }
            aria-label={item.label}
          >
            <span className="p-1 rounded-lg transition-colors">{item.icon}</span>
            <span className="text-[10px] tracking-tight truncate max-w-full text-center leading-tight">
              {item.label}
            </span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

