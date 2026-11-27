import { freshBanners, type HudSnapshot, type TableNotification } from '@/domain/hud';

/** A separate HUD read queue: it never refreshes or replaces the sheet. */
export function createHudSync(options: {
  initialHead: string | null;
  read(): Promise<{ snapshot: HudSnapshot | null; error: string | null }>;
  receive(snapshot: HudSnapshot, banners: TableNotification[]): void;
  error(message: string): void;
  visible(): boolean;
  schedule(run: () => void): unknown;
  cancel(timer: unknown): void;
}) {
  let head = options.initialHead, disposed = false, reading = false, queued = false, notify = false, timer: unknown = null;
  async function flush() {
    if (disposed || reading || !queued) return;
    if (!options.visible()) { notify = false; return; }
    queued = false; reading = true;
    const announce = notify; notify = false;
    try {
      const result = await options.read();
      if (disposed) return;
      if (result.snapshot) {
        const banners = (announce || notify) && options.visible() ? freshBanners(result.snapshot, head) : [];
        head = result.snapshot.head;
        options.receive(result.snapshot, banners);
      } else options.error(result.error ?? 'Table alerts are temporarily unavailable.');
    } catch { if (!disposed) options.error('Table alerts could not reconnect. Automatic checks will continue.'); }
    finally { reading = false; if (!disposed && queued) request(false); }
  }
  function request(announce: boolean) {
    if (disposed) return;
    queued = true; notify = options.visible() ? notify || announce : false;
    if (timer !== null) options.cancel(timer);
    timer = options.schedule(() => { timer = null; void flush(); });
  }
  return { request, dispose() { disposed = true; if (timer !== null) options.cancel(timer); } };
}
