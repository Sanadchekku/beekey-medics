// Beekey Medics — premium illustrations for doctor specialities, lab test categories
// and illustrated doctor portraits. Same visual language as icons.js (shared gradient defs,
// `--acc` / `--acc-d` accent colours, gloss + soft ground shadow).
import { DEFS, TINTS } from './icons.js';

const T = {
  ...TINTS,
  bear: ['#e3a35c', '#a8662a'], pink: ['#ff8fb1', '#d9527e'], mint: ['#34d1bf', '#14958a'], navy: ['#3b6fd8', '#1f4aa0'],
};
const A = 'style="fill:var(--acc)"';
const AD = 'style="fill:var(--acc-d)"';
const SA = 'style="stroke:var(--acc)"';
const SAD = 'style="stroke:var(--acc-d)"';
const shadow = (rx = 40, cx = 60, cy = 107) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="7" fill="url(#bk-shadow)"/>`;
const sparkle = (x, y, r, fill = '#ffc81e') => `<path d="M${x} ${y - r}Q${x} ${y} ${x + r} ${y}Q${x} ${y} ${x} ${y + r}Q${x} ${y} ${x - r} ${y}Q${x} ${y} ${x} ${y - r}Z" fill="${fill}"/>`;
const drop = (x, y, s, fill = '#e8445a') => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M0-14S-10-2.6-10 4a10 10 0 0 0 20 0C10-2.6 0-14 0-14z" fill="${fill}"/><path d="M0-14S-10-2.6-10 4a10 10 0 0 0 20 0C10-2.6 0-14 0-14z" fill="url(#bk-sheen)"/><ellipse cx="-4" cy="3" rx="2.2" ry="3.6" fill="#fff" opacity=".65"/></g>`;
/** draw shape twice: thick outline first, fill on top → clean outline around unions */
const outlined = (shapes, fill, stroke = '#d9d2c2', w = 3) => `<g fill="${stroke}" stroke="${stroke}" stroke-width="${w}" stroke-linejoin="round">${shapes}</g><g fill="${fill}">${shapes}</g>`;
const HEART = 'M60 98C24 74 18 52 30 38C40 26 56 30 60 42C64 30 80 26 90 38C102 52 96 74 60 98Z';
const glossyHeart = () => `<path d="${HEART}" ${A}/><path d="${HEART}" fill="url(#bk-sheen)"/><ellipse cx="40" cy="44" rx="8" ry="5" transform="rotate(-35 40 44)" fill="#fff" opacity=".7"/>`;

