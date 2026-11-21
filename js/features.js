// Customer features: prescription upload, reorder & refill, verified badges + reviews,
// family profiles and medicine reminders.
import { askLocation } from './livemap.js';
import { MEDICINES, SHOPS, DOCTORS, LABS, byId } from './data.js';
import { store, uid, now, customers } from './store.js';
import { esc, inr, S, openModal, closeModal, toast, render, requireLogin, createMedicineOrder } from './app.js';

/* ═════════ Verified badge & ratings ═════════ */
export const verified = (label = 'Verified') => `<span class="vbadge" title="Licence / registration checked by Beekey">✔ ${label}</span>`;

/** Rating = seed rating blended with reviews written in the app. */
export function ratingOf(p) {
  const mine = S().reviews.filter((r) => r.targetId === p.id);
  const baseN = p.reviews || 0, baseR = p.rating || 0;
  const n = baseN + mine.length;
  if (!n) return { r: null, n: 0 };
  return { r: (baseR * baseN + mine.reduce((s, x) => s + x.stars, 0)) / n, n };
}
export function starsOf(p, withCount = true) {
  const { r, n } = ratingOf(p);
  if (!r) return '<span class="rating new">New</span>';
  return `<span class="rating">★ ${r.toFixed(1)}</span>${withCount ? `<span class="muted small">(${n})</span>` : ''}`;
}
export function reviewsList(p, max = 3) {
  const list = S().reviews.filter((r) => r.targetId === p.id).sort((a, b) => b.at.localeCompare(a.at)).slice(0, max);
  if (!list.length) return '';
  return `<div class="reviews"><h4>What patients say</h4>${list.map((r) => `<div class="review"><div><b>${esc(r.by)}</b> <span class="stars-sm">${'★'.repeat(r.stars)}${'☆'.repeat(5 - r.stars)}</span></div>${r.text ? `<p>${esc(r.text)}</p>` : ''}</div>`).join('')}</div>`;
}
const reviewed = (refId) => S().reviews.some((r) => r.refId === refId);
/** "Rate" button shown after a delivered order / finished consult / report. */
export const rateButton = (kind, targetId, refId, label) => reviewed(refId)
  ? '<span class="muted small">✓ Thanks for your review</span>'
  : `<button class="btn btn-sm btn-ghost" data-act="review-open" data-id="${kind}|${targetId}|${refId}">⭐ ${label}</button>`;

function reviewModal(kind, targetId, refId) {
  const list = { doctor: DOCTORS, lab: LABS, shop: SHOPS }[kind];
  const p = byId(list, targetId);
  openModal(`<form class="success review-form" data-form="review" data-kind="${kind}" data-target="${targetId}" data-ref="${refId}">
    <div class="success-icon">⭐</div><h2>Rate ${esc(p.name)}</h2>
    <div class="star-pick" role="radiogroup" aria-label="Stars">${[1, 2, 3, 4, 5].map((n) => `<label><input type="radio" name="stars" value="${n}" ${n === 5 ? 'checked' : ''} /><span>★</span></label>`).join('')}</div>
    <label class="field" style="width:100%"><span>Tell others about your experience (optional)</span><textarea name="text" rows="3" maxlength="300"></textarea></label>
    <button class="btn btn-primary">Submit review</button></form>`);
}

/* ═════════ Family profiles ═════════ */
export const RELATIONS = ['Mother', 'Father', 'Spouse', 'Son', 'Daughter', 'Grandparent', 'Sibling', 'Other'];
export const members = (user) => [{ id: 'self', name: user.name, relation: 'You' }, ...(user.family || [])];
export const fstate = { patient: 'self' };
export const patientOf = (user) => members(user).find((m) => m.id === fstate.patient) || members(user)[0];

