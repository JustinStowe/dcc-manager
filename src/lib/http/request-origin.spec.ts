import { describe, expect, it } from 'vitest';
import { isSameOriginRequest } from './request-origin';

function check(origin: string | undefined, headers: Record<string, string> = {}, url = 'http://localhost:3000/api/system-ai') {
  return isSameOriginRequest(new Request(url, { method: 'POST', headers: { ...(origin === undefined ? {} : { origin }), ...headers } }));
}

describe('browser request origin validation', () => {
  it('accepts localhost and Request URLs without an explicit Host header', () => {
    expect(check('http://localhost:3000')).toBe(true);
    expect(check('http://localhost:3000', { host: 'localhost:3000', 'sec-fetch-site': 'same-origin' })).toBe(true);
  });

  it.each(['192.168.68.60', '172.30.80.1'])('accepts the browser LAN host %s even when Next uses localhost internally', host => {
    expect(check(`http://${host}:3000`, { host: `${host}:3000` })).toBe(true);
  });

  it('supports IPv6 authorities and normalizes default ports/case', () => {
    expect(check('http://[::1]:3000', { host: '[::1]:3000' })).toBe(true);
    expect(check('https://game.example', { host: 'GAME.EXAMPLE:443', 'x-forwarded-proto': 'https' })).toBe(true);
  });

  it('accepts the public HTTPS origin behind a forwarding proxy', () => {
    expect(check('https://game.example', { host: 'app.internal:3000', 'x-forwarded-host': 'game.example', 'x-forwarded-proto': 'https' })).toBe(true);
  });

  it('uses only the first forwarded host and protocol, matching Next', () => {
    const headers = { host: 'app.internal:3000', 'x-forwarded-host': 'game.example, proxy.internal', 'x-forwarded-proto': 'https, http' };
    expect(check('https://game.example', headers)).toBe(true);
    expect(check('https://proxy.internal', headers)).toBe(false);
  });

  it('does not accept the internal URL instead of a supplied public host', () => {
    expect(check('http://localhost:3000', { host: '192.168.68.60:3000' })).toBe(false);
    expect(check('http://localhost:3000', { host: 'localhost:3000', 'x-forwarded-host': 'game.example' })).toBe(false);
  });

  it.each(['https://other.example', 'http://localhost:3001', 'https://localhost:3000', 'null', '', 'not a URL', 'ftp://localhost:3000', 'http://user@localhost:3000', 'http://localhost:3000/path', 'http://localhost:3000?x=1', 'http://localhost:3000#fragment'])('rejects missing, malformed or different origins: %s', origin => {
    expect(check(origin, { host: 'localhost:3000' })).toBe(false);
  });

  it('requires an Origin header', () => {
    expect(check(undefined, { host: 'localhost:3000' })).toBe(false);
  });

  it.each(['cross-site', 'same-site', 'none'])('rejects browser fetch metadata identifying %s', fetchSite => {
    expect(check('http://localhost:3000', { host: 'localhost:3000', 'sec-fetch-site': fetchSite })).toBe(false);
  });

  it.each(['localhost:3000/path', 'user@localhost:3000', 'localhost:3000?x=1', 'localhost:3000,other.example'])('rejects malformed host authorities: %s', host => {
    expect(check('http://localhost:3000', { host })).toBe(false);
  });

  it('rejects unexpected forwarded protocols', () => {
    expect(check('http://localhost:3000', { host: 'localhost:3000', 'x-forwarded-proto': 'javascript' })).toBe(false);
  });
});
