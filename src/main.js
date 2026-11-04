import './style.css';
import { dbGet, dbSet } from './db.js';
import { DEFAULT_SETTINGS, computePrice, formatMoney, groupLines, expandPrices } from './pricing.js';
import { newId, serialize, parse, withDefaults, starterItems, DEFAULT_CATEGORIES } from './catalog.js';
import { DEFAULT_COLORS, addColor, validateColor, normalizeHex } from './colors.js';
import { DEFAULT_KEYCHAIN_RULES, DEFAULT_SHIPPING } from './keychain.js';
import { rank, decide } from './match.js';
import { embed, loadModel } from './embedder.js';
import { fileToCanvas, detect, cropSquare, wholeSquare, thumb, rotateCanvas } from './image.js';

const photos = (i) => i.samples.filter((s) => s.thumb).length;
const state = { icons: [], colors: DEFAULT_COLORS.map((c) => ({ ...c })), settings: { ...DEFAULT_SETTINGS }, view: 'quote', status: '', quote: null };
const app = document.getElementById('app');

/* ---------- utilidades ---------- */
function h(tag, props = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'class') el.className = v;
    else if (v !== false && v != null) (k in el && k !== 'list' ? (el[k] = v) : el.setAttribute(k, v));
  }
  for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid.nodeType ? kid : document.createTextNode(kid));
  return el;
}
const money = (n) => formatMoney(n, state.settings.currency);
async function persist() {
  await dbSet('icons', state.icons);
  await dbSet('settings', state.settings);
  await dbSet('colors', state.colors);
}
function setStatus(msg) {
  state.status = msg;
  const el = document.getElementById('status');
  if (el) el.textContent = msg;
}
function download(name, text) {
  const a = h('a', { href: URL.createObjectURL(new Blob([text], { type: 'application/json' })), download: name });
  a.click();
  URL.revokeObjectURL(a.href);
}

/* ---------- vista: cotizar ---------- */
/** Cotización vacía, con las piezas marcadas como «se agrega automáticamente» (cordón, mosquetón…). */
function newQuote() {
  const items = state.icons.filter((i) => i.autoAdd).map((icon) => ({ ranked: [], choice: icon.id, confident: true, qty: 1, auto: true }));
  return { preview: null, items, busy: false, sizeFrac: 0.11 };
}

function drawPreview(q) {
  const c = q.preview, x = c.getContext('2d');
  x.drawImage(q.canvas, 0, 0);
  x.lineWidth = Math.max(3, c.width / 200); x.strokeStyle = '#22c55e';
  x.fillStyle = '#22c55e'; x.font = `bold ${Math.max(16, c.width / 30)}px sans-serif`;
  q.items.forEach((it, n) => {
    if (!it.box) return;
    x.strokeRect(it.box.x, it.box.y, it.box.w, it.box.h);
    x.fillText(String(n + 1), it.box.x + 4, it.box.y + x.lineWidth + 16);
  });
}

/** Recorta la caja, la reconoce y la agrega a la cotización. */
async function addBox(q, box) {
  q.busy = true;
  try {
    setStatus('Reconociendo icono…');
    const crop = cropSquare(q.canvas, box, q.background);
    const ranked = rank(state.icons, await embed(crop, setStatus));
    const d = decide(ranked, { threshold: state.settings.threshold });
    q.items.push({ box, crop, ranked, choice: d.icon?.id ?? '', confident: d.confident, qty: 1 });
  } catch (e) {
    console.error(e);
    alert('No se pudo reconocer: ' + e.message);
  }
  q.busy = false;
  setStatus('');
  drawPreview(q);
  render();
}

