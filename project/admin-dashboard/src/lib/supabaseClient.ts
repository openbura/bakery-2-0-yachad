import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getBakeryEnvironment } from '../config/bakeryEnvironment';
import type { Database } from '../types/database';

let bakeryClient: SupabaseClient<Database> | null = null;

export function getSupabaseClient() {
  if (bakeryClient) return bakeryClient;

  const environment = getBakeryEnvironment();
  bakeryClient = createClient<Database>(environment.projectUrl, environment.publishableKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      storageKey: 'yachad-bakery-admin-auth',
    },
  });
  return bakeryClient;
}
