import {
  SPECIALTIES, DOCTORS, MED_CATEGORIES, MEDICINES, TEST_CATEGORIES, TESTS, LABS, SHOPS, DELIVERY,
  TIME_SLOTS, LAB_SLOTS, byId,
} from './data.js';
import { store, uid, now } from './store.js';
import { hexSearch, hexMapSVG, etaMinutes, km } from './hex.js';
import { renderDashboard, partnerActions } from './partner.js';
import { medArt, catIcon, FORM_LABELS } from './icons.js';
import { specArt, labArt, doctorAvatar } from './icons-care.js';

/* ───────────────────────── helpers ───────────────────────── */
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const inr = (n) => '₹' + Number(n).toLocaleString('en-IN');
export const logo = (size = 40) => `<svg class="logo-mark" width="${size}" height="${size}" aria-hidden="true"><use href="#logo-bee"/></svg>`;
export const S = () => store.get();
const $ = (sel, root = document) => root.querySelector(sel);

export const fmtTime = (iso) => new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
export const fmtDate = (d) => new Date(d + 'T00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });

export function nextDays(n = 6) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const d = new Date(); d.setDate(d.getDate() + i);
    const iso = d.toLocaleDateString('en-CA');
    out.push({ iso, top: i === 0 ? 'Today' : i === 1 ? 'Tmrw' : d.toLocaleDateString('en-IN', { weekday: 'short' }), day: d.getDate(), mon: d.toLocaleDateString('en-IN', { month: 'short' }) });
  }
  return out;
}

const hash = (s) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
function slotState(doctorId, date, slot) {
  const taken = S().appointments.some((a) => a.doctorId === doctorId && a.date === date && a.slot === slot && a.status !== 'cancelled');
  if (taken || hash(doctorId + date + slot) % 4 === 0) return 'booked';
  const today = new Date().toLocaleDateString('en-CA');
  if (date === today) {
    const [h, m] = slot.split(':').map(Number);
    const t = new Date(); t.setHours(h, m, 0, 0);
    if (t.getTime() < Date.now() + 15 * 60e3) return 'past';
  }
  return 'free';
}

const meetCode = () => {
  const a = 'abcdefghijkmnopqrstuvwxyz';
  const r = (n) => Array.from({ length: n }, () => a[Math.floor(Math.random() * a.length)]).join('');
  return `https://meet.google.com/${r(3)}-${r(4)}-${r(3)}`;
};

export function toast(msg, kind = 'ok') {
  const el = document.createElement('div');
  el.className = `toast toast-${kind}`;
  el.innerHTML = `<span>${kind === 'ok' ? '🐝' : kind === 'warn' ? '⚠️' : 'ℹ️'}</span><p>${msg}</p>`;
  $('#toasts').append(el);
  setTimeout(() => el.classList.add('out'), 3200);
  setTimeout(() => el.remove(), 3700);
}

const modal = $('#modal');
export function openModal(html, cls = '') {
  modal.className = `modal ${cls}`;
  modal.innerHTML = `<button class="modal-x" data-act="close-modal" aria-label="Close">✕</button>${html}`;
  if (!modal.open) modal.showModal();
}
export const closeModal = () => modal.open && modal.close();
modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

const stars = (r) => `<span class="rating">★ ${r.toFixed(1)}</span>`;
const pct = (p, m) => Math.round((1 - p / m) * 100);
const cartCount = () => S().cart.reduce((n, i) => n + i.qty, 0);

/* ───────────────────────── auth gate ───────────────────────── */
let afterLogin = null;
let loginStep = { step: 'phone', phone: '' };

export function requireLogin(reason, next) {
  if (S().user) return next();
  afterLogin = next;
  loginStep = { step: 'phone', phone: '', reason };
  renderLogin();
}

function renderLogin() {
  const { step, phone, reason } = loginStep;
  let body = '';
  if (step === 'phone') {
    body = `
      <label class="field"><span>Mobile number</span>
        <div class="phone-input"><b>+91</b><input id="lg-phone" inputmode="numeric" maxlength="10" placeholder="98765 43210" value="${esc(phone)}" autocomplete="tel-national" /></div>
      </label>
      <button class="btn btn-primary btn-block" data-act="login-send">Send OTP</button>`;
  } else if (step === 'otp') {
    body = `
      <p class="muted">We sent a 4-digit code to <b>+91 ${esc(phone)}</b> <button class="link" data-act="login-edit">Edit</button></p>
      <div class="otp">${[0, 1, 2, 3].map((i) => `<input inputmode="numeric" maxlength="1" data-otp="${i}" aria-label="OTP digit ${i + 1}" />`).join('')}</div>
      <p class="hint">Demo build: use <b>1234</b></p>
      <button class="btn btn-primary btn-block" data-act="login-verify">Verify & continue</button>`;
  } else {
    body = `
      <label class="field"><span>Your name</span><input id="lg-name" placeholder="Full name" autocomplete="name" /></label>
      <label class="field"><span>Delivery address</span><textarea id="lg-addr" rows="2" placeholder="House, street, landmark, area"></textarea></label>
      <p class="hint">📍 We pin your address to a hex cell so the nearest pharmacy can serve you.</p>
      <button class="btn btn-primary btn-block" data-act="login-finish">Start using Beekey</button>`;
  }
  openModal(`
    <div class="modal-hero">${logo(56)}<div><h2>${step === 'profile' ? 'Almost there!' : 'Login to Beekey'}</h2>
    <p class="muted">${esc(reason || 'Book doctors, buy medicines and lab tests in seconds.')}</p></div></div>
    <div class="modal-body">${body}
      <p class="partner-hint">Are you a doctor, lab, pharmacy or delivery partner? <a href="#/partner" data-act="close-modal">Partner login →</a></p>
    </div>`, 'modal-login');
  setTimeout(() => (modal.querySelector('#lg-phone') || modal.querySelector('[data-otp="0"]') || modal.querySelector('#lg-name'))?.focus(), 30);
}

/* ───────────────────────── chrome ───────────────────────── */
const NAV = [
  ['/medicines', 'Medicines', '💊'],
  ['/doctors', 'Consult Doctor', '🩺'],
  ['/labs', 'Lab Tests', '🧪'],
];

function renderChrome(path) {
  const { user, partner } = S();
  const active = (p) => (path === p || path.startsWith(p + '/') || (p === '/medicines' && path.startsWith('/medicine')) || (p === '/doctors' && path.startsWith('/doctor')) || (p === '/labs' && path.startsWith('/test'))) ? 'active' : '';
  $('#topbar').innerHTML = `
    <div class="wrap topbar-in">
      <a class="brand" href="#/">${logo(42)}<span><b>Beekey</b><i>Medics</i></span></a>
      <nav class="nav" aria-label="Main">${NAV.map(([p, l]) => `<a href="#${p}" class="${active(p)}">${l}</a>`).join('')}</nav>
      <div class="top-actions">
        ${partner ? `<a class="btn btn-sm btn-ghost hide-sm" href="#/partner/${partner.role}">🏢 Dashboard</a>` : `<a class="btn btn-sm btn-ghost hide-sm" href="#/partner">Partner login</a>`}
        <button class="icon-btn" data-act="theme" aria-label="Toggle theme">${document.documentElement.dataset.theme === 'dark' ? '☀️' : '🌙'}</button>
        <a class="icon-btn cart-btn" href="#/cart" aria-label="Cart">🛒${cartCount() ? `<span class="cart-badge">${cartCount()}</span>` : ''}</a>
        ${user
          ? `<a class="avatar-btn" href="#/profile" title="${esc(user.name)}">${esc(user.name[0] || 'U').toUpperCase()}</a>`
          : `<button class="btn btn-sm btn-dark" data-act="login">Login</button>`}
      </div>
    </div>`;
  const tabs = [['/', 'Home', '🏠'], ['/medicines', 'Medicines', '💊'], ['/doctors', 'Doctors', '🩺'], ['/labs', 'Labs', '🧪'], ['/orders', 'Orders', '📦']];
  $('#tabbar').innerHTML = tabs.map(([p, l, i]) => `<a href="#${p}" class="${(p === '/' ? path === '/' : active(p) || path.startsWith(p)) ? 'active' : ''}"><span>${i}</span>${l}</a>`).join('');
  $('#footer').innerHTML = `
    <div class="wrap footer-in">
      <div class="footer-brand">${logo(48)}<div><b>Beekey Medics</b><p>Your neighbourhood health hive — local pharmacies, trusted doctors and labs, connected.</p></div></div>
      <div><h4>Services</h4><a href="#/medicines">Order medicines</a><a href="#/doctors">Online consultation</a><a href="#/labs">Lab tests</a></div>
      <div><h4>Partners</h4><a href="#/partner">Join as doctor</a><a href="#/partner">List your pharmacy</a><a href="#/partner">Become a delivery partner</a></div>
      <div><h4>Help</h4><a href="#/orders">Track order</a><a href="#/profile">Account</a><span class="muted small">Not for emergencies — call 108.</span></div>
    </div>
    <div class="wrap footer-base"><span>© ${new Date().getFullYear()} Beekey Medics</span><span>Made with 🍯 for healthier neighbourhoods</span></div>`;
}

