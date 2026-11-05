// Lógica pura de la tienda: catálogo, carrito y mensaje de pedido. Sin DOM, con pruebas.

export const CATEGORY_ORDER = ['Llaveros', 'Accesorios', 'Mascotas', 'Oficina', 'Hogar', 'Decoración', 'Infantil', 'Juguetes', 'Navidad', 'Papelería'];
export const CATEGORY_ICONS = {
  Llaveros: '🔑', Accesorios: '✨', Mascotas: '🐾', Oficina: '🖊️', Hogar: '🏠', Decoración: '🪴',
  Infantil: '🎨', Juguetes: '🚂', Navidad: '🎄', Papelería: '📖',
};

const fold = (s) => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

// Tonos de las categorías (fondo de las tarjetas mientras no hay foto) y colores de muestra para las opciones.
export const CATEGORY_TINT = {
  Llaveros: ['#e4daf5', '#cfe3c9'], Accesorios: ['#f6d9c4', '#f3c9d4'], Mascotas: ['#f3e0c8', '#e6d3bf'],
  Oficina: ['#d8e6f3', '#e4daf5'], Hogar: ['#f6e7c8', '#f6d9c4'], Decoración: ['#cfe3c9', '#f6e7c8'],
  Infantil: ['#f3c9d4', '#f6e7c8'], Juguetes: ['#f6e7c8', '#d8e6f3'], Navidad: ['#f4cfcf', '#cfe3c9'], Papelería: ['#e3ecd2', '#f6e7c8'],
};

const COLOR_HEX = {
  rojo: '#d62828', azul: '#1d4ed8', amarillo: '#f4c20d', verde: '#2a9d3c', 'verde oscuro': '#14532d', morado: '#7e57c2',
  lila: '#b9a3e3', rosa: '#f06292', naranja: '#f28c28', negro: '#222222', blanco: '#ffffff', gris: '#9aa0a6',
  'gris oscuro': '#4b5058', cafe: '#7a4b2a', beige: '#e8d5b5', salmon: '#f4a08a', 'verde oliva': '#6b7a2a',
};
/** Color de muestra para un nombre de color («Café», «verde oscuro»…); null si no se reconoce. */
export function swatchColor(name) {
  return COLOR_HEX[fold(name).trim()] ?? null;
}

export function formatCOP(n) {
  return '$' + Math.round(n).toLocaleString('es-CO');
}


export function categories(products) {
  const count = new Map();
  for (const p of products) count.set(p.categoria, (count.get(p.categoria) || 0) + 1);
  const rank = (c) => (CATEGORY_ORDER.includes(c) ? CATEGORY_ORDER.indexOf(c) : CATEGORY_ORDER.length);
  return [...count].map(([name, n]) => ({ name, count: n })).sort((a, b) => rank(a.name) - rank(b.name) || a.name.localeCompare(b.name));
}

/** Filtra por categoría y texto (sin distinguir tildes ni mayúsculas) y ordena. */
export function filterProducts(products, { category = '', query = '', sort = 'relevancia' } = {}) {
  const terms = fold(query).split(/\s+/).filter(Boolean);
  let out = products.filter((p) => {
    if (category && p.categoria !== category) return false;
    const hay = fold(`${p.nombre} ${p.categoria} ${p.descripcion ?? ''}`);
    return terms.every((t) => hay.includes(t));
  });
  if (sort === 'precio-asc') out = [...out].sort((a, b) => (a.precio ?? Infinity) - (b.precio ?? Infinity));
  if (sort === 'precio-desc') out = [...out].sort((a, b) => (b.precio ?? -1) - (a.precio ?? -1));
  if (sort === 'nombre') out = [...out].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  return out;
}

/** Opciones que el cliente puede elegir (solo las que son listas). */
export function optionGroups(product) {
  const o = product.opciones ?? {};
  const groups = [];
  const add = (key, label, list) => {
    const values = (list ?? []).map((v) => (typeof v === 'string' ? v : v.nombre)).filter(Boolean);
    if (values.length) groups.push({ key, label, values });
  };
  if (Array.isArray(o.colores)) add('colores', 'Color', o.colores);
  add('tamanos', 'Tamaño', o.tamanos);
  add('tamanos_cm', 'Tamaño (cm)', o.tamanos_cm);
  add('disenos', 'Diseño', o.disenos);
  add('modelos', 'Modelo', o.modelos);
  add('colecciones', 'Colección', o.colecciones);
  return groups;
}

