function firstForwardedValue(value: string | null): string | undefined {
  return value?.split(',')[0].trim() || undefined;
}

/** Validate the browser's origin against the public request address, not a
 * potentially rewritten internal Next.js URL. As with Next's Server Actions,
 * the first forwarded host takes precedence over Host when a proxy supplies it.
 */
export function isSameOriginRequest(request: Pick<Request, 'url' | 'headers'>): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return false;

  // Browsers send this only in supported contexts; HTTP LAN clients can omit it.
  const fetchSite = request.headers.get('sec-fetch-site');
  if (fetchSite && fetchSite !== 'same-origin') return false;

  try {
    const browser = new URL(origin);
    if (!['http:', 'https:'].includes(browser.protocol) || browser.username || browser.password || browser.pathname !== '/' || browser.search || browser.hash) return false;

    const internal = new URL(request.url);
    const forwardedProtocol = firstForwardedValue(request.headers.get('x-forwarded-proto'));
    const protocol = forwardedProtocol ? `${forwardedProtocol}:` : internal.protocol;
    if (!['http:', 'https:'].includes(protocol)) return false;

    const authority = firstForwardedValue(request.headers.get('x-forwarded-host')) ?? request.headers.get('host') ?? internal.host;
    // A host header is an authority, never a URL, credential pair or host list.
    if (!authority || /[\s,/@\\?#]/.test(authority)) return false;
    const external = new URL(`${protocol}//${authority}`);
    return browser.origin === external.origin;
  } catch {
    return false;
  }
}
