import './style.css';
import { h } from './dom.js';
import { PRODUCTS, BY_ID, NEGOCIO, LOGO, photoOf } from './data.js';
import {
  CATEGORY_ICONS, formatCOP, categories, filterProducts, optionGroups, optionNotes, addToCart, setQty, removeLine,
  cartTotals, orderMessage, whatsappUrl, quoteMessage,
} from './logic.js';
import { DEFAULT_KEYCHAIN_RULES } from '../keychain.js';

const app = document.getElementById('app');
const WA = NEGOCIO.whatsapp[0];

/* ---------- estado ---------- */
const CART_KEY = 'milav.carrito.v1';
let cart = [];
try { cart = JSON.parse(localStorage.getItem(CART_KEY) || '[]'); } catch { cart = []; }
const saveCart = () => { try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch { /* sin almacenamiento: el carrito vive en memoria */ } };
const cartCount = () => cartTotals(cart, BY_ID).count;
let toastTimer;
function toast(msg) {
  document.getElementById('toast')?.remove();
  const t = h('div', { id: 'toast', role: 'status' }, msg);
  document.body.append(t);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.remove(), 2200);
}

/* ---------- piezas comunes ---------- */
const price = (p) => (p.precio == null ? h('span', { class: 'quote' }, 'Precio a cotizar') : h('span', { class: 'price' }, formatCOP(p.precio)));

function thumb(p, cls = '') {
  const url = photoOf(p.id);
  return h('div', { class: `thumb ${cls}` }, url
    ? h('img', { src: url, alt: p.nombre, loading: 'lazy' })
    : h('div', { class: 'ph', 'aria-hidden': 'true' }, h('span', {}, CATEGORY_ICONS[p.categoria] ?? '🎁'), h('small', {}, p.categoria)));
}

function card(p) {
  return h('a', { class: 'card', href: `#/producto/${p.id}` },
    thumb(p),
    h('div', { class: 'body' },
      h('h3', {}, p.nombre),
      h('div', { class: 'meta' }, price(p), p.personalizacion && h('span', { class: 'chip' }, 'Personalizable'))));
}

const waLink = (text) => whatsappUrl(WA, text);

/* ---------- vistas ---------- */
function homeView() {
  const cats = categories(PRODUCTS);
  const navidad = PRODUCTS.filter((p) => p.categoria === 'Navidad' && p.precio != null).slice(0, 4);
  return h('div', {},
    h('section', { class: 'hero' },
      h('div', { class: 'wrap' },
        h('p', { class: 'eyebrow' }, 'Impresión 3D · hecho a tu medida'),
        h('h1', {}, 'Pequeños detalles, grandes historias'),
        h('p', { class: 'lead' }, 'Llaveros, decoración y regalos personalizados. Se hacen bajo pedido y llegan en 3 a 5 días a toda Colombia.'),
        h('div', { class: 'cta' },
          h('a', { class: 'btn primary', href: '#/catalogo' }, 'Ver catálogo'),
          h('a', { class: 'btn', href: '#/personalizador' }, '🔑 Arma tu llavero'),
          h('a', { class: 'btn', href: './cotizador/' }, '📷 Cotiza con una foto')))),
    h('section', { class: 'wrap block' },
      h('h2', {}, 'Explora por categoría'),
      h('div', { class: 'cats' }, cats.map((c) => h('a', { class: 'cat', href: `#/catalogo/${encodeURIComponent(c.name)}` },
        h('span', { class: 'ico' }, CATEGORY_ICONS[c.name] ?? '🎁'), h('strong', {}, c.name), h('small', {}, `${c.count} producto${c.count === 1 ? '' : 's'}`))))),
    h('section', { class: 'wrap block' },
      h('div', { class: 'row-head' }, h('h2', {}, 'Especial de Navidad 🎄'), h('a', { href: '#/catalogo/Navidad' }, 'Ver todo')),
      h('div', { class: 'grid' }, navidad.map(card))),
    h('section', { class: 'wrap block' },
      h('h2', {}, '¿Cómo comprar?'),
      h('ol', { class: 'steps' }, NEGOCIO.comoComprar.map((s) => h('li', {}, s))),
      h('p', { class: 'hint' }, `Puedes pagar por ${NEGOCIO.pago.canales.join(', ')}. `, h('a', { href: '#/info' }, 'Más información'))));
}