/* ═══════════════ Doctor specialities ═══════════════ */
const SPEC = {
  general: ['honey', () => `${shadow(40)}
    <path d="M42 18Q36 46 60 60M78 18Q84 46 60 60" fill="none" stroke="url(#bk-metal)" stroke-width="5" stroke-linecap="round"/>
    <path d="M42 18Q36 46 60 60M78 18Q84 46 60 60" fill="none" stroke="#7e8796" stroke-width="5" stroke-linecap="round" opacity=".35"/>
    <circle cx="42" cy="15" r="5" fill="url(#bk-ink)"/><circle cx="78" cy="15" r="5" fill="url(#bk-ink)"/>
    <path d="M60 60C60 84 66 94 78 92" fill="none" stroke="#2d281a" stroke-width="6.5" stroke-linecap="round"/>
    <path d="M58.6 62C58.6 80 62 88 70 91" fill="none" stroke="#fff" stroke-width="1.4" stroke-linecap="round" opacity=".25"/>
    <rect x="76" y="86" width="10" height="9" rx="2" fill="url(#bk-metal)"/>
    <circle cx="90" cy="91" r="15" fill="url(#bk-metal)"/><circle cx="90" cy="91" r="15" fill="none" stroke="#9aa3b0"/>
    <circle cx="90" cy="91" r="10" ${A}/><circle cx="90" cy="91" r="10" fill="url(#bk-sheen)"/>
    <circle cx="60" cy="60" r="4" fill="url(#bk-metal)"/>
    ${sparkle(24, 70, 6)}${sparkle(30, 86, 3.5)}`],

  pediatrics: ['bear', () => `${shadow(36)}
    <circle cx="39" cy="33" r="11" ${A}/><circle cx="39" cy="33" r="6" fill="#f8dfbd"/>
    <circle cx="81" cy="33" r="11" ${A}/><circle cx="81" cy="33" r="6" fill="#f8dfbd"/>
    <ellipse cx="34" cy="86" rx="8" ry="12" transform="rotate(25 34 86)" ${AD}/><ellipse cx="86" cy="86" rx="8" ry="12" transform="rotate(-25 86 86)" ${AD}/>
    <ellipse cx="60" cy="90" rx="25" ry="18" ${A}/><ellipse cx="60" cy="92" rx="14" ry="11" fill="#f8dfbd"/>
    <ellipse cx="45" cy="104" rx="10" ry="6" ${AD}/><ellipse cx="75" cy="104" rx="10" ry="6" ${AD}/>
    <ellipse cx="45" cy="104" rx="5" ry="3" fill="#f8dfbd"/><ellipse cx="75" cy="104" rx="5" ry="3" fill="#f8dfbd"/>
    <circle cx="60" cy="54" r="24" ${A}/><circle cx="60" cy="54" r="24" fill="url(#bk-sheen)"/>
    <ellipse cx="60" cy="63" rx="11" ry="8" fill="#f8dfbd"/>
    <ellipse cx="60" cy="59" rx="4.2" ry="3" fill="#2d281a"/>
    <path d="M60 62v3M56 66q4 3 8 0" fill="none" stroke="#2d281a" stroke-width="1.6" stroke-linecap="round"/>
    <circle cx="50.5" cy="50" r="2.8" fill="#2d281a"/><circle cx="69.5" cy="50" r="2.8" fill="#2d281a"/>
    <circle cx="51.4" cy="49" r="1" fill="#fff"/><circle cx="70.4" cy="49" r="1" fill="#fff"/>
    <circle cx="45" cy="59" r="3.4" fill="#ff8fa3" opacity=".45"/><circle cx="75" cy="59" r="3.4" fill="#ff8fa3" opacity=".45"/>
    <g transform="translate(76 38) rotate(35)"><rect x="-9" y="-3.5" width="18" height="7" rx="3.5" fill="#f6c89a"/><rect x="-3" y="-3.5" width="6" height="7" fill="#eab37d"/></g>
    <g transform="translate(60 91) scale(.17) translate(-60 -64)"><path d="${HEART}" fill="#ff5c7a"/></g>`],

  dermatology: ['lilac', () => `${shadow(34)}
    <path d="M50 34V20Q50 10 60 10Q70 10 70 20V34Z" fill="url(#bk-ink)"/>
    <rect x="53" y="13" width="3" height="16" rx="1.5" fill="#fff" opacity=".2"/>
    <rect x="46" y="32" width="28" height="12" rx="3" fill="#2d281a"/>
    <rect x="50" y="42" width="20" height="8" fill="#3a3322"/>
    <path d="M38 58Q38 48 48 48H72Q82 48 82 58V96Q82 105 73 105H47Q38 105 38 96Z" ${A} fill-opacity=".9"/>
    <rect x="44" y="64" width="32" height="28" rx="5" fill="#fffaf0"/>
    <path d="M60 70s-6 6.4-6 9.8a6 6 0 0 0 12 0c0-3.4-6-9.8-6-9.8z" ${A}/>
    <path d="M38 58Q38 48 48 48H72Q82 48 82 58V96Q82 105 73 105H47Q38 105 38 96Z" fill="url(#bk-shade-h)"/>
    <rect x="42" y="52" width="4" height="48" rx="2" fill="#fff" opacity=".5"/>
    ${sparkle(95, 42, 8)}${sparkle(24, 52, 5.5)}${sparkle(98, 72, 4)}
    ${drop(98, 98, .6, 'var(--acc)').replace('fill="var(--acc)"', A)}`],

  gynecology: ['rose', () => `${shadow(30)}
    <circle cx="60" cy="44" r="23" fill="none" ${SAD} stroke-width="13" opacity=".35" transform="translate(1.5 2)"/>
    <rect x="54" y="64" width="12" height="38" rx="6" ${A}/>
    <rect x="42" y="78" width="36" height="11" rx="5.5" ${A}/>
    <circle cx="60" cy="44" r="23" fill="none" ${SA} stroke-width="12"/>
    <path d="M40 36A23 23 0 0 1 56 21.4" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" opacity=".6"/>
    <rect x="56" y="68" width="3" height="30" rx="1.5" fill="#fff" opacity=".4"/>
    <g transform="translate(60 45) scale(.3) translate(-60 -64)"><path d="${HEART}" ${A}/><path d="${HEART}" fill="url(#bk-sheen)"/></g>
    ${sparkle(92, 26, 7)}${sparkle(26, 76, 5)}`],

  cardiology: ['red', () => `${shadow(38)}${glossyHeart()}
    <path d="M18 64H40L46 52L54 78L62 44L68 66L72 60H102" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
    ${sparkle(98, 26, 6)}`],

  orthopedics: ['blue', () => `${shadow(42)}
    <g transform="rotate(-35 60 60)">
      ${outlined('<rect x="22" y="51" width="76" height="18" rx="6"/><circle cx="22" cy="48" r="13"/><circle cx="22" cy="72" r="13"/><circle cx="98" cy="48" r="13"/><circle cx="98" cy="72" r="13"/>', 'url(#bk-white)')}
      <path d="M22 51h76v18H22z" fill="url(#bk-shade)" opacity=".6"/>
      <ellipse cx="19" cy="42" rx="6" ry="3" fill="#fff"/>
      <rect x="46" y="45" width="28" height="30" rx="6" ${A}/>
      <path d="M46 52h28M46 68h28" ${SAD} stroke-width="1.4" opacity=".5"/>
      <rect x="46" y="45" width="28" height="30" rx="6" fill="url(#bk-shade)"/>
      <path d="M60 53v14M53 60h14" stroke="#fff" stroke-width="3.8" stroke-linecap="round"/>
    </g>
    ${sparkle(98, 24, 6)}`],

  psychiatry: ['pink', () => {
    const B = 'M60 30C48 22 32 28 30 42C20 46 20 62 28 68C26 80 38 88 50 84C54 90 66 90 70 84C82 88 94 80 92 68C100 62 100 46 90 42C88 28 72 22 60 30Z';
    return `${shadow(36)}
    <path d="M55 84Q57 98 62 100Q65 94 66 84" ${AD}/>
    <path d="${B}" ${A}/><path d="${B}" fill="url(#bk-sheen)"/>
    <g fill="none" ${SAD} stroke-width="2.4" stroke-linecap="round" opacity=".55">
      <path d="M60 31C58 44 62 56 60 70C59 78 60 84 60 86"/>
      <path d="M38 44C44 40 50 44 48 52"/><path d="M31 60C39 57 44 63 40 70"/><path d="M50 72C54 66 50 59 44 59"/>
      <path d="M82 44C76 40 70 44 72 52"/><path d="M89 60C81 57 76 63 80 70"/><path d="M70 72C66 66 70 59 76 59"/>
    </g>
    <ellipse cx="44" cy="36" rx="7" ry="3.4" transform="rotate(-25 44 36)" fill="#fff" opacity=".6"/>
    ${sparkle(98, 26, 7)}${sparkle(20, 30, 4.5)}`;
  }],

  ent: ['mint', () => `${shadow(30, 64)}
    <path d="M60 20C84 18 98 36 96 56C94 72 82 74 80 86C78 98 66 104 56 98C48 93 50 84 56 82C62 80 64 74 60 68C54 60 46 54 46 40C46 28 52 21 60 20Z" fill="#f2c4a0"/>
    <path d="M60 20C84 18 98 36 96 56C94 72 82 74 80 86C78 98 66 104 56 98C48 93 50 84 56 82C62 80 64 74 60 68C54 60 46 54 46 40C46 28 52 21 60 20Z" fill="url(#bk-sheen)"/>
    <path d="M58 34C68 30 82 36 82 50C82 60 74 62 70 66" fill="none" stroke="#d48f68" stroke-width="3.4" stroke-linecap="round"/>
    <ellipse cx="68" cy="56" rx="6" ry="7" fill="#d9997a"/>
    <path d="M36 44Q28 58 36 72" fill="none" ${SA} stroke-width="4.5" stroke-linecap="round"/>
    <path d="M24 36Q10 58 24 80" fill="none" ${SA} stroke-width="4.5" stroke-linecap="round" opacity=".6"/>
    <path d="M13 28Q-6 58 13 88" fill="none" ${SA} stroke-width="4.5" stroke-linecap="round" opacity=".3"/>`],

  diabetology: ['navy', () => `${shadow(44)}
    <g transform="rotate(-35 60 58)">
      <rect x="8" y="53" width="12" height="14" rx="3" fill="url(#bk-metal)"/>
      <rect x="18" y="50" width="70" height="20" rx="10" ${A}/>
      <rect x="32" y="54" width="22" height="12" rx="3" fill="url(#bk-screen)"/>
      <text x="43" y="63.4" text-anchor="middle" font-family="Bricolage Grotesque, system-ui, sans-serif" font-weight="800" font-size="8" fill="#16130c">10U</text>
      <rect x="18" y="50" width="70" height="20" rx="10" fill="url(#bk-shade)"/>
      <rect x="22" y="52.5" width="62" height="3.5" rx="1.75" fill="#fff" opacity=".45"/>
      <rect x="84" y="49" width="24" height="22" rx="6" fill="url(#bk-white)"/>
      <rect x="88" y="45" width="16" height="5" rx="2" fill="url(#bk-metal)"/>
    </g>
    ${drop(34, 92, 1)}${sparkle(98, 88, 5)}`],

  dentistry: ['mint', () => {
    const TOOTH = 'M40 32C40 20 52 18 60 25C68 18 80 20 80 32C82 50 76 58 74 76C72 94 66 98 64 86C62 76 58 76 56 86C54 98 48 94 46 76C44 58 38 50 40 32Z';
    return `${shadow(30)}
    <circle cx="60" cy="56" r="40" ${A} opacity=".16"/>
    ${outlined(`<path d="${TOOTH}"/>`, 'url(#bk-white)', '#d6cfbf', 3.5)}
    <path d="${TOOTH}" fill="url(#bk-shade)"/>
    <path d="M46 30C47 24 53 24 56 28" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/>
    ${sparkle(88, 26, 8)}${sparkle(26, 44, 5)}${sparkle(90, 70, 4, 'var(--acc)').replace('fill="var(--acc)"', A)}`;
  }],
};

