import '@fontsource-variable/fredoka';
import '@fontsource-variable/nunito';
import './style.css';
import { h } from './dom.js';
import { PRODUCTS, BY_ID, NEGOCIO, LOGO, photoOf } from './data.js';
import {
  CATEGORY_TINT, swatchColor, formatCOP, categories, collections, sampleByCategory, filterProducts, optionGroups, optionNotes,
  addToCart, setQty, removeLine, cartTotals, orderMessage, whatsappUrl, quoteMessage, keychainMessage,
} from './logic.js';
import { icon, CATEGORY_ICON } from './icons.js';
import { DEFAULT_KEYCHAIN_RULES, RING_TYPES, priceKeychain } from '../keychain.js';
import llavero from '../../data/llavero-opciones.json';

const app = document.getElementById('app');
const WA = NEGOCIO.whatsapp[0];
const LEAD = `${NEGOCIO.plazoEntregaDias.min} a ${NEGOCIO.plazoEntregaDias.max} días`;
const waLink = (text, phone = WA) => whatsappUrl(phone, text);
const phoneFmt = (n) => String(n).replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3');

/* ---------- estado ---------- */
const CART_KEY = 'milav.carrito.v1';
let cart = [];
try { cart = JSON.parse(localStorage.getItem(CART_KEY) || '[]'); } catch { cart = []; }
const saveCart = () => { try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch { /* sin almacenamiento: el carrito vive en memoria */ } };
const cartCount = () => cartTotals(cart, BY_ID).count;

let toastTimer;
function toast(msg, action) {
  document.getElementById('toast')?.remove();
  const t = h('div', { id: 'toast', role: 'status' }, h('span', {}, msg), action && h('button', { type: 'button', onclick: () => { action.run(); t.remove(); } }, action.label));
  document.body.append(t);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.remove(), action ? 5000 : 2200);
}

/* ---------- piezas comunes ---------- */
const price = (p) => (p.precio == null ? h('span', { class: 'quote' }, 'Precio a cotizar') : h('span', { class: 'price' }, formatCOP(p.precio)));

function thumb(p, cls = '') {
  const url = photoOf(p.id);
  const [a] = CATEGORY_TINT[p.categoria] ?? ['#e4daf5'];
  return h('div', { class: `thumb ${cls}`, style: `--a:${a}` }, url
    ? h('img', { src: url, alt: p.nombre, loading: 'lazy', width: 800, height: 600 })
    : h('div', { class: 'ph' }, icon(CATEGORY_ICON[p.categoria] ?? 'sparkle'), h('small', {}, 'Foto próximamente')));
}

function card(p) {
  return h('a', { class: 'card', href: `#/producto/${p.id}` },
    thumb(p),
    h('div', { class: 'body' },
      h('h3', {}, p.nombre),
      h('div', { class: 'meta' }, price(p)),
      p.personalizacion && h('span', { class: 'chip' }, 'Personalizable')));
}

function stepper(value, onChange, name, label = 'Cantidad', min = 1) {
  const input = h('input', { name, type: 'number', min, max: 99, value, inputmode: 'numeric', 'aria-label': label,
    onchange: () => { input.value = clamp(input.value); onChange?.(Number(input.value)); } });
  const clamp = (v) => Math.min(99, Math.max(min, Math.floor(Number(v) || min)));
  const step = (d) => () => { input.value = clamp((Number(input.value) || min) + d); onChange?.(Number(input.value)); };
  return h('div', { class: 'stepper' }, h('button', { type: 'button', 'aria-label': `Menos ${label.toLowerCase()}`, onclick: step(-1) }, '−'), input, h('button', { type: 'button', 'aria-label': `Más ${label.toLowerCase()}`, onclick: step(1) }, '+'));
}

/** Opciones como botones; con muestra de color cuando el nombre es un color conocido. */
function pills(key, label, values, { colors = false, selected = values[0], onChange } = {}) {
  return h('fieldset', { class: 'opt' }, h('legend', {}, label),
    h('div', { class: 'pills' }, values.map((v) => {
      const hex = colors ? swatchColor(v) : null;
      return h('label', { class: 'pill' },
        h('input', { type: 'radio', name: key, value: v, checked: v === selected, onchange: () => onChange?.(v) }),
        h('span', {}, hex && h('i', { class: 'dot', style: `background:${hex}` }), v));
    })));
}

