// Admin console: verify, add, suspend and remove doctors, labs, medical shops and delivery partners,
// and approve or reject "Apply to join" requests.
// DEMO ONLY: the admin password lives in the browser. A real build must check it on a server.
import { SPECIALTIES, TESTS, LABS, NETWORK_KINDS, syncNetwork, byId } from './data.js';
import { store, uid, now } from './store.js';
import { BRANCHES, branchOf, fromLatLng } from './hex.js';
import { cloud, cloudConfigured } from './db.js';
import { esc, inr, S, openModal, closeModal, toast, render, ROLES, fmtDate } from './app.js';
import { doctorAvatar, specArt, labArt } from './icons-care.js';

const ADMIN_USER = 'admin';
const ADMIN_PASS = 'beekey@2026';
const KIND_LABEL = { doctor: 'Doctors', lab: 'Labs', shop: 'Medical shops', delivery: 'Delivery partners' };
const STATUS_LABEL = { verified: 'Verified', pending: 'Pending', suspended: 'Suspended' };
const state = { tab: 'pending', q: '', branch: 'kochi' };

/* ───────── partner form fields (shared by "Apply to join" and the admin "Add" form) ───────── */
export const PARTNER_FIELDS = {
  doctor: [
    ['name', 'Full name', 'text', { required: true, placeholder: 'e.g. Anjali Menon' }],
    ['phone', 'Mobile number', 'tel', { required: true, pattern: '[0-9]{10}', maxlength: 10 }],
    ['gender', 'Gender', 'select', { options: [['f', 'Female'], ['m', 'Male']] }],
    ['spec', 'Speciality', 'select', { options: SPECIALTIES.map((s) => [s.id, s.name]) }],
    ['qual', 'Qualification', 'text', { required: true, placeholder: 'MBBS, MD (General Medicine)' }],
    ['exp', 'Experience (years)', 'number', { required: true, min: 0, max: 60 }],
    ['fee', 'Consultation fee (₹)', 'number', { required: true, min: 50, max: 5000 }],
    ['langs', 'Languages (comma separated)', 'text', { placeholder: 'English, Malayalam, Hindi' }],
    ['reg', 'Medical council registration no.', 'text', { required: true }],
  ],
  lab: [
    ['name', 'Lab name', 'text', { required: true }],
    ['phone', 'Mobile number', 'tel', { required: true, pattern: '[0-9]{10}', maxlength: 10 }],
    ['city', 'Branch city', 'select', { options: BRANCHES.map((b) => [b.id, b.name]) }],
    ['area', 'Area / locality', 'text', { required: true }],
    ['reg', 'Lab licence / NABL certificate no.', 'text', { required: true }],
    ['nabl', 'NABL accredited', 'checkbox', {}],
    ['home', 'Offers home sample collection', 'checkbox', { checked: true }],
  ],
  shop: [
    ['name', 'Shop name', 'text', { required: true }],
    ['phone', 'Mobile number', 'tel', { required: true, pattern: '[0-9]{10}', maxlength: 10 }],
    ['city', 'Branch city', 'select', { options: BRANCHES.map((b) => [b.id, b.name]) }],
    ['area', 'Area / locality', 'text', { required: true }],
    ['reg', 'Drug licence no.', 'text', { required: true }],
  ],
  delivery: [
    ['name', 'Full name', 'text', { required: true }],
    ['phone', 'Mobile number', 'tel', { required: true, pattern: '[0-9]{10}', maxlength: 10 }],
    ['vehicle', 'Vehicle type & number', 'text', { required: true, placeholder: 'Scooter · KL-07 AB 1234' }],
    ['reg', 'Driving licence no.', 'text', { required: true }],
    ['city', 'Branch city', 'select', { options: BRANCHES.map((b) => [b.id, b.name]) }],
    ['area', 'Preferred area', 'text', {}],
  ],
};

