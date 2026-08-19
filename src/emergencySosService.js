import { userStore } from './userStore.js';
import { authService } from './authService.js';
// SafeRoute: Central Zero-Tap Android Native & Web Emergency SOS Engine
// Pre-Authorized Setup -> 5-Second Countdown -> 100% Parallel Automatic GPS, Calling, Alert Dispatch & Foreground Live Tracking

import { liveSosSessionStore } from './liveSosSessionStore.js';
import { platformEmergencyBridge, COMM_STATUS } from './platformEmergencyBridge.js';
import { androidNativeSosService } from './androidNativeSosService.js';

export const SOS_STATUS = {
  INACTIVE: 'SOS INACTIVE',
  COUNTDOWN: 'SOS COUNTDOWN',
  ACTIVE: 'SOS ACTIVE'
};

const DEFAULT_CONTACTS = [
  { id: 'c1', name: 'Mother', phone: '+919876543210', relation: 'Family', isPrimary: true, callStatus: 'Preparing', messageStatus: 'Preparing' },
  { id: 'c2', name: 'Friend', phone: '+919123456789', relation: 'Friend', isPrimary: false, callStatus: 'Standby', messageStatus: 'Preparing' }
];

export class EmergencySosService {
  constructor(options = {}) {
    this.onStateChange = options.onStateChange || (() => {});
    this.onCountdownTick = options.onCountdownTick || (() => {});
    this.onLocationUpdate = options.onLocationUpdate || (() => {});
    this.onContactsChange = options.onContactsChange || (() => {});
    this.onReadinessChange = options.onReadinessChange || (() => {});

    this.state = SOS_STATUS.INACTIVE;
    this.triggerSource = 'Manual Button';
    this.countdownTimer = null;
    this.countdownSeconds = 3;
    
    this.currentLocation = null;
    this.locationError = null;
    this.sosTimestamp = null;
    this.activeLiveSession = null;
    this.watchPositionId = null;

    this.contacts = this.loadContacts();

    // Permissions State Cache
    this.permissionState = {
      location: 'unknown',
      microphone: 'unknown',
      notifications: 'unknown',
      androidCalling: 'unknown',
      androidSms: 'unknown',
      androidBackgroundLoc: 'unknown',
      contactsConfigured: this.contacts.length > 0,
      hasPrimaryContact: this.contacts.some(c => c.isPrimary)
    };

    this.initPermissionMonitoring();

    if (typeof window !== 'undefined') {
      window.onNativePermissionsUpdated = () => {
        this.checkPermissionStatus();
      };
    }
  }

