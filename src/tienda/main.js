import './style.css';
import { h } from './dom.js';
import { PRODUCTS, BY_ID, NEGOCIO, LOGO, photoOf } from './data.js';
import {
  CATEGORY_ICONS, CATEGORY_TINT, swatchColor, formatCOP, categories, filterProducts, optionGroups, optionNotes, addToCart, setQty, removeLine,
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
  const [a, b] = CATEGORY_TINT[p.categoria] ?? ['#e4daf5', '#cfe3c9'];
  return h('div', { class: `thumb ${cls}`, style: `--a:${a};--b:${b}` }, url
    ? h('img', { src: url, alt: p.nombre, loading: 'lazy' })
    : h('div', { class: 'ph', 'aria-hidden': 'true' }, h('span', {}, CATEGORY_ICONS[p.categoria] ?? '🎁'), h('small', {}, p.categoria)));
}

/** Selector de cantidad con − y +. */
function stepper(value, onChange, name) {
  const input = h('input', { name, type: 'number', min: 1, max: 99, value, inputmode: 'numeric', 'aria-label': 'Cantidad',
    onchange: () => { input.value = Math.min(99, Math.max(1, Math.floor(Number(input.value) || 1))); onChange?.(Number(input.value)); } });
  const step = (d) => () => { input.value = Math.min(99, Math.max(1, (Number(input.value) || 1) + d)); onChange?.(Number(input.value)); };
  return h('div', { class: 'stepper' }, h('button', { type: 'button', 'aria-label': 'Menos', onclick: step(-1) }, '−'), input, h('button', { type: 'button', 'aria-label': 'Más', onclick: step(1) }, '+'));
}

/** Opciones como botones (con muestra de color cuando el nombre es un color conocido). */
function pills(group) {
  return h('fieldset', { class: 'opt' }, h('legend', {}, group.label),
    h('div', { class: 'pills' }, group.values.map((v, i) => {
      const hex = group.key === 'colores' ? swatchColor(v) : null;
      return h('label', { class: 'pill' },
        h('input', { type: 'radio', name: group.key, value: v, checked: i === 0 }),
        h('span', {}, hex && h('i', { class: 'dot', style: `background:${hex}` }), v));
    })));
}

function card(p) {
  return h('a', { class: 'card', href: `#/producto/${p.id}` },
    thumb(p),
    h('div', { class: 'body' },
      h('h3', {}, p.nombre),
      h('div', { class: 'meta' }, price(p)),
      p.personalizacion && h('span', { class: 'chip' }, 'Personalizable')));
}

const waLink = (text) => whatsappUrl(WA, text);

/* ---------- vistas ---------- */
const CHARMS = ['p1_09', 'p1_11', 'p1_12', 'p1_28', 'p1_31', 'p1_27', 'p1_00', 'p1_18', 'p2_00', 'p2_01', 'p2_02', 'p2_03'];
const charm = (f, i) => h('img', { class: 'charm', src: `./starter/${f}.jpg`, alt: '', loading: 'lazy', style: `--r:${[-6, 4, -3, 7, -5, 3][i % 6]}deg` });

