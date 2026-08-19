// SafeRoute: Platform Emergency Communication Bridge
// Handles Zero-Tap automated calling, native Android SMS/telephony, and backend cloud alert dispatch

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
  UNAVAILABLE: 'Unavailable'
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

  /**
   * Zero-Tap Automated Call Initiation
   */
  async autoInitiateCall(phone) {
    const cleanNumber = (phone || '').replace(/[^0-9+]/g, '');
    if (!cleanNumber) {
      return { success: false, status: COMM_STATUS.FAILED, error: 'Invalid phone number format.' };
    }

    // 1. Android Native Direct Call via ACTION_CALL
    if (androidNativeSosService.detectNativeAndroid()) {
      const called = androidNativeSosService.callEmergency(cleanNumber);
      if (called) {
        return { success: true, status: COMM_STATUS.CALLING, label: 'Calling' };
      }
    }

    // 2. iOS Native Handler via WebKit
    if (this.platform === 'NATIVE_IOS' && window.webkit?.messageHandlers?.emergencyHandler?.postMessage) {
      try {
        window.webkit.messageHandlers.emergencyHandler.postMessage({ action: 'CALL', phone: cleanNumber });
        return { success: true, status: COMM_STATUS.CALLING, label: 'Calling' };
      } catch (e) {
        console.warn('iOS Native call error:', e);
      }
    }

    // 3. Web / Mobile Safari standard tel: invocation
    try {
      window.location.href = `tel:${cleanNumber}`;
      return { success: true, status: COMM_STATUS.CALLING, label: 'Calling' };
    } catch (err) {
      console.warn('Auto call trigger error:', err);
      return { success: false, status: COMM_STATUS.FAILED, error: 'Unable to initiate call.' };
    }
  }

  /**
   * Zero-Tap Automated Alert Dispatch via Android Native SMS or Backend Cloud Alert
   */
  async autoDispatchAlert({ sessionId, location, contacts, timestamp, liveTrackingUrl }) {
    // 1. Android Native Direct SMS via SmsManager
    if (androidNativeSosService.detectNativeAndroid()) {
      let anySent = false;
      const messageText = `SAFEROUTE EMERGENCY ALERT\n\nI may be in an emergency situation.\n\nMy current live location:\n${liveTrackingUrl}\n\nTime:\n${timestamp}\n\nPlease contact me immediately.`;

      for (const contact of contacts) {
        if (contact.phone) {
          const sent = androidNativeSosService.sendEmergencySMS(contact.phone, messageText);
          if (sent) anySent = true;
        }
      }

      if (anySent) {
        return { success: true, status: COMM_STATUS.SENT, label: 'Sent', deliveredCount: contacts.length };
      }
    }

    // 2. Backend Cloud Alert Dispatcher
    try {
      const res = await cloudAlertDispatcher.dispatchEmergencyAlert({
        sessionId,
        location,
        contacts,
        timestamp,
        liveTrackingUrl
      });

      if (res && res.success) {
        return { success: true, status: COMM_STATUS.SENT, label: 'Sent', deliveredCount: res.deliveredCount };
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
    if (androidNativeSosService.detectNativeAndroid()) {
      androidNativeSosService.startForegroundTracking(sessionId);
    }
  }

  /**
   * Stops Native Foreground Service
   */
  stopForegroundService() {
    if (androidNativeSosService.detectNativeAndroid()) {
      androidNativeSosService.stopForegroundTracking();
    }
  }
}

export const platformEmergencyBridge = new PlatformEmergencyBridge();
