'use client';

import React, { useState } from 'react';
import { User, BadActorPurgeResult } from '@/types/user';
import { UserRank } from '@/services/grid';
import AuthModal from '@/components/auth/AuthModal';
import BadActorPurgeModal from '@/components/admin/BadActorPurgeModal';
import {
  User as UserIcon,
  LogOut,
  ShieldAlert,
  Navigation,
  Trophy,
  CheckCircle2,
  Calendar,
  Layers,
  Sparkles,
  Info,
  LogIn,
} from 'lucide-react';

interface ProfileViewProps {
  currentUser: User | null;
  onUserChange: (user: User | null) => void;
  userRank: UserRank | null;
  unlockedTilesCount: number;
  auditedPhotosCount: number;
  liveLocationEnabled: boolean;
  onToggleLiveLocation: (enabled: boolean) => void;
  onPurgeComplete: (result: BadActorPurgeResult) => void;
}

export default function ProfileView({
  currentUser,
  onUserChange,
  userRank,
  unlockedTilesCount,
  auditedPhotosCount,
  liveLocationEnabled,
  onToggleLiveLocation,
  onPurgeComplete,
}: ProfileViewProps) {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isPurgeModalOpen, setIsPurgeModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      onUserChange(null);
    } catch (err) {
      console.error('Błąd podczas wylogowywania:', err);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handlePurgeDone = (res: BadActorPurgeResult) => {
    onPurgeComplete(res);
    if (currentUser && currentUser.id === res.bad_actor_id) {
      onUserChange(null);
    }
  };

  const userInitial = currentUser?.nickname
    ? currentUser.nickname.charAt(0).toUpperCase()
    : '👤';

  const memberSince = currentUser?.created_at
    ? new Date(currentUser.created_at).toLocaleDateString('pl-PL', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  return (
    <div className="space-y-4 pb-4 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
        <span className="w-9 h-9 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0">
          <UserIcon className="w-5 h-5" />
        </span>
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 leading-tight">
            Twój Profil i Ustawienia
          </h2>
          <p className="text-xs text-slate-500">
            Zarządzaj kontem, preferencjami GPS i audytem
          </p>
        </div>
      </div>

      {/* Account Card */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex items-start gap-3.5">
          <div className="relative shrink-0">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white font-black text-xl flex items-center justify-center shadow-xs">
              {userInitial}
            </div>
            {currentUser && (
              <span
                className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white shadow-2xs"
                title="Konto aktywne"
              />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-extrabold text-base text-slate-900 leading-snug truncate">
              {currentUser ? currentUser.nickname : 'Konto Gościa'}
            </h3>
            <p className="text-xs text-slate-500 truncate mt-0.5">
              {currentUser
                ? currentUser.email
                : 'Zaloguj się, aby zapisywać zgłoszone bariery i punkty XP w chmurze.'}
            </p>
            {memberSince && (
              <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-1 font-medium">
                <Calendar className="w-3 h-3 shrink-0" />
                <span>Dołączono: {memberSince}</span>
              </div>
            )}
          </div>
        </div>

        {/* Quick User Stats */}
        <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100">
          <div className="bg-slate-50 rounded-2xl p-2.5 text-center border border-slate-100">
            <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Zgłoszenia
            </span>
            <span className="text-base font-black text-slate-900 mt-0.5 block">
              {currentUser?.contributions_count ?? 0}
            </span>
          </div>

          <div className="bg-purple-50/60 rounded-2xl p-2.5 text-center border border-purple-100/80">
            <span className="block text-[10px] font-bold text-purple-700 uppercase tracking-wider">
              Poziom
            </span>
            <span className="text-base font-black text-purple-900 mt-0.5 block">
              {userRank?.level ?? 1}
            </span>
          </div>

          <div className="bg-amber-50/60 rounded-2xl p-2.5 text-center border border-amber-100/80">
            <span className="block text-[10px] font-bold text-amber-700 uppercase tracking-wider">
              Punkty XP
            </span>
            <span className="text-base font-black text-amber-900 mt-0.5 block">
              {userRank?.totalXp ?? 0}
            </span>
          </div>
        </div>

        {/* Auth CTA / Logout */}
        <div className="pt-1">
          {currentUser ? (
            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="w-full py-2.5 px-4 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
            >
              <LogOut className="w-4 h-4" />
              <span>{isLoggingOut ? 'Wylogowywanie...' : 'Wyloguj się z konta'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsAuthModalOpen(true)}
              className="w-full py-3 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>Zaloguj się lub Zarejestruj</span>
            </button>
          )}
        </div>
      </div>

      {/* Gamification Status Card */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-extrabold text-slate-900">
              Ranga Odkrywcy Krakowa
            </h3>
          </div>
          <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-black border border-amber-200">
            {userRank?.title ?? 'Turysta z Plant'}
          </span>
        </div>

        {/* XP Progress Bar */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
            <span>Postęp do poziomu {(userRank?.level ?? 1) + 1}</span>
            <span>
              {userRank?.xpInLevel ?? 0} / {userRank?.xpForNextLevel ?? 100} XP ({userRank?.progressPercent ?? 0}%)
            </span>
          </div>
          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200/80">
            <div
              className="bg-purple-600 h-full rounded-full transition-all duration-300"
              style={{ width: `${userRank?.progressPercent ?? 0}%` }}
            />
          </div>
        </div>

        {/* Metric Badges */}
        <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-2">
            <Layers className="w-4 h-4 text-purple-600 shrink-0" />
            <div className="min-w-0">
              <span className="block text-[10px] font-semibold text-slate-500">
                Odkryte kafelki
              </span>
              <strong className="text-slate-900 font-extrabold text-xs">
                {unlockedTilesCount} / 697
              </strong>
            </div>
          </div>

          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
            <div className="min-w-0">
              <span className="block text-[10px] font-semibold text-slate-500">
                Foto-audyty
              </span>
              <strong className="text-slate-900 font-extrabold text-xs">
                {auditedPhotosCount} ze zdjęciem
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation & GPS Settings Card */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs space-y-3">
        <div className="flex items-center gap-2">
          <Navigation className="w-4 h-4 text-emerald-600" />
          <h3 className="text-sm font-extrabold text-slate-900">
            Ustawienia Lokalizacji & Nawigacji
          </h3>
        </div>

        {/* Live GPS Exploration Switch */}
        <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  liveLocationEnabled
                    ? 'bg-emerald-500 animate-pulse'
                    : 'bg-slate-300'
                }`}
              />
              <span className="text-xs font-bold text-slate-900">
                Wędrówka GPS (na żywo)
              </span>
            </div>

            {/* Accessible Switch */}
            <button
              type="button"
              role="switch"
              aria-checked={liveLocationEnabled}
              onClick={() => onToggleLiveLocation(!liveLocationEnabled)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden focus:ring-2 focus:ring-purple-600 focus:ring-offset-2 ${
                liveLocationEnabled ? 'bg-emerald-600' : 'bg-slate-300'
              }`}
            >
              <span className="sr-only">Przełącz tryb lokalizacji na żywo</span>
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  liveLocationEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <p className="text-[11px] text-slate-500 leading-snug">
            {liveLocationEnabled ? (
              <span className="text-emerald-700 font-semibold">
                ✓ Tryb aktywny: heksagony Krakowa i zadania dzienne zaliczają się na bieżąco podczas spaceru.
              </span>
            ) : (
              <span>
                Tryb planera: kafelki odkrywają się po wyznaczeniu i zrealizowaniu trasy A → B.
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Moderation & Admin Card */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs space-y-3">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-600" />
          <h3 className="text-sm font-extrabold text-slate-900">
            Moderacja i Bezpieczeństwo Danych
          </h3>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed font-medium">
          W przypadku zauważenia wandalizmu lub nieprawdziwych zgłoszeń barier architektonicznych skorzystaj z dedykowanego narzędzia audytorskiego.
        </p>

        <button
          type="button"
          onClick={() => setIsPurgeModalOpen(true)}
          className="w-full py-2.5 px-4 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
          <ShieldAlert className="w-4 h-4 text-amber-600" />
          <span>Otwórz narzędzie Bad Actor Purge</span>
        </button>
      </div>

      {/* Application & WCAG Info Card */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-extrabold text-slate-900 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-purple-600" />
            Kraków bez barier
          </span>
          <span className="font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full text-[10px]">
            v0.1.0
          </span>
        </div>

        <div className="text-[11px] text-slate-500 space-y-1.5 pt-1.5 border-t border-slate-100 font-medium">
          <p>
            🛡️ <strong>Dostępność cyfrowa:</strong> Zgodność z wytycznymi WCAG 2.2 AA (kontrast min. 4.5:1, etykiety ARIA, pełna obsługa klawiatury).
          </p>
          <p>
            🗺️ <strong>Architektura:</strong> Routing OpenRouteService, baza danych Supabase PostGIS oraz siatka heksagonalna Uber H3 Resolution 9.
          </p>
        </div>
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={(authenticatedUser) => {
          onUserChange(authenticatedUser);
          setIsAuthModalOpen(false);
        }}
      />

      {/* Bad Actor Purge Modal */}
      <BadActorPurgeModal
        isOpen={isPurgeModalOpen}
        onClose={() => setIsPurgeModalOpen(false)}
        onPurgeComplete={handlePurgeDone}
      />
    </div>
  );
}
