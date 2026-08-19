// SafeRoute: Android Native SOS Service Bridge
// Direct integration with Android Telephony (CALL_PHONE), SmsManager (SEND_SMS), and Foreground Service

export class AndroidNativeSosService {
  constructor() {
    this.isNative = this.detectNativeAndroid();
  }

  detectNativeAndroid() {
    return typeof window !== 'undefined' && !!window.AndroidEmergencyBridge;
  }

  /**
   * Checks native Android runtime permissions
   */
  checkNativePermissions() {
    if (!this.detectNativeAndroid()) {
      return { isNative: false, isReady: false };
    }

    try {
      const raw = window.AndroidEmergencyBridge.checkNativePermissions();
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      return { isNative: true, ...parsed };
    } catch (e) {
      console.warn('Error reading Android native permissions:', e);
      return { isNative: true, isReady: false };
    }
  }

  /**
   * Requests native Android runtime permissions for CALL_PHONE, SEND_SMS, ACCESS_FINE_LOCATION
   */
  requestNativePermissions() {
    if (this.detectNativeAndroid() && window.AndroidEmergencyBridge.requestNativePermissions) {
      try {
        window.AndroidEmergencyBridge.requestNativePermissions();
        return true;
      } catch (e) {
        console.warn('Error requesting Android permissions:', e);
      }
    }
    return false;
  }

  /**
   * Zero-Tap Direct Call Execution via Android Native Telephony
   */
  callEmergency(phoneNumber) {
    if (this.detectNativeAndroid() && window.AndroidEmergencyBridge.callEmergency) {
      try {
        return window.AndroidEmergencyBridge.callEmergency(phoneNumber);
      } catch (e) {
        console.warn('Native Android direct call error:', e);
      }
    }
    return false;
  }

  /**
   * Zero-Tap Direct SMS Execution via Android Native SmsManager
   */
  sendEmergencySMS(phoneNumber, messageText) {
    if (this.detectNativeAndroid() && window.AndroidEmergencyBridge.sendEmergencySMS) {
      try {
        return window.AndroidEmergencyBridge.sendEmergencySMS(phoneNumber, messageText);
      } catch (e) {
        console.warn('Native Android direct SMS error:', e);
      }
    }
    return false;
  }

  /**
   * Starts Persistent Foreground Service for Background Live GPS & Screen-Lock Tracking
   */
  startForegroundTracking(sessionId) {
    if (this.detectNativeAndroid() && window.AndroidEmergencyBridge.startForegroundTracking) {
      try {
        window.AndroidEmergencyBridge.startForegroundTracking(sessionId);
      } catch (e) {
        console.warn('Native foreground tracking error:', e);
      }
    }
  }

  /**
   * Stops Persistent Foreground Service
   */
  stopForegroundTracking() {
    if (this.detectNativeAndroid() && window.AndroidEmergencyBridge.stopForegroundTracking) {
      try {
        window.AndroidEmergencyBridge.stopForegroundTracking();
      } catch (e) {
        console.warn('Native stop foreground tracking error:', e);
      }
    }
  }
}

export const androidNativeSosService = new AndroidNativeSosService();
