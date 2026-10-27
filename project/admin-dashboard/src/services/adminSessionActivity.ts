export const adminActivityStorageKey = 'yachad-bakery-admin-last-activity-v1';
export const adminIdleTimeoutMs = 14 * 24 * 60 * 60 * 1000;

type Activity = { userId: string; lastActiveAt: number };
let memoryActivity: Activity | null = null;

function readActivity(): Activity | null {
  let raw: string | null;
  try {
    raw = localStorage.getItem(adminActivityStorageKey);
  } catch {
    return memoryActivity;
  }
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Activity;
    return typeof value.userId === 'string' && Number.isFinite(value.lastActiveAt)
      ? value : { userId: '', lastActiveAt: 0 };
  } catch {
    return { userId: '', lastActiveAt: 0 };
  }
}

export function adminSessionExpired(userId: string, now = Date.now()): boolean {
  const activity = readActivity();
  // Existing authenticated devices receive their first activity marker on restore.
  if (!activity || (activity.userId && activity.userId !== userId)) return false;
  return activity.lastActiveAt <= 0 || activity.lastActiveAt > now + 60_000 || now - activity.lastActiveAt >= adminIdleTimeoutMs;
}

export function recordAdminActivity(userId: string, now = Date.now()) {
  memoryActivity = { userId, lastActiveAt: now };
  try { localStorage.setItem(adminActivityStorageKey, JSON.stringify(memoryActivity)); }
  catch { /* The current tab can still time out when persistent storage is blocked. */ }
}

export function clearAdminActivity() {
  memoryActivity = null;
  try { localStorage.removeItem(adminActivityStorageKey); }
  catch { /* Supabase handles its own auth storage separately. */ }
}

export function watchAdminActivity(userId: string, onExpired: () => void) {
  let expired = false;
  let lastWrite = 0;
  const check = (active: boolean) => {
    if (expired) return;
    const now = Date.now();
    if (adminSessionExpired(userId, now)) {
      expired = true;
      onExpired();
      return;
    }
    if (active && document.visibilityState === 'visible' && now - lastWrite >= 1000) {
      recordAdminActivity(userId, now);
      lastWrite = now;
    }
  };
  const onActivity = () => check(true);
  const onStorage = (event: StorageEvent) => { if (event.key === adminActivityStorageKey) check(false); };
  const onVisibility = () => { if (document.visibilityState === 'visible') check(true); };
  const events = ['pointerdown', 'keydown', 'scroll', 'focus'] as const;
  for (const event of events) window.addEventListener(event, onActivity, { passive: true, capture: true });
  window.addEventListener('storage', onStorage);
  document.addEventListener('visibilitychange', onVisibility);
  // Token refresh, background polling and this timer never count as human activity.
  const timer = window.setInterval(() => check(false), 60_000);
  return () => {
    window.clearInterval(timer);
    for (const event of events) window.removeEventListener(event, onActivity, { capture: true });
    window.removeEventListener('storage', onStorage);
    document.removeEventListener('visibilitychange', onVisibility);
  };
}
