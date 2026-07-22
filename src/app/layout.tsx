import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { LocaleProvider } from "@/lib/i18n/locale-provider";
// v2.9.15: ServiceWorkerRegistrar kaldırıldı — file:// origin'inde SW çalışmaz
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
  // v2.9.15: PWA manifest ve icons kaldırıldı — native APK'da gereksiz
  // Native launcher ikonları AndroidManifest'ten gelir (mipmap-*)
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
        {/* v2.9.15: PWA/apple meta tag'leri kaldırıldı — native APK'da gereksiz */}
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

            // v2.9.16 MADDE 2: Global error handler — JS hatalarını native'e ilet
            // JS → Native köprüsü: AndroidNative.reportJSError(message, source, line)
            window.addEventListener('error', function(e) {
              try {
                if (window.AndroidNative && window.AndroidNative.reportJSError) {
                  window.AndroidNative.reportJSError(
                    e.message || 'Unknown error',
                    e.filename || '',
                    e.lineno || 0
                  );
                } else if (window.AndroidNative && window.AndroidNative.reportError) {
                  // Geri uyumluluk
                  var msg = e.message + ' @ ' + (e.filename || '') + ':' + (e.lineno || 0);
                  window.AndroidNative.reportError(msg);
                }
              } catch(err) {}
            });

            // v2.9.16 MADDE 2: Unhandled promise rejection — native'e ilet
            // JS → Native köprüsü: AndroidNative.reportJSRejection(reason)
            window.addEventListener('unhandledrejection', function(e) {
              try {
                var reason = e.reason ? (e.reason.message || String(e.reason)) : 'Unknown rejection';
                if (window.AndroidNative && window.AndroidNative.reportJSRejection) {
                  window.AndroidNative.reportJSRejection(reason);
                } else if (window.AndroidNative && window.AndroidNative.reportError) {
                  window.AndroidNative.reportError('Promise rejection: ' + reason);
                }
              } catch(err) {}
            });

            // v2.9.14 MADDE 1: Native geri tuşu handler — JS navigation'ı yönetir
            // Native → JS: evaluateJavascript("window.handleNativeBack()")
            // JS → Native: AndroidNative.onBackResult(true/false)
            //   true = JS handled etti (modal kapandı, sekme değişti)
            //   false = JS ana ekranda, çıkış gerekli
            window.handleNativeBack = function() {
              // 1. Modal açıksa kapat (oyuncu profili, takım detayı, vb.)
              var openModal = document.querySelector('[role="dialog"], [data-modal="true"]');
              if (openModal) {
                var closeBtn = openModal.querySelector('[aria-label="Kapat"], [aria-label="close"], button[aria-label]');
                if (closeBtn) { closeBtn.click(); return true; }
                // Kapat butonu yoksa Escape simüle et
                var escEvent = new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27 });
                document.dispatchEvent(escEvent);
                return true;
              }
              // 2. Drawer açıksa kapat (Diğer sekmesi drawer'ı)
              var openDrawer = document.querySelector('[data-drawer-open="true"], [data-state="open"]');
              if (openDrawer) {
                var backdrop = document.querySelector('[data-drawer-backdrop="true"]');
                if (backdrop) { backdrop.click(); return true; }
                // Backdrop yoksa state'i kapat
                openDrawer.click();
                return true;
              }
              // 3. Alt menü sekmesi — ana ekranda değilse ana ekrana dön
              // Ana ekran = Dashboard sekmesi
              var activeTab = document.querySelector('[data-active-tab="true"]');
              if (activeTab && activeTab.getAttribute('data-tab') !== 'dashboard') {
                // Dashboard sekmesine geç
                var dashboardBtn = document.querySelector('[data-tab="dashboard"]');
                if (dashboardBtn) { dashboardBtn.click(); return true; }
              }
              // 4. Maç ekranındaysa — çıkış engellenmeli (ilerleme kaybı)
              var matchScreen = document.querySelector('[data-screen="match"]');
              if (matchScreen) {
                return true; // Maç sırasında geri tuşu ile çıkış yasak
              }
              // 5. Ana ekrandayız — native'e "handled=false" gönder
              return false;
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
        </LocaleProvider>
      </body>
    </html>
  );
}
