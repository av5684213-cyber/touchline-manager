package com.touchline.manager;

import android.content.Context;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.os.Build;
import android.util.Log;

import org.json.JSONArray;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * ════════════════════════════════════════════════════════════════════════════
 * CrashReporter — v2.9.16
 * ════════════════════════════════════════════════════════════════════════════
 * Tüm native + JS hatalarını toplar, kategorize eder ve raporlar.
 *
 * HATA KATEGORİLERİ (MADDE 6):
 *   native_crash          — Native Java exception/crash
 *   js_console_error      — JS console.error çağrısı
 *   js_console_warn       — JS console.warn çağrısı
 *   js_unhandled_rejection — JS unhandled promise rejection
 *   js_global_error       — JS window.onerror
 *   webview_load_error    — WebView sayfa yükleme hatası
 *   render_process_gone   — WebView render process çökmesi
 *   network_offline       — Ağ bağlantısı kesintisi
 *
 * RAPORLAMA:
 * Şimdilik Logcat'e yazar (production test için yeterli).
 * Sentry'ye geçiş: sendEvent() içindeki Log.e()'yi Sentry.captureEvent()'e çevir.
 *
 * PII FİLTRELEME (MADDE 2):
 * scrubPII() metodu e-posta, token, şifre desenlerini *** ile değiştirir.
 */
public class CrashReporter {
    private static final String TAG = "CrashReporter";
    private static CrashReporter instance;
    private Context context;
    private String appVersion;
    private final List<JSONObject> breadcrumbs = new ArrayList<>();
    private static final int MAX_BREADCRUMBS = 50;

    // Hata kategorileri
    public static final String CAT_NATIVE_CRASH = "native_crash";
    public static final String CAT_JS_CONSOLE_ERROR = "js_console_error";
    public static final String CAT_JS_CONSOLE_WARN = "js_console_warn";
    public static final String CAT_JS_REJECTION = "js_unhandled_rejection";
    public static final String CAT_JS_GLOBAL_ERROR = "js_global_error";
    public static final String CAT_WEBVIEW_LOAD_ERROR = "webview_load_error";
    public static final String CAT_RENDER_PROCESS_GONE = "render_process_gone";
    public static final String CAT_NETWORK_OFFLINE = "network_offline";

    private CrashReporter() {}

    public static synchronized CrashReporter getInstance() {
        if (instance == null) {
            instance = new CrashReporter();
        }
        return instance;
    }

    public void init(Context ctx) {
        this.context = ctx.getApplicationContext();
        try {
            PackageInfo pi = context.getPackageManager()
                .getPackageInfo(context.getPackageName(), 0);
            appVersion = pi.versionName + " (" + pi.versionCode + ")";
        } catch (PackageManager.NameNotFoundException e) {
            appVersion = "unknown";
        }
        Log.i(TAG, "CrashReporter initialized — version: " + appVersion);
    }

    /**
     * Breadcrumb ekle — hata öncesi olay zinciri için.
     */
    public void addBreadcrumb(String category, String message) {
        try {
            JSONObject crumb = new JSONObject();
            crumb.put("category", category);
            crumb.put("message", scrubPII(message));
            crumb.put("timestamp", System.currentTimeMillis());
            synchronized (breadcrumbs) {
                breadcrumbs.add(crumb);
                if (breadcrumbs.size() > MAX_BREADCRUMBS) {
                    breadcrumbs.remove(0);
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to add breadcrumb", e);
        }
    }

    /**
     * Hata olayı gönder.
     *
     * @param category  Hata kategorisi (CAT_* sabitleri)
     * @param level     "error", "warning", "info"
     * @param message   Hata mesajı
     * @param throwable İsteğe bağlı exception
     */
    public void sendEvent(String category, String level, String message, Throwable throwable) {
        String scrubbedMessage = scrubPII(message);

        // Logcat'e yaz
        String logTag = TAG + ":" + category;
        if ("error".equals(level)) {
            Log.e(logTag, scrubbedMessage, throwable);
        } else if ("warning".equals(level)) {
            Log.w(logTag, scrubbedMessage, throwable);
        } else {
            Log.i(logTag, scrubbedMessage, throwable);
        }

        // SENTRY: Uncomment when Sentry SDK is added
        // SentryEvent event = new SentryEvent();
        // event.setLevel("error".equals(level) ? SentryLevel.ERROR : SentryLevel.WARNING);
        // event.setTag("category", category);
        // event.setMessage(scrubbedMessage);
        // if (throwable != null) event.setThrowable(throwable);
        // for (JSONObject crumb : breadcrumbs) {
        //     event.addBreadcrumb(crumb.optString("message"), crumb.optString("category"));
        // }
        // Sentry.captureEvent(event);
    }

    /**
     * Basit event (throwable olmadan).
     */
    public void sendEvent(String category, String level, String message) {
        sendEvent(category, level, message, null);
    }

    /**
     * PII filtreleme — e-posta, token, şifre desenlerini temizle.
     */
    public static String scrubPII(String input) {
        if (input == null) return "";
        String result = input;
        // E-posta desenleri
        result = result.replaceAll("[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}", "***@***.***");
        // JWT token desenleri (eyJ ile başlayan uzun string'ler)
        result = result.replaceAll("eyJ[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+", "***JWT***");
        // Bearer token
        result = result.replaceAll("(?i)bearer\\s+[A-Za-z0-9._-]+", "Bearer ***");
        // Şifre/passwd/secret içeren key=value çiftleri
        result = result.replaceAll("(?i)(password|passwd|secret|token|api_key)\\s*[=:]\\s*\\S+", "$1=***");
        // Telefon numaraları (TR formatı)
        result = result.replaceAll("\\+90\\s?\\d{3}\\s?\\d{3}\\s?\\d{2}\\s?\\d{2}", "+90 ***");
        return result;
    }

    public String getAppVersion() {
        return appVersion;
    }

    public List<JSONObject> getBreadcrumbs() {
        synchronized (breadcrumbs) {
            return new ArrayList<>(breadcrumbs);
        }
    }
}
