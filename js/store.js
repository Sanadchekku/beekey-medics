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

export const uid = (prefix) => `${prefix}${Date.now().toString(36).slice(-5)}${Math.random().toString(36).slice(2, 5)}`.toUpperCase();

export const now = () => new Date().toISOString();
