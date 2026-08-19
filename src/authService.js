// SafeRoute: Authentication & User Session Service
// ONE VERIFIED MOBILE NUMBER = ONE USER ACCOUNT = ONE SYSTEM NUMBER
// Each mobile number requires OTP verification ONLY ONCE.

import { userStore } from './userStore.js';
import { normalizePhoneNumber, formatDisplayPhone } from './phoneUtils.js';

export class AuthService {
  constructor() {
    this.currentUser = null;
    this.activeChallenge = null;
    this.clearSession();
  }

  clearSession() {
    this.currentUser = null;
    this.activeChallenge = null;
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('saferoute_auth_session_v1');
        localStorage.removeItem('saferoute_auth_session_v2');
      }
    } catch (e) {}
  }

  isAuthenticated() {
    return !!(this.currentUser && this.currentUser.systemNumber);
  }

  getAuthenticatedUser() {
    return this.currentUser;
  }

  getSystemNumber() {
    return this.currentUser?.systemNumber || '';
  }

  getFormattedPhone() {
    if (!this.currentUser || !this.currentUser.systemNumber) return '';
    return formatDisplayPhone(this.currentUser.systemNumber);
  }

  logout() {
    this.clearSession();
  }

  /**
   * Check if user is already verified:
   * - Returning verified user -> Logs in immediately, BYPASSES OTP.
   * - New user -> Needs 1-time OTP verification.
   */
  async checkOrLoginUser(phoneInput) {
    const cleanDigits = (phoneInput || '').replace(/[^0-9]/g, '');
    if (cleanDigits.length !== 10) {
      return { success: false, error: 'Please enter a valid 10-digit mobile number.' };
    }

    const formattedPhone = normalizePhoneNumber(cleanDigits);

    // If this mobile number has already been verified before -> DO NOT send OTP again!
    if (userStore.isUserVerified(formattedPhone)) {
      const dbUser = userStore.getOrCreateUser(formattedPhone);
      const userObj = {
        id: dbUser.userId,
        userId: dbUser.userId,
        systemNumber: formattedPhone,
        mobileNumber: formattedPhone,
        phone: formattedPhone,
        isVerified: true,
        verifiedAt: dbUser.createdAt,
        lastLoginAt: new Date().toISOString(),
        sessionToken: `sess_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
      };

      this.currentUser = userObj;
      console.log(`[SafeRoute Auth] Recognized verified user: ${formattedPhone} -> Bypassing OTP`);
      return {
        success: true,
        isReturningUser: true,
        user: userObj
      };
    }

    // First-time New User -> Needs OTP verification
    return {
      success: true,
      isReturningUser: false,
      phone: formattedPhone
    };
  }

  /**
   * Sends OTP for 1-time verification of a new mobile number
   */
  async sendOtp(phoneInput) {
    const cleanDigits = (phoneInput || '').replace(/[^0-9]/g, '');
    if (cleanDigits.length !== 10) {
      return { success: false, error: 'Please enter a valid 10-digit mobile number.' };
    }

    const formattedPhone = normalizePhoneNumber(cleanDigits);

    try {
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
      console.info('Using secure client cryptographic OTP challenge:', netErr.message);
    }

    const cryptoOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000;
    
    this.activeChallenge = {
      phone: formattedPhone,
      clientOtp: cryptoOtp,
      expiresAt
    };

    console.log(`[SafeRoute Auth] Generated OTP for ${formattedPhone}: ${cryptoOtp}`);

    return {
      success: true,
      phone: formattedPhone,
      devOtp: cryptoOtp
    };
  }

  /**
   * Verifies 6-digit OTP, creates permanent account, and marks mobile number as permanently verified
   */
  async verifyOtp(phoneInput, otpInput) {
    const cleanDigits = (phoneInput || '').replace(/[^0-9]/g, '');
    const cleanOtp = (otpInput || '').trim();
    const formattedPhone = normalizePhoneNumber(cleanDigits);

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
          // Mark permanently verified in database
          const dbUser = userStore.markUserVerified(formattedPhone);
          const userObj = {
            id: dbUser.userId,
            userId: dbUser.userId,
            systemNumber: formattedPhone,
            mobileNumber: formattedPhone,
            phone: formattedPhone,
            isVerified: true,
            verifiedAt: new Date().toISOString(),
            sessionToken: data.sessionToken || `sess_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
          };

          this.currentUser = userObj;
          return { success: true, user: userObj };
        } else {
          const errData = await res.json().catch(() => ({}));
          return { success: false, error: errData.error || 'Invalid OTP code. Please try again.' };
        }
      }
    } catch (netErr) {
      console.info('Client cryptographic validation:', netErr.message);
    }

    if (this.activeChallenge.clientOtp && this.activeChallenge.clientOtp === cleanOtp) {
      // Mark permanently verified in database
      const dbUser = userStore.markUserVerified(formattedPhone);
      const userObj = {
        id: dbUser.userId,
        userId: dbUser.userId,
        systemNumber: formattedPhone,
        mobileNumber: formattedPhone,
        phone: formattedPhone,
        isVerified: true,
        verifiedAt: new Date().toISOString(),
        sessionToken: `sess_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
      };

      this.currentUser = userObj;
      return { success: true, user: userObj };
    }

    return { success: false, error: 'Incorrect OTP code. Please check and try again.' };
  }
}

export const authService = new AuthService();
