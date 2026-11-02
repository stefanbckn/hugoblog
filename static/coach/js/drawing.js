// Tekeningen bij een blok: een half of heel veld met spelers, ballen,
// kegels, doeltjes en pijlen. Bewaard als figuren in veldmeters (niet als
// afbeelding), zodat ze klein blijven en scherp op elk scherm.
//
// Heel veld: 105 × 68, liggend. Half veld: 68 breed en 52,5 diep, staand,
// met het doel bovenaan.

export const FIELDS = {
  half: { w: 68, h: 52.5, vb: "-4 -5 76 62", scale: 1 },
  full: { w: 105, h: 68, vb: "-4 -4 113 76", scale: 1.3 },
};

export const LINE_STYLES = { run: "Lopen", pass: "Pass", dribble: "Dribbel" };

const r1 = (n) => Math.round(n * 10) / 10;

// MARK: - Het veld

function stripes(field, horizontal) {
  let out = `<rect x="-4" y="-5" width="${field.w + 8}" height="${field.h + 10}" fill="var(--grass)"/>`;
  const step = 7;
  const length = horizontal ? field.w : field.h;
  for (let i = 0, p = 0; p < length; i++, p += step) {
    if (i % 2) continue;
    out += horizontal
      ? `<rect x="${p}" y="-5" width="${Math.min(step, field.w - p)}" height="${field.h + 10}" fill="var(--grass-stripe)"/>`
      : `<rect x="-4" y="${p}" width="${field.w + 8}" height="${Math.min(step, field.h - p)}" fill="var(--grass-stripe)"/>`;
  }
  return out;
}

const chalk = (inner) => `<g fill="none" stroke="var(--chalk)" stroke-width="0.35">${inner}</g>`;

function fullPitch() {
  const f = FIELDS.full, cy = f.h / 2;
  const box = (x, w) => `<rect x="${x}" y="${cy - 20.15}" width="${w}" height="40.3"/>`;
  const area = (x, w) => `<rect x="${x}" y="${cy - 9.15}" width="${w}" height="18.3"/>`;
  return stripes(f, true) + chalk(`
    <rect x="0" y="0" width="105" height="68"/><path d="M52.5 0v68"/><circle cx="52.5" cy="${cy}" r="9.15"/>
    ${box(0, 16.5)}${box(88.5, 16.5)}${area(0, 5.5)}${area(99.5, 5.5)}
    <rect x="-2" y="${cy - 3.66}" width="2" height="7.32"/><rect x="105" y="${cy - 3.66}" width="2" height="7.32"/>
    <path d="M16.5 ${cy - 7.3}a9.15 9.15 0 0 1 0 14.6M88.5 ${cy - 7.3}a9.15 9.15 0 0 0 0 14.6"/>`)
    + `<g fill="var(--chalk)"><circle cx="52.5" cy="${cy}" r="0.4"/><circle cx="11" cy="${cy}" r="0.4"/><circle cx="94" cy="${cy}" r="0.4"/></g>`;
}

function halfPitch() {
  const f = FIELDS.half, cx = f.w / 2;
  return stripes(f, false) + chalk(`
    <rect x="0" y="0" width="68" height="52.5"/>
    <rect x="${cx - 20.15}" y="0" width="40.3" height="16.5"/><rect x="${cx - 9.15}" y="0" width="18.3" height="5.5"/>
    <rect x="${cx - 3.66}" y="-2" width="7.32" height="2"/>
    <path d="M${cx - 7.3} 16.5a9.15 9.15 0 0 0 14.6 0"/><path d="M${cx - 9.15} 52.5a9.15 9.15 0 0 1 18.3 0"/>`)
    + `<g fill="var(--chalk)"><circle cx="${cx}" cy="11" r="0.4"/><circle cx="${cx}" cy="52.5" r="0.4"/></g>`;
}

// MARK: - Figuren

/** Spelerskleuren: dezelfde hesjes als bij de postenrotatie. */
export const BIB_COLORS = ["#E53935", "#1E88E5", "#FDD835", "#43A047", "#FB8C00", "#8E24AA", "#FFFFFF", "#212121"];

