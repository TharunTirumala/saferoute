package com.saferoute.app;

import android.annotation.SuppressLint;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.os.Build;
import android.os.Bundle;
import android.os.IBinder;
import android.os.PowerManager;
import android.util.Log;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

/**
 * SafeRoute Persistent Foreground Service
 * Keeps GPS tracking, WakeLock, and live location updates active when phone is locked or in background
 */
public class SafeRouteForegroundService extends Service implements LocationListener {

    public static final String ACTION_START_SOS = "com.saferoute.app.ACTION_START_SOS";
    public static final String ACTION_STOP_SOS = "com.saferoute.app.ACTION_STOP_SOS";
    public static final String CHANNEL_ID = "saferoute_emergency_channel";
    public static final int NOTIFICATION_ID = 9911;
    private static final String TAG = "SafeRouteService";

    private LocationManager locationManager;
    private PowerManager.WakeLock wakeLock;
    private String activeSessionId = "";

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
        locationManager = (LocationManager) getSystemService(Context.LOCATION_SERVICE);

        PowerManager powerManager = (PowerManager) getSystemService(Context.POWER_SERVICE);
        if (powerManager != null) {
            wakeLock = powerManager.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "SafeRoute::EmergencyLock");
        }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null) {
            String action = intent.getAction();
            if (ACTION_START_SOS.equals(action)) {
                activeSessionId = intent.getStringExtra("SESSION_ID");
                startSosTracking();
            } else if (ACTION_STOP_SOS.equals(action)) {
                stopSosTracking();
                stopSelf();
            }
        }
        return START_STICKY;
    }

    private void startSosTracking() {
        Notification notification = buildEmergencyNotification("SafeRoute SOS ACTIVE — Transmitting Live GPS");
        startForeground(NOTIFICATION_ID, notification);

        if (wakeLock != null && !wakeLock.isHeld()) {
            wakeLock.acquire(60 * 60 * 1000L); // 1 hour max
        }

        try {
            if (locationManager != null) {
                locationManager.requestLocationUpdates(LocationManager.GPS_PROVIDER, 3000, 2.0f, this);
                locationManager.requestLocationUpdates(LocationManager.NETWORK_PROVIDER, 4000, 5.0f, this);
            }
        } catch (SecurityException se) {
            Log.e(TAG, "Location permission missing for foreground service", se);
        }
    }

    private void stopSosTracking() {
        if (wakeLock != null && wakeLock.isHeld()) {
            wakeLock.release();
        }
        if (locationManager != null) {
            locationManager.removeUpdates(this);
        }
        stopForeground(true);
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "SafeRoute Emergency SOS Channel",
                NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("Maintains continuous live GPS and emergency status during active SOS");
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }

    private Notification buildEmergencyNotification(String contentText) {
        Intent notificationIntent = new Intent(this, MainActivity.class);
        PendingIntent pendingIntent = PendingIntent.getActivity(
            this,
            0,
            notificationIntent,
            Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0
        );

        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("🚨 SafeRoute Emergency Response")
            .setContentText(contentText)
            .setSmallIcon(android.R.drawable.ic_dialog_alert)
            .setContentIntent(pendingIntent)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setOngoing(true)
            .build();
    }

    @Override
    public void onLocationChanged(Location location) {
        if (location != null) {
            Log.d(TAG, "Background GPS update: " + location.getLatitude() + ", " + location.getLongitude());
        }
    }

    @Override
    public void onStatusChanged(String provider, int status, Bundle extras) {}
    @Override
    public void onProviderEnabled(String provider) {}
    @Override
    public void onProviderDisabled(String provider) {}

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onDestroy() {
        stopSosTracking();
        super.onDestroy();
    }
}