const btn = (cls, text, props = {}, ic) => h('a', { class: `btn ${cls}`, ...props }, ic && icon(ic), text);

/* ---------- inicio ---------- */
const CHARMS = ['p1_09', 'p1_11', 'p1_12', 'p1_28', 'p1_31', 'p1_27', 'p1_00', 'p1_18', 'p2_01'];
const sticker = (f, i) => h('img', { class: 'charm', src: `./starter/${f}.jpg`, alt: '', loading: 'lazy', width: 224, height: 224, style: `--r:${[-6, 4, -3, 7, -5, 3][i % 6]}deg;--i:${i}` });

function homeView() {
  const cats = categories(PRODUCTS);
  const navidad = PRODUCTS.filter((p) => p.categoria === 'Navidad' && p.precio != null).slice(0, 4);
  const r = DEFAULT_KEYCHAIN_RULES;
  const parts = [
    ['Base: cordón + argolla o cadena', 'Tú eliges el color del cordón', r.base, 'x_cordon_0'],
    ['Cada letra de tu nombre', 'Con borde blanco, en el color que quieras', r.letter, 'p2_01'],
    ['Cada charm', 'Más de 30 diseños: balón, trébol, mariposa…', r.icon, 'p1_28'],
    ['Cada cuenta de color', 'Para separar y decorar', r.bead, 'x_cuenta_4'],
    ['Mosquetón', 'Opcional, en varios colores', r.clasp, 'x_mosqueton_1'],
  ];
  return h('div', {},
    h('section', { class: 'hero' },
      h('div', { class: 'wrap hero-in' },
        h('div', { class: 'hero-copy' },
          h('h1', {}, 'Pequeños detalles, ', h('em', {}, 'grandes historias')),
          h('p', { class: 'lead' }, 'Llaveros, decoración y regalos personalizados en impresión 3D, hechos con cariño y a tu medida.'),
          h('div', { class: 'cta' }, btn('primary', 'Arma tu llavero', { href: '#/personalizador' }, 'key'), btn('ghost', 'Ver catálogo', { href: '#/catalogo' })),
          h('p', { class: 'facts' }, `Hecho bajo pedido · listo en ${LEAD} · envíos a toda Colombia`)),
        h('div', { class: 'collage', 'aria-hidden': 'true' }, CHARMS.map(sticker)))),

    h('section', { class: 'wrap block' },
      h('div', { class: 'split' },
        h('div', {},
          h('h2', {}, 'Un llavero, pieza por pieza'),
          h('p', { class: 'lead2' }, 'Cada parte tiene su precio, así que sabes cuánto cuesta antes de pedir. Sin sorpresas.'),
          h('div', { class: 'cta' }, btn('primary', 'Calcular el mío', { href: '#/personalizador' }), btn('ghost', 'Cotizar con una foto', { href: './cotizador/' }, 'camera'))),
        h('ul', { class: 'parts' }, parts.map(([t, d, v, f]) => h('li', {},
          h('img', { src: `./starter/${f}.jpg`, alt: '', loading: 'lazy', width: 224, height: 224 }),
          h('div', {}, h('strong', {}, t), h('small', {}, d)),
          h('span', { class: 'amt' }, formatCOP(v))))))),

    h('section', { class: 'wrap block' },
      h('h2', {}, 'Explora por categoría'),
      h('ul', { class: 'index' }, cats.map((c) => h('li', {}, h('a', { href: `#/catalogo/${encodeURIComponent(c.name)}` },
        icon(CATEGORY_ICON[c.name] ?? 'sparkle'), h('span', { class: 'nm' }, c.name), h('span', { class: 'ct' }, c.count), icon('arrow', 'go')))))),

    h('section', { class: 'wrap block' },
      h('div', { class: 'sec-head' }, h('h2', {}, 'Para esta Navidad'), h('a', { href: '#/catalogo/Navidad' }, 'Ver toda la colección')),
      h('div', { class: 'grid' }, navidad.map(card))),

    h('section', { class: 'wrap block' },
      h('h2', {}, '¿Cómo comprar?'),
      h('ol', { class: 'how' }, NEGOCIO.comoComprar.map((t, i) => h('li', {}, h('span', { class: 'n' }, i + 1), h('p', {}, t)))),
      h('p', { class: 'hint' }, `Puedes pagar por ${NEGOCIO.pago.canales.join(', ')}. `, h('a', { href: '#/info' }, 'Más información'))));
}