/** "Booking for" chips — shown on doctor & lab booking once logged in. */
export function forWhom() {
  const { user } = S();
  if (!user) return '<h4>Booking for</h4><div class="chips for-whom"><span class="chip on">🙋 Myself</span><button class="chip add" data-act="family-add">＋ Add family member</button></div>';
  return `<h4>Booking for</h4><div class="chips for-whom">${members(user).map((m) => `<button class="chip ${fstate.patient === m.id ? 'on' : ''}" data-act="pick-patient" data-id="${m.id}">${m.id === 'self' ? '🙋' : '👤'} ${esc(m.name.split(' ')[0])} <small>${esc(m.relation)}</small></button>`).join('')}<button class="chip add" data-act="family-add">＋ Add family</button></div>`;
}

export function familySection(user) {
  return `<div class="card family"><div class="oc-top"><h3>👨‍👩‍👧 Family members</h3><button class="btn btn-sm btn-primary" data-act="family-add">＋ Add</button></div>
    <p class="muted small">Book consultations and lab tests for your family from one account.</p>
    ${(user.family || []).length ? (user.family || []).map((m) => `<div class="party"><span>👤</span><div><b>${esc(m.name)}</b><p class="muted small">${esc(m.relation)}${m.age ? ` · ${esc(m.age)} yrs` : ''}</p></div><button class="link danger" data-act="family-remove" data-id="${m.id}">Remove</button></div>`).join('') : '<p class="muted small">No family members added yet.</p>'}
  </div>`;
}

function saveUser(user) {
  customers.save(user);
  store.set({ user });
}

/* ═════════ Prescription upload ═════════ */
let upload = { file: '', note: '' };
export function rxUploadCard() {
  return `<div class="rx-hero card reveal">
    <div class="rx-hero-ic">📷</div>
    <div><h3>Have a prescription? Just snap it.</h3><p class="muted">Upload a photo — the nearest pharmacy reads it, packs your medicines and a rider delivers. No searching needed.</p></div>
    <button class="btn btn-primary" data-act="rx-upload-open">Upload prescription</button>
  </div>`;
}
function rxUploadModal() {
  const { user } = S();
  openModal(`
    <div class="modal-hero"><span class="role-icon">📷</span><div><h2>Upload prescription</h2><p class="muted">We send it to the nearest in-stock pharmacy.</p></div></div>
    <div class="modal-body">
      <label class="rx-upload card ${upload.file ? 'done' : ''}"><input type="file" id="rxu-file" accept="image/*,.pdf" capture="environment" hidden /><span>📄</span><div><b>${upload.file ? 'Prescription attached' : 'Take a photo or choose a file'}</b><p class="muted small">${upload.file ? esc(upload.file) : 'JPG, PNG or PDF · must be signed by a registered doctor'}</p></div><span class="btn btn-sm btn-ghost">${upload.file ? 'Change' : 'Choose'}</span></label>
      ${user ? `<label class="field"><span>Medicines for</span><select id="rxu-for">${members(user).map((m) => `<option value="${m.id}">${esc(m.name)} (${esc(m.relation)})</option>`).join('')}</select></label>` : ''}
      <label class="field"><span>Note for the pharmacist (optional)</span><textarea id="rxu-note" rows="2" placeholder="e.g. Only 1 strip of each, call before delivery">${esc(upload.note)}</textarea></label>
      <p class="muted small">💵 You pay on delivery after the pharmacy confirms prices.</p>
      <button class="btn btn-primary btn-block" data-act="rx-upload-send">Send to nearest pharmacy</button>
    </div>`, 'modal-login');
}