export function fieldsHTML(kind) {
  return PARTNER_FIELDS[kind].map(([name, label, type, o]) => {
    if (type === 'select') return `<label class="field"><span>${label}</span><select name="${name}">${o.options.map(([v, t]) => `<option value="${v}">${esc(t)}</option>`).join('')}</select></label>`;
    if (type === 'checkbox') return `<label class="check"><input type="checkbox" name="${name}" ${o.checked ? 'checked' : ''} /> <span>${label}</span></label>`;
    const attrs = ['required', 'pattern', 'maxlength', 'min', 'max', 'placeholder'].filter((k) => o[k] !== undefined).map((k) => (o[k] === true ? k : `${k}="${esc(o[k])}"`)).join(' ');
    return `<label class="field"><span>${label}</span><input name="${name}" type="${type === 'tel' ? 'text' : type}" ${type === 'tel' ? 'inputmode="numeric"' : ''} ${attrs} /></label>`;
  }).join('');
}

export const formData = (form) => {
  const d = Object.fromEntries(new FormData(form));
  form.querySelectorAll('input[type=checkbox]').forEach((c) => (d[c.name] = c.checked));
  return d;
};

/* ───────── network helpers ───────── */
// New partners are placed a few km from their branch centre (a real build would geocode their address).
const jitter = (city) => { const b = BRANCHES.find((x) => x.id === city) || BRANCHES[0]; const a = Math.random() * Math.PI * 2, r = 0.6 + Math.random() * 3.6; return { x: +(b.x + Math.cos(a) * r).toFixed(3), y: +(b.y + Math.sin(a) * r).toFixed(3), city: b.id }; };
const averagePrices = () => {
  const out = {};
  for (const t of TESTS) {
    const ps = LABS.map((l) => l.prices[t.id]).filter(Boolean);
    if (ps.length) out[t.id] = Math.round(ps.reduce((a, b) => a + b, 0) / ps.length / 10) * 10 - 1;
  }
  return out;
};

/** Turn submitted form data into a partner record. */
export function buildPartner(kind, d, status = 'verified') {
  const base = { status, joined: new Date().toLocaleDateString('en-CA'), phone: d.phone, reg: d.reg, rating: null, reviews: 0, ...(status === 'verified' ? { verifiedOn: new Date().toLocaleDateString('en-CA') } : {}) };
  if (kind === 'doctor') {
    const name = /^dr\.?\s/i.test(d.name) ? d.name : `Dr. ${d.name}`;
    return { ...base, id: uid('d'), name, spec: d.spec || 'general', exp: +d.exp || 0, fee: +d.fee || 299, qual: d.qual || 'MBBS',
      langs: (d.langs || 'English').split(',').map((s) => s.trim()).filter(Boolean), gender: d.gender || 'f',
      look: d.gender === 'm' ? ['m', 'short', 2, 0] : ['f', 'long', 1, 0] };
  }
  if (kind === 'lab') return { ...base, id: uid('l'), name: d.name, area: d.area, nabl: !!d.nabl, home: !!d.home, prices: averagePrices(), ...jitter(d.city) };
  if (kind === 'shop') return { ...base, id: uid('s'), name: d.name, area: d.area, out: [], ...jitter(d.city) };
  return { ...base, id: uid('r'), name: d.name, vehicle: d.vehicle, area: d.area || '', phone: `+91 ${d.phone}`, ...jitter(d.city) };
}

function updateNetwork(fn) {
  const net = structuredClone(S().network);
  fn(net);
  store.set({ network: net });
  syncNetwork(net);
}

/* ───────── views ───────── */
function loginView() {
  return `<section class="wrap section narrow admin-login">
    <div class="card">
      <div class="admin-lock">🛡️</div>
      <h1>Admin login</h1>
      <p class="muted">For the Beekey team only — verify and manage doctors, labs, pharmacies and riders.</p>
      <form data-form="admin-login">
        <label class="field"><span>Username</span><input name="user" autocomplete="username" required /></label>
        <label class="field"><span>Password</span><input name="pass" type="password" autocomplete="current-password" required /></label>
        <button class="btn btn-primary btn-block">Login to admin console</button>
      </form>
      <p class="hint">Demo build: <b>${ADMIN_USER}</b> / <b>${ADMIN_PASS}</b></p>
    </div>
  </section>`;
}

const pill = (st) => `<span class="status s-${st === 'verified' ? 'completed' : st === 'suspended' ? 'cancelled' : 'placed'}">${STATUS_LABEL[st] || st}</span>`;