async function onPhoto(file) {
  if (!file) return;
  if (!state.icons.some((i) => i.samples.length)) {
    alert('Primero registra iconos en la pestaña Catálogo.');
    return;
  }
  const q = newQuote();
  q.busy = true;
  state.quote = q;
  render();
  try {
    setStatus('Procesando foto…');
    await loadModel(setStatus);
    q.canvas = await fileToCanvas(file);
    const { boxes, background } = detect(q.canvas);
    q.background = boxes.length ? background : [255, 255, 255];
    const big = Math.max(q.canvas.width, q.canvas.height);
    if (boxes.length) q.sizeFrac = Math.min(0.3, Math.max(0.05, boxes.map((b) => Math.max(b.w, b.h)).sort((a, b) => a - b)[boxes.length >> 1] / big));
    q.preview = document.createElement('canvas');
    q.preview.width = q.canvas.width; q.preview.height = q.canvas.height;
    q.preview.addEventListener('click', (e) => {
      if (q.busy) return;
      const r = q.preview.getBoundingClientRect();
      const S = q.sizeFrac * big;
      const cx = ((e.clientX - r.left) * q.preview.width) / r.width, cy = ((e.clientY - r.top) * q.preview.height) / r.height;
      addBox(q, { x: cx - S / 2, y: cy - S / 2, w: S, h: S });
    });
    drawPreview(q);
    q.notice = boxes.length
      ? 'Si falta algún icono o hay uno de más, tócalo en la foto o quítalo de la lista.'
      : 'No pude separar los iconos automáticamente. Toca cada icono en la foto para agregarlo.';
    for (let n = 0; n < boxes.length; n++) {
      setStatus(`Reconociendo icono ${n + 1} de ${boxes.length}…`);
      await addBox(q, boxes[n]);
    }
  } catch (e) {
    console.error(e);
    alert('No se pudo procesar la foto: ' + e.message);
  }
  q.busy = false;
  setStatus('');
  render();
}

function quoteView() {
  if (!state.quote) state.quote = newQuote();
  const q = state.quote;
  const lines = q.items.map((it) => ({ icon: state.icons.find((i) => i.id === it.choice), qty: it.qty || 1 }));
  const groups = groupLines(lines);
  const calc = computePrice(expandPrices(lines), state.settings);
  const total = calc.total;

  const picker = (it) => {
    const top = it.ranked.slice(0, 3);
    const rest = state.icons.filter((i) => !top.some((t) => t.icon.id === i.id));
    const opt = (i, extra = '') => h('option', { value: i.id, selected: i.id === it.choice }, `${i.name}${extra}`);
    return h('select', { onchange: (e) => { it.choice = e.target.value; it.confident = true; render(); } },
      h('option', { value: '' }, '— ignorar / no es una pieza —'),
      top.length > 0 && h('optgroup', { label: 'Más parecidos' }, top.map((t) => opt(t.icon, ` (${Math.round(t.score * 100)}%)`))),
      h('optgroup', { label: 'Todas las piezas' }, rest.map((i) => opt(i))));
  };

  const thumbOf = (icon) => {
    const t = icon?.samples.find((x) => x.thumb)?.thumb;
    return t ? h('img', { src: t, alt: icon.name }) : h('span', { class: 'small' }, '—');
  };

  return h('section', {},
    h('label', { class: 'btn primary big' }, '📷 Tomar o subir foto',
      h('input', { type: 'file', accept: 'image/*', hidden: true, onchange: (e) => { onPhoto(e.target.files[0]); e.target.value = ''; } })),
    h('p', { class: 'hint' }, 'Pon el llavero sobre una hoja blanca, con buena luz. Si la app no separa las piezas, tócalas en la foto.'),
    q.preview && h('div', { class: 'preview' }, q.preview),
    q.preview && h('label', {}, 'Tamaño del recorte al tocar una pieza',
      h('input', { type: 'range', min: 0.04, max: 0.3, step: 0.01, value: q.sizeFrac, oninput: (e) => { q.sizeFrac = Number(e.target.value); } })),
    q.notice && h('p', { class: 'warn' }, q.notice),
    q.items.length > 0 && h('ul', { class: 'list' }, q.items.map((it, n) => {
      const icon = state.icons.find((i) => i.id === it.choice);
      return h('li', { class: 'row' + (it.confident ? '' : ' review') },
        h('div', { class: 'crop' }, it.crop ?? thumbOf(icon)),
        h('div', { class: 'grow' },
          h('div', { class: 'small' }, `#${n + 1}`, it.auto && h('span', { class: 'badge ok' }, 'Automática'), !it.confident && h('span', { class: 'badge' }, 'Revisar')),
          picker(it),
          h('div', { class: 'small' }, icon ? `${icon.category} · ${money(icon.price)} c/u` : '')),
        h('input', { class: 'qty', type: 'number', min: 1, step: 1, value: it.qty || 1, title: 'Cantidad', inputmode: 'numeric',
          onchange: (e) => { it.qty = Math.max(1, Math.floor(Number(e.target.value) || 1)); render(); } }),
        h('strong', {}, icon ? money(icon.price * (it.qty || 1)) : '—'),
        h('button', { class: 'x', title: 'Quitar', onclick: () => { q.items.splice(n, 1); drawPreview(q); render(); } }, '✕'));
    })),
    h('div', { class: 'add' },
      h('select', { id: 'manual' },
        h('option', { value: '' }, '+ Agregar pieza a mano…'),
        state.icons.map((i) => h('option', { value: i.id }, `${i.name} · ${i.category} (${money(i.price)})`))),
      h('input', { id: 'manualQty', class: 'qty', type: 'number', min: 1, step: 1, value: 1, title: 'Cantidad', inputmode: 'numeric' }),
      h('button', { class: 'btn', onclick: () => {
        const id = document.getElementById('manual').value;
        if (!id) return;
        const qty = Math.max(1, Math.floor(Number(document.getElementById('manualQty').value) || 1));
        q.items.push({ ranked: [], choice: id, confident: true, qty });
        render();
      } }, 'Agregar')),
    groups.length > 0 && h('div', { class: 'total' },
      groups.map((g) => h('div', { class: 'tl' }, h('span', {}, `${g.qty} × ${g.icon.name}`), h('span', {}, money(g.total)))),
      h('div', { class: 'tl sub' }, h('span', {}, `Subtotal (${calc.count} pieza${calc.count === 1 ? '' : 's'})`), h('span', {}, money(calc.subtotal))),
      calc.discountPct > 0 && h('div', { class: 'tl' }, h('span', {}, `Descuento ${calc.discountPct}%`), h('span', {}, `−${money(calc.discount)}`)),
      calc.base > 0 && h('div', { class: 'tl' }, h('span', {}, 'Cargo fijo del llavero'), h('span', {}, money(calc.base))),
      h('div', { class: 'grand' }, `Total: ${money(total)}`),
      h('button', { class: 'btn', onclick: () => {
        const text = `Cotización llavero Milav\n${groups.map((g) => `• ${g.qty} × ${g.icon.name}: ${money(g.total)}`).join('\n')}\nTotal: ${money(total)}`;
        navigator.clipboard?.writeText(text).then(() => alert('Resumen copiado'), () => prompt('Copia el resumen:', text));
      } }, 'Copiar resumen'),
      h('button', { class: 'btn', onclick: () => { state.quote = newQuote(); render(); } }, 'Nueva cotización')));
}