/* ═══════════════ Lab test categories ═══════════════ */
const tube = (x, y, rot, cap) => `<g transform="translate(${x} ${y}) rotate(${rot})">
  <rect x="-9" y="-30" width="18" height="64" rx="9" fill="#fff" fill-opacity=".6" stroke="#c4c9d1"/>
  <rect x="-7" y="-4" width="14" height="36" rx="7" ${A}/><rect x="-7" y="-4" width="14" height="36" rx="7" fill="url(#bk-shade-h)"/>
  <rect x="-9" y="-16" width="18" height="15" fill="#fffaf0"/><path d="M-5-11h10M-5-6h7" stroke="#cfc8b8" stroke-width="1.4"/>
  <rect x="-11.5" y="-44" width="23" height="17" rx="4" fill="${cap}"/><rect x="-11.5" y="-44" width="23" height="6" rx="3" fill="#fff" opacity=".3"/>
  <rect x="-5.5" y="-26" width="3" height="54" rx="1.5" fill="#fff" opacity=".6"/></g>`;
const cube = (cx, cy, s) => `<path d="M${cx} ${cy - s}L${cx + s} ${cy - s / 2}L${cx} ${cy}L${cx - s} ${cy - s / 2}Z" fill="#fff"/>
  <path d="M${cx - s} ${cy - s / 2}L${cx} ${cy}L${cx} ${cy + s}L${cx - s} ${cy + s / 2}Z" fill="#ece6d8"/>
  <path d="M${cx} ${cy}L${cx + s} ${cy - s / 2}L${cx + s} ${cy + s / 2}L${cx} ${cy + s}Z" fill="#d6cebd"/>
  ${[[-.4, -.5], [.2, -.6], [-.1, -.35], [-.6, .1], [-.3, .4], [.4, .1], [.6, .35]].map(([a, b]) => `<circle cx="${cx + a * s}" cy="${cy + b * s}" r="${s * .045}" fill="#c9c0ac"/>`).join('')}`;

