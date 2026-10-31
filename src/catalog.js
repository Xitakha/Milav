import { DEFAULT_SETTINGS } from './pricing.js';

export const FORMAT_VERSION = 1;

export function newId() {
  return 'ic_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

export function serialize(icons, settings) {
  return JSON.stringify(
    {
      app: 'milav-cotizador',
      version: FORMAT_VERSION,
      exportedAt: new Date().toISOString(),
      settings,
      icons: icons.map((i) => ({
        id: i.id,
        name: i.name,
        price: i.price,
        samples: i.samples.map((s) => ({
          thumb: s.thumb,
          embedding: s.embedding.map((x) => Math.round(x * 1e4) / 1e4),
        })),
      })),
    },
    null,
    1,
  );
}

export function parse(text) {
  let obj;
  try {
    obj = JSON.parse(text);
  } catch {
    throw new Error('El archivo no es un JSON válido.');
  }
  if (!obj || obj.app !== 'milav-cotizador' || !Array.isArray(obj.icons)) {
    throw new Error('El archivo no es un catálogo de Milav.');
  }
  const icons = obj.icons.map((i, n) => {
    if (typeof i.name !== 'string' || !Number.isFinite(i.price)) {
      throw new Error(`Icono #${n + 1} inválido (nombre o precio).`);
    }
    return {
      id: i.id || newId(),
      name: i.name,
      price: i.price,
      samples: (i.samples || []).map((s) => ({ thumb: s.thumb, embedding: s.embedding })),
    };
  });
  return { icons, settings: { ...DEFAULT_SETTINGS, ...(obj.settings || {}) } };
}
