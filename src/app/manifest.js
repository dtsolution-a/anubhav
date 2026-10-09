export default function manifest() {
  return {
    name: 'अनुभवः — Anubhavaḥ Experience Centre',
    short_name: 'Anubhavaḥ',
    description: 'Your exclusive gateway to curated digital experiences.',
    id: '/',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0a0807',
    theme_color: '#0a0807',
    icons: [
      { src: '/pwa-icon/192', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/pwa-icon/512', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/pwa-icon/512?maskable=1', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
