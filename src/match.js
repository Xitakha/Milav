export function cosine(a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s; // los embeddings se guardan normalizados
}

export function normalize(v) {
  let n = 0;
  for (const x of v) n += x * x;
  n = Math.sqrt(n) || 1;
  return Array.from(v, (x) => x / n);
}

/** Ordena los iconos por similitud (mejor muestra de cada icono). */
export function rank(icons, embedding) {
  return icons
    .map((icon) => ({
      icon,
      score: Math.max(-1, ...icon.samples.map((s) => cosine(s.embedding, embedding))),
    }))
    .filter((r) => r.icon.samples.length)
    .sort((a, b) => b.score - a.score);
}

/**
 * Decide si el mejor candidato es confiable: supera el umbral y se separa
 * lo suficiente del segundo. Si no, la UI pide confirmación.
 */
export function decide(ranked, { threshold = 0.85, margin = 0.02 } = {}) {
  const [best, second] = ranked;
  if (!best) return { icon: null, confident: false, ranked };
  const confident = best.score >= threshold && (!second || best.score - second.score >= margin);
  return { icon: best.icon, score: best.score, confident, ranked };
}
