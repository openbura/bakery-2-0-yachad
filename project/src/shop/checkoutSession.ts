import type { ShopCartItem, ShopStoreSettings } from './publicShopTypes';
export type FulfillmentType = 'delivery' | 'pickup';
export const checkoutStorageKey = 'yachad-checkout-v1';
export const checkoutDraftStorageKey = 'yachad-checkout-draft-v1';
export type CheckoutDraft = {
  step: 'catalog' | 'details';
  customerName: string; phone: string; cityId: string; otherCity: string; street: string;
  houseNumber: string; residenceType: '' | 'building' | 'private-house';
  entrance: string; floor: string; apartment: string; notes: string; pickupTime: string;
};
export const emptyCheckoutDraft: CheckoutDraft = {
  step: 'catalog', customerName: '', phone: '', cityId: 'kfar-saba', otherCity: '', street: '',
  houseNumber: '', residenceType: 'building', entrance: '', floor: '', apartment: '', notes: '', pickupTime: '',
};

export function readCheckoutDraft(): CheckoutDraft {
  try {
    const stored = JSON.parse(sessionStorage.getItem(checkoutDraftStorageKey) || 'null');
    const result = { ...emptyCheckoutDraft };
    if (!stored || typeof stored !== 'object') return result;
    for (const key of ['customerName', 'phone', 'cityId', 'otherCity', 'street', 'houseNumber', 'entrance', 'floor', 'apartment', 'notes', 'pickupTime'] as const) {
      if (typeof stored[key] === 'string') result[key] = stored[key].slice(0, key === 'notes' ? 1000 : 200);
    }
    result.step = stored.step === 'details' ? 'details' : 'catalog';
    result.residenceType = stored.residenceType === 'private-house' ? 'private-house' : 'building';
    return result;
  } catch { return { ...emptyCheckoutDraft }; }
}

// Draft is limited to this browser tab. No contact details enter URLs or history.
export function writeCheckoutDraft(draft: CheckoutDraft) {
  try { sessionStorage.setItem(checkoutDraftStorageKey, JSON.stringify(draft)); } catch { /* In-memory checkout remains usable. */ }
}
export function resolveFulfillment(preferred: FulfillmentType, settings: Pick<ShopStoreSettings, 'deliveryEnabled' | 'pickupEnabled'>): FulfillmentType {
  if (settings[preferred === 'delivery' ? 'deliveryEnabled' : 'pickupEnabled']) return preferred;
  return settings.pickupEnabled ? 'pickup' : settings.deliveryEnabled ? 'delivery' : preferred;
}
// Cart cache contains no contact details. Cached prices never authorize an order.
export function readCheckoutSession(): { cart: Record<string, ShopCartItem>; fulfillment: FulfillmentType } {
  const empty = { cart: {}, fulfillment: 'delivery' as FulfillmentType };
  try {
    const data = JSON.parse(sessionStorage.getItem(checkoutStorageKey) || 'null');
    if (!data || data.version !== 1 || !data.cart || typeof data.cart !== 'object') return empty;
    const cart: Record<string, ShopCartItem> = {};
    for (const item of Object.values(data.cart) as ShopCartItem[]) {
      if (!item || typeof item.id !== 'string' || typeof item.productId !== 'string' || ['__proto__', 'constructor', 'prototype'].includes(item.id) ||
          !Number.isSafeInteger(item.quantity) || item.quantity < 1 || item.quantity > 999 ||
          !item.product || typeof item.product.name !== 'string' || !Array.isArray(item.product.optionGroups) ||
          !item.product.optionGroups.every(group => group && typeof group.code === 'string' && typeof group.name === 'string' && Array.isArray(group.options) && group.options.every(option => option && typeof option.code === 'string' && typeof option.name === 'string')) ||
          !Array.isArray(item.selections) ||
          !item.selections.every(s => s && typeof s.groupCode === 'string' && typeof s.optionCode === 'string' && typeof s.groupName === 'string' && typeof s.optionName === 'string' && Number.isSafeInteger(s.priceDeltaAgorot) && s.priceDeltaAgorot >= 0) ||
          !Number.isSafeInteger(item.unitPriceAgorot) || item.unitPriceAgorot < 0) continue;
      cart[item.id] = item;
    }
    return { cart, fulfillment: data.fulfillment === 'pickup' ? 'pickup' : 'delivery' };
  } catch { return empty; }
}
export function writeCheckoutSession(cart: Record<string, ShopCartItem>, fulfillment: FulfillmentType) {
  try { sessionStorage.setItem(checkoutStorageKey, JSON.stringify({ version: 1, cart, fulfillment })); }
  catch { /* Storage may be disabled; the in-memory checkout remains usable. */ }
}
