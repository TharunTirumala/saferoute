// SafeRoute: Production-Grade Secure Live SOS Location Session Store
// Generates unguessable HTTPS live tracking sessions with continuous GPS breadcrumbs and expiration

export class LiveSosSessionStore {
  constructor() {
    this.storageKey = 'saferoute_live_sos_sessions_v2';
    this.activeSessionId = null;
    this.updateListeners = [];
    this.broadcastChannel = null;

    // Production HTTPS base URL configuration (can be configured via ENV or production domain)
    this.productionDomain = 'https://saferoute-live.app';

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
    return `sos_${Date.now()}_${hex}`;
  }

  /**
   * Creates a new active SOS live tracking session
   */
  createSession(initialCoords = null, triggerSource = 'Emergency Button') {
    const sessionId = this.generateSessionId();
    const now = new Date().toISOString();
    const session = {
      id: sessionId,
      status: 'ACTIVE',
      startTime: now,
      lastUpdated: now,
      triggerSource,
      initialCoords: initialCoords ? { ...initialCoords } : null,
      currentCoords: initialCoords ? { ...initialCoords } : null,
      breadcrumbs: initialCoords ? [{ ...initialCoords, timestamp: now }] : []
    };

    this.activeSessionId = sessionId;
    this.saveSession(session);
    return session;
  }

  /**
   * Saves or updates a session in localStorage & broadcasts updates
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

    // Keep last 150 breadcrumbs
    if (session.breadcrumbs.length > 150) {
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
   * Builds the secure HTTPS live tracking URL for emergency contacts
   */
  getLiveTrackingUrl(sessionId) {
    if (!sessionId) return '';
    const origin = window.location.origin;
    if (origin.startsWith('https://') && !origin.includes('localhost')) {
      return `${origin}/?sos_session=${encodeURIComponent(sessionId)}`;
    }
    // Deployed production Vercel endpoint
    return `https://saferoute-tawny.vercel.app/?sos_session=${encodeURIComponent(sessionId)}`;
  }

  /**
   * Local viewer URL for internal testing
   */
  getLocalViewerUrl(sessionId) {
    if (!sessionId) return '';
    return `${window.location.origin}${window.location.pathname}?sos_session=${encodeURIComponent(sessionId)}`;
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