/* ---------- vista: catálogo ---------- */
async function samplesFromFiles(files, autocrop) {
  const out = [];
  let n = 0;
  for (const f of files) {
    setStatus(`Procesando foto ${++n} de ${files.length}…`);
    const canvas = await fileToCanvas(f);
    let crop;
    if (autocrop) {
      const { boxes, background } = detect(canvas);
      const big = boxes.sort((a, b) => b.area - a.area)[0];
      crop = big ? cropSquare(canvas, big, background) : wholeSquare(canvas);
    } else crop = wholeSquare(canvas);
    // los iconos pueden aparecer girados en la foto: se guarda cada foto en las 4 orientaciones
    for (let r = 0; r < 4; r++)
      out.push({ embedding: await embed(rotateCanvas(crop, r), setStatus), thumb: r === 0 ? thumb(crop) : null });
  }
  return out;
}

function warnIfSimilar(samples, ownId) {
  const others = state.icons.filter((i) => i.id !== ownId);
  for (const s of samples) {
    const best = rank(others, s.embedding)[0];
    if (best && best.score > 0.93)
      return !confirm(`Este icono se parece mucho a "${best.icon.name}" (${Math.round(best.score * 100)}%) y podrían confundirse. ¿Guardar de todos modos?`);
  }
  return false;
}

const allCategories = () => [...new Set([...DEFAULT_CATEGORIES, ...state.icons.map((i) => i.category)])];