/* ───────────────────────── shared pieces ───────────────────────── */
const sectionHead = (title, sub, link) => `<div class="section-head"><div><h2>${title}</h2>${sub ? `<p class="muted">${sub}</p>` : ''}</div>${link ? `<a class="see-all" href="${link[0]}">${link[1]} →</a>` : ''}</div>`;

function productCard(m) {
  const inCart = S().cart.find((c) => c.id === m.id);
  return `<article class="product card">
    <a href="#/medicine/${m.id}" class="product-icon" aria-hidden="true" tabindex="-1">${medArt(m, 112)}<span class="form-tag">${FORM_LABELS[m.form]}</span></a>
    ${m.rx ? '<span class="tag-rx" title="Prescription required">Rx</span>' : ''}
    <a href="#/medicine/${m.id}" class="product-name">${esc(m.name)}</a>
    <p class="muted small">${esc(m.pack)}</p>
    <div class="product-foot">
      <div><span class="price">${inr(m.price)}</span> <s class="mrp">${inr(m.mrp)}</s> <span class="off">${pct(m.price, m.mrp)}% off</span></div>
      ${inCart ? qtyStepper(m.id, inCart.qty) : `<button class="btn btn-sm btn-primary" data-act="add" data-id="${m.id}">Add</button>`}
    </div>
  </article>`;
}
const qtyStepper = (id, qty) => `<div class="qty"><button data-act="dec" data-id="${id}" aria-label="Decrease">−</button><b>${qty}</b><button data-act="inc" data-id="${id}" aria-label="Increase">+</button></div>`;

function doctorCard(d) {
  const sp = byId(SPECIALTIES, d.spec);
  return `<article class="doc-card card">
    <div class="avatar">${doctorAvatar(d)}<span class="online-dot" title="Online today"></span></div>
    <div class="doc-info">
      <h3><a href="#/doctor/${d.id}">${esc(d.name)}</a></h3>
      <p class="muted small">${esc(d.qual)}</p>
      <p class="doc-meta"><span class="pill">${specArt(sp.id, 18, 'mini-art')} ${sp.name}</span><span class="pill">${d.exp} yrs exp</span>${stars(d.rating)}<span class="muted small">(${d.reviews})</span></p>
      <p class="muted small">🗣 ${d.langs.join(', ')}</p>
    </div>
    <div class="doc-cta"><span class="price">${inr(d.fee)}</span><span class="muted small">per consult</span><a class="btn btn-primary btn-sm" href="#/doctor/${d.id}">Book online</a></div>
  </article>`;
}

function empty(icon, title, text, cta) {
  return `<div class="empty"><div class="empty-icon">${icon}</div><h3>${title}</h3><p class="muted">${text}</p>${cta || ''}</div>`;
}

/* ───────────────────────── views ───────────────────────── */
const ui = { medCat: 'all', medForm: '', medQ: '', docFor: null, docDate: null, docSlot: null, symptoms: '', labId: null, labDate: null, labSlot: null, homeCollect: true, ordersTab: 'medicines', search: '' };

function viewHome() {
  const { user } = S();
  const hi = user ? `Hi ${esc(user.name.split(' ')[0])} 👋` : 'Your health hive';
  return `
  <section class="hero">
    <div class="hive-bg" aria-hidden="true"></div>
    <div class="wrap hero-in">
      <div class="hero-copy reveal">
        <span class="eyebrow">${hi}</span>
        <h1>Healthcare that comes <em>buzzing</em> to your door.</h1>
        <p class="lead">Medicines from the nearest pharmacy, online doctor consultations over Google Meet and lab tests at the best price — all from trusted local partners.</p>
        <form class="hero-search" data-form="search" role="search">
          <span aria-hidden="true">🔍</span>
          <input name="q" placeholder="Search medicines, doctors, lab tests…" autocomplete="off" />
          <button class="btn btn-primary">Search</button>
        </form>
        <div class="hero-chips"><a href="#/doctors/general" class="chip">🤒 Fever</a><a href="#/medicines/cold" class="chip">🤧 Cold & cough</a><a href="#/labs/fullbody" class="chip">🧬 Full body checkup</a><a href="#/doctors/dermatology" class="chip">✨ Skin</a></div>
      </div>
      <div class="hero-art reveal" aria-hidden="true">
        <div class="hex-stack">
          <div class="hex h1"><span>💊</span></div>
          <div class="hex h2"><span>🩺</span></div>
          <div class="hex h3"><span>🧪</span></div>
          <div class="hex hero-bee">${logo(150)}</div>
        </div>
        <div class="float-card fc1"><b>🛵 18 min</b><span>avg. delivery from nearest shop</span></div>
        <div class="float-card fc2"><b>📹 Google Meet</b><span>video consults from home</span></div>
      </div>
    </div>
  </section>

  <section class="wrap section">
    <div class="service-grid">
      <a href="#/medicines" class="service svc-med reveal"><span class="svc-icon">💊</span><h3>Order Medicines</h3><p>From the closest pharmacy in our hive. Delivered fast.</p><span class="svc-go">Shop now →</span></a>
      <a href="#/doctors" class="service svc-doc reveal"><span class="svc-icon">🩺</span><h3>Consult a Doctor</h3><p>Video consult on Google Meet. Prescription in minutes.</p><span class="svc-go">Find doctors →</span></a>
      <a href="#/labs" class="service svc-lab reveal"><span class="svc-icon">🧪</span><h3>Book Lab Tests</h3><p>Compare lab prices. Home sample collection.</p><span class="svc-go">Book a test →</span></a>
    </div>
  </section>

  <section class="wrap section">
    ${sectionHead('How the hive works', 'From consult to doorstep — one smooth flow')}
    <ol class="flow">
      <li class="flow-step reveal"><span>1</span><b>Consult online</b><p>Pick a specialist and a slot. Join over Google Meet.</p></li>
      <li class="flow-step reveal"><span>2</span><b>Get your prescription</b><p>The doctor uploads or types your medicines right after the call.</p></li>
      <li class="flow-step reveal"><span>3</span><b>Nearest pharmacy</b><p>Our hex search finds the closest shop that has everything in stock.</p></li>
      <li class="flow-step reveal"><span>4</span><b>Delivered to you</b><p>A Beekey rider picks it up and brings it to your door. Track it live.</p></li>
    </ol>
  </section>

  <section class="wrap section">
    ${sectionHead('Consult by speciality', 'Online video consultations · in-clinic visits coming soon', ['#/doctors', 'All specialities'])}
    <div class="scroller">${SPECIALTIES.map((s) => `<a class="spec-card card" href="#/doctors/${s.id}"><span>${specArt(s.id, 64)}</span><b>${s.name}</b><small>${DOCTORS.filter((d) => d.spec === s.id).length} doctors</small></a>`).join('')}</div>
  </section>

  <section class="wrap section">
    ${sectionHead('Everyday essentials', 'Sourced from pharmacies near you', ['#/medicines', 'Browse all'])}
    <div class="grid grid-products">${MEDICINES.filter((m) => !m.rx).slice(0, 8).map(productCard).join('')}</div>
  </section>

  <section class="wrap section">
    ${sectionHead('Popular lab tests', 'Compare prices across labs in the network', ['#/labs', 'All tests'])}
    <div class="grid grid-tests">${['t7', 't1', 't4', 't6', 't11', 't9'].map((id) => testCard(byId(TESTS, id))).join('')}</div>
  </section>

  <section class="wrap section">
    <div class="partner-banner reveal">
      <div><span class="eyebrow dark">Beekey Partner Network</span><h2>Doctor, lab, pharmacy or rider?<br/>Grow with the hive.</h2>
      <p>We are a community-built network — no giant warehouses, just great local partners. Join us and reach patients nearby.</p>
      <a class="btn btn-dark" href="#/partner">Become a partner →</a></div>
      <div class="partner-stats">
        <div><b>${DOCTORS.length}</b><span>Doctors</span></div><div><b>${SHOPS.length}</b><span>Pharmacies</span></div>
        <div><b>${LABS.length}</b><span>Labs</span></div><div><b>${DELIVERY.length}</b><span>Riders</span></div>
      </div>
    </div>
  </section>`;
}

