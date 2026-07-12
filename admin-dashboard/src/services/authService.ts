import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
import { getBakeryEnvironment } from '../config/bakeryEnvironment';
import { getSupabaseClient } from '../lib/supabaseClient';
import type { AdminProfile } from '../types/dashboard';
import { OwnerFacingError } from './serviceErrors';

function mapProfile(row: { user_id: string; display_name: string; role: 'owner' | 'manager'; active: boolean }): AdminProfile {
  return {
    userId: row.user_id,
    displayName: row.display_name,
    role: row.role,
    active: row.active,
  };
}

async function loadAuthorizedProfile(user: User) {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('admin_users')
    .select('user_id, display_name, role, active')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    throw new OwnerFacingError('לא הצלחנו לבדוק את הרשאת הניהול. נסו שוב בעוד רגע.');
  }

  if (!data || data.user_id !== user.id || !data.active || !['owner', 'manager'].includes(data.role)) {
    await client.auth.signOut();
    throw new OwnerFacingError('החשבון אינו מורשה לנהל את המאפייה.');
  }

  return mapProfile(data);
}

export function getLoginPrefill() {
  const environment = getBakeryEnvironment();
  return {
    username: environment.sharedLoginUsername,
    password: environment.sharedLoginPassword,
  };
}

export async function signInSharedAdmin(username: string, password: string) {
  const environment = getBakeryEnvironment();
  if (username.trim() !== environment.sharedLoginUsername) {
    throw new OwnerFacingError('שם המשתמש או הסיסמה אינם נכונים.');
  }

  const client = getSupabaseClient();
  const { data, error } = await client.auth.signInWithPassword({
    email: environment.sharedLoginEmail,
    password,
  });

  if (error || !data.user || !data.session) {
    throw new OwnerFacingError('שם המשתמש או הסיסמה אינם נכונים.');
  }

  return loadAuthorizedProfile(data.user);
}

export async function restoreAuthorizedSession(): Promise<AdminProfile | null> {
  const client = getSupabaseClient();
  const { data, error } = await client.auth.getSession();
  if (error) {
    throw new OwnerFacingError('לא הצלחנו לשחזר את החיבור. בדקו את הרשת ונסו שוב.');
  }
  if (!data.session?.user) return null;
  return loadAuthorizedProfile(data.session.user);
}

export async function signOutAdmin() {
  const { error } = await getSupabaseClient().auth.signOut();
  if (error) throw new OwnerFacingError('לא הצלחנו להתנתק. נסו שוב.');
}

export function subscribeToAuthChanges(listener: (event: AuthChangeEvent, session: Session | null) => void) {
  const { data } = getSupabaseClient().auth.onAuthStateChange((event, session) => {
    queueMicrotask(() => listener(event, session));
  });
  return () => data.subscription.unsubscribe();
}