/** Carga las piezas de ejemplo de public/starter: recorta ya hechos; las huellas se calculan aquí, en el navegador. */
async function loadStarter() {
  const base = (f) => new URL(`starter/${f}`, document.baseURI);
  const man = await (await fetch(base('manifest.json'))).json();
  const total = man.items.length;
  let n = 0;
  for (const entry of man.items) {
    n++;
    let icon = state.icons.find((i) => i.name.toLowerCase() === entry.name.toLowerCase());
    if (icon?.samples.length) continue; // ya tiene fotos: no se toca
    setStatus(`Cargando catálogo de ejemplo: ${entry.name} (${n} de ${total})…`);
    const samples = [];
    for (const [k, file] of entry.files.entries()) {
      const canvas = await fileToCanvas(await (await fetch(base(file))).blob());
      for (let r = 0; r < 4; r++)
        samples.push({ embedding: await embed(rotateCanvas(canvas, r), setStatus), thumb: r === 0 ? thumb(canvas) : null });
    }
    if (icon) icon.samples = samples;
    else state.icons.push({ id: newId(), name: entry.name, category: entry.category, price: 0, autoAdd: false, samples });
    await persist(); // se guarda pieza a pieza: si se interrumpe, no se pierde lo avanzado
  }
  state.settings.starterLoaded = true;
  await persist();
}

