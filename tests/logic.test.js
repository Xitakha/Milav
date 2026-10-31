import test from 'node:test';
import assert from 'node:assert/strict';
import { segment } from '../src/segment.js';
import { rank, decide, normalize } from '../src/match.js';
import { computePrice, DEFAULT_SETTINGS } from '../src/pricing.js';
import { serialize, parse } from '../src/catalog.js';

function image(w, h, bg, rects) {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let p = 0; p < w * h; p++) data.set([...bg, 255], p * 4);
  for (const { x, y, w: rw, h: rh, c } of rects)
    for (let j = y; j < y + rh; j++) for (let i = x; i < x + rw; i++) data.set([...c, 255], (j * w + i) * 4);
  return { data, width: w, height: h };
}

test('segment separa dos objetos sobre fondo liso', () => {
  const img = image(200, 100, [240, 240, 240], [
    { x: 20, y: 20, w: 40, h: 40, c: [200, 30, 30] },
    { x: 120, y: 30, w: 50, h: 40, c: [30, 30, 200] },
  ]);
  const { boxes } = segment(img);
  assert.equal(boxes.length, 2);
  assert.ok(Math.abs(boxes[0].x - 20) <= 3 && Math.abs(boxes[0].w - 40) <= 3);
  assert.ok(Math.abs(boxes[1].x - 120) <= 3);
});

test('segment fusiona partes cercanas de un mismo icono', () => {
  const img = image(400, 200, [250, 250, 250], [
    { x: 80, y: 60, w: 40, h: 80, c: [20, 20, 20] },
    { x: 124, y: 60, w: 40, h: 80, c: [20, 20, 20] },
  ]);
  assert.equal(segment(img).boxes.length, 1);
});

test('segment sin objetos devuelve vacío', () => {
  assert.equal(segment(image(100, 100, [255, 255, 255], [])).boxes.length, 0);
});

test('rank y decide identifican el icono correcto', () => {
  const icons = [
    { id: 'a', name: 'A', price: 1, samples: [{ embedding: normalize([1, 0, 0]) }] },
    { id: 'b', name: 'B', price: 2, samples: [{ embedding: normalize([0, 1, 0]) }] },
  ];
  const d = decide(rank(icons, normalize([0.95, 0.1, 0])));
  assert.equal(d.icon.id, 'a');
  assert.equal(d.confident, true);
  const dudoso = decide(rank(icons, normalize([1, 1, 0])));
  assert.equal(dudoso.confident, false);
});

test('computePrice: base, descuento y redondeo', () => {
  const s = { ...DEFAULT_SETTINGS, basePrice: 1000, roundTo: 500, discounts: [{ min: 3, pct: 10 }] };
  assert.deepEqual(computePrice([], s).total, 0);
  assert.equal(computePrice([2000, 3000], s).total, 6000); // 5000 + 1000
  const r = computePrice([2000, 2000, 2000], s); // 6000 - 600 + 1000 = 6400 -> 6500
  assert.equal(r.discount, 600);
  assert.equal(r.total, 6500);
});

test('catálogo: exportar e importar conserva los datos', () => {
  const icons = [{ id: 'x', name: 'Gato', price: 3500, samples: [{ thumb: 'data:,', embedding: [0.123456, 0.5] }] }];
  const { icons: back, settings } = parse(serialize(icons, DEFAULT_SETTINGS));
  assert.equal(back[0].name, 'Gato');
  assert.equal(back[0].samples[0].embedding[0], 0.1235);
  assert.equal(settings.currency, '$');
  assert.throws(() => parse('{"x":1}'), /catálogo/);
  assert.throws(() => parse('no json'), /JSON/);
});

test('segment ignora la mesa alrededor de la hoja y separa objetos pegados', () => {
  // hoja blanca (x 40..360) sobre "alfombra" marrón; 3 iconos sueltos y 2 pegados
  const w = 400, h = 300;
  const img = image(w, h, [120, 100, 70], [{ x: 40, y: 20, w: 320, h: 260, c: [240, 240, 240] }]);
  const sq = (x, y, c) => ({ x, y, w: 34, h: 34, c });
  for (const r of [sq(70, 40, [200, 30, 30]), sq(250, 50, [30, 30, 200]), sq(80, 200, [30, 150, 40]),
    sq(200, 120, [230, 200, 20]), sq(234, 120, [20, 20, 20])])
    for (let j = r.y; j < r.y + r.h; j++) for (let i = r.x; i < r.x + r.w; i++) img.data.set([...r.c, 255], (j * w + i) * 4);
  const { boxes } = segment(img);
  assert.equal(boxes.length, 5); // sin falsos positivos en la alfombra y con el par pegado separado
  assert.ok(boxes.every((b) => b.x >= 40 && b.x + b.w <= 360));
});