/* ---------- catálogo ---------- */
function catalogView(category = '', coleccion = '') {
  const state = { category, coleccion, query: '', sort: 'relevancia' };
  const cats = categories(PRODUCTS);
  const cols = category ? collections(PRODUCTS, category) : [];
  const out = h('div', {});
  const count = h('p', { class: 'hint', 'aria-live': 'polite' });
  const paint = () => {
    const grouped = !state.category && !state.query && state.sort === 'relevancia';
    if (grouped) {
      count.textContent = `${PRODUCTS.length} productos`;
      out.replaceChildren(...sampleByCategory(PRODUCTS, 4).map((c) => h('section', { class: 'group' },
        h('div', { class: 'sec-head' }, h('h2', {}, c.name), h('a', { href: `#/catalogo/${encodeURIComponent(c.name)}` }, c.count > c.items.length ? `Ver los ${c.count}` : 'Ver categoría')),
        h('div', { class: 'grid' }, c.items.map(card)))));
      return;
    }
    let items = filterProducts(PRODUCTS, state);
    if (state.coleccion) items = items.filter((p) => p.coleccion === state.coleccion);
    count.textContent = `${items.length} producto${items.length === 1 ? '' : 's'}`;
    out.replaceChildren(h('div', { class: 'grid' }, items.length ? items.map(card) : [h('p', { class: 'empty' }, 'No encontramos productos con ese filtro. Prueba con otra palabra o ', h('a', { href: '#/catalogo' }, 'mira todo el catálogo'), '.')]));
  };
  paint();
  const tab = (label, href, on, n) => h('a', { class: 'tab' + (on ? ' on' : ''), href, 'aria-current': on ? 'page' : null }, label, n != null && h('small', {}, n));
  return h('div', { class: 'wrap block' },
    h('h1', { class: 'page-title' }, category || 'Catálogo'),
    h('nav', { class: 'tabs', 'aria-label': 'Categorías' }, tab('Todo', '#/catalogo', !category, PRODUCTS.length), cats.map((c) => tab(c.name, `#/catalogo/${encodeURIComponent(c.name)}`, c.name === category, c.count))),
    cols.length > 0 && h('nav', { class: 'tabs sub', 'aria-label': 'Colecciones' }, tab('Todas', `#/catalogo/${encodeURIComponent(category)}`, !coleccion),
      cols.map((c) => tab(c.name, `#/catalogo/${encodeURIComponent(category)}/${encodeURIComponent(c.name)}`, c.name === coleccion, c.count))),
    h('div', { class: 'filters' },
      h('input', { type: 'search', placeholder: 'Buscar productos…', 'aria-label': 'Buscar productos', oninput: (e) => { state.query = e.target.value; paint(); } }),
      h('select', { 'aria-label': 'Ordenar', onchange: (e) => { state.sort = e.target.value; paint(); } },
        h('option', { value: 'relevancia' }, 'Destacados'), h('option', { value: 'precio-asc' }, 'Precio: menor a mayor'),
        h('option', { value: 'precio-desc' }, 'Precio: mayor a menor'), h('option', { value: 'nombre' }, 'Nombre A–Z'))),
    count, out);
}