function catalogView(category = '') {
  const state = { category, query: '', sort: 'relevancia' };
  const cats = categories(PRODUCTS);
  const list = h('div', { class: 'grid' });
  const count = h('p', { class: 'hint' });
  const paint = () => {
    const items = filterProducts(PRODUCTS, state);
    list.replaceChildren(...(items.length ? items.map(card) : [h('p', { class: 'empty' }, 'No encontramos productos con ese filtro.')]));
    count.textContent = `${items.length} producto${items.length === 1 ? '' : 's'}`;
  };
  paint();
  return h('div', { class: 'wrap block' },
    h('h1', {}, state.category || 'Catálogo'),
    h('div', { class: 'filters' },
      h('input', { type: 'search', placeholder: 'Buscar…', 'aria-label': 'Buscar productos', oninput: (e) => { state.query = e.target.value; paint(); } }),
      h('select', { 'aria-label': 'Categoría', onchange: (e) => { location.hash = e.target.value ? `#/catalogo/${encodeURIComponent(e.target.value)}` : '#/catalogo'; } },
        h('option', { value: '' }, 'Todas las categorías'),
        cats.map((c) => h('option', { value: c.name, selected: c.name === state.category }, `${c.name} (${c.count})`))),
      h('select', { 'aria-label': 'Ordenar', onchange: (e) => { state.sort = e.target.value; paint(); } },
        h('option', { value: 'relevancia' }, 'Orden: destacados'),
        h('option', { value: 'precio-asc' }, 'Precio: menor a mayor'),
        h('option', { value: 'precio-desc' }, 'Precio: mayor a menor'),
        h('option', { value: 'nombre' }, 'Nombre A–Z'))),
    count, list);
}

function productView(id) {
  const p = BY_ID.get(id);
  if (!p) return notFound();
  const groups = optionGroups(p);
  const selects = groups.map((g) => h('label', {}, g.label,
    h('select', { name: g.key }, g.values.map((v) => h('option', { value: v }, v)))));
  const note = p.personalizacion
    ? h('label', {}, 'Personalización', h('input', { name: 'nota', placeholder: `Escribe aquí: ${p.personalizacion}`, maxlength: 120 }))
    : h('label', {}, 'Comentarios (opcional)', h('input', { name: 'nota', placeholder: 'Colores, tamaño, fecha de entrega…', maxlength: 120 }));
  const qty = h('input', { name: 'qty', type: 'number', min: 1, max: 99, value: 1, inputmode: 'numeric' });
  const form = h('form', { class: 'buy', onsubmit: (e) => {
    e.preventDefault();
    const selections = Object.fromEntries(groups.map((g) => [g.key, form.elements[g.key].value]));
    cart = addToCart(cart, { id: p.id, qty: Number(qty.value), selections, nota: form.elements.nota?.value ?? '' });
    saveCart(); updateBadge(); toast('Agregado al carrito ✓');
  } }, selects, note, h('label', {}, 'Cantidad', qty),
    h('button', { class: 'btn primary big', type: 'submit' }, p.precio == null ? 'Agregar para cotizar' : 'Agregar al carrito'));

  const dims = p.medidas ? Object.entries(p.medidas).filter(([k]) => k !== 'nota').map(([k, v]) => `${k.replace(/_cm$/, '').replace(/_/g, ' ')}: ${v} cm`) : [];
  const personalizador = p.id === 'llavero-charms';
  return h('div', { class: 'wrap block product' },
    h('a', { class: 'back', href: `#/catalogo/${encodeURIComponent(p.categoria)}` }, `← ${p.categoria}`),
    h('div', { class: 'cols' },
      thumb(p, 'big'),
      h('div', { class: 'info' },
        h('h1', {}, p.nombre),
        h('div', { class: 'meta' }, price(p), p.impresion3d && h('span', { class: 'chip' }, 'Impresión 3D')),
        p.descripcion && h('p', {}, p.descripcion),
        personalizador && h('p', { class: 'callout' }, `Este llavero se arma a tu gusto. Precio desde ${formatCOP(DEFAULT_KEYCHAIN_RULES.base)}. `, h('a', { href: '#/personalizador' }, 'Conoce cómo armarlo')),
        p.incluye?.length > 0 && h('div', {}, h('h4', {}, 'Incluye'), h('ul', {}, p.incluye.map((x) => h('li', {}, x)))),
        p.caracteristicas?.length > 0 && h('div', {}, h('h4', {}, 'Características'), h('ul', {}, p.caracteristicas.map((x) => h('li', {}, x)))),
        dims.length > 0 && h('p', { class: 'small' }, 'Medidas — ', dims.join(' · ')),
        optionNotes(p).map((n) => h('p', { class: 'small' }, n)),
        p.notas?.map((n) => h('p', { class: 'small' }, '• ', n)),
        form,
        h('a', { class: 'btn', href: waLink(quoteMessage(p)), target: '_blank', rel: 'noopener' }, '💬 Preguntar por WhatsApp'),
        h('p', { class: 'small' }, `Se fabrica bajo pedido · entrega en ${NEGOCIO.plazoEntregaDias.min} a ${NEGOCIO.plazoEntregaDias.max} días · envío a cargo del cliente`))));
}