/* ═════════ Reorder & refill ═════════ */
export function reorder(orderId) {
  const o = S().orders.find((x) => x.id === orderId);
  const items = o.items.filter((i) => byId(MEDICINES, i.id));
  if (!items.length) return toast('This order was from a prescription upload — please upload it again', 'warn');
  store.set(({ cart }) => {
    const next = [...cart];
    for (const i of items) { const ex = next.find((c) => c.id === i.id); ex ? (ex.qty += i.qty) : next.push({ id: i.id, qty: i.qty }); }
    return { cart: next };
  });
  toast(`${items.length} item(s) added to cart`);
  location.hash = '#/cart';
}
/** Home-page card suggesting to reorder the user's last delivered medicines. */
export function refillCard() {
  const { user, orders } = S();
  if (!user) return '';
  const last = orders.filter((o) => o.userId === user.id && o.status === 'delivered' && o.items.some((i) => byId(MEDICINES, i.id))).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  if (!last) return '';
  const names = last.items.map((i) => i.name).slice(0, 3).join(', ');
  return `<section class="wrap section"><div class="refill card reveal"><span class="refill-ic">↻</span><div><b>Running low on your medicines?</b><p class="muted small">${esc(names)}${last.items.length > 3 ? '…' : ''} · last delivered ${new Date(last.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p></div><button class="btn btn-primary btn-sm" data-act="reorder" data-id="${last.id}">Order again</button></div></section>`;
}

