export const DEFAULT_SETTINGS = {
  currency: '$',
  basePrice: 0, // argolla / base del llavero
  roundTo: 0, // redondear hacia arriba a múltiplos de este valor (0 = sin redondeo)
  threshold: 0.85, // similitud mínima para aceptar un icono automáticamente
  discounts: [], // [{ min: 3, pct: 5 }]
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