/* ---------- producto ---------- */
function productView(id) {
  const p = BY_ID.get(id);
  if (!p) return notFound();
  const groups = optionGroups(p);
  const sinPrecio = p.precio == null;
  const note = h('label', { class: 'field' }, p.personalizacion ? 'Personalización' : 'Comentarios (opcional)',
    h('input', { name: 'nota', placeholder: p.personalizacion ? `Escribe aquí: ${p.personalizacion}` : 'Colores, tamaño, fecha de entrega…', maxlength: 120 }));
  const qty = stepper(1, null, 'qty');
  const form = h('form', { class: 'buy', onsubmit: (e) => {
    e.preventDefault();
    const selections = Object.fromEntries(groups.map((g) => [g.key, form.elements[g.key].value]));
    cart = addToCart(cart, { id: p.id, qty: Number(form.elements.qty.value), selections, nota: form.elements.nota?.value ?? '' });
    saveCart(); updateBadge(); toast('Agregado al carrito');
  } }, groups.map((g) => pills(g.key, g.label, g.values, { colors: g.key === 'colores' })), note,
    sinPrecio && h('p', { class: 'quote-note' }, 'Este producto se cotiza según tu idea: te respondemos por WhatsApp con el precio. Agregarlo no te compromete a nada.'),
    h('div', { class: 'buybar' }, qty, h('button', { class: 'btn primary grow-btn', type: 'submit' }, sinPrecio ? 'Agregar para cotizar' : 'Agregar al carrito')));

  const dims = p.medidas ? Object.entries(p.medidas).filter(([k]) => k !== 'nota').map(([k, v]) => `${k.replace(/_cm$/, '').replace(/_/g, ' ')}: ${v} cm`) : [];
  const list = (title, items) => items?.length > 0 && h('div', { class: 'blk' }, h('h4', {}, title), h('ul', { class: 'ticks' }, items.map((x) => h('li', {}, x))));
  return h('div', { class: 'wrap block product' },
    h('nav', { class: 'crumbs', 'aria-label': 'Ruta' }, h('a', { href: '#/catalogo' }, 'Catálogo'), ' › ', h('a', { href: `#/catalogo/${encodeURIComponent(p.categoria)}` }, p.categoria)),
    h('div', { class: 'cols' },
      thumb(p, 'big'),
      h('div', { class: 'info' },
        h('h1', {}, p.nombre),
        h('div', { class: 'meta big' }, price(p), h('span', { class: 'lead-time' }, icon('clock'), `Listo en ${LEAD}`)),
        h('div', { class: 'chips' }, p.impresion3d && h('span', { class: 'chip' }, 'Impresión 3D'), p.personalizacion && h('span', { class: 'chip' }, 'Personalizable')),
        p.descripcion && h('p', { class: 'desc' }, p.descripcion),
        p.id === 'llavero-charms' && h('p', { class: 'callout' }, `Este llavero se arma a tu gusto, desde ${formatCOP(DEFAULT_KEYCHAIN_RULES.base)}. `, h('a', { href: '#/personalizador' }, 'Calcula el tuyo')),
        form,
        btn('ghost wide', 'Preguntar por WhatsApp', { href: waLink(quoteMessage(p)), target: '_blank', rel: 'noopener' }, 'chat'),
        h('p', { class: 'fine' }, 'Se fabrica bajo pedido. El envío lo paga el cliente.'),
        list('Incluye', p.incluye), list('Características', p.caracteristicas),
        (dims.length > 0 || optionNotes(p).length > 0 || p.notas?.length > 0) && h('div', { class: 'blk' }, h('h4', {}, 'Detalles'),
          dims.length > 0 && h('p', { class: 'small' }, 'Medidas — ', dims.join(' · ')),
          optionNotes(p).map((n) => h('p', { class: 'small' }, n)), p.notas?.map((n) => h('p', { class: 'small' }, n))))));
}

