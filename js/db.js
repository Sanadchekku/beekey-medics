// Cloud database sync (Supabase). Optional: with no keys in config.js the app stays in demo mode.
//
// How it works
// • On start: loads partners, customers, orders, consultations, lab bookings, applications,
//   reviews and prescription uploads from the database into the app's store.
// • When this device changes something (places an order, a shop accepts, admin verifies a
//   partner…) the changed records are upserted to the database.
// • Realtime: changes made on any other phone or browser arrive instantly and the page refreshes.
// • Rider GPS: live positions are shared through the rider_locations table.
//
// The store keeps exactly the same shape as before, so the rest of the app does not need to
// know whether it is talking to the cloud or running in demo mode.

import { CONFIG } from './config.js';
import { store, customers } from './store.js';

// state key in the store → table name
const SHARED = { orders: 'orders', appointments: 'appointments', labBookings: 'lab_bookings', applications: 'applications', reviews: 'reviews', rxUploads: 'rx_uploads' };
const KEY_OF = Object.fromEntries(Object.entries(SHARED).map(([k, t]) => [t, k]));
const CLIENT_JS = 'js/vendor/supabase-2.119.2.js';
const GPS_KEY = 'beekey_gps';

export const cloud = { on: false, error: null };
export const cloudConfigured = () => !!(CONFIG.supabaseUrl && CONFIG.supabaseAnonKey);

let sb = null, applying = false, onRemote = () => {};
const synced = new Map(); // "table:id" → stable JSON of the version the database has

/** JSON with sorted keys: Postgres jsonb reorders keys, so plain JSON.stringify can't compare versions. */
function stable(v) {
  if (Array.isArray(v)) return `[${v.map(stable).join(',')}]`;
  if (v && typeof v === 'object') return `{${Object.keys(v).sort().filter((k) => v[k] !== undefined).map((k) => `${JSON.stringify(k)}:${stable(v[k])}`).join(',')}}`;
  return JSON.stringify(v ?? null);
}

function loadClient() {
  if (window.supabase?.createClient) return Promise.resolve(window.supabase);
  return new Promise((res, rej) => {
    const s = Object.assign(document.createElement('script'), { src: CLIENT_JS, onload: () => res(window.supabase), onerror: () => rej(new Error('Could not load the database client')) });
    document.head.append(s);
  });
}

async function fetchAll(table, order = 'created_at') {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from(table).select('*').order(order, { ascending: true }).order(table === 'rider_locations' ? 'rider_id' : 'id').range(from, from + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    out.push(...data);
    if (data.length < 1000) return out;
  }
}

const ROLES = ['doctor', 'lab', 'shop', 'delivery'];
const partnerRows = (net) => ROLES.flatMap((role) => (net?.[role] || []).map((p) => ({ id: p.id, role, data: p })));
function rowsToNetwork(rows) {
  const net = Object.fromEntries(ROLES.map((r) => [r, []]));
  for (const r of rows) (net[r.role] ||= []).push(r.data);
  return net;
}

/* ───────── outgoing: push what changed on this device ───────── */
function diff(table, rows) {
  const changed = rows.filter((r) => r.id && synced.get(`${table}:${r.id}`) !== stable(r.data));
  if (!changed.length) return;
  changed.forEach((r) => synced.set(`${table}:${r.id}`, stable(r.data)));
  sb.from(table).upsert(changed).then(({ error }) => {
    if (!error) return;
    changed.forEach((r) => synced.delete(`${table}:${r.id}`)); // retry on the next change
    console.warn(`[db] could not save ${table}:`, error.message);
    window.dispatchEvent(new CustomEvent('beekey:db-error', { detail: error.message }));
  });
}
function push(state) {
  if (applying || !sb) return;
  diff('partners', partnerRows(state.network));
  for (const [key, table] of Object.entries(SHARED)) diff(table, (state[key] || []).map((d) => ({ id: d.id, data: d })));
}
function pushCustomer(user) {
  if (!sb || !user?.phone) return;
  diff('customers', [{ id: user.phone, data: user }]);
}

