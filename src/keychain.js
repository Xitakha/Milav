// Reglas de precio del llavero personalizado (COP). Todo es editable en Ajustes.
//
// Base: incluye el cordón y UNA argolla o cadena. Los extras se cobran aparte.
export const DEFAULT_KEYCHAIN_RULES = {
  base: 3000,
  icon: 500, // por icono
  letter: 500, // por letra (los espacios no cuentan)
  clasp: 1000, // mosquetón (opcional)
  bead: 0, // cuenta — PENDIENTE de definir
  badge: 0, // insignia — PENDIENTE de definir
};

export const RING_TYPES = { argolla: 'Argolla', cadena: 'Cadena' };

export function countLetters(text) {
  return [...String(text ?? '')].filter((c) => /\S/.test(c)).length;
}

/**
 * config: { ring: 'argolla'|'cadena', clasp: boolean, badge: boolean, icons: number, beads: number, text: string }
 * Devuelve { lines: [{ label, qty, unit, total }], total }.
 */
export function priceKeychain(config, rules = DEFAULT_KEYCHAIN_RULES) {
  const r = { ...DEFAULT_KEYCHAIN_RULES, ...rules };
  if (!RING_TYPES[config.ring]) throw new Error('Elige argolla o cadena.');
  const lines = [{ label: `Base (cordón + ${RING_TYPES[config.ring].toLowerCase()})`, qty: 1, unit: r.base, total: r.base }];
  const add = (label, qty, unit) => { if (qty > 0 && unit > 0) lines.push({ label, qty, unit, total: qty * unit }); };
  add('Iconos', Math.max(0, Math.floor(config.icons || 0)), r.icon);
  add('Letras', countLetters(config.text), r.letter);
  add('Cuentas', Math.max(0, Math.floor(config.beads || 0)), r.bead);
  add('Mosquetón', config.clasp ? 1 : 0, r.clasp);
  add('Insignia', config.badge ? 1 : 0, r.badge);
  return { lines, total: lines.reduce((a, l) => a + l.total, 0) };
}