function testCard(t) {
  const prices = LABS.map((l) => l.prices[t.id]).filter(Boolean);
  const cat = byId(TEST_CATEGORIES, t.cat);
  return `<a class="test-card card" href="#/test/${t.id}">
    <span class="test-icon">${labArt(cat.id, 50)}</span>
    <div><b>${esc(t.name)}</b><p class="muted small">${t.params} parameter${t.params > 1 ? 's' : ''} · Report in ${t.tat}</p></div>
    <div class="test-price"><small class="muted">from</small><span class="price">${inr(Math.min(...prices))}</span><small class="muted">${prices.length} labs</small></div>
  </a>`;
}

function viewMedicines({ cat }) {
  ui.medCat = cat || 'all';
  return `
  <section class="wrap section page-head">
    <h1>Medicines & health products</h1>
    <p class="muted">Order now — we route it to the nearest in-stock pharmacy using hexagonal search. Login is needed only at checkout.</p>
    <div class="search-row"><span>🔍</span><input id="med-q" placeholder="Search by medicine name…" value="${esc(ui.medQ)}" autocomplete="off" /></div>
    <div class="chips" role="tablist">${MED_CATEGORIES.map((c) => `<button role="tab" class="chip ${ui.medCat === c.id ? 'on' : ''}" aria-selected="${ui.medCat === c.id}" data-act="med-cat" data-id="${c.id}">${catIcon(c.id)} ${c.name}</button>`).join('')}</div>
    <div class="type-row" aria-label="Browse by type">${[...new Set(MEDICINES.map((m) => m.form))].map((f) => `<button class="type-tile ${ui.medForm === f ? 'on' : ''}" data-act="med-form" data-id="${f}" aria-pressed="${ui.medForm === f}">${medArt(MEDICINES.find((m) => m.form === f), 64)}<span>${FORM_LABELS[f]}</span></button>`).join('')}</div>
    <div class="rx-note">📄 <span>Items marked <span class="tag-rx inline">Rx</span> need a valid prescription — upload it at checkout or consult one of our doctors.</span></div>
    <div id="med-grid" class="grid grid-products">${medGrid()}</div>
  </section>`;
}
function medGrid() {
  const q = ui.medQ.trim().toLowerCase();
  const list = MEDICINES.filter((m) => (ui.medCat === 'all' || m.cat === ui.medCat) && (!ui.medForm || m.form === ui.medForm) && (!q || m.name.toLowerCase().includes(q)));
  return list.length ? list.map(productCard).join('') : empty('🔍', 'No medicines found', 'Try another name, or ask a doctor what you need.', `<a class="btn btn-primary" href="#/doctors">Consult a doctor</a>`);
}

function viewMedicine({ id }) {
  const m = byId(MEDICINES, id);
  if (!m) return viewNotFound();
  const inCart = S().cart.find((c) => c.id === m.id);
  const cat = byId(MED_CATEGORIES, m.cat);
  const avail = SHOPS.filter((s) => !s.out.includes(m.id)).length;
  const similar = MEDICINES.filter((x) => x.cat === m.cat && x.id !== m.id).slice(0, 4);
  return `
  <section class="wrap section">
    <a class="back" href="#/medicines/${m.cat}">← ${cat.name}</a>
    <div class="detail card">
      <div class="detail-art">${medArt(m, 280, 'med-art big')}</div>
      <div class="detail-info">
        ${m.rx ? '<span class="tag-rx">Rx · Prescription required</span>' : '<span class="pill">✅ No prescription needed</span>'}
        <h1>${esc(m.name)}</h1>
        <p class="muted">${esc(m.brand)} · ${esc(m.pack)}</p>
        <div class="detail-price"><span class="price big">${inr(m.price)}</span><s class="mrp">MRP ${inr(m.mrp)}</s><span class="off">${pct(m.price, m.mrp)}% off</span></div>
        <p class="avail">🏪 In stock at <b>${avail} of ${SHOPS.length}</b> partner pharmacies near you</p>
        <div class="detail-cta">${inCart ? qtyStepper(m.id, inCart.qty) + '<a class="btn btn-dark" href="#/cart">Go to cart →</a>' : `<button class="btn btn-primary" data-act="add" data-id="${m.id}">Add to cart</button>`}</div>
        <p class="muted small">Please use medicines only as advised by a registered doctor.</p>
      </div>
    </div>
    ${similar.length ? `<div class="section">${sectionHead('Similar products')}<div class="grid grid-products">${similar.map(productCard).join('')}</div></div>` : ''}
  </section>`;
}

function cartTotals(cart) {
  const items = cart.map((c) => ({ ...byId(MEDICINES, c.id), qty: c.qty }));
  const sub = items.reduce((s, i) => s + i.price * i.qty, 0);
  const mrp = items.reduce((s, i) => s + i.mrp * i.qty, 0);
  const fee = sub >= 299 || sub === 0 ? 0 : 25;
  return { items, sub, mrp, fee, total: sub + fee };
}

let rxFileName = '';
function viewCart() {
  const { cart, user } = S();
  if (!cart.length) return `<section class="wrap section">${empty('🛒', 'Your cart is empty', 'Add medicines and we will find the nearest pharmacy that has them.', '<a class="btn btn-primary" href="#/medicines">Browse medicines</a>')}</section>`;
  const t = cartTotals(cart);
  const needsRx = t.items.some((i) => i.rx);
  return `
  <section class="wrap section">
    <h1>Your cart</h1>
    <div class="cart-layout">
      <div class="cart-items">
        ${t.items.map((i) => `<div class="cart-item card"><span class="ci-icon">${medArt(i, 52)}</span><div><b>${esc(i.name)}</b> ${i.rx ? '<span class="tag-rx inline">Rx</span>' : ''}<p class="muted small">${esc(i.pack)}</p><span class="price">${inr(i.price * i.qty)}</span></div>${qtyStepper(i.id, i.qty)}</div>`).join('')}
        ${needsRx ? `<label class="rx-upload card ${rxFileName ? 'done' : ''}"><input type="file" id="rx-file" accept="image/*,.pdf" hidden /><span>📄</span><div><b>${rxFileName ? 'Prescription attached' : 'Upload prescription'}</b><p class="muted small">${rxFileName ? esc(rxFileName) : 'Required for Rx items. JPG, PNG or PDF.'}</p></div><span class="btn btn-sm btn-ghost">${rxFileName ? 'Change' : 'Choose file'}</span></label>
          <p class="muted small">No prescription? <a href="#/doctors">Consult a doctor online</a> — they will send it straight to a pharmacy for you.</p>` : ''}
      </div>
      <aside class="summary card">
        <h3>Bill summary</h3>
        <div class="sum-row"><span>Item total (MRP)</span><span>${inr(t.mrp)}</span></div>
        <div class="sum-row save"><span>Discount</span><span>− ${inr(t.mrp - t.sub)}</span></div>
        <div class="sum-row"><span>Delivery</span><span>${t.fee ? inr(t.fee) : '<b class="free">FREE</b>'}</span></div>
        <div class="sum-row total"><span>To pay</span><span>${inr(t.total)}</span></div>
        ${t.fee ? `<p class="muted small">Add ${inr(299 - t.sub)} more for free delivery</p>` : ''}
        <div class="deliver-to">${user ? `<span>📍 Deliver to <b>${esc(user.name)}</b></span><p class="muted small">${esc(user.address)}</p>` : '<span class="muted">📍 Login to choose delivery address</span>'}</div>
        <p class="muted small">💵 Pay on delivery (online payments coming soon)</p>
        <button class="btn btn-primary btn-block" data-act="checkout">${user ? 'Place order' : 'Login & place order'}</button>
      </aside>
    </div>
  </section>`;
}

function viewSpecialties() {
  return `
  <section class="wrap section page-head">
    <h1>Consult a doctor online</h1>
    <p class="muted">Choose a speciality. All consultations happen over <b>Google Meet</b> video — in-clinic visits are coming soon.</p>
    <div class="grid grid-specs">${SPECIALTIES.map((s) => `<a class="spec-tile card" href="#/doctors/${s.id}"><span class="spec-emoji">${specArt(s.id, 76)}</span><b>${s.name}</b><p class="muted small">${s.blurb}</p><span class="muted small">${DOCTORS.filter((d) => d.spec === s.id).length} available · from ${inr(Math.min(...DOCTORS.filter((d) => d.spec === s.id).map((d) => d.fee)))}</span></a>`).join('')}</div>
  </section>`;
}

