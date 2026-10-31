// Segmentación de objetos sobre fondo liso. Trabaja sobre {data,width,height} (como ImageData).

function dilate(mask, w, h, r) {
  if (r < 1) return mask;
  const tmp = new Uint8Array(w * h), out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let v = 0;
      for (let k = Math.max(0, x - r); k <= Math.min(w - 1, x + r) && !v; k++) v = mask[y * w + k];
      tmp[y * w + x] = v;
    }
  }
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      let v = 0;
      for (let k = Math.max(0, y - r); k <= Math.min(h - 1, y + r) && !v; k++) v = tmp[k * w + x];
      out[y * w + x] = v;
    }
  }
  return out;
}

function largestComponent(mask, w, h) {
  const seen = new Int32Array(w * h);
  const stack = [];
  let best = null, id = 0;
  for (let st = 0; st < w * h; st++) {
    if (!mask[st] || seen[st]) continue;
    id++;
    const cells = [];
    stack.push(st); seen[st] = id;
    while (stack.length) {
      const p = stack.pop(); cells.push(p);
      const x = p % w;
      if (x > 0 && mask[p - 1] && !seen[p - 1]) { seen[p - 1] = id; stack.push(p - 1); }
      if (x < w - 1 && mask[p + 1] && !seen[p + 1]) { seen[p + 1] = id; stack.push(p + 1); }
      if (p >= w && mask[p - w] && !seen[p - w]) { seen[p - w] = id; stack.push(p - w); }
      if (p < w * (h - 1) && mask[p + w] && !seen[p + w]) { seen[p + w] = id; stack.push(p + w); }
    }
    if (!best || cells.length > best.length) best = cells;
  }
  const out = new Uint8Array(w * h);
  if (best) for (const p of best) out[p] = 1;
  return out;
}

/**
 * Localiza la hoja/fondo claro y sin color más grande de la foto y devuelve como objetos todo lo
 * que hay dentro de ella y no es hoja. Tolera sombras (se compara con la luminosidad de la hoja)
 * y fondos que no llenan el encuadre (alfombra, mesa alrededor).
 * Devuelve { boxes, background } con cajas {x,y,w,h,area} en píxeles de la imagen recibida,
 * ordenadas de izquierda a derecha.
 */
