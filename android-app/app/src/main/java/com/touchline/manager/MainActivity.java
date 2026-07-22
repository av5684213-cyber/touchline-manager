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
import android.util.Log;
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
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.FrameLayout;

import java.io.File;

public class MainActivity extends Activity {
    private static final String TAG = "TouchlineManager";
    private WebView webView;
    private FrameLayout rootView;
    private TextView loadingView;
    private boolean jsReady = false;

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

        // Root layout — WebView + loading overlay
        rootView = new FrameLayout(this);
        setContentView(rootView);

        // Loading/splash view — WebView JS initialize olana kadar göster
        loadingView = new TextView(this);
        loadingView.setText("Touchline Manager yükleniyor...");
        loadingView.setTextColor(Color.parseColor("#fbbf24"));
        loadingView.setTextSize(16);
        loadingView.setGravity(android.view.Gravity.CENTER);
        loadingView.setBackgroundColor(Color.parseColor("#0d0d1a"));
        FrameLayout.LayoutParams loadingParams = new FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.MATCH_PARENT
        );
        rootView.addView(loadingView, loadingParams);

        webView = new WebView(this);
        FrameLayout.LayoutParams webParams = new FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.MATCH_PARENT
        );
        rootView.addView(webView, webParams);

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
        settings.setBlockNetworkLoads(false);
        settings.setBlockNetworkImage(false);

        // Dark mode: do not force-darken web content
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            settings.setForceDark(WebSettings.FORCE_DARK_OFF);
        }

        // JS interface — geri tuşu ve hata raporlama için
        webView.addJavascriptInterface(new Object() {
            @android.webkit.JavascriptInterface
            public void onAppReady() {
                jsReady = true;
                runOnUiThread(() -> {
                    if (loadingView != null && loadingView.getVisibility() != android.view.View.GONE) {
                        loadingView.setVisibility(android.view.View.GONE);
                    }
                });
                Log.i(TAG, "JS app ready signal received");
            }

            @android.webkit.JavascriptInterface
            public void reportError(String errorMessage) {
                Log.e(TAG, "JS Error: " + errorMessage);
            }
        }, "AndroidNative");

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onProgressChanged(WebView view, int newProgress) {
                super.onProgressChanged(view, newProgress);
                if (loadingView != null && newProgress >= 100) {
                    // Sayfa yüklendi — loading view 100ms sonra gizle (JS init için bekle)
                    // Asıl gizleme onAppReady'de olur, ama fallback olarak burada da dene
                    webView.postDelayed(() -> {
                        if (loadingView != null && loadingView.getVisibility() != android.view.View.GONE) {
                            // JS ready sinyali gelmediyse 2 saniye sonra yine de gizle
                            loadingView.setVisibility(android.view.View.GONE);
                        }
                    }, 2000);
                }
            }
        });

        webView.setWebViewClient(new WebViewClient() {
            // v2.9.11 PROD 3: Dış URL'leri sistem tarayıcısında aç
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();
                // Internal file:// URLs load in WebView
                if (url.startsWith("file://") || url.startsWith("about:") || url.startsWith("data:")) {
                    return false;
                }
                // External URLs — sistem tarayıcısında aç
                try {
                    Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    startActivity(intent);
                } catch (Exception e) {
                    Log.w(TAG, "Could not open external URL: " + url, e);
                }
                return true;
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                if (url.startsWith("file://") || url.startsWith("about:") || url.startsWith("data:")) {
                    return false;
                }
                try {
                    Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    startActivity(intent);
                } catch (Exception e) {
                    Log.w(TAG, "Could not open external URL: " + url, e);
                }
                return true;
            }

            // v2.9.11 PROD 5: Hata durumunda kullanıcı dostu ekran
            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                super.onReceivedError(view, request, error);
                String url = request.getUrl().toString();
                // Sadece ana sayfa yüklenemezse hata göster (asset'ler değil)
                if (url.contains("index.html") || url.equals("file:///android_asset/web/index.html")) {
                    showErrorScreen("Uygulama yüklenemedi. Dosya erişim hatası veya bozuk kurulum.");
                }
            }

            // Eski API (Android < 23)
            @Override
            public void onReceivedError(WebView view, int errorCode, String description, String failingUrl) {
                super.onReceivedError(view, errorCode, description, failingUrl);
                if (failingUrl != null && (failingUrl.contains("index.html") || failingUrl.contains("android_asset"))) {
                    showErrorScreen("Uygulama yüklenemedi: " + description);
                }
            }

            // SSL hatalarını görmezden gel (offline mode için)
            @Override
            public void onReceivedSslError(WebView view, SslErrorHandler handler, SslError error) {
                handler.cancel();
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                // JS'e native hazır sinyali gönder — app de onAppReady'yi çağıracak
                webView.evaluateJavascript(
                    "if (window.AndroidNative && typeof window.AndroidNative.onAppReady === 'function') {" +
                    "  setTimeout(function() { window.AndroidNative.onAppReady(); }, 100);" +
                    "}",
                    null
                );
            }
        });

        // Dark background before CSS loads
        webView.setBackgroundColor(Color.parseColor("#0d0d1a"));

        // Load embedded app from assets
        webView.loadUrl("file:///android_asset/web/index.html");
    }

    // v2.9.11 PROD 5: Hata ekranı göster
    private void showErrorScreen(String message) {
        runOnUiThread(() -> {
            if (loadingView != null) {
                loadingView.setText("⚠️ Hata\n\n" + message + "\n\nUygulamayı yeniden başlatmayı deneyin.");
                loadingView.setTextColor(Color.parseColor("#ef4444"));
                loadingView.setVisibility(android.view.View.VISIBLE);
            }
            if (webView != null) {
                webView.setVisibility(android.view.View.GONE);
            }
        });
    }

    // v2.9.11 PROD 4: Geri tuşu — JS'e ilet + çıkış onayı
    @Override
    public void onBackPressed() {
        if (webView == null) {
            super.onBackPressed();
            return;
        }

        // Önce JS'e geri tuşu sinyali gönder — oyun içi navigation'ı JS yönetiyorsa
        if (jsReady) {
            webView.evaluateJavascript(
                "if (typeof window.handleNativeBack === 'function') {" +
                "  var handled = window.handleNativeBack();" +
                "  if (handled) return;" +
                "}" +
                "if (document.referrer && history.length > 1) {" +
                "  history.back();" +
                "} else {" +
                "  if (window.AndroidNative) window.AndroidNative.requestExit();" +
                "}",
                null
            );
            return;
        }

        // JS hazır değilse — WebView history kontrolü
        if (webView.canGoBack()) {
            webView.goBack();
        } else {
            showExitConfirmation();
        }
    }

    // Çıkış onay diyaloğu
    @android.webkit.JavascriptInterface
    public void requestExit() {
        runOnUiThread(this::showExitConfirmation);
    }

    private void showExitConfirmation() {
        new AlertDialog.Builder(this)
            .setTitle("Çıkış")
            .setMessage("Oyundan çıkmak istediğine emin misin?")
            .setPositiveButton("Evet", (DialogInterface dialog, int which) -> {
                finish();
            })
            .setNegativeButton("Hayır", null)
            .setCancelable(true)
            .show();
    }

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