function viewDoctorList({ spec }) {
  const sp = byId(SPECIALTIES, spec);
  if (!sp) return viewNotFound();
  const docs = DOCTORS.filter((d) => d.spec === spec);
  return `
  <section class="wrap section page-head">
    <a class="back" href="#/doctors">← All specialities</a>
    <h1 class="title-art">${specArt(sp.id, 60)} ${sp.name}</h1>
    <p class="muted">${sp.blurb} · ${docs.length} doctor${docs.length > 1 ? 's' : ''} available for online consultation</p>
    <div class="chips">${SPECIALTIES.map((s) => `<a class="chip ${s.id === spec ? 'on' : ''}" href="#/doctors/${s.id}">${specArt(s.id, 22, 'mini-art')} ${s.name}</a>`).join('')}</div>
    <div class="doc-list">${docs.map(doctorCard).join('')}</div>
  </section>`;
}

function viewDoctor({ id }) {
  const d = byId(DOCTORS, id);
  if (!d) return viewNotFound();
  const sp = byId(SPECIALTIES, d.spec);
  const days = nextDays(6);
  const hasFree = (iso) => TIME_SLOTS.some((t) => slotState(d.id, iso, t) === 'free');
  if (ui.docFor !== d.id || !days.some((x) => x.iso === ui.docDate)) { ui.docFor = d.id; ui.docSlot = null; ui.docDate = (days.find((x) => hasFree(x.iso)) || days[0]).iso; }
  const slots = TIME_SLOTS.map((t) => ({ t, st: slotState(d.id, ui.docDate, t) }));
  if (ui.docSlot && slots.find((s) => s.t === ui.docSlot)?.st !== 'free') ui.docSlot = null;
  return `
  <section class="wrap section">
    <a class="back" href="#/doctors/${d.spec}">← ${sp.name}</a>
    <div class="doctor-layout">
      <div class="card profile-head">
        <div class="avatar xl">${doctorAvatar(d, 104)}<span class="online-dot"></span></div>
        <div>
          <h1>${esc(d.name)}</h1>
          <p class="muted">${esc(d.qual)}</p>
          <p class="doc-meta"><span class="pill">${specArt(sp.id, 18, 'mini-art')} ${sp.name}</span><span class="pill">${d.exp} years experience</span>${stars(d.rating)}<span class="muted small">${d.reviews} reviews</span></p>
          <p class="muted small">🗣 Speaks ${d.langs.join(', ')}</p>
        </div>
      </div>
      <div class="card booking">
        <h3>Book an appointment</h3>
        <div class="mode-toggle">
          <label class="mode on"><input type="radio" name="mode" checked /><span>📹</span><div><b>Online · Google Meet</b><small>Video consult from home</small></div></label>
          <label class="mode disabled" title="Coming soon"><input type="radio" name="mode" disabled /><span>🏥</span><div><b>In-clinic visit</b><small>Coming soon</small></div></label>
        </div>
        <h4>Select date</h4>
        <div class="date-strip">${days.map((x) => `<button class="date-chip ${x.iso === ui.docDate ? 'on' : ''} ${hasFree(x.iso) ? '' : 'full'}" data-act="doc-date" data-id="${x.iso}"><small>${x.top}</small><b>${x.day}</b><small>${x.mon}</small></button>`).join('')}</div>
        <h4>Available slots</h4>
        ${slots.some((s) => s.st === 'free') ? `<div class="slot-grid">${slots.map((s) => `<button class="slot ${s.st} ${ui.docSlot === s.t ? 'on' : ''}" ${s.st !== 'free' ? 'disabled' : ''} data-act="doc-slot" data-id="${s.t}">${s.t}</button>`).join('')}</div>` : '<p class="no-slots">🐝 No slots left on this day — please pick another date.</p>'}
        <label class="field"><span>Describe your symptoms (optional)</span><textarea id="symptoms" rows="2" placeholder="e.g. Fever since 2 days, mild headache">${esc(ui.symptoms)}</textarea></label>
        <div class="book-foot"><div><span class="price big">${inr(d.fee)}</span><small class="muted">Consultation fee</small></div>
        <button class="btn btn-primary" data-act="book-doctor" data-id="${d.id}" ${ui.docSlot ? '' : 'disabled'}>${ui.docSlot ? `Book ${ui.docSlot} slot` : 'Pick a slot'}</button></div>
        <p class="muted small">🔒 A Google Meet link is shared once your booking is confirmed. After the call, your prescription is sent to the nearest pharmacy automatically.</p>
      </div>
    </div>
  </section>`;
}

function viewLabs() {
  return `
  <section class="wrap section page-head">
    <h1>Lab tests & health checkups</h1>
    <p class="muted">Pick a test, compare prices offered by labs in our network and book home sample collection.</p>
    <div class="grid grid-specs">${TEST_CATEGORIES.map((c) => `<a class="spec-tile card" href="#/labs/${c.id}"><span class="spec-emoji">${labArt(c.id, 76)}</span><b>${c.name}</b><p class="muted small">${c.blurb}</p><span class="muted small">${TESTS.filter((t) => t.cat === c.id).length} tests</span></a>`).join('')}</div>
    <div class="section">${sectionHead('Most booked')}<div class="grid grid-tests">${TESTS.slice(0, 9).map(testCard).join('')}</div></div>
  </section>`;
}

function viewTestList({ cat }) {
  const c = byId(TEST_CATEGORIES, cat);
  if (!c) return viewNotFound();
  return `
  <section class="wrap section page-head">
    <a class="back" href="#/labs">← All categories</a>
    <h1 class="title-art">${labArt(c.id, 60)} ${c.name}</h1>
    <div class="chips">${TEST_CATEGORIES.map((x) => `<a class="chip ${x.id === cat ? 'on' : ''}" href="#/labs/${x.id}">${labArt(x.id, 22, 'mini-art')} ${x.name}</a>`).join('')}</div>
    <div class="grid grid-tests">${TESTS.filter((t) => t.cat === cat).map(testCard).join('')}</div>
  </section>`;
}

function viewTest({ id }) {
  const t = byId(TESTS, id);
  if (!t) return viewNotFound();
  const home = S().user || { x: 0, y: 0 };
  const offers = LABS.filter((l) => l.prices[t.id]).map((l) => ({ ...l, price: l.prices[t.id], dist: km(home, l) })).sort((a, b) => a.price - b.price);
  if (!offers.some((o) => o.id === ui.labId)) ui.labId = null;
  const days = nextDays(5);
  if (!ui.labDate || !days.some((x) => x.iso === ui.labDate)) ui.labDate = days[1].iso;
  const sel = offers.find((o) => o.id === ui.labId);
  const cheapest = offers[0]?.price;
  return `
  <section class="wrap section">
    <a class="back" href="#/labs/${t.cat}">← ${byId(TEST_CATEGORIES, t.cat).name}</a>
    <div class="card test-head"><span class="test-icon xl">${labArt(t.cat, 80)}</span><div><h1>${esc(t.name)}</h1>
      <p class="doc-meta"><span class="pill">🧾 ${t.params} parameter${t.params > 1 ? 's' : ''}</span><span class="pill">⏱ Report in ${t.tat}</span><span class="pill">🍽 ${t.prep}</span></p></div></div>
    <div class="section">${sectionHead('Choose a lab', `${offers.length} labs offer this test · sorted by price`)}
      <div class="lab-list">${offers.map((l) => `
        <button class="lab-row card ${ui.labId === l.id ? 'on' : ''}" data-act="pick-lab" data-id="${l.id}">
          <span class="radio" aria-hidden="true"></span>
          <div class="lab-name"><b>${esc(l.name)}</b><p class="muted small">${l.nabl ? '🏅 NABL accredited · ' : ''}${stars(l.rating)} · ${l.dist.toFixed(1)} km away</p>
          <p class="small">${l.home ? '🏠 Home sample collection' : '🏥 Visit lab only'}</p></div>
          <div class="lab-price"><span class="price">${inr(l.price)}</span>${l.price === cheapest ? '<span class="best">Best price</span>' : ''}</div>
        </button>`).join('')}</div>
    </div>
    ${sel ? `
    <div class="card booking lab-booking">
      <h3>Schedule with ${esc(sel.name)}</h3>
      <div class="mode-toggle">
        <label class="mode ${ui.homeCollect && sel.home ? 'on' : ''} ${sel.home ? '' : 'disabled'}"><input type="radio" name="lc" data-act="lab-home" data-id="1" ${ui.homeCollect && sel.home ? 'checked' : ''} ${sel.home ? '' : 'disabled'} /><span>🏠</span><div><b>Home collection</b><small>${sel.home ? 'Phlebotomist visits you' : 'Not offered by this lab'}</small></div></label>
        <label class="mode ${!ui.homeCollect || !sel.home ? 'on' : ''}"><input type="radio" name="lc" data-act="lab-home" data-id="0" ${!ui.homeCollect || !sel.home ? 'checked' : ''} /><span>🏥</span><div><b>Visit the lab</b><small>${sel.dist.toFixed(1)} km away</small></div></label>
      </div>
      <h4>Date</h4>
      <div class="date-strip">${days.map((x) => `<button class="date-chip ${x.iso === ui.labDate ? 'on' : ''}" data-act="lab-date" data-id="${x.iso}"><small>${x.top}</small><b>${x.day}</b><small>${x.mon}</small></button>`).join('')}</div>
      <h4>Time</h4>
      <div class="slot-grid">${LAB_SLOTS.map((s) => `<button class="slot free ${ui.labSlot === s ? 'on' : ''}" data-act="lab-slot" data-id="${s}">${s}</button>`).join('')}</div>
      <div class="book-foot"><div><span class="price big">${inr(sel.price)}</span><small class="muted">Pay at collection</small></div>
      <button class="btn btn-primary" data-act="book-lab" data-id="${t.id}" ${ui.labSlot ? '' : 'disabled'}>${ui.labSlot ? 'Book test' : 'Pick a time'}</button></div>
    </div>` : '<p class="muted center">👆 Select a lab to schedule your test</p>'}
  </section>`;
}

