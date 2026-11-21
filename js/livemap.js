// Live maps: Swiggy / Uber-style tracking on a real street map (Leaflet + OpenStreetMap data).
//
// • Order tracking: the rider rides to the pharmacy, then to the customer's door, along real roads.
// • Lab home collection: the sample collector rides from the lab to the patient.
// • Admin fleet view: the whole network and every active trip at a glance.
//
// Partner locations are stored as km offsets from the city centre (see data.js) and converted to
// lat/lng here. Rider movement is SIMULATED from the order timeline (time-lapse ×10 so a demo trip
// takes about a minute). In production the rider app would stream GPS fixes over a WebSocket and
// these markers would follow those fixes instead.

import { SHOPS, LABS, DELIVERY, byId } from './data.js';
import { km, toLatLng, fromLatLng, inIndia, SERVICE_KM, branchOf } from './hex.js';
import { S, esc, openModal, closeModal, toast } from './app.js';
import { store, customers } from './store.js';
import { geo } from './native.js';
import { pushGps } from './db.js';

/* ───────── geography ───────── */
export { toLatLng };

/* ───────── Leaflet, loaded on demand (only pages with a map pay for it) ───────── */
const LEAFLET = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/';
let leafletP = null;
function loadLeaflet() {
  if (window.L) return Promise.resolve(window.L);
  leafletP ||= new Promise((res, rej) => {
    const css = Object.assign(document.createElement('link'), { rel: 'stylesheet', href: LEAFLET + 'leaflet.min.css' });
    const js = Object.assign(document.createElement('script'), { src: LEAFLET + 'leaflet.min.js', onload: () => res(window.L), onerror: () => { leafletP = null; rej(new Error('Map library failed to load')); } });
    document.head.append(css, js);
  });
  return leafletP;
}

// OpenStreetMap's public tiles are fine for a demo; production should use a paid/self-hosted tile provider.
// Dark themes get a night-mode map via a CSS filter on the tile layer (see styles.css).
const TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors';

/* ───────── road routes (OSRM) with a smooth fallback curve ───────── */
const routes = new Map();
const rkey = (a, b) => `${a.x.toFixed(3)},${a.y.toFixed(3)}|${b.x.toFixed(3)},${b.y.toFixed(3)}`;
function curve(a, b) {
  const mx = (a.x + b.x) / 2 + (b.y - a.y) * 0.18, my = (a.y + b.y) / 2 - (b.x - a.x) * 0.18;
  return Array.from({ length: 33 }, (_, i) => { const t = i / 32, u = 1 - t; return { x: u * u * a.x + 2 * u * t * mx + t * t * b.x, y: u * u * a.y + 2 * u * t * my + t * t * b.y }; });
}
/** Returns the best route we have right now; fetches the road route in the background once. */
function route(a, b) {
  const k = rkey(a, b);
  const hit = routes.get(k);
  if (hit) return hit.pts;
  const entry = { pts: curve(a, b), road: false };
  routes.set(k, entry);
  const [la, lo] = toLatLng(a), [lb, ln] = toLatLng(b);
  const ctl = new AbortController();
  setTimeout(() => ctl.abort(), 5000);
  fetch(`https://router.project-osrm.org/route/v1/driving/${lo},${la};${ln},${lb}?overview=full&geometries=geojson`, { signal: ctl.signal })
    .then((r) => r.json())
    .then((j) => {
      const c = j.routes?.[0]?.geometry?.coordinates;
      if (!c?.length) return;
      entry.pts = [a, ...c.map(([lng, lat]) => fromLatLng(lat, lng)), b];
      entry.road = true;
      redraw(); // swap the curve for the real road on every open map
    })
    .catch(() => { /* offline or rate-limited: keep the curve */ });
  return entry.pts;
}
const pathLen = (pts) => pts.slice(1).reduce((s, p, i) => s + km(pts[i], p), 0);
/** Point and heading at fraction p (0…1) along a polyline. */
function along(pts, p) {
  const total = pathLen(pts);
  let left = Math.max(0, Math.min(1, p)) * total;
  for (let i = 1; i < pts.length; i++) {
    const seg = km(pts[i - 1], pts[i]);
    if (left <= seg || i === pts.length - 1) {
      const t = seg ? Math.min(1, left / seg) : 1;
      const a = pts[i - 1], b = pts[i];
      return { pt: { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }, east: b.x >= a.x, i };
    }
    left -= seg;
  }
  return { pt: pts.at(-1), east: true, i: pts.length };
}

/* ───────── trip simulation ───────── */
export const TIMELAPSE = 10;           // demo: 1 real minute of riding = 6 seconds on screen
const MIN_PER_KM = 3.5, START_MIN = 1; // ~17 km/h city riding + a minute to set off
const at = (o, s) => o.timeline?.find((t) => t.s === s)?.at;