function catalogView() {
  const starter = !state.settings.starterLoaded && h('div', { class: 'card starter' },
    h('h3', {}, 'Catálogo de ejemplo'),
    h('p', { class: 'hint' }, 'Carga 39 piezas con las fotos que ya tenemos: iconos, letras, insignia, mosquetón, cuentas y cordón. Quedan con precio 0 y nombres provisionales: renómbralas y ponles precio. La primera vez tarda uno o dos minutos (se descarga el modelo y se procesan las fotos); no cierres la página.'),
    h('button', { class: 'btn primary', onclick: async (e) => {
      e.target.disabled = true;
      try { await loadStarter(); } catch (err) { console.error(err); alert('No se pudo cargar: ' + err.message); }
      setStatus(''); render();
    } }, 'Cargar catálogo de ejemplo'));
  const cats = h('datalist', { id: 'cats' }, allCategories().map((c) => h('option', { value: c })));
  const form = h('form', { class: 'card', onsubmit: async (e) => {
    e.preventDefault();
    const f = e.target;
    const files = [...f.fotos.files];
    try {
      const samples = files.length ? await samplesFromFiles(files, f.recorte.checked) : [];
      if (samples.length && warnIfSimilar(samples)) return setStatus('');
      state.icons.push({ id: newId(), name: f.nombre.value.trim(), category: f.categoria.value.trim() || 'Icono',
        price: Number(f.precio.value), autoAdd: f.autoAdd.checked, samples });
      await persist();
      f.reset();
    } catch (err) { console.error(err); alert('Error: ' + err.message); }
    setStatus(''); render();
  } },
    h('h3', {}, 'Nueva pieza'),
    h('input', { name: 'nombre', placeholder: 'Nombre (ej. Gato, Mosquetón lila, Cuenta azul)', required: true }),
    h('input', { name: 'categoria', list: 'cats', placeholder: 'Categoría (Icono, Letra, Cuenta, Mosquetón…)', value: 'Icono' }),
    h('input', { name: 'precio', type: 'number', min: 0, step: 'any', placeholder: 'Precio', required: true, inputmode: 'decimal' }),
    h('input', { name: 'fotos', type: 'file', accept: 'image/*', multiple: true }),
    h('label', { class: 'check' }, h('input', { name: 'recorte', type: 'checkbox', checked: true }), ' Recortar la pieza automáticamente (fondo liso)'),
    h('label', { class: 'check' }, h('input', { name: 'autoAdd', type: 'checkbox' }), ' Agregar automáticamente a cada cotización (ej. cordón, mosquetón)'),
    h('p', { class: 'hint' }, 'Sube 3 a 5 fotos de la pieza suelta, con distintos ángulos y luz; se reconoce en cualquier orientación. Sin fotos solo se podrá agregar a mano. Las piezas que cambian de color (letras, cuentas, mosquetón, cordón) van como una sola pieza: sube fotos de varios colores.'),
    h('button', { class: 'btn primary' }, 'Guardar pieza'));

  const q = (state.catalogQuery || '').toLowerCase();
  const filt = state.catalogCat || '';
  const visible = state.icons.filter((i) => (!filt || i.category === filt) && (!q || i.name.toLowerCase().includes(q)));
  const byCat = new Map();
  for (const i of [...visible].sort((a, b) => a.name.localeCompare(b.name))) {
    if (!byCat.has(i.category)) byCat.set(i.category, []);
    byCat.get(i.category).push(i);
  }

  const card = (i) => h('div', { class: 'card icon' },
    h('div', { class: 'thumbs' }, photos(i) ? i.samples.filter((s) => s.thumb).slice(0, 3).map((s) => h('img', { src: s.thumb, alt: i.name })) : h('div', { class: 'nophoto' }, 'sin fotos')),
    h('input', { value: i.name, onchange: (e) => { i.name = e.target.value; persist(); } }),
    h('input', { list: 'cats', value: i.category, title: 'Categoría', onchange: (e) => { i.category = e.target.value.trim() || 'Icono'; persist().then(render); } }),
    h('input', { type: 'number', min: 0, step: 'any', value: i.price, inputmode: 'decimal', title: 'Precio', onchange: (e) => { i.price = Number(e.target.value); persist(); } }),
    h('label', { class: 'check small' }, h('input', { type: 'checkbox', checked: i.autoAdd, onchange: (e) => { i.autoAdd = e.target.checked; persist(); } }), ' Automática en cada cotización'),
    h('div', { class: 'small' }, `${photos(i)} foto(s)`, photos(i) < 3 && h('span', { class: 'badge' }, photos(i) ? 'Faltan fotos' : 'Solo a mano'), i.price === 0 && h('span', { class: 'badge' }, 'Sin precio')),
    h('label', { class: 'btn' }, '+ fotos', h('input', { type: 'file', accept: 'image/*', multiple: true, hidden: true, onchange: async (e) => {
      const files = [...e.target.files]; e.target.value = '';
      if (!files.length) return;
      try { i.samples.push(...(await samplesFromFiles(files, true))); await persist(); } catch (err) { alert('Error: ' + err.message); }
      setStatus(''); render();
    } })),
    h('button', { class: 'btn danger', onclick: async () => {
      if (!confirm(`¿Eliminar "${i.name}"?`)) return;
      state.icons = state.icons.filter((x) => x !== i); await persist(); render();
    } }, 'Eliminar'));

  return h('section', {}, cats, starter, form,
    h('h3', {}, `Catálogo (${state.icons.length} piezas)`),
    h('div', { class: 'filters' },
      h('input', { type: 'search', placeholder: 'Buscar…', value: state.catalogQuery || '', oninput: (e) => { state.catalogQuery = e.target.value; renderCatalogList(); } }),
      h('select', { onchange: (e) => { state.catalogCat = e.target.value; render(); } },
        h('option', { value: '' }, 'Todas las categorías'),
        allCategories().filter((c) => state.icons.some((i) => i.category === c)).map((c) => h('option', { value: c, selected: c === filt }, c)))),
    h('div', { id: 'catalogList' }, catalogList(byCat, card)));
}

function catalogList(byCat, card) {
  if (!byCat.size) return h('p', { class: 'hint' }, 'No hay piezas que coincidan.');
  return [...byCat].map(([cat, items]) => h('div', {},
    h('h4', { class: 'cat' }, `${cat} (${items.length})`), h('div', { class: 'grid' }, items.map(card))));
}

// al escribir en el buscador solo se repinta la lista (no el formulario ni el propio buscador)
function renderCatalogList() {
  const box = document.getElementById('catalogList');
  if (!box) return;
  const view = catalogView();
  box.replaceWith(view.querySelector('#catalogList'));
}

