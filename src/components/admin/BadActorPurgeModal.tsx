'use client';

import { useState, useEffect } from 'react';
import { BadActorPurgeResult, User } from '@/types/user';
import { Trash2, AlertTriangle, ShieldAlert, CheckCircle, Loader2, X, RefreshCw } from 'lucide-react';

interface BadActorPurgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPurgeComplete: (result: BadActorPurgeResult) => void;
}

export default function BadActorPurgeModal({
  isOpen,
  onClose,
  onPurgeComplete,
}: BadActorPurgeModalProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [purgingUserId, setPurgingUserId] = useState<string | null>(null);
  const [purgeResult, setPurgeResult] = useState<BadActorPurgeResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/purge-bad-actor');
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (err: any) {
      setError(err.message || 'Nie udało się pobrać listy kont.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
      setPurgeResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePurge = async (userId: string, nickname: string) => {
    const confirmed = window.confirm(
      `Czy na pewno chcesz usunąć wszystkie zgłoszenia i zdjęcia przesłane przez użytkownika "${nickname}" oraz zablokować to konto? Operacja jest nieodwracalna.`
    );
    if (!confirmed) return;

    setPurgingUserId(userId);
    setError(null);
    setPurgeResult(null);

    try {
      const res = await fetch('/api/admin/purge-bad-actor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bad_actor_id: userId }),
      });

      const data: BadActorPurgeResult = await res.json();
      if (!res.ok) {
        throw new Error((data as any).error || 'Błąd podczas usuwania naruszeń.');
      }

      setPurgeResult(data);
      onPurgeComplete(data);
      // Refresh list
      fetchUsers();
    } catch (err: any) {
      setError(err.message || 'Wystąpił błąd podczas usuwania danych.');
    } finally {
      setPurgingUserId(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="purge-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 id="purge-modal-title" className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100">
                Narzędzie Antyspamowe: Bad Actor Purge
              </h2>
              <p className="text-xs text-zinc-500">
                Usuwanie wszystkich zgłoszeń i plików ze Storage powiązanych ze spamerem
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Zamknij"
            className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs sm:text-sm">
          {/* Purge Result Banner */}
          {purgeResult && (
            <div
              role="alert"
              className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 rounded-xl space-y-1"
            >
              <div className="flex items-center gap-2 font-bold text-xs sm:text-sm">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Pomyślnie oczyszczono dane spamera: {purgeResult.nickname}</span>
              </div>
              <p className="text-xs text-emerald-800 dark:text-emerald-300 pl-6">
                Usunięto z bazy PostGIS: <strong>{purgeResult.purged_barriers_count}</strong> zgłoszeń.
                <br />
                Usunięto ze Storage: <strong>{purgeResult.purged_storage_images_count}</strong> plików zdjęć.
                <br />
                Status konta: <strong>Zablokowane (Banned)</strong>.
              </p>
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 rounded-xl text-xs flex items-center gap-2"
            >
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-zinc-500 pt-1">
            <span>Zarejestrowani użytkownicy i ich zgłoszenia:</span>
            <button
              type="button"
              onClick={fetchUsers}
              disabled={isLoading}
              className="flex items-center gap-1 text-blue-600 hover:text-blue-700 font-semibold cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              Odśwież listę
            </button>
          </div>

          {isLoading ? (
            <div className="p-8 text-center text-zinc-500 text-xs flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              <span>Ładowanie listy użytkowników...</span>
            </div>
          ) : users.length === 0 ? (
            <div className="p-6 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl text-center text-xs text-zinc-500">
              Brak zarejestrowanych kont użytkowników w bazie. Zarejestruj konto lub dodaj zgłoszenie!
            </div>
          ) : (
            <div className="divide-y divide-zinc-200 dark:divide-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
              {users.map((u) => (
                <div
                  key={u.id}
                  className="p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-zinc-900 dark:text-zinc-100">{u.nickname}</span>
                      {u.is_banned ? (
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 rounded-full border border-red-200 dark:border-red-900">
                          Zablokowany (Banned)
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded-full">
                          Aktywny
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-zinc-500 mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
                      <span>Email: {u.email}</span>
                      <span>Zgłoszenia: <strong>{u.contributions_count ?? 0}</strong></span>
                      <span>Utworzono: {new Date(u.created_at).toLocaleDateString('pl-PL')}</span>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-2 self-end sm:self-auto">
                    <button
                      type="button"
                      disabled={purgingUserId === u.id || u.is_banned}
                      onClick={() => handlePurge(u.id, u.nickname)}
                      className={`min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                        u.is_banned
                          ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed'
                          : 'bg-red-600 hover:bg-red-700 text-white shadow-xs focus:ring-2 focus:ring-red-400'
                      }`}
                    >
                      {purgingUserId === u.id ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Czyszczenie...
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-3.5 h-3.5" />
                          Purge Bad Actor
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-xl text-xs text-amber-800 dark:text-amber-300">
            <strong>Jak to działa:</strong> Kliknięcie <em>Purge Bad Actor</em> wywołuje procedurę RPC w Postgresie,
            która usuwa powiązane rekordy z tabeli <code>barriers</code>, blokuje konto użytkownika oraz usuwa wgrane zdjęcia
            z bucketa Supabase Storage (<code>barriers</code>).
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 bg-zinc-50 dark:bg-zinc-800/40 border-t border-zinc-200 dark:border-zinc-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-4 py-2 bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-zinc-900 dark:text-zinc-100 text-xs font-bold rounded-lg cursor-pointer transition-colors"
          >
            Zamknij
          </button>
        </div>
      </div>
    </div>
  );
}