function leg(from, to, startISO) {
  const pts = route(from, to);
  const dist = pathLen(pts);
  const realMin = START_MIN + dist * MIN_PER_KM;
  const p = startISO ? (Date.now() - Date.parse(startISO)) / ((realMin * 60e3) / TIMELAPSE) : 0;
  const prog = Math.max(0, Math.min(1, p));
  const a = along(pts, prog);
  return { pts, dist, prog, leftKm: dist * (1 - prog), leftMin: Math.max(0, Math.ceil(realMin * (1 - prog))), pt: a.pt, east: a.east, rest: pts.slice(a.i) };
}

/* ───────── real GPS from the delivery partner's phone ─────────
   The rider taps "Share live location" on their dashboard → navigator.geolocation.watchPosition
   streams fixes, which are written to localStorage (key beekey_gps). Every open map reads them on
   its tick, so a customer tab sees the rider move in real time. A fresh fix (< 2 min) always wins
   over the simulation. In production these fixes go to the server over a WebSocket / Supabase
   Realtime instead, so the customer's phone gets them. */
const GPS_KEY = 'beekey_gps', GPS_PREF = 'beekey_gps_on', GPS_FRESH = 120e3, ARRIVE_KM = 0.12;
let gpsCache = {}, gpsReadAt = 0, watch = null;
function gpsAll() {
  if (Date.now() - gpsReadAt > 250) { try { gpsCache = JSON.parse(localStorage.getItem(GPS_KEY) || '{}'); } catch { gpsCache = {}; } gpsReadAt = Date.now(); }
  return gpsCache;
}
function gpsSave(all) { gpsCache = all; gpsReadAt = Date.now(); try { localStorage.setItem(GPS_KEY, JSON.stringify(all)); } catch { /* storage blocked */ } }
/** The rider's latest live GPS fix, or null if they are not sharing (or it is stale). */
export const gpsOf = (id) => { const g = gpsAll()[id]; return g && Date.now() - (g.alive || g.at) < GPS_FRESH ? g : null; };
export const gpsSharing = (id) => watch?.riderId === id;
export function gpsStart(riderId, { silent = false } = {}) {
  if (!geo.available()) { if (!silent) toast('This browser has no GPS / location support', 'warn'); return false; }
  gpsStop(false);
  const id = geo.watchPosition((p) => {
    const { latitude: lat, longitude: lng, accuracy, speed, heading } = p.coords;
    const fix = { lat, lng, ...fromLatLng(lat, lng), acc: Math.round(accuracy || 0), kmh: speed != null ? Math.round(speed * 3.6) : null, heading, at: Date.now() };
    gpsSave({ ...gpsAll(), [riderId]: fix });
    pushGps(riderId, fix); // shares it with customers on other phones (cloud mode)
  }, (err) => {
    if (err.code === 1) { gpsStop(); toast('Location permission denied — allow location for this site to share your live position', 'warn'); }
  }, { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 });
  // Heartbeat: a rider standing still gets no new fixes, but is still sharing — keep the last fix alive.
  const beat = setInterval(() => { const g = gpsAll()[riderId]; if (g) { const fix = { ...g, alive: Date.now() }; gpsSave({ ...gpsAll(), [riderId]: fix }); pushGps(riderId, fix); } }, 20e3);
  watch = { riderId, id, beat };
  try { localStorage.setItem(GPS_PREF, riderId); } catch { /* ignore */ }
  return true;
}
export function gpsStop(clear = true) {
  if (watch) { geo.clearWatch(watch.id); clearInterval(watch.beat); if (clear) { const all = { ...gpsAll() }; delete all[watch.riderId]; gpsSave(all); pushGps(watch.riderId, null); } }
  watch = null;
  if (clear) try { localStorage.removeItem(GPS_PREF); } catch { /* ignore */ }
}
/** Keep sharing after a reload if the rider had it switched on (permission is already granted then). */
export function gpsResume(riderId) { let pref = null; try { pref = localStorage.getItem(GPS_PREF); } catch { /* ignore */ } if (pref === riderId && !watch) gpsStart(riderId, { silent: true }); }

const snap = (p) => ({ x: Math.round(p.x / 0.25) * 0.25, y: Math.round(p.y / 0.25) * 0.25 });
/** Remaining trip from a live GPS position: follows the planned road if the rider is on it, else re-routes (every ~250 m). */
function gpsLeg(pos, to, planned) {
  let rest, leftKm;
  let bi = -1, bd = Infinity;
  if (planned) planned.forEach((p, i) => { const d = km(p, pos); if (d < bd) { bd = d; bi = i; } });
  if (planned && bd < 0.35) { rest = planned.slice(bi + 1); leftKm = km(pos, rest[0] || to) + pathLen(rest); }
  else { const r = route(snap(pos), to); rest = r.slice(1); leftKm = km(pos, rest[0] || to) + pathLen(rest); }
  if (km(pos, to) < ARRIVE_KM) leftKm = 0;
  return { pts: planned || [pos, ...rest], dist: leftKm, prog: leftKm ? 0 : 1, leftKm, leftMin: Math.ceil(leftKm * MIN_PER_KM), pt: pos, east: (rest[0] || to).x >= pos.x, rest, gps: true };
}
/** Where a partner is right now, ignoring trips: live GPS if shared, otherwise drifting around their base. */
const posOf = (r) => { const g = gpsOf(r.id); return g ? { pt: { x: g.x, y: g.y }, east: true, gps: g } : wander(r); };

