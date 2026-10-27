import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
import { getBakeryEnvironment } from '../config/bakeryEnvironment';
import { getSupabaseClient } from '../lib/supabaseClient';
import type { AdminProfile } from '../types/dashboard';
import { OwnerFacingError } from './serviceErrors';
import { unsubscribeOwnerDevice } from '../../../src/push/pushApi';
import { ownerPushApi } from './pushApi';
import { onlineOrdersEnabled } from '../../../src/shop/release';
import { adminSessionExpired, clearAdminActivity, recordAdminActivity } from './adminSessionActivity';

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
    await client.auth.signOut({ scope: 'local' });
    throw new OwnerFacingError('החשבון אינו מורשה לנהל את המאפייה.');
  }

  return mapProfile(data);
}

export function getLoginPrefill() {
  const environment = getBakeryEnvironment();
  return {
    username: environment.sharedLoginUsername,
    password: '',
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

  const profile = await loadAuthorizedProfile(data.user);
  recordAdminActivity(profile.userId);
  return profile;
}

export async function restoreAuthorizedSession(): Promise<AdminProfile | null> {
  const client = getSupabaseClient();
  const { data, error } = await client.auth.getSession();
  if (error) {
    throw new OwnerFacingError('לא הצלחנו לשחזר את החיבור. בדקו את הרשת ונסו שוב.');
  }
  if (!data.session?.user) return null;
  if (adminSessionExpired(data.session.user.id)) {
    await expireInactiveAdminSession();
    return null;
  }
  const profile = await loadAuthorizedProfile(data.session.user);
  recordAdminActivity(profile.userId);
  return profile;
}

export async function expireInactiveAdminSession() {
  const { error } = await getSupabaseClient().auth.signOut({ scope: 'local' });
  if (!error) clearAdminActivity();
  // Keep the expired marker on network failure so reloading cannot resume it.
}

export async function signOutAdmin() {
  const pushStopped = onlineOrdersEnabled ? await unsubscribeOwnerDevice(ownerPushApi) : true;
  const { error } = await getSupabaseClient().auth.signOut({ scope: 'local' });
  if (error) throw new OwnerFacingError('לא הצלחנו להתנתק. נסו שוב.');
  clearAdminActivity();
  return pushStopped;
}

export function subscribeToAuthChanges(listener: (event: AuthChangeEvent, session: Session | null) => void) {
  const { data } = getSupabaseClient().auth.onAuthStateChange((event, session) => {
    queueMicrotask(() => listener(event, session));
  });
  return () => data.subscription.unsubscribe();
}
