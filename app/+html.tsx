import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

/**
 * Custom HTML shell for the web build.
 * Adds PWA manifest, iOS meta tags, and service worker registration.
 * Only used during static/web export — not included in native builds.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="es">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />

        {/* PWA manifest + theme */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#6366F1" />
        <meta name="application-name" content="ProAgenda" />

        {/* iOS: enables full-screen standalone mode + home-screen icon */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="ProAgenda" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />

        <link rel="icon" href="/favicon.ico" />

        {/* Expo resets ScrollView default styles for web */}
        <ScrollViewStyleReset />

        {/* Register service worker for offline support and installability */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function () {
                  navigator.serviceWorker.register('/sw.js').catch(function () {});
                });
              }
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
