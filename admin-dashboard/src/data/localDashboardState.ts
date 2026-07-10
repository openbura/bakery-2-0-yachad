import type { StoreSettings } from '../types/dashboard';

const storeSettingsKey = 'yachad-admin-stage-a-store-settings';

export function loadStoreSettings(fallback: StoreSettings): StoreSettings {
  try {
    const storedValue = window.localStorage.getItem(storeSettingsKey);
    if (!storedValue) return fallback;

    const parsed = JSON.parse(storedValue) as Partial<StoreSettings>;
    return {
      ...fallback,
      ...parsed,
      orderingEnabled: typeof parsed.orderingEnabled === 'boolean' ? parsed.orderingEnabled : fallback.orderingEnabled,
      deliveryEnabled: typeof parsed.deliveryEnabled === 'boolean' ? parsed.deliveryEnabled : fallback.deliveryEnabled,
      pickupEnabled: typeof parsed.pickupEnabled === 'boolean' ? parsed.pickupEnabled : fallback.pickupEnabled,
      noticeActive: typeof parsed.noticeActive === 'boolean' ? parsed.noticeActive : fallback.noticeActive,
    };
  } catch {
    return fallback;
  }
}

export function saveStoreSettings(settings: StoreSettings) {
  window.localStorage.setItem(storeSettingsKey, JSON.stringify(settings));
}
