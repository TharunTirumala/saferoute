// SafeRoute: Central Truthful Emergency SOS Engine
// Pre-authorized Permissions -> 5-Second Countdown -> Automatic Live GPS & Truthful Platform Communication (iOS Safari / Web / Native)

import { liveSosSessionStore } from './liveSosSessionStore.js';
import { platformEmergencyBridge, COMM_STATUS } from './platformEmergencyBridge.js';

export const SOS_STATUS = {
  INACTIVE: 'SOS INACTIVE',
  COUNTDOWN: 'SOS COUNTDOWN',
  ACTIVE: 'SOS ACTIVE',
  LOCATION_DETECTED: 'LOCATION DETECTED',
  LOCATION_UNAVAILABLE: 'LOCATION UNAVAILABLE'
};

const DEFAULT_CONTACTS = [
  { id: 'c1', name: 'Mother', phone: '+919876543210', relation: 'Family', isPrimary: true, callStatus: 'NOT_STARTED', messageStatus: 'NOT_STARTED' },
  { id: 'c2', name: 'Friend', phone: '+919123456789', relation: 'Friend', isPrimary: false, callStatus: 'NOT_STARTED', messageStatus: 'NOT_STARTED' }
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
    this.countdownSeconds = 5;
    
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
      contactsConfigured: this.contacts.length > 0,
      hasPrimaryContact: this.contacts.some(c => c.isPrimary)
    };

    this.initPermissionMonitoring();
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
            callStatus: COMM_STATUS.NOT_STARTED,
            messageStatus: COMM_STATUS.NOT_STARTED
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
      callStatus: COMM_STATUS.NOT_STARTED,
      messageStatus: COMM_STATUS.NOT_STARTED
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
      contactsCount: this.contacts.length,
      primaryContact: this.getPrimaryContact(),
      platform: platformEmergencyBridge.platform,
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

  // ================= EMERGENCY SOS PIPELINE =================

  /**
   * Starts 5-Second False-Activation-Prevention Countdown
   */
  startSosCountdown(source = 'Manual Button') {
    if (this.state === SOS_STATUS.COUNTDOWN || this.state === SOS_STATUS.ACTIVE) return;

    this.state = SOS_STATUS.COUNTDOWN;
    this.triggerSource = source;
    this.countdownSeconds = 5;
    this.onStateChange(this.state, { seconds: this.countdownSeconds, source: this.triggerSource });

    if (this.countdownTimer) clearInterval(this.countdownTimer);

    this.countdownTimer = setInterval(() => {
      this.countdownSeconds--;
      if (this.countdownSeconds > 0) {
        this.onCountdownTick(this.countdownSeconds);
      } else {
        clearInterval(this.countdownTimer);
        this.countdownTimer = null;
        this.activateSOS(this.triggerSource);
      }
    }, 1000);
  }

  /**
   * User manually cancels the SOS countdown
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
   * ONE CENTRAL TRUTHFUL SOS FUNCTION
   * Executed at countdown 0:
   * 1. Get Live GPS (instant, pre-authorized)
   * 2. Start Continuous Live Location Session (100% automatic)
   * 3. Prepare real emergency message with HTTPS live link
   * 4. Perform platform-appropriate communication:
   *    - On Native Android with direct call/SMS permission -> Execute automatically
   *    - On Web / iOS Safari -> Set status to ACTION_REQUIRED and present prominent 1-tap call & SMS triggers
   * 5. Display SOS ACTIVE screen with truthful statuses
   */
  async activateSOS(source = this.triggerSource) {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }

    this.state = SOS_STATUS.ACTIVE;
    this.triggerSource = source;
    this.sosTimestamp = new Date().toLocaleString();
    this.locationError = null;

    // Truthful initial statuses based on platform capability
    const initialCall = platformEmergencyBridge.getInitialCallStatus();
    const initialMsg = platformEmergencyBridge.getInitialMessageStatus();

    this.contacts.forEach(c => {
      c.callStatus = c.isPrimary ? initialCall.status : COMM_STATUS.NOT_STARTED;
      c.messageStatus = initialMsg.status;
    });

    this.onStateChange(this.state, {
      source: this.triggerSource,
      timestamp: this.sosTimestamp,
      contacts: this.contacts,
      statusPhase: 'INITIALIZING'
    });

    // 1. Obtain Instant GPS Fix
    const initialCoords = await this.fetchCurrentLocation();

    // 2. Initialize Secure Live Location Tracking Session
    this.activeLiveSession = liveSosSessionStore.createSession(initialCoords, this.triggerSource);
    const liveTrackingUrl = liveSosSessionStore.getLiveTrackingUrl(this.activeLiveSession.id);

    // 3. Start Continuous Live Location Tracking (100% Automatic)
    this.startLiveLocationTracking();

    // 4. If platform supports silent background execution (Native Android bridge), execute now
    if (platformEmergencyBridge.canAutoSendSmsWithoutUserGesture()) {
      const primary = this.getPrimaryContact();
      if (primary) {
        const msg = this.getEmergencyMessageText(liveTrackingUrl);
        const res = await platformEmergencyBridge.executeSms(primary.phone, msg);
        this.contacts.forEach(c => c.messageStatus = res.status);
      }
    }

    if (platformEmergencyBridge.canAutoDialWithoutUserGesture()) {
      const primary = this.getPrimaryContact();
      if (primary) {
        const res = await platformEmergencyBridge.executeCall(primary.phone);
        primary.callStatus = res.status;
      }
    }

    this.onContactsChange(this.contacts);

    this.onStateChange(this.state, {
      source: this.triggerSource,
      timestamp: this.sosTimestamp,
      contacts: this.contacts,
      session: this.activeLiveSession,
      liveUrl: liveTrackingUrl,
      statusPhase: 'ACTIVE'
    });
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
          if (err.code === 1) errMsg = 'Location permission denied. Please enable location in browser settings.';
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
   * Generates standard plain-text emergency message payload with deployed HTTPS Live Tracking URL
   */
  getEmergencyMessageText(liveTrackingUrl = null) {
    let locStr = 'Current location could not be determined.';
    let liveUrlStr = '';

    if (this.currentLocation) {
      const lat = this.currentLocation.latitude;
      const lng = this.currentLocation.longitude;
      locStr = `Lat: ${lat}, Lng: ${lng}`;
    }

    const liveUrl = liveTrackingUrl || (this.activeLiveSession ? liveSosSessionStore.getLiveTrackingUrl(this.activeLiveSession.id) : '');
    if (liveUrl) {
      liveUrlStr = `\n\nLive GPS Tracking:\n${liveUrl}`;
    }

    return `SAFE ROUTE EMERGENCY ALERT\n\nI may be in an emergency situation.\n\nMy current location:\n${locStr}${liveUrlStr}\n\nTime:\n${this.sosTimestamp || new Date().toLocaleString()}\n\nPlease contact me immediately.`;
  }

  /**
   * Executes emergency call for specified contact or primary contact
   */
  async callContact(contactId) {
    const contact = this.contacts.find(c => c.id === contactId) || this.getPrimaryContact();
    if (!contact || !contact.phone) {
      return { success: false, error: 'No phone number available.' };
    }

    const res = await platformEmergencyBridge.executeCall(contact.phone);
    contact.callStatus = res.status;
    this.onContactsChange(this.contacts);
    return res;
  }

  /**
   * Dispatches emergency SMS / Share for specified contact or all contacts
   */
  async sendMessageToContact(contactId) {
    const contact = this.contacts.find(c => c.id === contactId) || this.getPrimaryContact();
    if (!contact || !contact.phone) {
      return { success: false, error: 'No phone number available.' };
    }

    const messageText = this.getEmergencyMessageText();
    const res = await platformEmergencyBridge.executeSms(contact.phone, messageText);
    contact.messageStatus = res.status;
    this.onContactsChange(this.contacts);
    return res;
  }

  /**
   * Dispatches emergency alert to ALL contacts via Web Share / SMS
   */
  async shareEmergencyAlertWithAll() {
    const messageText = this.getEmergencyMessageText();
    const primary = this.getPrimaryContact();
    const phone = primary ? primary.phone : '';

    const res = await platformEmergencyBridge.executeSms(phone, messageText);
    this.contacts.forEach(c => c.messageStatus = res.status);
    this.onContactsChange(this.contacts);
    return res;
  }

  /**
   * Dismisses active SOS and terminates live location session
   */
  stopSOS() {
    if (this.watchPositionId !== null) {
      navigator.geolocation.clearWatch(this.watchPositionId);
      this.watchPositionId = null;
    }

    if (this.activeLiveSession) {
      liveSosSessionStore.terminateSession(this.activeLiveSession.id);
      this.activeLiveSession = null;
    }

    this.state = SOS_STATUS.INACTIVE;
    this.onStateChange(this.state, { stopped: true });
  }
}
