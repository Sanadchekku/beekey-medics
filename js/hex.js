// Hexagonal spatial search (the same idea as Uber's H3, simplified to a flat km grid).
// The city is tiled with pointy-top hexagons. To find the nearest pharmacy we start at the
// customer's cell and expand ring by ring (k = 0, 1, 2 …) until a cell contains a shop that
// can fulfil the order. One extra ring is checked afterwards because hex distance ≠ straight-line
// distance, then the closest candidate wins.

const SQ3 = Math.sqrt(3);
export const HEX_KM = 0.9; // hex "radius" in km (~ H3 resolution 8)

const DIRS = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];

function cubeRound(q, r) {
  const s = -q - r;
  let rq = Math.round(q), rr = Math.round(r), rs = Math.round(s);
  const dq = Math.abs(rq - q), dr = Math.abs(rr - r), ds = Math.abs(rs - s);
  if (dq > dr && dq > ds) rq = -rr - rs;
  else if (dr > ds) rr = -rq - rs;
  return { q: rq, r: rr };
}

export const toHex = (x, y, size = HEX_KM) => cubeRound((SQ3 / 3 * x - y / 3) / size, (2 / 3 * y) / size);
export const fromHex = ({ q, r }, size = HEX_KM) => ({ x: size * SQ3 * (q + r / 2), y: size * 1.5 * r });
export const hexDistance = (a, b) => (Math.abs(a.q - b.q) + Math.abs(a.q + a.r - b.q - b.r) + Math.abs(a.r - b.r)) / 2;
export const km = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const key = (h) => `${h.q},${h.r}`;

export function ring(center, k) {
  if (k === 0) return [center];
  const out = [];
  let h = { q: center.q + DIRS[4][0] * k, r: center.r + DIRS[4][1] * k };
  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < k; j++) {
      out.push(h);
      h = { q: h.q + DIRS[i][0], r: h.r + DIRS[i][1] };
    }
  }
  return out;
}

/**
 * @param origin    {x,y} customer location (km)
 * @param partners  [{x,y,...}] candidate partners
 * @param canServe  predicate — e.g. shop has every item in stock
 * @returns {best, distanceKm, ringsSearched, origin, cellsVisited}
 */
export function hexSearch(origin, partners, canServe = () => true, maxK = 10) {
  const originHex = toHex(origin.x, origin.y);
  const index = new Map();
  for (const p of partners) {
    const k = key(toHex(p.x, p.y));
    if (!index.has(k)) index.set(k, []);
    index.get(k).push(p);
  }
  const found = [];
  let firstHit = -1, cellsVisited = 0, k = 0;
  for (; k <= maxK; k++) {
    for (const cell of ring(originHex, k)) {
      cellsVisited++;
      const here = index.get(key(cell));
      if (here) found.push(...here.filter(canServe));
    }
    if (found.length && firstHit < 0) firstHit = k;
    if (firstHit >= 0 && k >= firstHit + 1) break;
  }
  found.sort((a, b) => km(origin, a) - km(origin, b));
  const best = found[0] || null;
  return { best, distanceKm: best ? km(origin, best) : null, ringsSearched: Math.min(k, maxK), origin: originHex, cellsVisited };
}

/** Rough ETA: 6 min pack time + 3.5 min/km + 5 min buffer. */
export const etaMinutes = (distanceKm) => Math.round(6 + distanceKm * 3.5 + 5);

/**
 * SVG map of the hex grid around the customer.
 * @param opts { customer, shop, rider, rings, allShops, routeActive, radius }
 */
export function hexMapSVG({ customer, shop, rider, rings = 3, allShops = [], routeActive = false, radius }) {
  // Zoom to fit the searched rings and the assigned shop.
  const need = Math.max(rings, shop ? hexDistance(toHex(customer.x, customer.y), toHex(shop.x, shop.y)) : 0, rider ? hexDistance(toHex(customer.x, customer.y), toHex(rider.x, rider.y)) : 0);
  radius = radius ?? Math.min(7, Math.max(3, need + 2));
  const S = 22; // px per km
  const size = HEX_KM;
  const c = toHex(customer.x, customer.y);
  const cells = [];
  for (let k = 0; k <= radius; k++) for (const h of ring(c, k)) cells.push({ h, k });
  const corner = (cx, cy, i) => {
    const a = (Math.PI / 180) * (60 * i - 30);
    return `${(cx + size * S * Math.cos(a)).toFixed(1)},${(cy + size * S * Math.sin(a)).toFixed(1)}`;
  };
  const shopKey = shop ? key(toHex(shop.x, shop.y)) : '';
  const poly = cells.map(({ h, k }) => {
    const p = fromHex(h);
    const cx = p.x * S, cy = p.y * S;
    const pts = [0, 1, 2, 3, 4, 5].map((i) => corner(cx, cy, i)).join(' ');
    const cls = k === 0 ? 'hx-origin' : key(h) === shopKey ? 'hx-shop' : k <= rings ? 'hx-searched' : 'hx-idle';
    return `<polygon class="hx ${cls}" style="--k:${k}" points="${pts}"/>`;
  }).join('');

  const pin = (p, cls, label) => `<g class="pin ${cls}" transform="translate(${(p.x * S).toFixed(1)} ${(p.y * S).toFixed(1)})"><circle r="6"/><text y="-11">${label}</text></g>`;
  const others = allShops.filter((s) => !shop || s.id !== shop.id).map((s) => `<circle class="dot-shop" cx="${(s.x * S).toFixed(1)}" cy="${(s.y * S).toFixed(1)}" r="3.2"/>`).join('');
  let route = '';
  if (shop) {
    const a = { x: shop.x * S, y: shop.y * S }, b = { x: customer.x * S, y: customer.y * S };
    const mx = (a.x + b.x) / 2 + (b.y - a.y) * 0.18, my = (a.y + b.y) / 2 - (b.x - a.x) * 0.18;
    const d = `M${a.x.toFixed(1)} ${a.y.toFixed(1)} Q${mx.toFixed(1)} ${my.toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
    route = `<path id="bk-route" class="route ${routeActive ? 'active' : ''}" d="${d}"/>` +
      (routeActive ? `<g class="rider"><text font-size="16" text-anchor="middle" dominant-baseline="middle">🛵</text><animateMotion dur="6s" repeatCount="indefinite" rotate="0"><mpath href="#bk-route"/></animateMotion></g>` : '');
  }
  const ox = fromHex(c);
  const span = (radius + 0.6) * size * S * 1.75;
  const vb = `${(ox.x * S - span).toFixed(0)} ${(ox.y * S - span).toFixed(0)} ${(span * 2).toFixed(0)} ${(span * 2).toFixed(0)}`;
  return `<svg class="hexmap" viewBox="${vb}" role="img" aria-label="Hexagonal map of nearby pharmacies">
    <g>${poly}</g>${others}${route}
    ${shop ? pin(shop, 'pin-shop', '🏪 ' + shop.name) : ''}
    ${rider && !routeActive ? pin(rider, 'pin-rider', '🛵') : ''}
    ${pin(customer, 'pin-home', '🏠 You')}
  </svg>`;
}