/** Where a delivery partner is right now and what they are doing. */
export function riderState(rider, orders = S().orders) {
  const o = orders.find((x) => x.riderId === rider.id && (x.status === 'ready' || x.status === 'picked'));
  const g = gpsOf(rider.id), pos = g && { x: g.x, y: g.y };
  if (!o) return { idle: true, ...posOf(rider) };
  const shop = byId(SHOPS, o.shopId);
  if (o.status === 'ready') {
    const l = g ? gpsLeg(pos, shop, null) : leg(rider, shop, at(o, 'ready'));
    return { order: o, phase: l.prog < 1 ? 'to-shop' : 'at-shop', leg: l, pt: l.pt, east: l.east, gps: g };
  }
  const l = g ? gpsLeg(pos, o.customer, route(shop, o.customer)) : leg(shop, o.customer, at(o, 'picked'));
  return { order: o, phase: l.prog < 1 ? 'to-customer' : 'arrived', leg: l, pt: l.pt, east: l.east, gps: g };
}
// Idle riders drift slowly around their base so the map feels alive.
function wander(r) {
  const ph = [...r.id].reduce((s, c) => s + c.charCodeAt(0), 0), t = Date.now() / 1000 / 40 + ph;
  return { pt: { x: r.x + Math.cos(t) * 0.35, y: r.y + Math.sin(t * 1.3) * 0.25 }, east: Math.sin(t) < 0 };
}

/**
 * Everything the customer needs to know about an order right now:
 * where the pharmacy is at, whether a delivery partner is assigned, where they are and where they're heading.
 */
export function orderParts(o) {
  const shop = byId(SHOPS, o.shopId), rider = o.riderId ? byId(DELIVERY, o.riderId) : null;
  const drop = leg(shop, o.customer, null);
  const rideMin = Math.ceil(drop.dist * MIN_PER_KM + START_MIN);
  const youKm = drop.dist.toFixed(1);
  return orderStage(o, shop, rider, drop, rideMin, youKm);
}
const ago = (t) => { const s = Math.max(0, Math.round((Date.now() - t) / 1000)); return s < 5 ? 'just now' : s < 60 ? `${s}s ago` : `${Math.round(s / 60)} min ago`; };
/** Where the location shown on the map comes from. */
export const srcText = (g) => (g ? `📡 Live GPS · ±${g.acc} m · ${ago(g.at)}${g.kmh ? ` · ${g.kmh} km/h` : ''}` : `Simulated location (demo time-lapse ×${TIMELAPSE})`);
function orderStage(o, shop, rider, drop, rideMin, youKm) {
  if (o.status === 'delivered') return { stage: 'delivered', text: 'Delivered — get well soon 💙', min: 0, shop: 'Order handed over ✓', rider: rider ? `${rider.name} delivered your order ✓` : 'Delivered ✓' };
  if (o.status === 'placed') return { stage: 'placed', text: `Waiting for ${shop.name} to accept your order`, min: 8 + rideMin, shop: `Received your order · ${youKm} km from you`, rider: 'Not assigned yet — we assign one as soon as the pharmacy accepts' };
  if (o.status === 'accepted' || !rider) return { stage: 'searching', text: 'Packing your medicines · finding a delivery partner', min: 6 + rideMin, shop: 'Accepted ✓ · packing your medicines', rider: '🔎 Searching for the nearest delivery partner…' };
  const st = riderState(rider);
  const first = rider.name.split(' ')[0];
  const src = srcText(st.gps);
  const away = (k, m) => ({ src, away: `🛵 ${first} is ${k.toFixed(1)} km from you · ~${m} min` });
  if (st.phase === 'to-shop') return { stage: 'to-shop', text: `${first} is going to the pharmacy to pick up your order`, min: st.leg.leftMin + 2 + rideMin, shop: 'Packed ✓ · waiting for pickup', rider: `${rider.name} assigned ✓ · ${st.leg.leftKm.toFixed(1)} km from the pharmacy, riding there now`, ...away(st.leg.leftKm + drop.dist, st.leg.leftMin + 2 + rideMin) };
  if (st.phase === 'at-shop') return { stage: 'at-shop', text: `${first} is at the pharmacy, picking up your order`, min: 2 + rideMin, shop: 'Handing over your order…', rider: `${rider.name} reached the pharmacy ✓`, ...away(drop.dist, 2 + rideMin) };
  if (st.phase === 'to-customer') return { stage: 'to-you', text: `${first} is on the way to you · ${st.leg.leftKm.toFixed(1)} km away`, min: st.leg.leftMin, shop: 'Picked up ✓', rider: `${rider.name} picked up your order ✓ · ${st.leg.leftKm.toFixed(1)} km from you`, ...away(st.leg.leftKm, st.leg.leftMin) };
  return { stage: 'arrived', text: `${first} has arrived at your door 🎉`, min: 0, shop: 'Picked up ✓', rider: `${rider.name} is at your door`, src, away: `🛵 ${first} is at your door` };
}
export const orderLive = orderParts;

