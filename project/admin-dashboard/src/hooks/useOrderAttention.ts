import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { getSupabaseClient } from '../lib/supabaseClient';
import { acknowledgeOrder, fetchOrderAttention, type OrderAttention } from '../services/orderAttentionRepository';
import { ownerMessage } from '../services/serviceErrors';
import { onlineOrdersEnabled } from '../../../src/shop/release';

export function useOrderAttentionData() {
  const [queue, setQueue] = useState<OrderAttention[]>([]), [error, setError] = useState(''), [loading, setLoading] = useState(true);
  const [savingIds, setSavingIds] = useState<ReadonlySet<string>>(new Set());
  const saving = useRef(new Set<string>()), generation = useRef(0), mounted = useRef(false);
  const request = useRef<{ controller: AbortController; promise: Promise<void> } | null>(null);
  const cancelRequest = useCallback(() => { generation.current++; request.current?.controller.abort(); request.current = null; }, []);
  const load = useCallback((replace = false): Promise<void> => {
    if (request.current && !replace) return request.current.promise;
    request.current?.controller.abort();
    const controller = new AbortController(), attempt = ++generation.current;
    const timeout = window.setTimeout(() => controller.abort(), 12000);
    const promise = (async () => {
      try { const next = await fetchOrderAttention(controller.signal); if (mounted.current && attempt === generation.current) { setQueue(next); setError(''); } }
      catch { if (mounted.current && attempt === generation.current) setError('לא ניתן לבדוק הזמנות חדשות. התור המוצג הוא העדכון האחרון; בדקו את החיבור.'); }
      finally { window.clearTimeout(timeout); if (attempt === generation.current) { request.current = null; if (mounted.current) setLoading(false); } }
    })();
    request.current = { controller, promise }; return promise;
  }, []);
  const acknowledge = useCallback(async (id: string) => {
    if (saving.current.has(id)) return;
    saving.current.add(id); setSavingIds(new Set(saving.current));
    try {
      await acknowledgeOrder(id);
      if (!mounted.current) return;
      generation.current++; request.current?.controller.abort(); request.current = null;
      setQueue(current => current.filter(row => row.id !== id)); setError('');
      await load(true);
    } catch (caught) { if (mounted.current) setError(ownerMessage(caught, '״ראיתי״ לא נשמר. ההתראה עדיין פעילה.')); }
    finally { saving.current.delete(id); if (mounted.current) setSavingIds(new Set(saving.current)); }
  }, [load]);
  useEffect(() => {
    if (!onlineOrdersEnabled) return;
    mounted.current = true;
    const initial = window.setTimeout(() => void load(), 0), timer = window.setInterval(() => { if (!document.hidden) void load(); }, 3000);
    const foreground = () => { if (!document.hidden) void load(); };
    window.addEventListener('focus', foreground); window.addEventListener('online', foreground); document.addEventListener('visibilitychange', foreground);
    const client = getSupabaseClient(), channel = client.channel('bakery-owner-order-attention')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => void load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_attention' }, () => void load()).subscribe();
    return () => { mounted.current = false; cancelRequest(); window.clearTimeout(initial); window.clearInterval(timer); window.removeEventListener('focus', foreground); window.removeEventListener('online', foreground); document.removeEventListener('visibilitychange', foreground); void client.removeChannel(channel); };
  }, [load, cancelRequest]);
  return { queue, error, loading, savingIds, acknowledge, refresh: load };
}
export const OrderAttentionContext = createContext<ReturnType<typeof useOrderAttentionData> | null>(null);
export function useOrderAttention() { const value = useContext(OrderAttentionContext); if (!value) throw new Error('Order attention provider missing'); return value; }
