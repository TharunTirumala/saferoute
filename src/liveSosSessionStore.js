// SafeRoute: Secure Live SOS Location Session Store
// Generates unguessable SOS tracking sessions with real-time GPS breadcrumb tracking and expiry management

export class LiveSosSessionStore {
  constructor() {
    this.storageKey = 'saferoute_live_sos_sessions_v1';
    this.activeSessionId = null;
    this.watchId = null;
    this.updateListeners = [];
    this.broadcastChannel = null;

    if (typeof BroadcastChannel !== 'undefined') {
      try {
        this.broadcastChannel = new BroadcastChannel('saferoute_sos_live_channel');
        this.broadcastChannel.onmessage = (event) => {
          if (event.data && event.data.type === 'LOCATION_UPDATE') {
            this.notifyListeners(event.data.session);
          }
        };
      } catch (e) {
        console.warn('BroadcastChannel not supported', e);
      }
    }
  }

  /**
   * Generates a cryptographically strong, unguessable session token
   */
  generateSessionId() {
    const array = new Uint8Array(16);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(array);
    } else {
      for (let i = 0; i < 16; i++) array[i] = Math.floor(Math.random() * 256);
    }
    const hex = Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
    return `sos_live_${Date.now()}_${hex}`;
  }

  /**
   * Creates a new active SOS live tracking session
   */
  createSession(initialCoords = null, triggerSource = 'Emergency Button') {
    const sessionId = this.generateSessionId();
    const session = {
      id: sessionId,
      status: 'ACTIVE',
      startTime: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      triggerSource,
      initialCoords: initialCoords ? { ...initialCoords } : null,
      currentCoords: initialCoords ? { ...initialCoords } : null,
      breadcrumbs: initialCoords ? [{ ...initialCoords, timestamp: new Date().toISOString() }] : []
    };

    this.activeSessionId = sessionId;
    this.saveSession(session);
    return session;
  }

  /**
   * Saves or updates a session in localStorage
   */
  saveSession(session) {
    try {
      const all = this.getAllSessions();
      all[session.id] = session;
      localStorage.setItem(this.storageKey, JSON.stringify(all));
      
      if (this.broadcastChannel) {
        this.broadcastChannel.postMessage({ type: 'LOCATION_UPDATE', session });
      }
      this.notifyListeners(session);
    } catch (e) {
      console.warn('Failed to save SOS session', e);
    }
  }

  getAllSessions() {
    try {
      const data = localStorage.getItem(this.storageKey);
      return data ? JSON.parse(data) : {};
    } catch (e) {
      return {};
    }
  }

  getSession(sessionId) {
    if (!sessionId) return null;
    const all = this.getAllSessions();
    return all[sessionId] || null;
  }

  /**
   * Appends new live GPS coordinate fix to active session
   */
  appendLiveCoordinate(sessionId, coords) {
    const session = this.getSession(sessionId);
    if (!session || session.status !== 'ACTIVE') return null;

    const fix = {
      latitude: coords.latitude,
      longitude: coords.longitude,
      accuracy: coords.accuracy || 10,
      heading: coords.heading || null,
      speed: coords.speed || null,
      timestamp: new Date().toISOString()
    };

    session.currentCoords = fix;
    session.lastUpdated = fix.timestamp;
    session.breadcrumbs.push(fix);

    // Keep last 100 breadcrumbs to optimize storage
    if (session.breadcrumbs.length > 100) {
      session.breadcrumbs.shift();
    }

    this.saveSession(session);
    return session;
  }

  /**
   * Terminates/Expires active SOS tracking session
   */
  terminateSession(sessionId = this.activeSessionId) {
    if (!sessionId) return;
    const session = this.getSession(sessionId);
    if (session) {
      session.status = 'TERMINATED';
      session.endTime = new Date().toISOString();
      this.saveSession(session);
    }
    if (this.activeSessionId === sessionId) {
      this.activeSessionId = null;
    }
  }

  /**
   * Builds the live tracking URL for emergency contacts
   */
  getLiveTrackingUrl(sessionId) {
    if (!sessionId) return '';
    const base = window.location.origin + window.location.pathname;
    return `${base}?sos_session=${encodeURIComponent(sessionId)}`;
  }

  onSessionUpdate(callback) {
    if (typeof callback === 'function') {
      this.updateListeners.push(callback);
    }
  }

  notifyListeners(session) {
    this.updateListeners.forEach(fn => {
      try { fn(session); } catch (err) { console.warn(err); }
    });
  }
}

export const liveSosSessionStore = new LiveSosSessionStore();