/** What the delivery partner sees: where to go next and how far the customer is. */
export function riderNav(o) {
  const rider = byId(DELIVERY, o.riderId), shop = byId(SHOPS, o.shopId);
  if (!rider) return null;
  const st = riderState(rider);
  const drop = route(shop, o.customer), dropKm = pathLen(drop), dropMin = Math.ceil(dropKm * MIN_PER_KM + START_MIN);
  const cust = o.customer.name.split(' ')[0], src = srcText(st.gps);
  if (st.order?.id !== o.id) return { nav: `Next: pick up from ${shop.name}`, min: '—', pick: `PICK UP · ${km(posOf(rider).pt, shop).toFixed(1)} km from you`, drop: `DROP · ${dropKm.toFixed(1)} km from the pharmacy`, src };
  if (st.phase === 'to-shop') return { nav: `🧭 Head to ${shop.name} · ${st.leg.leftKm.toFixed(1)} km`, min: `${st.leg.leftMin} min`, pick: `PICK UP · ${st.leg.leftKm.toFixed(1)} km from you`, drop: `DROP · ${cust} is ${(st.leg.leftKm + dropKm).toFixed(1)} km from you (via pharmacy)`, src };
  if (st.phase === 'at-shop') return { nav: `📦 You're at ${shop.name} — collect order #${o.id} and tap “Picked up”`, min: 'Now', pick: 'AT THE PHARMACY ✓', drop: `DROP · ${cust} is ${dropKm.toFixed(1)} km from you · ~${dropMin} min`, src };
  if (st.phase === 'to-customer') return { nav: `🧭 Deliver to ${cust} · ${st.leg.leftKm.toFixed(1)} km`, min: `${st.leg.leftMin} min`, pick: 'PICKED UP ✓', drop: `DROP · ${cust} is ${st.leg.leftKm.toFixed(1)} km from you · ~${st.leg.leftMin} min`, src };
  return { nav: `🏠 You've reached ${cust} — hand over the order and tap “Delivered”`, min: 'Now', pick: 'PICKED UP ✓', drop: `DROP · you're at ${cust}'s door ✓`, src };
}
const gpsStatus = (id) => {
  const g = gpsOf(id);
  if (!gpsSharing(id)) return g ? srcText(g) : 'Off — customers see a simulated position. Turn it on so they can follow you live.';
  return g ? `${srcText(g)} · customers can see you` : '⏳ Waiting for the first GPS fix…';
};

const labHome = (b) => ({ x: b.patient.x ?? S().user?.x ?? 0.3, y: b.patient.y ?? S().user?.y ?? 0.3 });
/** Live status for a home sample collection. */
export function labLive(b) {
  const lab = byId(LABS, b.labId);
  if (b.status !== 'enroute') return null;
  const l = leg(lab, labHome(b), b.enrouteAt);
  return { leg: l, text: l.prog < 1 ? `Sample collector is ${l.leftKm.toFixed(1)} km away` : 'Sample collector has arrived 🎉', min: l.leftMin };
}

/* ───────── markers ───────── */
const ICON = { shop: '🏪', lab: '🧪', rider: '🛵', home: '🏠', you: '📍' };
function pinIcon(L, kind, label = '', extra = '') {
  return L.divIcon({
    className: 'lm-wrap',
    html: `<div class="lm-pin lm-${kind} ${extra}"><span class="lm-ico">${ICON[kind]}</span>${label ? `<b class="lm-label">${esc(label)}</b>` : ''}</div>`,
    iconSize: [40, 40], iconAnchor: [20, 20], popupAnchor: [0, -22],
  });
}

/* ───────── map registry & live tick ───────── */
const mounted = new Map();   // element → { map, update, key }
const views = new Map();     // key → { center, zoom } so re-renders keep the user's pan/zoom
let ticking = false;

/** Called after every page render: builds maps for [data-livemap] elements, tears down stale ones. */
export function mountMaps(root = document) {
  for (const [el, m] of mounted) if (!el.isConnected) { views.set(m.key, { center: m.map.getCenter(), zoom: m.map.getZoom() }); m.map.remove(); mounted.delete(el); }
  const els = [...root.querySelectorAll('[data-livemap]')].filter((el) => !mounted.has(el));
  tickText();
  if (!els.length) return;
  loadLeaflet().then((L) => {
    for (const el of els) if (el.isConnected && !mounted.has(el)) build(L, el);
    if (!ticking) { ticking = true; setTimeout(tick, 300); }
  }).catch(() => els.forEach((el) => { el.innerHTML = '<div class="lm-offline">🗺️ Map unavailable offline — live status is still shown alongside.</div>'; }));
}
function redraw() { for (const m of mounted.values()) m.update(true); }
function tick() {
  if (!mounted.size && !document.querySelector('[data-live]')) { ticking = false; return; }
  if (!document.hidden) { for (const m of mounted.values()) m.update(false); tickText(); }
  setTimeout(tick, 400);
}
if (typeof document !== 'undefined') setInterval(() => { if (!ticking) tickText(); }, 1000);
if (typeof document !== 'undefined') document.addEventListener('visibilitychange', () => { if (!document.hidden) { for (const m of mounted.values()) m.update(false); tickText(); } });
// Another tab (the rider's) wrote a new GPS fix → refresh at once instead of waiting for the next tick.
if (typeof window !== 'undefined') window.addEventListener('storage', (e) => { if (e.key === GPS_KEY) { gpsReadAt = 0; for (const m of mounted.values()) m.update(false); tickText(); } });
// A rider on another phone moved (cloud mode, see db.js) → refresh at once.
if (typeof window !== 'undefined') window.addEventListener('beekey:gps', () => { gpsReadAt = 0; for (const m of mounted.values()) m.update(false); tickText(); });

