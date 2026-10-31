export const DEFAULT_SETTINGS = {
  currency: '$',
  basePrice: 0, // cargo fijo por llavero (mano de obra, empaque…), aparte de las piezas
  roundTo: 0, // redondear hacia arriba a múltiplos de este valor (0 = sin redondeo)
  threshold: 0.85, // similitud mínima para aceptar un icono automáticamente
  discounts: [], // [{ min: 3, pct: 5 }]
  starterLoaded: false, // ya se cargó el catálogo de ejemplo
};

export function computePrice(prices, settings = DEFAULT_SETTINGS) {
  const count = prices.length;
  const subtotal = prices.reduce((a, p) => a + p, 0);
  const tier = [...(settings.discounts || [])]
    .filter((d) => count >= d.min)
    .sort((a, b) => b.min - a.min)[0];
  const discountPct = tier ? tier.pct : 0;
  const discount = (subtotal * discountPct) / 100;
  let total = subtotal - discount + (count ? settings.basePrice || 0 : 0);
  if (settings.roundTo > 0) total = Math.ceil(total / settings.roundTo) * settings.roundTo;
  return { count, subtotal, discountPct, discount, base: count ? settings.basePrice || 0 : 0, total };
}

export function formatMoney(n, currency = '$') {
  return `${currency}${Math.round(n).toLocaleString('es-CO')}`;
}

/**
 * Agrupa las líneas de la cotización por pieza. Cada línea es { icon, qty }.
 * Devuelve [{ icon, qty, total }] en el orden en que aparece cada pieza por primera vez.
 */
export function groupLines(lines) {
  const map = new Map();
  for (const { icon, qty } of lines) {
    if (!icon || !(qty > 0)) continue;
    const g = map.get(icon.id) || { icon, qty: 0, total: 0 };
    g.qty += qty;
    g.total += qty * icon.price;
    map.set(icon.id, g);
  }
  return [...map.values()];
}

/** Lista de precios por unidad, repetida según la cantidad (para el cálculo de descuentos). */
export function expandPrices(lines) {
  return lines.flatMap(({ icon, qty }) => (icon && qty > 0 ? Array(qty).fill(icon.price) : []));
}
