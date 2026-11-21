import {
  SPECIALTIES, DOCTORS, MED_CATEGORIES, MEDICINES, TEST_CATEGORIES, TESTS, LABS, SHOPS, DELIVERY,
  TIME_SLOTS, LAB_SLOTS, byId, seedNetwork, syncNetwork, migrateNetwork,
} from './data.js';
import { store, uid, now, customers } from './store.js';
import { hexSearch, hexMapSVG, etaMinutes, km } from './hex.js';
import { renderDashboard, partnerActions } from './partner.js';
import { medArt, catIcon, FORM_LABELS } from './icons.js';
import { specArt, labArt, doctorAvatar } from './icons-care.js';
import { isNative, setStatusBar } from './native.js';
import { CONFIG } from './config.js';
import { connectCloud, cloud } from './db.js';
import { mountMaps, TIMELAPSE, orderParts, askLocation, locActions } from './livemap.js';
import { renderAdmin, adminActions, handleAdminSubmit, fieldsHTML, formData } from './admin.js';
import {
  verified, starsOf, reviewsList, rateButton, forWhom, familySection, patientOf, rxUploadCard, refillCard,
  remindersView, featureActions, handleFeatureSubmit,
} from './features.js';

// Partner network: seed once, then keep the live (verified-only) lists in sync with the store.
if (!store.get().network) store.set({ network: seedNetwork() });
{ const net = structuredClone(store.get().network); if (migrateNetwork(net)) store.set({ network: net }); } // e.g. a new branch was added
syncNetwork(store.get().network);

/* ───────────────────────── helpers ───────────────────────── */
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const inr = (n) => '₹' + Number(n).toLocaleString('en-IN');
export const logo = (size = 40) => `<svg class="logo-mark" width="${size}" height="${size}" aria-hidden="true"><use href="#logo-mark"/></svg>`;
/** Real photo (Unsplash, see assets/photos/credits.json) with an optional illustration badge. */
export const photo = (key, alt, badge = '', cls = 'ph') => `<span class="${cls}"><img src="assets/photos/${key}.webp" alt="${esc(alt)}" loading="lazy" decoding="async" />${badge ? `<span class="ph-badge">${badge}</span>` : ''}</span>`;
/** Realistic product photo (assets/photos/products/<id>.webp). */
export const medPhoto = (m, cls = 'med-photo') => `<img class="${cls}" src="assets/photos/products/${m.id}.webp" alt="${esc(m.name)}" loading="lazy" decoding="async" />`;
const THEMES = [['medical', '🩺', 'Medical'], ['honey', '🍯', 'Honey'], ['dark', '🌙', 'Night']];
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
  el.innerHTML = `<span>${kind === 'ok' ? '✅' : kind === 'warn' ? '⚠️' : 'ℹ️'}</span><p>${msg}</p>`;
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
// Phones: when the keyboard opens, scroll the focused field into view so nothing hides behind it.
modal.addEventListener('focusin', (e) => { if (e.target.matches('input, textarea, select') && innerWidth <= 760) setTimeout(() => e.target.scrollIntoView({ block: 'center', behavior: 'smooth' }), 350); });

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
      <p class="partner-hint">Are you a doctor, lab, pharmacy or delivery partner? <a href="#/partner" data-act="close-modal">Partner login →</a><br>Beekey team? <a href="#/admin" data-act="close-modal">🛡️ Admin login →</a></p>
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
        <details class="theme-menu"><summary class="icon-btn" aria-label="Change colour theme" title="Colour theme">🎨</summary>
          <div class="theme-pop" role="menu">${THEMES.map(([id, ic, label]) => `<button role="menuitemradio" aria-checked="${document.documentElement.dataset.theme === id}" class="${document.documentElement.dataset.theme === id ? 'on' : ''}" data-act="theme" data-id="${id}"><i class="sw sw-${id}"></i>${ic} ${label}</button>`).join('')}</div></details>
        <a class="icon-btn cart-btn" href="#/cart" aria-label="Cart">🛒${cartCount() ? `<span class="cart-badge">${cartCount()}</span>` : ''}</a>
        ${user
          ? `<a class="avatar-btn" href="#/profile" title="${esc(user.name)}">${esc(user.name[0] || 'U').toUpperCase()}</a>`
          : `<button class="btn btn-sm btn-dark" data-act="login">Login</button>`}
      </div>
    </div>`;
  const tabs = [['/', 'Home', '🏠'], ['/medicines', 'Medicines', '💊'], ['/doctors', 'Doctors', '🩺'], ['/labs', 'Labs', '🧪'], ['/orders', 'Orders', '📦']];
  $('#tabbar').innerHTML = tabs.map(([p, l, i]) => `<a href="#${p}" class="${(p === '/' ? path === '/' : active(p) || path.startsWith(p)) ? 'active' : ''}"><span>${i}</span>${l}</a>`).join('');
  // Swiggy-style floating bar: an order in progress is always one tap away.
  const live = user && !path.startsWith('/track') && !path.startsWith('/partner') && !path.startsWith('/admin') && S().orders.filter((o) => o.userId === user.id && o.status !== 'delivered').sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  let bar = document.getElementById('order-bar');
  if (!bar) { bar = Object.assign(document.createElement('a'), { id: 'order-bar', className: 'order-bar' }); document.body.append(bar); }
  bar.hidden = !live;
  if (live) {
    bar.href = `#/track/${live.id}`;
    bar.innerHTML = `<span class="ob-ico">${live.riderId && live.status !== 'accepted' ? '🛵' : '🏪'}</span><span class="ob-txt"><small>Order #${esc(live.id.slice(-6))} · ${STATUS[live.status][0]}</small><b data-live="order:${live.id}">${esc(orderParts(live).text)}</b></span><span class="ob-eta" data-live="order-min:${live.id}"></span><span class="ob-go">Track →</span>`;
  }
  $('#footer').innerHTML = `
    <div class="wrap footer-in">
      <div class="footer-brand">${logo(48)}<div><b>Beekey Medics</b><p>Your neighbourhood health hive — local pharmacies, trusted doctors and labs, connected.</p></div></div>
      <div><h4>Services</h4><a href="#/medicines">Order medicines</a><a href="#/doctors">Online consultation</a><a href="#/labs">Lab tests</a></div>
      <div><h4>Partners</h4><a href="#/partner">Join as doctor</a><a href="#/partner">List your pharmacy</a><a href="#/partner">Become a delivery partner</a></div>
      <div><h4>Help</h4><a href="#/orders">Track order</a><a href="#/profile">Account</a><span class="muted small">Not for emergencies — call 108.</span><a href="#/admin">🛡️ Admin</a></div>
    </div>
    <div class="wrap footer-base"><span>© ${new Date().getFullYear()} Beekey Medics</span><span>Photos from <a href="https://unsplash.com" target="_blank" rel="noopener" class="inline-link">Unsplash</a> · Made with care for healthier neighbourhoods</span></div>`;
}