/* ───────── incoming: realtime changes from other devices ───────── */
function apply({ table, new: row }) {
  if (!row) return;
  if (table === 'rider_locations') return mirrorGps([row]);
  const id = row.id, json = stable(row.data);
  if (!id || synced.get(`${table}:${id}`) === json) return; // our own change coming back
  synced.set(`${table}:${id}`, json);
  if (table === 'customers') return customers.save(row.data, { silent: true });
  applying = true;
  try {
    if (table === 'partners') {
      const net = structuredClone(store.get().network || {});
      const list = (net[row.role] ||= []);
      const i = list.findIndex((p) => p.id === id);
      if (i >= 0) list[i] = row.data; else list.push(row.data);
      store.set({ network: net });
    } else if (KEY_OF[table]) {
      const k = KEY_OF[table], arr = [...(store.get()[k] || [])];
      const i = arr.findIndex((x) => x.id === id);
      if (i >= 0) arr[i] = row.data; else arr.push(row.data);
      store.set({ [k]: arr });
    }
  } finally { applying = false; }
  onRemote(table);
}

/* ───────── rider GPS ───────── */
function mirrorGps(rows) {
  let all = {};
  try { all = JSON.parse(localStorage.getItem(GPS_KEY) || '{}'); } catch { /* ignore */ }
  for (const r of rows) { if (r.data?.off) delete all[r.rider_id]; else all[r.rider_id] = r.data; }
  try { localStorage.setItem(GPS_KEY, JSON.stringify(all)); } catch { /* ignore */ }
  window.dispatchEvent(new Event('beekey:gps'));
}
const gpsLast = new Map();
/** Called by livemap.js for every GPS fix this device shares (throttled to one write per 3 s). */
export function pushGps(riderId, fix) {
  if (!sb) return;
  const t = Date.now();
  if (fix && t - (gpsLast.get(riderId) || 0) < 3000) return;
  gpsLast.set(riderId, t);
  sb.from('rider_locations').upsert({ rider_id: riderId, data: fix || { off: true, at: t } }).then(({ error }) => error && console.warn('[db] gps:', error.message));
}

/**
 * Connects to the cloud database if config.js has keys. Resolves true when connected.
 * @param seedNetwork  () => network   used once if the partners table is empty
 * @param migrate      (network) => bool   adds new seed partners (new branches)
 * @param onChange     (table) => void     re-render after remote changes
 */
export async function connectCloud({ seedNetwork, migrate, onChange }) {
  if (!cloudConfigured()) return false;
  try {
    const lib = await loadClient();
    sb = lib.createClient(CONFIG.supabaseUrl, CONFIG.supabaseAnonKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const [partners, custs, gps, ...cols] = await Promise.all([
      fetchAll('partners'), fetchAll('customers'), fetchAll('rider_locations', 'updated_at'),
      ...Object.values(SHARED).map((t) => fetchAll(t)),
    ]);
    let network = partners.length ? rowsToNetwork(partners) : seedNetwork();
    partners.forEach((r) => synced.set(`partners:${r.id}`, stable(r.data)));
    migrate(network);
    custs.forEach((r) => synced.set(`customers:${r.id}`, stable(r.data)));
    const patch = { network };
    Object.entries(SHARED).forEach(([key, table], i) => {
      cols[i].forEach((r) => synced.set(`${table}:${r.id}`, stable(r.data)));
      patch[key] = cols[i].map((r) => r.data);
    });
    applying = true;
    try { store.set(patch); } finally { applying = false; }
    const me = store.get().user;
    customers.replaceAll(Object.fromEntries(custs.map((r) => [r.id, r.data])));
    if (me?.phone && !customers.get(me.phone)) customers.save(me, { silent: true });
    mirrorGps(gps);

    onRemote = onChange;
    store.subscribe(push);
    customers.onSave(pushCustomer);
    if (me?.phone) pushCustomer(customers.get(me.phone));
    push(store.get()); // first run: uploads the seed partners / new branches
    sb.channel('beekey-db').on('postgres_changes', { event: '*', schema: 'public' }, apply).subscribe((status) => {
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') console.warn('[db] realtime:', status);
    });
    cloud.on = true;
    onChange('*');
    return true;
  } catch (e) {
    cloud.error = e.message;
    console.warn('[db] offline — running on this device only:', e.message);
    window.dispatchEvent(new CustomEvent('beekey:db-error', { detail: e.message }));
    return false;
  }
}