const STATUS = {
  placed: ['Order placed', 'Sent to the nearest pharmacy'],
  accepted: ['Pharmacy confirmed', 'Your medicines are being packed'],
  ready: ['Ready for pickup', 'A Beekey rider is on the way to the shop'],
  picked: ['Out for delivery', 'Your medicine will be delivered to you soon'],
  delivered: ['Delivered', 'Get well soon! 🐝'],
};
export const STATUS_ORDER = Object.keys(STATUS);

function viewOrders({ tab }) {
  const { user, orders, appointments, labBookings } = S();
  if (!user) return `<section class="wrap section">${empty('📦', 'Login to see your orders', 'Your medicine orders, consultations and lab bookings live here.', '<button class="btn btn-primary" data-act="login">Login</button>')}</section>`;
  ui.ordersTab = tab || ui.ordersTab;
  const mine = (l) => l.filter((x) => x.userId === user.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const lists = { medicines: mine(orders), consults: mine(appointments), tests: mine(labBookings) };
  const tabs = [['medicines', '💊 Medicines'], ['consults', '🩺 Consultations'], ['tests', '🧪 Lab tests']];
  let body = '';
  if (ui.ordersTab === 'medicines') {
    body = lists.medicines.length ? lists.medicines.map((o) => {
      const shop = byId(SHOPS, o.shopId);
      const i = STATUS_ORDER.indexOf(o.status);
      return `<a class="order-card card" href="#/track/${o.id}">
        <div class="oc-top"><b>#${o.id}</b><span class="status s-${o.status}">${STATUS[o.status][0]}</span></div>
        <p class="muted small">${o.source === 'prescription' ? '📄 From your prescription · ' : ''}${o.items.length + o.custom.length} item(s) · ${shop.name}</p>
        <div class="mini-progress"><span style="--p:${(i / (STATUS_ORDER.length - 1)) * 100}%"></span></div>
        <div class="oc-foot"><span>${inr(o.total)}</span><span class="see-all">${o.status === 'delivered' ? 'View details' : 'Track live'} →</span></div>
      </a>`;
    }).join('') : empty('💊', 'No medicine orders yet', 'Orders from your cart and prescriptions appear here.', '<a class="btn btn-primary" href="#/medicines">Order medicines</a>');
  } else if (ui.ordersTab === 'consults') {
    body = lists.consults.length ? lists.consults.map(apptCard).join('') : empty('🩺', 'No consultations yet', 'Book a video consultation with a specialist.', '<a class="btn btn-primary" href="#/doctors">Find a doctor</a>');
  } else {
    body = lists.tests.length ? lists.tests.map((b) => {
      const t = byId(TESTS, b.testId), l = byId(LABS, b.labId);
      const st = { booked: 'Booked', collected: 'Sample collected', report: 'Report ready' }[b.status];
      return `<div class="order-card card"><div class="oc-top"><b>${esc(t.name)}</b><span class="status s-${b.status}">${st}</span></div>
        <p class="muted small">${esc(l.name)} · ${fmtDate(b.date)} at ${b.slot} · ${b.home ? '🏠 Home collection' : '🏥 Lab visit'}</p>
        <div class="oc-foot"><span>${inr(b.price)}</span>${b.status === 'report' ? '<button class="btn btn-sm btn-dark" data-act="view-report" data-id="' + b.id + '">View report</button>' : ''}</div></div>`;
    }).join('') : empty('🧪', 'No lab bookings yet', 'Compare lab prices and book home collection.', '<a class="btn btn-primary" href="#/labs">Book a test</a>');
  }
  return `
  <section class="wrap section page-head">
    <h1>My orders</h1>
    <div class="tabs" role="tablist">${tabs.map(([k, l]) => `<a role="tab" class="tab ${ui.ordersTab === k ? 'on' : ''}" href="#/orders/${k}">${l}<span>${lists[k].length}</span></a>`).join('')}</div>
    <div class="order-list">${body}</div>
  </section>`;
}

function apptCard(a) {
  const d = byId(DOCTORS, a.doctorId);
  const st = { upcoming: 'Upcoming', completed: 'Completed', cancelled: 'Cancelled' }[a.status];
  return `<div class="order-card card appt">
    <div class="oc-top"><div class="appt-doc"><span class="avatar sm">${doctorAvatar(d, 44)}</span><div><b>${esc(d.name)}</b><p class="muted small">${byId(SPECIALTIES, d.spec).name}</p></div></div><span class="status s-${a.status}">${st}</span></div>
    <p class="small">📅 ${fmtDate(a.date)} · ${a.slot} · 📹 Google Meet</p>
    ${a.status === 'upcoming' ? `<div class="meet-box"><code>${a.meet.replace('https://', '')}</code><a class="btn btn-sm btn-primary" href="${a.meet}" target="_blank" rel="noopener">Join Google Meet</a></div>
      <p class="muted small">After your call, ${esc(d.name.split(' ').slice(0, 2).join(' '))} will send your prescription — medicines go straight to the nearest pharmacy.</p>` : ''}
    ${a.prescription ? `<div class="oc-foot"><button class="btn btn-sm btn-ghost" data-act="view-rx" data-id="${a.id}">📄 View prescription</button>${a.orderId ? `<a class="btn btn-sm btn-dark" href="#/track/${a.orderId}">🛵 Track medicines</a>` : ''}</div>` : ''}
  </div>`;
}

function viewTrack({ id }) {
  const o = S().orders.find((x) => x.id === id);
  if (!o) return viewNotFound();
  const shop = byId(SHOPS, o.shopId);
  const rider = o.riderId ? byId(DELIVERY, o.riderId) : null;
  const idx = STATUS_ORDER.indexOf(o.status);
  const eta = new Date(new Date(o.createdAt).getTime() + o.eta * 60e3);
  const [title, sub] = STATUS[o.status];
  return `
  <section class="wrap section">
    <a class="back" href="#/orders/medicines">← My orders</a>
    <div class="eta-banner ${o.status}">
      <div class="eta-bee">${logo(64)}</div>
      <div><span class="eyebrow dark">Order #${o.id}</span>
      <h1>${o.status === 'delivered' ? 'Delivered! Get well soon 🍯' : 'Your medicine will be delivered to you'}</h1>
      <p>${o.status === 'delivered' ? `Delivered at ${fmtTime(o.timeline.at(-1).at)}` : `Arriving by <b>${fmtTime(eta.toISOString())}</b> · ${title} — ${sub}`}</p></div>
    </div>
    <div class="track-layout">
      <div class="card map-card">
        <div class="map-head"><b>⬡ Hexagonal search</b><span class="muted small">Searched ${o.rings + 1} ring${o.rings ? 's' : ''} · nearest in-stock pharmacy ${o.distanceKm.toFixed(1)} km away</span></div>
        ${hexMapSVG({ customer: o.customer, shop, rider, rings: o.rings, allShops: SHOPS, routeActive: o.status === 'picked' })}
        <div class="map-legend"><span><i class="lg-home"></i>You</span><span><i class="lg-search"></i>Searched cells</span><span><i class="lg-shop"></i>Assigned pharmacy</span><span><i class="lg-other"></i>Other partners</span></div>
      </div>
      <div class="track-side">
        <div class="card">
          <ol class="stepper">${STATUS_ORDER.map((s, i) => {
            const tl = o.timeline.find((x) => x.s === s);
            return `<li class="step ${i < idx ? 'done' : i === idx ? 'current' : ''}"><span class="dot"></span><div><b>${STATUS[s][0]}</b><small>${tl ? fmtTime(tl.at) : STATUS[s][1]}</small></div></li>`;
          }).join('')}</ol>
          ${o.status !== 'delivered' ? `<button class="btn btn-sm btn-ghost btn-block" data-act="simulate" data-id="${o.id}" title="Moves the order to the next stage as if the partner did it">▶ Simulate next step (demo)</button>` : ''}
        </div>
        <div class="card">
          <div class="party"><span>🏪</span><div><b>${esc(shop.name)}</b><p class="muted small">${esc(shop.area)} · ${stars(shop.rating)}</p></div></div>
          ${rider ? `<div class="party"><span>🛵</span><div><b>${esc(rider.name)}</b><p class="muted small">${esc(rider.vehicle)}</p></div><a class="btn btn-sm btn-ghost" href="tel:${rider.phone.replace(/\s/g, '')}">Call</a></div>` : ''}
          <div class="party"><span>🏠</span><div><b>${esc(o.customer.name)}</b><p class="muted small">${esc(o.customer.address)}</p></div></div>
        </div>
        <div class="card">
          <h3>Items</h3>
          ${o.items.map((i) => `<div class="sum-row"><span class="with-art">${medArt(byId(MEDICINES, i.id), 34)}${esc(i.name)} × ${i.qty}</span><span>${inr(i.price * i.qty)}</span></div>`).join('')}
          ${o.custom.map((i) => `<div class="sum-row"><span>${esc(i.name)} <small class="muted">${esc(i.dose || '')}</small></span><span class="muted small">price at shop</span></div>`).join('')}
          ${o.fee ? `<div class="sum-row"><span>Delivery</span><span>${inr(o.fee)}</span></div>` : ''}
          <div class="sum-row total"><span>Total (pay on delivery)</span><span>${inr(o.total)}</span></div>
        </div>
      </div>
    </div>
  </section>`;
}

function viewProfile() {
  const { user, partner } = S();
  if (!user) return `<section class="wrap section">${empty('🐝', 'You are browsing as a guest', 'Login to book doctors, buy medicines and lab tests.', '<button class="btn btn-primary" data-act="login">Login</button>')}</section>`;
  return `
  <section class="wrap section page-head narrow">
    <div class="card profile-card">
      <div class="avatar xl letter">${esc(user.name[0]).toUpperCase()}</div>
      <div><h1>${esc(user.name)}</h1><p class="muted">+91 ${esc(user.phone)}</p></div>
    </div>
    <div class="card">
      <label class="field"><span>Name</span><input id="pf-name" value="${esc(user.name)}" /></label>
      <label class="field"><span>Delivery address</span><textarea id="pf-addr" rows="2">${esc(user.address)}</textarea></label>
      <button class="btn btn-primary" data-act="save-profile">Save changes</button>
    </div>
    <div class="card link-list">
      <a href="#/orders/medicines">💊 Medicine orders</a><a href="#/orders/consults">🩺 Consultations</a><a href="#/orders/tests">🧪 Lab bookings</a>
      <a href="#/partner">${partner ? '🏢 Partner dashboard' : '🤝 Partner with us'}</a>
    </div>
    <div class="row-actions"><button class="btn btn-ghost" data-act="logout">Log out</button><button class="btn btn-ghost danger" data-act="reset-demo">Reset demo data</button></div>
  </section>`;
}

function viewSearch({ q }) {
  const s = decodeURIComponent(q || '').toLowerCase().trim();
  const meds = MEDICINES.filter((m) => m.name.toLowerCase().includes(s) || m.cat.includes(s));
  const docs = DOCTORS.filter((d) => d.name.toLowerCase().includes(s) || byId(SPECIALTIES, d.spec).name.toLowerCase().includes(s));
  const tests = TESTS.filter((t) => t.name.toLowerCase().includes(s));
  const none = !meds.length && !docs.length && !tests.length;
  return `
  <section class="wrap section page-head">
    <h1>Results for “${esc(s)}”</h1>
    ${none ? empty('🔍', 'Nothing matched', 'Try “fever”, “thyroid”, “skin” or a medicine name.') : ''}
    ${meds.length ? `<div class="section">${sectionHead('Medicines')}<div class="grid grid-products">${meds.map(productCard).join('')}</div></div>` : ''}
    ${docs.length ? `<div class="section">${sectionHead('Doctors')}<div class="doc-list">${docs.map(doctorCard).join('')}</div></div>` : ''}
    ${tests.length ? `<div class="section">${sectionHead('Lab tests')}<div class="grid grid-tests">${tests.map(testCard).join('')}</div></div>` : ''}
  </section>`;
}

const viewNotFound = () => `<section class="wrap section">${empty('🐝', 'This page flew away', 'We could not find what you were looking for.', '<a class="btn btn-primary" href="#/">Back home</a>')}</section>`;

/* ───────────────────────── partner portal (public page) ───────────────────────── */
export const ROLES = {
  doctor: { title: 'Doctor', icon: '🩺', list: DOCTORS, pitch: 'Consult patients online over Google Meet and send e-prescriptions that reach pharmacies instantly.', fields: ['Medical council registration no.', 'Speciality', 'Consultation fee (₹)'] },
  lab: { title: 'Diagnostic Lab', icon: '🧪', list: LABS, pitch: 'Set your own test prices, get bookings and manage home sample collection.', fields: ['Lab name', 'NABL certificate no. (if any)', 'Area / locality'] },
  shop: { title: 'Medical Shop', icon: '🏪', list: SHOPS, pitch: 'Receive orders from customers in your hex zone. We handle delivery.', fields: ['Shop name', 'Drug licence no.', 'Area / locality'] },
  delivery: { title: 'Delivery Partner', icon: '🛵', list: DELIVERY, pitch: 'Pick up from local pharmacies and deliver nearby. Flexible hours.', fields: ['Vehicle type & number', 'Driving licence no.', 'Preferred area'] },
};

function viewPartner() {
  const { partner } = S();
  return `
  <section class="partner-hero">
    <div class="hive-bg" aria-hidden="true"></div>
    <div class="wrap">
      <span class="eyebrow">Beekey Partner Network</span>
      <h1>Every great hive is built<br/>by its <em>workers</em>.</h1>
      <p class="lead">Beekey is a community network of independent doctors, labs, pharmacies and riders. Login to your dashboard or apply to join.</p>
      ${partner ? `<p class="logged-as">Logged in as <b>${esc(byId(ROLES[partner.role].list, partner.id).name)}</b> · <a href="#/partner/${partner.role}">Open dashboard →</a> · <button class="link" data-act="partner-logout">Log out</button></p>` : ''}
    </div>
  </section>
  <section class="wrap section">
    <div class="grid grid-roles">${Object.entries(ROLES).map(([k, r]) => `
      <article class="role-card card reveal">
        ${k === 'doctor' ? `<span class="role-art">${specArt('general', 72)}</span>` : k === 'lab' ? `<span class="role-art">${labArt('blood', 72)}</span>` : `<span class="role-icon">${r.icon}</span>`}
        <h3>${r.title}</h3>
        <p class="muted">${r.pitch}</p>
        <div class="role-actions"><button class="btn btn-dark btn-sm" data-act="partner-login" data-id="${k}">Login</button><button class="btn btn-ghost btn-sm" data-act="partner-apply" data-id="${k}">Apply to join</button></div>
      </article>`).join('')}</div>
    <div class="card how-partner">
      <h3>How onboarding works</h3>
      <ol class="flow compact"><li class="flow-step"><span>1</span><b>Apply</b><p>Share your licence / registration details.</p></li><li class="flow-step"><span>2</span><b>Verification</b><p>Our team verifies documents within 48 hours.</p></li><li class="flow-step"><span>3</span><b>Go live</b><p>Get your partner login and start receiving requests.</p></li></ol>
    </div>
  </section>`;
}

function partnerLoginModal(role) {
  const r = ROLES[role];
  openModal(`
    <div class="modal-hero"><span class="role-icon">${r.icon}</span><div><h2>${r.title} login</h2><p class="muted">Access your Beekey partner dashboard</p></div></div>
    <div class="modal-body">
      <label class="field"><span>Registered account</span>
        <select id="pl-account">${r.list.map((x) => `<option value="${x.id}">${esc(x.name)}${x.area ? ' — ' + esc(x.area) : ''}</option>`).join('')}</select></label>
      <label class="field"><span>OTP sent to registered mobile</span><input id="pl-otp" inputmode="numeric" maxlength="4" placeholder="Demo: 1234" /></label>
      <button class="btn btn-primary btn-block" data-act="partner-login-go" data-id="${role}">Login to dashboard</button>
      <p class="partner-hint">Not a partner yet? <button class="link" data-act="partner-apply" data-id="${role}">Apply to join →</button></p>
    </div>`, 'modal-login');
}

function partnerApplyModal(role) {
  const r = ROLES[role];
  openModal(`
    <div class="modal-hero"><span class="role-icon">${r.icon}</span><div><h2>Join as ${r.title}</h2><p class="muted">${r.pitch}</p></div></div>
    <form class="modal-body" data-form="apply" data-role="${role}">
      <label class="field"><span>Full name</span><input name="name" required /></label>
      <label class="field"><span>Mobile number</span><input name="phone" required inputmode="numeric" maxlength="10" pattern="[0-9]{10}" /></label>
      ${r.fields.map((f, i) => `<label class="field"><span>${f}</span><input name="f${i}" required /></label>`).join('')}
      <button class="btn btn-primary btn-block">Submit application</button>
    </form>`, 'modal-login');
}

/* ───────────────────────── router ───────────────────────── */
const ROUTES = [
  ['/', viewHome], ['/medicines', viewMedicines], ['/medicines/:cat', viewMedicines], ['/medicine/:id', viewMedicine],
  ['/cart', viewCart], ['/doctors', viewSpecialties], ['/doctors/:spec', viewDoctorList], ['/doctor/:id', viewDoctor],
  ['/labs', viewLabs], ['/labs/:cat', viewTestList], ['/test/:id', viewTest], ['/orders', viewOrders], ['/orders/:tab', viewOrders],
  ['/track/:id', viewTrack], ['/profile', viewProfile], ['/search/:q', viewSearch], ['/partner', viewPartner], ['/partner/:role', renderDashboard],
];

const currentPath = () => (location.hash.replace(/^#/, '') || '/').split('?')[0];

function match(path) {
  const segs = path.split('/').filter(Boolean);
  for (const [pattern, view] of ROUTES) {
    const ps = pattern.split('/').filter(Boolean);
    if (ps.length !== segs.length) continue;
    const params = {};
    if (ps.every((p, i) => (p.startsWith(':') ? ((params[p.slice(1)] = segs[i]), true) : p === segs[i]))) return [view, params];
  }
  return [viewNotFound, {}];
}

let lastPath = null;
export function render() {
  const path = currentPath();
  const [view, params] = match(path);
  const main = $('#main');
  const y = window.scrollY;
  main.innerHTML = view(params);
  renderChrome(path);
  if (path !== lastPath) { window.scrollTo({ top: 0 }); lastPath = path; } else window.scrollTo({ top: y });
  observeReveals();
}

function navigate() {
  const go = () => render();
  if (document.startViewTransition && !matchMedia('(prefers-reduced-motion: reduce)').matches) document.startViewTransition(go);
  else go();
}

// Fallback reveal animation for browsers without scroll-driven animations
const io = 'IntersectionObserver' in window ? new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && (e.target.classList.add('in'), io.unobserve(e.target))), { threshold: 0.12 }) : null;
function observeReveals() {
  if (CSS.supports('animation-timeline: view()')) return;
  document.querySelectorAll('.reveal:not(.in)').forEach((el) => (io ? io.observe(el) : el.classList.add('in')));
}

/* ───────────────────────── actions ───────────────────────── */
function setCart(id, delta) {
  store.set(({ cart }) => {
    const ex = cart.find((c) => c.id === id);
    if (!ex) return { cart: [...cart, { id, qty: 1 }] };
    const qty = ex.qty + delta;
    return { cart: qty <= 0 ? cart.filter((c) => c.id !== id) : cart.map((c) => (c.id === id ? { ...c, qty } : c)) };
  });
}

/** Creates a medicine order routed by hex search to the nearest pharmacy that stocks every catalogue item. */
export function createMedicineOrder({ user, items, custom = [], source, appointmentId = null, rxFile = '' }) {
  const ids = items.map((i) => i.id);
  let res = hexSearch(user, SHOPS, (s) => ids.every((id) => !s.out.includes(id)));
  if (!res.best) res = hexSearch(user, SHOPS); // fall back to nearest shop; they can source missing items
  const sub = items.reduce((s, i) => s + i.price * i.qty, 0);
  const fee = sub >= 299 ? 0 : 25;
  const order = {
    id: uid('BK'), userId: user.id, createdAt: now(), source, appointmentId, rxFile,
    customer: { name: user.name, phone: user.phone, address: user.address, x: user.x, y: user.y },
    items, custom, shopId: res.best.id, distanceKm: res.distanceKm, rings: res.ringsSearched,
    riderId: null, status: 'placed', timeline: [{ s: 'placed', at: now() }],
    eta: etaMinutes(res.distanceKm) + 10, fee, total: sub + fee,
  };
  store.set(({ orders }) => ({ orders: [...orders, order] }));
  return order;
}

/** Advances an order one stage. Assigns the nearest rider (hex search from the shop) when packed. */
export function advanceOrder(id) {
  const o = S().orders.find((x) => x.id === id);
  if (!o || o.status === 'delivered') return;
  const next = STATUS_ORDER[STATUS_ORDER.indexOf(o.status) + 1];
  let riderId = o.riderId;
  if (next === 'ready' && !riderId) riderId = hexSearch(byId(SHOPS, o.shopId), DELIVERY).best.id;
  store.set(({ orders }) => ({ orders: orders.map((x) => (x.id === id ? { ...x, status: next, riderId, timeline: [...x.timeline, { s: next, at: now() }] } : x)) }));
}

export function showPrescription(a) {
  const d = byId(DOCTORS, a.doctorId);
  const rx = a.prescription;
  openModal(`
    <div class="rx-sheet">
      <div class="rx-head">${logo(44)}<div><b>${esc(d.name)}</b><p class="muted small">${esc(d.qual)} · Beekey Medics e-Prescription</p></div><span class="rx-symbol">℞</span></div>
      <div class="rx-meta"><span>Patient: <b>${esc(a.patient.name)}</b></span><span>${fmtDate(a.date)}</span></div>
      <table class="rx-table"><thead><tr><th>Medicine</th><th>Dosage</th><th>Days</th></tr></thead><tbody>
      ${[...rx.items, ...rx.custom].map((i) => `<tr><td>${esc(i.name)}</td><td>${esc(i.dose)}</td><td>${esc(i.days || '')}</td></tr>`).join('')}
      </tbody></table>
      ${rx.notes ? `<p class="rx-notes"><b>Advice:</b> ${esc(rx.notes)}</p>` : ''}
      ${rx.file ? `<p class="muted small">📎 Attached: ${esc(rx.file)}</p>` : ''}
      <p class="muted small">Digitally issued after video consultation on ${fmtDate(a.date)}.</p>
    </div>`, 'modal-wide');
}

const actions = {
  'close-modal': () => closeModal(),
  login: () => requireLogin('', () => render()),
  theme: () => {
    const t = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = t;
    store.set({ theme: t });
    renderChrome(currentPath());
  },
  add: ({ id }) => { setCart(id, 1); toast(`${byId(MEDICINES, id).name} added to cart`); render(); },
  inc: ({ id }) => { setCart(id, 1); render(); },
  dec: ({ id }) => { setCart(id, -1); render(); },
  'med-form': ({ id }) => { ui.medForm = ui.medForm === id ? '' : id; render(); },
  'med-cat': ({ id }) => { ui.medCat = id; history.replaceState(null, '', `#/medicines/${id}`); lastPath = currentPath(); render(); },

  'login-send': () => {
    const phone = $('#lg-phone').value.replace(/\D/g, '');
    if (phone.length !== 10) return toast('Enter a valid 10-digit mobile number', 'warn');
    loginStep = { ...loginStep, step: 'otp', phone };
    renderLogin();
  },
  'login-edit': () => { loginStep.step = 'phone'; renderLogin(); },
  'login-verify': () => {
    const code = [...modal.querySelectorAll('[data-otp]')].map((i) => i.value).join('');
    if (code !== '1234') return toast('Incorrect OTP — the demo code is 1234', 'warn');
    const existing = JSON.parse(localStorage.getItem('beekey_users') || '{}')[loginStep.phone];
    if (existing) return finishLogin(existing);
    loginStep.step = 'profile';
    renderLogin();
  },
  'login-finish': () => {
    const name = $('#lg-name').value.trim(), address = $('#lg-addr').value.trim();
    if (!name || !address) return toast('Please add your name and address', 'warn');
    // Demo: pin the user somewhere within ~3 km of the city centre.
    const a = Math.random() * Math.PI * 2, r = 0.8 + Math.random() * 2.4;
    const user = { id: 'U' + loginStep.phone, name, phone: loginStep.phone, address, x: +(Math.cos(a) * r).toFixed(2), y: +(Math.sin(a) * r).toFixed(2) };
    const users = JSON.parse(localStorage.getItem('beekey_users') || '{}');
    users[user.phone] = user;
    localStorage.setItem('beekey_users', JSON.stringify(users));
    finishLogin(user);
  },
  logout: () => { store.set({ user: null }); toast('Logged out. See you soon! 🐝'); location.hash = '#/'; },
  'reset-demo': () => { if (confirm('Clear all demo orders, bookings and logins?')) { store.reset(); localStorage.removeItem('beekey_users'); location.hash = '#/'; render(); } },
  'save-profile': () => {
    const name = $('#pf-name').value.trim(), address = $('#pf-addr').value.trim();
    if (!name || !address) return toast('Name and address are required', 'warn');
    const user = { ...S().user, name, address };
    const users = JSON.parse(localStorage.getItem('beekey_users') || '{}');
    users[user.phone] = user; localStorage.setItem('beekey_users', JSON.stringify(users));
    store.set({ user }); toast('Profile saved'); render();
  },

  checkout: () => requireLogin('Login to place your order — it takes 20 seconds.', () => {
    const { cart, user } = S();
    const t = cartTotals(cart);
    if (t.items.some((i) => i.rx) && !rxFileName) { render(); return toast('Please upload a prescription for Rx items', 'warn'); }
    const order = createMedicineOrder({ user, items: t.items.map(({ id, name, price, qty }) => ({ id, name, price, qty })), source: 'cart', rxFile: rxFileName });
    store.set({ cart: [] });
    rxFileName = '';
    toast(`Order sent to ${byId(SHOPS, order.shopId).name}, ${order.distanceKm.toFixed(1)} km away`);
    location.hash = `#/track/${order.id}`;
  }),

  'doc-date': ({ id }) => { ui.docDate = id; ui.docSlot = null; render(); },
  'doc-slot': ({ id }) => { ui.docSlot = id; render(); },
  'book-doctor': ({ id }) => requireLogin('Login to confirm your consultation.', () => {
    const d = byId(DOCTORS, id), { user } = S();
    if (!ui.docSlot || slotState(id, ui.docDate, ui.docSlot) !== 'free') { render(); return toast('That slot was just taken — please pick another', 'warn'); }
    const appt = { id: uid('AP'), userId: user.id, patient: { name: user.name, phone: user.phone }, doctorId: id, date: ui.docDate, slot: ui.docSlot, mode: 'online', meet: meetCode(), symptoms: ui.symptoms.trim(), status: 'upcoming', fee: d.fee, prescription: null, orderId: null, createdAt: now() };
    store.set(({ appointments }) => ({ appointments: [...appointments, appt] }));
    ui.docSlot = null; ui.symptoms = '';
    render();
    openModal(`<div class="success">
      <div class="success-icon">✓</div><h2>Consultation booked!</h2>
      <p>${esc(d.name)} · ${fmtDate(appt.date)} at <b>${appt.slot}</b></p>
      <div class="meet-box big"><span>📹</span><div><small class="muted">Your Google Meet link</small><code>${appt.meet.replace('https://', '')}</code></div><a class="btn btn-sm btn-primary" href="${appt.meet}" target="_blank" rel="noopener">Join</a></div>
      <p class="muted small">Join 5 minutes early. After the call your prescription appears in <b>My orders</b> and medicines are routed to the nearest pharmacy automatically.</p>
      <a class="btn btn-dark" href="#/orders/consults" data-act="close-modal">View my consultations</a></div>`);
  }),

  'pick-lab': ({ id }) => { ui.labId = id; ui.labSlot = null; const l = byId(LABS, id); if (!l.home) ui.homeCollect = false; else ui.homeCollect = true; render(); },
  'lab-home': ({ id }) => { ui.homeCollect = id === '1'; render(); },
  'lab-date': ({ id }) => { ui.labDate = id; render(); },
  'lab-slot': ({ id }) => { ui.labSlot = id; render(); },
  'book-lab': ({ id }) => requireLogin('Login to book your lab test.', () => {
    const { user } = S(), l = byId(LABS, ui.labId);
    const b = { id: uid('LB'), userId: user.id, patient: { name: user.name, phone: user.phone, address: user.address }, testId: id, labId: l.id, price: l.prices[id], date: ui.labDate, slot: ui.labSlot, home: ui.homeCollect && l.home, status: 'booked', createdAt: now() };
    store.set(({ labBookings }) => ({ labBookings: [...labBookings, b] }));
    ui.labSlot = null;
    render();
    openModal(`<div class="success"><div class="success-icon">✓</div><h2>Test booked!</h2>
      <p>${esc(byId(TESTS, id).name)} with <b>${esc(l.name)}</b></p>
      <p class="muted">${fmtDate(b.date)} at ${b.slot} · ${b.home ? '🏠 Sample collection at your address' : '🏥 Please visit the lab'}</p>
      <p class="muted small">${esc(byId(TESTS, id).prep)}. Pay ${inr(b.price)} at collection.</p>
      <a class="btn btn-dark" href="#/orders/tests" data-act="close-modal">View my bookings</a></div>`);
  }),
  'view-report': ({ id }) => {
    const b = S().labBookings.find((x) => x.id === id);
    openModal(`<div class="success"><div class="success-icon">📄</div><h2>${esc(byId(TESTS, b.testId).name)}</h2><p class="muted">Report uploaded by ${esc(byId(LABS, b.labId).name)}</p><p class="small">${esc(b.reportNote || 'All parameters within normal range.')}</p><a class="btn btn-primary" href="#/doctors">Discuss with a doctor</a></div>`);
  },
  'view-rx': ({ id }) => showPrescription(S().appointments.find((a) => a.id === id)),
  simulate: ({ id }) => { advanceOrder(id); render(); },

  'partner-login': ({ id }) => partnerLoginModal(id),
  'partner-apply': ({ id }) => partnerApplyModal(id),
  'partner-login-go': ({ id }) => {
    if ($('#pl-otp').value !== '1234') return toast('Incorrect OTP — the demo code is 1234', 'warn');
    store.set({ partner: { role: id, id: $('#pl-account').value } });
    closeModal();
    location.hash = `#/partner/${id}`;
  },
  'partner-logout': () => { store.set({ partner: null }); location.hash = '#/partner'; render(); },
};

function finishLogin(user) {
  store.set({ user });
  closeModal();
  toast(`Welcome, ${esc(user.name.split(' ')[0])}! 🐝`);
  const fn = afterLogin; afterLogin = null;
  fn ? fn() : render();
}

Object.assign(actions, partnerActions);

/* ───────────────────────── event wiring ───────────────────────── */
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el || el.disabled) return;
  const fn = actions[el.dataset.act];
  if (!fn) return;
  if (el.tagName === 'BUTTON') e.preventDefault();
  fn(el.dataset, el, e);
});