/* ───────────────────────── shared pieces ───────────────────────── */
const sectionHead = (title, sub, link) => `<div class="section-head"><div><h2>${title}</h2>${sub ? `<p class="muted">${sub}</p>` : ''}</div>${link ? `<a class="see-all" href="${link[0]}">${link[1]} →</a>` : ''}</div>`;

function productCard(m) {
  const inCart = S().cart.find((c) => c.id === m.id);
  return `<article class="product card">
    <a href="#/medicine/${m.id}" class="product-icon" aria-hidden="true" tabindex="-1">${medPhoto(m)}<span class="form-tag">${FORM_LABELS[m.form]}</span></a>
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
      <h3><a href="#/doctor/${d.id}">${esc(d.name)}</a> ${verified()}</h3>
      <p class="muted small">${esc(d.qual)}</p>
      <p class="doc-meta"><span class="pill">${specArt(sp.id, 18, 'mini-art')} ${sp.name}</span><span class="pill">${d.exp} yrs exp</span>${starsOf(d)}</p>
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

/* ───────── home hero slideshow: the hexagon photo changes every 6 seconds ───────── */
const HERO_SLIDES = [
  ['Smiling doctor talking with a patient'], ['Friendly doctor with a stethoscope'], ['Doctor consulting a patient over video call'],
  ['Pharmacist picking medicines'], ['Doctor examining a child'], ['Microscope in a diagnostic lab'],
];
const HERO_MS = 6000;
let heroIdx = 0, heroPausedUntil = 0;
function showHeroSlide(i) {
  heroIdx = (i + HERO_SLIDES.length) % HERO_SLIDES.length;
  const box = document.querySelector('.hero-photo');
  if (!box) return;
  box.querySelectorAll('img').forEach((img, k) => img.classList.toggle('on', k === heroIdx));
  box.setAttribute('aria-label', HERO_SLIDES[heroIdx][0]);
  document.querySelectorAll('.hero-dots button').forEach((b, k) => { b.classList.toggle('on', k === heroIdx); b.setAttribute('aria-selected', k === heroIdx); });
}
setInterval(() => {
  if (document.hidden || Date.now() < heroPausedUntil || !document.querySelector('.hero-photo')) return;
  if (document.querySelector('.hero-art:hover')) return; // pause while the user is looking
  showHeroSlide(heroIdx + 1);
}, HERO_MS);

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
      <div class="hero-art reveal">
        <div class="hex-stack">
          <div class="hero-photo" role="img" aria-label="${esc(HERO_SLIDES[heroIdx][0])}">${HERO_SLIDES.map(([alt], i) => `<img class="${i === heroIdx ? 'on' : ''}" src="assets/photos/hero-${i + 1}.webp" alt="" ${i ? 'loading="lazy"' : ''} decoding="async" data-alt="${esc(alt)}" />`).join('')}</div>
          <div class="hex h1">${medArt(byId(MEDICINES, 'm1'), 70)}</div>
          <div class="hex h2">${specArt('general', 62)}</div>
          <div class="hex h3">${labArt('blood', 64)}</div>
        </div>
        <div class="float-card fc1"><b>🛵 18 min</b><span>avg. delivery from nearest shop</span></div>
        <div class="float-card fc2"><b>📹 Google Meet</b><span>video consults from home</span></div>
        <div class="hero-dots" role="tablist" aria-label="Choose photo">${HERO_SLIDES.map(([alt], i) => `<button role="tab" class="${i === heroIdx ? 'on' : ''}" aria-selected="${i === heroIdx}" aria-label="${esc(alt)}" data-act="hero-go" data-id="${i}"></button>`).join('')}</div>
      </div>
    </div>
  </section>

  <section class="wrap section">
    <div class="service-grid">
      <a href="#/medicines" class="service svc-med reveal">${photo('home-medicines', 'Pharmacist picking medicines from a pharmacy shelf', medArt(byId(MEDICINES, 'm1'), 40), 'ph svc-photo')}<h3>Order Medicines</h3><p>From the closest pharmacy in our hive. Delivered fast.</p><span class="svc-go">Shop now →</span></a>
      <a href="#/doctors" class="service svc-doc reveal">${photo('home-doctor', 'Doctor consulting a patient over a video call', specArt('general', 40), 'ph svc-photo')}<h3>Consult a Doctor</h3><p>Video consult on Google Meet. Prescription in minutes.</p><span class="svc-go">Find doctors →</span></a>
      <a href="#/labs" class="service svc-lab reveal">${photo('home-lab', 'Microscope in a diagnostic laboratory', labArt('blood', 40), 'ph svc-photo')}<h3>Book Lab Tests</h3><p>Compare lab prices. Home sample collection.</p><span class="svc-go">Book a test →</span></a>
    </div>
  </section>

  <section class="wrap section">${rxUploadCard()}</section>
  ${refillCard()}

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
    <div class="scroller">${SPECIALTIES.map((s) => `<a class="spec-card card" href="#/doctors/${s.id}">${photo('spec-' + s.id, s.name + ' doctor', specArt(s.id, 34))}<b>${s.name}</b><small>${((n) => `${n} doctor${n === 1 ? '' : 's'}`)(DOCTORS.filter((d) => d.spec === s.id).length)} online</small></a>`).join('')}</div>
  </section>

  <section class="wrap section">
    ${sectionHead('Shop by health concern', 'Pick what you need help with', ['#/medicines', 'All medicines'])}
    <div class="scroller concern-row">${MED_CATEGORIES.filter((c) => c.id !== 'all').map((c) => `<a class="concern-tile" href="#/medicines/${c.id}">${photo('med-' + c.id, c.name)}<span>${catIcon(c.id, 16)} ${c.name}</span></a>`).join('')}</div>
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
    ${photo('lab-' + cat.id, cat.name, labArt(cat.id, 26), 'ph test-thumb')}
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
    <div class="concern-row cat-pick" role="tablist" aria-label="Health concern">${MED_CATEGORIES.map((c) => `<button role="tab" class="concern-tile ${ui.medCat === c.id ? 'on' : ''}" aria-selected="${ui.medCat === c.id}" data-act="med-cat" data-id="${c.id}">${photo('med-' + c.id, c.name)}<span>${catIcon(c.id, 16)} ${c.name}</span></button>`).join('')}</div>
    <div class="type-row" aria-label="Browse by type">${[...new Set(MEDICINES.map((m) => m.form))].map((f) => `<button class="type-tile ${ui.medForm === f ? 'on' : ''}" data-act="med-form" data-id="${f}" aria-pressed="${ui.medForm === f}">${medArt(MEDICINES.find((m) => m.form === f), 64)}<span>${FORM_LABELS[f]}</span></button>`).join('')}</div>
    ${ui.medCat !== 'all' ? (() => { const c = byId(MED_CATEGORIES, ui.medCat); return `<div class="cat-banner slim">${photo('med-' + c.id, c.name)}<div class="cb-text"><h2>${catIcon(c.id, 22)} ${c.name}</h2><p>${MEDICINES.filter((m) => m.cat === c.id).length} products from pharmacies near you</p></div></div>`; })() : ''}
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
      <div class="detail-art photo">${medPhoto(m, 'med-photo big')}</div>
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
        ${t.items.map((i) => `<div class="cart-item card"><span class="ci-icon">${medPhoto(i)}</span><div><b>${esc(i.name)}</b> ${i.rx ? '<span class="tag-rx inline">Rx</span>' : ''}<p class="muted small">${esc(i.pack)}</p><span class="price">${inr(i.price * i.qty)}</span></div>${qtyStepper(i.id, i.qty)}</div>`).join('')}
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
        <div class="deliver-to">${user ? `<div class="dt-row"><span>📍 Deliver to <b>${esc(user.name)}</b></span><button class="btn btn-sm btn-ghost" data-act="loc-change">${user.loc ? 'Change' : 'Set on map'}</button></div><p class="muted small">${esc(user.address)}</p>${user.loc ? '' : '<p class="small warn-txt">You will confirm the exact location on the map before ordering.</p>'}` : '<span class="muted">📍 You will pick your delivery location on the map at checkout</span>'}</div>
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
    <div class="grid grid-specs">${SPECIALTIES.map((s) => `<a class="spec-tile card" href="#/doctors/${s.id}">${photo('spec-' + s.id, s.name + ' doctor', specArt(s.id, 40))}<b>${s.name}</b><p class="muted small">${s.blurb}</p><span class="muted small">${DOCTORS.filter((d) => d.spec === s.id).length} available · from ${inr(Math.min(...DOCTORS.filter((d) => d.spec === s.id).map((d) => d.fee)))}</span></a>`).join('')}</div>
  </section>`;
}