function partnerIcon(kind, p) {
  if (kind === 'doctor') return `<span class="avatar sm">${doctorAvatar(p, 44)}</span>`;
  if (kind === 'lab') return `<span class="admin-ic">${labArt('blood', 34)}</span>`;
  return `<span class="admin-ic">${kind === 'shop' ? '🏪' : '🛵'}</span>`;
}

function partnerDetails(kind, p) {
  if (kind === 'doctor') { const sp = byId(SPECIALTIES, p.spec); return `${sp ? sp.name : p.spec} · ${p.exp} yrs · ${inr(p.fee)} · ${esc(p.qual || '')}`; }
  if (kind === 'lab') return `📍 ${branchOf(p).name} · ${esc(p.area || '—')} · ${p.nabl ? '🏅 NABL' : 'Not NABL'} · ${p.home ? '🏠 Home collection' : 'Lab visit only'} · ${Object.keys(p.prices || {}).length} tests`;
  if (kind === 'shop') return `📍 ${branchOf(p).name} · ${esc(p.area || '—')} · ${(p.out || []).length} items out of stock`;
  return `📍 ${branchOf(p).name} · ${esc(p.vehicle || '')}${p.area ? ' · ' + esc(p.area) : ''}`;
}

function partnerRow(kind, p) {
  const id = `${kind}:${p.id}`;
  const act = p.status === 'verified'
    ? `<button class="btn btn-sm btn-ghost" data-act="admin-status" data-id="${id}:suspended">⏸ Suspend</button>`
    : `<button class="btn btn-sm btn-primary" data-act="admin-status" data-id="${id}:verified">✔ Verify</button>`;
  return `<div class="row-card card admin-row">
    <div class="rc-main">${partnerIcon(kind, p)}<div><b>${esc(p.name)}</b> ${pill(p.status)}
      <p class="muted small">${partnerDetails(kind, p)}</p>
      <p class="muted small">📞 ${esc(p.phone || '—')} · Licence/Reg: ${esc(p.reg || 'on file')} · Joined ${p.joined ? fmtDate(p.joined) : '—'}</p></div></div>
    <div class="rc-actions">${act}<button class="btn btn-sm btn-ghost danger" data-act="admin-remove" data-id="${id}">🗑 Remove</button></div>
  </div>`;
}

function applicationCard(a) {
  const kind = a.role, r = ROLES[kind], d = a.data || a;
  const details = PARTNER_FIELDS[kind].filter(([k]) => !['name', 'phone'].includes(k) && d[k] !== undefined && d[k] !== '')
    .map(([k, label, type, o]) => {
      let v = d[k];
      if (type === 'select') v = (o.options.find(([val]) => val === v) || [, v])[1];
      if (type === 'checkbox') v = v ? 'Yes' : 'No';
      return `<span><small class="muted">${label}</small><b>${esc(v)}</b></span>`;
    }).join('');
  return `<div class="card admin-app">
    <div class="oc-top"><div class="rc-main"><span class="admin-ic">${r.icon}</span><div><b>${esc(d.name || 'Unnamed')}</b><p class="muted small">${r.title} · applied ${fmtDate(a.createdAt.slice(0, 10))} · 📞 +91 ${esc(d.phone || '—')}</p></div></div>${pill('pending')}</div>
    <div class="admin-kv">${details || '<span class="muted small">No extra details</span>'}</div>
    <div class="rc-actions"><button class="btn btn-sm btn-primary" data-act="admin-approve" data-id="${a.id}">✔ Approve & verify</button><button class="btn btn-sm btn-ghost danger" data-act="admin-reject" data-id="${a.id}">✕ Reject</button></div>
  </div>`;
}

