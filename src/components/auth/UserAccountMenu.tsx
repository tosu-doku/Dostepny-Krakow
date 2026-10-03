'use client';

import { useState, useEffect } from 'react';
import { User, BadActorPurgeResult } from '@/types/user';
import AuthModal from './AuthModal';
import BadActorPurgeModal from '../admin/BadActorPurgeModal';
import { User as UserIcon, LogOut, ShieldAlert, ChevronDown, CheckCircle2 } from 'lucide-react';

interface UserAccountMenuProps {
  onPurgeComplete?: (result: BadActorPurgeResult) => void;
  currentUser?: User | null;
  onUserChange?: (user: User | null) => void;
}

export default function UserAccountMenu({
  onPurgeComplete,
  currentUser,
  onUserChange,
}: UserAccountMenuProps) {
  const [user, setUser] = useState<User | null>(currentUser || null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isPurgeModalOpen, setIsPurgeModalOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  // Sync with prop if supplied
  useEffect(() => {
    if (currentUser !== undefined) {
      setUser(currentUser);
    }
  }, [currentUser]);

  // Fetch current user from session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
          onUserChange?.(data.user);
        }
      } catch (err) {
        console.warn('Session check failed:', err);
      } finally {
        setIsLoadingUser(false);
      }
    };
    checkSession();
  }, [onUserChange]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
      onUserChange?.(null);
      setIsDropdownOpen(false);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const handleAuthSuccess = (authenticatedUser: User) => {
    setUser(authenticatedUser);
    onUserChange?.(authenticatedUser);
    setIsAuthModalOpen(false);
  };

  const handlePurgeDone = (res: BadActorPurgeResult) => {
    onPurgeComplete?.(res);
    // Refresh user state if current user was the purged one
    if (user && user.id === res.bad_actor_id) {
      setUser(null);
      onUserChange?.(null);
    }
  };

  return (
    <div className="relative">
      {!user ? (
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setIsAuthModalOpen(true)}
            className="min-h-[40px] px-3 sm:px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
          >
            <UserIcon className="w-3.5 h-3.5" />
            <span>Konto / Zaloguj</span>
          </button>

          <button
            type="button"
            onClick={() => setIsPurgeModalOpen(true)}
            title="Narzędzie czyszczenia naruszeń bad actora"
            className="min-h-[40px] px-2.5 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors border border-zinc-200 dark:border-zinc-700"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
            <span className="hidden sm:inline">Purge tool</span>
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          {/* User Button */}
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="min-h-[40px] px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors border border-zinc-200 dark:border-zinc-700"
            aria-expanded={isDropdownOpen}
            aria-haspopup="true"
          >
            <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">
              {user.nickname.charAt(0).toUpperCase()}
            </div>
            <span className="max-w-[120px] truncate">{user.nickname}</span>
            <ChevronDown className="w-3 h-3 text-zinc-500" />
          </button>

          {/* Dropdown Menu */}
          {isDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setIsDropdownOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl p-3 z-40 space-y-2.5 animate-in fade-in zoom-in-95 duration-100">
                <div className="pb-2 border-b border-zinc-100 dark:border-zinc-800">
                  <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{user.nickname}</p>
                  <p className="text-[11px] text-zinc-500 truncate">{user.email}</p>
                  <p className="text-[10px] text-zinc-400 mt-0.5">
                    Dołączono: {new Date(user.created_at).toLocaleDateString('pl-PL')}
                  </p>
                </div>

                <div className="py-1">
                  <div className="p-2 bg-blue-50 dark:bg-blue-950/40 rounded-lg text-xs text-blue-900 dark:text-blue-300 flex items-center justify-between">
                    <span>Twoje zgłoszenia:</span>
                    <strong className="font-mono text-sm">{user.contributions_count ?? 0}</strong>
                  </div>
                </div>

                <div className="pt-1 space-y-1 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setIsDropdownOpen(false);
                      setIsPurgeModalOpen(true);
                    }}
                    className="w-full text-left p-2 rounded-lg text-amber-800 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 font-medium flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <ShieldAlert className="w-4 h-4 text-amber-600" />
                    <span>Narzędzie Bad Actor Purge</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full text-left p-2 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 font-medium flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Wyloguj się</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
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
