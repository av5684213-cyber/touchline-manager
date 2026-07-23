package com.touchline.manager;

import android.app.Application;
import android.util.Log;

/**
 * ════════════════════════════════════════════════════════════════════════════
 * TouchlineApplication — v2.9.16
 * ════════════════════════════════════════════════════════════════════════════
 * Application sınıfı — CrashReporter'ı initialize eder.
 *
 * SENTRY ENTEGRASYONU (hazır altyapı):
 * 1. build.gradle'a ekle:
 *    implementation 'io.sentry:sentry-android:7.6.0'
 * 2. AndroidManifest'e meta-data ekle:
 *    <meta-data android:name="io.sentry.dsn" android:value="SENTRY_DSN" />
 * 3. Aşağıdaki Sentry.init satırını uncomment et:
 *    Sentry.init(options -> { options.setDsn("SENTRY_DSN"); });
 *
 * Şimdilik CrashReporter Logcat'e yazıyor — production'da Sentry'ye geçiş
 * tek satır değişiklik ile yapılabilir.
 */
public class TouchlineApplication extends Application {
    private static final String TAG = "TouchlineApp";

    @Override
    public void onCreate() {
        super.onCreate();

        // CrashReporter'ı başlat — hata olursa uygulama çökmesin
        try {
            CrashReporter.getInstance().init(this);
            Log.i(TAG, "TouchlineApplication started — CrashReporter active");
        } catch (Exception e) {
            Log.e(TAG, "CrashReporter init failed, continuing without it", e);
        }
    }
}