function viewDoctorList({ spec }) {
  const sp = byId(SPECIALTIES, spec);
  if (!sp) return viewNotFound();
  const docs = DOCTORS.filter((d) => d.spec === spec);
  return `
  <section class="wrap section page-head">
    <a class="back" href="#/doctors">← All specialities</a>
    <div class="cat-banner">${photo('spec-' + sp.id, sp.name)}<div class="cb-text"><span class="cb-art">${specArt(sp.id, 56)}</span><h1>${sp.name}</h1>
    <p>${sp.blurb} · ${docs.length} doctor${docs.length > 1 ? 's' : ''} available for online consultation</p></div></div>
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
          <p class="muted">${esc(d.qual)} ${verified('Registration verified')}</p>
          <p class="doc-meta"><span class="pill">${specArt(sp.id, 18, 'mini-art')} ${sp.name}</span><span class="pill">${d.exp} years experience</span>${starsOf(d)}</p>
          <p class="muted small">🗣 Speaks ${d.langs.join(', ')}</p>
          ${reviewsList(d)}
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
        ${slots.some((s) => s.st === 'free') ? `<div class="slot-grid">${slots.map((s) => `<button class="slot ${s.st} ${ui.docSlot === s.t ? 'on' : ''}" ${s.st !== 'free' ? 'disabled' : ''} data-act="doc-slot" data-id="${s.t}">${s.t}</button>`).join('')}</div>` : '<p class="no-slots">📅 No slots left on this day — please pick another date.</p>'}
        ${forWhom()}
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
    <div class="grid grid-specs">${TEST_CATEGORIES.map((c) => `<a class="spec-tile card" href="#/labs/${c.id}">${photo('lab-' + c.id, c.name, labArt(c.id, 40))}<b>${c.name}</b><p class="muted small">${c.blurb}</p><span class="muted small">${TESTS.filter((t) => t.cat === c.id).length} tests</span></a>`).join('')}</div>
    <div class="section">${sectionHead('Most booked')}<div class="grid grid-tests">${TESTS.slice(0, 9).map(testCard).join('')}</div></div>
  </section>`;
}

