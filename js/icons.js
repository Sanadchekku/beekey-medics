// Beekey Medics — premium medicine illustrations (hand-built SVG, no external assets).
// Each medicine has a `form` (tablet, capsule, syrup …) and an accent colour. Shapes use
// `var(--acc)` / `var(--acc-d)` for colour, and shared gradient defs for gloss, glass and shadow,
// so one drawing serves every product in that form.

/* ───────────── shared gradient defs ───────────── */
export const DEFS = `
  <radialGradient id="bk-shadow"><stop offset="0" stop-color="#16130c" stop-opacity=".28"/><stop offset="1" stop-color="#16130c" stop-opacity="0"/></radialGradient>
  <linearGradient id="bk-gloss" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".85"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
  <linearGradient id="bk-shade" x1="0" x2="0" y1="0" y2="1"><stop offset=".45" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".28"/></linearGradient>
  <linearGradient id="bk-shade-h" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset=".35" stop-color="#fff" stop-opacity="0"/><stop offset=".7" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".26"/></linearGradient>
  <radialGradient id="bk-sheen" cx=".35" cy=".3" r=".7"><stop offset="0" stop-color="#fff" stop-opacity=".75"/><stop offset=".45" stop-color="#fff" stop-opacity=".08"/><stop offset="1" stop-color="#000" stop-opacity=".18"/></radialGradient>
  <linearGradient id="bk-foil" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#f4f6f9"/><stop offset=".45" stop-color="#d4d9e1"/><stop offset=".55" stop-color="#eef1f5"/><stop offset="1" stop-color="#b9c0cb"/></linearGradient>
  <linearGradient id="bk-white" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#ffffff"/><stop offset=".6" stop-color="#f6f3ec"/><stop offset="1" stop-color="#ddd8cc"/></linearGradient>
  <linearGradient id="bk-amber" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#f0a04b"/><stop offset=".5" stop-color="#c46a17"/><stop offset="1" stop-color="#7e3c0b"/></linearGradient>
  <linearGradient id="bk-metal" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#f1f3f6"/><stop offset=".5" stop-color="#aab1bc"/><stop offset="1" stop-color="#d6dbe2"/></linearGradient>
  <linearGradient id="bk-screen" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#e9fbf1"/><stop offset="1" stop-color="#bfe8d2"/></linearGradient>
  <linearGradient id="bk-ink" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#3a3322"/><stop offset="1" stop-color="#14110a"/></linearGradient>`;