/** Live text outside the map (ETA banners, list distances). */
function tickText() {
  document.querySelectorAll('[data-live]').forEach((el) => {
    const [kind, id] = el.dataset.live.split(':');
    let v = null;
    if (kind.startsWith('order')) { const o = S().orders.find((x) => x.id === id); if (o) { const l = orderParts(o); v = { order: l.text, 'order-min': l.min ? `${l.min} min` : 'Now', 'order-shop': l.shop, 'order-rider': l.rider }[kind]; } }
    if (kind === 'order-away' || kind === 'order-src') { const o = S().orders.find((x) => x.id === id); const l = o && orderParts(o); if (l) v = (kind === 'order-away' ? l.away : l.src) || ''; }
    if (kind.startsWith('rnav') || kind === 'rpick' || kind === 'rdrop') { const o = S().orders.find((x) => x.id === id); const n = o && riderNav(o); if (n) v = { rnav: n.nav, 'rnav-min': n.min, 'rnav-src': n.src, rpick: n.pick, rdrop: n.drop }[kind]; }
    if (kind === 'rgps') v = gpsStatus(id);
    if (kind === 'lab' || kind === 'lab-min') { const b = S().labBookings.find((x) => x.id === id); const l = b && labLive(b); if (l) v = kind === 'lab' ? l.text : l.min ? `${l.min} min` : 'Now'; }
    if (v != null && el.textContent !== v) el.textContent = v;
  });
}

function build(L, el) {
  const [kind, id, extra] = el.dataset.livemap.split(':');
  const map = L.map(el, { zoomControl: false, attributionControl: true, scrollWheelZoom: kind === 'fleet' });
  L.control.zoom({ position: 'bottomright' }).addTo(map);
  L.tileLayer(TILES, { attribution: ATTR, maxZoom: 19 }).addTo(map);
  const builder = { order: orderMap, lab: labMap, fleet: fleetMap, rider: riderMap }[kind];
  const update = builder ? builder(L, map, id, extra) : () => {};
  const key = el.dataset.livemap;
  const saved = views.get(key);
  if (saved) map.setView(saved.center, saved.zoom, { animate: false });
  mounted.set(el, { map, update, key });
  update(true, !saved);
  setTimeout(() => map.invalidateSize(), 60);
}

// Helpers shared by the builders
function routeLine(L, map, cls) {
  const casing = L.polyline([], { className: 'lm-route-casing', weight: 9, opacity: 1 }).addTo(map);
  const line = L.polyline([], { className: `lm-route ${cls}`, weight: 5, opacity: 1 }).addTo(map);
  return (pts) => { const ll = pts.map(toLatLng); casing.setLatLngs(ll); line.setLatLngs(ll); };
}
function riderMarker(L, map, label) {
  const m = L.marker([0, 0], { icon: pinIcon(L, 'rider', label), zIndexOffset: 900 }).addTo(map);
  let lastEast = null;
  let lastGps = null;
  return (pt, east, gps = false) => {
    m.setLatLng(toLatLng(pt));
    const el = m.getElement()?.querySelector('.lm-pin');
    if (east !== lastEast) { lastEast = east; el?.classList.toggle('east', east); }
    if (!!gps !== lastGps) { lastGps = !!gps; el?.classList.toggle('gps', !!gps); }
  };
}
const fit = (map, pts, pad = 48) => map.fitBounds(L_bounds(pts), { paddingTopLeft: [pad, pad], paddingBottomRight: [pad, pad + (map.getContainer().nextElementSibling?.classList.contains('live-card') ? 90 : 0)], maxZoom: 16 });
const L_bounds = (pts) => window.L.latLngBounds(pts.map(toLatLng));

/* Order: shows each stage on the map —
   placed     → pharmacy + your address, nobody assigned yet
   accepted   → radar around the pharmacy while we look for the nearest partner
   ready      → assigned partner's live location, riding to the pharmacy (orange route)
   picked     → partner riding from the pharmacy to you (blue route)            */
