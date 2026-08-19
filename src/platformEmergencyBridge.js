// SafeRoute: Platform Emergency Communication Bridge
// Handles Zero-Touch automated calling and backend emergency alert dispatch

import { cloudAlertDispatcher } from './cloudAlertDispatcher.js';

export const COMM_STATUS = {
  PREPARING: 'Preparing',
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
    if (typeof window !== 'undefined' && window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()) {
      const p = window.Capacitor.getPlatform();
      return p === 'android' ? 'NATIVE_ANDROID' : (p === 'ios' ? 'NATIVE_IOS' : 'NATIVE_APP');
    }

    if (typeof window !== 'undefined' && window.AndroidEmergencyBridge) {
      return 'NATIVE_ANDROID';
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
   * Automatically initiates the phone call to the primary contact
   */
  async autoInitiateCall(phone) {
    const cleanNumber = (phone || '').replace(/[^0-9+]/g, '');
    if (!cleanNumber) {
      return { success: false, status: COMM_STATUS.FAILED, error: 'Invalid phone number format.' };
    }

    // 1. Native Android Direct Call via Bridge
    if (this.platform === 'NATIVE_ANDROID' && window.AndroidEmergencyBridge && window.AndroidEmergencyBridge.callEmergency) {
      try {
        const res = window.AndroidEmergencyBridge.callEmergency(cleanNumber);
        if (res) return { success: true, status: COMM_STATUS.IN_PROGRESS, label: 'In Progress' };
      } catch (e) {
        console.warn('Native Android direct call error:', e);
      }
    }

    // 2. iOS Native Handler via WebKit
    if (this.platform === 'NATIVE_IOS' && window.webkit?.messageHandlers?.emergencyHandler?.postMessage) {
      try {
        window.webkit.messageHandlers.emergencyHandler.postMessage({ action: 'CALL', phone: cleanNumber });
        return { success: true, status: COMM_STATUS.IN_PROGRESS, label: 'In Progress' };
      } catch (e) {
        console.warn('iOS Native call error:', e);
      }
    }

    // 3. Web / Mobile Safari standard tel: invocation
    try {
      window.location.href = `tel:${cleanNumber}`;
      return { success: true, status: COMM_STATUS.IN_PROGRESS, label: 'In Progress' };
    } catch (err) {
      console.warn('Auto call trigger error:', err);
      return { success: false, status: COMM_STATUS.FAILED, error: 'Unable to initiate call.' };
    }
  }

  /**
   * Automatically dispatches the emergency live location alert to all contacts via backend cloud service
   */
  async autoDispatchAlert({ sessionId, location, contacts, timestamp, liveTrackingUrl }) {
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
}

export const platformEmergencyBridge = new PlatformEmergencyBridge();