export function segment(img, { minAreaFrac = 0.0008, maxAreaFrac = 0.5, mergeFrac = 0.006, chroma = 38, edge = 22 } = {}) {
  const { data, width: w, height: h } = img;
  const n = w * h;
  const lum = new Uint8Array(n), chr = new Uint8Array(n);
  for (let p = 0; p < n; p++) {
    const r = data[p * 4], g = data[p * 4 + 1], b = data[p * 4 + 2];
    lum[p] = (r * 299 + g * 587 + b * 114) / 1000;
    chr[p] = Math.max(r, g, b) - Math.min(r, g, b);
  }

  // 1) hoja provisional: sin color y no oscura; la mayor región conexa
  let cand = new Uint8Array(n);
  for (let p = 0; p < n; p++) cand[p] = chr[p] <= chroma && lum[p] >= 90 ? 1 : 0;
  let paper = largestComponent(cand, w, h);
  const ls = [];
  for (let p = 0; p < n; p++) if (paper[p]) ls.push(lum[p]);
  if (ls.length < n * 0.05) return { boxes: [], background: [255, 255, 255] };
  ls.sort((a, b) => a - b);
  const L0 = ls[ls.length >> 1];

  // 2) hoja definitiva respecto a su propia luminosidad (admite degradados y sombras suaves)
  for (let p = 0; p < n; p++) cand[p] = chr[p] <= chroma && lum[p] >= L0 * 0.72 ? 1 : 0;
  paper = largestComponent(cand, w, h);

  // 3) región de interés = hoja + huecos rodeados por la hoja (lo exterior conectado al borde se descarta)
  const outside = new Uint8Array(n);
  const stack = [];
  const seed = (p) => { if (!paper[p] && !outside[p]) { outside[p] = 1; stack.push(p); } };
  for (let x = 0; x < w; x++) { seed(x); seed((h - 1) * w + x); }
  for (let y = 0; y < h; y++) { seed(y * w); seed(y * w + w - 1); }
  while (stack.length) {
    const p = stack.pop(), x = p % w;
    if (x > 0) seed(p - 1);
    if (x < w - 1) seed(p + 1);
    if (p >= w) seed(p - w);
    if (p < w * (h - 1)) seed(p + w);
  }
  const raw = new Uint8Array(n);
  for (let p = 0; p < n; p++) raw[p] = !paper[p] && !outside[p] ? 1 : 0;
  const nearOutside = dilate(outside, w, h, Math.max(2, Math.round(Math.min(w, h) * 0.012))); // el borde de la hoja no cuenta
  // objetos blancos sobre la hoja: la hoja es lisa, así que un borde fuerte indica un objeto
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const p = y * w + x;
      if (raw[p] || !paper[p] || nearOutside[p]) continue;
      const gx = lum[p + 1] - lum[p - 1], gy = lum[p + w] - lum[p - w];
      if (Math.abs(gx) + Math.abs(gy) > edge) raw[p] = 1;
    }
  }
  const mask = dilate(raw, w, h, Math.max(1, Math.round(Math.min(w, h) * mergeFrac)));

  // 4) objetos = componentes conexos
  const labels = new Int32Array(n);
  const boxes = [];
  let label = 0;
  for (let start = 0; start < n; start++) {
    if (!mask[start] || labels[start]) continue;
    label++;
    let minX = w, minY = h, maxX = 0, maxY = 0, area = 0;
    stack.push(start); labels[start] = label;
    while (stack.length) {
      const p = stack.pop();
      const x = p % w, y = (p / w) | 0;
      if (raw[p]) { // la caja se mide sobre los píxeles reales, no sobre la máscara dilatada
        area++;
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
      }
      if (x > 0 && mask[p - 1] && !labels[p - 1]) { labels[p - 1] = label; stack.push(p - 1); }
      if (x < w - 1 && mask[p + 1] && !labels[p + 1]) { labels[p + 1] = label; stack.push(p + 1); }
      if (y > 0 && mask[p - w] && !labels[p - w]) { labels[p - w] = label; stack.push(p - w); }
      if (y < h - 1 && mask[p + w] && !labels[p + w]) { labels[p + w] = label; stack.push(p + w); }
    }
    const frac = area / n;
    if (!area || frac < minAreaFrac || frac > maxAreaFrac) continue;
    boxes.push({ x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1, area, label });
  }
  const strict = (p) => paper[p] && chr[p] <= chroma * 0.6 && lum[p] >= L0 * 0.8;
  const all = splitTouching(boxes, raw, mask, labels, w, h).map(({ x, y, w: bw, h: bh, area }) => ({ x, y, w: bw, h: bh, area }));
  const kept = all.filter((b) => {
    // un icono real está rodeado de hoja; los restos de alfombra/mesa fuera de la hoja no
    const m = Math.round(Math.max(b.w, b.h) * 0.3) + 2;
    let ring = 0, ok = 0;
    for (let y = Math.max(0, b.y - m); y < Math.min(h, b.y + b.h + m); y++)
      for (let x = Math.max(0, b.x - m); x < Math.min(w, b.x + b.w + m); x++) {
        if (x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h) continue;
        ring++; if (strict(y * w + x)) ok++;
      }
    return ring > 0 && ok / ring >= 0.55;
  });
  kept.sort((a, b) => a.x - b.x);

  // color de la hoja (para rellenar los recortes cuadrados)
  const rs = [], gs = [], bs = [];
  for (let p = 0; p < n; p += 7) if (paper[p] && !mask[p]) { rs.push(data[p * 4]); gs.push(data[p * 4 + 1]); bs.push(data[p * 4 + 2]); }
  const med = (a) => (a.length ? a.sort((x, y) => x - y)[a.length >> 1] : 255);
  return { boxes: kept, background: [med(rs), med(gs), med(bs)] };
}

function erode(mask, w, h) {
  const out = new Uint8Array(w * h);
  for (let y = 1; y < h - 1; y++)
    for (let x = 1; x < w - 1; x++) {
      const p = y * w + x;
      out[p] = mask[p] && mask[p - 1] && mask[p + 1] && mask[p - w] && mask[p + w] ? 1 : 0;
    }
  return out;
}

function componentsOf(mask, w, h, region) {
  const seen = new Uint8Array(w * h), comps = [], stack = [];
  for (const s0 of region) {
    if (!mask[s0] || seen[s0]) continue;
    const cells = [];
    stack.push(s0); seen[s0] = 1;
    while (stack.length) {
      const p = stack.pop(); cells.push(p);
      const x = p % w;
      if (x > 0 && mask[p - 1] && !seen[p - 1]) { seen[p - 1] = 1; stack.push(p - 1); }
      if (x < w - 1 && mask[p + 1] && !seen[p + 1]) { seen[p + 1] = 1; stack.push(p + 1); }
      if (p >= w && mask[p - w] && !seen[p - w]) { seen[p - w] = 1; stack.push(p - w); }
      if (p < w * (h - 1) && mask[p + w] && !seen[p + w]) { seen[p + w] = 1; stack.push(p + w); }
    }
    comps.push(cells);
  }
  return comps;
}

function boxOf(cells, w) {
  let x0 = Infinity, y0 = Infinity, x1 = 0, y1 = 0;
  for (const p of cells) {
    const x = p % w, y = (p / w) | 0;
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1, area: cells.length };
}

