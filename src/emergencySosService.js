// SafeRoute: Central Zero-Tap Android Native & Web Emergency SOS Engine
// Dynamic Authoritative Contacts -> 3-Second Countdown -> 100% Parallel Automatic GPS & Alert Dispatch

import { userStore } from './userStore.js';
import { authService } from './authService.js';
import { liveSosSessionStore } from './liveSosSessionStore.js';
import { platformEmergencyBridge, COMM_STATUS } from './platformEmergencyBridge.js';
import { androidNativeSosService } from './androidNativeSosService.js';
import { normalizePhoneNumber } from './phoneUtils.js';

export const SOS_STATUS = {
  INACTIVE: 'SOS INACTIVE',
  COUNTDOWN: 'SOS COUNTDOWN',
  ACTIVE: 'SOS ACTIVE'
};

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
   * Loads contacts from user-scoped database
   */
  loadContacts() {
    const user = authService?.getAuthenticatedUser();
    const userId = user?.userId || (user?.phone ? userStore.generateUserId(user.phone) : 'usr_default');
    const userContacts = userStore.getUserContacts(userId);
    return userContacts.map(c => ({
      id: c.contactId || c.id,
      contactId: c.contactId || c.id,
      userId,
      name: c.contactName || c.name || 'Emergency Contact',
      phone: normalizePhoneNumber(c.contactNumber || c.phone || ''),
      relation: c.relation || 'Contact',
      isPrimary: !!c.isPrimary,
      callStatus: 'Preparing',
      messageStatus: 'Preparing'
    }));
  }

  reloadUserContacts() {
    this.contacts = this.loadContacts();
    this.permissionState.contactsConfigured = this.contacts.length > 0;
    this.permissionState.hasPrimaryContact = this.contacts.some(c => c.isPrimary);
    this.onContactsChange(this.contacts);
    this.checkReadiness();
  }

  /**
   * Saves contacts to user-scoped database
   */
  saveContacts() {
    const user = authService?.getAuthenticatedUser();
    const userId = user?.userId || (user?.phone ? userStore.generateUserId(user.phone) : 'usr_default');
    userStore.saveUserContacts(userId, this.contacts);
    this.permissionState.contactsConfigured = this.contacts.length > 0;
    this.permissionState.hasPrimaryContact = this.contacts.some(c => c.isPrimary);
    this.onContactsChange(this.contacts);
    this.checkReadiness();
  }

  getContacts() {
    return [...this.contacts];
  }

  getPrimaryContact() {
    return this.contacts.find(c => c.isPrimary) || this.contacts[0] || null;
  }

  addContact(name, phone, relation = 'Emergency Contact', isPrimary = false) {
    const cleanName = (name || '').trim();
    const normPhone = normalizePhoneNumber(phone);
    if (!cleanName) return { success: false, error: 'Contact name is required.' };
    if (!normPhone) return { success: false, error: 'Valid phone number is required.' };

    if (isPrimary || this.contacts.length === 0) {
      this.contacts.forEach(c => c.isPrimary = false);
    }

    const newContact = {
      id: `c_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      contactId: `c_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      userId: authService?.getAuthenticatedUser()?.userId || 'usr_default',
      name: cleanName,
      phone: normPhone,
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
    const contact = this.contacts.find(c => c.id === id || c.contactId === id);
    if (!contact) return { success: false, error: 'Contact not found.' };

    if (data.name !== undefined) contact.name = data.name.trim();
    if (data.phone !== undefined) contact.phone = normalizePhoneNumber(data.phone);
    if (data.relation !== undefined) contact.relation = data.relation.trim();
    
    if (data.isPrimary) {
      this.contacts.forEach(c => c.isPrimary = (c.id === id || c.contactId === id));
    }

    this.saveContacts();
    return { success: true, contact };
  }

  setPrimaryContact(id) {
    this.contacts.forEach(c => c.isPrimary = (c.id === id || c.contactId === id));
    this.saveContacts();
  }

  deleteContact(id) {
    const prevLen = this.contacts.length;
    this.contacts = this.contacts.filter(c => c.id !== id && c.contactId !== id);
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
    let locStatus = 'prompt';
    let micStatus = 'prompt';
    let notifStatus = 'default';

    if (navigator.permissions && navigator.permissions.query) {
      try {
        const pLoc = await navigator.permissions.query({ name: 'geolocation' });
        locStatus = pLoc.state;
        pLoc.onchange = () => this.checkPermissionStatus();
      } catch (e) {}

      try {
        const pMic = await navigator.permissions.query({ name: 'microphone' });
        micStatus = pMic.state;
        pMic.onchange = () => this.checkPermissionStatus();
      } catch (e) {}
    }

    if ('Notification' in window) {
      notifStatus = Notification.permission;
    }

    const nativePerms = androidNativeSosService.checkNativePermissions();

    this.permissionState = {
      location: locStatus,
      microphone: micStatus,
      notifications: notifStatus,
      androidCalling: nativePerms.callPhone ? 'granted' : 'prompt',
      androidSms: nativePerms.sendSms ? 'granted' : 'prompt',
      androidBackgroundLoc: nativePerms.backgroundLocation ? 'granted' : 'prompt',
      contactsConfigured: this.contacts.length > 0,
      hasPrimaryContact: this.contacts.some(c => c.isPrimary)
    };

    this.checkReadiness();
    return this.permissionState;
  }

  checkReadiness() {
    const isReady = (
      this.permissionState.location === 'granted' &&
      this.permissionState.contactsConfigured &&
      this.permissionState.hasPrimaryContact
    );

    const report = {
      isReady,
      location: this.permissionState.location,
      microphone: this.permissionState.microphone,
      notifications: this.permissionState.notifications,
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
  startSosCountdown(source = 'Manual Button') {
    if (this.state === SOS_STATUS.COUNTDOWN || this.state === SOS_STATUS.ACTIVE) return;

    // Refresh contacts from store before activation
    this.contacts = this.loadContacts();

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

  cancelSosCountdown() {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
    this.state = SOS_STATUS.INACTIVE;
    this.onStateChange(this.state, { cancelled: true });
  }

  async activateNativeSOS(source = this.triggerSource) {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }

    // Always ensure freshest contacts from store
    this.contacts = this.loadContacts();

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

    // 4. Parallel Task D: Automatically Dispatch Emergency Alert to Authoritative Contacts
    this.autoDispatchEmergencyAlert(liveTrackingUrl);

    // 5. Parallel Task E: Automatically Initiate Primary Phone Call (on Android Native)
    if (primary && primary.phone) {
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

  async activateSOS(source = this.triggerSource) {
    return this.activateNativeSOS(source);
  }

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

  async autoDispatchEmergencyAlert(liveTrackingUrl) {
    const user = authService?.getAuthenticatedUser();
    const userPhone = user?.mobileNumber || user?.phone || '+91 User';

    const res = await platformEmergencyBridge.autoDispatchAlert({
      sessionId: this.activeLiveSession ? this.activeLiveSession.id : 'unknown',
      location: this.currentLocation,
      contacts: this.contacts,
      timestamp: this.sosTimestamp,
      liveTrackingUrl,
      userPhone
    });

    if (res && res.success) {
      this.contacts.forEach(c => c.messageStatus = 'Sent');
    } else {
      this.contacts.forEach(c => c.messageStatus = 'Failed');
    }
    this.onContactsChange(this.contacts);
  }

  async autoInitiatePrimaryCall(primary) {
    const res = await platformEmergencyBridge.autoInitiateCall(primary.phone);
    if (res && res.success) {
      primary.callStatus = res.status === COMM_STATUS.CALLING ? 'Calling' : (res.status === COMM_STATUS.WEB_STANDBY ? 'Web Standby' : 'Active');
    } else {
      primary.callStatus = 'Failed';
    }
    this.onContactsChange(this.contacts);
  }

  manualCallPrimary() {
    const primary = this.getPrimaryContact();
    if (primary && primary.phone) {
      return platformEmergencyBridge.manualWebCall(primary.phone);
    }
    return { success: false, error: 'No primary contact configured.' };
  }

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
