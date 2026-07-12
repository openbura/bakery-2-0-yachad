import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const allowedProjectRef = 'utyzqpjjjwjkkdlepkag';
const allowedHostname = `${allowedProjectRef}.supabase.co`;

let cachedClient: SupabaseClient | null | undefined;

function isLegacyAnonKey(value: string) {
  if (!value.startsWith('eyJ')) {
    return false;
  }

  try {
    const payload = value.split('.')[1];
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = JSON.parse(atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '='))) as { role?: string };
    return decoded.role === 'anon';
  } catch {
    return false;
  }
}

export function getBakerySupabaseConfigError() {
  const urlValue = import.meta.env.VITE_BAKERY_SUPABASE_URL?.trim();
  const keyValue = import.meta.env.VITE_BAKERY_SUPABASE_PUBLISHABLE_KEY?.trim();

  if (!urlValue || !keyValue) {
    return 'missing';
  }

  try {
    const url = new URL(urlValue);
    if (url.protocol !== 'https:' || url.hostname !== allowedHostname || url.username || url.password) {
      return 'project';
    }
  } catch {
    return 'project';
  }

  if (keyValue.startsWith('sb_secret_') || (!keyValue.startsWith('sb_publishable_') && !isLegacyAnonKey(keyValue))) {
    return 'key';
  }

  return null;
}

export function getBakerySupabaseClient(): SupabaseClient | null {
  if (cachedClient !== undefined) {
    return cachedClient;
  }

  if (getBakerySupabaseConfigError()) {
    cachedClient = null;
    return cachedClient;
  }

  cachedClient = createClient(
    import.meta.env.VITE_BAKERY_SUPABASE_URL.trim(),
    import.meta.env.VITE_BAKERY_SUPABASE_PUBLISHABLE_KEY.trim(),
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  );

  return cachedClient;
}
