import { userStore } from './userStore.js';
// SafeRoute: Authentication & User Session Service
// Manages Mobile Number + OTP Verification, Client Session Tokens & WhatsApp SOS User Identity

const AUTH_STORAGE_KEY = 'saferoute_auth_session_v1';

export class AuthService {
  constructor() {
    this.currentUser = this.loadSession();
    this.activeChallenge = null;
  }

  loadSession() {
    try {
      const saved = localStorage.getItem(AUTH_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.phone) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to parse auth session:', e);
    }
    return null;
  }

  saveSession(user) {
    this.currentUser = user;
    try {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    } catch (e) {
      console.warn('Failed to save auth session:', e);
    }
  }

  isAuthenticated() {
    return !!(this.currentUser && this.currentUser.phone);
  }

  getAuthenticatedUser() {
    return this.currentUser;
  }

  getFormattedPhone() {
    if (!this.currentUser || !this.currentUser.phone) return '';
    const digits = this.currentUser.phone.replace(/[^0-9]/g, '');
    if (digits.length === 12 && digits.startsWith('91')) {
      return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
    }
    return this.currentUser.phone;
  }

  logout() {
    this.currentUser = null;
    this.activeChallenge = null;
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    } catch (e) {}
  }

  /**
   * Sends OTP to given 10-digit mobile number
   */
  async sendOtp(phoneInput) {
    const cleanDigits = (phoneInput || '').replace(/[^0-9]/g, '');
    if (cleanDigits.length !== 10) {
      return { success: false, error: 'Please enter a valid 10-digit mobile number.' };
    }

    const formattedPhone = `+91${cleanDigits}`;

    try {
      // 1. Attempt Serverless /api/auth/send-otp
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: formattedPhone })
      });

      if (res.ok) {
        const data = await res.json();
        this.activeChallenge = {
          phone: formattedPhone,
          challengeToken: data.challengeToken,
          devOtp: data.devOtp,
          expiresAt: data.expiresAt
        };
        return {
          success: true,
          phone: formattedPhone,
          devOtp: data.devOtp
        };
      }
    } catch (netErr) {
      console.info('Using client cryptographic OTP fallback:', netErr.message);
    }

    // 2. Client Cryptographic Fallback (for static preview / dev environment without serverless runner)
    const cryptoOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000;
    
    this.activeChallenge = {
      phone: formattedPhone,
      clientOtp: cryptoOtp,
      expiresAt
    };

    console.log(`[SafeRoute Client Auth] Generated OTP for ${formattedPhone}: ${cryptoOtp}`);

    return {
      success: true,
      phone: formattedPhone,
      devOtp: cryptoOtp
    };
  }

  /**
   * Verifies 6-digit OTP against active challenge
   */
  async verifyOtp(phoneInput, otpInput) {
    const cleanDigits = (phoneInput || '').replace(/[^0-9]/g, '');
    const cleanOtp = (otpInput || '').trim();
    const formattedPhone = cleanDigits.length === 10 ? `+91${cleanDigits}` : `+${cleanDigits}`;

    if (cleanOtp.length !== 6) {
      return { success: false, error: 'Please enter all 6 digits of the OTP code.' };
    }

    if (!this.activeChallenge) {
      return { success: false, error: 'No active OTP session found. Please request a new OTP.' };
    }

    if (Date.now() > this.activeChallenge.expiresAt) {
      return { success: false, error: 'OTP has expired. Please click Resend OTP.' };
    }

    try {
      // 1. Attempt Serverless /api/auth/verify-otp
      if (this.activeChallenge.challengeToken) {
        const res = await fetch('/api/auth/verify-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: formattedPhone,
            otp: cleanOtp,
            challengeToken: this.activeChallenge.challengeToken
          })
        });

        if (res.ok) {
          const data = await res.json();
          const userRecord = userStore.getOrCreateUser(formattedPhone);
          this.saveSession({
            userId: userRecord.userId,
            phone: formattedPhone,
            mobileNumber: formattedPhone,
            sessionToken: data.sessionToken,
            authenticatedAt: data.user?.authenticatedAt || new Date().toISOString()
          });
          return { success: true, user: this.currentUser };
        } else {
          const errData = await res.json().catch(() => ({}));
          return { success: false, error: errData.error || 'Incorrect OTP code. Please check and re-enter.' };
        }
      }
    } catch (netErr) {
      console.info('Using client OTP verification fallback:', netErr.message);
    }

    // 2. Client Fallback Verification
    if (this.activeChallenge.clientOtp && this.activeChallenge.clientOtp === cleanOtp) {
      const userRecord = userStore.getOrCreateUser(formattedPhone);
      this.saveSession({
        userId: userRecord.userId,
        phone: formattedPhone,
        mobileNumber: formattedPhone,
        sessionToken: `sess_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        authenticatedAt: new Date().toISOString()
      });
      return { success: true, user: this.currentUser };
    }

    return { success: false, error: 'Incorrect OTP code. Please check and re-enter.' };
  }
}

export const authService = new AuthService();
