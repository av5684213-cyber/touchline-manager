package com.touchline.manager;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.DialogInterface;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.net.http.SslError;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.view.Gravity;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.SslErrorHandler;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import java.io.File;

/**
 * ════════════════════════════════════════════════════════════════════════════
 * MainActivity — Touchline Manager Android WebView kabuğu
 * v2.9.14: Kullanılabilirlik denetimi düzeltmeleri
 * ════════════════════════════════════════════════════════════════════════════
 *
 * MADDE 1: Geri tuşu — JS köprüsü + çift basma çıkış pattern'i
 * MADDE 2: Harici linkler — Intent + mailto/tel + Toast fallback
 * MADDE 3: Ekran yönü — portrait kilit (AndroidManifest'te)
 * MADDE 4: İlk açılış — native loading splash
 * MADDE 5: Hata durumu — Yeniden Dene butonlu ekran
 * MADDE 6: Test senaryoları (yorum olarak)
 */
public class MainActivity extends Activity {
    private static final String TAG = "TouchlineManager";

    private WebView webView;
    private FrameLayout rootView;
    private View loadingView;      // Splash/loading overlay
    private View errorView;        // Hata ekranı (Yeniden Dene butonlu)
    private boolean jsReady = false;

    // MADDE 1: Geri tuşu — çift basma çıkış pattern'i
    private boolean backPressedOnce = false;
    private static final int BACK_PRESS_TIMEOUT_MS = 2000;