/* ---------- carrito ---------- */
function cartView() {
  const t = cartTotals(cart, BY_ID);
  if (!t.lines.length) return h('div', { class: 'wrap block' }, h('h1', { class: 'page-title' }, 'Tu carrito'), h('p', { class: 'empty' }, 'Todavía no has agregado productos.'), btn('primary', 'Ver catálogo', { href: '#/catalogo' }));
  const cliente = { nombre: '', ciudad: '', notas: '' };
  const env = NEGOCIO.envio.rangoEstimado;
  const sent = h('div', { class: 'sent', hidden: true, role: 'status' });
  const message = () => orderMessage(t, cliente, NEGOCIO);
  const send = h('a', { class: 'btn primary big', target: '_blank', rel: 'noopener', onclick: () => {
    sent.hidden = false;
    sent.replaceChildren(h('p', {}, 'Abrimos WhatsApp con tu pedido. Si no se abrió, copia el pedido y pégalo en el chat de Milav.'),
      h('button', { class: 'btn ghost', type: 'button', onclick: () => navigator.clipboard?.writeText(message()).then(() => toast('Pedido copiado'), () => prompt('Copia tu pedido:', message())) }, 'Copiar pedido'));
  } }, icon('chat'), 'Enviar pedido por WhatsApp');
  const refresh = () => { send.href = waLink(message()); };
  refresh();
  const field = (key, label, ph) => h('label', { class: 'field' }, label, h('input', { placeholder: ph, oninput: (e) => { cliente[key] = e.target.value; refresh(); } }));
  return h('div', { class: 'wrap block' },
    h('h1', { class: 'page-title' }, 'Tu carrito'),
    h('ul', { class: 'lines' }, t.lines.map((l) => h('li', { class: 'line' },
      h('a', { href: `#/producto/${l.id}`, 'aria-label': l.product.nombre }, thumb(l.product, 'mini')),
      h('div', { class: 'grow' },
        h('strong', {}, l.product.nombre),
        h('div', { class: 'small' }, [...Object.values(l.selections), l.nota && `«${l.nota}»`].filter(Boolean).join(' · ') || ' '),
        h('div', { class: 'small' }, l.unit == null ? 'Precio a cotizar' : `${formatCOP(l.unit)} c/u`)),
      stepper(l.qty, (n) => { cart = setQty(cart, l.key, n); saveCart(); updateBadge(); render(); }, undefined, `cantidad de ${l.product.nombre}`),
      h('strong', { class: 'sum' }, l.total == null ? 'por cotizar' : formatCOP(l.total)),
      h('button', { class: 'x', title: 'Quitar', 'aria-label': `Quitar ${l.product.nombre}`, onclick: () => {
        const before = cart; cart = removeLine(cart, l.key); saveCart(); updateBadge(); render();
        toast(`Quitaste ${l.product.nombre}`, { label: 'Deshacer', run: () => { cart = before; saveCart(); updateBadge(); render(); } });
      } }, '✕')))),
    h('div', { class: 'summary' },
      h('div', { class: 'tl' }, h('span', {}, t.toQuote > 0 ? 'Subtotal (sin lo que está por cotizar)' : 'Subtotal'), h('strong', {}, t.subtotal === 0 && t.toQuote > 0 ? 'Por cotizar' : formatCOP(t.subtotal))),
      t.toQuote > 0 && h('div', { class: 'tl small' }, h('span', {}, `${t.toQuote} producto${t.toQuote === 1 ? '' : 's'} por cotizar`), h('span', {}, 'te lo confirmamos')),
      h('div', { class: 'tl small' }, h('span', {}, 'Envío (lo paga el cliente)'), h('span', {}, `${formatCOP(env.min)} a ${formatCOP(env.max)}`)),
      h('p', { class: 'hint' }, 'El valor exacto del envío depende de la ciudad; te lo confirmamos al recibir tu pedido.')),
    h('div', { class: 'card-form' },
      h('h3', {}, 'Tus datos (opcional, para agilizar)'),
      field('nombre', 'Nombre', 'Tu nombre'), field('ciudad', 'Ciudad de envío', 'Ciudad'), field('notas', 'Notas del pedido', 'Colores, fechas, dudas…'),
      send, sent,
      h('h4', { class: 'after' }, 'Después de enviar el pedido'),
      h('ol', { class: 'steps small' },
        h('li', {}, 'Te escribimos para confirmar el pedido y el envío.'),
        h('li', {}, `Pagas por ${NEGOCIO.pago.canales.join(', ')} y nos envías el comprobante.`),
        h('li', {}, `Fabricamos tu pedido (${LEAD}) y te enviamos la guía.`))));
}

/* ---------- información ---------- */
function infoView() {
  const e = NEGOCIO.envio.rangoEstimado;
  return h('div', { class: 'wrap block prose' },
    h('h1', { class: 'page-title' }, 'Compras, pagos y envíos'),
    h('h2', {}, '¿Cómo comprar?'), h('ol', { class: 'steps' }, NEGOCIO.comoComprar.map((s) => h('li', {}, s))),
    h('h2', {}, 'Pagos'), h('p', {}, `Aceptamos transferencia por ${NEGOCIO.pago.canales.join(', ')}. Te enviamos los datos al confirmar tu pedido.`),
    h('h2', {}, 'Tiempos de entrega'), h('p', {}, `Todo se fabrica bajo pedido: ${LEAD} hábiles según el producto, más el tiempo de transporte.`),
    h('h2', {}, 'Envíos'), h('p', {}, `Enviamos a todo el país. El envío lo paga el cliente y normalmente cuesta entre ${formatCOP(e.min)} y ${formatCOP(e.max)} según el destino.`),
    h('h2', {}, 'Contacto'),
    h('ul', { class: 'plain' },
      NEGOCIO.whatsapp.map((n) => h('li', {}, h('a', { href: waLink('Hola Milav', n), target: '_blank', rel: 'noopener' }, `WhatsApp ${phoneFmt(n)}`))),
      h('li', {}, h('a', { href: `https://instagram.com/${NEGOCIO.instagram.replace('@', '')}`, target: '_blank', rel: 'noopener' }, `Instagram ${NEGOCIO.instagram}`))));
}

