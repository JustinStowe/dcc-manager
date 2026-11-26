export type AppTheme = 'classic' | 'terminal';
export const THEME_COOKIE = 'dcc-theme';
export function isAppTheme(value: unknown): value is AppTheme {
  return value === 'classic' || value === 'terminal';
}
export function parseTheme(value: unknown): AppTheme {
  return isAppTheme(value) ? value : 'classic';
}
export function themeCookie(theme: AppTheme, secure: boolean): string {
  return `${THEME_COOKIE}=${theme}; Path=/; Max-Age=31536000; SameSite=Lax${secure ? '; Secure' : ''}`;
}