    // JS köprüsü: geri tuşu cevabı için
    private volatile boolean jsBackHandled = false;
    private final Object jsBackLock = new Object();

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Dark status bar and navigation bar
        Window window = getWindow();
        window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
        window.setStatusBarColor(Color.parseColor("#0d0d1a"));
        window.setNavigationBarColor(Color.parseColor("#0d0d1a"));
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            window.setDecorFitsSystemWindows(true);
        }

        // Root layout — WebView + loading + error overlays
        rootView = new FrameLayout(this);
        setContentView(rootView);

        // ═══ MADDE 4: Loading/splash view ═══
        loadingView = createLoadingView();
        rootView.addView(loadingView, new FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.MATCH_PARENT
        ));

        // ═══ MADDE 5: Error view (Yeniden Dene butonlu) ═══
        errorView = createErrorView();
        errorView.setVisibility(View.GONE);
        rootView.addView(errorView, new FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.MATCH_PARENT
        ));

        // WebView
        webView = new WebView(this);
        rootView.addView(webView, new FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.MATCH_PARENT
        ));

        configureWebView();

        // Dark background before CSS loads
        webView.setBackgroundColor(Color.parseColor("#0d0d1a"));

        // v2.9.13 MADDE 5: loadUrl SABİT — Intent extra ile override edilemez
        webView.loadUrl("file:///android_asset/web/index.html");
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // MADDE 4: Loading splash view oluştur
    // ═══════════════════════════════════════════════════════════════════════════
    private View createLoadingView() {
        LinearLayout layout = new LinearLayout(this);
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setGravity(Gravity.CENTER);
        layout.setBackgroundColor(Color.parseColor("#0d0d1a"));

        // Trophy emoji + başlık
        TextView title = new TextView(this);
        title.setText("🏆 Touchline Manager");
        title.setTextColor(Color.parseColor("#fbbf24"));
        title.setTextSize(20);
        title.setGravity(Gravity.CENTER);
        title.setPadding(0, 0, 0, 32);

        // Yükleniyor mesajı
        TextView loading = new TextView(this);
        loading.setText("Yükleniyor...");
        loading.setTextColor(Color.parseColor("#6b7280"));
        loading.setTextSize(14);
        loading.setGravity(Gravity.CENTER);

        layout.addView(title);
        layout.addView(loading);
        return layout;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // MADDE 5: Hata ekranı — Yeniden Dene butonlu
    // ═══════════════════════════════════════════════════════════════════════════
    private View createErrorView() {
        LinearLayout layout = new LinearLayout(this);
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setGravity(Gravity.CENTER);
        layout.setBackgroundColor(Color.parseColor("#0d0d1a"));
        layout.setPadding(48, 48, 48, 48);

        // Hata ikonu
        TextView icon = new TextView(this);
        icon.setText("⚠️");
        icon.setTextSize(48);
        icon.setGravity(Gravity.CENTER);
        icon.setPadding(0, 0, 0, 16);

        // Hata başlığı
        TextView title = new TextView(this);
        title.setText("Bir şeyler ters gitti");
        title.setTextColor(Color.parseColor("#ef4444"));
        title.setTextSize(18);
        title.setGravity(Gravity.CENTER);
        title.setPadding(0, 0, 0, 8);

        // Hata açıklaması
        TextView desc = new TextView(this);
        desc.setText("Uygulama yüklenirken bir sorun oluştu.\nİnternet bağlantınızı kontrol edin veya tekrar deneyin.");
        desc.setTextColor(Color.parseColor("#9ca3af"));
        desc.setTextSize(13);
        desc.setGravity(Gravity.CENTER);
        desc.setPadding(0, 0, 0, 32);

        // Yeniden Dene butonu
        Button retryBtn = new Button(this);
        retryBtn.setText("Yeniden Dene");
        retryBtn.setTextColor(Color.WHITE);
        retryBtn.setBackgroundColor(Color.parseColor("#f59e0b"));
        retryBtn.setOnClickListener(v -> {
            // Hata ekranını gizle, loading'i göster, WebView'i yeniden yükle
            errorView.setVisibility(View.GONE);
            loadingView.setVisibility(View.VISIBLE);
            if (webView != null) {
                webView.setVisibility(View.VISIBLE);
                webView.loadUrl("file:///android_asset/web/index.html");
            }
        });

        layout.addView(icon);
        layout.addView(title);
        layout.addView(desc);
        layout.addView(retryBtn);
        return layout;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // WebView yapılandırması
    // ═══════════════════════════════════════════════════════════════════════════
    private void configureWebView() {
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setDatabaseEnabled(true);
        settings.setCacheMode(WebSettings.LOAD_CACHE_ELSE_NETWORK);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setSupportMultipleWindows(false);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        // v2.9.13: Mixed content tamamen yasak
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setBlockNetworkLoads(false);
        settings.setBlockNetworkImage(false);

        // Dark mode
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            settings.setForceDark(WebSettings.FORCE_DARK_OFF);
        }

        // ═══ JS köprüsü ═══
        // Mesaj formatı: AndroidNative.methodName(params)
        // JS → Native: postMessage ile (onAppReady, reportError, onBackResult)
        // Native → JS: evaluateJavascript ile (handleNativeBack)
        webView.addJavascriptInterface(new Object() {
            @android.webkit.JavascriptInterface
            public void onAppReady() {
                jsReady = true;
                runOnUiThread(() -> {
                    if (loadingView != null) {
                        loadingView.setVisibility(View.GONE);
                    }
                    Log.i(TAG, "JS app ready — splash gizlendi");
                });
            }

            @android.webkit.JavascriptInterface
            public void reportError(String errorMessage) {
                Log.e(TAG, "JS Error: " + errorMessage);
            }

            // MADDE 1: JS'den geri tuşu cevabı
            // JS handleNativeBack() çağrılır, cevap olarak handled=true/false döner
            @android.webkit.JavascriptInterface
            public void onBackResult(boolean handled) {
                synchronized (jsBackLock) {
                    jsBackHandled = handled;
                    jsBackLock.notifyAll();
                }
            }
        }, "AndroidNative");

        // WebChromeClient — progress tracking
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onProgressChanged(WebView view, int newProgress) {
                super.onProgressChanged(view, newProgress);
                if (loadingView != null && newProgress >= 100) {
                    // Fallback: 2 saniye sonra loading'i gizle (onAppReady gelmezse)
                    webView.postDelayed(() -> {
                        if (loadingView != null && loadingView.getVisibility() != View.GONE) {
                            loadingView.setVisibility(View.GONE);
                        }
                    }, 2000);
                }
            }
        });

        // WebViewClient
        webView.setWebViewClient(new WebViewClient() {
            // ═══ MADDE 2: Harici linkler — tarayıcı/mailto/tel yönlendirme ═══
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return handleUrl(request.getUrl());
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                return handleUrl(Uri.parse(url));
            }

            // Tüm URL yönlendirme mantığı tek yerde
            private boolean handleUrl(Uri uri) {
                String scheme = uri.getScheme();
                if (scheme == null) return false;

                // Internal URLs — WebView'de yükle
                if (scheme.equals("file") || scheme.equals("about") || scheme.equals("data")) {
                    return false;
                }

                // MADDE 2: mailto: → email uygulaması
                if (scheme.equals("mailto")) {
                    try {
                        Intent intent = new Intent(Intent.ACTION_SENDTO, uri);
                        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        startActivity(intent);
                    } catch (Exception e) {
                        showToast("E-posta uygulaması bulunamadı");
                    }
                    return true;
                }

                // MADDE 2: tel: → telefon uygulaması
                if (scheme.equals("tel")) {
                    try {
                        Intent intent = new Intent(Intent.ACTION_DIAL, uri);
                        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        startActivity(intent);
                    } catch (Exception e) {
                        showToast("Telefon uygulaması bulunamadı");
                    }
                    return true;
                }

                // MADDE 2: sms: → mesaj uygulaması
                if (scheme.equals("sms")) {
                    try {
                        Intent intent = new Intent(Intent.ACTION_SENDTO, uri);
                        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        startActivity(intent);
                    } catch (Exception e) {
                        showToast("Mesaj uygulaması bulunamadı");
                    }
                    return true;
                }

                // MADDE 2: Diğer URL'ler (https, http) → sistem tarayıcısı
                try {
                    Intent intent = new Intent(Intent.ACTION_VIEW, uri);
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    startActivity(intent);
                } catch (Exception e) {
                    Log.w(TAG, "Could not open URL: " + uri, e);
                    showToast("Bu bağlantı açılamadı");
                }
                return true;
            }

            // ═══ MADDE 5: Hata durumunda Yeniden Dene ekranı ═══
            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                super.onReceivedError(view, request, error);
                String url = request.getUrl().toString();
                if (url.contains("index.html") || url.equals("file:///android_asset/web/index.html")) {
                    showErrorScreen();
                }
            }

            @Override
            public void onReceivedError(WebView view, int errorCode, String description, String failingUrl) {
                super.onReceivedError(view, errorCode, description, failingUrl);
                if (failingUrl != null && (failingUrl.contains("index.html") || failingUrl.contains("android_asset"))) {
                    showErrorScreen();
                }
            }

            // v2.9.14: HTTP hataları da yakala
            @Override
            public void onReceivedHttpError(WebView view, WebResourceRequest request, WebResourceResponse errorResponse) {
                super.onReceivedHttpError(view, request, errorResponse);
                String url = request.getUrl().toString();
                if (url.contains("index.html") && errorResponse.getStatusCode() >= 400) {
                    showErrorScreen();
                }
            }

            @Override
            public void onReceivedSslError(WebView view, SslErrorHandler handler, SslError error) {
                handler.cancel();
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                // JS'e native hazır sinyali gönder
                webView.evaluateJavascript(
                    "if (window.AndroidNative && typeof window.AndroidNative.onAppReady === 'function') {" +
                    "  setTimeout(function() { window.AndroidNative.onAppReady(); }, 100);" +
                    "}",
                    null
                );
            }
        });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // MADDE 5: Hata ekranını göster
    // ═══════════════════════════════════════════════════════════════════════════
    private void showErrorScreen() {
        runOnUiThread(() -> {
            if (loadingView != null) loadingView.setVisibility(View.GONE);
            if (webView != null) webView.setVisibility(View.GONE);
            if (errorView != null) errorView.setVisibility(View.VISIBLE);
        });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // MADDE 1: Geri tuşu — JS köprüsü + çift basma çıkış
    // ═══════════════════════════════════════════════════════════════════════════
    //
    // Pattern: Çift basma ("bir daha basarsan çıkılır")
    // Neden: AlertDialog her geri tuşunda çıkması kullanıcıyı rahatsız eder.
    // Çift basma pattern'i daha akıcı: ilk basışta Toast gösterilir, 2 saniye
    // içinde tekrar basılırsa uygulama kapanır. Modal/ekran varsa JS kapatır.
    //
    // JS köprüsü:
    // 1. Native → JS: evaluateJavascript("window.handleNativeBack()")
    // 2. JS → Native: AndroidNative.onBackResult(true/false)
    //    true = JS handled etti (modal kapandı, sekme değişti)
    //    false = JS ana ekranda, çıkış gerekli
    // 3. Native: handled=true ise hiçbir şey yapma
    //    handled=false ise çift basma çıkış pattern'ini uygula
    //
    @Override
    public void onBackPressed() {
        if (webView == null) {
            super.onBackPressed();
            return;
        }

        // JS hazır değilse — WebView history kontrolü
        if (!jsReady) {
            if (webView.canGoBack()) {
                webView.goBack();
            } else {
                showExitToast();
            }
            return;
        }

        // JS'e geri tuşu sinyali gönder — cevabı bekle (max 300ms)
        jsBackHandled = false;
        webView.evaluateJavascript(
            "(function() {" +
            "  if (typeof window.handleNativeBack === 'function') {" +
            "    var result = window.handleNativeBack();" +
            "    if (window.AndroidNative) window.AndroidNative.onBackResult(!!result);" +
            "  } else {" +
            "    if (window.AndroidNative) window.AndroidNative.onBackResult(false);" +
            "  }" +
            "})();",
            null
        );

        // JS cevabını bekle (300ms timeout — UI donmasın)
        synchronized (jsBackLock) {
            try {
                jsBackLock.wait(300);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        }

        if (jsBackHandled) {
            // JS handled etti — hiçbir şey yapma
            backPressedOnce = false;
            return;
        }

        // JS handled etmedi — çift basma çıkış pattern'i
        showExitToast();
    }

    // Çift basma çıkış pattern'i
    private void showExitToast() {
        if (backPressedOnce) {
            // İkinci basış — çık
            finish();
            return;
        }

        // İlk basış — Toast göster
        backPressedOnce = true;
        Toast.makeText(this, "Çıkmak için bir daha basın", Toast.LENGTH_SHORT).show();

        // 2 saniye sonra sıfırla
        new Handler(Looper.getMainLooper()).postDelayed(() -> {
            backPressedOnce = false;
        }, BACK_PRESS_TIMEOUT_MS);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // MADDE 2: Toast göster
    // ═══════════════════════════════════════════════════════════════════════════
    private void showToast(String message) {
        runOnUiThread(() -> Toast.makeText(this, message, Toast.LENGTH_SHORT).show());
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Yaşam döngüsü
    // ═══════════════════════════════════════════════════════════════════════════
    @Override
    protected void onPause() {
        super.onPause();
        if (webView != null) webView.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (webView != null) webView.onResume();
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }
}