function orderMap(L, map, id) {
  const o0 = S().orders.find((x) => x.id === id);
  if (!o0) return () => {};
  const shop = byId(SHOPS, o0.shopId);
  const shopM = L.marker(toLatLng(shop), { icon: pinIcon(L, 'shop', shop.name), zIndexOffset: 500 }).addTo(map).bindPopup(`<b>${esc(shop.name)}</b><br>${esc(shop.area)} · licensed pharmacy`);
  L.marker(toLatLng(o0.customer), { icon: pinIcon(L, 'home', 'Delivery location'), zIndexOffset: 600 }).addTo(map).bindPopup(`<b>Delivery location</b><br>${esc(o0.customer.address)}`);
  const radar = L.circle(toLatLng(shop), { radius: 1500, className: 'lm-search', interactive: false });
  const ghosts = DELIVERY.map((r) => ({ r, m: L.marker([0, 0], { icon: pinIcon(L, 'rider', '', 'ghost'), interactive: false }) }));
  const plan = routeLine(L, map, 'lm-route-plan');
  const toShop = routeLine(L, map, 'lm-route-pickup');
  const toHome = routeLine(L, map, 'lm-route-drop');
  let rider = null;
  const show = (layer, on) => (on ? layer.addTo(map) : layer.remove());
  return (full, first) => {
    const o = S().orders.find((x) => x.id === id) || o0;
    const r = o.riderId ? byId(DELIVERY, o.riderId) : null;
    const drop = route(shop, o.customer);
    const assigned = r && (o.status === 'ready' || o.status === 'picked' || o.status === 'delivered');
    const searching = !assigned && o.status === 'accepted';
    shopM.getElement()?.querySelector('.lm-pin')?.classList.toggle('pulse', !assigned && o.status !== 'delivered');
    show(radar, searching);
    for (const g of ghosts) {
      const near = searching && km(g.r, shop) < 4;
      show(g.m, near);
      if (near) g.m.setLatLng(toLatLng(posOf(g.r).pt));
    }
    if (!assigned) {
      toShop([]); toHome([]); plan(drop);
      if (first) fit(map, searching ? [shop, o.customer, ...DELIVERY.filter((x) => km(x, shop) < 4)] : [shop, o.customer]);
      return;
    }
    rider ||= riderMarker(L, map, r.name.split(' ')[0]);
    if (o.status === 'delivered') { toShop([]); toHome([]); plan([]); rider(o.customer, true); if (first) fit(map, [shop, o.customer]); return; }
    const st = riderState(r);
    if (st.phase === 'to-shop' || st.phase === 'at-shop') {
      toShop([st.pt, ...st.leg.rest]);
      toHome([]); plan(drop);
      if (first) fit(map, [st.pt, shop, o.customer]);
    } else {
      toShop([]); plan([]);
      toHome([st.pt, ...st.leg.rest]);
      if (first) fit(map, [st.pt, shop, o.customer]);
    }
    rider(st.pt, st.east, st.gps);
  };
}

/* Lab home collection: lab → patient. */
function labMap(L, map, id) {
  const b0 = S().labBookings.find((x) => x.id === id);
  if (!b0) return () => {};
  const lab = byId(LABS, b0.labId), home = labHome(b0);
  L.marker(toLatLng(lab), { icon: pinIcon(L, 'lab', lab.name), zIndexOffset: 500 }).addTo(map);
  L.marker(toLatLng(home), { icon: pinIcon(L, 'home', 'You', 'pulse'), zIndexOffset: 600 }).addTo(map);
  const line = routeLine(L, map, 'lm-route-drop');
  let mk = null;
  return (full, first) => {
    const b = S().labBookings.find((x) => x.id === id) || b0;
    const live = labLive(b);
    if (!live) { line(route(lab, home)); if (first) fit(map, [lab, home]); return; }
    mk ||= riderMarker(L, map, 'Collector');
    line([live.leg.pt, ...live.leg.rest]);
    mk(live.leg.pt, live.leg.east);
    if (first) fit(map, [lab, home]);
  };
}

/* Delivery partner's own navigation map. */
function riderMap(L, map, riderId, orderId) {
  const me = byId(DELIVERY, riderId), o0 = S().orders.find((x) => x.id === orderId);
  if (!me || !o0) return () => {};
  const shop = byId(SHOPS, o0.shopId);
  L.marker(toLatLng(shop), { icon: pinIcon(L, 'shop', 'Pick up') }).addTo(map);
  L.marker(toLatLng(o0.customer), { icon: pinIcon(L, 'home', 'Drop', 'pulse') }).addTo(map);
  const a = routeLine(L, map, 'lm-route-pickup'), b = routeLine(L, map, 'lm-route-drop');
  const mk = riderMarker(L, map, 'You');
  let followed = false;
  return (full, first) => {
    const st = riderState(me);
    const drop = route(shop, o0.customer);
    const mine = st.order?.id === orderId;
    if (!mine) { a([st.pt, shop]); b(drop); }
    else if (st.phase === 'to-shop' || st.phase === 'at-shop') { a([st.pt, ...st.leg.rest]); b(drop); }
    else { a([]); b([st.pt, ...st.leg.rest]); }
    mk(st.pt, st.east, st.gps);
    if (first || (st.gps && !followed)) { followed = !!st.gps; fit(map, [st.pt, shop, o0.customer], 30); }
  };
}

