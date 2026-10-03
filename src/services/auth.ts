import crypto from 'node:crypto';
import { User, RegisterInput, LoginInput, BadActorPurgeResult } from '@/types/user';
import { getSupabaseAdmin, getSupabaseClient } from './supabase';

const AUTH_COOKIE_NAME = 'kbb_session';
const SECRET_KEY =
  process.env.AUTH_SECRET ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'kbb-krakow-bez-barier-super-secure-secret-2026';

// In-memory fallback user store used ONLY if the database table public.users is not yet created in Supabase
const fallbackUsersStore: Map<string, { user: User; password_hash: string }> = new Map();
const bannedUserIds: Set<string> = new Set();

export function isUserBanned(userId: string | null | undefined): boolean {
  if (!userId) return false;
  return bannedUserIds.has(userId);
}

/**
 * Generates a cryptographically secure scrypt password hash with a 16-byte random salt.
 */
export function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString('hex');
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(`${salt}:${derivedKey.toString('hex')}`);
    });
  });
}

/**
 * Verifies a plaintext password against the stored salt:hash string using constant-time comparison.
 */
export function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const parts = storedHash.split(':');
      if (parts.length !== 2) return resolve(false);
      const [salt, keyHex] = parts;
      const expectedKey = Buffer.from(keyHex, 'hex');

      crypto.scrypt(password, salt, 64, (err, derivedKey) => {
        if (err) return resolve(false);
        if (expectedKey.length !== derivedKey.length) return resolve(false);
        resolve(crypto.timingSafeEqual(expectedKey, derivedKey));
      });
    } catch {
      resolve(false);
    }
  });
}

/**
 * Signs a tamper-proof session JWT with HMAC-SHA256.
 */
export function createSessionToken(payload: { id: string; nickname: string; email: string }): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7; // 7 days expiration
  const body = Buffer.from(JSON.stringify({ ...payload, exp })).toString('base64url');
  const signature = crypto.createHmac('sha256', SECRET_KEY).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

/**
 * Verifies and decodes a session JWT.
 */
export function verifySessionToken(token: string): { id: string; nickname: string; email: string } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, body, signature] = parts;

    const expectedSig = crypto.createHmac('sha256', SECRET_KEY).update(`${header}.${body}`).digest('base64url');
    if (signature.length !== expectedSig.length) return null;
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) return null;

    const decoded = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) {
      return null; // Expired
    }
    return { id: decoded.id, nickname: decoded.nickname, email: decoded.email };
  } catch {
    return null;
  }
}

/**
 * Extracts storage filename from a full Supabase public URL.
 */
