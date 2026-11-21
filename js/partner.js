// Partner dashboards: doctor, medical shop, delivery partner and lab.
import { DOCTORS, MEDICINES, SHOPS, DELIVERY, LABS, TESTS, byId } from './data.js';
import { store, now, customers } from './store.js';
import { gpsStart, gpsStop, gpsSharing, gpsResume } from './livemap.js';
import { doctorAvatar, labArt } from './icons-care.js';
import {
  esc, inr, S, fmtDate, fmtTime, openModal, closeModal, toast, render, ROLES,
  createMedicineOrder, advanceOrder, showPrescription,
} from './app.js';

const statusLabel = { placed: 'New order', accepted: 'Packing', ready: 'Awaiting rider', picked: 'Out for delivery', delivered: 'Delivered' };

function shell(role, me, stats, body) {
  const r = ROLES[role];
  return `
  <section class="dash-hero">
    <div class="wrap dash-head">
      <div class="dash-id">${role === 'doctor' ? `<span class="avatar dash-avatar">${doctorAvatar(me, 84)}</span>` : role === 'lab' ? `<span class="avatar dash-avatar">${labArt('blood', 84)}</span>` : `<span class="role-icon">${r.icon}</span>`}<div><span class="eyebrow">${r.title} dashboard</span><h1>${esc(me.name)}</h1>
      <p class="muted">${esc(me.area || me.vehicle || me.qual || (me.nabl ? 'NABL accredited lab' : 'Partner lab'))}</p></div></div>
      <div class="dash-actions"><span class="live-pill"><i></i>Online</span><button class="btn btn-sm btn-ghost" data-act="partner-logout">Log out</button></div>
    </div>
    <div class="wrap stats">${stats.map(([v, l]) => `<div class="stat"><b>${v}</b><span>${l}</span></div>`).join('')}</div>
  </section>
  <section class="wrap section dash-body">${body}</section>`;
}

const emptyDash = (icon, t, p) => `<div class="empty small-empty"><div class="empty-icon">${icon}</div><h3>${t}</h3><p class="muted">${p}</p></div>`;

/* ─────────────── Doctor ─────────────── */
function doctorDash(me) {
  const appts = S().appointments.filter((a) => a.doctorId === me.id).sort((a, b) => (a.date + a.slot).localeCompare(b.date + b.slot));
  const up = appts.filter((a) => a.status === 'upcoming');
  const done = appts.filter((a) => a.status === 'completed');
  const today = new Date().toLocaleDateString('en-CA');
  const body = `
    <h2>Upcoming consultations</h2>
    <div class="row-list">${up.length ? up.map((a) => `
      <div class="row-card card">
        <div class="rc-main"><span class="avatar sm letter">${esc(a.patient.name[0]).toUpperCase()}</span><div><b>${esc(a.patient.name)}</b>
        <p class="muted small">📅 ${a.date === today ? 'Today' : fmtDate(a.date)} · ${a.slot} · 📹 Google Meet</p>
        ${a.symptoms ? `<p class="small symptom">🗒 “${esc(a.symptoms)}”</p>` : ''}</div></div>
        <div class="rc-actions"><a class="btn btn-sm btn-ghost" href="${a.meet}" target="_blank" rel="noopener">📹 Start Meet</a>
        <button class="btn btn-sm btn-primary" data-act="rx-open" data-id="${a.id}">End call & prescribe</button></div>
      </div>`).join('') : emptyDash('📅', 'No upcoming consultations', 'New bookings from patients appear here instantly. (Tip: book a consult as a customer in another tab.)')}</div>
    <h2>Completed</h2>
    <div class="row-list">${done.length ? done.map((a) => {
      const o = a.orderId && S().orders.find((x) => x.id === a.orderId);
      return `<div class="row-card card"><div class="rc-main"><span class="avatar sm letter">${esc(a.patient.name[0]).toUpperCase()}</span><div><b>${esc(a.patient.name)}</b><p class="muted small">${fmtDate(a.date)} · ${a.slot}${o ? ` · 💊 sent to ${esc(byId(SHOPS, o.shopId).name)} — ${statusLabel[o.status]}` : ''}</p></div></div>
      <div class="rc-actions"><button class="btn btn-sm btn-ghost" data-act="view-rx" data-id="${a.id}">📄 Prescription</button></div></div>`;
    }).join('') : emptyDash('✅', 'Nothing here yet', 'Completed consultations and the prescriptions you wrote will be listed here.')}</div>`;
  return shell('doctor', me, [[up.length, 'Upcoming'], [up.filter((a) => a.date === today).length, 'Today'], [done.length, 'Completed'], [inr(done.reduce((s, a) => s + a.fee, 0)), 'Earned']], body);
}