const A = 'style="fill:var(--acc)"';
const AD = 'style="fill:var(--acc-d)"';
const SA = 'style="stroke:var(--acc)"';
const shadow = (rx = 40, cx = 60, cy = 106) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="7" fill="url(#bk-shadow)"/>`;
const ridges = (x, y, h, n, gap) => Array.from({ length: n }, (_, i) => `<rect x="${x + i * gap}" y="${y}" width="1.4" height="${h}" rx=".7" fill="#000" opacity=".16"/>`).join('');

/* ───────────── building blocks ───────────── */
const tablet = (cx, cy, r) => `
  <circle cx="${cx}" cy="${cy}" r="${r}" ${A}/>
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#bk-sheen)"/>
  <path d="M${cx - r * .72} ${cy + r * .1}h${r * 1.44}" fill="none" style="stroke:var(--acc-d)" stroke-width="${Math.max(1, r * .14)}" stroke-linecap="round" opacity=".55"/>
  <ellipse cx="${cx - r * .3}" cy="${cy - r * .42}" rx="${r * .42}" ry="${r * .2}" fill="#fff" opacity=".8"/>`;

const capsuleShape = (len = 40, rad = 15) => `
  <rect x="${-len}" y="${-rad}" width="${len * 2}" height="${rad * 2}" rx="${rad}" fill="url(#bk-white)"/>
  <path d="M0 ${-rad}H${-len + rad}A${rad} ${rad} 0 0 0 ${-len + rad} ${rad}H0Z" ${A}/>
  <rect x="-1.6" y="${-rad - .4}" width="3.2" height="${rad * 2 + .8}" rx="1.4" ${AD} opacity=".45"/>
  <rect x="${-len}" y="${-rad}" width="${len * 2}" height="${rad * 2}" rx="${rad}" fill="url(#bk-shade)"/>
  <rect x="${-len + rad * .55}" y="${-rad * .66}" width="${len * 1.5}" height="${rad * .38}" rx="${rad * .19}" fill="#fff" opacity=".7"/>`;

const plus = (cx, cy, s, w = 3) => `<path d="M${cx} ${cy - s}v${s * 2}M${cx - s} ${cy}h${s * 2}" ${SA} stroke-width="${w}" stroke-linecap="round"/>`;

/* ───────────── illustrations (viewBox 0 0 120 120) ───────────── */
const FORMS = {
  tablet: () => {
    const cells = [[29, 50], [46, 50], [74, 50], [91, 50], [29, 74], [46, 74], [74, 74], [91, 74]];
    return `${shadow(44)}
    <g transform="rotate(-12 60 62)">
      <rect x="14" y="32" width="92" height="60" rx="11" fill="url(#bk-foil)"/>
      <rect x="14.6" y="32.6" width="90.8" height="58.8" rx="10.5" fill="none" stroke="#97a0ad" stroke-width="1.2"/>
      <rect x="18" y="35" width="84" height="20" rx="9" fill="url(#bk-gloss)" opacity=".75"/>
      <line x1="60" y1="35" x2="60" y2="89" stroke="#97a0ad" stroke-width="1.3" stroke-dasharray="2 3"/>
      ${cells.map(([x, y], i) => i === 7
        ? `<circle cx="${x}" cy="${y}" r="9.5" fill="#cfd4dc"/><path d="M${x - 8} ${y - 3}l3 2 2-4 3 3 3-3 2 4 3-1" fill="none" stroke="#8e97a4" stroke-width="1.2" stroke-linejoin="round"/>`
        : `<circle cx="${x}" cy="${y}" r="9.5" fill="#fff" fill-opacity=".6" stroke="#b3bac5" stroke-width="1"/>${tablet(x, y, 6.6)}`).join('')}
    </g>
    ${tablet(95, 96, 11)}`;
  },

  capsule: () => `${shadow(42)}
    <g transform="translate(60 58) rotate(-36)">
      <g transform="translate(-4 30) rotate(64) scale(.6)">${capsuleShape()}</g>
      ${capsuleShape()}
    </g>`,

  syrup: (glass = 'url(#bk-amber)') => `${shadow(46, 64)}
    <rect x="48" y="26" width="24" height="15" rx="3" fill="${glass}"/>
    <rect x="44" y="11" width="32" height="18" rx="4.5" ${A}/>
    ${ridges(48, 13.5, 13, 7, 4)}
    <rect x="44" y="11" width="32" height="7" rx="3.5" fill="url(#bk-gloss)" opacity=".7"/>
    <path d="M40 48Q40 38 51 38H69Q80 38 80 48V95Q80 104 71 104H49Q40 104 40 95Z" fill="${glass}"/>
    <rect x="43" y="57" width="34" height="33" rx="4" fill="#fffaf0"/>
    <rect x="43" y="57" width="34" height="8" rx="3" ${A}/>
    ${plus(60, 77.5, 6, 3.4)}
    <path d="M40 48Q40 38 51 38H69Q80 38 80 48V95Q80 104 71 104H49Q40 104 40 95Z" fill="url(#bk-shade-h)"/>
    <rect x="44.5" y="42" width="4.5" height="56" rx="2.25" fill="#fff" opacity=".4"/>
    <path d="M85 84H105L102 103Q101.6 106 99 106H91Q88.4 106 88 103Z" fill="#fff" fill-opacity=".55" stroke="#c4c9d1" stroke-width="1.2"/>
    <path d="M86.4 93H103.6L102 103Q101.6 105 99 105H91Q88.4 105 88 103Z" ${A} opacity=".9"/>
    <path d="M89 88h4M89.6 93h3" stroke="#9aa1ad" stroke-width="1"/>`,

  gel: () => FORMS.syrup('url(#bk-white)'),

  sachet: () => {
    const sachet = (w = 48, h = 70) => {
      const zig = (y, dir) => { let d = ''; for (let x = -w / 2, i = 0; x <= w / 2 + .01; x += 4, i++) d += `L${x} ${y + (i % 2 ? dir * 2.6 : 0)}`; return d; };
      const top = zig(-h / 2, 1).replace(/^L/, 'M');
      const bottom = zig(h / 2, -1).split('L').filter(Boolean).reverse().map((p) => 'L' + p).join('');
      return `<path d="${top}${bottom}Z" ${A}/>
        <rect x="${-w / 2}" y="${-h / 2 + 2}" width="${w}" height="8" fill="#fff" opacity=".22"/>
        <rect x="${-w / 2}" y="${h / 2 - 10}" width="${w}" height="8" fill="#000" opacity=".1"/>
        <path d="M${-w / 2 + 3} ${-h / 2 + 13}h${w - 6}" stroke="#fff" stroke-width="1" stroke-dasharray="2 2" opacity=".7"/>
        <circle cx="0" cy="4" r="13" fill="#fff"/>
        <path d="M0 -4s-6 6.5-6 10a6 6 0 0 0 12 0c0-3.5-6-10-6-10z" ${A}/>
        <rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" fill="url(#bk-shade-h)"/>`;
    };
    return `${shadow(42)}
      <g transform="translate(70 58) rotate(14)" opacity=".92">${sachet()}</g>
      <g transform="translate(50 62) rotate(-10)">${sachet()}</g>`;
  },

  softgel: () => {
    const gel = (x, y, rot, s) => `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})">
      <ellipse rx="18" ry="11" ${A} fill-opacity=".93"/>
      <ellipse rx="18" ry="11" fill="url(#bk-shade)"/>
      <path d="M-18 0Q0 2.4 18 0" fill="none" style="stroke:var(--acc-d)" stroke-width="1" opacity=".4"/>
      <ellipse cx="-4" cy="-4.6" rx="10" ry="3.2" fill="#fff" opacity=".75"/>
      <ellipse cx="7" cy="4.5" rx="5" ry="1.8" fill="#fff" opacity=".3"/></g>`;
    return `${shadow(40)}${gel(42, 68, -28, 1)}${gel(78, 60, 22, 1.12)}${gel(60, 90, -4, 1)}`;
  },

  jar: () => `${shadow(40)}
    <rect x="36" y="38" width="48" height="64" rx="10" fill="url(#bk-white)"/>
    <rect x="36" y="55" width="48" height="34" ${A}/>
    <rect x="43" y="61" width="34" height="22" rx="4" fill="#fffaf0"/>
    <g transform="translate(60 72) rotate(-30) scale(.26)">${capsuleShape()}</g>
    <rect x="36" y="38" width="48" height="64" rx="10" fill="url(#bk-shade-h)"/>
    <rect x="40" y="42" width="4" height="56" rx="2" fill="#fff" opacity=".6"/>
    <rect x="38" y="20" width="44" height="20" rx="5" ${A}/>
    ${ridges(42, 23, 14, 9, 4.4)}
    <rect x="38" y="20" width="44" height="8" rx="4" fill="url(#bk-gloss)" opacity=".7"/>
    ${tablet(94, 98, 8)}${tablet(25, 100, 6.5)}`,

  effervescent: () => {
    const bubbles = [[30, 70, 3], [22, 62, 2.2], [36, 60, 1.8], [26, 50, 2.6], [40, 72, 1.6]];
    return `${shadow(46)}
    <g transform="rotate(-20 62 58)">
      <rect x="22" y="44" width="72" height="30" rx="7" ${A}/>
      <rect x="34" y="48" width="38" height="22" rx="3" fill="#fffaf0"/>
      <text x="53" y="63.5" text-anchor="middle" font-family="Bricolage Grotesque, system-ui, sans-serif" font-weight="800" font-size="10" style="fill:var(--acc-d)">C+Zn</text>
      <rect x="22" y="44" width="72" height="30" rx="7" fill="url(#bk-shade)"/>
      <rect x="25" y="47" width="66" height="5" rx="2.5" fill="#fff" opacity=".45"/>
      <rect x="90" y="40" width="17" height="38" rx="5" fill="url(#bk-white)"/>
      ${ridges(93, 43, 32, 3, 4.5)}
    </g>
    <circle cx="32" cy="94" r="13" fill="url(#bk-white)"/>
    <circle cx="32" cy="94" r="13" fill="none" stroke="#d8d2c3"/>
    ${[[28, 90], [36, 92], [31, 99], [37, 98], [26, 96]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.4" ${A} opacity=".75"/>`).join('')}
    ${bubbles.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="none" ${SA} stroke-width="1.2" opacity=".7"/>`).join('')}`;
  },

  lotion: () => `${shadow(38)}
    <path d="M50 16H75Q79 16 79 20V25H50Z" fill="url(#bk-white)"/>
    <rect x="76" y="17" width="16" height="5.5" rx="2.75" fill="url(#bk-white)" stroke="#d8d2c3" stroke-width=".8"/>
    <rect x="57" y="24" width="6" height="14" fill="url(#bk-metal)"/>
    <rect x="48" y="35" width="24" height="12" rx="3" fill="url(#bk-white)"/>
    ${ridges(51, 37, 8, 5, 4)}
    <rect x="38" y="45" width="44" height="59" rx="13" ${A}/>
    <rect x="44" y="62" width="32" height="28" rx="5" fill="#fffaf0"/>
    <path d="M60 67s-6 6.5-6 10a6 6 0 0 0 12 0c0-3.5-6-10-6-10z" ${A}/>
    <rect x="38" y="45" width="44" height="59" rx="13" fill="url(#bk-shade-h)"/>
    <rect x="42" y="50" width="4" height="48" rx="2" fill="#fff" opacity=".45"/>
    <path d="M95 22q4 5 0 8.5q-4-3.5 0-8.5z" fill="#fffaf0" stroke="#e1dbcc" stroke-width=".8"/>`,

  cream: () => `${shadow(46)}
    <g transform="rotate(-22 60 62)">
      <path d="M20 46L82 50Q87 50.5 87 55V69Q87 73.5 82 74L20 78Z" ${A}/>
      <path d="M38 47.2L66 49V75L38 76.8Z" fill="#fffaf0"/>
      ${plus(52, 62, 5, 3)}
      <path d="M20 46L82 50Q87 50.5 87 55V69Q87 73.5 82 74L20 78Z" fill="url(#bk-shade)"/>
      <path d="M22 49.5L80 53" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity=".5"/>
      <rect x="12" y="44" width="10" height="36" rx="1.5" ${AD}/>
      ${ridges(14, 46, 32, 3, 2.6)}
      <rect x="86" y="55" width="6" height="14" fill="url(#bk-white)"/>
      <rect x="91" y="51" width="16" height="22" rx="3.5" fill="url(#bk-white)"/>
      ${ridges(94, 53, 18, 3, 4)}
    </g>
    <path d="M84 102q-9 0-8-6t9-5q2-6 8-4t3 7q5 2 3 6t-15 2z" fill="#fffaf0" stroke="#e1dbcc" stroke-width="1"/>
    <path d="M86 96q4-3 8 0" fill="none" stroke="#e1dbcc" stroke-width="1.2" stroke-linecap="round"/>`,

  strips: () => `${shadow(46)}
    <rect x="58" y="28" width="44" height="60" rx="6" fill="url(#bk-white)"/>
    <rect x="58" y="28" width="44" height="14" rx="6" ${A}/>
    <rect x="58" y="36" width="44" height="6" ${A}/>
    <text x="85" y="66" text-anchor="middle" font-family="Bricolage Grotesque, system-ui, sans-serif" font-weight="800" font-size="16" fill="#16130c">50</text>
    <text x="85" y="76" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="700" font-size="6" fill="#7a7160">STRIPS</text>
    <rect x="58" y="28" width="44" height="60" rx="6" fill="url(#bk-shade-h)"/>
    <rect x="39" y="22" width="8" height="24" rx="1.5" fill="#fff" stroke="#cfcabd" stroke-width=".8"/>
    <rect x="39" y="22" width="8" height="6" rx="1.5" ${A}/>
    <path d="M43 6s-5 5.6-5 8.6a5 5 0 0 0 10 0C48 11.6 43 6 43 6z" fill="#e8445a"/>
    <ellipse cx="41.4" cy="13" rx="1.4" ry="2.2" fill="#fff" opacity=".6"/>
    <rect x="18" y="40" width="50" height="66" rx="15" fill="url(#bk-ink)"/>
    <rect x="26" y="50" width="34" height="24" rx="5" fill="url(#bk-screen)"/>
    <text x="43" y="67" text-anchor="middle" font-family="Bricolage Grotesque, system-ui, sans-serif" font-weight="800" font-size="14" fill="#16130c">112</text>
    <circle cx="33" cy="88" r="5" ${A}/><circle cx="53" cy="88" r="5" fill="#4a432f"/>
    <rect x="22" y="43" width="42" height="5" rx="2.5" fill="#fff" opacity=".12"/>`,

  bp: () => `${shadow(48)}
    <path d="M10 60Q12 44 30 42L46 44V94L30 96Q11 94 10 78Z" fill="#2c3a55"/>
    <path d="M12 62Q14 50 30 48L46 50V60L28 60Q18 61 12 66Z" fill="#fff" opacity=".1"/>
    <rect x="22" y="56" width="16" height="22" rx="3" fill="#3d4d6e"/>
    <path d="M44 84Q50 102 66 98" fill="none" stroke="#c4c9d1" stroke-width="3" stroke-linecap="round"/>
    <rect x="46" y="34" width="60" height="62" rx="13" fill="url(#bk-white)" stroke="#dcd6c8"/>
    <rect x="54" y="42" width="44" height="30" rx="5" fill="url(#bk-screen)"/>
    <text x="72" y="62" text-anchor="middle" font-family="Bricolage Grotesque, system-ui, sans-serif" font-weight="800" font-size="15" fill="#16130c">120</text>
    <text x="92" y="68" text-anchor="middle" font-family="Bricolage Grotesque, system-ui, sans-serif" font-weight="800" font-size="8" fill="#3c5a49">80</text>
    <path d="M93 49.5a2 2 0 0 0-3.4-1.4l-.4.4-.4-.4A2 2 0 0 0 85.4 51l3.8 3.6L93 51a2 2 0 0 0 0-1.5z" fill="#e8445a"/>
    <circle cx="76" cy="84" r="6.5" ${A}/><circle cx="76" cy="84" r="6.5" fill="url(#bk-sheen)"/>
    <circle cx="58" cy="84" r="3" fill="#cfc8b8"/><circle cx="94" cy="84" r="3" fill="#cfc8b8"/>`,

  thermometer: () => `${shadow(46)}
    <g transform="rotate(-34 60 60)">
      <rect x="4" y="56" width="18" height="8" rx="4" fill="url(#bk-metal)"/>
      <path d="M18 54Q18 50 24 50H104Q112 50 112 60Q112 70 104 70H24Q18 70 18 66Z" fill="url(#bk-white)" stroke="#dcd6c8"/>
      <rect x="40" y="54" width="34" height="12" rx="3" fill="url(#bk-screen)"/>
      <text x="57" y="63.4" text-anchor="middle" font-family="Bricolage Grotesque, system-ui, sans-serif" font-weight="800" font-size="8.5" fill="#16130c">98.6°</text>
      <circle cx="86" cy="60" r="4.6" ${A}/>
      <path d="M96 50H104Q112 50 112 60Q112 70 104 70H96Z" ${A}/>
      <rect x="22" y="52" width="80" height="3" rx="1.5" fill="#fff" opacity=".8"/>
      <path d="M18 54Q18 50 24 50H104Q112 50 112 60Q112 70 104 70H24Q18 70 18 66Z" fill="url(#bk-shade)"/>
    </g>`,
};