function cartView() {
  const t = cartTotals(cart, BY_ID);
  if (!t.lines.length) return h('div', { class: 'wrap block' }, h('h1', {}, 'Tu carrito'), h('p', { class: 'empty' }, 'Todavía no has agregado productos.'), h('a', { class: 'btn primary', href: '#/catalogo' }, 'Ver catálogo'));
  const cliente = { nombre: '', ciudad: '', notas: '' };
  const env = NEGOCIO.envio.rangoEstimado;
  const send = h('a', { class: 'btn primary big', target: '_blank', rel: 'noopener' }, 'Enviar pedido por WhatsApp');
  const refreshLink = () => { send.href = waLink(orderMessage(t, cliente, NEGOCIO)); };
  refreshLink();
  const field = (key, label, ph) => h('label', {}, label, h('input', { placeholder: ph, oninput: (e) => { cliente[key] = e.target.value; refreshLink(); } }));
  return h('div', { class: 'wrap block' },
    h('h1', {}, 'Tu carrito'),
    h('ul', { class: 'lines' }, t.lines.map((l) => h('li', { class: 'line' },
      h('a', { href: `#/producto/${l.id}` }, thumb(l.product, 'mini')),
      h('div', { class: 'grow' },
        h('strong', {}, l.product.nombre),
        h('div', { class: 'small' }, [...Object.values(l.selections), l.nota && `«${l.nota}»`].filter(Boolean).join(' · ') || ' '),
        h('div', { class: 'small' }, l.unit == null ? 'Precio a cotizar' : `${formatCOP(l.unit)} c/u`)),
      h('input', { class: 'qty', type: 'number', min: 1, value: l.qty, 'aria-label': 'Cantidad', inputmode: 'numeric',
        onchange: (e) => { cart = setQty(cart, l.key, e.target.value); saveCart(); updateBadge(); render(); } }),
      h('strong', { class: 'sum' }, l.total == null ? 'cotizar' : formatCOP(l.total)),
      h('button', { class: 'x', title: 'Quitar', 'aria-label': 'Quitar', onclick: () => { cart = removeLine(cart, l.key); saveCart(); updateBadge(); render(); } }, '✕')))),
    h('div', { class: 'summary' },
      h('div', { class: 'tl' }, h('span', {}, 'Subtotal'), h('span', {}, formatCOP(t.subtotal))),
      t.toQuote > 0 && h('div', { class: 'tl small' }, h('span', {}, `${t.toQuote} producto(s) por cotizar`), h('span', {}, '—')),
      h('div', { class: 'tl small' }, h('span', {}, 'Envío (lo paga el cliente)'), h('span', {}, `${formatCOP(env.min)} – ${formatCOP(env.max)}`)),
      h('p', { class: 'hint' }, 'El valor exacto del envío depende de la ciudad de destino; te lo confirmamos al recibir tu pedido.')),
    h('div', { class: 'card-form' },
      h('h3', {}, 'Tus datos (opcional, para agilizar)'),
      field('nombre', 'Nombre', 'Tu nombre'), field('ciudad', 'Ciudad de envío', 'Ciudad'), field('notas', 'Notas del pedido', 'Colores, fechas, dudas…'),
      send,
      h('ol', { class: 'steps small' },
        h('li', {}, 'Te escribimos para confirmar el pedido y el envío.'),
        h('li', {}, `Pagas por ${NEGOCIO.pago.canales.join(', ')} y nos envías el comprobante.`),
        h('li', {}, `Fabricamos tu pedido (${NEGOCIO.plazoEntregaDias.min} a ${NEGOCIO.plazoEntregaDias.max} días) y te enviamos la guía.`))));
}

