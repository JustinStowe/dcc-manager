import { describe, expect, it } from 'vitest';
import { isAppTheme, parseTheme, themeCookie } from './theme';

describe('saved appearance preference', () => {
  it('uses Light mode for a new browser or an unrecognized preference', () => {
    for (const value of [undefined, null, '', 'dark', 'TERMINAL', '<script>']) expect(parseTheme(value)).toBe('classic');
  });
  it('accepts only the two supported themes', () => {
    expect(parseTheme('terminal')).toBe('terminal');
    expect(parseTheme('classic')).toBe('classic');
    expect(isAppTheme({ theme: 'terminal' })).toBe(false);
  });
  it('saves across routes for a year and supports both HTTPS and local HTTP', () => {
    expect(themeCookie('terminal', true)).toBe('dcc-theme=terminal; Path=/; Max-Age=31536000; SameSite=Lax; Secure');
    expect(themeCookie('classic', false)).toBe('dcc-theme=classic; Path=/; Max-Age=31536000; SameSite=Lax');
  });
});
