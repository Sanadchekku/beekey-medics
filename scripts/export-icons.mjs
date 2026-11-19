// Exports every illustration as a standalone SVG + one preview sheet at assets/icons/index.html.
// Run: npm run icons
import { mkdirSync, writeFileSync } from 'node:fs';
import { medArtFile, FORM_LABELS, TINTS } from '../js/icons.js';
import { careArtFile, doctorAvatarFile, SPEC_IDS, LAB_IDS } from '../js/icons-care.js';
import { SPECIALTIES, TEST_CATEGORIES, DOCTORS } from '../js/data.js';

const root = new URL('../assets/icons/', import.meta.url);
const write = (dir, name, svg) => { const d = new URL(dir + '/', root); mkdirSync(d, { recursive: true }); writeFileSync(new URL(name, d), svg); return `${dir}/${name}`; };
const card = (src, title, sub) => `<figure><img src="${src}" alt="${title}"><figcaption>${title}<small>${sub}</small></figcaption></figure>`;
const sections = [];

const MED_TINT = { tablet: 'coral', capsule: 'red', syrup: 'blue', gel: 'teal', sachet: 'orange', softgel: 'honey', jar: 'orange',
  effervescent: 'orange', lotion: 'lilac', cream: 'rose', strips: 'rose', bp: 'honey', thermometer: 'honey' };
const meds = Object.keys(FORM_LABELS).map((f) => card(write('medicines', `${f}.svg`, medArtFile(f, MED_TINT[f])), FORM_LABELS[f], `medicines/${f}.svg`));
const tints = Object.keys(TINTS).filter((t) => t !== 'ink').map((t) => card(write('medicines', `tablet-${t}.svg`, medArtFile('tablet', t)), `Tint: ${t}`, `medicines/tablet-${t}.svg`));
sections.push(['Medicine types', meds], ['Colour tints', tints]);
sections.push(['Doctor specialities', SPEC_IDS.map((id) => card(write('specialities', `${id}.svg`, careArtFile('spec', id)), SPECIALTIES.find((s) => s.id === id).name, `specialities/${id}.svg`))]);
sections.push(['Lab test categories', LAB_IDS.map((id) => card(write('labs', `${id}.svg`, careArtFile('lab', id)), TEST_CATEGORIES.find((c) => c.id === id).name, `labs/${id}.svg`))]);
sections.push(['Doctor portraits', DOCTORS.map((d) => card(write('doctors', `${d.id}.svg`, doctorAvatarFile(d)), d.name, `doctors/${d.id}.svg`))]);

writeFileSync(new URL('index.html', root), `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Beekey Icons</title>
<style>body{margin:0;padding:32px 16px;font:600 15px system-ui;background:#fffbef;color:#16130c}main{max-width:1200px;margin:auto}h1{font-size:30px;margin:0}h2{margin:36px 0 14px;font-size:20px}
.g{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:14px}
figure{margin:0;padding:16px 10px 12px;border-radius:22px;background:radial-gradient(circle at 50% 35%,#fff3c9,#fff 70%);border:1px solid #16130c18;text-align:center}
img{width:120px;height:120px}.doc img{border-radius:28px;background:linear-gradient(145deg,#fff0b3,#ffe27a)}figcaption{display:grid;gap:2px;font-size:14px}small{color:#7a7160;font-weight:500;font-size:12px}</style>
<main><h1>🐝 Beekey Medics — illustration library</h1>${sections.map(([t, c]) => `<h2>${t} <small>(${c.length})</small></h2><div class="g ${t.startsWith('Doctor p') ? 'doc' : ''}">${c.join('')}</div>`).join('')}</main>`);
console.log('exported', sections.reduce((n, [, c]) => n + c.length, 0), 'svgs → assets/icons/');
