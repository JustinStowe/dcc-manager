'use client';

import { createContext, useContext, useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { isAppTheme, themeCookie, type AppTheme } from '@/lib/theme';
import styles from '@/styles/theme-switcher.module.css';

const ThemeContext = createContext<{ theme: AppTheme; selectTheme(theme: AppTheme): void } | null>(null);

export function ThemeProvider({ initialTheme, children }: { initialTheme: AppTheme; children: ReactNode }) {
  const [theme, setTheme] = useState(initialTheme);
  const channel = useRef<BroadcastChannel | null>(null);
  useEffect(() => {
    // Existing encounter windows and other tabs follow changes on this origin.
    try {
      const connection = new BroadcastChannel('dcc-appearance');
      channel.current = connection;
      connection.onmessage = (event: MessageEvent<unknown>) => {
        if (!isAppTheme(event.data)) return;
        document.documentElement.dataset.theme = event.data;
        setTheme(event.data);
      };
      return () => { connection.close(); channel.current = null; };
    } catch { return undefined; /* Theme switching also works without BroadcastChannel. */ }
  }, []);
  function selectTheme(next: AppTheme) {
    document.documentElement.dataset.theme = next;
    document.cookie = themeCookie(next, location.protocol === 'https:');
    setTheme(next);
    try { channel.current?.postMessage(next); } catch { /* Closed/background channels must not prevent switching. */ }
  }
  return <ThemeContext.Provider value={{ theme, selectTheme }}>{children}</ThemeContext.Provider>;
}

export function ThemeSwitcher({ compact = false }: { compact?: boolean }) {
  const context = useContext(ThemeContext);
  if (!context) return null;
  function choose(event: MouseEvent<HTMLButtonElement>) {
    const value = event.currentTarget.dataset.theme;
    if (isAppTheme(value)) context!.selectTheme(value);
  }
  return <div className={`${styles.switcher} ${compact ? styles.compact : styles.bar}`}>
    <span className={styles.label}>Appearance</span>
    <div role="group" aria-label="Application theme">
      <button type="button" data-theme="classic" aria-pressed={context.theme === 'classic'} onClick={choose}>Light mode</button>
      <button type="button" data-theme="terminal" aria-pressed={context.theme === 'terminal'} onClick={choose}>Dark mode</button>
    </div>
  </div>;
}

/** Segmented Light/Dark toggle for menus that provide their own label. */
export function ThemeToggle({ className }: { className?: string }) {
  const context = useContext(ThemeContext);
  if (!context) return null;
  function choose(event: MouseEvent<HTMLButtonElement>) {
    const value = event.currentTarget.dataset.theme;
    if (isAppTheme(value)) context!.selectTheme(value);
  }
  return <div role="group" aria-label="Theme" className={className}>
    <button type="button" data-theme="classic" aria-pressed={context.theme === 'classic'} onClick={choose}>Light mode</button>
    <button type="button" data-theme="terminal" aria-pressed={context.theme === 'terminal'} onClick={choose}>Dark mode</button>
  </div>;
}

// Campaign and crawler-creation pages show the theme inside their own navigation menu.
const OWN_THEME_MENU = /^\/games\/[^/]+(\/create)?\/?$/;
export function GlobalThemeBar() {
  const pathname = usePathname();
  return OWN_THEME_MENU.test(pathname ?? '') ? null : <ThemeSwitcher />;
}