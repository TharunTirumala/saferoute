// SafeRoute: Authoritative Multi-Tenant User Store
// ONE VERIFIED MOBILE NUMBER = ONE USER ACCOUNT = ONE SYSTEM NUMBER
// Each mobile number requires OTP verification ONLY ONCE.

import { normalizePhoneNumber, formatDisplayPhone } from './phoneUtils.js';

const USERS_DB_KEY = 'saferoute_users_db_v4';
const CONTACTS_DB_KEY = 'saferoute_contacts_db_v4';
const SOS_HISTORY_DB_KEY = 'saferoute_sos_history_v4';

export class UserStore {
  constructor() {}

  generateUserId(phone) {
    const cleanDigits = (phone || '').replace(/[^0-9]/g, '');
    return `usr_${cleanDigits}`;
  }

  getUsers() {
    try {
      const saved = localStorage.getItem(USERS_DB_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  }

  saveUsers(users) {
    try {
      localStorage.setItem(USERS_DB_KEY, JSON.stringify(users));
    } catch (e) {}
  }

  isUserVerified(mobileNumber) {
    if (!mobileNumber) return false;
    const normPhone = normalizePhoneNumber(mobileNumber);
    const userId = this.generateUserId(normPhone);
    const users = this.getUsers();
    return !!(users[userId] && users[userId].isVerified);
  }

  markUserVerified(mobileNumber) {
    const normPhone = normalizePhoneNumber(mobileNumber);
    const userId = this.generateUserId(normPhone);
    const users = this.getUsers();
    
    if (!users[userId]) {
      users[userId] = {
        id: userId,
        userId: userId,
        systemNumber: normPhone,
        mobileNumber: normPhone,
        isVerified: true,
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString()
      };
    } else {
      users[userId].isVerified = true;
      users[userId].lastLoginAt = new Date().toISOString();
      users[userId].systemNumber = normPhone;
    }

    this.saveUsers(users);
    return users[userId];
  }

  getOrCreateUser(mobileNumber) {
    const normPhone = normalizePhoneNumber(mobileNumber);
    const userId = this.generateUserId(normPhone);
    const users = this.getUsers();
    
    if (!users[userId]) {
      users[userId] = {
        id: userId,
        userId: userId,
        systemNumber: normPhone,
        mobileNumber: normPhone,
        isVerified: false,
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString()
      };
    } else {
      users[userId].lastLoginAt = new Date().toISOString();
      users[userId].systemNumber = normPhone;
    }

    this.saveUsers(users);
    return users[userId];
  }

  getUserBySystemNumber(systemNumber) {
    const normPhone = normalizePhoneNumber(systemNumber);
    const userId = this.generateUserId(normPhone);
    const users = this.getUsers();
    return users[userId] || null;
  }

  getUserContacts(systemNumberOrUserId) {
    if (!systemNumberOrUserId) return [];
    const userId = systemNumberOrUserId.startsWith('usr_') 
      ? systemNumberOrUserId 
      : this.generateUserId(systemNumberOrUserId);

    try {
      const saved = localStorage.getItem(`${CONTACTS_DB_KEY}_${userId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.map(c => ({
            ...c,
            contactNumber: normalizePhoneNumber(c.contactNumber || c.phone)
          }));
        }
      }
    } catch (e) {
      console.warn('Failed to load user contacts:', e);
    }
    return [];
  }

  saveUserContacts(systemNumberOrUserId, contacts) {
    if (!systemNumberOrUserId) return false;
    const userId = systemNumberOrUserId.startsWith('usr_') 
      ? systemNumberOrUserId 
      : this.generateUserId(systemNumberOrUserId);
    
    const systemNumber = normalizePhoneNumber(systemNumberOrUserId.replace('usr_', ''));

    try {
      const sanitized = (contacts || []).map((c, idx) => {
        const norm = normalizePhoneNumber(c.contactNumber || c.phone || '');
        return {
          contactId: c.contactId || c.id || `cnt_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 4)}`,
          userId,
          systemNumber,
          contactName: (c.contactName || c.name || 'Emergency Contact').trim(),
          contactNumber: norm,
          relation: (c.relation || 'Contact').trim(),
          isPrimary: !!c.isPrimary
        };
      });

      if (sanitized.length > 0 && !sanitized.some(c => c.isPrimary)) {
        sanitized[0].isPrimary = true;
      }

      localStorage.setItem(`${CONTACTS_DB_KEY}_${userId}`, JSON.stringify(sanitized));
      return true;
    } catch (e) {
      console.warn('Failed to save user contacts:', e);
      return false;
    }
  }

  getSosHistory(systemNumberOrUserId) {
    if (!systemNumberOrUserId) return [];
    const userId = systemNumberOrUserId.startsWith('usr_') 
      ? systemNumberOrUserId 
      : this.generateUserId(systemNumberOrUserId);

    try {
      const saved = localStorage.getItem(`${SOS_HISTORY_DB_KEY}_${userId}`);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  }

  logSosEvent(systemNumberOrUserId, eventData) {
    if (!systemNumberOrUserId) return null;
    const userId = systemNumberOrUserId.startsWith('usr_') 
      ? systemNumberOrUserId 
      : this.generateUserId(systemNumberOrUserId);
    
    const history = this.getSosHistory(userId);
    const newRecord = {
      id: eventData.id || `sos_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      userId,
      systemNumber: normalizePhoneNumber(systemNumberOrUserId.replace('usr_', '')),
      timestamp: eventData.timestamp || new Date().toLocaleTimeString(),
      date: new Date().toISOString(),
      location: eventData.location || null,
      triggerSource: eventData.triggerSource || 'Manual Button',
      contactsNotified: eventData.contactsNotified || [],
      status: eventData.status || 'ACTIVE'
    };

    history.unshift(newRecord);
    try {
      localStorage.setItem(`${SOS_HISTORY_DB_KEY}_${userId}`, JSON.stringify(history.slice(0, 50)));
    } catch (e) {}
    return newRecord;
  }
}

export const userStore = new UserStore();
