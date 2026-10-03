'use client';

import { useState, useEffect, useRef } from 'react';
import { User } from '@/types/user';
import { X, Lock, Mail, User as UserIcon, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: User) => void;
  initialMode?: 'login' | 'register';
}

export default function AuthModal({
  isOpen,
  onClose,
  onSuccess,
  initialMode = 'login',
}: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);

  // Sync mode with prop
  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  // Focus trap & escape key handler
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    setTimeout(() => firstInputRef.current?.focus(), 50);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const endpoint = mode === 'register' ? '/api/auth/register' : '/api/auth/login';
    const payload =
      mode === 'register'
        ? { nickname, email, password }
        : { email: email || nickname, password };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Wystąpił błąd podczas autoryzacji.');
      }

      setSuccessMessage(
        mode === 'register'
          ? 'Konto zostało pomyślnie utworzone! Witamy w społeczności.'
          : 'Pomyślnie zalogowano!'
      );

      setTimeout(() => {
        onSuccess(data.user);
        onClose();
      }, 700);
    } catch (err: any) {
      setErrorMessage(err.message || 'Nieoczekiwany błąd logowania.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden p-6 sm:p-7 animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800">
          <div>
            <h2 id="auth-modal-title" className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              {mode === 'login' ? 'Zaloguj się' : 'Utwórz konto'}
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              {mode === 'login'
                ? 'Uzyskaj dostęp do swoich zgłoszeń i historii'
                : 'Dołącz do krakowskiej społeczności dostępności'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Zamknij okno autoryzacji"
            className="w-9 h-9 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Switcher */}
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl my-4">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setErrorMessage(null);
            }}
            className={`min-h-[40px] text-xs font-bold rounded-lg transition-all cursor-pointer ${
              mode === 'login'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
            }`}
          >
            Logowanie
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setErrorMessage(null);
            }}
            className={`min-h-[40px] text-xs font-bold rounded-lg transition-all cursor-pointer ${
              mode === 'register'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
            }`}
          >
            Rejestracja
          </button>
        </div>

        {/* Status Messages */}
        {errorMessage && (
          <div
            role="alert"
            className="mb-4 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 rounded-lg text-xs flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div
            role="status"
            className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 rounded-lg text-xs flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === 'register' && (
            <div>
              <label
                htmlFor="auth-nickname"
                className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1"
              >
                Nick użytkownika:
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 absolute left-3 top-3 text-zinc-400 pointer-events-none" />
                <input
                  ref={firstInputRef}
                  id="auth-nickname"
                  type="text"
                  required
                  minLength={3}
                  maxLength={30}
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="np. JanKrakow"
                  className="w-full min-h-[44px] pl-9 pr-3 text-xs sm:text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>
            </div>
          )}

          <div>
            <label
              htmlFor="auth-email"
              className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1"
            >
              {mode === 'register' ? 'Adres e-mail:' : 'Adres e-mail lub Nick:'}
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-3 text-zinc-400 pointer-events-none" />
              <input
                ref={mode === 'login' ? firstInputRef : undefined}
                id="auth-email"
                type={mode === 'register' ? 'email' : 'text'}
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={mode === 'register' ? 'jan@krakow.pl' : 'jan@krakow.pl lub JanKrakow'}
                className="w-full min-h-[44px] pl-9 pr-3 text-xs sm:text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="auth-password"
              className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1"
            >
              Hasło:
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-3 text-zinc-400 pointer-events-none" />
              <input
                id="auth-password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full min-h-[44px] pl-9 pr-3 text-xs sm:text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>
            {mode === 'register' && (
              <p className="text-[11px] text-zinc-500 mt-1">
                Bezpieczny skrót hasła (scrypt) z solą kryptograficzną.
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full min-h-[44px] mt-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 text-white font-bold text-sm rounded-lg shadow-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Przetwarzanie...
              </>
            ) : mode === 'login' ? (
              'Zaloguj się'
            ) : (
              'Zarejestruj konto'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
