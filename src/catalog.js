import { DEFAULT_SETTINGS } from './pricing.js';

export const FORMAT_VERSION = 2;

// Categorías sugeridas; el usuario puede escribir otras libremente.
export const DEFAULT_CATEGORIES = ['Icono', 'Letra', 'Cuenta', 'Mosquetón', 'Insignia', 'Cordón', 'Otro'];

/** Piezas de un llavero que ya vienen creadas (sin precio ni fotos) la primera vez que se abre la app. */
export function starterItems() {
  return ['Letra', 'Cuenta', 'Mosquetón', 'Insignia', 'Cordón'].map((name) => ({
    id: newId(), name, category: name, price: 0, autoAdd: false, samples: [],
  }));
}

/** Completa los campos nuevos en iconos guardados con versiones anteriores. */
export function withDefaults(i) {
  return { ...i, category: (i.category || 'Icono').trim() || 'Icono', autoAdd: !!i.autoAdd, samples: i.samples || [] };
}

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
        category: i.category,
        autoAdd: i.autoAdd,
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
    return withDefaults({
      id: i.id || newId(),
      name: i.name,
      price: i.price,
      category: i.category,
      autoAdd: i.autoAdd,
      samples: (i.samples || []).map((s) => ({ thumb: s.thumb, embedding: s.embedding })),
    });
  });
  return { icons, settings: { ...DEFAULT_SETTINGS, ...(obj.settings || {}) } };
}