/** Parte un conjunto de píxeles erosionándolo hasta que se separe; devuelve las piezas o null. */
function splitCells(cells, w, h) {
  let cur = new Uint8Array(w * h);
  for (const p of cells) cur[p] = 1;
  const orig = cur;
  let seeds = null;
  for (let k = 0; k < 24 && !seeds; k++) {
    cur = erode(cur, w, h);
    const comps = componentsOf(cur, w, h, cells).filter((c) => c.length >= cells.length * 0.08);
    if (!comps.length) return null;
    if (comps.length >= 2) seeds = comps;
  }
  if (!seeds) return null;
  // reparte los píxeles entre las semillas por cercanía (BFS multi-origen)
  const owner = new Int16Array(w * h).fill(-1);
  let frontier = [];
  seeds.forEach((c, i) => c.forEach((p) => { owner[p] = i; frontier.push(p); }));
  while (frontier.length) {
    const next = [];
    for (const p of frontier) {
      const x = p % w;
      for (const q of [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, p >= w ? p - w : -1, p < w * (h - 1) ? p + w : -1])
        if (q >= 0 && orig[q] && owner[q] < 0) { owner[q] = owner[p]; next.push(q); }
    }
    frontier = next;
  }
  return seeds.map((_, i) => cells.filter((p) => owner[p] === i));
}

/** Corta un grupo de píxeles en `n` piezas siguiendo su eje largo, por los valles de menor densidad. */
function cutAlongAxis(cells, w, n) {
  const box = boxOf(cells, w);
  const horiz = box.w >= box.h;
  const start = horiz ? box.x : box.y, len = horiz ? box.w : box.h;
  const proj = new Float32Array(len);
  const coord = (p) => (horiz ? p % w : ((p / w) | 0)) - start;
  for (const p of cells) proj[coord(p)]++;
  const cuts = [];
  const win = Math.max(2, Math.round((len / n) * 0.25));
  for (let i = 1; i < n; i++) {
    const exp = Math.round((i * len) / n);
    let best = exp, bestScore = Infinity;
    for (let c = Math.max(1, exp - win); c <= Math.min(len - 1, exp + win); c++) {
      const score = proj[c] + 0.5 * Math.abs(c - exp);
      if (score < bestScore) { bestScore = score; best = c; }
    }
    cuts.push(best);
  }
  const parts = Array.from({ length: n }, () => []);
  for (const p of cells) parts[cuts.filter((c) => coord(p) >= c).length].push(p);
  return parts.filter((a) => a.length);
}

/**
 * Separa objetos que se tocan: toda caja mucho mayor que la mediana se intenta partir
 * (de forma recursiva) sobre la máscara rellena, que no se rompe con los contornos blancos.
 */
function splitTouching(boxes, raw, mask, labels, w, h) {
  if (boxes.length < 3) return boxes;
  const areas = boxes.map((b) => b.w * b.h).sort((a, b) => a - b);
  const med = areas[areas.length >> 1];
  const raws = boxes.map((b) => b.area).sort((a, b) => a - b);
  const medArea = raws[raws.length >> 1];
  const out = [];
  const handle = (cells, depth) => {
    const rawCells = cells.filter((p) => raw[p]);
    if (!rawCells.length) return;
    const box = boxOf(rawCells, w);
    if (depth >= 4 || box.w * box.h < med * 1.7) return void out.push(box);
    const parts = splitCells(cells, w, h);
    if (parts) return void parts.forEach((part) => handle(part, depth + 1));
    // sin "cuello" que permita separarlos: si la masa es ~2× un icono típico, se corta por tamaño
    const n = Math.min(4, Math.max(2, Math.round(rawCells.length / medArea)));
    if (n < 2 || rawCells.length < medArea * 1.7) return void out.push(box);
    cutAlongAxis(rawCells, w, n).forEach((part) => out.push(boxOf(part, w)));
  };
  const pad = Math.ceil(Math.min(w, h) * 0.02); // la máscara dilatada se pasa un poco de la caja
  for (const b of boxes) {
    if (b.w * b.h < med * 1.7) { out.push(b); continue; }
    const cells = [];
    for (let y = Math.max(0, b.y - pad); y < Math.min(h, b.y + b.h + pad); y++)
      for (let x = Math.max(0, b.x - pad); x < Math.min(w, b.x + b.w + pad); x++) {
        const p = y * w + x;
        if (mask[p] && labels[p] === b.label) cells.push(p);
      }
    handle(cells, 0);
  }
  return out;
}

/** Amplía la caja a un cuadrado (con margen) dentro de los límites de la imagen origen. */
export function squareBox(box, pad = 0.08) {
  const side = Math.max(box.w, box.h) * (1 + pad * 2);
  return { cx: box.x + box.w / 2, cy: box.y + box.h / 2, side };
}