let rx = null; // draft prescription
function rxModal() {
  const a = S().appointments.find((x) => x.id === rx.apptId);
  openModal(`
    <div class="modal-hero"><span class="role-icon">℞</span><div><h2>Prescription for ${esc(a.patient.name)}</h2><p class="muted">Medicines are routed to the pharmacy nearest to the patient and delivered by a Beekey rider.</p></div></div>
    <div class="modal-body">
      <div class="rx-add">
        <select id="rx-med" aria-label="Medicine"><option value="">Select from catalogue…</option>${MEDICINES.map((m) => `<option value="${m.id}">${esc(m.name)} — ${inr(m.price)}</option>`).join('')}</select>
        <input id="rx-dose" placeholder="Dosage e.g. 1-0-1 after food" />
        <input id="rx-days" placeholder="Days" inputmode="numeric" class="short" />
        <input id="rx-qty" placeholder="Qty" inputmode="numeric" class="short" value="1" />
        <button class="btn btn-sm btn-dark" data-act="rx-add">Add</button>
      </div>
      <details class="rx-custom"><summary>Medicine not in catalogue? Type it</summary>
        <div class="rx-add"><input id="rx-cname" placeholder="Medicine name & strength" /><input id="rx-cdose" placeholder="Dosage" /><input id="rx-cdays" placeholder="Days" class="short" /><button class="btn btn-sm btn-dark" data-act="rx-add-custom">Add</button></div>
      </details>
      <table class="rx-table"><thead><tr><th>Medicine</th><th>Dosage</th><th>Days</th><th></th></tr></thead><tbody>
        ${[...rx.items.map((i, n) => ['items', i, n]), ...rx.custom.map((i, n) => ['custom', i, n])].map(([k, i, n]) => `<tr><td>${esc(i.name)}${k === 'items' ? ` <small class="muted">× ${i.qty}</small>` : ' <small class="muted">(typed)</small>'}</td><td>${esc(i.dose)}</td><td>${esc(i.days)}</td><td><button class="link danger" data-act="rx-del" data-id="${k}:${n}" aria-label="Remove">✕</button></td></tr>`).join('') || '<tr><td colspan="4" class="muted center">No medicines added yet</td></tr>'}
      </tbody></table>
      <label class="field"><span>Advice / notes</span><textarea id="rx-notes" rows="2" placeholder="e.g. Drink plenty of fluids, review after 5 days">${esc(rx.notes)}</textarea></label>
      <label class="field"><span>Or upload a handwritten prescription (optional)</span><input type="file" id="rx-upload" accept="image/*,.pdf" /></label>
      ${rx.file ? `<p class="muted small">📎 ${esc(rx.file)}</p>` : ''}
      <button class="btn btn-primary btn-block" data-act="rx-send">Send prescription & dispatch medicines</button>
    </div>`, 'modal-wide');
}

const keepNotes = () => { const n = document.getElementById('rx-notes'); if (n) rx.notes = n.value; };