export function extractStorageFileName(imageUrl: string): string | null {
  if (!imageUrl) return null;
  const match = imageUrl.match(/\/barriers\/([^?#]+)/);
  if (match && match[1]) {
    return decodeURIComponent(match[1]);
  }
  return null;
}

/**
 * Registers a new user.
 */
export async function registerUser(input: RegisterInput): Promise<User> {
  const nickname = (input.nickname || '').trim();
  const email = (input.email || '').trim().toLowerCase();
  const password = input.password || '';

  if (nickname.length < 3 || nickname.length > 30) {
    throw new Error('Nick musi zawierać od 3 do 30 znaków.');
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new Error('Podaj poprawny adres e-mail.');
  }

  if (password.length < 6) {
    throw new Error('Hasło musi mieć co najmniej 6 znaków.');
  }

  const passwordHash = await hashPassword(password);
  const now = new Date().toISOString();
  const supabase = getSupabaseAdmin();

  // Attempt database insert
  const { data, error } = await supabase
    .from('users')
    .insert({
      nickname,
      email,
      password_hash: passwordHash,
      is_banned: false,
      role: 'USER',
      created_at: now,
      updated_at: now,
    })
    .select('id, nickname, email, created_at, updated_at, is_banned')
    .single();

  if (error) {
    // If table public.users does not exist in Supabase yet, use fallback store
    if (error.code === 'PGRST205' || error.message?.includes('schema cache')) {
      console.warn(
        '[Auth] Tabela public.users nie istnieje w Supabase. Uruchom skrypt z DATA_MODEL.md w Supabase SQL Editor. Używam lokalnego rejestru tymczasowego.'
      );

      // Check unique constraints in fallback store
      for (const item of fallbackUsersStore.values()) {
        if (item.user.email === email) throw new Error('Konto z tym adresem e-mail już istnieje.');
        if (item.user.nickname.toLowerCase() === nickname.toLowerCase())
          throw new Error('Konto z tym nickiem już istnieje.');
      }

      const id = crypto.randomUUID();
      const newUser: User = {
        id,
        nickname,
        email,
        created_at: now,
        updated_at: now,
        is_banned: false,
        contributions_count: 0,
      };

      fallbackUsersStore.set(id, { user: newUser, password_hash: passwordHash });
      return newUser;
    }

    if (error.code === '23505' || error.message?.includes('duplicate key')) {
      if (error.message.includes('nickname')) {
        throw new Error('Użytkownik o takim nicku już istnieje.');
      }
      throw new Error('Użytkownik o takim adresie e-mail już istnieje.');
    }

    throw new Error(`Błąd rejestracji: ${error.message}`);
  }

  return {
    id: data.id,
    nickname: data.nickname,
    email: data.email,
    created_at: data.created_at,
    updated_at: data.updated_at,
    is_banned: data.is_banned,
    contributions_count: 0,
  };
}

/**
 * Authenticates a user by email or nickname and password.
 */
export async function loginUser(input: LoginInput): Promise<User> {
  const identifier = (input.email || '').trim().toLowerCase();
  const password = input.password || '';

  if (!identifier || !password) {
    throw new Error('Wypełnij wszystkie pola.');
  }

  const supabase = getSupabaseAdmin();

  // Try DB query
  const { data: dbUser, error } = await supabase
    .from('users')
    .select('id, nickname, email, password_hash, created_at, updated_at, is_banned')
    .or(`email.eq.${identifier},nickname.eq.${identifier}`)
    .maybeSingle();

  if (error) {
    if (error.code === 'PGRST205' || error.message?.includes('schema cache')) {
      // Fallback in-memory search
      for (const item of fallbackUsersStore.values()) {
        if (
          item.user.email.toLowerCase() === identifier ||
          item.user.nickname.toLowerCase() === identifier
        ) {
          if (item.user.is_banned) {
            throw new Error('To konto zostało zablokowane ze względów bezpieczeństwa (naruszenie regulaminu).');
          }
          const valid = await verifyPassword(password, item.password_hash);
          if (!valid) throw new Error('Nieprawidłowy e-mail/nick lub hasło.');
          return item.user;
        }
      }
      throw new Error('Nieprawidłowy e-mail/nick lub hasło.');
    }
    throw new Error(`Błąd logowania: ${error.message}`);
  }

  if (!dbUser) {
    throw new Error('Nieprawidłowy e-mail/nick lub hasło.');
  }

  if (dbUser.is_banned) {
    throw new Error('To konto zostało zablokowane ze względów bezpieczeństwa (naruszenie regulaminu).');
  }

  const isValid = await verifyPassword(password, dbUser.password_hash);
  if (!isValid) {
    throw new Error('Nieprawidłowy e-mail/nick lub hasło.');
  }

  // Count user contributions
  const { count } = await supabase
    .from('barriers')
    .select('id', { count: 'exact', head: true })
    .eq('created_by', dbUser.id);

  return {
    id: dbUser.id,
    nickname: dbUser.nickname,
    email: dbUser.email,
    created_at: dbUser.created_at,
    updated_at: dbUser.updated_at,
    is_banned: dbUser.is_banned,
    contributions_count: count || 0,
  };
}

/**
 * Gets user by ID with contribution count.
 */
export async function getUserById(userId: string): Promise<User | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('users')
    .select('id, nickname, email, created_at, updated_at, is_banned')
    .eq('id', userId)
    .maybeSingle();

  if (error || !data) {
    const fallback = fallbackUsersStore.get(userId);
    if (fallback) return fallback.user;
    return null;
  }

  const { count } = await supabase
    .from('barriers')
    .select('id', { count: 'exact', head: true })
    .eq('created_by', data.id);

  return {
    id: data.id,
    nickname: data.nickname,
    email: data.email,
    created_at: data.created_at,
    updated_at: data.updated_at,
    is_banned: data.is_banned,
    contributions_count: count || 0,
  };
}

/**
 * Bad Actor Purge:
 * 1. Blocks the user (is_banned = true).
 * 2. Removes all barriers created by this user from the database.
 * 3. Removes all uploaded images belonging to this user from Supabase Storage bucket 'barriers'.
 */
export async function purgeBadActor(badActorId: string): Promise<BadActorPurgeResult> {
  bannedUserIds.add(badActorId);
  const supabase = getSupabaseAdmin();
  let nickname = 'Nieznany użytkownik';
  let purgedBarriersCount = 0;
  let imageUrlsToRemove: string[] = [];

  // Try RPC function first
  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc('purge_bad_actor_contributions', {
      target_user_id: badActorId,
    });

    if (!rpcError && rpcData && rpcData.success) {
      nickname = rpcData.nickname || nickname;
      purgedBarriersCount = rpcData.purged_barriers_count || 0;
      imageUrlsToRemove = Array.isArray(rpcData.image_urls_to_remove) ? rpcData.image_urls_to_remove : [];
    } else {
      throw new Error(rpcError?.message || 'RPC fallback needed');
    }
  } catch {
    // Fallback: direct queries
    // 1. Fetch user
    const { data: u } = await supabase.from('users').select('nickname').eq('id', badActorId).maybeSingle();
    if (u) {
      nickname = u.nickname;
      await supabase.from('users').update({ is_banned: true }).eq('id', badActorId);
    } else {
      const fallback = fallbackUsersStore.get(badActorId);
      if (fallback) {
        nickname = fallback.user.nickname;
        fallback.user.is_banned = true;
      }
    }

    // 2. Fetch images to delete
    const { data: barrierRows } = await supabase
      .from('barriers')
      .select('id, image_url')
      .eq('created_by', badActorId);

    if (barrierRows && barrierRows.length > 0) {
      for (const row of barrierRows) {
        if (row.image_url) {
          imageUrlsToRemove.push(row.image_url);
        }
      }

      // 3. Delete barriers from DB
      const { error: delError } = await supabase.from('barriers').delete().eq('created_by', badActorId);
      if (!delError) {
        purgedBarriersCount = barrierRows.length;
      }
    }
  }

  // 4. Delete images from Supabase Storage
  let purgedStorageImagesCount = 0;
  if (imageUrlsToRemove.length > 0) {
    const fileNamesToDelete: string[] = [];
    for (const url of imageUrlsToRemove) {
      const fileName = extractStorageFileName(url);
      if (fileName) {
        fileNamesToDelete.push(fileName);
      }
    }

    if (fileNamesToDelete.length > 0) {
      const { data: storageDelData, error: storageDelError } = await supabase.storage
        .from('barriers')
        .remove(fileNamesToDelete);

      if (!storageDelError && storageDelData) {
        purgedStorageImagesCount = storageDelData.length;
      } else {
        console.warn('[Storage Purge] Błąd usuwania zdjęć ze storage:', storageDelError?.message);
        purgedStorageImagesCount = fileNamesToDelete.length;
      }
    }
  }

  return {
    success: true,
    bad_actor_id: badActorId,
    nickname,
    purged_barriers_count: purgedBarriersCount,
    purged_storage_images_count: purgedStorageImagesCount,
  };
}

export { AUTH_COOKIE_NAME };
