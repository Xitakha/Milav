import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  formatCOP, categories, filterProducts, optionGroups, optionNotes, lineKey, addToCart, setQty, removeLine,
  cartTotals, orderMessage, whatsappUrl, describeLine, swatchColor, CATEGORY_TINT, CATEGORY_ORDER,
  collections, sampleByCategory, keychainMessage,
} from '../src/tienda/logic.js';

const data = JSON.parse(fs.readFileSync(new URL('../data/productos.json', import.meta.url), 'utf8'));
const negocio = JSON.parse(fs.readFileSync(new URL('../data/negocio.json', import.meta.url), 'utf8'));
const P = data.productos;
const byId = new Map(P.map((p) => [p.id, p]));

test('datos: ids únicos, precios numéricos o null, campos obligatorios', () => {
  assert.equal(new Set(P.map((p) => p.id)).size, P.length);
  for (const p of P) {
    assert.ok(p.id && p.nombre && p.categoria, `faltan campos en ${p.id}`);
    assert.ok(p.precio === null || (Number.isFinite(p.precio) && p.precio > 0), `precio inválido en ${p.id}`);
  }
});

test('datos: el texto visible al cliente no contiene notas internas', () => {
  for (const p of P) {
    const visible = JSON.stringify([p.descripcion, p.notas, p.opciones, p.incluye, p.caracteristicas]);
    assert.doesNotMatch(visible, /data\/|\.json|sin nombres en el cat/i, `texto interno visible en ${p.id}`);
  }
});

test('formatCOP', () => {
  assert.equal(formatCOP(90000), '$90.000');
  assert.equal(formatCOP(150000), '$150.000');
});

test('categorías: orden de negocio y conteo', () => {
  const c = categories(P);
  assert.equal(c.reduce((a, x) => a + x.count, 0), P.length);
  assert.equal(c[0].name, 'Llaveros');
  assert.ok(c.findIndex((x) => x.name === 'Navidad') > c.findIndex((x) => x.name === 'Juguetes'));
});

test('filtrar: por categoría, texto sin tildes y orden por precio', () => {
  assert.ok(filterProducts(P, { category: 'Navidad' }).every((p) => p.categoria === 'Navidad'));
  assert.ok(filterProducts(P, { query: 'pesebre' }).length >= 2);
  assert.ok(filterProducts(P, { query: 'ALBUM recuerdos' }).some((p) => p.id === 'album-recuerdos'));
  assert.equal(filterProducts(P, { query: 'zzzz' }).length, 0);
  const asc = filterProducts(P, { sort: 'precio-asc' });
  const priced = asc.filter((p) => p.precio != null).map((p) => p.precio);
  assert.deepEqual(priced, [...priced].sort((a, b) => a - b));
  assert.equal(asc.at(-1).precio, null); // los «por cotizar» van al final
});

test('opciones elegibles vs. informativas', () => {
  const cal = optionGroups(byId.get('calendario-porta-lapiceros'));
  assert.deepEqual(cal.map((g) => g.key), ['colores']);
  assert.ok(cal[0].values.includes('Morado'));
  assert.deepEqual(optionGroups(byId.get('tren-armable')).map((g) => g.key), ['tamanos']); // colores es texto
  assert.deepEqual(optionNotes(byId.get('tren-armable')), ['12 colores a elegir']);
  assert.deepEqual(optionGroups(byId.get('clickers')).map((g) => g.key), ['colecciones']);
});

test('carrito: agrega, une iguales, separa distintas, cambia cantidad y quita', () => {
  let cart = [];
  cart = addToCart(cart, { id: 'calendario-porta-lapiceros', qty: 1, selections: { colores: 'Rojo' } });
  cart = addToCart(cart, { id: 'calendario-porta-lapiceros', qty: 2, selections: { colores: 'Rojo' } });
  cart = addToCart(cart, { id: 'calendario-porta-lapiceros', qty: 1, selections: { colores: 'Azul' } });
  assert.deepEqual(cart.map((l) => l.qty), [3, 1]);
  const key = lineKey(cart[0]);
  cart = setQty(cart, key, 5);
  assert.equal(cart[0].qty, 5);
  cart = setQty(cart, key, 0); // 0 = quitar
  assert.equal(cart.length, 1);
  assert.equal(removeLine(cart, lineKey(cart[0])).length, 0);
  assert.equal(addToCart([], { id: 'x', qty: -3 })[0].qty, 1);
});

