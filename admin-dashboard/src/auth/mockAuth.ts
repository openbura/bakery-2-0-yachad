const mockSessionKey = 'yachad-admin-stage-a-session';

export const temporaryUsername = '123123';
export const temporaryPassword = '123123';

// Stage B boundary: replace this isolated mock adapter with Bakery Supabase Auth.
export function hasMockSession() {
  return window.sessionStorage.getItem(mockSessionKey) === 'active';
}

export function createMockSession() {
  window.sessionStorage.setItem(mockSessionKey, 'active');
}

export function clearMockSession() {
  window.sessionStorage.removeItem(mockSessionKey);
}

export function validateTemporaryCredentials(username: string, password: string) {
  return username === temporaryUsername && password === temporaryPassword;
}
