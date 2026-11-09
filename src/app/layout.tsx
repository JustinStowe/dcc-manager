import '@/app/global.css';

export const metadata = {
  title: 'Dungeon Crawler Carl Manager',
  description: 'Crawler and campaign management for Dungeon Crawler Carl.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
