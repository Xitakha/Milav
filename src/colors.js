// Paleta de colores sólidos disponibles para los llaveros personalizados.

export const DEFAULT_COLORS = [
  { id: 'rojo', name: 'Rojo', hex: '#d62828', available: true },
  { id: 'amarillo', name: 'Amarillo', hex: '#f4c20d', available: true },
  { id: 'azul', name: 'Azul', hex: '#1d4ed8', available: true },
];

/** Devuelve el color en formato #rrggbb en minúsculas, o null si no es válido (acepta #rgb). */
export function normalizeHex(value) {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(value ?? '').trim());
  if (!m) return null;
  let h = m[1].toLowerCase();
  if (h.length === 3) h = [...h].map((c) => c + c).join('');
  return '#' + h;
}

export function colorId(name) {
  return String(name)
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/**
 * Valida un color nuevo o editado frente a la lista actual (`ignoreId` = el que se edita).
 * Devuelve { ok:true, color } o { ok:false, error }.
 */
export function validateColor(colors, { name, hex }, ignoreId = null) {
  const n = String(name ?? '').trim();
  if (!n) return { ok: false, error: 'Escribe un nombre para el color.' };
  const h = normalizeHex(hex);
  if (!h) return { ok: false, error: 'El código del color no es válido (ejemplo: #d62828).' };
  const id = colorId(n);
  if (!id) return { ok: false, error: 'El nombre debe tener letras o números.' };
  const others = colors.filter((c) => c.id !== ignoreId);
  if (others.some((c) => c.id === id)) return { ok: false, error: `Ya existe un color llamado «${n}».` };
  if (others.some((c) => c.hex === h)) {
    const twin = others.find((c) => c.hex === h);
    return { ok: false, error: `Ese tono ya está registrado como «${twin.name}».` };
  }
  return { ok: true, color: { id, name: n, hex: h } };
}

export function addColor(colors, input) {
  const r = validateColor(colors, input);
  if (!r.ok) return r;
  return { ok: true, colors: [...colors, { ...r.color, available: true }], color: r.color };
}