/* ───────── admin fleet ───────── */
function fleetMap(L, map, branch = 'kochi') {
  SHOPS.forEach((p) => L.marker(toLatLng(p), { icon: pinIcon(L, 'shop', p.name.split(' ').slice(0, 2).join(' ')) }).addTo(map).bindPopup(`<b>${esc(p.name)}</b><br>Pharmacy · ${esc(p.area)}`));
  LABS.forEach((p) => L.marker(toLatLng(p), { icon: pinIcon(L, 'lab', p.name.split(' ').slice(0, 2).join(' ')) }).addTo(map).bindPopup(`<b>${esc(p.name)}</b><br>Lab`));
  const riders = DELIVERY.map((r) => ({ r, set: riderMarker(L, map, r.name.split(' ')[0]), line: routeLine(L, map, 'lm-route-drop') }));
  const homes = L.layerGroup().addTo(map);
  return (full, first) => {
    if (full) homes.clearLayers();
    for (const { r, set, line } of riders) {
      const st = riderState(r);
      set(st.pt, st.east, st.gps);
      if (st.idle) line([]);
      else {
        const target = st.phase === 'to-shop' || st.phase === 'at-shop' ? byId(SHOPS, st.order.shopId) : st.order.customer;
        line([st.pt, target]);
        if (full) L.marker(toLatLng(st.order.customer), { icon: pinIcon(L, 'home', '#' + st.order.id.slice(-4)) }).addTo(homes);
      }
    }
    if (first) fit(map, [...SHOPS, ...LABS, ...DELIVERY].filter((p) => branchOf(p).id === branch), 30);
  };
}

/* ───────── actions ───────── */

/* ───────── delivery location picker (asked before every order) ─────────
   Swiggy-style: the pin stays in the middle and the customer moves the map under it,
   or taps "Use my live location" (browser GPS). The address line comes from
   OpenStreetMap's Nominatim reverse geocoder; the customer adds house no. & landmark. */
let pick = null, pickMap = null, geoTimer = 0;

/**
 * @param serves  (pt) => partner list that must have someone within SERVICE_KM (default: verified pharmacies)
 */
export function askLocation({ title = 'Where should we deliver?', cta = 'Confirm location', onConfirm, serves = () => SHOPS, what = 'pharmacy' }) {
  const u = S().user;
  const start = u?.loc || { x: u?.x ?? 0, y: u?.y ?? 0 };
  pick = { x: start.x, y: start.y, area: u?.loc?.area || '', onConfirm, ok: true, serves, what };
  openModal(`
    <div class="loc-pick">
      <div class="loc-head"><h2>📍 ${esc(title)}</h2><p class="muted small">Move the map so the pin sits on your door — the delivery partner comes exactly here.</p></div>
      <form class="loc-search" data-loc-search><span>🔍</span><input id="loc-q" placeholder="Search area, street or landmark in India…" autocomplete="off" /><button class="btn btn-sm btn-ghost">Search</button></form>
      <div id="loc-results" class="loc-results" hidden></div>
      <div class="loc-map-wrap"><div class="loc-map" id="loc-map"></div>
        <div class="loc-pin" aria-hidden="true"><span>📍</span><i></i></div>
        <button type="button" class="btn btn-sm loc-gps" data-act="loc-gps">◎ Use my live location</button></div>
      <div class="loc-area"><b id="loc-area">${esc(pick.area || 'Finding the address…')}</b><small id="loc-zone" class="muted"></small></div>
      <div class="loc-fields">
        <label class="field"><span>House / flat / building *</span><input id="loc-house" autocomplete="address-line1" placeholder="e.g. Flat 4B, Rose Apartments" value="${esc(u?.loc?.house || '')}" /></label>
        <label class="field"><span>Landmark <small class="muted">(optional)</small></span><input id="loc-landmark" placeholder="e.g. Near St. Mary's church" value="${esc(u?.loc?.landmark || '')}" /></label>
      </div>
      <div class="loc-foot"><button type="button" class="btn btn-primary btn-block" id="loc-confirm" data-act="loc-confirm">${esc(cta)}</button></div>
    </div>`, 'modal-loc');
  loadLeaflet().then((L) => {
    const el = document.getElementById('loc-map');
    if (!el) return;
    pickMap?.remove();
    pickMap = L.map(el, { zoomControl: false, attributionControl: true }).setView(toLatLng(start), 16);
    L.control.zoom({ position: 'bottomright' }).addTo(pickMap);
    L.tileLayer(TILES, { attribution: ATTR, maxZoom: 19 }).addTo(pickMap);
    const wrap = el.parentElement;
    pickMap.on('movestart', () => wrap.classList.add('moving'));
    pickMap.on('moveend', () => { wrap.classList.remove('moving'); onPick(); });
    setTimeout(() => { pickMap.invalidateSize(); onPick(); }, 80);
  }).catch(() => { document.getElementById('loc-area').textContent = 'Map unavailable — we will use your saved address'; });
}

