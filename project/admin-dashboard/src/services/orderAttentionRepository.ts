import { getSupabaseClient } from '../lib/supabaseClient';
import { OwnerFacingError } from './serviceErrors';

export type OrderAttention = { id: string; orderNumber: number; customerName: string; fulfillmentType: string; totalAgorot: number; createdAt: string };
export async function fetchOrderAttention(signal: AbortSignal): Promise<OrderAttention[]> {
  let cursor = 0;
  const rows: OrderAttention[] = [];
  for (;;) {
    const { data, error } = await getSupabaseClient().rpc('get_bakery_order_attention', { p_after_number: cursor, p_limit: 200 }).abortSignal(signal);
    if (error) throw new OwnerFacingError('לא ניתן לבדוק הזמנות חדשות כרגע. אין אישור שהתור ריק.');
    for (const row of data ?? []) rows.push({ id: row.id, orderNumber: row.order_number, customerName: row.customer_name, fulfillmentType: row.fulfillment_type, totalAgorot: row.total_agorot, createdAt: row.created_at });
    if (!data || data.length < 200) break;
    const next = data.at(-1)!.order_number;
    if (next <= cursor) throw new OwnerFacingError('תור ההתראות לא נטען במלואו. נסו שוב.');
    cursor = next;
  }
  return rows;
}
export async function acknowledgeOrder(id: string) {
  const { data, error } = await getSupabaseClient().rpc('acknowledge_bakery_order', { p_order_id: id }).abortSignal(AbortSignal.timeout(12000));
  const row = Array.isArray(data) ? data[0] : data;
  if (error || !row || row.order_id !== id || !row.acknowledged_at) throw new OwnerFacingError('״ראיתי״ לא נשמר. ההתראה נשארת פעילה; נסו שוב.');
}
