import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { LocaleProvider } from "@/lib/i18n/locale-provider";
import { ServiceWorkerRegistrar } from "@/components/service-worker-registrar";
import { AuthProvider } from "@/lib/auth/auth-context";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Touchline Manager",
  description: "Futbol kulübü yönetim oyunu - Online multiplayer",
  applicationName: "Touchline Manager",
  authors: [{ name: "Touchline" }],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Touchline Manager",
  },
  icons: {
    icon: [
      { url: "/icons/icon-72.png", sizes: "72x72", type: "image/png" },
      { url: "/icons/icon-96.png", sizes: "96x96", type: "image/png" },
      { url: "/icons/icon-128.png", sizes: "128x128", type: "image/png" },
      { url: "/icons/icon-144.png", sizes: "144x144", type: "image/png" },
      { url: "/icons/icon-152.png", sizes: "152x152", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-384.png", sizes: "384x384", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // P0 FIX: userScalable: false KALDIRILDI — WCAG 1.4.4 ihlali, App Store reddi riski
  // Görme engelli kullanıcılar pinch-to-zoom yapabilmeli
  maximumScale: 5,
  userScalable: true,
  themeColor: "#1a3a2a",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Touchline Manager" />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <link rel="apple-touch-startup-image" href="/icons/icon-512.png" />
        {/* v2.9.11 PROD 9: Global error handler — JS hatalarını native'e ilet */}
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            // Native'e hazır sinyali gönder
            function notifyNativeReady() {
              try {
                if (window.AndroidNative && window.AndroidNative.onAppReady) {
                  window.AndroidNative.onAppReady();
                }
              } catch(e) {}
            }
            // JS app yüklendiğinde native'e haber ver
            window.addEventListener('load', function() {
              setTimeout(notifyNativeReady, 200);
            });

            // Global error handler — JS hatalarını native'e ilet
            window.addEventListener('error', function(e) {
              try {
                if (window.AndroidNative && window.AndroidNative.reportError) {
                  var msg = e.message + ' @ ' + (e.filename || '') + ':' + (e.lineno || 0);
                  window.AndroidNative.reportError(msg);
                }
              } catch(err) {}
            });

            // Unhandled promise rejection handler
            window.addEventListener('unhandledrejection', function(e) {
              try {
                if (window.AndroidNative && window.AndroidNative.reportError) {
                  var reason = e.reason ? (e.reason.message || String(e.reason)) : 'Unknown rejection';
                  window.AndroidNative.reportError('Promise rejection: ' + reason);
                }
              } catch(err) {}
            });

            // Native geri tuşu handler — JS navigation'ı yönetir
            window.handleNativeBack = function() {
              // Modal açıksa kapat
              var openModal = document.querySelector('[role="dialog"]');
              if (openModal) {
                var closeBtn = openModal.querySelector('[aria-label="Kapat"], [aria-label="close"]');
                if (closeBtn) { closeBtn.click(); return true; }
                openModal.remove();
                return true;
              }
              // Drawer açıksa kapat
              var openDrawer = document.querySelector('[data-drawer-open="true"]');
              if (openDrawer) {
                var backdrop = document.querySelector('[data-drawer-backdrop="true"]');
                if (backdrop) { backdrop.click(); return true; }
              }
              return false; // JS handled etmedi — native fallback (WebView history veya çıkış onayı)
            };
          })();
        `}} />
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        <LocaleProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
          <Toaster />
          <ServiceWorkerRegistrar />
        </LocaleProvider>
      </body>
    </html>
  );
}
