// SafeRoute: Platform Emergency Communication Bridge
// Truthful, platform-aware emergency calling and messaging handling iOS Safari, Android, and Native Mobile architectures

export const COMM_STATUS = {
  NOT_STARTED: 'NOT_STARTED',
  PREPARING: 'PREPARING',
  ACTION_REQUIRED: 'ACTION_REQUIRED',
  STARTED: 'STARTED',
  SENT: 'SENT',
  SHARED: 'SHARED',
  FAILED: 'FAILED',
  UNAVAILABLE: 'UNAVAILABLE'
};

export class PlatformEmergencyBridge {
  constructor() {
    this.platform = this.detectPlatform();
  }

  detectPlatform() {
    // Check for native Capacitor / Cordova wrapper
    if (typeof window !== 'undefined' && window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()) {
      const p = window.Capacitor.getPlatform();
      return p === 'android' ? 'NATIVE_ANDROID' : (p === 'ios' ? 'NATIVE_IOS' : 'NATIVE_APP');
    }

    // Check for Android Web Bridge
    if (typeof window !== 'undefined' && window.AndroidEmergencyBridge) {
      return 'NATIVE_ANDROID';
    }

    // Check for iOS WebKit Message Handlers
    if (typeof window !== 'undefined' && window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.emergencyHandler) {
      return 'NATIVE_IOS';
    }

    // Mobile Safari / iOS Web
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    if (isIOS) {
      return 'IOS_SAFARI';
    }

    // Android Web / Chrome
    if (/Android/.test(ua)) {
      return 'ANDROID_WEB';
    }

    return 'STANDARD_WEB';
  }

  /**
   * Determines whether the current platform permits silent, automated phone dialing
   */
  canAutoDialWithoutUserGesture() {
    return this.platform === 'NATIVE_ANDROID';
  }

  /**
   * Determines whether the current platform permits silent, background SMS sending
   */
  canAutoSendSmsWithoutUserGesture() {
    return this.platform === 'NATIVE_ANDROID';
  }

  /**
   * Returns truthful initial communication status after SOS countdown reaches 0
   */
  getInitialCallStatus() {
    if (this.canAutoDialWithoutUserGesture()) {
      return { status: COMM_STATUS.PREPARING, label: 'Starting auto-call...' };
    }
    return { status: COMM_STATUS.ACTION_REQUIRED, label: 'Action Required (Tap Call)' };
  }

  getInitialMessageStatus() {
    if (this.canAutoSendSmsWithoutUserGesture()) {
      return { status: COMM_STATUS.PREPARING, label: 'Dispatching auto-SMS...' };
    }
    return { status: COMM_STATUS.ACTION_REQUIRED, label: 'Action Required (Tap SMS / Share)' };
  }

  /**
   * Initiates phone call on direct user interaction (or native direct call if available)
   */
  async executeCall(phone) {
    const cleanNumber = (phone || '').replace(/[^0-9+]/g, '');
    if (!cleanNumber) {
      return { success: false, status: COMM_STATUS.FAILED, error: 'Invalid phone number format.' };
    }

    // 1. Native Android Direct Call via Bridge
    if (this.platform === 'NATIVE_ANDROID' && window.AndroidEmergencyBridge && window.AndroidEmergencyBridge.callEmergency) {
      try {
        const res = window.AndroidEmergencyBridge.callEmergency(cleanNumber);
        if (res) return { success: true, status: COMM_STATUS.STARTED, label: 'Started (Native Call)' };
      } catch (e) {
        console.warn('Native Android call error:', e);
      }
    }

    // 2. iOS Native Handler via WebKit
    if (this.platform === 'NATIVE_IOS' && window.webkit?.messageHandlers?.emergencyHandler?.postMessage) {
      try {
        window.webkit.messageHandlers.emergencyHandler.postMessage({ action: 'CALL', phone: cleanNumber });
        return { success: true, status: COMM_STATUS.STARTED, label: 'Started (iOS Native Call)' };
      } catch (e) {
        console.warn('iOS Native call error:', e);
      }
    }

    // 3. Web / iOS Safari standard tel: protocol (Requires user gesture)
    try {
      window.location.href = `tel:${cleanNumber}`;
      return { success: true, status: COMM_STATUS.STARTED, label: 'Started (Dialer Opened)' };
    } catch (err) {
      console.warn('Call execution error:', err);
      return { success: false, status: COMM_STATUS.FAILED, error: 'Unable to open phone dialer.' };
    }
  }

  /**
   * Dispatches emergency SMS / message on direct user interaction (or native direct SMS if available)
   */
  async executeSms(phone, messageText) {
    const cleanNumber = (phone || '').replace(/[^0-9+]/g, '');
    const encodedBody = encodeURIComponent(messageText);

    // 1. Native Android Direct SMS via Bridge
    if (this.platform === 'NATIVE_ANDROID' && window.AndroidEmergencyBridge && window.AndroidEmergencyBridge.sendSMS) {
      try {
        const sent = window.AndroidEmergencyBridge.sendSMS(cleanNumber, messageText);
        if (sent) return { success: true, status: COMM_STATUS.SENT, label: 'Sent (Native SMS)' };
      } catch (e) {
        console.warn('Native Android SMS error:', e);
      }
    }

    // 2. iOS Native Handler via WebKit
    if (this.platform === 'NATIVE_IOS' && window.webkit?.messageHandlers?.emergencyHandler?.postMessage) {
      try {
        window.webkit.messageHandlers.emergencyHandler.postMessage({ action: 'SMS', phone: cleanNumber, message: messageText });
        return { success: true, status: COMM_STATUS.SENT, label: 'Sent (iOS Native SMS)' };
      } catch (e) {
        console.warn('iOS Native SMS error:', e);
      }
    }

    // 3. Web Share API (Superior on iPhone / Safari for 1-tap iMessage, WhatsApp & SMS sharing)
    if (navigator.share) {
      try {
        await navigator.share({
          title: '🚨 SafeRoute Emergency Alert',
          text: messageText
        });
        return { success: true, status: COMM_STATUS.SHARED, label: 'Shared (iOS Share / iMessage)' };
      } catch (shareErr) {
        if (shareErr.name === 'AbortError') {
          // User dismissed share sheet
          return { success: false, status: COMM_STATUS.ACTION_REQUIRED, label: 'Share Dismissed (Tap to Retry)' };
        }
        console.warn('Web Share fallback to SMS uri:', shareErr);
      }
    }

    // 4. Web / iOS Safari standard sms: protocol
    try {
      // iOS Safari uses '&body=' or '?body=' depending on iOS version
      const isIOS = this.platform === 'IOS_SAFARI';
      const separator = isIOS ? '&body=' : '?body=';
      const smsUri = cleanNumber ? `sms:${cleanNumber}${separator}${encodedBody}` : `sms:${separator}${encodedBody}`;
      
      window.location.href = smsUri;
      return { success: true, status: COMM_STATUS.STARTED, label: 'SMS App Opened' };
    } catch (err) {
      console.warn('SMS execution error:', err);
      return { success: false, status: COMM_STATUS.FAILED, error: 'Unable to open SMS application.' };
    }
  }
}

export const platformEmergencyBridge = new PlatformEmergencyBridge();
