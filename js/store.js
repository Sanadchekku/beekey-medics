// Tiny persisted store. Everything lives in localStorage so the full
// patient → doctor → pharmacy → rider flow can be demoed in one browser.
// Swap these functions for API calls when the backend exists.

const KEY = 'beekey_medics_v1';

const initial = () => ({
  user: null,          // { id, name, phone, address, x, y }
  partner: null,       // { role: 'doctor'|'lab'|'shop'|'delivery', id }
  cart: [],            // [{ id, qty }]
  orders: [],          // medicine orders
  appointments: [],    // doctor consults
  labBookings: [],     // lab tests
  applications: [],    // partner join requests
  network: null,       // { doctor:[], lab:[], shop:[], delivery:[] } — managed in the admin panel
  admin: false,        // admin session (demo)
  rxUploads: [],       // prescriptions uploaded from the home page
  reviews: [],         // ratings written by patients
  reminders: [],       // medicine reminders
  theme: null,
});

let state;
try {
  state = { ...initial(), ...JSON.parse(localStorage.getItem(KEY) || '{}') };
} catch {
  state = initial();
}

const listeners = new Set();

export const store = {
  get: () => state,
  set(patch) {
    state = { ...state, ...(typeof patch === 'function' ? patch(state) : patch) };
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* storage full or blocked */ }
    listeners.forEach((fn) => fn(state));
  },
  subscribe: (fn) => (listeners.add(fn), () => listeners.delete(fn)),
  reload() {
    try { state = { ...initial(), ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { /* keep current */ }
    listeners.forEach((fn) => fn(state));
  },
  reset() { const theme = state.theme; state = { ...initial(), theme }; this.set({}); },
};

/* Customer profiles, keyed by mobile number. Kept outside the main state so a phone that
   logs in again (or a doctor sending a prescription) finds the saved profile and address.
   js/db.js mirrors this to the `customers` table when the cloud database is connected. */
const USERS_KEY = 'beekey_users';
const userListeners = new Set();
export const customers = {
  all() { try { return JSON.parse(localStorage.getItem(USERS_KEY) || '{}'); } catch { return {}; } },
  get(phone) { return this.all()[phone] || null; },
  save(user, { silent = false } = {}) {
    const all = this.all(); all[user.phone] = user;
    try { localStorage.setItem(USERS_KEY, JSON.stringify(all)); } catch { /* storage blocked */ }
    if (!silent) userListeners.forEach((fn) => fn(user));
  },
  replaceAll(map) { try { localStorage.setItem(USERS_KEY, JSON.stringify(map)); } catch { /* storage blocked */ } },
  clear() { try { localStorage.removeItem(USERS_KEY); } catch { /* ignore */ } },
  onSave: (fn) => (userListeners.add(fn), () => userListeners.delete(fn)),
};

export const uid = (prefix) => `${prefix}${Date.now().toString(36).slice(-5)}${Math.random().toString(36).slice(2, 5)}`.toUpperCase();

export const now = () => new Date().toISOString();