/* ═════════ Medicine reminders ═════════ */
const SLOT_TIMES = ['08:00', '14:00', '21:00'];
/** "1-0-1 after food" → ['08:00','21:00'] */
function timesFromDose(dose = '') {
  const m = dose.match(/([01])\s*-\s*([01])\s*-\s*([01])/);
  if (m) { const t = SLOT_TIMES.filter((_, i) => m[i + 1] === '1'); if (t.length) return t; }
  return ['09:00'];
}
export function remindersView() {
  const { user, reminders, appointments } = S();
  const mine = reminders.filter((r) => r.userId === user.id);
  const prescribed = appointments.filter((a) => a.userId === user.id && a.prescription)
    .flatMap((a) => [...a.prescription.items, ...a.prescription.custom].map((i) => ({ ...i, for: a.patient.name })))
    .filter((i) => !mine.some((r) => r.name === i.name));
  const perm = 'Notification' in window ? Notification.permission : 'unsupported';
  return `
    ${perm !== 'granted' ? `<div class="card notif-cta"><span>🔔</span><div><b>Turn on reminder alerts</b><p class="muted small">${perm === 'denied' ? 'Notifications are blocked — allow them in your browser settings.' : perm === 'unsupported' ? 'This browser does not support notifications; we will show reminders inside the app.' : 'Get a notification when it is time for your medicine.'}</p></div>${perm === 'default' ? '<button class="btn btn-sm btn-primary" data-act="notif-enable">Enable</button>' : ''}</div>` : ''}
    ${prescribed.length ? `<h3 class="sub-h">From your prescriptions</h3>${prescribed.map((i) => `<div class="row-card card"><div class="rc-main"><span class="admin-ic">💊</span><div><b>${esc(i.name)}</b><p class="muted small">${esc(i.dose || 'As directed')}${i.days ? ` · ${esc(i.days)} days` : ''} · for ${esc(i.for)}</p></div></div><button class="btn btn-sm btn-primary" data-act="rem-add" data-id="${encodeURIComponent(JSON.stringify({ name: i.name, dose: i.dose || '', days: i.days || '' }))}">⏰ Remind me</button></div>`).join('')}` : ''}
    <div class="oc-top sub-h"><h3>My reminders</h3><button class="btn btn-sm btn-ghost" data-act="rem-new">＋ Add reminder</button></div>
    ${mine.length ? mine.map((r) => `<div class="row-card card reminder ${r.on ? '' : 'off'}">
      <div class="rc-main"><span class="admin-ic">⏰</span><div><b>${esc(r.name)}</b><p class="muted small">${esc(r.dose || '')}${r.until ? ` · until ${new Date(r.until).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : ''}</p>
      <div class="times">${r.times.map((t, i) => `<input type="time" value="${t}" data-rem-time="${r.id}:${i}" aria-label="Reminder time" />`).join('')}</div></div></div>
      <div class="rc-actions"><label class="switch"><input type="checkbox" data-rem-toggle="${r.id}" ${r.on ? 'checked' : ''} /><span></span></label><button class="link danger" data-act="rem-del" data-id="${r.id}">Delete</button></div></div>`).join('')
      : '<div class="empty small-empty"><div class="empty-icon">⏰</div><h3>No reminders yet</h3><p class="muted">After a consultation, your prescribed medicines appear above — tap “Remind me”.</p></div>'}`;
}
function addReminder({ name, dose = '', days = '' }) {
  const { user } = S();
  const until = days && +days ? new Date(Date.now() + +days * 864e5).toISOString() : null;
  store.set(({ reminders }) => ({ reminders: [...reminders, { id: uid('RM'), userId: user.id, name, dose, times: timesFromDose(dose), on: true, until, createdAt: now() }] }));
  toast(`Reminder set for ${name}`);
}
// Fires due reminders while the app is open (a real build sends push from the server).
const FIRED_KEY = 'beekey_reminders_fired';
function tick() {
  const { user, reminders } = S();
  if (!user) return;
  const d = new Date(), hhmm = d.toTimeString().slice(0, 5), day = d.toLocaleDateString('en-CA');
  let fired = {}; try { fired = JSON.parse(localStorage.getItem(FIRED_KEY) || '{}'); } catch { /* ignore */ }
  for (const r of reminders.filter((x) => x.userId === user.id && x.on && (!x.until || x.until > d.toISOString()))) {
    for (const t of r.times) {
      const k = `${r.id}@${day}@${t}`;
      if (t === hhmm && !fired[k]) {
        fired[k] = 1;
        const msg = `Time for ${r.name}${r.dose ? ` — ${r.dose}` : ''}`;
        toast(`⏰ ${esc(msg)}`);
        if ('Notification' in window && Notification.permission === 'granted') {
          navigator.serviceWorker?.ready.then((reg) => reg.showNotification('Beekey Medics', { body: msg, icon: 'assets/icon-192.png', tag: k }))
            .catch(() => new Notification('Beekey Medics', { body: msg, icon: 'assets/icon-192.png' }));
        }
      }
    }
  }
  try { localStorage.setItem(FIRED_KEY, JSON.stringify(fired)); } catch { /* ignore */ }
}
setInterval(tick, 20000);

/* ═════════ actions & form handlers ═════════ */
export const featureActions = {
  'review-open': ({ id }) => { const [kind, target, ref] = id.split('|'); reviewModal(kind, target, ref); },
  'pick-patient': ({ id }) => { fstate.patient = id; render(); },
  'family-add': () => requireLogin('Login to add family members.', () => openModal(`
    <div class="modal-hero"><span class="role-icon">👨‍👩‍👧</span><div><h2>Add family member</h2><p class="muted">Book doctors and tests for them from your account.</p></div></div>
    <form class="modal-body" data-form="family">
      <label class="field"><span>Name</span><input name="name" required /></label>
      <label class="field"><span>Relation</span><select name="relation">${RELATIONS.map((r) => `<option>${r}</option>`).join('')}</select></label>
      <label class="field"><span>Age</span><input name="age" type="number" min="0" max="120" /></label>
      <button class="btn btn-primary btn-block">Add member</button></form>`, 'modal-login')),
  'family-remove': ({ id }) => { const user = S().user; saveUser({ ...user, family: (user.family || []).filter((m) => m.id !== id) }); if (fstate.patient === id) fstate.patient = 'self'; render(); },
  'rx-upload-open': () => { upload = { file: '', note: '' }; rxUploadModal(); },
  'rx-upload-send': () => {
    upload.note = document.getElementById('rxu-note')?.value || '';
    if (!upload.file) return toast('Please attach your prescription photo', 'warn');
    const forId = document.getElementById('rxu-for')?.value || 'self';
    requireLogin('Login to send your prescription.', () => {
      askLocation({ title: 'Where should we deliver?', cta: 'Deliver here · send prescription', onConfirm: (user) => {
      const who = members(user).find((m) => m.id === forId) || members(user)[0];
      const order = createMedicineOrder({ user, items: [], custom: [{ name: `Medicines as per uploaded prescription${who.id === 'self' ? '' : ` (for ${who.name})`}`, dose: upload.note }], source: 'upload', rxFile: upload.file });
      if (!order) return;
      store.set(({ rxUploads }) => ({ rxUploads: [...rxUploads, { id: uid('RU'), userId: user.id, file: upload.file, orderId: order.id, at: now() }] }));
      closeModal(); toast(`Prescription sent to ${byId(SHOPS, order.shopId).name}`);
      location.hash = `#/track/${order.id}`;
      } });
    });
  },
  reorder: ({ id }) => reorder(id),
  'notif-enable': async () => { if ('Notification' in window) { await Notification.requestPermission(); render(); } },
  'rem-add': ({ id }) => { addReminder(JSON.parse(decodeURIComponent(id))); render(); },
  'rem-new': () => openModal(`
    <div class="modal-hero"><span class="role-icon">⏰</span><div><h2>New reminder</h2><p class="muted">We remind you at the right time.</p></div></div>
    <form class="modal-body" data-form="reminder">
      <label class="field"><span>Medicine</span><input name="name" list="rem-meds" required /><datalist id="rem-meds">${MEDICINES.map((m) => `<option value="${esc(m.name)}">`).join('')}</datalist></label>
      <label class="field"><span>Dosage pattern</span><select name="dose"><option>1-0-0 (morning)</option><option>0-0-1 (night)</option><option selected>1-0-1 (morning & night)</option><option>1-1-1 (three times)</option></select></label>
      <label class="field"><span>For how many days?</span><input name="days" type="number" min="1" max="365" placeholder="Leave empty for ongoing" /></label>
      <button class="btn btn-primary btn-block">Save reminder</button></form>`, 'modal-login'),
  'rem-del': ({ id }) => { store.set(({ reminders }) => ({ reminders: reminders.filter((r) => r.id !== id) })); render(); },
};