const LAB = {
  blood: ['red', () => `${shadow(38)}${tube(46, 62, -12, '#7c5cff')}${tube(74, 60, 10, '#16130c')}${drop(96, 94, .9)}`],

  diabetes: ['rose', () => `${shadow(42)}${cube(42, 88, 17)}${cube(70, 96, 13)}
    <g transform="translate(76 46) scale(2.1)"><path d="M0-14S-10-2.6-10 4a10 10 0 0 0 20 0C10-2.6 0-14 0-14z" ${A}/><path d="M0-14S-10-2.6-10 4a10 10 0 0 0 20 0C10-2.6 0-14 0-14z" fill="url(#bk-sheen)"/><ellipse cx="-4.6" cy="1" rx="1.8" ry="3.2" fill="#fff" opacity=".7"/></g>
    <text x="77" y="58" text-anchor="middle" font-family="Bricolage Grotesque, system-ui, sans-serif" font-weight="800" font-size="11" fill="#fff">A1c</text>
    ${sparkle(26, 40, 6)}`],

  thyroid: ['mint', () => `${shadow(38)}
    <rect x="51" y="14" width="18" height="92" rx="9" fill="#f3d3ca"/>
    ${[22, 32, 42, 82, 92].map((y) => `<rect x="51" y="${y}" width="18" height="4" rx="2" fill="#e2b3a6"/>`).join('')}
    <path d="M56 56C50 38 40 28 31 34C22 42 24 72 33 83C42 92 53 86 56 70Z" ${A}/>
    <path d="M64 56C70 38 80 28 89 34C98 42 96 72 87 83C78 92 67 86 64 70Z" ${A}/>
    <path d="M53 58Q60 65 67 58V72Q60 77 53 72Z" ${AD}/>
    <path d="M56 56C50 38 40 28 31 34C22 42 24 72 33 83C42 92 53 86 56 70Z" fill="url(#bk-sheen)"/>
    <path d="M64 56C70 38 80 28 89 34C98 42 96 72 87 83C78 92 67 86 64 70Z" fill="url(#bk-sheen)"/>
    <ellipse cx="33" cy="48" rx="3" ry="8" fill="#fff" opacity=".55"/><ellipse cx="85" cy="48" rx="3" ry="8" fill="#fff" opacity=".35"/>
    ${sparkle(100, 24, 6)}`],

  fullbody: ['honey', () => `${shadow(38)}
    <rect x="24" y="20" width="68" height="86" rx="11" ${A}/><rect x="24" y="20" width="68" height="86" rx="11" fill="url(#bk-shade)"/>
    <rect x="31" y="30" width="54" height="70" rx="5" fill="#fffdf6"/>
    <rect x="44" y="13" width="28" height="15" rx="5" fill="url(#bk-metal)"/><circle cx="58" cy="17.5" r="2.4" fill="#8e97a4"/>
    ${[46, 62, 78].map((y, i) => `<circle cx="42" cy="${y}" r="5.5" fill="${i < 2 ? '#2ec27e' : '#e6e0d2'}"/>${i < 2 ? `<path d="M39.4 ${y}l1.9 2 3.4-3.8" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>` : ''}<rect x="52" y="${y - 3}" width="26" height="3" rx="1.5" fill="#e3dccb"/><rect x="52" y="${y + 2}" width="16" height="2.6" rx="1.3" fill="#eee8da"/>`).join('')}
    <circle cx="90" cy="94" r="15" fill="url(#bk-ink)"/>
    <path d="M90 87v14M83 94h14" ${SA} stroke-width="4" stroke-linecap="round"/>`],

  heart: ['red', () => `${shadow(42)}
    <rect x="46" y="76" width="12" height="12" fill="#3a3322"/><rect x="34" y="86" width="36" height="6" rx="3" fill="url(#bk-ink)"/>
    <rect x="14" y="20" width="76" height="58" rx="10" fill="url(#bk-ink)"/>
    <rect x="20" y="26" width="64" height="44" rx="5" fill="#0f2a1f"/>
    <path d="M22 50H36L41 38L47 62L52 32L57 56L61 50H82" fill="none" stroke="#4ade80" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
    <text x="78" y="36" text-anchor="end" font-family="Bricolage Grotesque, system-ui, sans-serif" font-weight="800" font-size="8" fill="#4ade80">72</text>
    <rect x="18" y="23" width="68" height="4" rx="2" fill="#fff" opacity=".1"/>
    <g transform="translate(86 84) scale(.46) translate(-60 -64)">${glossyHeart()}</g>`],

  vitamins: ['orange', () => `${shadow(40)}
    <g transform="translate(44 44)">${Array.from({ length: 12 }, (_, i) => `<rect x="-3" y="-36" width="6" height="11" rx="3" fill="#ffc81e" transform="rotate(${i * 30})"/>`).join('')}
      <circle r="21" fill="#ffc81e"/><circle r="21" fill="url(#bk-sheen)"/></g>
    <g transform="translate(74 82) rotate(-22) scale(1.55)">
      <ellipse rx="18" ry="11" ${A} fill-opacity=".95"/><ellipse rx="18" ry="11" fill="url(#bk-shade)"/>
      <text y="4.2" text-anchor="middle" font-family="Bricolage Grotesque, system-ui, sans-serif" font-weight="800" font-size="12" fill="#fff">D3</text>
      <ellipse cx="-6" cy="-5.2" rx="7" ry="2.2" fill="#fff" opacity=".7"/></g>`],

  liver: ['coral', () => {
    const K = 'M50 22C70 16 88 32 86 56C84 80 66 94 50 88C36 83 34 68 44 60C50 55 50 50 44 46C35 40 37 26 50 22Z';
    return `${shadow(42)}
    <path d="${K}" ${A}/><path d="${K}" fill="url(#bk-sheen)"/>
    <path d="M47 50C56 46 64 50 64 56C64 62 56 64 48 61" fill="#ffd1c2" opacity=".85"/>
    <path d="M48 56C42 70 40 84 44 100" fill="none" stroke="#f0b49e" stroke-width="5" stroke-linecap="round"/>
    <ellipse cx="62" cy="30" rx="8" ry="3.4" transform="rotate(-15 62 30)" fill="#fff" opacity=".55"/>
    <path d="M74 66H102L99 102Q98.5 106 94 106H82Q77.5 106 77 102Z" fill="#fff" fill-opacity=".7" stroke="#c4c9d1"/>
    <path d="M75.6 80H100.4L99 102Q98.5 105 94 105H82Q77.5 105 77 102Z" fill="#f7d44c"/>
    <rect x="72" y="58" width="32" height="9" rx="3" fill="#20c3b5"/><rect x="72" y="58" width="32" height="3.5" rx="1.75" fill="#fff" opacity=".35"/>
    <rect x="79" y="70" width="3" height="32" rx="1.5" fill="#fff" opacity=".6"/>`;
  }],

  imaging: ['navy', () => `${shadow(38)}
    <rect x="20" y="16" width="80" height="90" rx="9" fill="#e9eef5"/>
    <rect x="25" y="21" width="70" height="80" rx="5" fill="#0d1a2c"/>
    <ellipse cx="60" cy="58" rx="30" ry="34" fill="#3b6fd8" opacity=".25"/>
    <rect x="58" y="28" width="4" height="66" rx="2" fill="#fff" opacity=".85"/>
    <path d="M58 32Q46 27 33 32M62 32Q74 27 87 32" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".85"/>
    ${[40, 49, 58, 67, 76].map((y) => `<path d="M57 ${y}C46 ${y - 3} 36 ${y + 2} 34 ${y + 11}M63 ${y}C74 ${y - 3} 84 ${y + 2} 86 ${y + 11}" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" opacity=".7"/>`).join('')}
    <rect x="80" y="25" width="11" height="11" rx="2" ${A}/>
    <text x="85.5" y="33.6" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="800" font-size="8" fill="#fff">R</text>
    <rect x="25" y="21" width="70" height="20" rx="5" fill="url(#bk-gloss)" opacity=".18"/>`],
};

const render = (table, id, size, cls) => {
  const [tint, draw] = table[id] || Object.values(table)[0];
  const [acc, accD] = T[tint];
  return `<svg class="${cls}" width="${size}" height="${size}" viewBox="0 0 120 120" style="--acc:${acc};--acc-d:${accD}" aria-hidden="true">${draw()}</svg>`;
};
export const specArt = (id, size = 64, cls = 'care-art') => render(SPEC, id, size, cls);
export const labArt = (id, size = 64, cls = 'care-art') => render(LAB, id, size, cls);

/* ═══════════════ Illustrated doctor portraits ═══════════════ */
const SKIN = ['#f7d7bb', '#ecbd95', '#d6a072', '#ad7049', '#7d4b2f'];
const HAIR = ['#1d1712', '#3b2a1d', '#6b4a2f', '#a8a39a'];
// d.look = [gender 'f'|'m', style, skinIndex, hairIndex, glasses?, beard?]
export const LOOKS = {
  d1: ['f', 'long', 1, 0], d2: ['m', 'short', 2, 0, 1], d3: ['f', 'hijab', 1, 0], d4: ['m', 'short', 2, 1, 0, 1],
  d5: ['f', 'bob', 0, 1, 1], d6: ['f', 'bun', 2, 0], d7: ['m', 'side', 2, 3, 1], d8: ['m', 'short', 1, 0, 0, 1],
  d9: ['f', 'long', 1, 1], d10: ['m', 'side', 1, 1], d11: ['f', 'bun', 3, 0], d12: ['m', 'short', 0, 2, 1], d13: ['f', 'bun', 2, 3, 1],
};
const SPEC_TINT = Object.fromEntries(Object.entries(SPEC).map(([k, v]) => [k, v[0]]));

export function doctorAvatar(d, size = 76, cls = 'doc-art') {
  const [g, style, si, hi, glasses, beard] = LOOKS[d.id] || d.look || ['m', 'short', 2, 0];
  const skin = SKIN[si], hair = HAIR[hi];
  const [acc, accD] = T[SPEC_TINT[d.spec] === 'bear' ? 'orange' : SPEC_TINT[d.spec] || 'honey'];
  const hijab = style === 'hijab' ? '#4f7a8c' : null;
  const back = {
    long: `<path d="M37 56C35 30 47 25 60 25C73 25 85 30 83 56L86 86C76 92 44 92 34 86Z" fill="${hair}"/>`,
    bob: `<path d="M38 56C36 31 48 26 60 26C72 26 84 31 82 56L82 72C74 76 46 76 38 72Z" fill="${hair}"/>`,
    hijab: `<path d="M34 58C32 30 46 21 60 21C74 21 88 30 86 58C87 74 90 84 96 92C80 98 40 98 24 92C30 84 33 74 34 58Z" fill="${hijab}"/><path d="M36 70C40 84 50 90 60 90C70 90 80 84 84 70" fill="none" stroke="#000" stroke-width="2" opacity=".15"/>`,
  }[style] || '';
  const top = {
    short: `<path d="M41 50C39 31 51 26 62 27C74 28 82 36 79 50C77 41 70 37 60 37C51 37 44 41 41 50Z" fill="${hair}"/>`,
    side: `<path d="M41 52C38 32 50 25 62 26C75 27 83 36 79 52C78 44 74 39 66 38C58 37 50 40 44 38C42 42 41 47 41 52Z" fill="${hair}"/>`,
    long: `<path d="M41 52C41 33 51 28 61 28C71 28 80 34 79 52C73 42 60 36 47 44C45 46 43 49 41 52Z" fill="${hair}"/>`,
    bob: `<path d="M41 52C41 33 51 28 61 28C71 28 80 34 79 52C76 44 70 40 62 40C56 40 50 37 47 34C45 40 43 46 41 52Z" fill="${hair}"/>`,
    bun: `<circle cx="60" cy="22" r="9" fill="${hair}"/><path d="M41 50C40 33 51 28 60 28C70 28 80 33 79 50C75 41 68 37 60 37C52 37 45 41 41 50Z" fill="${hair}"/>`,
    hijab: `<path d="M40 50C40 32 50 26 60 26C70 26 80 32 80 50C76 40 70 36 60 36C50 36 44 40 40 50Z" fill="${hijab}"/><path d="M40 50C40 32 50 26 60 26C70 26 80 32 80 50" fill="none" stroke="#fff" stroke-width="2" opacity=".2"/>`,
  }[style];
  return `<svg class="${cls}" width="${size}" height="${size}" viewBox="17 12 86 86" style="--acc:${acc};--acc-d:${accD}" role="img" aria-label="${d.name}">
    ${back}
    <rect x="52" y="64" width="16" height="18" rx="4" fill="${skin}"/><rect x="52" y="64" width="16" height="9" fill="#000" opacity=".1"/>
    <path d="M14 122C14 94 32 80 60 80C88 80 106 94 106 122Z" fill="url(#bk-white)"/>
    <path d="M48 80L60 102L72 80Z" ${A}/><path d="M48 80L60 102L72 80Z" fill="url(#bk-shade)"/>
    <path d="M48 80L55 122M72 80L65 122" fill="none" stroke="#d9d2c2" stroke-width="1.6"/>
    <path d="M47 81L39 96L50 98ZM73 81L81 96L70 98Z" fill="#efeadf"/>
    ${hijab ? `<path d="M40 74C44 88 52 92 60 92C68 92 76 88 80 74L86 84C80 96 40 96 34 84Z" fill="${hijab}"/><path d="M40 74C44 88 52 92 60 92C68 92 76 88 80 74" fill="none" stroke="#fff" stroke-width="1.5" opacity=".18"/>` : ''}
    <path d="M46 82Q40 104 53 110M74 82Q82 98 76 106" fill="none" stroke="#2d281a" stroke-width="3" stroke-linecap="round"/>
    <circle cx="76" cy="109" r="5" fill="url(#bk-metal)"/><circle cx="76" cy="109" r="2.6" ${A}/>
    <rect x="27" y="100" width="13" height="7" rx="2" ${A}/>
    ${hijab ? '' : `<ellipse cx="41.5" cy="54" rx="3.6" ry="5.4" fill="${skin}"/><ellipse cx="78.5" cy="54" rx="3.6" ry="5.4" fill="${skin}"/>`}
    <ellipse cx="60" cy="52" rx="18" ry="21" fill="${skin}"/>
    <ellipse cx="60" cy="52" rx="18" ry="21" fill="url(#bk-sheen)" opacity=".5"/>
    ${beard ? `<path d="M42.5 56C44 72 53 76 60 76C67 76 76 72 77.5 56C74 66 67 69 60 69C53 69 46 66 42.5 56Z" fill="${hair}"/>` : ''}
    ${top}
    <path d="M50 47.5q3-1.8 6 0M64 47.5q3-1.8 6 0" fill="none" stroke="${hair === HAIR[3] ? '#6f6a61' : hair}" stroke-width="1.8" stroke-linecap="round"/>
    <ellipse cx="53" cy="53" rx="2" ry="2.4" fill="#2a2116"/><ellipse cx="67" cy="53" rx="2" ry="2.4" fill="#2a2116"/>
    <circle cx="53.7" cy="52.2" r=".7" fill="#fff"/><circle cx="67.7" cy="52.2" r=".7" fill="#fff"/>
    ${glasses ? '<g fill="none" stroke="#2d281a" stroke-width="1.6"><rect x="46.5" y="48" width="13" height="10" rx="4"/><rect x="60.5" y="48" width="13" height="10" rx="4"/><path d="M59.5 52h1"/></g>' : ''}
    <path d="M59 56q1 4-1.5 5" fill="none" stroke="#000" stroke-width="1.2" stroke-linecap="round" opacity=".18"/>
    ${beard ? '<path d="M54.5 64.5Q60 68 65.5 64.5" fill="none" stroke="#f3e3d3" stroke-width="1.8" stroke-linecap="round"/>' : `<path d="M54.5 64Q60 68.5 65.5 64" fill="none" stroke="#a5503f" stroke-width="1.8" stroke-linecap="round"/>`}
    <circle cx="48" cy="61" r="3.4" fill="#ff8fa3" opacity="${g === 'f' ? .35 : .18}"/><circle cx="72" cy="61" r="3.4" fill="#ff8fa3" opacity="${g === 'f' ? .35 : .18}"/>
  </svg>`;
}

/** Standalone files for export */
export const careArtFile = (kind, id) => {
  const [tint, draw] = (kind === 'spec' ? SPEC : LAB)[id];
  const [acc, accD] = T[tint];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="240" height="240" style="--acc:${acc};--acc-d:${accD}"><defs>${DEFS}</defs>${draw()}</svg>\n`;
};
export const doctorAvatarFile = (d) => doctorAvatar(d, 240).replace('<svg ', `<svg xmlns="http://www.w3.org/2000/svg" `).replace(/(<svg[^>]*>)/, `$1<defs>${DEFS}</defs>`) + '\n';
export const SPEC_IDS = Object.keys(SPEC);
export const LAB_IDS = Object.keys(LAB);