export function renderAdmin() {
  const st = S();
  if (!st.admin) return loginView();
  const net = st.network;
  const apps = st.applications.filter((a) => a.status === 'under review');
  const all = Object.keys(NETWORK_KINDS).flatMap((k) => net[k].filter((p) => p.status !== 'removed'));
  const count = (k) => net[k].filter((p) => p.status !== 'removed').length;
  const live = st.orders.filter((o) => o.status === 'ready' || o.status === 'picked');
  const tabs = [['pending', '📥 Pending', apps.length], ['map', '🗺️ Live map', live.length], ...Object.keys(NETWORK_KINDS).map((k) => [k, `${ROLES[k].icon} ${KIND_LABEL[k]}`, count(k)])];
  let body;
  if (state.tab === 'pending') {
    body = apps.length ? `<div class="row-list">${apps.map(applicationCard).join('')}</div>`
      : `<div class="empty small-empty"><div class="empty-icon">📭</div><h3>No pending applications</h3><p class="muted">“Apply to join” requests from the Partner page appear here for verification.</p></div>`;
  } else if (state.tab === 'map') {
    body = `<div class="card map-card"><div class="map-head"><b>Network & live trips</b><span class="muted small"><span class="live-dot"></span> ${live.length} active deliver${live.length === 1 ? 'y' : 'ies'} · ${NETWORK_KINDS.delivery.length} riders online</span></div>
      <div class="branch-tabs">${BRANCHES.map((b) => `<button class="chip ${state.branch === b.id ? 'on' : ''}" data-act="admin-branch" data-id="${b.id}">📍 ${b.name} <small>${[...NETWORK_KINDS.shop, ...NETWORK_KINDS.lab, ...NETWORK_KINDS.delivery].filter((p) => branchOf(p).id === b.id).length}</small></button>`).join('')}</div>
      <div class="live-map tall" data-livemap="fleet:${state.branch}"></div>
      <div class="map-legend"><span><i class="lg-shop"></i>Pharmacies</span><span><i class="lg-lab"></i>Labs</span><span><i class="lg-rider"></i>Riders</span><span><i class="lg-drop"></i>Active trip</span></div></div>
      ${live.length ? `<div class="row-list">${live.map((o) => `<a class="row-card card" href="#/track/${o.id}"><div class="rc-main"><span>🛵</span><div><b>#${esc(o.id)} · ${esc(o.customer.name)}</b><p class="muted small">${esc(byId(NETWORK_KINDS.delivery, o.riderId)?.name || 'Rider')} · ${o.status === 'ready' ? 'heading to pharmacy' : 'out for delivery'}</p></div></div><span class="see-all">Watch →</span></a>`).join('')}</div>` : ''}`;
  } else {
    const q = state.q.trim().toLowerCase();
    const list = net[state.tab].filter((p) => p.status !== 'removed' && (!q || p.name.toLowerCase().includes(q) || (p.area || '').toLowerCase().includes(q)))
      .sort((a, b) => ({ pending: 0, suspended: 1, verified: 2 }[a.status] - { pending: 0, suspended: 1, verified: 2 }[b.status]) || a.name.localeCompare(b.name));
    body = `<div class="admin-tools"><div class="search-row slim"><span>🔍</span><input id="admin-q" placeholder="Search ${KIND_LABEL[state.tab].toLowerCase()}…" value="${esc(state.q)}" /></div>
      <button class="btn btn-primary" data-act="admin-add" data-id="${state.tab}">＋ Add ${ROLES[state.tab].title.toLowerCase()}</button></div>
      <div class="row-list">${list.length ? list.map((p) => partnerRow(state.tab, p)).join('') : '<p class="muted center">No partners match.</p>'}</div>`;
  }
  return `
  <section class="dash-hero">
    <div class="wrap dash-head">
      <div class="dash-id"><span class="role-icon">🛡️</span><div><span class="eyebrow">Admin console</span><h1>Beekey network</h1><p class="muted">Verify partners before patients can see them.</p><p class="small">${cloud.on ? '☁️ <b>Shared database connected</b> — changes reach every phone instantly' : cloudConfigured() ? `⚠️ <b>Database unreachable</b> — working on this device only${cloud.error ? ` (${esc(cloud.error)})` : ''}` : '📱 <b>Demo mode</b> — data stays on this device (add Supabase keys in js/config.js)'}</p></div></div>
      <div class="dash-actions"><button class="btn btn-sm btn-ghost" data-act="admin-logout">Log out</button></div>
    </div>
    <div class="wrap stats">
      <div class="stat"><b>${all.filter((p) => p.status === 'verified').length}</b><span>Verified partners</span></div>
      <div class="stat"><b>${apps.length + all.filter((p) => p.status === 'pending').length}</b><span>Awaiting verification</span></div>
      <div class="stat"><b>${all.filter((p) => p.status === 'suspended').length}</b><span>Suspended</span></div>
      <div class="stat"><b>${st.orders.length + st.appointments.length + st.labBookings.length}</b><span>Orders & bookings</span></div>
    </div>
  </section>
  <section class="wrap section dash-body">
    <div class="tabs admin-tabs" role="tablist">${tabs.map(([k, l, n]) => `<button role="tab" class="tab ${state.tab === k ? 'on' : ''}" data-act="admin-tab" data-id="${k}">${l}<span>${n}</span></button>`).join('')}</div>
    ${body}
    <p class="muted small admin-note">Only <b>verified</b> partners are visible to patients and can log in. Suspended partners are hidden until re-verified; removed partners stay in old order history.</p>
  </section>`;
}

