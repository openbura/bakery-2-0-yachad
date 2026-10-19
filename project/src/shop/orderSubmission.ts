import type { CreateOrderInput, CreatedOrder } from './orderTypes';

export const orderIntentKey = 'yachad-order-intent-v1';
export const orderReceiptKey = 'yachad-order-receipt-v1';
const tokenPattern = /^[a-f0-9]{64}$/;
const uuidPattern = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const maxIntentBytes = 64000;
type Identity = Pick<CreateOrderInput, 'idempotencyKey' | 'trackingToken'>;
function sameIdentity(a: Identity | null, b: Identity) { return a?.idempotencyKey === b.idempotencyKey && a.trackingToken === b.trackingToken; }
function makeTrackingToken() { const bytes = new Uint8Array(32); crypto.getRandomValues(bytes); return Array.from(bytes, byte => byte.toString(16).padStart(2,'0')).join(''); }

function parseOrderIntent(raw: string | null): CreateOrderInput | null {
  try {
    if (!raw || new TextEncoder().encode(raw).length > maxIntentBytes) return null;
    const data = JSON.parse(raw) as CreateOrderInput;
    if (!data || !tokenPattern.test(data.trackingToken) || !uuidPattern.test(data.idempotencyKey) ||
      !['delivery','pickup'].includes(data.fulfillmentType) || typeof data.customerName !== 'string' || data.customerName.length < 2 || data.customerName.length > 100 || typeof data.phone !== 'string' ||
      typeof data.customerNotes !== 'string' || data.customerNotes.length > 1000 ||
      !(data.requestedPickupAt === null || typeof data.requestedPickupAt === 'string' && Number.isFinite(Date.parse(data.requestedPickupAt))) ||
      !(data.deliveryAddress === null || typeof data.deliveryAddress === 'object' && !Array.isArray(data.deliveryAddress)) ||
      !Array.isArray(data.items) || !data.items.length || data.items.length > 200 || !data.items.every(item => item && typeof item.product_id === 'string' && item.product_id.length > 0 && Number.isSafeInteger(item.quantity) && item.quantity >= 1 && item.quantity <= 999 && Array.isArray(item.option_ids) && item.option_ids.length <= 100 && item.option_ids.every(id => typeof id === 'string' && uuidPattern.test(id))) ||
      !Number.isSafeInteger(data.expectedTotalAgorot) || data.expectedTotalAgorot < 0) return null;
    return data;
  } catch { return null; }
}
export function readOrderIntent(): CreateOrderInput | null {
  try { return parseOrderIntent(sessionStorage.getItem(orderIntentKey)); } catch { return null; }
}

// Called before the first POST. The exact immutable request and identity survive
// reload, cancellation and a lost response. Never replace an unresolved intent.
export function persistOrderIntent(request: Omit<CreateOrderInput, 'idempotencyKey' | 'trackingToken'>): CreateOrderInput {
  const existing = readOrderIntent();
  if (existing) return existing;
  try { if (sessionStorage.getItem(orderIntentKey)) throw new Error('יש טיוטת שליחה שלא ניתן לשחזר בבטחה. בדקו את ההזמנה הקודמת או פנו למאפייה לפני שליחה נוספת.'); }
  catch (error) { throw error instanceof Error ? error : new Error('אחסון השליחה אינו זמין בדפדפן.'); }
  const input = { ...request, idempotencyKey: crypto.randomUUID(), trackingToken: makeTrackingToken() };
  const serialized = JSON.stringify(input);
  if (new TextEncoder().encode(serialized).length > maxIntentBytes) throw new Error('ההזמנה ארוכה מדי לשליחה בטוחה. צמצמו את מספר השורות או פנו למאפייה.');
  if (!parseOrderIntent(serialized)) throw new Error('פרטי ההזמנה אינם תקינים לשמירה. בדקו את הטופס; ההזמנה לא נשלחה.');
  try { sessionStorage.setItem(orderIntentKey, serialized); if (sessionStorage.getItem(orderIntentKey) !== serialized) throw new Error('Storage verification failed'); }
  catch { throw new Error('לא ניתן לשמור את פרטי השליחה בדפדפן. בדקו שהאחסון בלשונית זמין לפני שליחת הזמנה.'); }
  return input;
}

export function clearOrderIntent(expected: Identity) {
  if (!sameIdentity(readOrderIntent(), expected)) return false;
  try { sessionStorage.removeItem(orderIntentKey); return true; } catch { return false; }
}
export function rememberOrderReceipt(receipt: CreatedOrder, expected: Identity) {
  const owned = sameIdentity(readOrderIntent(), expected);
  const previous = readOrderReceipt();
  if (!previous || receipt.orderNumber >= previous.orderNumber) {
    try { const raw = JSON.stringify(receipt); sessionStorage.setItem(orderReceiptKey, raw); if (sessionStorage.getItem(orderReceiptKey) !== raw) return owned; }
    catch { return owned; /* Keep intent recoverable if storing receipt failed. */ }
  }
  clearOrderIntent(expected);
  return owned;
}
export function readOrderReceipt(): CreatedOrder | null {
  try { const value = JSON.parse(sessionStorage.getItem(orderReceiptKey) || 'null'); return value && tokenPattern.test(value.trackingToken) && Number.isSafeInteger(value.orderNumber) ? value : null; } catch { return null; }
}