function viewTestList({ cat }) {
  const c = byId(TEST_CATEGORIES, cat);
  if (!c) return viewNotFound();
  return `
  <section class="wrap section page-head">
    <a class="back" href="#/labs">← All categories</a>
    <div class="cat-banner">${photo('lab-' + c.id, c.name)}<div class="cb-text"><span class="cb-art">${labArt(c.id, 56)}</span><h1>${c.name}</h1><p>${c.blurb} · ${TESTS.filter((t) => t.cat === cat).length} tests · compare prices across labs</p></div></div>
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
    <div class="card test-head">${photo('lab-' + t.cat, byId(TEST_CATEGORIES, t.cat).name, labArt(t.cat, 34), 'ph test-thumb xl')}<div><h1>${esc(t.name)}</h1>
      <p class="doc-meta"><span class="pill">🧾 ${t.params} parameter${t.params > 1 ? 's' : ''}</span><span class="pill">⏱ Report in ${t.tat}</span><span class="pill">🍽 ${t.prep}</span></p></div></div>
    <div class="section">${sectionHead('Choose a lab', `${offers.length} labs offer this test · sorted by price`)}
      <div class="lab-list">${offers.map((l) => `
        <button class="lab-row card ${ui.labId === l.id ? 'on' : ''}" data-act="pick-lab" data-id="${l.id}">
          <span class="radio" aria-hidden="true"></span>
          <div class="lab-name"><b>${esc(l.name)}</b> ${verified()}<p class="muted small">${l.nabl ? '🏅 NABL accredited · ' : ''}${starsOf(l, false)} · ${l.dist.toFixed(1)} km away</p>
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
      ${forWhom()}
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
  delivered: ['Delivered', 'Get well soon! 💙'],
};
export const STATUS_ORDER = Object.keys(STATUS);