/* ---------- calculadora del llavero ---------- */
const LETTER_COLORS = ['Rojo', 'Naranja', 'Amarillo', 'Verde', 'Azul', 'Morado', 'Lila', 'Rosa', 'Gris', 'Negro'];
function personalizadorView() {
  const spec = { ring: 'argolla', clasp: false, cord: llavero.cordones.colores[0], letterColor: LETTER_COLORS[0], text: '', icons: 0, beads: 0, notes: '' };
  const lines = h('ul', { class: 'qlines' });
  const total = h('strong', { class: 'qtotal' });
  const wa = h('a', { class: 'btn primary big', target: '_blank', rel: 'noopener' }, icon('chat'), 'Pedir este llavero por WhatsApp');
  const paint = () => {
    const q = priceKeychain({ ring: spec.ring, clasp: spec.clasp, icons: spec.icons, beads: spec.beads, text: spec.text });
    lines.replaceChildren(...q.lines.map((l) => h('li', {}, h('span', {}, l.qty > 1 ? `${l.label} × ${l.qty}` : l.label), h('span', {}, formatCOP(l.total)))));
    total.textContent = formatCOP(q.total);
    wa.href = waLink(keychainMessage({ ...spec, ringLabel: RING_TYPES[spec.ring] }, q));
  };
  paint();
  const set = (k) => (v) => { spec[k] = v; paint(); };
  return h('div', { class: 'wrap block' },
    h('h1', { class: 'page-title' }, 'Calcula tu llavero'),
    h('p', { class: 'lead2' }, 'Elige las piezas y mira el precio al instante. Cuando te guste, lo pides por WhatsApp y lo confirmamos contigo.'),
    h('div', { class: 'calc' },
      h('form', { class: 'buy', onsubmit: (e) => e.preventDefault() },
        h('label', { class: 'field' }, 'Nombre o texto', h('input', { placeholder: 'Ej.: NAT', maxlength: 14, oninput: (e) => { spec.text = e.target.value; paint(); } })),
        pills('letterColor', 'Color de las letras', LETTER_COLORS, { colors: true, onChange: set('letterColor') }),
        pills('cord', 'Color del cordón', llavero.cordones.colores, { colors: true, onChange: set('cord') }),
        pills('ring', 'Enganche (incluido en la base)', Object.values(RING_TYPES), { selected: RING_TYPES.argolla, onChange: (v) => set('ring')(v.toLowerCase()) }),
        h('label', { class: 'check' }, h('input', { type: 'checkbox', onchange: (e) => { spec.clasp = e.target.checked; paint(); } }), h('span', {}, `Agregar mosquetón (+${formatCOP(DEFAULT_KEYCHAIN_RULES.clasp)})`)),
        h('div', { class: 'two' },
          h('div', {}, h('p', { class: 'lab' }, `Charms (${formatCOP(DEFAULT_KEYCHAIN_RULES.icon)} c/u)`), stepper(0, set('icons'), 'icons', 'charms', 0)),
          h('div', {}, h('p', { class: 'lab' }, `Cuentas (${formatCOP(DEFAULT_KEYCHAIN_RULES.bead)} c/u)`), stepper(0, set('beads'), 'beads', 'cuentas', 0))),
        h('label', { class: 'field' }, 'Notas (opcional)', h('input', { placeholder: 'Qué charms quieres, colores, fecha…', maxlength: 160, oninput: (e) => { spec.notes = e.target.value; paint(); } }))),
      h('aside', { class: 'quote-card' },
        h('h2', {}, 'Tu llavero'), lines,
        h('div', { class: 'tl' }, h('span', {}, 'Total aproximado'), total),
        h('p', { class: 'hint' }, 'Sin envío. Listo en ', LEAD, '; el envío lo paga el cliente.'),
        wa,
        h('a', { class: 'btn ghost wide', href: './cotizador/' }, icon('camera'), 'Mejor cotizar con una foto'))));
}

