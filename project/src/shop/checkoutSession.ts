import type { ShopCartItem, ShopStoreSettings } from './publicShopTypes';
export type FulfillmentType = 'delivery' | 'pickup';
export const checkoutStorageKey = 'yachad-checkout-v1';
export function resolveFulfillment(preferred: FulfillmentType, settings: Pick<ShopStoreSettings, 'deliveryEnabled' | 'pickupEnabled'>): FulfillmentType {
  if (settings[preferred === 'delivery' ? 'deliveryEnabled' : 'pickupEnabled']) return preferred;
  return settings.pickupEnabled ? 'pickup' : settings.deliveryEnabled ? 'delivery' : preferred;
}
// Session-only: no contact details are persisted. Cached prices never authorize an order.
export function readCheckoutSession(): { cart: Record<string, ShopCartItem>; fulfillment: FulfillmentType } {
  const empty = { cart: {}, fulfillment: 'delivery' as FulfillmentType };
  try {
    const data = JSON.parse(sessionStorage.getItem(checkoutStorageKey) || 'null');
    if (!data || data.version !== 1 || !data.cart || typeof data.cart !== 'object') return empty;
    const cart: Record<string, ShopCartItem> = {};
    for (const item of Object.values(data.cart) as ShopCartItem[]) {
      if (!item || typeof item.id !== 'string' || typeof item.productId !== 'string' || ['__proto__', 'constructor', 'prototype'].includes(item.id) ||
          !Number.isSafeInteger(item.quantity) || item.quantity < 1 || item.quantity > 999 ||
          !item.product || typeof item.product.name !== 'string' || !Array.isArray(item.selections) ||
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