document.addEventListener('input', (e) => {
  const t = e.target;
  if (t.id === 'med-q') { ui.medQ = t.value; $('#med-grid').innerHTML = medGrid(); }
  if (t.id === 'symptoms') ui.symptoms = t.value;
  if (t.dataset.otp !== undefined) {
    t.value = t.value.replace(/\D/g, '');
    if (t.value) modal.querySelector(`[data-otp="${+t.dataset.otp + 1}"]`)?.focus();
  }
});

document.addEventListener('keydown', (e) => {
  const t = e.target;
  if (t.dataset?.otp !== undefined && e.key === 'Backspace' && !t.value) modal.querySelector(`[data-otp="${+t.dataset.otp - 1}"]`)?.focus();
  if (e.key === 'Enter' && modal.open && modal.classList.contains('modal-login') && t.tagName === 'INPUT') {
    const btn = modal.querySelector('.btn-primary[data-act]');
    if (btn) { e.preventDefault(); btn.click(); }
  }
});

document.addEventListener('change', (e) => {
  if (e.target.id === 'rx-file') { rxFileName = e.target.files[0]?.name || ''; render(); }
});

document.addEventListener('submit', (e) => {
  const f = e.target;
  if (f.dataset.form === 'search') {
    e.preventDefault();
    const q = new FormData(f).get('q').trim();
    if (q) location.hash = `#/search/${encodeURIComponent(q)}`;
  }
  if (f.dataset.form === 'apply') {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(f));
    store.set(({ applications }) => ({ applications: [...applications, { id: uid('PA'), role: f.dataset.role, ...data, status: 'under review', createdAt: now() }] }));
    openModal(`<div class="success"><div class="success-icon">🐝</div><h2>Application received!</h2><p>Thanks ${esc(data.name)} — our onboarding team will verify your details and call you on <b>+91 ${esc(data.phone)}</b> within 48 hours.</p><button class="btn btn-dark" data-act="close-modal">Done</button></div>`);
  }
});

window.addEventListener('hashchange', navigate);
// Keep tabs in sync: a partner acting in another tab updates the customer's tracking page live.
window.addEventListener('storage', (e) => { if (e.key === 'beekey_medics_v1') { store.reload(); if (!modal.open) render(); } });

/* ───────────────────────── boot ───────────────────────── */
const savedTheme = S().theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
document.documentElement.dataset.theme = savedTheme;
render();
