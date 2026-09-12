/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BAKERY_ADMIN_SUPABASE_URL?: string;
  readonly VITE_BAKERY_ADMIN_SUPABASE_PUBLISHABLE_KEY?: string;
  readonly VITE_BAKERY_SHARED_LOGIN_EMAIL?: string;
  readonly VITE_BAKERY_SHARED_LOGIN_USERNAME?: string;
  readonly VITE_BAKERY_SHARED_LOGIN_PASSWORD?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module '*.css';