/* ─────────────── Medical shop ─────────────── */
function shopDash(me) {
  const orders = S().orders.filter((o) => o.shopId === me.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const active = orders.filter((o) => o.status !== 'delivered');
  const done = orders.filter((o) => o.status === 'delivered');
  const card = (o) => {
    const appt = o.appointmentId && S().appointments.find((a) => a.id === o.appointmentId);
    const rider = o.riderId && byId(DELIVERY, o.riderId);
    return `<div class="row-card card col">
      <div class="oc-top"><b>#${o.id}</b><span class="status s-${o.status}">${statusLabel[o.status]}</span></div>
      <p class="small">👤 ${esc(o.customer.name)} · 📍 ${o.distanceKm.toFixed(1)} km · placed ${fmtTime(o.createdAt)}</p>
      <ul class="item-list">${o.items.map((i) => `<li><img class="med-photo xs" src="assets/photos/products/${i.id}.webp" alt="" loading="lazy" />${esc(i.name)} <b>× ${i.qty}</b>${me.out.includes(i.id) ? ' <span class="warn-tag">out of stock</span>' : ''}</li>`).join('')}${o.custom.map((i) => `<li>${esc(i.name)} <small class="muted">(typed by doctor — set price on bill)</small></li>`).join('')}</ul>
      ${appt ? `<p class="small">📄 Prescribed by ${esc(byId(DOCTORS, appt.doctorId).name)} <button class="link" data-act="view-rx" data-id="${appt.id}">view</button></p>` : o.rxFile ? `<p class="small">📄 Customer uploaded: ${esc(o.rxFile)}</p>` : ''}
      ${rider ? `<p class="small">🛵 Rider: ${esc(rider.name)}</p>` : ''}
      <div class="oc-foot"><span>${inr(o.total)} · COD</span>
        ${o.status === 'placed' ? `<button class="btn btn-sm btn-primary" data-act="p-advance" data-id="${o.id}">Accept order</button>` : ''}
        ${o.status === 'accepted' ? `<button class="btn btn-sm btn-primary" data-act="p-advance" data-id="${o.id}">Packed · call rider</button>` : ''}
      </div></div>`;
  };
  const body = `
    <h2>Live orders</h2>
    <div class="grid grid-orders">${active.length ? active.map(card).join('') : emptyDash('🏪', 'No live orders', 'Orders from customers in your hex zone show up here. Out-of-stock items route customers to the next nearest shop.')}</div>
    ${done.length ? `<h2>Delivered</h2><div class="grid grid-orders">${done.slice(0, 6).map(card).join('')}</div>` : ''}
    <h2>Stock alerts</h2>
    <div class="card"><p class="muted small">These items are marked out of stock, so the hex search skips your shop for orders containing them.</p>
    <div class="chips">${me.out.length ? me.out.map((id) => `<span class="chip">⚠️ ${esc(byId(MEDICINES, id).name)}</span>`).join('') : '<span class="chip on">✅ Everything in stock</span>'}</div></div>`;
  return shell('shop', me, [[active.filter((o) => o.status === 'placed').length, 'New'], [active.length, 'Active'], [done.length, 'Delivered'], [inr(done.reduce((s, o) => s + o.total, 0)), 'Sales']], body);
}

/* ─────────────── Delivery partner ─────────────── */
function deliveryDash(me) {
  gpsResume(me.id);
  const mine = S().orders.filter((o) => o.riderId === me.id);
  const active = mine.filter((o) => o.status === 'ready' || o.status === 'picked');
  const done = mine.filter((o) => o.status === 'delivered');
  const on = gpsSharing(me.id);
  const body = `
    <div class="card gps-card ${on ? 'on' : ''}">
      <span class="gps-ico">${on ? '📡' : '📍'}</span>
      <div><b>Live location ${on ? 'sharing is ON' : 'sharing is off'}</b><p class="muted small" data-live="rgps:${me.id}"></p></div>
      <button class="btn ${on ? 'btn-ghost' : 'btn-primary'}" data-act="gps-toggle" data-id="${me.id}">${on ? 'Stop sharing' : '📡 Share live location'}</button>
    </div>
    <h2>Active deliveries</h2>
    <div class="row-list">${active.length ? active.map((o) => {
      const shop = byId(SHOPS, o.shopId);
      return `<div class="card deliver-card">
        <div class="deliver-info">
          <div class="oc-top"><b>#${o.id}</b><span class="status s-${o.status}">${statusLabel[o.status]}</span></div>
          <div class="rnav"><b data-live="rnav:${o.id}"></b><span class="lc-eta"><small>ETA</small><b data-live="rnav-min:${o.id}"></b></span></div>
          <div class="leg"><span class="leg-dot a"></span><div><small class="muted" data-live="rpick:${o.id}">PICK UP</small><b>${esc(shop.name)}</b><p class="muted small">${esc(shop.area)}</p></div></div>
          <div class="leg"><span class="leg-dot b"></span><div><small class="muted" data-live="rdrop:${o.id}">DROP</small><b>${esc(o.customer.name)}</b><p class="muted small">${esc(o.customer.address)}</p></div></div>
          <p class="small">💵 Collect <b>${inr(o.total)}</b> cash · ${o.items.length + o.custom.length} item(s)</p>
          <div class="rc-actions">${o.status === 'ready'
            ? `<button class="btn btn-primary" data-act="p-advance" data-id="${o.id}">✔ Picked up from shop</button>`
            : `<a class="btn btn-ghost" href="tel:${esc(o.customer.phone)}">📞 Call customer</a><button class="btn btn-primary" data-act="p-advance" data-id="${o.id}">✔ Mark delivered</button>`}</div>
        </div>
        <div class="deliver-map"><div class="live-map" data-livemap="rider:${me.id}:${o.id}"></div><small class="muted map-src" data-live="rnav-src:${o.id}"></small></div>
      </div>`;
    }).join('') : emptyDash('🛵', 'No active deliveries', 'When a pharmacy near you packs an order, you are auto-assigned by hex search and it appears here.')}</div>
    ${done.length ? `<h2>Completed today</h2><div class="row-list">${done.map((o) => `<div class="row-card card"><div class="rc-main"><span>✅</span><div><b>#${o.id} · ${esc(o.customer.name)}</b><p class="muted small">Delivered ${fmtTime(o.timeline.at(-1).at)}</p></div></div><span class="price">+ ₹30</span></div>`).join('')}</div>` : ''}`;
  return shell('delivery', me, [[active.length, 'Active'], [done.length, 'Delivered'], [inr(done.length * 30), 'Earnings'], ['4.9 ★', 'Rating']], body);
}

/* ─────────────── Lab ─────────────── */
function labDash(me) {
  const bookings = S().labBookings.filter((b) => b.labId === me.id).sort((a, b) => (a.date + a.slot).localeCompare(b.date + b.slot));
  const open = bookings.filter((b) => b.status !== 'report');
  const done = bookings.filter((b) => b.status === 'report');
  const row = (b) => `<div class="row-card card">
    <div class="rc-main"><span class="test-icon">${labArt(byId(TESTS, b.testId).cat, 44)}</span><div><b>${esc(byId(TESTS, b.testId).name)}</b>
    <p class="muted small">👤 ${esc(b.patient.name)} · ${fmtDate(b.date)} ${b.slot} · ${b.home ? `🏠 ${esc(b.patient.address)}` : '🏥 Walk-in'}</p></div></div>
    <div class="rc-actions"><span class="price">${inr(b.price)}</span>
      ${b.status === 'booked' && b.home ? `<button class="btn btn-sm btn-primary" data-act="lab-enroute" data-id="${b.id}">🛵 Start home visit</button>` : ''}
      ${b.status === 'enroute' ? '<span class="status s-picked">On the way</span>' : ''}
      ${(b.status === 'booked' && !b.home) || b.status === 'enroute' ? `<button class="btn btn-sm btn-primary" data-act="lab-collect" data-id="${b.id}">Sample collected</button>` : ''}
      ${b.status === 'collected' ? `<button class="btn btn-sm btn-primary" data-act="lab-report" data-id="${b.id}">Upload report</button>` : ''}
      ${b.status === 'report' ? '<span class="status s-report">Report sent</span>' : ''}</div></div>`;
  const body = `
    <h2>Bookings</h2><div class="row-list">${open.length ? open.map(row).join('') : emptyDash('🧪', 'No pending bookings', 'Bookings appear when customers pick your lab for a test.')}</div>
    ${done.length ? `<h2>Reports delivered</h2><div class="row-list">${done.map(row).join('')}</div>` : ''}
    <h2>Your price list</h2>
    <div class="card price-table">${Object.entries(me.prices).map(([id, p]) => {
      const all = LABS.map((l) => l.prices[id]).filter(Boolean); const min = Math.min(...all);
      return `<div class="sum-row"><span>${esc(byId(TESTS, id).name)}</span><span>${inr(p)} ${p === min ? '<span class="best">Lowest in network</span>' : `<small class="muted">lowest ${inr(min)}</small>`}</span></div>`;
    }).join('')}</div>`;
  return shell('lab', me, [[open.length, 'Pending'], [open.filter((b) => b.status === 'collected').length, 'Processing'], [done.length, 'Reports'], [inr(bookings.reduce((s, b) => s + b.price, 0)), 'Revenue']], body);
}

/* ─────────────── route entry ─────────────── */
const DASH = { doctor: doctorDash, shop: shopDash, delivery: deliveryDash, lab: labDash };

export function renderDashboard({ role }) {
  const r = ROLES[role];
  if (!r) return '<section class="wrap section"><p>Unknown partner type.</p></section>';
  const { partner } = S();
  if (!partner || partner.role !== role) {
    return `<section class="wrap section"><div class="empty"><div class="empty-icon">${r.icon}</div><h3>${r.title} login required</h3><p class="muted">Login with your registered partner account to open this dashboard.</p><button class="btn btn-primary" data-act="partner-login" data-id="${role}">Login as ${r.title}</button></div></section>`;
  }
  const me = byId(r.list, partner.id);
  if (!me || me.status !== 'verified') {
    return `<section class="wrap section"><div class="empty"><div class="empty-icon">⏸</div><h3>Account not active</h3><p class="muted">Your partner account is ${me ? (me.status === 'removed' ? 'removed' : 'awaiting verification or suspended') : 'not found'}. Please contact the Beekey team.</p><button class="btn btn-ghost" data-act="partner-logout">Log out</button></div></section>`;
  }
  return DASH[role](me);
}

export const partnerActions = {
  'p-advance': ({ id }) => {
    advanceOrder(id);
    const o = S().orders.find((x) => x.id === id);
    const msg = { accepted: () => 'Order accepted — start packing', ready: () => `Rider ${byId(DELIVERY, o.riderId).name} assigned via hex search`, picked: () => 'Picked up — customer notified', delivered: () => 'Delivered! 🎉 +₹30' }[o.status];
    if (msg) toast(msg());
    render();
  },
  'gps-toggle': ({ id }) => {
    if (gpsSharing(id)) { gpsStop(); toast('Live location sharing stopped'); }
    else if (gpsStart(id)) toast('📡 Sharing your live location — customers can follow you on the map');
    render();
  },
  'rx-open': ({ id }) => { rx = { apptId: id, items: [], custom: [], notes: '', file: '' }; rxModal(); },
  'rx-add': () => {
    keepNotes();
    const id = document.getElementById('rx-med').value;
    if (!id) return toast('Select a medicine first', 'warn');
    const m = byId(MEDICINES, id);
    const qty = Math.max(1, parseInt(document.getElementById('rx-qty').value, 10) || 1);
    rx.items.push({ id, name: m.name, price: m.price, qty, dose: document.getElementById('rx-dose').value.trim() || 'As directed', days: document.getElementById('rx-days').value.trim() });
    rxModal();
  },
  'rx-add-custom': () => {
    keepNotes();
    const name = document.getElementById('rx-cname').value.trim();
    if (!name) return toast('Type the medicine name', 'warn');
    rx.custom.push({ name, dose: document.getElementById('rx-cdose').value.trim() || 'As directed', days: document.getElementById('rx-cdays').value.trim() });
    rxModal();
  },
  'rx-del': ({ id }) => { keepNotes(); const [k, n] = id.split(':'); rx[k].splice(+n, 1); rxModal(); },
  'rx-send': () => {
    keepNotes();
    if (!rx.items.length && !rx.custom.length && !rx.file) return toast('Add at least one medicine or upload a prescription', 'warn');
    const a = S().appointments.find((x) => x.id === rx.apptId);
    const patient = customers.get(a.patient.phone) || { id: a.userId, name: a.patient.name, phone: a.patient.phone, address: 'Address on file', x: 0.6, y: 0.6 };
    const prescription = { items: rx.items.map(({ name, dose, days }) => ({ name, dose, days })), custom: rx.custom, notes: rx.notes.trim(), file: rx.file, at: now() };
    let orderId = null, msg = 'Prescription sent to patient';
    if (rx.items.length || rx.custom.length) {
      const order = createMedicineOrder({ user: patient, items: rx.items.map(({ id, name, price, qty }) => ({ id, name, price, qty })), custom: rx.custom, source: 'prescription', appointmentId: a.id });
      orderId = order.id;
      msg = `Prescription sent · medicines routed to ${byId(SHOPS, order.shopId).name} (${order.distanceKm.toFixed(1)} km from patient)`;
    }
    store.set(({ appointments }) => ({ appointments: appointments.map((x) => (x.id === a.id ? { ...x, status: 'completed', prescription, orderId } : x)) }));
    rx = null;
    closeModal();
    toast(msg);
    render();
  },
  'lab-enroute': ({ id }) => {
    store.set(({ labBookings }) => ({ labBookings: labBookings.map((b) => (b.id === id ? { ...b, status: 'enroute', enrouteAt: now() } : b)) }));
    toast('Patient notified — they can track you live on the map'); render();
  },
  'lab-collect': ({ id }) => {
    store.set(({ labBookings }) => ({ labBookings: labBookings.map((b) => (b.id === id ? { ...b, status: 'collected' } : b)) }));
    toast('Sample marked as collected'); render();
  },
  'lab-report': ({ id }) => {
    openModal(`<div class="modal-hero"><span class="role-icon">📄</span><div><h2>Upload report</h2><p class="muted">The patient is notified instantly.</p></div></div>
      <div class="modal-body"><label class="field"><span>Report file</span><input type="file" accept=".pdf,image/*" /></label>
      <label class="field"><span>Summary for patient</span><textarea id="rep-note" rows="3" placeholder="e.g. All values within normal range. Vitamin D slightly low."></textarea></label>
      <button class="btn btn-primary btn-block" data-act="lab-report-go" data-id="${id}">Send report</button></div>`);
  },
  'lab-report-go': ({ id }) => {
    const note = document.getElementById('rep-note').value.trim();
    store.set(({ labBookings }) => ({ labBookings: labBookings.map((b) => (b.id === id ? { ...b, status: 'report', reportNote: note } : b)) }));
    closeModal(); toast('Report sent to patient'); render();
  },
};

document.addEventListener('change', (e) => {
  if (e.target.id === 'rx-upload' && rx) { keepNotes(); rx.file = e.target.files[0]?.name || ''; rxModal(); }
});