/* ---------- vista: colores ---------- */
function colorsView() {
  const form = h('form', { class: 'card', onsubmit: async (e) => {
    e.preventDefault();
    const f = e.target;
    const r = addColor(state.colors, { name: f.nombre.value, hex: f.hex.value });
    if (!r.ok) return alert(r.error);
    state.colors = r.colors;
    await persist();
    f.reset(); render();
  } },
    h('h3', {}, 'Nuevo color'),
    h('div', { class: 'colorrow' },
      h('input', { name: 'nombre', placeholder: 'Nombre (ej. Verde, Rosado)', required: true }),
      h('input', { name: 'picker', type: 'color', value: '#2a9d3c', title: 'Elegir color',
        oninput: (e) => { e.target.form.hex.value = e.target.value; } }),
      h('input', { name: 'hex', value: '#2a9d3c', maxlength: 7, title: 'Código del color', class: 'hex',
        oninput: (e) => { const v = normalizeHex(e.target.value); if (v) e.target.form.picker.value = v; } })),
    h('p', { class: 'hint' }, 'Solo colores sólidos. Elige el tono con el selector o escribe su código (#rrggbb). Cada color se usa luego en el cordón, las cuentas, las letras y el mosquetón del personalizador.'),
    h('button', { class: 'btn primary' }, 'Agregar color'));

  const rows = state.colors.map((c) => h('li', { class: 'row' + (c.available ? '' : ' off') },
    h('input', { type: 'color', value: c.hex, class: 'swatch', title: 'Cambiar tono', onchange: async (e) => {
      const r = validateColor(state.colors, { name: c.name, hex: e.target.value }, c.id);
      if (!r.ok) { alert(r.error); return render(); }
      c.hex = r.color.hex; await persist(); render();
    } }),
    h('div', { class: 'grow' },
      h('input', { value: c.name, onchange: async (e) => {
        const r = validateColor(state.colors, { name: e.target.value, hex: c.hex }, c.id);
        if (!r.ok) { alert(r.error); return render(); }
        c.name = r.color.name; await persist(); render(); // el id (r.color.id) se conserva: lo usan los diseños guardados
      } }),
      h('div', { class: 'small' }, c.hex)),
    h('label', { class: 'check small' }, h('input', { type: 'checkbox', checked: c.available, onchange: async (e) => { c.available = e.target.checked; await persist(); render(); } }), ' Disponible'),
    h('button', { class: 'x', title: 'Eliminar', onclick: async () => {
      if (state.colors.length <= 1) return alert('Debe quedar al menos un color.');
      if (!confirm(`¿Eliminar el color «${c.name}»?`)) return;
      state.colors = state.colors.filter((x) => x !== c); await persist(); render();
    } }, '✕')));

  return h('section', {}, form, h('h3', {}, `Colores (${state.colors.length})`), h('ul', { class: 'list' }, rows),
    h('p', { class: 'hint' }, 'Un color «no disponible» deja de ofrecerse al cliente sin borrarlo (útil si se agota el filamento).'));
}

