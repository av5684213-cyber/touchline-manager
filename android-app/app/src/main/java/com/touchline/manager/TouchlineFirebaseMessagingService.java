package com.touchline.manager;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.util.Log;

import androidx.core.app.NotificationCompat;

import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

/**
 * v2.9.156: Firebase Cloud Messaging Service
 *
 * Push bildirimleri cihaza geldiğinde bu servis çağrılır.
 * Uygulama kapalıyken bile bildirim gösterir.
 *
 * Bildirim tıklanınca MainActivity açılır, deep link URL intent'e eklenir.
 */
public class TouchlineFirebaseMessagingService extends FirebaseMessagingService {

    private static final String TAG = "TouchlineFCM";
    private static final String CHANNEL_ID = "touchline_notifications";
    private static final int NOTIFICATION_ID = 1;

    @Override
    public void onMessageReceived(RemoteMessage remoteMessage) {
        Log.d(TAG, "Push received from: " + remoteMessage.getFrom());

        // Bildirim içeriği
        String title = "Touchline Manager";
        String body = "Yeni bildirim";
        String deepLink = null;

        if (remoteMessage.getNotification() != null) {
            title = remoteMessage.getNotification().getTitle() != null
                    ? remoteMessage.getNotification().getTitle() : title;
            body = remoteMessage.getNotification().getBody() != null
                    ? remoteMessage.getNotification().getBody() : body;
        }

        // Data payload (deep link için)
        if (remoteMessage.getData().size() > 0) {
            deepLink = remoteMessage.getData().get("deep_link");
            Log.d(TAG, "Data payload: " + remoteMessage.getData());
        }

        showNotification(title, body, deepLink);
    }

    @Override
    public void onNewToken(String token) {
        Log.d(TAG, "New FCM token: " + token.substring(0, 20) + "...");
        // Token'ı SharedPreferences'a kaydet — JS bridge buradan okur
        getSharedPreferences("touchline_prefs", MODE_PRIVATE)
                .edit()
                .putString("fcm_token", token)
                .apply();
    }

    private void showNotification(String title, String body, String deepLink) {
        NotificationManager notificationManager =
                (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);

        // Android O+ için notification channel
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "Touchline Manager Bildirimleri",
                    NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("Maç sonuçları, transfer teklifleri ve daha fazlası");
            channel.enableVibration(true);
            channel.enableLights(true);
            notificationManager.createNotificationChannel(channel);
        }

        // Tıklanınca MainActivity aç
        Intent intent = new Intent(this, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        if (deepLink != null) {
            intent.setData(Uri.parse(deepLink));
            intent.setAction(Intent.ACTION_VIEW);
        }

        PendingIntent pendingIntent = PendingIntent.getActivity(
                this, 0, intent,
                PendingIntent.FLAG_ONE_SHOT | PendingIntent.FLAG_IMMUTABLE
        );

        Uri defaultSoundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
        NotificationCompat.Builder notificationBuilder = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle(title)
                .setContentText(body)
                .setAutoCancel(true)
                .setSound(defaultSoundUri)
                .setVibrate(new long[]{0, 250, 250, 250})
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setContentIntent(pendingIntent);

        notificationManager.notify(NOTIFICATION_ID, notificationBuilder.build());
        Log.d(TAG, "Notification shown: " + title + " — " + body);
    }
}
