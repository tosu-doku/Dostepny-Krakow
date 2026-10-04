'use client';

import React from 'react';
import { Map as MapIcon, Route, Compass, Camera, User } from 'lucide-react';

export type ActiveMobileTab = 'map' | 'route' | 'leaderboard' | 'crowdsource' | 'profile';

interface BottomNavigationProps {
  activeTab: ActiveMobileTab;
  onChangeTab: (tab: ActiveMobileTab) => void;
  unreadCount?: number;
}

interface NavItem {
  id: ActiveMobileTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'map', label: 'Mapa', icon: MapIcon },
  { id: 'route', label: 'Trasa', icon: Route },
  { id: 'leaderboard', label: 'Eksploracja', icon: Compass },
  { id: 'crowdsource', label: 'Dodaj', icon: Camera },
  { id: 'profile', label: 'Profil', icon: User },
];

export default function BottomNavigation({
  activeTab,
  onChangeTab,
}: BottomNavigationProps) {
  return (
    <nav
      role="navigation"
      aria-label="Dolna nawigacja aplikacji"
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 px-2 sm:px-4 py-2 shadow-lg"
    >
      <div className="max-w-md mx-auto flex items-center justify-around">
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChangeTab(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`flex flex-col items-center justify-center min-w-[56px] min-h-[48px] px-2.5 py-1.5 rounded-2xl transition-all duration-200 cursor-pointer ${
                isActive
                  ? 'bg-purple-100 text-purple-700 font-bold shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50 font-medium'
              }`}
            >
              <Icon
                className={`w-5 h-5 transition-transform duration-200 ${
                  isActive ? 'scale-110 text-purple-700' : 'text-slate-500'
                }`}
                aria-hidden="true"
              />
              <span className={`text-[11px] mt-0.5 tracking-tight ${isActive ? 'font-bold' : 'font-medium'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
