import '@/app/global.css';
import '@/styles/themes.css';
import { cookies } from 'next/headers';
import { GlobalThemeBar, ThemeProvider } from '@/components/theme-provider';
import { parseTheme, THEME_COOKIE } from '@/lib/theme';

export const metadata = {
  title: 'Dungeon Crawler Carl Manager',
  description: 'Crawler and campaign management for Dungeon Crawler Carl.',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);
  return (
    <html lang="en" data-scroll-behavior="smooth" data-theme={theme}>
      <body><ThemeProvider initialTheme={theme}><GlobalThemeBar />{children}</ThemeProvider></body>
    </html>
  );
}
