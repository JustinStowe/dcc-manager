'use client';

import { useEffect, useRef, useState } from 'react';
import { readHud } from '@/app/campaign/hud-actions';
import type { HudSnapshot, TableNotification } from '@/domain/hud';
import { createHudSync } from '@/services/hud-sync';

export function useHud(campaignId: string, floor: number, initial: HudSnapshot | null, initialError: string | null) {
  const [snapshot, setSnapshot] = useState(initial), [error, setError] = useState(initialError);
  const [banners, setBanners] = useState<TableNotification[]>([]);
  const refresh = useRef<() => void>(() => {}), initialHead = useRef(initial?.head ?? null);
  useEffect(() => {
    const queue = createHudSync({
      initialHead: initialHead.current,
      read: () => readHud(campaignId, floor),
      receive(next, incoming) { setSnapshot(next); setError(null); if (incoming.length) setBanners(current => [...current, ...incoming].slice(-3)); },
      error: setError, visible: () => document.visibilityState === 'visible',
      schedule: run => window.setTimeout(run, 180), cancel: timer => window.clearTimeout(timer as number),
    });
    refresh.current = () => queue.request(false);
    function signal(event: Event) { queue.request((event as CustomEvent<string>).detail === 'changed'); }
    function sync() { queue.request(false); }
    document.addEventListener('dcc:live-signal', signal);
    document.addEventListener('visibilitychange', sync);
    window.addEventListener('focus', sync); window.addEventListener('online', sync);
    const timer = window.setInterval(sync, 15000);
    sync();
    return () => { queue.dispose(); refresh.current = () => {}; window.clearInterval(timer); document.removeEventListener('dcc:live-signal', signal); document.removeEventListener('visibilitychange', sync); window.removeEventListener('focus', sync); window.removeEventListener('online', sync); };
  }, [campaignId, floor]);
  useEffect(() => {
    if (!banners.length) return;
    const timer = window.setTimeout(() => setBanners(current => current.slice(1)), 6500);
    return () => window.clearTimeout(timer);
  }, [banners]);
  function dismissBanner(sequence: string) { setBanners(current => current.filter(b => b.sequence !== sequence)); }
  return { snapshot, error, banners, dismissBanner, refresh: () => refresh.current() };
}
