import { useCallback, useEffect, useRef, useState } from 'react';
import { getBakerySupabaseClient } from '../lib/bakerySupabaseClient';
import { fetchPublicShopSnapshot, getFallbackShopSnapshot } from '../services/publicShopRepository';
import type { PublicShopSnapshot } from '../shop/publicShopTypes';

export type PublicShopStatus = 'loading' | 'live' | 'degraded';

export function usePublicShop() {
  const [snapshot, setSnapshot] = useState<PublicShopSnapshot>(() => getFallbackShopSnapshot());
  const [status, setStatus] = useState<PublicShopStatus>('loading');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const requestRef = useRef<Promise<PublicShopSnapshot> | null>(null);
  const mountedRef = useRef(true);

  const refresh = useCallback(async () => {
    if (requestRef.current) {
      return requestRef.current;
    }

    setIsRefreshing(true);
    const request = fetchPublicShopSnapshot();
    requestRef.current = request;

    try {
      const next = await request;
      if (mountedRef.current) {
        setSnapshot(next);
        setStatus('live');
      }
      return next;
    } catch (error) {
      if (mountedRef.current) {
        setStatus('degraded');
        setSnapshot((current) => current.live ? { ...current, live: false, source: 'fallback' } : getFallbackShopSnapshot());
      }
      throw error;
    } finally {
      requestRef.current = null;
      if (mountedRef.current) {
        setIsRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    void refresh().catch(() => undefined);
    return () => {
      mountedRef.current = false;
    };
  }, [refresh]);

  useEffect(() => {
    const handleFocus = () => void refresh().catch(() => undefined);
    const handleOnline = () => void refresh().catch(() => undefined);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('online', handleOnline);
    };
  }, [refresh]);

  useEffect(() => {
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

  return { snapshot, status, isRefreshing, realtimeConnected, refresh };
}
