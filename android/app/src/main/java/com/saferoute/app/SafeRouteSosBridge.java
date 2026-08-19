package com.saferoute.app;

import android.Manifest;
import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.telephony.SmsManager;
import android.util.Log;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import org.json.JSONObject;

import java.util.ArrayList;

/**
 * SafeRoute Native Android Emergency SOS Bridge
 * Provides zero-tap automated calling, background SMS delivery, and foreground location services
 */
public class SafeRouteSosBridge {

    private static final String TAG = "SafeRouteSosBridge";
    public static final int PERMISSION_REQUEST_CODE = 4499;

    private final Activity activity;
    private final WebView webView;

    public SafeRouteSosBridge(Activity activity, WebView webView) {
        this.activity = activity;
        this.webView = webView;
    }

    @JavascriptInterface
    public boolean isNativeAndroid() {
        return true;
    }

    @JavascriptInterface
    public String checkNativePermissions() {
        try {
            JSONObject status = new JSONObject();
            status.put("callPhone", hasPermission(Manifest.permission.CALL_PHONE));
            status.put("sendSms", hasPermission(Manifest.permission.SEND_SMS));
            status.put("fineLocation", hasPermission(Manifest.permission.ACCESS_FINE_LOCATION));
            status.put("backgroundLocation", Build.VERSION.SDK_INT < Build.VERSION_CODES.Q || hasPermission(Manifest.permission.ACCESS_BACKGROUND_LOCATION));
            status.put("notifications", Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU || hasPermission(Manifest.permission.POST_NOTIFICATIONS));
            
            boolean allReady = status.getBoolean("callPhone") && 
                              status.getBoolean("sendSms") && 
                              status.getBoolean("fineLocation");
            status.put("isReady", allReady);
            return status.toString();
        } catch (Exception e) {
            Log.e(TAG, "Error checking permissions", e);
            return "{\"isReady\":false}";
        }
    }

    @JavascriptInterface
    public void requestNativePermissions() {
        activity.runOnUiThread(() -> {
            ArrayList<String> permissionsNeeded = new ArrayList<>();

            if (!hasPermission(Manifest.permission.CALL_PHONE)) {
                permissionsNeeded.add(Manifest.permission.CALL_PHONE);
            }
            if (!hasPermission(Manifest.permission.SEND_SMS)) {
                permissionsNeeded.add(Manifest.permission.SEND_SMS);
            }
            if (!hasPermission(Manifest.permission.ACCESS_FINE_LOCATION)) {
                permissionsNeeded.add(Manifest.permission.ACCESS_FINE_LOCATION);
                permissionsNeeded.add(Manifest.permission.ACCESS_COARSE_LOCATION);
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU && !hasPermission(Manifest.permission.POST_NOTIFICATIONS)) {
                permissionsNeeded.add(Manifest.permission.POST_NOTIFICATIONS);
            }

            if (!permissionsNeeded.isEmpty()) {
                ActivityCompat.requestPermissions(
                    activity,
                    permissionsNeeded.toArray(new String[0]),
                    PERMISSION_REQUEST_CODE
                );
            }
        });
    }

    /**
     * Zero-Tap Direct Call Execution via Android ACTION_CALL
     */
    @JavascriptInterface
    public boolean callEmergency(String phoneNumber) {
        if (!hasPermission(Manifest.permission.CALL_PHONE)) {
            Log.w(TAG, "CALL_PHONE permission not granted");
            return false;
        }

        try {
            String cleanPhone = phoneNumber.replaceAll("[^0-9+]", "");
            Intent callIntent = new Intent(Intent.ACTION_CALL);
            callIntent.setData(Uri.parse("tel:" + cleanPhone));
            callIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            activity.startActivity(callIntent);
            Log.i(TAG, "Emergency call initiated to: " + cleanPhone);
            return true;
        } catch (SecurityException se) {
            Log.e(TAG, "SecurityException initiating call", se);
            return false;
        } catch (Exception e) {
            Log.e(TAG, "Exception initiating call", e);
            return false;
        }
    }

    /**
     * Zero-Tap Direct SMS Execution via Android SmsManager
     */
    @JavascriptInterface
    public boolean sendEmergencySMS(String phoneNumber, String messageText) {
        if (!hasPermission(Manifest.permission.SEND_SMS)) {
            Log.w(TAG, "SEND_SMS permission not granted");
            return false;
        }

        try {
            String cleanPhone = phoneNumber.replaceAll("[^0-9+]", "");
            SmsManager smsManager;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                smsManager = activity.getSystemService(SmsManager.class);
            } else {
                smsManager = SmsManager.getDefault();
            }

            ArrayList<String> parts = smsManager.divideMessage(messageText);
            smsManager.sendMultipartTextMessage(cleanPhone, null, parts, null, null);
            Log.i(TAG, "Emergency SMS dispatched to: " + cleanPhone);
            return true;
        } catch (Exception e) {
            Log.e(TAG, "Failed to send emergency SMS", e);
            return false;
        }
    }

    /**
     * Starts Foreground Service for Screen-Lock and Background GPS Tracking
     */
    @JavascriptInterface
    public void startForegroundTracking(String sessionId) {
        try {
            Intent serviceIntent = new Intent(activity, SafeRouteForegroundService.class);
            serviceIntent.setAction(SafeRouteForegroundService.ACTION_START_SOS);
            serviceIntent.putExtra("SESSION_ID", sessionId);

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                activity.startForegroundService(serviceIntent);
            } else {
                activity.startService(serviceIntent);
            }
            Log.i(TAG, "Foreground SOS tracking service started for session: " + sessionId);
        } catch (Exception e) {
            Log.e(TAG, "Failed to start foreground tracking service", e);
        }
    }

    /**
     * Stops Foreground Service when SOS is completed
     */
    @JavascriptInterface
    public void stopForegroundTracking() {
        try {
            Intent serviceIntent = new Intent(activity, SafeRouteForegroundService.class);
            serviceIntent.setAction(SafeRouteForegroundService.ACTION_STOP_SOS);
            activity.startService(serviceIntent);
            Log.i(TAG, "Foreground SOS tracking service stopped.");
        } catch (Exception e) {
            Log.e(TAG, "Failed to stop foreground tracking service", e);
        }
    }

    private boolean hasPermission(String permission) {
        return ContextCompat.checkSelfPermission(activity, permission) == PackageManager.PERMISSION_GRANTED;
    }
}