export function handleFeatureSubmit(form) {
  const d = Object.fromEntries(new FormData(form));
  if (form.dataset.form === 'review') {
    const { user } = S();
    store.set(({ reviews }) => ({ reviews: [...reviews, { id: uid('RV'), kind: form.dataset.kind, targetId: form.dataset.target, refId: form.dataset.ref, stars: +d.stars, text: (d.text || '').trim(), by: user ? user.name.split(' ')[0] : 'Patient', at: now() }] }));
    closeModal(); toast('Thanks for your review!'); render(); return true;
  }
  if (form.dataset.form === 'family') {
    const user = S().user;
    const m = { id: uid('FM'), name: d.name.trim(), relation: d.relation, age: d.age };
    saveUser({ ...user, family: [...(user.family || []), m] });
    fstate.patient = m.id; closeModal(); toast(`${m.name} added to your family`); render(); return true;
  }
  if (form.dataset.form === 'reminder') {
    addReminder({ name: d.name.trim(), dose: d.dose, days: d.days }); closeModal(); render(); return true;
  }
  return false;
}

document.addEventListener('change', (e) => {
  const t = e.target;
  if (t.id === 'rxu-file') { upload.file = t.files[0]?.name || ''; upload.note = document.getElementById('rxu-note')?.value || ''; rxUploadModal(); }
  if (t.dataset.remToggle) store.set(({ reminders }) => ({ reminders: reminders.map((r) => (r.id === t.dataset.remToggle ? { ...r, on: t.checked } : r)) }));
  if (t.dataset.remTime) {
    const [id, i] = t.dataset.remTime.split(':');
    store.set(({ reminders }) => ({ reminders: reminders.map((r) => (r.id === id ? { ...r, times: r.times.map((x, k) => (k === +i ? t.value : x)) } : r)) }));
    toast('Reminder time updated');
  }
});
