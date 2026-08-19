// SafeRoute: Platform Emergency Communication Bridge
// Distinguishes between Android Native Zero-Tap execution and Web Browser capabilities

import { androidNativeSosService } from './androidNativeSosService.js';
import { cloudAlertDispatcher } from './cloudAlertDispatcher.js';

export const COMM_STATUS = {
  PREPARING: 'Preparing',
  CALLING: 'Calling',
  CONNECTED: 'Connected',
  IN_PROGRESS: 'In Progress',
  STARTED: 'Started',
  SENDING: 'Sending',
  SENT: 'Sent',
  FAILED: 'Failed',
  UNAVAILABLE: 'Unavailable',
  WEB_STANDBY: 'Web Standby'
};

export class PlatformEmergencyBridge {
  constructor() {
    this.platform = this.detectPlatform();
  }

  detectPlatform() {
    if (androidNativeSosService.detectNativeAndroid()) {
      return 'NATIVE_ANDROID';
    }

    if (typeof window !== 'undefined' && window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()) {
      const p = window.Capacitor.getPlatform();
      return p === 'android' ? 'NATIVE_ANDROID' : (p === 'ios' ? 'NATIVE_IOS' : 'NATIVE_APP');
    }

    if (typeof window !== 'undefined' && window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.emergencyHandler) {
      return 'NATIVE_IOS';
    }

    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    if (isIOS) return 'IOS_SAFARI';
    if (/Android/.test(ua)) return 'ANDROID_WEB';

    return 'STANDARD_WEB';
  }

  isNativeAndroid() {
    return this.platform === 'NATIVE_ANDROID';
  }

  /**
   * Automated Emergency Call Initiation
   * - On Android Native: Direct ACTION_CALL with zero taps
   * - On Web/Safari: Transparently identifies web restriction without fake redirects
   */
  async autoInitiateCall(phone) {
    const cleanNumber = (phone || '').replace(/[^0-9+]/g, '');
    if (!cleanNumber) {
      return { success: false, status: COMM_STATUS.FAILED, error: 'Invalid phone number format.' };
    }

    // 1. Android Native Direct Call via ACTION_CALL (Zero-Tap)
    if (this.isNativeAndroid()) {
      const called = androidNativeSosService.callEmergency(cleanNumber);
      if (called) {
        return { success: true, status: COMM_STATUS.CALLING, label: 'Calling' };
      } else {
        return { success: false, status: COMM_STATUS.FAILED, error: 'Android CALL_PHONE permission not granted or call rejected.' };
      }
    }

    // 2. iOS Native Handler (if packaged with native iOS wrapper)
    if (this.platform === 'NATIVE_IOS' && window.webkit?.messageHandlers?.emergencyHandler?.postMessage) {
      try {
        window.webkit.messageHandlers.emergencyHandler.postMessage({ action: 'CALL', phone: cleanNumber });
        return { success: true, status: COMM_STATUS.CALLING, label: 'Calling' };
      } catch (e) {
        console.warn('iOS Native call error:', e);
      }
    }

    // 3. Web / Safari Browser Environment
    // Do NOT trigger silent automatic tel: redirects that cause browser confirmation popups
    return {
      success: true,
      status: COMM_STATUS.WEB_STANDBY,
      label: 'Web Standby (Manual Call Available)',
      isWebLimitation: true,
      message: 'Automatic silent calling is restricted by your browser/iOS security. Use the SafeRoute Android app for zero-tap direct dialing.'
    };
  }

  /**
   * Manual call execution for Web fallback
   */
  manualWebCall(phone) {
    const cleanNumber = (phone || '').replace(/[^0-9+]/g, '');
    if (!cleanNumber) return { success: false, error: 'Invalid phone number.' };
    try {
      window.location.href = `tel:${cleanNumber}`;
      return { success: true };
    } catch (e) {
      return { success: false, error: 'Unable to open phone dialer.' };
    }
  }

  /**
   * Automated Emergency Alert Dispatch
   * - On Android Native: Dispatches multipart SMS via SmsManager
   * - On Web / Cloud: Dispatches via SafeRoute Cloud Notification Dispatcher
   */
  async autoDispatchAlert({ sessionId, location, contacts, timestamp, liveTrackingUrl }) {
    // 1. Android Native Direct SMS via SmsManager
    if (this.isNativeAndroid()) {
      let anySent = false;
      const messageText = `SAFEROUTE EMERGENCY ALERT\n\nI may be in an emergency situation.\n\nMy current live location:\n${liveTrackingUrl}\n\nTime:\n${timestamp}\n\nPlease contact me immediately.`;

      for (const contact of contacts) {
        if (contact.phone) {
          const sent = androidNativeSosService.sendEmergencySMS(contact.phone, messageText);
          if (sent) anySent = true;
        }
      }

      if (anySent) {
        return { success: true, status: COMM_STATUS.SENT, label: 'Sent (Native SMS)', deliveredCount: contacts.length };
      }
    }

    // 2. SafeRoute Cloud Notification Backend Dispatcher
    try {
      const res = await cloudAlertDispatcher.dispatchEmergencyAlert({
        sessionId,
        location,
        contacts,
        timestamp,
        liveTrackingUrl
      });

      if (res && res.success) {
        return { success: true, status: COMM_STATUS.SENT, label: 'Sent (Cloud Alert)', deliveredCount: res.deliveredCount };
      } else {
        return { success: false, status: COMM_STATUS.FAILED, error: 'Alert delivery failed.' };
      }
    } catch (err) {
      console.warn('Auto alert dispatch error:', err);
      return { success: false, status: COMM_STATUS.FAILED, error: err.message };
    }
  }

  /**
   * Starts Native Foreground Service for screen-lock & background live GPS persistence
   */
  startForegroundService(sessionId) {
    if (this.isNativeAndroid()) {
      androidNativeSosService.startForegroundTracking(sessionId);
    }
  }

  /**
   * Stops Native Foreground Service
   */
  stopForegroundService() {
    if (this.isNativeAndroid()) {
      androidNativeSosService.stopForegroundTracking();
    }
  }
}

export const platformEmergencyBridge = new PlatformEmergencyBridge();
