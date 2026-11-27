'use client';
import { useEffect, useRef, useState } from 'react';
import { changeSafeRoom, readSafeRoom } from '@/app/campaign/safe-room-actions';
import type { SafeRoomCommand, SafeRoomQuery, SafeRoomSnapshot } from '@/domain/safe-room';
import { announceFormSaved } from './live-edit-guard';

export function useSafeRoom(campaignId: string, crawlerId: string, query: SafeRoomQuery, onPending: (pending: boolean) => void, onChanged: () => void) {
  const [snapshot, setSnapshot] = useState<SafeRoomSnapshot | null>(null), [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false), locked = useRef(false), refresh = useRef<() => void>(() => {});
  const queryKey = JSON.stringify(query);
  useEffect(() => {
    let disposed = false, reading = false, queued = false, timer: number | undefined;
    async function read() {
      if (disposed || reading || document.visibilityState !== 'visible') return;
      reading = true; queued = false;
      try {
        const result = await readSafeRoom(crawlerId, JSON.parse(queryKey));
        if (!disposed) { if (result.snapshot) { setSnapshot(result.snapshot); setError(null); } else setError(result.error); }
      } catch { if (!disposed) setError('Could not load the Safe Room. Check your connection and refresh.'); }
      finally { reading = false; if (!disposed && queued) request(); }
    }
    function request() { if (disposed) return; queued = true; window.clearTimeout(timer); timer = window.setTimeout(() => void read(), 150); }
    refresh.current = request;
    document.addEventListener('dcc:live-signal', request); document.addEventListener('visibilitychange', request);
    window.addEventListener('focus', request); window.addEventListener('online', request);
    const interval = window.setInterval(request, 15000); request();
    return () => { disposed = true; window.clearTimeout(timer); window.clearInterval(interval); refresh.current = () => {}; document.removeEventListener('dcc:live-signal', request); document.removeEventListener('visibilitychange', request); window.removeEventListener('focus', request); window.removeEventListener('online', request); };
  }, [crawlerId, queryKey]);
  async function save(command: SafeRoomCommand, form?: HTMLFormElement) {
    if (locked.current) return false;
    locked.current = true; setPending(true); onPending(true); setError(null);
    try {
      const result = await changeSafeRoom(campaignId, crawlerId, command);
      if (result.error) { setError(result.error); return false; }
      if (form) announceFormSaved(form); else document.dispatchEvent(new Event('dcc:form-saved'));
      refresh.current(); onChanged(); return true;
    } catch { setError('Could not save the reward. Refresh before trying again.'); return false; }
    finally { locked.current = false; setPending(false); onPending(false); }
  }
  return { snapshot, error, pending, save, refresh: () => refresh.current() };
}