function itemSVG(item, s, selected) {
  const sel = selected ? ' class="sel"' : "";
  const tag = `data-item="${item.id}"`;
  switch (item.type) {
    case "player":
      return `<g ${tag}${sel}><circle cx="${item.x}" cy="${item.y}" r="${2.4 * s}" fill="${item.color}" stroke="#fff" stroke-width="${0.5 * s}"/>
        ${selected ? `<circle cx="${item.x}" cy="${item.y}" r="${3.5 * s}" class="ring"/>` : ""}</g>`;
    case "ball":
      return `<g ${tag}${sel}><circle cx="${item.x}" cy="${item.y}" r="${0.95 * s}" fill="#fff" stroke="#17211b" stroke-width="${0.3 * s}"/>
        <circle cx="${item.x}" cy="${item.y}" r="${0.35 * s}" fill="#17211b"/>
        ${selected ? `<circle cx="${item.x}" cy="${item.y}" r="${2 * s}" class="ring"/>` : ""}</g>`;
    case "cone": {
      const h = 2.4 * s, w = 2.2 * s;
      return `<g ${tag}${sel}><path d="M${item.x} ${item.y - h * 0.6}L${item.x + w / 2} ${item.y + h * 0.4}H${item.x - w / 2}Z" fill="#FB8C00" stroke="#fff" stroke-width="${0.25 * s}" stroke-linejoin="round"/>
        ${selected ? `<circle cx="${item.x}" cy="${item.y}" r="${2 * s}" class="ring"/>` : ""}</g>`;
    }
    case "goal": {
      const w = 6 * s, d = 1.6 * s;
      return `<g ${tag}${sel} transform="rotate(${item.rot ?? 0} ${item.x} ${item.y})">
        <rect x="${item.x - w / 2}" y="${item.y - d / 2}" width="${w}" height="${d}" fill="rgba(255,255,255,0.25)" stroke="#fff" stroke-width="${0.35 * s}"/>
        <rect x="${item.x - w / 2 - 1}" y="${item.y - d / 2 - 1}" width="${w + 2}" height="${d + 2}" fill="transparent"/>
        ${selected ? `<rect x="${item.x - w / 2 - 1}" y="${item.y - d / 2 - 1}" width="${w + 2}" height="${d + 2}" class="ring"/>` : ""}</g>`;
    }
    case "line":
      return lineSVG(item, s, selected);
  }
  return "";
}

/** Een pijl: doorgetrokken (lopen), stippel (pass) of golvend (dribbel). */
function lineSVG(item, s, selected) {
  const pts = item.points;
  if (pts.length < 2) return "";
  const width = 0.45 * s;
  const head = 1.6 * s;
  // De lijn stopt waar de pijlpunt begint.
  const body = trimEnd(pts, head * 0.8);
  const d = item.style === "dribble" ? polyPath(wave(body, 0.7 * s, 3.6 * s)) : smoothPath(body);
  const [ax, ay] = pts[pts.length - 1];
  const [bx, by] = pointBack(pts, head);
  const angle = Math.atan2(ay - by, ax - bx);
  const left = [ax - head * Math.cos(angle - 0.45), ay - head * Math.sin(angle - 0.45)];
  const right = [ax - head * Math.cos(angle + 0.45), ay - head * Math.sin(angle + 0.45)];
  const dash = item.style === "pass" ? ` stroke-dasharray="${1.1 * s} ${0.8 * s}"` : "";
  return `<g data-item="${item.id}"${selected ? ' class="sel"' : ""}>
    <path d="${d}" fill="none" stroke="transparent" stroke-width="${3 * s}"/>
    ${selected ? `<path d="${d}" fill="none" stroke="var(--switch)" stroke-opacity="0.6" stroke-width="${1.8 * s}" stroke-linecap="round"/>` : ""}
    <path d="${d}" fill="none" stroke="#fff" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"${dash}/>
    <path d="M${r1(ax)} ${r1(ay)}L${r1(left[0])} ${r1(left[1])}L${r1(right[0])} ${r1(right[1])}Z" fill="#fff"/>
  </g>`;
}

// MARK: - Meetkunde

const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

function pathLength(pts) {
  let l = 0;
  for (let i = 1; i < pts.length; i++) l += dist(pts[i - 1], pts[i]);
  return l;
}

/** Het punt op `back` afstand voor het einde, langs de lijn. */
function pointBack(pts, back) {
  let left = back;
  for (let i = pts.length - 1; i > 0; i--) {
    const seg = dist(pts[i], pts[i - 1]);
    if (seg >= left) {
      const t = left / seg;
      return [pts[i][0] + (pts[i - 1][0] - pts[i][0]) * t, pts[i][1] + (pts[i - 1][1] - pts[i][1]) * t];
    }
    left -= seg;
  }
  return pts[0];
}

