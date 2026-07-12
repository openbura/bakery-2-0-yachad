const expectedProjectRef = 'utyzqpjjjwjkkdlepkag';
const expectedHost = `${expectedProjectRef}.supabase.co`;

export class BakeryConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BakeryConfigurationError';
  }
}

export type BakeryEnvironment = {
  projectUrl: string;
  publishableKey: string;
  sharedLoginEmail: string;
  sharedLoginUsername: string;
  sharedLoginPassword: string;
};

let cachedEnvironment: BakeryEnvironment | null = null;

function required(value: string | undefined, label: string) {
  if (!value?.trim()) {
    throw new BakeryConfigurationError(`חסר משתנה ההגדרה ${label}. יש לבדוק את קובץ ההגדרות המקומי.`);
  }
  return value.trim();
}

export function getBakeryEnvironment(): BakeryEnvironment {
  if (cachedEnvironment) return cachedEnvironment;

  const projectUrl = required(import.meta.env.VITE_BAKERY_ADMIN_SUPABASE_URL, 'Supabase URL');
  const publishableKey = required(import.meta.env.VITE_BAKERY_ADMIN_SUPABASE_PUBLISHABLE_KEY, 'Supabase publishable key');
  const sharedLoginEmail = required(import.meta.env.VITE_BAKERY_SHARED_LOGIN_EMAIL, 'Bakery login email');
  const sharedLoginUsername = required(import.meta.env.VITE_BAKERY_SHARED_LOGIN_USERNAME, 'Bakery login username');
  const sharedLoginPassword = required(import.meta.env.VITE_BAKERY_SHARED_LOGIN_PASSWORD, 'Bakery login prefill');

  let host: string;
  try {
    host = new URL(projectUrl).hostname;
  } catch {
    throw new BakeryConfigurationError('כתובת Supabase המקומית אינה תקינה.');
  }

  if (host !== expectedHost) {
    throw new BakeryConfigurationError(`הדשבורד נעצר: יעד Supabase אינו פרויקט המאפייה המאושר (${expectedProjectRef}).`);
  }

  cachedEnvironment = {
    projectUrl,
    publishableKey,
    sharedLoginEmail,
    sharedLoginUsername,
    sharedLoginPassword,
  };
  return cachedEnvironment;
}

export function getBakeryProjectRef() {
  return expectedProjectRef;
}
