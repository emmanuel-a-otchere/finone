/**
 * useCachedApi — stale-while-revalidate with localStorage persistence.
 *
 * 1. Synchronously reads from localStorage → renders immediately (zero loading)
 * 2. Asynchronously revalidates from API  → overwrites stale cache
 * 3. TTL in ms (default 5 min) controls when cache is considered stale
 */
import { useState, useEffect, useCallback, useRef } from 'react';

export interface CachedData<T> {
  value: T;
  ts: number; // Unix ms
}

export function useCachedApi<T>(
  key: string,          // localStorage key, e.g. "systemone/feargreed"
  fetcher: () => Promise<T>,
  ttl = 300_000,        // 5 minutes
  
): { data: T | null; loading: boolean; refresh: () => void } {
  const [data, setData] = useState<T | null>(() => {
    try {
      const raw = localStorage.getItem(`systemone/${key}`);
      if (raw) {
        const { value, ts }: CachedData<T> = JSON.parse(raw);
        if (Date.now() - ts < ttl) return value;
      }
    } catch {/* ignore parse errors */}
    return null;
  });

  const [loading, setLoading] = useState(data === null);
  const keyRef = useRef(key);
  keyRef.current = key;

  const doFetch = useCallback(async () => {
    try {
      const fresh = await fetcher();
      const entry: CachedData<T> = { value: fresh, ts: Date.now() };
      localStorage.setItem(`systemone/${keyRef.current}`, JSON.stringify(entry));
      setData(fresh);
    } catch (err) {
      console.warn(`[useCachedApi] ${keyRef.current}: fetch failed, keeping stale cache`, err);
    } finally {
      setLoading(false);
    }
  }, [fetcher]); // eslint-disable-line react-hooks/exhaustive-deps

  // Initial fetch — only if no cached value
  useEffect(() => {
    if (data === null) {
      doFetch();
    }
  }, [doFetch, data]); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-validation after TTL (independent of component lifecycle)
  useEffect(() => {
    const raw = localStorage.getItem(`systemone/${key}`);
    if (!raw) return;
    try {
      const { ts }: CachedData<T> = JSON.parse(raw);
      const age = Date.now() - ts;
      if (age >= ttl) {
        doFetch();
        return;
      }
      // Schedule refresh for when TTL expires
      const timer = setTimeout(doFetch, ttl - age);
      return () => clearTimeout(timer);
    } catch {/* ignore */}
  }, [doFetch, ttl, key]); // eslint-disable-line react-hooks/exhaustive-deps

  const refresh = useCallback(() => {
    setLoading(true);
    doFetch();
  }, [doFetch]);

  return { data, loading, refresh };
}
