// SafeRoute: User & Scoped Emergency Contacts Store
// Enforces strict multi-tenant user isolation: Contacts are keyed strictly to authenticated userId

const USERS_DB_KEY = 'saferoute_users_db_v1';
const CONTACTS_DB_KEY = 'saferoute_contacts_db_v1';

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
    const userId = this.generateUserId(mobileNumber);
    const users = this.getUsers();
    
    if (!users[userId]) {
      users[userId] = {
        userId,
        mobileNumber,
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString()
      };
      this.saveUsers(users);
    } else {
      users[userId].lastLoginAt = new Date().toISOString();
      this.saveUsers(users);
    }

    return users[userId];
  }

  getUserContacts(userId) {
    if (!userId) return [];
    try {
      const saved = localStorage.getItem(`${CONTACTS_DB_KEY}_${userId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to load user contacts:', e);
    }

    // Default template contacts for newly registered user
    const defaultContacts = [
      {
        contactId: `cnt_${Date.now()}_1`,
        userId,
        contactName: 'Emergency Contact 1',
        contactNumber: '+91 98765 43210',
        relation: 'Family',
        isPrimary: true
      },
      {
        contactId: `cnt_${Date.now()}_2`,
        userId,
        contactName: 'Emergency Contact 2',
        contactNumber: '+91 91234 56789',
        relation: 'Friend',
        isPrimary: false
      }
    ];

    this.saveUserContacts(userId, defaultContacts);
    return defaultContacts;
  }

  saveUserContacts(userId, contacts) {
    if (!userId) return false;
    try {
      const sanitized = (contacts || []).map(c => ({
        contactId: c.contactId || c.id || `cnt_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        userId,
        contactName: (c.contactName || c.name || '').trim(),
        contactNumber: (c.contactNumber || c.phone || '').trim(),
        relation: (c.relation || 'Contact').trim(),
        isPrimary: !!c.isPrimary
      }));
      localStorage.setItem(`${CONTACTS_DB_KEY}_${userId}`, JSON.stringify(sanitized));
      return true;
    } catch (e) {
      console.warn('Failed to save user contacts:', e);
      return false;
    }
  }
}

export const userStore = new UserStore();
