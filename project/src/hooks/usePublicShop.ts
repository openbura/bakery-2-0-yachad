import { useCallback, useEffect, useRef, useState } from 'react';
import { getBakerySupabaseClient } from '../lib/bakerySupabaseClient';
import { fetchPublicShopSnapshot, getFallbackShopSnapshot, getOwnerReviewShopSnapshot } from '../services/publicShopRepository';
import { ownerReviewEnabled } from '../shop/release';
import type { PublicShopSnapshot } from '../shop/publicShopTypes';

export type PublicShopStatus = 'loading' | 'live' | 'degraded';

export function usePublicShop() {
  const [snapshot, setSnapshot] = useState<PublicShopSnapshot>(() => ownerReviewEnabled ? getOwnerReviewShopSnapshot() : getFallbackShopSnapshot());
  const [status, setStatus] = useState<PublicShopStatus>(ownerReviewEnabled ? 'live' : 'loading');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const requestRef = useRef<{ promise: Promise<PublicShopSnapshot>; controller: AbortController } | null>(null);
  const generationRef = useRef(0);
  const mountedRef = useRef(true);

  const cancelRefresh = useCallback(() => {
    generationRef.current += 1;
    requestRef.current?.controller.abort('cancelled');
    requestRef.current = null;
    if (mountedRef.current) setIsRefreshing(false);
  }, []);

  const refresh = useCallback((replacePending = false): Promise<PublicShopSnapshot> => {
    if (requestRef.current && !replacePending) return requestRef.current.promise;
    requestRef.current?.controller.abort('replaced');
    const controller = new AbortController();
    const generation = ++generationRef.current;
    const timeout = window.setTimeout(() => controller.abort('timeout'), 12000);
    setIsRefreshing(true);
    const promise = (async () => {
      try {
        const next = await fetchPublicShopSnapshot(controller.signal);
        if (controller.signal.aborted) throw new DOMException('Cancelled', 'AbortError');
        if (mountedRef.current && generation === generationRef.current) {
          setSnapshot(next);
          setStatus('live');
        }
        return next;
      } catch (error) {
        if (mountedRef.current && generation === generationRef.current && controller.signal.reason !== 'cancelled' && controller.signal.reason !== 'replaced') {
          setStatus('degraded');
          setSnapshot((current) => current.live ? { ...current, live: false, source: 'fallback' } : getFallbackShopSnapshot());
        }
        if (controller.signal.reason === 'timeout') throw new Error('האימות נמשך זמן רב מדי. נסו שוב או פנו למאפייה.', { cause: error });
        throw error;
      } finally {
        window.clearTimeout(timeout);
        if (generation === generationRef.current) {
          requestRef.current = null;
          if (mountedRef.current) setIsRefreshing(false);
        }
      }
    })();
    requestRef.current = { promise, controller };
    return promise;
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    void refresh().catch(() => undefined);
    return () => {
      mountedRef.current = false;
      cancelRefresh();
    };
  }, [refresh, cancelRefresh]);

  useEffect(() => {
    const handleFocus = () => void refresh().catch(() => undefined);
    const visibleRefresh = () => { if (document.visibilityState === 'visible') handleFocus(); };
    const poll = window.setInterval(visibleRefresh, 10_000);
    const handleOnline = () => void refresh().catch(() => undefined);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('online', handleOnline);
    document.addEventListener('visibilitychange', visibleRefresh);
    return () => {
      window.clearInterval(poll);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('online', handleOnline);
      document.removeEventListener('visibilitychange', visibleRefresh);
    };
  }, [refresh]);

  useEffect(() => {
    if (ownerReviewEnabled) return undefined;
    const client = getBakerySupabaseClient();
    if (!client) {
      return undefined;
    }

    let debounceHandle: number | undefined;
    const refetchSoon = () => {
      window.clearTimeout(debounceHandle);
      debounceHandle = window.setTimeout(() => void refresh().catch(() => undefined), 180);
    };
    const channel = client
      .channel('bakery-public-shop-operational')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, refetchSoon)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'store_settings', filter: 'id=eq.default' }, refetchSoon)
      .subscribe((nextStatus) => setRealtimeConnected(nextStatus === 'SUBSCRIBED'));

    return () => {
      window.clearTimeout(debounceHandle);
      setRealtimeConnected(false);
      void client.removeChannel(channel);
    };
  }, [refresh]);

  return { snapshot, status, isRefreshing, realtimeConnected, refresh, cancelRefresh };
}