/** Texto informativo de opciones que NO son una lista elegible (p. ej. «12 colores a elegir»). */
export function optionNotes(product) {
  const o = product.opciones ?? {};
  const notes = [];
  if (typeof o.colores === 'string') notes.push(o.colores);
  if (typeof o.extra === 'string') notes.push(o.extra);
  return notes;
}

/* ---------- carrito ---------- */
// Una línea: { id, qty, selections: { colores: 'Rojo', … }, nota }
export function lineKey(line) {
  const sel = Object.keys(line.selections ?? {}).sort().map((k) => `${k}=${line.selections[k]}`).join('|');
  return `${line.id}#${sel}#${(line.nota ?? '').trim().toLowerCase()}`;
}

export function addToCart(cart, line) {
  const qty = Math.max(1, Math.floor(Number(line.qty) || 1));
  const next = { id: line.id, qty, selections: { ...(line.selections ?? {}) }, nota: (line.nota ?? '').trim() };
  const key = lineKey(next);
  const found = cart.find((l) => lineKey(l) === key);
  if (found) return cart.map((l) => (l === found ? { ...l, qty: l.qty + qty } : l));
  return [...cart, next];
}

export function setQty(cart, key, qty) {
  const q = Math.floor(Number(qty));
  if (!(q >= 1)) return removeLine(cart, key);
  return cart.map((l) => (lineKey(l) === key ? { ...l, qty: q } : l));
}

export const removeLine = (cart, key) => cart.filter((l) => lineKey(l) !== key);

/** Totales. Las líneas con precio null («cotizar») no suman y se cuentan aparte. */
export function cartTotals(cart, byId) {
  const lines = [];
  let subtotal = 0, count = 0, toQuote = 0;
  for (const l of cart) {
    const product = byId.get(l.id);
    if (!product) continue; // producto que ya no existe en el catálogo
    const unit = product.precio;
    const total = unit == null ? null : unit * l.qty;
    if (total == null) toQuote += l.qty; else subtotal += total;
    count += l.qty;
    lines.push({ ...l, key: lineKey(l), product, unit, total });
  }
  return { lines, subtotal, count, toQuote };
}

/* ---------- pedido por WhatsApp ---------- */
export function describeLine(line) {
  const sel = Object.values(line.selections ?? {});
  const extra = [...sel, line.nota ? `«${line.nota}»` : ''].filter(Boolean).join(', ');
  return `${line.qty} × ${line.product.nombre}${extra ? ` (${extra})` : ''}`;
}

export function orderMessage(totals, cliente = {}, negocio = {}) {
  const rows = totals.lines.map((l) => `• ${describeLine(l)} — ${l.total == null ? 'por cotizar' : formatCOP(l.total)}`);
  const out = [`Hola Milav, quiero hacer este pedido:`, '', ...rows, ''];
  out.push(`Subtotal: ${formatCOP(totals.subtotal)}${totals.toQuote ? ` + ${totals.toQuote} por cotizar` : ''}`);
  const env = negocio.envio?.rangoEstimado;
  out.push(env ? `Envío (a cargo del cliente): entre ${formatCOP(env.min)} y ${formatCOP(env.max)} según destino` : 'Envío a cargo del cliente');
  const who = [cliente.nombre && `Nombre: ${cliente.nombre}`, cliente.ciudad && `Ciudad: ${cliente.ciudad}`, cliente.notas && `Notas: ${cliente.notas}`].filter(Boolean);
  if (who.length) out.push('', ...who);
  return out.join('\n');
}

export function whatsappUrl(phone, text) {
  const digits = String(phone).replace(/\D/g, '');
  const intl = digits.startsWith('57') && digits.length > 10 ? digits : `57${digits}`;
  return `https://wa.me/${intl}?text=${encodeURIComponent(text)}`;
}

export function quoteMessage(product) {
  return `Hola Milav, quiero cotizar: ${product.nombre}`;
}
