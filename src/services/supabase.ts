import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey;

let publicClientInstance: SupabaseClient | null = null;
let adminClientInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!publicClientInstance) {
    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn(
        '[Supabase] Warning: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is not set. Check .env.local.'
      );
    }
    publicClientInstance = createClient(
      supabaseUrl || 'https://placeholder.supabase.co',
      supabaseAnonKey || 'placeholder-anon-key'
    );
  }
  return publicClientInstance;
}

export function getSupabaseAdmin(): SupabaseClient {
  if (!adminClientInstance) {
    if (!supabaseUrl || !supabaseServiceKey) {
      console.warn(
        '[Supabase Admin] Warning: NEXT_PUBLIC_SUPABASE_URL or service key is not set.'
      );
    }
    adminClientInstance = createClient(
      supabaseUrl || 'https://placeholder.supabase.co',
      supabaseServiceKey || 'placeholder-key',
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );
  }
  return adminClientInstance;
}
