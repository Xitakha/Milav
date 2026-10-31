// Segmentación de objetos sobre fondo liso. Trabaja sobre {data,width,height} (como ImageData).

export function estimateBackground({ data, width, height }) {
  const rs = [], gs = [], bs = [];
  const push = (x, y) => {
    const i = (y * width + x) * 4;
    rs.push(data[i]); gs.push(data[i + 1]); bs.push(data[i + 2]);
  };
  const ring = Math.max(1, Math.round(Math.min(width, height) * 0.01));
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (x < ring || y < ring || x >= width - ring || y >= height - ring) push(x, y);
    }
  }
  const med = (a) => a.sort((p, q) => p - q)[a.length >> 1];
  return [med(rs), med(gs), med(bs)];
}

function otsu(hist, total) {
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * hist[i];
  let sumB = 0, wB = 0, best = 0, thr = 0;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (!wB) continue;
    const wF = total - wB;
    if (!wF) break;
    sumB += t * hist[t];
    const mB = sumB / wB, mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) ** 2;
    if (between > best) { best = between; thr = t; }
  }
  return thr;
}

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

/**
 * Devuelve { boxes, background } con cajas {x,y,w,h,area} en píxeles de la imagen recibida,
 * ordenadas de izquierda a derecha. Si no encuentra objetos, boxes = [].
 */
export function segment(img, { minAreaFrac = 0.004, maxAreaFrac = 0.9, mergeFrac = 0.012 } = {}) {
  const { data, width: w, height: h } = img;
  const bg = estimateBackground(img);

  const hist = new Uint32Array(256);
  const dist = new Uint8Array(w * h);
  for (let p = 0; p < w * h; p++) {
    const i = p * 4;
    const d = Math.hypot(data[i] - bg[0], data[i + 1] - bg[1], data[i + 2] - bg[2]) / Math.sqrt(3);
    dist[p] = d;
    hist[dist[p]]++;
  }
  const thr = Math.min(80, Math.max(22, otsu(hist, w * h) * 0.8));
  const raw = new Uint8Array(w * h);
  for (let p = 0; p < w * h; p++) raw[p] = dist[p] > thr ? 1 : 0;
  const mask = dilate(raw, w, h, Math.max(1, Math.round(Math.min(w, h) * mergeFrac)));

  const labels = new Int32Array(w * h);
  const boxes = [];
  const stack = [];
  let label = 0;
  for (let start = 0; start < w * h; start++) {
    if (!mask[start] || labels[start]) continue;
    label++;
    let minX = w, minY = h, maxX = 0, maxY = 0, area = 0;
    stack.push(start);
    labels[start] = label;
    while (stack.length) {
      const p = stack.pop();
      const x = p % w, y = (p / w) | 0;
      if (raw[p]) area++;
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
      if (x > 0 && mask[p - 1] && !labels[p - 1]) { labels[p - 1] = label; stack.push(p - 1); }
      if (x < w - 1 && mask[p + 1] && !labels[p + 1]) { labels[p + 1] = label; stack.push(p + 1); }
      if (y > 0 && mask[p - w] && !labels[p - w]) { labels[p - w] = label; stack.push(p - w); }
      if (y < h - 1 && mask[p + w] && !labels[p + w]) { labels[p + w] = label; stack.push(p + w); }
    }
    const frac = area / (w * h);
    if (frac < minAreaFrac || frac > maxAreaFrac) continue;
    boxes.push({ x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1, area });
  }
  boxes.sort((a, b) => a.x - b.x);
  return { boxes, background: bg };
}

/** Amplía la caja a un cuadrado (con margen) dentro de los límites de la imagen origen. */
export function squareBox(box, pad = 0.08) {
  const side = Math.max(box.w, box.h) * (1 + pad * 2);
  return { cx: box.x + box.w / 2, cy: box.y + box.h / 2, side };
}
