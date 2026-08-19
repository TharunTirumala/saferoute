// SafeRoute: Central Emergency SOS Call & Message System
// With Pre-Authorized Permissions, 1-Tap SOS Execution, and Continuous Live Location Tracking

import { liveSosSessionStore } from './liveSosSessionStore.js';

export const SOS_STATUS = {
  INACTIVE: 'SOS INACTIVE',
  COUNTDOWN: 'SOS COUNTDOWN',
  ACTIVE: 'SOS ACTIVE',
  LOCATION_DETECTED: 'LOCATION DETECTED',
  LOCATION_UNAVAILABLE: 'LOCATION UNAVAILABLE',
  CALL_STARTED: 'CALL STARTED',
  CALL_FAILED: 'CALL FAILED',
  MESSAGE_SENT: 'MESSAGE SENT',
  MESSAGE_PREPARED: 'SMS APP OPENED',
  MESSAGE_FAILED: 'MESSAGE FAILED'
};

const DEFAULT_CONTACTS = [
  { id: 'c1', name: 'Mother', phone: '+919876543210', relation: 'Family', isPrimary: true, callStatus: 'Not Started', messageStatus: 'Not Started' },
  { id: 'c2', name: 'Friend', phone: '+919123456789', relation: 'Friend', isPrimary: false, callStatus: 'Not Started', messageStatus: 'Not Started' }
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
      location: 'unknown', // 'granted' | 'prompt' | 'denied' | 'unsupported'
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
            callStatus: 'Not Started',
            messageStatus: 'Not Started'
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
      callStatus: 'Not Started',
      messageStatus: 'Not Started'
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

  /**
   * Initializes periodic permission checking
   */
  async initPermissionMonitoring() {
    await this.checkPermissionStatus();

    // Check on visibility change (e.g. user returns from browser/phone settings)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.checkPermissionStatus();
      }
    });

    // Background interval check every 12 seconds
    setInterval(() => {
      this.checkPermissionStatus();
    }, 12000);
  }

  /**
   * Checks current permission states via Permissions API and device capabilities
   */
  async checkPermissionStatus() {
    // 1. Check Geolocation
    if (!navigator.geolocation) {
      this.permissionState.location = 'unsupported';
    } else if (navigator.permissions && navigator.permissions.query) {
      try {
        const geoStatus = await navigator.permissions.query({ name: 'geolocation' });
        this.permissionState.location = geoStatus.state; // 'granted' | 'prompt' | 'denied'
        geoStatus.onchange = () => this.checkPermissionStatus();
      } catch (e) {
        // Fallback
        if (this.permissionState.location === 'unknown') {
          this.permissionState.location = 'prompt';
        }
      }
    }

    // 2. Check Microphone
    if (navigator.permissions && navigator.permissions.query) {
      try {
        const micStatus = await navigator.permissions.query({ name: 'microphone' });
        this.permissionState.microphone = micStatus.state;
        micStatus.onchange = () => this.checkPermissionStatus();
      } catch (e) {
        // Ignore if query not supported for microphone
      }
    }

    // 3. Check Notifications
    if ('Notification' in window) {
      this.permissionState.notifications = Notification.permission; // 'granted' | 'default' | 'denied'
    } else {
      this.permissionState.notifications = 'unsupported';
    }

    this.permissionState.contactsConfigured = this.contacts.length > 0;
    this.permissionState.hasPrimaryContact = this.contacts.some(c => c.isPrimary);

    return this.checkReadiness();
  }

  /**
   * Evaluates if Emergency SOS is fully configured and READY
   */
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
      phoneSupport: true,
      smsSupport: true,
      liveTrackingSupport: true
    };

    this.onReadinessChange(isReady, report);
    return report;
  }

  /**
   * Requests Location Pre-Authorization during Setup
   */
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

  /**
   * Requests Microphone Pre-Authorization during Setup
   */
  async requestMicrophonePreAuthorization() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return { success: false, error: 'Microphone access is not supported by your browser.' };
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Release tracks immediately
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

  /**
   * Requests Notification Pre-Authorization during Setup
   */
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

  // ================= 1-TAP EMERGENCY SOS EXECUTION =================

  /**
   * Initiates 5-Second False-Activation-Prevention Countdown
   * Triggered by Manual SOS Button OR Voice Trigger
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
   * ONE CENTRAL ONE-TAP SOS FUNCTION
   * Immediate activation: Real-time GPS, Live Tracking Session, Call & SMS flow with zero permission interruptions
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

    // Reset per-contact action statuses for this SOS session
    this.contacts.forEach(c => {
      c.callStatus = 'Not Started';
      c.messageStatus = 'Not Started';
    });

    // 1. Obtain Instant GPS Fix
    const initialCoords = await this.fetchCurrentLocation();

    // 2. Initialize Secure Live Location Tracking Session
    this.activeLiveSession = liveSosSessionStore.createSession(initialCoords, this.triggerSource);

    // 3. Start Continuous Background/Live Location Tracking
    this.startLiveLocationTracking();

    this.onStateChange(this.state, {
      source: this.triggerSource,
      timestamp: this.sosTimestamp,
      contacts: this.contacts,
      session: this.activeLiveSession,
      liveUrl: liveSosSessionStore.getLiveTrackingUrl(this.activeLiveSession.id)
    });
  }

  /**
   * Queries real browser/device Geolocation API (Pre-authorized, instant)
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
   * Updates breadcrumb coordinates in the active SOS session as the user moves
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
   * Generates standard plain-text emergency message payload with Secure Live Tracking URL
   */
  getEmergencyMessageText() {
    let locStr = 'Current location could not be determined.';
    let liveUrlStr = '';

    if (this.currentLocation) {
      const lat = this.currentLocation.latitude;
      const lng = this.currentLocation.longitude;
      locStr = `Lat: ${lat}, Lng: ${lng}\nMap: https://maps.google.com/?q=${lat},${lng}`;
    }

    if (this.activeLiveSession) {
      const liveUrl = liveSosSessionStore.getLiveTrackingUrl(this.activeLiveSession.id);
      liveUrlStr = `\n\nLive GPS Tracking:\n${liveUrl}`;
    }

    return `SafeRoute Emergency Alert\n\nI may be in an emergency situation.\nPlease contact me immediately.\n\nCurrent Location:\n${locStr}${liveUrlStr}\n\nTime:\n${this.sosTimestamp || new Date().toLocaleString()}`;
  }

  /**
   * Calls emergency contact using mobile 'tel:' protocol
   */
  callContact(contactId) {
    const contact = this.contacts.find(c => c.id === contactId) || this.getPrimaryContact();
    if (!contact || !contact.phone) {
      return { success: false, error: 'No phone number available for contact.' };
    }

    const cleanNumber = contact.phone.replace(/[^0-9+]/g, '');
    if (!cleanNumber) {
      contact.callStatus = 'Failed (Invalid Number)';
      this.onContactsChange(this.contacts);
      return { success: false, error: 'Invalid phone number format.' };
    }

    try {
      contact.callStatus = 'Started (Dialer Opened)';
      this.onContactsChange(this.contacts);
      window.location.href = `tel:${cleanNumber}`;
      return { success: true, status: 'Call action initiated' };
    } catch (e) {
      console.warn('Call launch error:', e);
      contact.callStatus = 'Failed to open dialer';
      this.onContactsChange(this.contacts);
      return { success: false, error: 'Unable to start emergency call.' };
    }
  }

  /**
   * Sends emergency SMS via mobile 'sms:' protocol or Web Share API
   */
  async sendMessageToContact(contactId) {
    const contact = this.contacts.find(c => c.id === contactId) || this.getPrimaryContact();
    if (!contact || !contact.phone) {
      return { success: false, error: 'No phone number available for contact.' };
    }

    const messageText = this.getEmergencyMessageText();
    const cleanNumber = contact.phone.replace(/[^0-9+]/g, '');

    try {
      const encodedBody = encodeURIComponent(messageText);
      const smsUri = `sms:${cleanNumber}?body=${encodedBody}`;
      
      contact.messageStatus = 'Prepared (SMS App Opened)';
      this.onContactsChange(this.contacts);

      window.location.href = smsUri;
      return { success: true, status: 'SMS application opened with pre-filled emergency alert & live tracking link' };
    } catch (err) {
      console.warn('SMS dispatch error:', err);
      contact.messageStatus = 'Failed';
      this.onContactsChange(this.contacts);
      return { success: false, error: 'Emergency message could not be sent.' };
    }
  }

  /**
   * Broadcast emergency alert using Web Share API or native SMS fallback
   */
  async shareEmergencyAlertWithAll() {
    const messageText = this.getEmergencyMessageText();

    if (navigator.share) {
      try {
        await navigator.share({
          title: '🚨 SafeRoute Emergency Alert & Live Location',
          text: messageText
        });
        this.contacts.forEach(c => c.messageStatus = 'Shared');
        this.onContactsChange(this.contacts);
        return { success: true, status: 'Emergency alert & live tracking shared via system share menu.' };
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.warn('Web share error:', err);
        }
      }
    }

    // Fallback to opening SMS with primary contact
    const primary = this.getPrimaryContact();
    if (primary) {
      return this.sendMessageToContact(primary.id);
    }
    return { success: false, error: 'No emergency contact configured.' };
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