/* ───────────── colours ───────────── */
export const TINTS = {
  coral: ['#ff7a59', '#d94a26'], blue: ['#4aa8ff', '#1f72c9'], rose: ['#ff5c7a', '#cc2a4a'], red: ['#ff4d6d', '#b8173f'],
  green: ['#2ec27e', '#16865a'], honey: ['#ffc81e', '#e09400'], orange: ['#ff9f1c', '#d46f00'], lilac: ['#a77bff', '#7448db'],
  teal: ['#20c3b5', '#0f8a80'], white: ['#f2efe7', '#bdb6a5'], ink: ['#2d281a', '#0f0d08'],
};
const CAT_TINT = { fever: 'coral', cold: 'blue', diabetes: 'rose', heart: 'red', stomach: 'green', vitamins: 'orange', skin: 'lilac', devices: 'honey' };

export const FORM_LABELS = {
  tablet: 'Tablets', capsule: 'Capsules', syrup: 'Syrup', gel: 'Oral gel', sachet: 'Sachets', softgel: 'Softgels', jar: 'Tablet jar',
  effervescent: 'Effervescent', lotion: 'Lotion', cream: 'Cream', strips: 'Test strips', bp: 'BP monitor', thermometer: 'Thermometer',
};

/** Full-colour product illustration. */
export function medArt(m, size = 120, cls = 'med-art') {
  const [acc, accD] = TINTS[m.tint || CAT_TINT[m.cat] || 'honey'];
  const draw = FORMS[m.form] || FORMS.tablet;
  return `<svg class="${cls}" width="${size}" height="${size}" viewBox="0 0 120 120" style="--acc:${acc};--acc-d:${accD}" role="img" aria-label="${FORM_LABELS[m.form] || 'Medicine'}">${draw()}</svg>`;
}

