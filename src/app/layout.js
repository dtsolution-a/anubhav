import './globals.css';
import PwaSetup from '@/components/PwaSetup';

export const metadata = {
  title: 'अनुभवः — Anubhavaḥ Experience Centre',
  description: 'Your exclusive gateway to curated digital experiences.',
  robots: 'noindex, nofollow',
  applicationName: 'Anubhavaḥ',
  appleWebApp: { capable: true, title: 'Anubhavaḥ', statusBarStyle: 'black-translucent' },
  formatDetection: { telephone: false },
  icons: { icon: '/pwa-icon/192', apple: '/pwa-icon/180' },
};

export const viewport = {
  themeColor: '#0a0807',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;700;800&family=Outfit:wght@300;400;500;600;700;800&family=Inter:wght@300;400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {children}
        <PwaSetup />
        <script dangerouslySetInnerHTML={{ __html: 'document.addEventListener("contextmenu", function(e) { e.preventDefault(); });' }} />
      </body>
    </html>
  );
}