function infoView() {
  const e = NEGOCIO.envio.rangoEstimado;
  return h('div', { class: 'wrap block prose' },
    h('h1', {}, 'Compras, pagos y envíos'),
    h('h2', {}, '¿Cómo comprar?'), h('ol', { class: 'steps' }, NEGOCIO.comoComprar.map((s) => h('li', {}, s))),
    h('h2', {}, 'Pagos'), h('p', {}, `Aceptamos transferencia por ${NEGOCIO.pago.canales.join(', ')}. Te enviamos los datos al confirmar tu pedido.`),
    h('h2', {}, 'Tiempos de entrega'), h('p', {}, `Todo se fabrica bajo pedido: ${NEGOCIO.plazoEntregaDias.min} a ${NEGOCIO.plazoEntregaDias.max} días hábiles según el producto, más el tiempo de transporte.`),
    h('h2', {}, 'Envíos'), h('p', {}, `Enviamos a todo el país. El envío lo paga el cliente y normalmente cuesta entre ${formatCOP(e.min)} y ${formatCOP(e.max)} según el destino.`),
    h('h2', {}, 'Contacto'),
    h('p', {}, '💬 WhatsApp: ', NEGOCIO.whatsapp.map((n, i) => [i ? ' · ' : '', h('a', { href: whatsappUrl(n, 'Hola Milav'), target: '_blank', rel: 'noopener' }, n)])),
    h('p', {}, '📷 Instagram: ', h('a', { href: `https://instagram.com/${NEGOCIO.instagram.replace('@', '')}`, target: '_blank', rel: 'noopener' }, NEGOCIO.instagram)));
}

function personalizadorView() {
  const r = DEFAULT_KEYCHAIN_RULES;
  return h('div', { class: 'wrap block prose' },
    h('h1', {}, '🔑 Arma tu llavero'),
    h('p', { class: 'callout' }, 'Muy pronto podrás armarlo aquí, viendo cómo queda y con el precio al instante.'),
    h('p', {}, 'Mientras tanto, estos son los precios para que te hagas una idea:'),
    h('ul', {},
      h('li', {}, `Base (cordón + argolla o cadena): ${formatCOP(r.base)}`),
      h('li', {}, `Cada letra: ${formatCOP(r.letter)} · cada icono (charm): ${formatCOP(r.icon)} · cada cuenta (shakira): ${formatCOP(r.bead)}`),
      h('li', {}, `Mosquetón: ${formatCOP(r.clasp)}`)),
    h('p', {}, 'Escríbenos con tu idea (nombre, colores y charms) y te lo cotizamos:'),
    h('div', { class: 'cta' },
      h('a', { class: 'btn primary', href: waLink('Hola Milav, quiero armar un llavero personalizado'), target: '_blank', rel: 'noopener' }, '💬 Pedir mi llavero'),
      h('a', { class: 'btn', href: './cotizador/' }, '📷 Cotizar con una foto')));
}

const notFound = () => h('div', { class: 'wrap block' }, h('h1', {}, 'No encontramos esa página'), h('a', { class: 'btn primary', href: '#/' }, 'Ir al inicio'));

/* ---------- raíz y rutas ---------- */
let badge;
function updateBadge() { if (badge) { const n = cartCount(); badge.textContent = n; badge.hidden = n === 0; } }

function route() {
  const [, root = '', arg = ''] = location.hash.replace(/^#/, '').split('/');
  const a = decodeURIComponent(arg);
  switch (root) {
    case 'catalogo': return [a ? `${a} · Milav` : 'Catálogo · Milav', catalogView(a)];
    case 'producto': { const p = BY_ID.get(a); return [p ? `${p.nombre} · Milav` : 'Milav', productView(a)]; }
    case 'carrito': return ['Carrito · Milav', cartView()];
    case 'info': return ['Compras y envíos · Milav', infoView()];
    case 'personalizador': return ['Arma tu llavero · Milav', personalizadorView()];
    case '': return ['Milav · Impresión 3D personalizada', homeView()];
    default: return ['Milav', notFound()];
  }
}

function render() {
  const [title, view] = route();
  document.title = title;
  badge = h('span', { class: 'badge', hidden: true });
  const link = (href, text, extra = {}) => h('a', { href, ...extra }, text);
  app.replaceChildren(
    h('header', { class: 'top' }, h('div', { class: 'wrap bar' },
      h('a', { class: 'brand', href: '#/', 'aria-label': 'Milav, inicio' }, h('img', { src: LOGO, alt: 'Milav' })),
      h('nav', {}, link('#/catalogo', 'Catálogo'), link('#/personalizador', 'Arma tu llavero'), link('./cotizador/', 'Cotizador'), link('#/info', 'Envíos')),
      h('a', { class: 'cart', href: '#/carrito', 'aria-label': 'Carrito' }, '🛒', badge))),
    h('main', {}, view),
    h('footer', {}, h('div', { class: 'wrap' },
      h('p', {}, h('strong', {}, 'Milav'), ' · Milagro · Amor · Vida'),
      h('p', { class: 'small' }, NEGOCIO.lema, ' · ', NEGOCIO.instagram, ' · WhatsApp ', NEGOCIO.whatsapp.join(' / ')))));
  updateBadge();
}

window.addEventListener('hashchange', () => { render(); window.scrollTo(0, 0); });
render();