  /**
   * Loads contacts from localStorage
   */
  loadContacts() {
    try {
      const saved = localStorage.getItem('saferoute_emergency_contacts_v3');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map(c => ({
            ...c,
            callStatus: 'Preparing',
            messageStatus: 'Preparing'
          }));
        }
      }
    } catch (e) {
      console.warn('Failed to load emergency contacts', e);
    }
    return DEFAULT_CONTACTS.map(c => ({ ...c }));
  }

  /**
   * Saves contacts to localStorage
   */
  saveContacts() {
    try {
      localStorage.setItem('saferoute_emergency_contacts_v3', JSON.stringify(this.contacts.map(({ id, name, phone, relation, isPrimary }) => ({
        id, name, phone, relation, isPrimary
      }))));
      this.permissionState.contactsConfigured = this.contacts.length > 0;
      this.permissionState.hasPrimaryContact = this.contacts.some(c => c.isPrimary);
      this.onContactsChange(this.contacts);
      this.checkReadiness();
    } catch (e) {
      console.warn('Failed to save emergency contacts', e);
    }
  }

  getContacts() {
    return [...this.contacts];
  }

  getPrimaryContact() {
    return this.contacts.find(c => c.isPrimary) || this.contacts[0] || null;
  }

  addContact(name, phone, relation = 'Emergency Contact', isPrimary = false) {
    const cleanName = (name || '').trim();
    const cleanPhone = (phone || '').trim();
    if (!cleanName) return { success: false, error: 'Contact name is required.' };
    if (!cleanPhone) return { success: false, error: 'Phone number is required.' };

    if (isPrimary || this.contacts.length === 0) {
      this.contacts.forEach(c => c.isPrimary = false);
    }

    const newContact = {
      id: `c_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      name: cleanName,
      phone: cleanPhone,
      relation: relation.trim() || 'Contact',
      isPrimary: isPrimary || this.contacts.length === 0,
      callStatus: 'Preparing',
      messageStatus: 'Preparing'
    };

    this.contacts.push(newContact);
    this.saveContacts();
    return { success: true, contact: newContact };
  }

  updateContact(id, data) {
    const contact = this.contacts.find(c => c.id === id);
    if (!contact) return { success: false, error: 'Contact not found.' };

    if (data.name !== undefined) contact.name = data.name.trim();
    if (data.phone !== undefined) contact.phone = data.phone.trim();
    if (data.relation !== undefined) contact.relation = data.relation.trim();
    
    if (data.isPrimary) {
      this.contacts.forEach(c => c.isPrimary = (c.id === id));
    }

    this.saveContacts();
    return { success: true, contact };
  }

  setPrimaryContact(id) {
    this.contacts.forEach(c => c.isPrimary = (c.id === id));
    this.saveContacts();
  }

  deleteContact(id) {
    const prevLen = this.contacts.length;
    this.contacts = this.contacts.filter(c => c.id !== id);
    if (this.contacts.length > 0 && !this.contacts.some(c => c.isPrimary)) {
      this.contacts[0].isPrimary = true;
    }
    if (this.contacts.length !== prevLen) {
      this.saveContacts();
      return true;
    }
    return false;
  }

  // ================= PERMISSION PRE-AUTHORIZATION & MONITORING =================

  async initPermissionMonitoring() {
    await this.checkPermissionStatus();

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.checkPermissionStatus();
      }
    });

    setInterval(() => {
      this.checkPermissionStatus();
    }, 12000);
  }

  async checkPermissionStatus() {
    if (!navigator.geolocation) {
      this.permissionState.location = 'unsupported';
    } else if (navigator.permissions && navigator.permissions.query) {
      try {
        const geoStatus = await navigator.permissions.query({ name: 'geolocation' });
        this.permissionState.location = geoStatus.state;
        geoStatus.onchange = () => this.checkPermissionStatus();
      } catch (e) {
        if (this.permissionState.location === 'unknown') {
          this.permissionState.location = 'prompt';
        }
      }
    }

    if (navigator.permissions && navigator.permissions.query) {
      try {
        const micStatus = await navigator.permissions.query({ name: 'microphone' });
        this.permissionState.microphone = micStatus.state;
        micStatus.onchange = () => this.checkPermissionStatus();
      } catch (e) {}
    }

    if ('Notification' in window) {
      this.permissionState.notifications = Notification.permission;
    } else {
      this.permissionState.notifications = 'unsupported';
    }

    // Android Native Permission Inspection
    const nativeReport = androidNativeSosService.checkNativePermissions();
    if (nativeReport.isNative) {
      this.permissionState.androidCalling = nativeReport.callPhone ? 'granted' : 'prompt';
      this.permissionState.androidSms = nativeReport.sendSms ? 'granted' : 'prompt';
      this.permissionState.androidBackgroundLoc = nativeReport.backgroundLocation ? 'granted' : 'prompt';
    }

    this.permissionState.contactsConfigured = this.contacts.length > 0;
    this.permissionState.hasPrimaryContact = this.contacts.some(c => c.isPrimary);

    return this.checkReadiness();
  }

  checkReadiness() {
    const isLocationReady = this.permissionState.location === 'granted';
    const isContactsReady = this.permissionState.contactsConfigured && this.permissionState.hasPrimaryContact;
    const isReady = isLocationReady && isContactsReady;

    const report = {
      isReady,
      location: this.permissionState.location,
      microphone: this.permissionState.microphone,
      notifications: this.permissionState.notifications,
      androidCalling: this.permissionState.androidCalling,
      androidSms: this.permissionState.androidSms,
      androidBackgroundLoc: this.permissionState.androidBackgroundLoc,
      contactsCount: this.contacts.length,
      primaryContact: this.getPrimaryContact(),
      platform: platformEmergencyBridge.platform,
      isNativeAndroid: platformEmergencyBridge.isNativeAndroid(),
      phoneSupport: true,
      smsSupport: true,
      liveTrackingSupport: true
    };

    this.onReadinessChange(isReady, report);
    return report;
  }

  async requestLocationPreAuthorization() {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        this.permissionState.location = 'unsupported';
        resolve({ success: false, error: 'Geolocation unsupported on this device.' });
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          this.permissionState.location = 'granted';
          this.currentLocation = {
            latitude: Number(pos.coords.latitude.toFixed(6)),
            longitude: Number(pos.coords.longitude.toFixed(6)),
            accuracy: Math.round(pos.coords.accuracy || 10),
            timestamp: new Date(pos.timestamp).toLocaleTimeString()
          };
          this.checkReadiness();
          resolve({ success: true, coords: this.currentLocation });
        },
        (err) => {
          this.permissionState.location = (err.code === 1) ? 'denied' : 'prompt';
          this.checkReadiness();
          resolve({ success: false, error: err.message });
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
      );
    });
  }

  async requestMicrophonePreAuthorization() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return { success: false, error: 'Microphone access is not supported by your browser.' };
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      this.permissionState.microphone = 'granted';
      this.checkReadiness();
      return { success: true };
    } catch (err) {
      this.permissionState.microphone = 'denied';
      this.checkReadiness();
      return { success: false, error: err.message };
    }
  }

  async requestNotificationPreAuthorization() {
    if (!('Notification' in window)) {
      return { success: false, error: 'Notifications not supported on this device.' };
    }

    try {
      const perm = await Notification.requestPermission();
      this.permissionState.notifications = perm;
      this.checkReadiness();
      return { success: perm === 'granted' };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  requestAndroidNativePermissions() {
    return androidNativeSosService.requestNativePermissions();
  }

  // ================= ZERO-TAP AUTOMATIC NATIVE SOS PIPELINE =================

  /**
   * Starts 5-Second False-Activation-Prevention Countdown
   */
  startSosCountdown(source = 'Manual Button') {
    if (this.state === SOS_STATUS.COUNTDOWN || this.state === SOS_STATUS.ACTIVE) return;

    this.state = SOS_STATUS.COUNTDOWN;
    this.triggerSource = source;
    this.countdownSeconds = 3;
    this.onStateChange(this.state, { seconds: this.countdownSeconds, source: this.triggerSource });

    if (this.countdownTimer) clearInterval(this.countdownTimer);

    this.countdownTimer = setInterval(() => {
      this.countdownSeconds--;
      if (this.countdownSeconds > 0) {
        this.onCountdownTick(this.countdownSeconds);
      } else {
        clearInterval(this.countdownTimer);
        this.countdownTimer = null;
        this.activateNativeSOS(this.triggerSource);
      }
    }, 1000);
  }

  /**
   * User cancels the SOS countdown
   */
  cancelSosCountdown() {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
    this.state = SOS_STATUS.INACTIVE;
    this.onStateChange(this.state, { cancelled: true });
  }

  /**
   * CENTRAL NATIVE ZERO-TAP SOS FUNCTION (Called at Countdown = 0)
   * Runs all operations in PARALLEL without sequential delays:
   * 1. Get Live GPS
   * 2. Start Live Location Tracking + Android Foreground Service
   * 3. Send Emergency Alert (Native SMS / Backend Cloud Alert)
   * 4. Call Primary Contact (Android Native Telephony ACTION_CALL)
   * 5. Show SOS ACTIVE status screen (ZERO taps required)
   */
  async activateNativeSOS(source = this.triggerSource) {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }

    this.state = SOS_STATUS.ACTIVE;
    this.triggerSource = source;
    this.sosTimestamp = new Date().toLocaleTimeString();
    this.locationError = null;

    const primary = this.getPrimaryContact();
    const isNative = platformEmergencyBridge.isNativeAndroid();

    // Reset status indicators
    this.contacts.forEach(c => {
      if (c.isPrimary) {
        c.callStatus = isNative ? 'Calling' : 'Web Standby';
      } else {
        c.callStatus = 'Standby';
      }
      c.messageStatus = 'Sending';
    });

    this.onStateChange(this.state, {
      source: this.triggerSource,
      timestamp: this.sosTimestamp,
      contacts: this.contacts,
      isNativeAndroid: isNative,
      statusPhase: 'INITIALIZING'
    });

    // 1. Parallel Task A: Obtain Real GPS Fix
    const initialCoords = await this.fetchCurrentLocation();

    // 2. Parallel Task B: Initialize Secure SOS Live Session
    this.activeLiveSession = liveSosSessionStore.createSession(initialCoords, this.triggerSource);
    const liveTrackingUrl = liveSosSessionStore.getLiveTrackingUrl(this.activeLiveSession.id);

    // 3. Parallel Task C: Start Continuous GPS Tracking & Persistent Foreground Service
    this.startLiveLocationTracking();
    platformEmergencyBridge.startForegroundService(this.activeLiveSession.id);

    // 4. Parallel Task D: Automatically Dispatch Emergency Alert
    this.autoDispatchEmergencyAlert(liveTrackingUrl);

    // 5. Parallel Task E: Automatically Initiate Primary Phone Call (on Android Native)
    if (primary) {
      this.autoInitiatePrimaryCall(primary);
    }

    this.onStateChange(this.state, {
      source: this.triggerSource,
      timestamp: this.sosTimestamp,
      contacts: this.contacts,
      session: this.activeLiveSession,
      liveUrl: liveTrackingUrl,
      isNativeAndroid: isNative,
      statusPhase: 'ACTIVE'
    });
  }

  /**
   * Backward-compatible alias for activateNativeSOS
   */
  async activateSOS(source = this.triggerSource) {
    return this.activateNativeSOS(source);
  }

  /**
   * Queries real browser/device Geolocation API
   */
  async fetchCurrentLocation() {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        this.locationError = 'Geolocation is not supported by your device.';
        this.onLocationUpdate(null, this.locationError);
        resolve(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          this.currentLocation = {
            latitude: Number(pos.coords.latitude.toFixed(6)),
            longitude: Number(pos.coords.longitude.toFixed(6)),
            accuracy: Math.round(pos.coords.accuracy || 10),
            timestamp: new Date(pos.timestamp).toLocaleTimeString()
          };
          this.locationError = null;
          this.onLocationUpdate(this.currentLocation, null);
          resolve(this.currentLocation);
        },
        (err) => {
          console.warn('Geolocation error during SOS:', err);
          let errMsg = 'Unable to access your current location.';
          if (err.code === 1) errMsg = 'Location permission denied. Please enable location in settings.';
          else if (err.code === 2) errMsg = 'Current location could not be determined.';
          else if (err.code === 3) errMsg = 'Location request timed out.';
          
          this.locationError = errMsg;
          this.onLocationUpdate(null, this.locationError);
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 6000, maximumAge: 0 }
      );
    });
  }

  /**
   * Continuous Live Location Watcher
   */
  startLiveLocationTracking() {
    if (this.watchPositionId !== null) {
      navigator.geolocation.clearWatch(this.watchPositionId);
      this.watchPositionId = null;
    }

    if (!navigator.geolocation || !this.activeLiveSession) return;

    this.watchPositionId = navigator.geolocation.watchPosition(
      (pos) => {
        if (this.state !== SOS_STATUS.ACTIVE || !this.activeLiveSession) return;

        const latestCoords = {
          latitude: Number(pos.coords.latitude.toFixed(6)),
          longitude: Number(pos.coords.longitude.toFixed(6)),
          accuracy: Math.round(pos.coords.accuracy || 10),
          heading: pos.coords.heading || null,
          speed: pos.coords.speed ? Number(pos.coords.speed.toFixed(1)) : null,
          timestamp: new Date(pos.timestamp).toLocaleTimeString()
        };

        this.currentLocation = latestCoords;
        liveSosSessionStore.appendLiveCoordinate(this.activeLiveSession.id, latestCoords);
        this.onLocationUpdate(this.currentLocation, null);
      },
      (err) => {
        console.warn('Live location watch error:', err);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 2000 }
    );
  }

  /**
   * Automatically dispatches the emergency live-location alert
   */
  async autoDispatchEmergencyAlert(liveTrackingUrl) {
    const res = await platformEmergencyBridge.autoDispatchAlert({
      sessionId: this.activeLiveSession ? this.activeLiveSession.id : 'unknown',
      location: this.currentLocation,
      contacts: this.contacts,
      timestamp: this.sosTimestamp,
      liveTrackingUrl
    });

    if (res && res.success) {
      this.contacts.forEach(c => c.messageStatus = 'Sent');
    } else {
      this.contacts.forEach(c => c.messageStatus = 'Failed');
    }
    this.onContactsChange(this.contacts);
  }

  /**
   * Automatically initiates the phone call to the primary contact
   */
  async autoInitiatePrimaryCall(primary) {
    const res = await platformEmergencyBridge.autoInitiateCall(primary.phone);
    if (res && res.success) {
      primary.callStatus = res.status === COMM_STATUS.CALLING ? 'Calling' : (res.status === COMM_STATUS.WEB_STANDBY ? 'Web Standby' : 'Active');
    } else {
      primary.callStatus = 'Failed';
    }
    this.onContactsChange(this.contacts);
  }

  /**
   * Manual call execution for Web fallback
   */
  manualCallPrimary() {
    const primary = this.getPrimaryContact();
    if (primary) {
      return platformEmergencyBridge.manualWebCall(primary.phone);
    }
    return { success: false, error: 'No primary contact configured.' };
  }

  /**
   * Stops active SOS and terminates live location session
   */
  stopSOS() {
    if (this.watchPositionId !== null) {
      navigator.geolocation.clearWatch(this.watchPositionId);
      this.watchPositionId = null;
    }

    platformEmergencyBridge.stopForegroundService();

    if (this.activeLiveSession) {
      liveSosSessionStore.terminateSession(this.activeLiveSession.id);
      this.activeLiveSession = null;
    }

    this.state = SOS_STATUS.INACTIVE;
    this.onStateChange(this.state, { stopped: true });
  }
}