/* ───────── actions & forms ───────── */
function addModal(kind) {
  const r = ROLES[kind];
  openModal(`
    <div class="modal-hero"><span class="role-icon">${kind === 'doctor' ? specArt('general', 40) : kind === 'lab' ? labArt('blood', 40) : r.icon}</span><div><h2>Add ${r.title.toLowerCase()}</h2><p class="muted">Added by admin — goes live as verified immediately.</p></div></div>
    <form class="modal-body" data-form="admin-add" data-kind="${kind}">${fieldsHTML(kind)}
      <button class="btn btn-primary btn-block">Add & verify</button></form>`, 'modal-login');
}

export const adminActions = {
  'admin-logout': () => { store.set({ admin: false }); toast('Logged out of admin'); render(); },
  'admin-branch': ({ id }) => { state.branch = id; render(); },
  'admin-tab': ({ id }) => { state.tab = id; state.q = ''; render(); },
  'admin-add': ({ id }) => addModal(id),
  'admin-status': ({ id }) => {
    const [kind, pid, status] = id.split(':');
    updateNetwork((net) => { const p = net[kind].find((x) => x.id === pid); p.status = status; if (status === 'verified') p.verifiedOn = new Date().toLocaleDateString('en-CA'); });
    const p = S().network[kind].find((x) => x.id === pid);
    toast(status === 'verified' ? `${p.name} is verified and live` : `${p.name} suspended — hidden from patients`, status === 'verified' ? 'ok' : 'warn');
    render();
  },
  'admin-remove': ({ id }) => {
    const [kind, pid] = id.split(':');
    const p = S().network[kind].find((x) => x.id === pid);
    if (!confirm(`Remove ${p.name} from the Beekey network?`)) return;
    updateNetwork((net) => { net[kind].find((x) => x.id === pid).status = 'removed'; });
    if (S().partner?.id === pid) store.set({ partner: null });
    toast(`${p.name} removed`, 'warn'); render();
  },
  'admin-approve': ({ id }) => {
    const a = S().applications.find((x) => x.id === id);
    const p = buildPartner(a.role, a.data || a, 'verified');
    updateNetwork((net) => net[a.role].push(p));
    store.set(({ applications }) => ({ applications: applications.map((x) => (x.id === id ? { ...x, status: 'approved', partnerId: p.id } : x)) }));
    toast(`${p.name} approved — they can now log in as a partner`); render();
  },
  'admin-reject': ({ id }) => {
    store.set(({ applications }) => ({ applications: applications.map((x) => (x.id === id ? { ...x, status: 'rejected' } : x)) }));
    toast('Application rejected', 'warn'); render();
  },
};

/** Handles admin forms. Returns true if the form was an admin form. */
export function handleAdminSubmit(form) {
  if (form.dataset.form === 'admin-login') {
    const d = formData(form);
    if (d.user.trim() !== ADMIN_USER || d.pass !== ADMIN_PASS) { toast('Wrong username or password', 'warn'); return true; }
    store.set({ admin: true }); toast('Welcome to the admin console'); render();
    return true;
  }
  if (form.dataset.form === 'admin-add') {
    const kind = form.dataset.kind, p = buildPartner(kind, formData(form), 'verified');
    updateNetwork((net) => net[kind].push(p));
    closeModal(); state.tab = kind; toast(`${p.name} added and verified`); render();
    return true;
  }
  return false;
}

document.addEventListener('input', (e) => {
  if (e.target.id !== 'admin-q') return;
  state.q = e.target.value;
  const pos = e.target.selectionStart;
  render();
  const el = document.getElementById('admin-q'); if (el) { el.focus(); el.setSelectionRange(pos, pos); }
});