/* ---------- vista: ajustes ---------- */
function settingsView() {
  const s = state.settings;
  const num = (key, label, step = 'any') => h('label', {}, label,
    h('input', { type: 'number', min: 0, step, value: s[key], inputmode: 'decimal', onchange: (e) => { s[key] = Number(e.target.value); persist(); } }));
  return h('section', {},
    h('div', { class: 'card' },
      h('h3', {}, 'Precios'),
      h('label', {}, 'Símbolo de moneda', h('input', { value: s.currency, onchange: (e) => { s.currency = e.target.value; persist(); } })),
      num('basePrice', 'Cargo fijo por llavero (mano de obra, empaque…), aparte de las piezas'),
      num('roundTo', 'Redondear hacia arriba a múltiplos de (0 = no)'),
      h('label', {}, 'Descuentos por cantidad total de piezas (uno por línea: "cantidad:porcentaje", ej. 8:10)',
        h('textarea', { rows: 3, value: s.discounts.map((d) => `${d.min}:${d.pct}`).join('\n'), onchange: (e) => {
          s.discounts = e.target.value.split('\n').map((l) => l.trim().split(':').map(Number)).filter(([a, b]) => a > 0 && b >= 0).map(([min, pct]) => ({ min, pct }));
          persist();
        } }))),
    h('div', { class: 'card' },
      h('h3', {}, 'Llavero personalizado (precios)'),
      h('p', { class: 'hint' }, 'La base incluye el cordón y una argolla o cadena. Los demás se cobran aparte. La insignia está en 0 hasta que definas su precio.'),
      ...[['base', 'Base (cordón + argolla o cadena)'], ['icon', 'Cada icono'], ['letter', 'Cada letra'], ['clasp', 'Mosquetón'], ['bead', 'Cada cuenta'], ['badge', 'Insignia']].map(([k, label]) =>
        h('label', {}, label, h('input', { type: 'number', min: 0, step: 'any', inputmode: 'decimal',
          value: (s.keychain ?? DEFAULT_KEYCHAIN_RULES)[k], onchange: (e) => { s.keychain = { ...DEFAULT_KEYCHAIN_RULES, ...s.keychain, [k]: Number(e.target.value) }; persist(); } })))),
    h('div', { class: 'card' },
      h('h3', {}, 'Envío (lo paga el cliente)'),
      h('p', { class: 'hint' }, 'Rango estimado según el destino; se muestra al cliente antes de pagar.'),
      ...[['min', 'Desde'], ['max', 'Hasta']].map(([k, label]) =>
        h('label', {}, label, h('input', { type: 'number', min: 0, step: 'any', inputmode: 'decimal',
          value: (s.shipping ?? DEFAULT_SHIPPING)[k], onchange: (e) => { s.shipping = { ...DEFAULT_SHIPPING, ...s.shipping, [k]: Number(e.target.value) }; persist(); } })))),
    h('div', { class: 'card' },
      h('h3', {}, 'Reconocimiento'),
      h('label', {}, `Exigencia de coincidencia: ${Math.round(s.threshold * 100)}% (más alto = pide confirmar más veces)`,
        h('input', { type: 'range', min: 0.7, max: 0.98, step: 0.01, value: s.threshold, oninput: (e) => { s.threshold = Number(e.target.value); e.target.parentNode.firstChild.textContent = `Exigencia de coincidencia: ${Math.round(s.threshold * 100)}% (más alto = pide confirmar más veces)`; }, onchange: persist }))),
    h('div', { class: 'card' },
      h('h3', {}, 'Respaldo del catálogo'),
      h('p', { class: 'hint' }, 'Los datos viven en este navegador. Exporta el catálogo para respaldarlo o llevarlo a otro dispositivo (también puedes guardarlo en el repo de GitHub).'),
      h('button', { class: 'btn', onclick: () => download('catalogo-milav.json', serialize(state.icons, state.settings, state.colors)) }, 'Exportar catálogo'),
      h('label', { class: 'btn' }, 'Importar catálogo', h('input', { type: 'file', accept: 'application/json,.json', hidden: true, onchange: async (e) => {
        const f = e.target.files[0]; e.target.value = '';
        if (!f) return;
        try {
          const data = parse(await f.text());
          if (!confirm(`Se reemplazará el catálogo actual por ${data.icons.length} icono(s). ¿Continuar?`)) return;
          state.icons = data.icons; state.settings = data.settings; state.colors = data.colors; await persist(); render();
        } catch (err) { alert(err.message); }
      } }))));
}

/* ---------- raíz ---------- */
const TABS = [['quote', 'Cotizar'], ['catalog', 'Catálogo'], ['colors', 'Colores'], ['settings', 'Ajustes']];
function render() {
  const view = { quote: quoteView, catalog: catalogView, colors: colorsView, settings: settingsView }[state.view]();
  app.replaceChildren(
    h('header', {}, h('h1', {}, 'Milav · Cotizador')),
    h('nav', {}, TABS.map(([id, label]) => h('button', { class: state.view === id ? 'on' : '', onclick: () => {
      // cotización todavía "intacta" (sin foto y solo piezas automáticas): se rearma con el catálogo actual
      const q = state.quote;
      if (id === 'quote' && q && !q.preview && q.items.every((it) => it.auto)) state.quote = newQuote();
      state.view = id; render();
    } }, label))),
    h('div', { id: 'status', class: 'status' }, state.status),
    h('main', {}, view));
}

(async () => {
  const stored = await dbGet('icons');
  state.icons = (stored ?? starterItems()).map(withDefaults);
  if (!stored) await dbSet('icons', state.icons); // primera vez: deja creadas las piezas base para que les pongas precio
  state.settings = { ...DEFAULT_SETTINGS, ...((await dbGet('settings')) ?? {}) };
  state.colors = (await dbGet('colors')) ?? state.colors;
  render();
})();