function homeView() {
  const cats = categories(PRODUCTS);
  const navidad = PRODUCTS.filter((p) => p.categoria === 'Navidad' && p.precio != null).slice(0, 4);
  const pitch = [['🛠️', 'Hecho bajo pedido', 'Cada pieza se imprime para ti'], ['⏱️', `Entrega en ${NEGOCIO.plazoEntregaDias.min} a ${NEGOCIO.plazoEntregaDias.max} días`, 'Más el tiempo de transporte'], ['🚚', 'Envíos a todo el país', 'Colombia, de punta a punta'], ['🎨', 'Colores a tu gusto', 'Personaliza nombre y colores']];
  return h('div', {},
    h('section', { class: 'hero' },
      h('div', { class: 'wrap hero-in' },
        h('div', { class: 'hero-copy' },
          h('p', { class: 'eyebrow' }, 'Milagro · Amor · Vida'),
          h('h1', {}, 'Pequeños detalles, ', h('em', {}, 'grandes historias')),
          h('p', { class: 'lead' }, 'Llaveros, decoración y regalos personalizados en impresión 3D, hechos con cariño y a tu medida.'),
          h('div', { class: 'cta' },
            h('a', { class: 'btn primary', href: '#/catalogo' }, 'Ver catálogo'),
            h('a', { class: 'btn ghost', href: '#/personalizador' }, 'Arma tu llavero →'))),
        h('div', { class: 'collage', 'aria-hidden': 'true' }, CHARMS.slice(0, 9).map(charm)))),
    h('section', { class: 'wrap pitch' }, pitch.map(([i, t, d]) => h('div', { class: 'pi' }, h('span', { class: 'pi-ico' }, i), h('div', {}, h('strong', {}, t), h('small', {}, d))))),
    h('section', { class: 'wrap block' },
      h('div', { class: 'sec-head' }, h('h2', {}, 'Explora por categoría')),
      h('div', { class: 'cats' }, cats.map((c) => {
        const [x, y] = CATEGORY_TINT[c.name] ?? ['#e4daf5', '#cfe3c9'];
        return h('a', { class: 'cat', href: `#/catalogo/${encodeURIComponent(c.name)}`, style: `--a:${x};--b:${y}` },
          h('span', { class: 'ico' }, CATEGORY_ICONS[c.name] ?? '🎁'), h('strong', {}, c.name), h('small', {}, `${c.count} producto${c.count === 1 ? '' : 's'}`));
      }))),
    h('section', { class: 'wrap block' },
      h('div', { class: 'promo' },
        h('div', { class: 'promo-copy' },
          h('p', { class: 'eyebrow' }, 'Lo más Milav'),
          h('h2', {}, 'Arma tu llavero'),
          h('p', {}, 'Elige el cordón, las letras de tu nombre, charms y cuentas de colores. Desde ', h('strong', {}, formatCOP(DEFAULT_KEYCHAIN_RULES.base)), '.'),
          h('div', { class: 'cta' }, h('a', { class: 'btn primary', href: '#/personalizador' }, 'Así se arma'), h('a', { class: 'btn ghost', href: './cotizador/' }, '📷 Cotizar con una foto'))),
        h('div', { class: 'promo-charms', 'aria-hidden': 'true' }, CHARMS.slice(3).map(charm)))),
    h('section', { class: 'wrap block' },
      h('div', { class: 'sec-head' }, h('h2', {}, 'Especial de Navidad 🎄'), h('a', { href: '#/catalogo/Navidad' }, 'Ver todo →')),
      h('div', { class: 'grid' }, navidad.map(card))),
    h('section', { class: 'wrap block' },
      h('h2', {}, '¿Cómo comprar?'),
      h('ol', { class: 'how' }, NEGOCIO.comoComprar.map((t, i) => h('li', {}, h('span', { class: 'n' }, i + 1), h('p', {}, t)))),
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
  const chip = (label, value, n) => h('a', { class: 'tab' + (value === category ? ' on' : ''), href: value ? `#/catalogo/${encodeURIComponent(value)}` : '#/catalogo' },
    value ? (CATEGORY_ICONS[value] ?? '') : '✨', ' ', label, n != null && h('small', {}, n));
  return h('div', { class: 'wrap block' },
    h('h1', { class: 'page-title' }, category || 'Catálogo'),
    h('div', { class: 'tabs', role: 'tablist' }, chip('Todo', '', PRODUCTS.length), cats.map((c) => chip(c.name, c.name, c.count))),
    h('div', { class: 'filters' },
      h('input', { type: 'search', placeholder: 'Buscar productos…', 'aria-label': 'Buscar productos', oninput: (e) => { state.query = e.target.value; paint(); } }),
      h('select', { 'aria-label': 'Ordenar', onchange: (e) => { state.sort = e.target.value; paint(); } },
        h('option', { value: 'relevancia' }, 'Destacados'),
        h('option', { value: 'precio-asc' }, 'Precio: menor a mayor'),
        h('option', { value: 'precio-desc' }, 'Precio: mayor a menor'),
        h('option', { value: 'nombre' }, 'Nombre A–Z'))),
    count, list);
}

function productView(id) {
  const p = BY_ID.get(id);
  if (!p) return notFound();
  const groups = optionGroups(p);
  const note = p.personalizacion
    ? h('label', { class: 'field' }, 'Personalización', h('input', { name: 'nota', placeholder: `Escribe aquí: ${p.personalizacion}`, maxlength: 120 }))
    : h('label', { class: 'field' }, 'Comentarios (opcional)', h('input', { name: 'nota', placeholder: 'Colores, tamaño, fecha de entrega…', maxlength: 120 }));
  const qty = stepper(1, null, 'qty');
  const form = h('form', { class: 'buy', onsubmit: (e) => {
    e.preventDefault();
    const selections = Object.fromEntries(groups.map((g) => [g.key, form.elements[g.key].value]));
    cart = addToCart(cart, { id: p.id, qty: Number(form.elements.qty.value), selections, nota: form.elements.nota?.value ?? '' });
    saveCart(); updateBadge(); toast('Agregado al carrito ✓');
  } }, groups.map(pills), note,
    h('div', { class: 'buybar' }, qty,
      h('button', { class: 'btn primary grow-btn', type: 'submit' }, p.precio == null ? 'Agregar para cotizar' : 'Agregar al carrito')));

  const dims = p.medidas ? Object.entries(p.medidas).filter(([k]) => k !== 'nota').map(([k, v]) => `${k.replace(/_cm$/, '').replace(/_/g, ' ')}: ${v} cm`) : [];
  const personalizador = p.id === 'llavero-charms';
  const list = (title, items) => items?.length > 0 && h('div', { class: 'blk' }, h('h4', {}, title), h('ul', { class: 'ticks' }, items.map((x) => h('li', {}, x))));
  return h('div', { class: 'wrap block product' },
    h('nav', { class: 'crumbs', 'aria-label': 'Ruta' }, h('a', { href: '#/catalogo' }, 'Catálogo'), ' › ', h('a', { href: `#/catalogo/${encodeURIComponent(p.categoria)}` }, p.categoria)),
    h('div', { class: 'cols' },
      thumb(p, 'big'),
      h('div', { class: 'info' },
        h('h1', {}, p.nombre),
        h('div', { class: 'meta big' }, price(p), p.impresion3d && h('span', { class: 'chip' }, 'Impresión 3D'), p.personalizacion && h('span', { class: 'chip' }, 'Personalizable')),
        p.descripcion && h('p', { class: 'desc' }, p.descripcion),
        personalizador && h('p', { class: 'callout' }, `Este llavero se arma a tu gusto. Precio desde ${formatCOP(DEFAULT_KEYCHAIN_RULES.base)}. `, h('a', { href: '#/personalizador' }, 'Conoce cómo armarlo')),
        form,
        h('a', { class: 'btn ghost wide', href: waLink(quoteMessage(p)), target: '_blank', rel: 'noopener' }, '💬 Preguntar por WhatsApp'),
        h('p', { class: 'fine' }, `Se fabrica bajo pedido · entrega en ${NEGOCIO.plazoEntregaDias.min} a ${NEGOCIO.plazoEntregaDias.max} días · envío a cargo del cliente`),
        list('Incluye', p.incluye), list('Características', p.caracteristicas),
        (dims.length > 0 || optionNotes(p).length > 0 || p.notas?.length > 0) && h('div', { class: 'blk' }, h('h4', {}, 'Detalles'),
          dims.length > 0 && h('p', { class: 'small' }, 'Medidas — ', dims.join(' · ')),
          optionNotes(p).map((n) => h('p', { class: 'small' }, n)), p.notas?.map((n) => h('p', { class: 'small' }, n))))));
}

function cartView() {
  const t = cartTotals(cart, BY_ID);
  if (!t.lines.length) return h('div', { class: 'wrap block' }, h('h1', {}, 'Tu carrito'), h('p', { class: 'empty' }, 'Todavía no has agregado productos.'), h('a', { class: 'btn primary', href: '#/catalogo' }, 'Ver catálogo'));
  const cliente = { nombre: '', ciudad: '', notas: '' };
  const env = NEGOCIO.envio.rangoEstimado;
  const send = h('a', { class: 'btn primary big', target: '_blank', rel: 'noopener' }, 'Enviar pedido por WhatsApp');
  const refreshLink = () => { send.href = waLink(orderMessage(t, cliente, NEGOCIO)); };
  refreshLink();
  const field = (key, label, ph) => h('label', { class: 'field' }, label, h('input', { placeholder: ph, oninput: (e) => { cliente[key] = e.target.value; refreshLink(); } }));
  return h('div', { class: 'wrap block' },
    h('h1', {}, 'Tu carrito'),
    h('ul', { class: 'lines' }, t.lines.map((l) => h('li', { class: 'line' },
      h('a', { href: `#/producto/${l.id}` }, thumb(l.product, 'mini')),
      h('div', { class: 'grow' },
        h('strong', {}, l.product.nombre),
        h('div', { class: 'small' }, [...Object.values(l.selections), l.nota && `«${l.nota}»`].filter(Boolean).join(' · ') || ' '),
        h('div', { class: 'small' }, l.unit == null ? 'Precio a cotizar' : `${formatCOP(l.unit)} c/u`)),
      stepper(l.qty, (n) => { cart = setQty(cart, l.key, n); saveCart(); updateBadge(); render(); }),
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
  const cur = location.hash.replace(/^#\/?/, '').split('/')[0];
  const link = (href, text, key) => h('a', { href, class: key && key === cur ? 'on' : '' }, text);
  app.replaceChildren(
    h('div', { class: 'announce' }, `🚚 Envíos a toda Colombia · Hecho bajo pedido: entrega en ${NEGOCIO.plazoEntregaDias.min} a ${NEGOCIO.plazoEntregaDias.max} días`),
    h('header', { class: 'top' }, h('div', { class: 'wrap bar' },
      h('a', { class: 'brand', href: '#/', 'aria-label': 'Milav, inicio' }, h('img', { src: LOGO, alt: 'Milav' })),
      h('nav', {}, link('#/catalogo', 'Catálogo', 'catalogo'), link('#/personalizador', 'Arma tu llavero', 'personalizador'), link('./cotizador/', 'Cotizador'), link('#/info', 'Envíos', 'info')),
      h('a', { class: 'cart', href: '#/carrito', 'aria-label': 'Carrito' }, '🛒', badge))),
    h('main', {}, view),
    h('footer', {}, h('div', { class: 'wrap foot' },
      h('div', {}, h('img', { class: 'flogo', src: LOGO, alt: 'Milav' }), h('p', { class: 'small' }, NEGOCIO.lema)),
      h('div', {}, h('h5', {}, 'Tienda'), h('a', { href: '#/catalogo' }, 'Catálogo'), h('a', { href: '#/personalizador' }, 'Arma tu llavero'), h('a', { href: './cotizador/' }, 'Cotizador por foto'), h('a', { href: '#/info' }, 'Compras y envíos')),
      h('div', {}, h('h5', {}, 'Contacto'),
        NEGOCIO.whatsapp.map((n) => h('a', { href: whatsappUrl(n, 'Hola Milav'), target: '_blank', rel: 'noopener' }, `💬 ${n}`)),
        h('a', { href: `https://instagram.com/${NEGOCIO.instagram.replace('@', '')}`, target: '_blank', rel: 'noopener' }, `📷 ${NEGOCIO.instagram}`)))));
  updateBadge();
}

const show = () => { render(); document.querySelector('.tab.on')?.scrollIntoView({ inline: 'center', block: 'nearest' }); };
window.addEventListener('hashchange', () => { show(); window.scrollTo(0, 0); });
show();