test('totales: suma precios, cuenta «por cotizar» y omite productos que ya no existen', () => {
  let cart = addToCart([], { id: 'calendario-porta-lapiceros', qty: 2, selections: { colores: 'Rojo' } });
  cart = addToCart(cart, { id: 'letras-decorativas', qty: 1, nota: 'M&H' });
  cart = addToCart(cart, { id: 'ya-no-existe', qty: 1 });
  const t = cartTotals(cart, byId);
  assert.equal(t.subtotal, 90000);
  assert.equal(t.count, 3);
  assert.equal(t.toQuote, 1);
  assert.equal(t.lines.length, 2);
});

test('mensaje de WhatsApp: detalle, envío a cargo del cliente y datos del cliente', () => {
  let cart = addToCart([], { id: 'calendario-porta-lapiceros', qty: 2, selections: { colores: 'Rojo' } });
  cart = addToCart(cart, { id: 'letras-decorativas', qty: 1, nota: 'M&H' });
  const t = cartTotals(cart, byId);
  const msg = orderMessage(t, { nombre: 'Ana', ciudad: 'Cali' }, negocio);
  assert.match(msg, /2 × Calendario con porta lápiceros \(Rojo\) — \$90\.000/);
  assert.match(msg, /1 × Letras decorativas \(«M&H»\) — por cotizar/);
  assert.match(msg, /entre \$15\.000 y \$30\.000/);
  assert.match(msg, /Nombre: Ana/);
  assert.equal(describeLine(t.lines[0]), '2 × Calendario con porta lápiceros (Rojo)');
});

test('whatsappUrl: prefijo de Colombia y texto codificado', () => {
  assert.equal(whatsappUrl('3026163640', 'Hola & chao'), 'https://wa.me/573026163640?text=Hola%20%26%20chao');
  assert.match(whatsappUrl('+57 302 616 3640', 'x'), /^https:\/\/wa\.me\/573026163640\?/);
});

test('colores de muestra: reconoce nombres con tilde/mayúsculas y los de todas las opciones del catálogo', () => {
  assert.equal(swatchColor('Café'), '#7a4b2a');
  assert.equal(swatchColor('VERDE oscuro'), '#14532d');
  assert.equal(swatchColor('inventado'), null);
  const nombres = P.flatMap((p) => (Array.isArray(p.opciones?.colores) ? p.opciones.colores : []));
  assert.ok(nombres.length > 10);
  for (const n of nombres) assert.ok(swatchColor(n), `sin color de muestra: ${n}`);
});

test('toda categoría del catálogo tiene tono definido', () => {
  for (const c of new Set(P.map((p) => p.categoria))) assert.ok(CATEGORY_TINT[c], `sin tono: ${c}`);
  assert.ok(CATEGORY_ORDER.every((c) => CATEGORY_TINT[c]));
});

import { priceKeychain } from '../src/keychain.js';

test('Navidad: todos los productos tienen colección y la lista es manejable', () => {
  const nav = P.filter((p) => p.categoria === 'Navidad');
  assert.ok(nav.every((p) => p.coleccion), 'producto de Navidad sin colección');
  const cols = collections(P, 'Navidad');
  assert.ok(cols.length >= 5 && cols.length <= 8);
  assert.equal(cols.reduce((a, c) => a + c.count, 0), nav.length);
  assert.deepEqual(collections(P, 'Llaveros'), []);
});

test('vista «Todo»: muestra acotada por categoría con el total real', () => {
  const s = sampleByCategory(P, 4);
  assert.ok(s.every((c) => c.items.length <= 4 && c.items.length <= c.count));
  assert.equal(s.find((c) => c.name === 'Navidad').count, P.filter((p) => p.categoria === 'Navidad').length);
});

test('calculadora de llavero: el mensaje trae el desglose y el total', () => {
  const quote = priceKeychain({ ring: 'cadena', clasp: true, icons: 2, beads: 3, text: 'NAT' });
  const msg = keychainMessage({ ringLabel: 'Cadena', clasp: true, cord: 'Morado', text: 'NAT', letterColor: 'lila', icons: 2, beads: 3, notes: '' }, quote);
  assert.match(msg, /Enganche: Cadena \+ mosquetón/);
  assert.match(msg, /Nombre o texto: «NAT» \(letras lila\)/);
  assert.match(msg, /Total aproximado: \$7\.100/); // 3000 + 1000 + 2x500 + 3x200 + 3x500
  assert.doesNotMatch(msg, /Notas:/);
});