function onPick() {
  if (!pickMap) return;
  const c = pickMap.getCenter();
  Object.assign(pick, fromLatLng(c.lat, c.lng), { lat: c.lat, lng: c.lng });
  const zone = document.getElementById('loc-zone'), btn = document.getElementById('loc-confirm');
  // Serve anywhere in India where a verified partner is close enough (each city = a branch).
  const near = pick.serves().map((p) => ({ p, d: km(p, pick) })).sort((a, b) => a.d - b.d)[0];
  const india = inIndia(c.lat, c.lng);
  pick.ok = india && !!near && near.d <= SERVICE_KM;
  if (zone) {
    zone.textContent = !india ? '✕ Beekey delivers only within India'
      : pick.ok ? `✓ We ${pick.what === 'lab' ? 'collect' : 'deliver'} here · ${near.p.name} is ${near.d.toFixed(1)} km away (${branchOf(near.p).name} branch)`
      : `✕ No Beekey partner ${pick.what} near this location yet — we're opening new branches soon${near ? ` (nearest: ${branchOf(near.p).name}, ${Math.round(near.d)} km)` : ''}`;
    zone.className = pick.ok ? 'ok' : 'bad';
  }
  if (btn) btn.disabled = !pick.ok;
  clearTimeout(geoTimer);
  geoTimer = setTimeout(() => reverseGeocode(c.lat, c.lng), 700);
}

function reverseGeocode(lat, lng) {
  const el = document.getElementById('loc-area');
  if (!el) return;
  fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=18&addressdetails=1&lat=${lat.toFixed(6)}&lon=${lng.toFixed(6)}`, { headers: { 'Accept-Language': 'en' } })
    .then((r) => r.json())
    .then((j) => {
      if (!pick || !el.isConnected) return;
      const a = j.address || {};
      const parts = [a.road || a.pedestrian || a.neighbourhood, a.suburb || a.quarter || a.village, a.city || a.town || a.county, a.postcode].filter(Boolean);
      pick.area = parts.join(', ') || j.display_name || '';
      if (pick.lat === lat) el.textContent = pick.area || 'Pinned location';
    })
    .catch(() => { if (!pick || !el.isConnected) return; pick.area = `Pinned location (${lat.toFixed(5)}, ${lng.toFixed(5)})`; el.textContent = pick.area; });
}

export const locActions = {
  'loc-gps': (_, btn) => {
    if (!geo.available()) return toast('Live location is not available in this browser', 'warn');
    if (btn) btn.textContent = '◎ Locating…';
    geo.getCurrentPosition((pos) => {
      if (btn) btn.textContent = '◎ Use my live location';
      const { latitude: lat, longitude: lng, accuracy } = pos.coords;
            toast(`Live location found (±${Math.round(accuracy)} m) — adjust the pin if needed`);
      pickMap?.setView([lat, lng], 17);
    }, (err) => {
      if (btn) btn.textContent = '◎ Use my live location';
      toast(err.code === 1 ? 'Location permission denied — move the pin to your address instead' : 'Could not get your location — move the pin instead', 'warn');
    }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
  },
  'loc-confirm': () => {
    if (!pick?.ok) return toast(`No Beekey partner ${pick?.what || 'pharmacy'} serves this location yet`, 'warn');
    const house = document.getElementById('loc-house')?.value.trim() || '';
    const landmark = document.getElementById('loc-landmark')?.value.trim() || '';
    if (!house) { document.getElementById('loc-house')?.focus(); return toast('Please add your house / flat / building', 'warn'); }
    const area = pick.area || 'Pinned location';
    const loc = { x: +pick.x.toFixed(3), y: +pick.y.toFixed(3), lat: pick.lat, lng: pick.lng, house, landmark, area, address: [house, landmark && `near ${landmark.replace(/^near\s+/i, '')}`, area].filter(Boolean).join(', ') };
    const user = { ...S().user, loc, x: loc.x, y: loc.y, address: loc.address };
    customers.save(user);
    store.set({ user });
    const done = pick.onConfirm;
    pick = null;
    closeModal();
    done?.(user);
  },
};
if (typeof document !== 'undefined') document.getElementById('modal')?.addEventListener('close', () => { pickMap?.remove(); pickMap = null; });

// Address search (OpenStreetMap Nominatim, limited to India).
document.addEventListener('submit', (e) => {
  const f = e.target.closest?.('[data-loc-search]');
  if (!f) return;
  e.preventDefault();
  const q = document.getElementById('loc-q')?.value.trim();
  const box = document.getElementById('loc-results');
  if (!q || !box) return;
  box.hidden = false; box.innerHTML = '<p class="muted small">Searching…</p>';
  fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=in&limit=5&q=${encodeURIComponent(q)}`, { headers: { 'Accept-Language': 'en' } })
    .then((r) => r.json())
    .then((list) => {
      box.innerHTML = list.length ? list.map((r) => `<button type="button" data-act="loc-go" data-id="${r.lat},${r.lon}">📍 ${esc(r.display_name)}</button>`).join('') : '<p class="muted small">No places found — try a nearby landmark.</p>';
    })
    .catch(() => { box.innerHTML = '<p class="muted small">Search is unavailable right now — move the map instead.</p>'; });
});
locActions['loc-go'] = ({ id }) => {
  const [lat, lng] = id.split(',').map(Number);
  document.getElementById('loc-results').hidden = true;
  pickMap?.setView([lat, lng], 17);
};