function viewOrders({ tab }) {
  const { user, orders, appointments, labBookings } = S();
  if (!user) return `<section class="wrap section">${empty('📦', 'Login to see your orders', 'Your medicine orders, consultations and lab bookings live here.', '<button class="btn btn-primary" data-act="login">Login</button>')}</section>`;
  ui.ordersTab = tab || ui.ordersTab;
  const mine = (l) => l.filter((x) => x.userId === user.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const lists = { medicines: mine(orders), consults: mine(appointments), tests: mine(labBookings) };
  lists.reminders = S().reminders.filter((r) => r.userId === user.id);
  const tabs = [['medicines', '💊 Medicines'], ['consults', '🩺 Consultations'], ['tests', '🧪 Lab tests'], ['reminders', '⏰ Reminders']];
  let body = '';
  if (ui.ordersTab === 'medicines') {
    body = lists.medicines.length ? lists.medicines.map((o) => {
      const shop = byId(SHOPS, o.shopId);
      const i = STATUS_ORDER.indexOf(o.status);
      return `<div class="order-card card">
        <a class="oc-link" href="#/track/${o.id}"><div class="oc-top"><b>#${o.id}</b><span class="status s-${o.status}">${STATUS[o.status][0]}</span></div>
        <p class="muted small">${o.source === 'prescription' ? '📄 From your prescription · ' : o.source === 'upload' ? '📷 Uploaded prescription · ' : ''}${o.items.length + o.custom.length} item(s) · ${esc(shop.name)}</p>
        <div class="mini-progress"><span style="--p:${(i / (STATUS_ORDER.length - 1)) * 100}%"></span></div></a>
        <div class="oc-foot"><span>${inr(o.total)}</span><span class="oc-actions">${o.status === 'delivered' ? rateButton('shop', o.shopId, o.id, 'Rate pharmacy') : ''}${o.items.length ? `<button class="btn btn-sm btn-ghost" data-act="reorder" data-id="${o.id}">↻ Order again</button>` : ''}<a class="see-all" href="#/track/${o.id}">${o.status === 'delivered' ? 'Details' : 'Track live'} →</a></span></div>
      </div>`;
    }).join('') : empty('💊', 'No medicine orders yet', 'Orders from your cart and prescriptions appear here.', '<a class="btn btn-primary" href="#/medicines">Order medicines</a>');
  } else if (ui.ordersTab === 'consults') {
    body = lists.consults.length ? lists.consults.map(apptCard).join('') : empty('🩺', 'No consultations yet', 'Book a video consultation with a specialist.', '<a class="btn btn-primary" href="#/doctors">Find a doctor</a>');
  } else if (ui.ordersTab === 'reminders') {
    body = remindersView();
  } else {
    body = lists.tests.length ? lists.tests.map((b) => {
      const t = byId(TESTS, b.testId), l = byId(LABS, b.labId);
      const st = { booked: 'Booked', enroute: 'Collector on the way', collected: 'Sample collected', report: 'Report ready' }[b.status];
      return `<div class="order-card card"><div class="oc-top"><b>${esc(t.name)}</b><span class="status s-${b.status}">${st}</span></div>
        <p class="muted small">${esc(l.name)} · ${fmtDate(b.date)} at ${b.slot} · ${b.home ? '🏠 Home collection' : '🏥 Lab visit'}${b.patient.relation && b.patient.relation !== 'You' ? ` · for ${esc(b.patient.name)}` : ''}</p>
        <div class="oc-foot"><span>${inr(b.price)}</span><span class="oc-actions">${b.home && b.status !== 'report' ? `<a class="btn btn-sm ${b.status === 'enroute' ? 'btn-primary' : 'btn-ghost'}" href="#/track-lab/${b.id}">🛵 ${b.status === 'enroute' ? 'Track collector live' : 'Collection details'}</a>` : ''}${b.status === 'report' ? rateButton('lab', b.labId, b.id, 'Rate lab') + '<button class="btn btn-sm btn-dark" data-act="view-report" data-id="' + b.id + '">View report</button>' : ''}</span></div></div>`;
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
    <p class="small">📅 ${fmtDate(a.date)} · ${a.slot} · 📹 Google Meet${a.patient.relation && a.patient.relation !== 'You' ? ` · for <b>${esc(a.patient.name)}</b>` : ''}</p>
    ${a.status === 'upcoming' ? `<div class="meet-box"><code>${a.meet.replace('https://', '')}</code><a class="btn btn-sm btn-primary" href="${a.meet}" target="_blank" rel="noopener">Join Google Meet</a></div>
      <p class="muted small">After your call, ${esc(d.name.split(' ').slice(0, 2).join(' '))} will send your prescription — medicines go straight to the nearest pharmacy.</p>` : ''}
    ${a.prescription ? `<div class="oc-foot">${rateButton('doctor', a.doctorId, a.id, 'Rate doctor')}<button class="btn btn-sm btn-ghost" data-act="view-rx" data-id="${a.id}">📄 View prescription</button>${a.orderId ? `<a class="btn btn-sm btn-dark" href="#/track/${a.orderId}">🛵 Track medicines</a>` : ''}</div>` : ''}
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
      <h1>${o.status === 'delivered' ? 'Delivered! Get well soon 💙' : 'Your medicine will be delivered to you'}</h1>
      <p>${o.status === 'delivered' ? `Delivered at ${fmtTime(o.timeline.at(-1).at)}` : `Arriving by <b>${fmtTime(eta.toISOString())}</b> · ${title} — ${sub}`}</p></div>
    </div>
    <div class="track-layout">
      <div class="card map-card">
        <div class="map-head"><b>🗺️ Track your order</b><span class="muted small"><span class="live-dot"></span> <span data-live="order-src:${o.id}">Live · updates automatically</span></span></div>
        <div class="live-wrap"><div class="live-map" data-livemap="order:${o.id}:${o.status}"></div>
          <div class="live-card"><span class="lc-ico">${o.status === 'delivered' ? '✅' : rider && o.status !== 'accepted' ? '🛵' : '🏪'}</span><div><b data-live="order:${o.id}"></b><small class="muted">${title} — ${sub}</small></div>${o.status !== 'delivered' ? `<span class="lc-eta"><small>ETA</small><b data-live="order-min:${o.id}"></b></span>` : ''}</div></div>
        <div class="map-legend"><span><i class="lg-shop"></i>Medical shop</span><span><i class="lg-rider"></i>Delivery partner</span><span><i class="lg-home"></i>Delivery location</span><span><i class="lg-pick"></i>Partner → shop</span><span><i class="lg-drop"></i>Shop → you</span><span class="muted">Demo time-lapse ×${TIMELAPSE}</span></div>
      </div>
      <div class="track-side">
        <div class="card trip">
          <div class="trip-row ${o.status === 'placed' ? 'now' : 'ok'}"><span class="trip-ico t-shop">🏪</span><div><small class="muted">MEDICAL SHOP</small><b>${esc(shop.name)}</b><p class="muted small">${esc(shop.area)} · ${verified('Licensed')}</p><p class="small" data-live="order-shop:${o.id}"></p></div></div>
          <div class="trip-row ${!rider || o.status === 'accepted' ? (o.status === 'placed' ? 'wait' : 'now') : o.status === 'delivered' ? 'ok' : 'now'}"><span class="trip-ico t-rider">🛵</span><div><small class="muted">DELIVERY PARTNER</small>${rider && o.status !== 'accepted' && o.status !== 'placed' ? `<b>${esc(rider.name)}</b><p class="muted small">${esc(rider.vehicle)}</p>` : '<b>Not assigned yet</b>'}<p class="small" data-live="order-rider:${o.id}"></p><p class="small away" data-live="order-away:${o.id}"></p></div>${rider && o.status !== 'delivered' && o.status !== 'accepted' ? `<a class="btn btn-sm btn-ghost" href="tel:${rider.phone.replace(/\s/g, '')}">📞 Call</a>` : ''}</div>
          <div class="trip-row ${o.status === 'delivered' ? 'ok' : 'wait'}"><span class="trip-ico t-home">🏠</span><div><small class="muted">DELIVERY LOCATION</small><b>${esc(o.customer.name)}</b><p class="muted small">${esc(o.customer.address)}</p></div></div>
        </div>
        <div class="card">
          <ol class="stepper">${STATUS_ORDER.map((s, i) => {
            const tl = o.timeline.find((x) => x.s === s);
            return `<li class="step ${i < idx ? 'done' : i === idx ? 'current' : ''}"><span class="dot"></span><div><b>${STATUS[s][0]}</b><small>${tl ? fmtTime(tl.at) : STATUS[s][1]}</small></div></li>`;
          }).join('')}</ol>
          ${CONFIG.demoTools && o.status !== 'delivered' ? `<button class="btn btn-sm btn-ghost btn-block" data-act="simulate" data-id="${o.id}" title="Moves the order to the next stage as if the partner did it">▶ Simulate next step (demo)</button>` : ''}
        </div>
        <div class="card">
          <h3>Items</h3>
          ${o.items.map((i) => `<div class="sum-row"><span class="with-art">${medPhoto(byId(MEDICINES, i.id), 'med-photo xs')}${esc(i.name)} × ${i.qty}</span><span>${inr(i.price * i.qty)}</span></div>`).join('')}
          ${o.custom.map((i) => `<div class="sum-row"><span>${esc(i.name)} <small class="muted">${esc(i.dose || '')}</small></span><span class="muted small">price at shop</span></div>`).join('')}
          ${o.fee ? `<div class="sum-row"><span>Delivery</span><span>${inr(o.fee)}</span></div>` : ''}
          <div class="sum-row total"><span>Total (pay on delivery)</span><span>${inr(o.total)}</span></div>
        </div>
        <details class="card hex-how"><summary>⬡ How we picked this medical shop</summary>
          <p class="muted small">Hex search checked ${o.rings + 1} ring${o.rings ? 's' : ''} around you and found the nearest in-stock pharmacy ${o.distanceKm.toFixed(1)} km away.</p>
          ${hexMapSVG({ customer: o.customer, shop, rider: null, rings: o.rings, allShops: SHOPS })}</details>
      </div>
    </div>
  </section>`;
}

function viewTrackLab({ id }) {
  const b = S().labBookings.find((x) => x.id === id);
  if (!b) return viewNotFound();
  const t = byId(TESTS, b.testId), l = byId(LABS, b.labId);
  const steps = [['booked', 'Booked', `${fmtDate(b.date)} at ${b.slot}`], ['enroute', 'Collector on the way', 'Live on the map'], ['collected', 'Sample collected', 'Sent to the lab'], ['report', 'Report ready', 'In My orders']];
  const idx = steps.findIndex(([k]) => k === b.status);
  return `
  <section class="wrap section">
    <a class="back" href="#/orders/tests">← My lab bookings</a>
    <div class="eta-banner ${b.status === 'enroute' ? 'picked' : b.status === 'report' ? 'delivered' : 'placed'}">
      <div class="eta-bee">${labArt(t.cat, 64)}</div>
      <div><span class="eyebrow dark">Home sample collection · ${esc(t.name)}</span>
      <h1>${b.status === 'enroute' ? '<span data-live="lab:' + b.id + '">Sample collector is on the way</span>' : b.status === 'booked' ? 'Your collector will start before your slot' : b.status === 'collected' ? 'Sample collected — processing at the lab' : 'Your report is ready'}</h1>
      <p>${esc(l.name)} · ${fmtDate(b.date)} at <b>${b.slot}</b>${b.status === 'enroute' ? ' · arriving in <b data-live="lab-min:' + b.id + '"></b>' : ''}</p></div>
    </div>
    <div class="track-layout">
      <div class="card map-card">
        <div class="map-head"><b>🗺️ Live map</b><span class="muted small"><span class="live-dot"></span> ${b.status === 'enroute' ? 'Collector location updates live' : 'Lab and your address'}</span></div>
        <div class="live-wrap"><div class="live-map" data-livemap="lab:${b.id}"></div></div>
        <div class="map-legend"><span><i class="lg-home"></i>You</span><span><i class="lg-lab"></i>Lab</span><span><i class="lg-drop"></i>Collector route</span></div>
      </div>
      <div class="track-side">
        <div class="card"><ol class="stepper">${steps.map(([k, label, sub], i) => `<li class="step ${i < idx ? 'done' : i === idx ? 'current' : ''}"><span class="dot"></span><div><b>${label}</b><small>${sub}</small></div></li>`).join('')}</ol>
          ${CONFIG.demoTools && b.status === 'booked' ? `<button class="btn btn-sm btn-ghost btn-block" data-act="lab-sim" data-id="${b.id}">▶ Simulate collector start (demo)</button>` : ''}</div>
        <div class="card">
          <div class="party"><span>🧪</span><div><b>${esc(l.name)}</b><p class="muted small">${l.nabl ? 'NABL accredited' : 'Partner lab'} · ${verified('Verified lab')}</p></div></div>
          <div class="party"><span>🏠</span><div><b>${esc(b.patient.name)}</b><p class="muted small">${esc(b.patient.address)}</p></div></div>
          <p class="muted small">${esc(t.prep)}. Pay ${inr(b.price)} at collection.</p>
        </div>
      </div>
    </div>
  </section>`;
}

function viewProfile() {
  const { user, partner } = S();
  if (!user) return `<section class="wrap section">${empty('🩺', 'You are browsing as a guest', 'Login to book doctors, buy medicines and lab tests.', '<button class="btn btn-primary" data-act="login">Login</button>')}</section>`;
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
    ${familySection(user)}
    ${installPrompt ? '<div class="card install-cta"><span>📲</span><div><b>Install Beekey Medics</b><p class="muted small">Add the app to your home screen — opens instantly, works like a real app.</p></div><button class="btn btn-sm btn-primary" data-act="install-app">Install</button></div>' : ''}
    <div class="card link-list">
      <a href="#/orders/medicines">💊 Medicine orders</a><a href="#/orders/consults">🩺 Consultations</a><a href="#/orders/tests">🧪 Lab bookings</a><a href="#/orders/reminders">⏰ Medicine reminders</a>
      <a href="#/partner">${partner ? '🏢 Partner dashboard' : '🤝 Partner with us'}</a>
      <a href="#/admin">🛡️ Admin console</a>
    </div>
    <div class="row-actions"><button class="btn btn-ghost" data-act="logout">Log out</button>${CONFIG.demoTools ? `<button class="btn btn-ghost danger" data-act="reset-demo">${cloud.on ? 'Clear this device' : 'Reset demo data'}</button>` : ''}</div>
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

const viewNotFound = () => `<section class="wrap section">${empty('🔍', 'Page not found', 'We could not find what you were looking for.', '<a class="btn btn-primary" href="#/">Back home</a>')}</section>`;

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
    <p class="center muted small admin-link">Beekey team? <a href="#/admin">🛡️ Admin login →</a></p>
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
      ${fieldsHTML(role)}
      <p class="muted small">Our team verifies your licence / registration before you go live.</p>
      <button class="btn btn-primary btn-block">Submit application</button>
    </form>`, 'modal-login');
}

/* ───────────────────────── router ───────────────────────── */
const ROUTES = [
  ['/', viewHome], ['/medicines', viewMedicines], ['/medicines/:cat', viewMedicines], ['/medicine/:id', viewMedicine],
  ['/cart', viewCart], ['/doctors', viewSpecialties], ['/doctors/:spec', viewDoctorList], ['/doctor/:id', viewDoctor],
  ['/labs', viewLabs], ['/labs/:cat', viewTestList], ['/test/:id', viewTest], ['/orders', viewOrders], ['/orders/:tab', viewOrders],
  ['/track/:id', viewTrack], ['/track-lab/:id', viewTrackLab], ['/profile', viewProfile], ['/search/:q', viewSearch], ['/partner', viewPartner], ['/partner/:role', renderDashboard], ['/admin', renderAdmin],
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
  mountMaps(main);
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
  if (!res.best) { toast('No Beekey partner pharmacy delivers to this location yet — we are adding new branches soon', 'warn'); return null; }
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
  if (next === 'ready' && !riderId) riderId = hexSearch(byId(SHOPS, o.shopId), DELIVERY).best?.id || null;
  if (next === 'picked' && !riderId) return toast('No delivery partner available yet', 'warn');
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
  theme: ({ id }) => {
    applyTheme(id);
    store.set({ themeV2: id });
    renderChrome(currentPath());
  },
  add: ({ id }) => { setCart(id, 1); toast(`${byId(MEDICINES, id).name} added to cart`); render(); },
  inc: ({ id }) => { setCart(id, 1); render(); },
  dec: ({ id }) => { setCart(id, -1); render(); },
  'hero-go': ({ id }) => { showHeroSlide(+id); heroPausedUntil = Date.now() + HERO_MS; },
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
    const existing = customers.get(loginStep.phone);
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
    customers.save(user);
    finishLogin(user);
  },
  logout: () => { store.set({ user: null }); toast('Logged out. See you soon! 💙'); location.hash = '#/'; },
  'reset-demo': () => {
    // Shared database: never wipe it from a phone — just sign this device out and reload from the cloud.
    if (cloud.on) { if (confirm('Log out and clear this device? Orders and partners stay in the shared database.')) { store.set({ user: null, partner: null, admin: false, cart: [] }); location.hash = '#/'; location.reload(); } return; }
    if (confirm('Clear all demo orders, bookings, logins and partner changes?')) { store.reset(); customers.clear(); store.set({ network: seedNetwork() }); syncNetwork(S().network); location.hash = '#/'; render(); } },
  'install-app': async () => { if (!installPrompt) return; installPrompt.prompt(); await installPrompt.userChoice; installPrompt = null; render(); },
  'save-profile': () => {
    const name = $('#pf-name').value.trim(), address = $('#pf-addr').value.trim();
    if (!name || !address) return toast('Name and address are required', 'warn');
    const user = { ...S().user, name, address };
    customers.save(user);
    store.set({ user }); toast('Profile saved'); render();
  },

  checkout: () => requireLogin('Login to place your order — it takes 20 seconds.', () => {
    const { cart, user } = S();
    const t = cartTotals(cart);
    if (t.items.some((i) => i.rx) && !rxFileName) { render(); return toast('Please upload a prescription for Rx items', 'warn'); }
    // Always confirm where to deliver before the order goes to a pharmacy.
    askLocation({ title: 'Where should we deliver?', cta: `Deliver here · place order (${inr(t.total)})`, onConfirm: (u) => {
      const order = createMedicineOrder({ user: u, items: t.items.map(({ id, name, price, qty }) => ({ id, name, price, qty })), source: 'cart', rxFile: rxFileName });
      if (!order) return;
      store.set({ cart: [] });
      rxFileName = '';
      toast(`Order sent to ${byId(SHOPS, order.shopId).name}, ${order.distanceKm.toFixed(1)} km away`);
      location.hash = `#/track/${order.id}`;
    } });
  }),

  'doc-date': ({ id }) => { ui.docDate = id; ui.docSlot = null; render(); },
  'doc-slot': ({ id }) => { ui.docSlot = id; render(); },
  'book-doctor': ({ id }) => requireLogin('Login to confirm your consultation.', () => {
    const d = byId(DOCTORS, id), { user } = S(), who = patientOf(user);
    if (!ui.docSlot || slotState(id, ui.docDate, ui.docSlot) !== 'free') { render(); return toast('That slot was just taken — please pick another', 'warn'); }
    const appt = { id: uid('AP'), userId: user.id, patient: { name: who.name, relation: who.relation, phone: user.phone }, doctorId: id, date: ui.docDate, slot: ui.docSlot, mode: 'online', meet: meetCode(), symptoms: ui.symptoms.trim(), status: 'upcoming', fee: d.fee, prescription: null, orderId: null, createdAt: now() };
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
    if (ui.homeCollect && byId(LABS, ui.labId)?.home) return askLocation({ title: 'Where should we collect the sample?', cta: 'Confirm address & book test', what: 'lab', serves: () => [byId(LABS, ui.labId)], onConfirm: () => actions['book-lab-go']({ id }) });
    actions['book-lab-go']({ id });
  }),
  'book-lab-go': ({ id }) => {
    const { user } = S(), l = byId(LABS, ui.labId), who = patientOf(user);
    const b = { id: uid('LB'), userId: user.id, patient: { name: who.name, relation: who.relation, phone: user.phone, address: user.address, x: user.x, y: user.y }, testId: id, labId: l.id, price: l.prices[id], date: ui.labDate, slot: ui.labSlot, home: ui.homeCollect && l.home, status: 'booked', createdAt: now() };
    store.set(({ labBookings }) => ({ labBookings: [...labBookings, b] }));
    ui.labSlot = null;
    render();
    openModal(`<div class="success"><div class="success-icon">✓</div><h2>Test booked!</h2>
      <p>${esc(byId(TESTS, id).name)} with <b>${esc(l.name)}</b></p>
      <p class="muted">${fmtDate(b.date)} at ${b.slot} · ${b.home ? '🏠 Sample collection at your address' : '🏥 Please visit the lab'}</p>
      <p class="muted small">${esc(byId(TESTS, id).prep)}. Pay ${inr(b.price)} at collection.</p>
      <a class="btn btn-dark" href="#/orders/tests" data-act="close-modal">View my bookings</a></div>`);
  },
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
  toast(`Welcome, ${esc(user.name.split(' ')[0])}! 💙`);
  const fn = afterLogin; afterLogin = null;
  fn ? fn() : render();
}

Object.assign(actions, partnerActions, adminActions, featureActions, locActions, {
  'loc-change': () => requireLogin('Login to set your delivery location.', () => askLocation({ title: 'Set your delivery location', cta: 'Save location', onConfirm: () => { toast('Delivery location saved'); render(); } })),
  'lab-sim': ({ id }) => { store.set(({ labBookings }) => ({ labBookings: labBookings.map((x) => (x.id === id ? { ...x, status: 'enroute', enrouteAt: now() } : x)) })); render(); },
});

/* ───────────────────────── event wiring ───────────────────────── */
document.addEventListener('click', (e) => {
  document.querySelectorAll('details.theme-menu[open]').forEach((d) => { if (!d.contains(e.target)) d.open = false; });
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
  if (['admin-login', 'admin-add', 'review', 'family', 'reminder'].includes(f.dataset.form)) {
    e.preventDefault();
    if (!handleAdminSubmit(f)) handleFeatureSubmit(f);
    return;
  }
  if (f.dataset.form === 'search') {
    e.preventDefault();
    const q = new FormData(f).get('q').trim();
    if (q) location.hash = `#/search/${encodeURIComponent(q)}`;
  }
  if (f.dataset.form === 'apply') {
    e.preventDefault();
    const data = formData(f);
    store.set(({ applications }) => ({ applications: [...applications, { id: uid('PA'), role: f.dataset.role, data, status: 'under review', createdAt: now() }] }));
    openModal(`<div class="success"><div class="success-icon">🤝</div><h2>Application received!</h2><p>Thanks ${esc(data.name)} — our onboarding team will verify your details and call you on <b>+91 ${esc(data.phone)}</b> within 48 hours.</p><button class="btn btn-dark" data-act="close-modal">Done</button></div>`);
  }
});

window.addEventListener('hashchange', navigate);
// Keep tabs in sync: a partner acting in another tab updates the customer's tracking page live.
window.addEventListener('storage', (e) => { if (e.key === 'beekey_medics_v1') { store.reload(); syncNetwork(S().network); if (!modal.open) render(); } });

/* ───────────────────────── installable app (PWA) ───────────────────────── */
let installPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installPrompt = e; if (currentPath() === '/profile') render(); });
// Inside the iOS/Android app the files are already on the phone, so no service worker is needed.
if (!isNative && 'serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => { /* offline support unavailable */ });

/* ───────────────────────── boot ───────────────────────── */
function applyTheme(id) {
  const t = THEMES.some(([k]) => k === id) ? id : 'medical';
  document.documentElement.dataset.theme = t;
  const color = { medical: '#1a73e8', honey: '#0f0d08', dark: '#0e0c07' }[t];
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', color);
  setStatusBar();
}
applyTheme(S().themeV2 || 'medical'); // blue & white medical theme is the default
render();

// Shared cloud database (Supabase) when config.js has keys; otherwise everything stays on this device.
connectCloud({
  seedNetwork,
  migrate: migrateNetwork,
  onChange: () => { syncNetwork(S().network); if (!modal.open) render(); },
});
window.addEventListener('beekey:db-error', (e) => console.warn('Database:', e.detail));