function trimEnd(pts, amount) {
  if (pathLength(pts) <= amount * 1.5) return pts;
  const end = pointBack(pts, amount);
  let left = amount;
  let i = pts.length - 1;
  while (i > 0 && dist(pts[i], pts[i - 1]) < left) { left -= dist(pts[i], pts[i - 1]); i--; }
  return [...pts.slice(0, i), end];
}

/** Vloeiende lijn door de punten (Catmull-Rom als Bézier). */
function smoothPath(pts) {
  if (pts.length === 2) return `M${r1(pts[0][0])} ${r1(pts[0][1])}L${r1(pts[1][0])} ${r1(pts[1][1])}`;
  let d = `M${r1(pts[0][0])} ${r1(pts[0][1])}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] ?? p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${r1(c1[0])} ${r1(c1[1])} ${r1(c2[0])} ${r1(c2[1])} ${r1(p2[0])} ${r1(p2[1])}`;
  }
  return d;
}

const polyPath = (pts) => "M" + pts.map((p) => `${r1(p[0])} ${r1(p[1])}`).join("L");

/** Golvende lijn langs de punten: herbemonsterd en loodrecht verschoven. */
function wave(pts, amplitude, period) {
  const out = [];
  const step = 0.3;
  let travelled = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], seg = dist(a, b);
    if (seg === 0) continue;
    const nx = -(b[1] - a[1]) / seg, ny = (b[0] - a[0]) / seg;
    for (let t = 0; t < seg; t += step) {
      const off = amplitude * Math.sin(((travelled + t) / period) * Math.PI * 2);
      out.push([a[0] + ((b[0] - a[0]) * t) / seg + nx * off, a[1] + ((b[1] - a[1]) * t) / seg + ny * off]);
    }
    travelled += seg;
  }
  out.push(pts[pts.length - 1]);
  return out;
}

/** Douglas-Peucker: minder punten, zelfde vorm. */
export function simplify(pts, epsilon = 0.35) {
  if (pts.length < 3) return pts;
  const [a, b] = [pts[0], pts[pts.length - 1]];
  let max = 0, index = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const d = distanceToLine(pts[i], a, b);
    if (d > max) { max = d; index = i; }
  }
  if (max <= epsilon) return [a, b];
  return [...simplify(pts.slice(0, index + 1), epsilon).slice(0, -1), ...simplify(pts.slice(index), epsilon)];
}

export function distanceToLine(p, a, b) {
  const l = dist(a, b);
  if (l === 0) return dist(p, a);
  return Math.abs((b[0] - a[0]) * (a[1] - p[1]) - (a[0] - p[0]) * (b[1] - a[1])) / l;
}

/** Een getekende lijn opkuisen: bijna recht wordt recht. */
export function finishLine(pts) {
  const a = pts[0], b = pts[pts.length - 1];
  const straight = pts.every((p) => distanceToLine(p, a, b) < 1.2);
  return (straight ? [a, b] : simplify(pts)).map((p) => [r1(p[0]), r1(p[1])]);
}

export const lineLength = pathLength;

// MARK: - Alles samen

export function drawingSVG(drawing, { selected = null, id = "" } = {}) {
  const field = FIELDS[drawing.field] ?? FIELDS.half;
  const lines = drawing.items.filter((i) => i.type === "line");
  const rest = drawing.items.filter((i) => i.type !== "line");
  // Lijnen onder de spelers, zodat je een speler altijd kunt vastpakken.
  const items = [...lines, ...rest].map((i) => itemSVG(i, field.scale, i.id === selected)).join("");
  return `<svg class="drawing" ${id ? `id="${id}"` : ""} viewBox="${field.vb}" preserveAspectRatio="xMidYMid meet" aria-label="Tekening">
    ${drawing.field === "full" ? fullPitch() : halfPitch()}
    <g id="${id ? `${id}-items` : ""}">${items}</g>
  </svg>`;
}

export const itemsSVG = (drawing, selected) => {
  const field = FIELDS[drawing.field] ?? FIELDS.half;
  const lines = drawing.items.filter((i) => i.type === "line");
  const rest = drawing.items.filter((i) => i.type !== "line");
  return [...lines, ...rest].map((i) => itemSVG(i, field.scale, i.id === selected)).join("");
};

export const hasDrawing = (block) => (block.drawing?.items?.length ?? 0) > 0;
