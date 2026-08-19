// SafeRoute: Authoritative User & Scoped Emergency Contacts Store
// Zero hardcoded numbers. Contacts belong strictly to the authenticated user.

import { normalizePhoneNumber, formatDisplayPhone } from './phoneUtils.js';

const USERS_DB_KEY = 'saferoute_users_db_v2';
const CONTACTS_DB_KEY = 'saferoute_contacts_db_v2';

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

  getOrCreateUser(mobileNumber) {
    const normPhone = normalizePhoneNumber(mobileNumber);
    const userId = this.generateUserId(normPhone);
    const users = this.getUsers();
    
    if (!users[userId]) {
      users[userId] = {
        userId,
        mobileNumber: normPhone,
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString()
      };
    } else {
      users[userId].lastLoginAt = new Date().toISOString();
    }

    this.saveUsers(users);
    return users[userId];
  }

  getUserContacts(userId) {
    if (!userId) return [];
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

  saveUserContacts(userId, contacts) {
    if (!userId) return false;
    try {
      const sanitized = (contacts || []).map((c, idx) => {
        const norm = normalizePhoneNumber(c.contactNumber || c.phone || '');
        return {
          contactId: c.contactId || c.id || `cnt_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 4)}`,
          userId,
          contactName: (c.contactName || c.name || 'Emergency Contact').trim(),
          contactNumber: norm,
          relation: (c.relation || 'Contact').trim(),
          isPrimary: !!c.isPrimary
        };
      });

      // Ensure exactly one contact is primary if any exist
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
}

export const userStore = new UserStore();
