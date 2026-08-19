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

  async autoInitiateCall(phone) {
    const cleanNumber = (phone || '').replace(/[^0-9+]/g, '');
    if (!cleanNumber) {
      return { success: false, status: COMM_STATUS.FAILED, error: 'Invalid phone number format.' };
    }

    if (this.isNativeAndroid()) {
      const called = androidNativeSosService.callEmergency(cleanNumber);
      if (called) {
        return { success: true, status: COMM_STATUS.CALLING, label: 'Calling' };
      } else {
        return { success: false, status: COMM_STATUS.FAILED, error: 'Android CALL_PHONE permission not granted.' };
      }
    }

    if (this.platform === 'NATIVE_IOS' && window.webkit?.messageHandlers?.emergencyHandler?.postMessage) {
      try {
        window.webkit.messageHandlers.emergencyHandler.postMessage({ action: 'CALL', phone: cleanNumber });
        return { success: true, status: COMM_STATUS.CALLING, label: 'Calling' };
      } catch (e) {
        console.warn('iOS Native call error:', e);
      }
    }

    return {
      success: true,
      status: COMM_STATUS.WEB_STANDBY,
      label: 'Web Standby (Manual Call Available)',
      isWebLimitation: true,
      message: 'Automatic silent calling is restricted by your browser/iOS security.'
    };
  }

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

  async autoDispatchAlert({ sessionId, location, contacts, timestamp, liveTrackingUrl, userPhone }) {
    if (this.isNativeAndroid()) {
      let anySent = false;
      const gmapsLink = location ? `https://www.google.com/maps?q=${location.latitude},${location.longitude}` : (liveTrackingUrl || 'Location tracking active');
      const userNum = userPhone || 'SafeRoute User';
      const messageText = `🚨 EMERGENCY ALERT\n\nSOS has been activated.\n\nUser/System Number:\n${userNum}\n\nI may need help.\n\n📍 Current location:\n${gmapsLink}\n\nPlease contact me immediately.`;

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

    try {
      const res = await cloudAlertDispatcher.dispatchEmergencyAlert({
        sessionId,
        location,
        contacts,
        timestamp,
        liveTrackingUrl,
        userPhone
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

  startForegroundService(sessionId) {
    if (this.isNativeAndroid()) {
      androidNativeSosService.startForegroundService(sessionId);
    }
  }

  stopForegroundService() {
    if (this.isNativeAndroid()) {
      androidNativeSosService.stopForegroundService();
    }
  }
}

export const platformEmergencyBridge = new PlatformEmergencyBridge();