const notFound = () => h('div', { class: 'wrap block' }, h('h1', { class: 'page-title' }, 'No encontramos esa página'), btn('primary', 'Ir al inicio', { href: '#/' }));

/* ---------- raíz y rutas ---------- */
let badge;
function updateBadge() { if (badge) { const n = cartCount(); badge.textContent = n; badge.hidden = n === 0; } }

function route() {
  const [, root = '', a1 = '', a2 = ''] = location.hash.replace(/^#/, '').split('/');
  const a = decodeURIComponent(a1), b = decodeURIComponent(a2);
  switch (root) {
    case 'catalogo': return [`${b || a || 'Catálogo'} · Milav`, catalogView(a, b)];
    case 'producto': { const p = BY_ID.get(a); return [p ? `${p.nombre} · Milav` : 'Milav', productView(a)]; }
    case 'carrito': return ['Carrito · Milav', cartView()];
    case 'info': return ['Compras y envíos · Milav', infoView()];
    case 'personalizador': return ['Calcula tu llavero · Milav', personalizadorView()];
    case '': return ['Milav · Impresión 3D personalizada', homeView()];
    default: return ['Milav', notFound()];
  }
}

function render() {
  const [title, view] = route();
  document.title = title;
  badge = h('span', { class: 'badge', hidden: true });
  const cur = location.hash.replace(/^#\/?/, '').split('/')[0];
  const link = (href, text, key) => h('a', { href, 'aria-current': key && key === cur ? 'page' : null }, text);
  app.replaceChildren(
    h('div', { class: 'announce' }, icon('truck'), `Envíos a toda Colombia · hecho bajo pedido, listo en ${LEAD}`),
    h('header', { class: 'top' }, h('div', { class: 'wrap bar' },
      h('a', { class: 'brand', href: '#/', 'aria-label': 'Milav, inicio' }, h('img', { src: LOGO, alt: 'Milav', width: 79, height: 42 })),
      h('nav', { 'aria-label': 'Principal' }, link('#/catalogo', 'Catálogo', 'catalogo'), link('#/personalizador', 'Arma tu llavero', 'personalizador'), link('./cotizador/', 'Cotiza con foto'), link('#/info', 'Envíos', 'info')),
      h('a', { class: 'cart', href: '#/carrito', 'aria-label': 'Carrito', 'aria-current': cur === 'carrito' ? 'page' : null }, icon('cart'), badge))),
    h('main', {}, view),
    h('footer', {}, h('div', { class: 'wrap foot' },
      h('div', {}, h('img', { class: 'flogo', src: LOGO, alt: 'Milav', width: 79, height: 42 }), h('p', { class: 'small' }, `${NEGOCIO.significado}. ${NEGOCIO.lema}.`)),
      h('div', {}, h('h5', {}, 'Tienda'), h('a', { href: '#/catalogo' }, 'Catálogo'), h('a', { href: '#/personalizador' }, 'Arma tu llavero'), h('a', { href: './cotizador/' }, 'Cotiza con una foto'), h('a', { href: '#/info' }, 'Compras y envíos')),
      h('div', {}, h('h5', {}, 'Contacto'),
        NEGOCIO.whatsapp.map((n) => h('a', { href: waLink('Hola Milav', n), target: '_blank', rel: 'noopener' }, `WhatsApp ${phoneFmt(n)}`)),
        h('a', { href: `https://instagram.com/${NEGOCIO.instagram.replace('@', '')}`, target: '_blank', rel: 'noopener' }, `Instagram ${NEGOCIO.instagram}`)))));
  updateBadge();
}

const show = () => { document.getElementById('toast')?.remove(); render(); document.querySelector('.tab[aria-current]')?.scrollIntoView({ inline: 'center', block: 'nearest' }); };
window.addEventListener('hashchange', () => { show(); window.scrollTo(0, 0); });
show();
