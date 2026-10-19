import { getBakerySupabaseClient } from '../lib/bakerySupabaseClient';
import type { CreateOrderInput, CreatedOrder, PickupSlot, TrackedOrder } from '../shop/orderTypes';
import { onlineOrdersEnabled, ordersOpeningMessage } from '../shop/release';

function client() {
  const value = getBakerySupabaseClient();
  if (!value) throw new Error('החיבור למאפייה אינו זמין כרגע.');
  return value;
}

export function makeTrackingToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function fetchPickupSlots(): Promise<PickupSlot[]> {
  if (!onlineOrdersEnabled) return [];
  const { data, error } = await client().rpc('get_bakery_pickup_slots', { p_days: 14 }).abortSignal(AbortSignal.timeout(12000));
  if (error) throw new Error('לא הצלחנו לטעון את מועדי האיסוף.');
  return ((data ?? []) as Array<{ starts_at: string; remaining_capacity: number }>).map((slot) => ({
    startsAt: slot.starts_at,
    remainingCapacity: slot.remaining_capacity,
  }));
}

export async function createOrder(input: CreateOrderInput): Promise<CreatedOrder> {
  if (!onlineOrdersEnabled) throw new OrderSubmissionError(ordersOpeningMessage, true);
  const { data, error } = await client().rpc('create_bakery_order', {
    p_idempotency_key: input.idempotencyKey,
    p_tracking_token: input.trackingToken,
    p_fulfillment_type: input.fulfillmentType,
    p_requested_pickup_at: input.requestedPickupAt,
    p_customer_name: input.customerName,
    p_phone: input.phone,
    p_delivery_address: input.deliveryAddress,
    p_customer_notes: input.customerNotes,
    p_items: input.items,
    p_expected_total_agorot: input.expectedTotalAgorot,
  }).abortSignal(AbortSignal.timeout(12000));
  if (error) {
    const code = error.message.match(/(PICKUP_SLOT_FULL|PICKUP_SLOT_BLOCKED|INVALID_PICKUP_TIME|PRODUCT_UNAVAILABLE|PRODUCT_CHOICES_UNAVAILABLE|ORDERING_CLOSED|PICKUP_CLOSED|DELIVERY_HOURS_CLOSED|DELIVERY_CLOSED|PRICE_CHANGED|DELIVERY_MINIMUM_NOT_MET|TOO_MANY_ORDERS|IDEMPOTENCY_CONFLICT|INVALID_[A-Z_]+|NOTES_TOO_LONG|TOTAL_TOO_LARGE)/)?.[1];
    const messages: Record<string, string> = {
      PICKUP_SLOT_FULL: 'מועד האיסוף התמלא. בחרו שעה אחרת.',
      PICKUP_SLOT_BLOCKED: 'מועד האיסוף נסגר. בחרו שעה אחרת.',
      INVALID_PICKUP_TIME: 'מועד האיסוף אינו זמין יותר. בחרו שעה אחרת.',
      PRODUCT_UNAVAILABLE: 'אחד המוצרים אינו זמין יותר. רעננו את הסל.',
      ORDERING_CLOSED: 'המאפייה אינה מקבלת הזמנות כרגע.',
      PICKUP_CLOSED: 'האיסוף העצמי אינו זמין כרגע.',
      DELIVERY_CLOSED: 'המשלוחים אינם זמינים כרגע.',
      DELIVERY_HOURS_CLOSED: 'המשלוחים סגורים בשעה הזו. אפשר לבחור איסוף במועד זמין או לפנות למאפייה.',
      PRODUCT_CHOICES_UNAVAILABLE: 'אפשרויות אחד המוצרים אינן זמינות. עדכנו את הסל.',
      PRICE_CHANGED: 'המחיר השתנה מאז שבדקתם. עדכנו את הסיכום לפני שליחה נוספת.',
      DELIVERY_MINIMUM_NOT_MET: 'הסל אינו מגיע למינימום המשלוח העדכני.',
      TOO_MANY_ORDERS: 'נשלחו כמה הזמנות בזמן קצר. בדקו את ההזמנות הקיימות או פנו למאפייה.',
      IDEMPOTENCY_CONFLICT: 'יש בקשת הזמנה קודמת שלא תואמת לפרטים. בדקו את מצב השליחה לפני הזמנה נוספת.',
    };
    throw new OrderSubmissionError(code ? messages[code] || 'פרטי ההזמנה אינם תקינים. בדקו את הטופס והסל.' : 'לא התקבלה תשובה ברורה מהמאפייה. נבדוק אם ההזמנה נשמרה לפני ניסיון נוסף.', Boolean(code), code);
  }
  const row = (data as Array<{ order_number: number; tracking_token: string }> | null)?.[0];
  if (!row) throw new OrderSubmissionError('לא התקבלה תשובה ברורה. בדקו את מצב השליחה.', false);
  return { orderNumber: row.order_number, trackingToken: row.tracking_token };
}

export async function fetchTrackedOrder(trackingToken: string): Promise<TrackedOrder | null> {
  if (!/^[a-f0-9]{64}$/.test(trackingToken)) return null;
  const { data, error } = await client().rpc('get_bakery_order_status', { p_tracking_token: trackingToken }).abortSignal(AbortSignal.timeout(10000));
  if (error) throw new Error('לא הצלחנו לטעון את מצב ההזמנה.');
  return (data as TrackedOrder | null) ?? null;
}

export class OrderSubmissionError extends Error {
  readonly definitive: boolean;
  readonly code?: string;
  constructor(message: string, definitive: boolean, code?: string) { super(message); this.name = 'OrderSubmissionError'; this.definitive = definitive; this.code = code; }
}