/** Standalone .svg file (defs included) — used by scripts/export-icons.mjs. */
export function medArtFile(form, tint = 'honey') {
  const [acc, accD] = TINTS[tint];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="240" height="240" style="--acc:${acc};--acc-d:${accD}"><defs>${DEFS}</defs>${FORMS[form]()}</svg>\n`;
}

/* ───────────── category line icons (24×24, duotone) ───────────── */
const CAT_PATHS = {
  all: '<path class="d" d="M12 2.8l7.8 4.5v9L12 20.8l-7.8-4.5v-9z"/><path d="M12 8.6v6.8M8.6 12h6.8"/>',
  fever: '<path class="d" d="M14 14.4V5a2 2 0 1 0-4 0v9.4a4 4 0 1 0 4 0z"/><path d="M12 9v7.5"/><path d="M17.5 5.5h2M17.5 9h2"/>',
  cold: '<path class="d" d="M8 3.5S4 8.1 4 11a4 4 0 0 0 8 0c0-2.9-4-7.5-4-7.5z"/><path class="d" d="M17 10s-3 3.4-3 5.5a3 3 0 0 0 6 0c0-2.1-3-5.5-3-5.5z"/>',
  diabetes: '<path class="d" d="M12 3S6 9.7 6 14a6 6 0 0 0 12 0c0-4.3-6-11-6-11z"/><path d="M12 11.6v5M9.5 14.1h5"/>',
  heart: '<path class="d" d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.3a4.3 4.3 0 0 1 7.5 2.5C19.5 15.4 12 20 12 20z"/><path d="M5.5 12.5h3l1.5-2.5 2 4 1.5-2h5"/>',
  stomach: '<path class="d" d="M9 3v3.5c0 2.2-2.5 2.8-2.5 6C6.5 17 10 21 14.8 21c3.2 0 5.2-2 5.2-4.6 0-2.4-1.8-3.6-3.7-3.6-1.6 0-2.4.9-3.6.9-1.4 0-1.7-1.5-1.7-3.2V3"/>',
  vitamins: '<g transform="rotate(-45 12 12)"><rect class="d" x="3" y="8.5" width="18" height="7" rx="3.5"/><path d="M12 8.5v7"/></g>',
  skin: '<path class="d" d="M9 9.5h6a2 2 0 0 1 2 2V19a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-7.5a2 2 0 0 1 2-2z"/><path d="M10.5 9.5V6.5h3v3M12 6.5V3.5h4.5"/>',
  devices: '<path d="M6 3v5a4 4 0 0 0 8 0V3"/><path d="M10 12v3a4.5 4.5 0 0 0 9 0v-2.2"/><circle class="d" cx="19" cy="10.8" r="2.2"/>',
};
export const catIcon = (id, size = 18) => `<svg class="cat-icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${CAT_PATHS[id] || CAT_PATHS.all}</svg>`;

/* inject shared defs once (browser only) */
if (typeof document !== 'undefined' && !document.getElementById('bk-defs')) {
  document.body.insertAdjacentHTML('afterbegin', `<svg id="bk-defs" width="0" height="0" style="position:absolute" aria-hidden="true"><defs>${DEFS}</defs></svg>`);
}
