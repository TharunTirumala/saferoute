// SafeRoute: Central Emergency SOS Call & Message System
// Manages Emergency Contacts, 5-Second Countdown, Live GPS Location, and Native Call/SMS Dispatch

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

    this.state = SOS_STATUS.INACTIVE;
    this.triggerSource = 'Manual Button';
    this.countdownTimer = null;
    this.countdownSeconds = 5;
    
    this.currentLocation = null;
    this.locationError = null;
    this.sosTimestamp = null;

    this.contacts = this.loadContacts();
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
      this.onContactsChange(this.contacts);
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
   * ONE CENTRAL SOS FUNCTION
   * Activates emergency state, fetches real-time GPS coordinates, and prepares contact actions
   */
  async activateSOS(source = this.triggerSource) {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }

    this.state = SOS_STATUS.ACTIVE;
    this.triggerSource = source;
    this.sosTimestamp = new Date().toLocaleString();
    this.currentLocation = null;
    this.locationError = null;

    // Reset per-contact action statuses for this SOS session
    this.contacts.forEach(c => {
      c.callStatus = 'Not Started';
      c.messageStatus = 'Not Started';
    });

    this.onStateChange(this.state, {
      source: this.triggerSource,
      timestamp: this.sosTimestamp,
      contacts: this.contacts
    });

    // Obtain Genuine Live GPS Location
    await this.fetchCurrentLocation();
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
          if (err.code === 1) errMsg = 'Location permission denied by user.';
          else if (err.code === 2) errMsg = 'Current location could not be determined.';
          else if (err.code === 3) errMsg = 'Location request timed out.';
          
          this.locationError = errMsg;
          this.onLocationUpdate(null, this.locationError);
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
      );
    });
  }

  /**
   * Generates standard plain-text emergency message payload
   */
  getEmergencyMessageText() {
    let locStr = 'Current location could not be determined.';
    if (this.currentLocation) {
      const lat = this.currentLocation.latitude;
      const lng = this.currentLocation.longitude;
      locStr = `Lat: ${lat}, Lng: ${lng}\nMap: https://maps.google.com/?q=${lat},${lng}`;
    }

    return `SafeRoute Emergency Alert\n\nI may be in an emergency situation.\nPlease contact me immediately.\n\nCurrent location:\n${locStr}\n\nTime:\n${this.sosTimestamp || new Date().toLocaleString()}`;
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
      // Standard mobile SMS uri format (handles Android & iOS parameter variations)
      const smsUri = `sms:${cleanNumber}?body=${encodedBody}`;
      
      contact.messageStatus = 'Prepared (SMS App Opened)';
      this.onContactsChange(this.contacts);

      window.location.href = smsUri;
      return { success: true, status: 'SMS application opened with pre-filled emergency alert' };
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
          title: '🚨 SafeRoute Emergency Alert',
          text: messageText
        });
        this.contacts.forEach(c => c.messageStatus = 'Shared');
        this.onContactsChange(this.contacts);
        return { success: true, status: 'Emergency alert shared via system share menu.' };
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
   * Dismisses active SOS and returns to normal state
   */
  stopSOS() {
    this.state = SOS_STATUS.INACTIVE;
    this.onStateChange(this.state, { stopped: true });
  }
}
