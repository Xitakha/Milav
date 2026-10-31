import './style.css';
import { dbGet, dbSet } from './db.js';
import { DEFAULT_SETTINGS, computePrice, formatMoney } from './pricing.js';
import { newId, serialize, parse } from './catalog.js';
import { rank, decide } from './match.js';
import { embed, loadModel } from './embedder.js';
import { fileToCanvas, detect, cropSquare, wholeSquare, thumb, rotateCanvas } from './image.js';

const photos = (i) => i.samples.filter((s) => s.thumb).length;
const state = { icons: [], settings: { ...DEFAULT_SETTINGS }, view: 'quote', status: '', quote: null };
const app = document.getElementById('app');

/* ---------- utilidades ---------- */
function h(tag, props = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'class') el.className = v;
    else if (v !== false && v != null) (k in el ? (el[k] = v) : el.setAttribute(k, v));
  }
  for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid.nodeType ? kid : document.createTextNode(kid));
  return el;
}
const money = (n) => formatMoney(n, state.settings.currency);
async function persist() {
  await dbSet('icons', state.icons);
  await dbSet('settings', state.settings);
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
    q.items.push({ box, crop, ranked, choice: d.icon?.id ?? '', confident: d.confident });
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
  const q = { preview: null, items: [], busy: true, sizeFrac: 0.11 };
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
  const q = state.quote;
  const items = q?.items ?? [];
  const priced = items.map((it) => state.icons.find((i) => i.id === it.choice)).filter(Boolean);
  const calc = computePrice(priced.map((i) => i.price), state.settings);

  const picker = (it) => {
    const top = it.ranked.slice(0, 3);
    const rest = state.icons.filter((i) => !top.some((t) => t.icon.id === i.id));
    return h('select', { onchange: (e) => { it.choice = e.target.value; it.confident = true; render(); } },
      h('option', { value: '' }, '— ignorar / no es un icono —'),
      h('optgroup', { label: 'Más parecidos' }, top.map((t) =>
        h('option', { value: t.icon.id, selected: t.icon.id === it.choice }, `${t.icon.name} (${Math.round(t.score * 100)}%)`))),
      h('optgroup', { label: 'Todos los iconos' }, rest.map((i) =>
        h('option', { value: i.id, selected: i.id === it.choice }, i.name))));
  };

  return h('section', {},
    h('label', { class: 'btn primary big' }, '📷 Tomar o subir foto',
      h('input', { type: 'file', accept: 'image/*', hidden: true, onchange: (e) => { onPhoto(e.target.files[0]); e.target.value = ''; } })),
    h('p', { class: 'hint' }, 'Coloca los iconos sobre un fondo liso, con buena luz y sin que se toquen.'),
    q?.preview && h('div', { class: 'preview' }, q.preview),
    q?.preview && h('label', {}, 'Tamaño del recorte al tocar un icono',
      h('input', { type: 'range', min: 0.04, max: 0.3, step: 0.01, value: q.sizeFrac, oninput: (e) => { q.sizeFrac = Number(e.target.value); } })),
    q?.notice && h('p', { class: 'warn' }, q.notice),
    items.length > 0 && h('ul', { class: 'list' }, items.map((it, n) => {
      const icon = state.icons.find((i) => i.id === it.choice);
      return h('li', { class: 'row' + (it.confident ? '' : ' review') },
        h('div', { class: 'crop' }, it.crop),
        h('div', { class: 'grow' },
          h('div', { class: 'small' }, `#${n + 1}`, !it.confident && h('span', { class: 'badge' }, 'Revisar')),
          picker(it)),
        h('strong', {}, icon ? money(icon.price) : '—'),
        h('button', { class: 'x', title: 'Quitar', onclick: () => { q.items.splice(n, 1); drawPreview(q); render(); } }, '✕'));
    })),
    q && h('div', { class: 'add' },
      h('select', { id: 'manual' },
        h('option', { value: '' }, '+ Agregar icono a mano…'),
        state.icons.map((i) => h('option', { value: i.id }, `${i.name} (${money(i.price)})`))),
      h('button', { class: 'btn', onclick: () => {
        const id = document.getElementById('manual').value;
        if (!id) return;
        q.items.push({ crop: document.createElement('canvas'), ranked: [], choice: id, confident: true });
        render();
      } }, 'Agregar')),
    q && h('div', { class: 'total' },
      h('div', {}, `${calc.count} icono(s): ${money(calc.subtotal)}`),
      calc.discountPct > 0 && h('div', {}, `Descuento ${calc.discountPct}%: −${money(calc.discount)}`),
      calc.base > 0 && h('div', {}, `Argolla / base: ${money(calc.base)}`),
      h('div', { class: 'grand' }, `Total: ${money(calc.total)}`),
      h('button', { class: 'btn', onclick: () => {
        const lines = priced.map((i) => `• ${i.name}: ${money(i.price)}`);
        const text = `Cotización llavero Milav\n${lines.join('\n')}\nTotal: ${money(calc.total)}`;
        navigator.clipboard?.writeText(text).then(() => alert('Resumen copiado'), () => prompt('Copia el resumen:', text));
      } }, 'Copiar resumen')));
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

function catalogView() {
  const form = h('form', { class: 'card', onsubmit: async (e) => {
    e.preventDefault();
    const f = e.target;
    const files = [...f.fotos.files];
    if (!files.length) return alert('Agrega al menos una foto (idealmente 3 a 5).');
    try {
      const samples = await samplesFromFiles(files, f.auto.checked);
      if (warnIfSimilar(samples)) return setStatus('');
      state.icons.push({ id: newId(), name: f.nombre.value.trim(), price: Number(f.precio.value), samples });
      await persist();
      f.reset();
    } catch (err) { console.error(err); alert('Error: ' + err.message); }
    setStatus(''); render();
  } },
    h('h3', {}, 'Nuevo icono'),
    h('input', { name: 'nombre', placeholder: 'Nombre (ej. Gato)', required: true }),
    h('input', { name: 'precio', type: 'number', min: 0, step: 'any', placeholder: 'Precio', required: true, inputmode: 'decimal' }),
    h('input', { name: 'fotos', type: 'file', accept: 'image/*', multiple: true }),
    h('label', { class: 'check' }, h('input', { name: 'auto', type: 'checkbox', checked: true }), ' Recortar el icono automáticamente (fondo liso)'),
    h('p', { class: 'hint' }, 'Sube 3 a 5 fotos del icono suelto, con distintos ángulos y luz. Se reconoce en cualquier orientación. Para las letras: crea un solo icono «Letra» y sube fotos de varias letras distintas y de distintos colores.'),
    h('button', { class: 'btn primary' }, 'Guardar icono'));

  const cards = state.icons.map((i) => h('div', { class: 'card icon' },
    h('div', { class: 'thumbs' }, i.samples.filter((s) => s.thumb).slice(0, 3).map((s) => h('img', { src: s.thumb, alt: i.name }))),
    h('input', { value: i.name, onchange: (e) => { i.name = e.target.value; persist(); } }),
    h('input', { type: 'number', min: 0, step: 'any', value: i.price, inputmode: 'decimal', onchange: (e) => { i.price = Number(e.target.value); persist(); } }),
    h('div', { class: 'small' }, `${photos(i)} foto(s)`, photos(i) < 3 && h('span', { class: 'badge' }, 'Faltan fotos')),
    h('label', { class: 'btn' }, '+ fotos', h('input', { type: 'file', accept: 'image/*', multiple: true, hidden: true, onchange: async (e) => {
      const files = [...e.target.files]; e.target.value = '';
      if (!files.length) return;
      try { i.samples.push(...(await samplesFromFiles(files, true))); await persist(); } catch (err) { alert('Error: ' + err.message); }
      setStatus(''); render();
    } })),
    h('button', { class: 'btn danger', onclick: async () => {
      if (!confirm(`¿Eliminar "${i.name}"?`)) return;
      state.icons = state.icons.filter((x) => x !== i); await persist(); render();
    } }, 'Eliminar')));

  return h('section', {}, form, h('h3', {}, `Iconos registrados (${state.icons.length})`), h('div', { class: 'grid' }, cards),
    !cards.length && h('p', { class: 'hint' }, 'Aún no hay iconos.'));
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
      num('basePrice', 'Precio de la argolla / base del llavero'),
      num('roundTo', 'Redondear hacia arriba a múltiplos de (0 = no)'),
      h('label', {}, 'Descuentos por cantidad (uno por línea: "cantidad:porcentaje", ej. 3:10)',
        h('textarea', { rows: 3, value: s.discounts.map((d) => `${d.min}:${d.pct}`).join('\n'), onchange: (e) => {
          s.discounts = e.target.value.split('\n').map((l) => l.trim().split(':').map(Number)).filter(([a, b]) => a > 0 && b >= 0).map(([min, pct]) => ({ min, pct }));
          persist();
        } }))),
    h('div', { class: 'card' },
      h('h3', {}, 'Reconocimiento'),
      h('label', {}, `Exigencia de coincidencia: ${Math.round(s.threshold * 100)}% (más alto = pide confirmar más veces)`,
        h('input', { type: 'range', min: 0.7, max: 0.98, step: 0.01, value: s.threshold, oninput: (e) => { s.threshold = Number(e.target.value); e.target.parentNode.firstChild.textContent = `Exigencia de coincidencia: ${Math.round(s.threshold * 100)}% (más alto = pide confirmar más veces)`; }, onchange: persist }))),
    h('div', { class: 'card' },
      h('h3', {}, 'Respaldo del catálogo'),
      h('p', { class: 'hint' }, 'Los datos viven en este navegador. Exporta el catálogo para respaldarlo o llevarlo a otro dispositivo (también puedes guardarlo en el repo de GitHub).'),
      h('button', { class: 'btn', onclick: () => download('catalogo-milav.json', serialize(state.icons, state.settings)) }, 'Exportar catálogo'),
      h('label', { class: 'btn' }, 'Importar catálogo', h('input', { type: 'file', accept: 'application/json,.json', hidden: true, onchange: async (e) => {
        const f = e.target.files[0]; e.target.value = '';
        if (!f) return;
        try {
          const data = parse(await f.text());
          if (!confirm(`Se reemplazará el catálogo actual por ${data.icons.length} icono(s). ¿Continuar?`)) return;
          state.icons = data.icons; state.settings = data.settings; await persist(); render();
        } catch (err) { alert(err.message); }
      } }))));
}

/* ---------- raíz ---------- */
const TABS = [['quote', 'Cotizar'], ['catalog', 'Catálogo'], ['settings', 'Ajustes']];
function render() {
  const view = { quote: quoteView, catalog: catalogView, settings: settingsView }[state.view]();
  app.replaceChildren(
    h('header', {}, h('h1', {}, 'Milav · Cotizador')),
    h('nav', {}, TABS.map(([id, label]) => h('button', { class: state.view === id ? 'on' : '', onclick: () => { state.view = id; render(); } }, label))),
    h('div', { id: 'status', class: 'status' }, state.status),
    h('main', {}, view));
}

(async () => {
  state.icons = (await dbGet('icons')) ?? [];
  state.settings = { ...DEFAULT_SETTINGS, ...((await dbGet('settings')) ?? {}) };
  render();
})();
