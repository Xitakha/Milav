// Embeddings de imagen en el navegador con CLIP (transformers.js). El modelo se descarga
// la primera vez (~90 MB) y queda en caché del navegador.
import { normalize } from './match.js';

let extractor = null;

export async function loadModel(onStatus = () => {}) {
  if (extractor) return extractor;
  onStatus('Cargando modelo de reconocimiento (solo la primera vez)…');
  const { pipeline, env } = await import('@xenova/transformers');
  env.allowLocalModels = false;
  extractor = await pipeline('image-feature-extraction', 'Xenova/clip-vit-base-patch32', {
    progress_callback: (p) => {
      if (p.status === 'progress') onStatus(`Descargando modelo… ${Math.round(p.progress)}%`);
    },
  });
  onStatus('');
  return extractor;
}

export async function embed(canvas, onStatus) {
  const ex = await loadModel(onStatus);
  const out = await ex(canvas.toDataURL('image/jpeg', 0.92));
  return normalize(out.data);
}
