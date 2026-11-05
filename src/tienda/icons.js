// Íconos propios: una sola familia de trazo (1.75, extremos redondeados) sobre rejilla de 24.
const P = {
  cart: '<circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2.5 3.5h2.6l2.2 10.5h10.6l2-7.5H6.2"/>',
  truck: '<path d="M2.5 6.5h10.5v10H2.5zM13 9.5h4.2l3.3 3.2v3.8H13"/><circle cx="6.8" cy="17.8" r="1.8"/><circle cx="16.8" cy="17.8" r="1.8"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5.2l3.2 2"/>',
  palette: '<path d="M12 3a9 9 0 1 0 0 18c1.3 0 1.9-.9 1.9-1.8 0-1.4-1.2-1.6-1.2-2.8 0-1 .8-1.7 1.8-1.7H17a4 4 0 0 0 4-4C21 6.5 17 3 12 3z"/><circle cx="7.6" cy="11" r="1"/><circle cx="10.2" cy="7.2" r="1"/><circle cx="14.8" cy="7.2" r="1"/>',
  cube: '<path d="M12 2.8l8.2 4.6v9.2L12 21.2l-8.2-4.6V7.4z"/><path d="M12 12l8.2-4.6M12 12L3.8 7.4M12 12v9.2"/>',
  key: '<circle cx="7.8" cy="15.2" r="3.8"/><path d="M10.5 12.5L20 3M16.2 6.8l3 3"/>',
  sparkle: '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M18.5 16.5v4M16.5 18.5h4"/>',
  paw: '<circle cx="6.3" cy="10.3" r="1.7"/><circle cx="9.8" cy="6.3" r="1.7"/><circle cx="14.2" cy="6.3" r="1.7"/><circle cx="17.7" cy="10.3" r="1.7"/><path d="M12 12.5c-3 0-5 2.3-5 4.4 0 1.7 1.6 2.6 5 2.6s5-.9 5-2.6c0-2.1-2-4.4-5-4.4z"/>',
  pen: '<path d="M4 20l1-4.2L16.3 4.5a2.1 2.1 0 0 1 3 3L8.2 19z"/><path d="M14.3 6.5l3.2 3.2"/>',
  home: '<path d="M3.5 11.2L12 4l8.5 7.2M6 9.6V20h12V9.6"/><path d="M10 20v-5h4v5"/>',
  plant: '<path d="M12 21v-8.5"/><path d="M12 12.5c-4 0-6.2-2.4-6.2-6 4 0 6.2 2.1 6.2 6zM12 15c0-3.2 2.2-5.2 6.2-5.2 0 3.2-2.2 5.2-6.2 5.2z"/><path d="M8 21h8"/>',
  tree: '<path d="M12 3l4.8 5.8h-3l3.8 4.8h-3.4l3.2 4.2H6.6l3.2-4.2H6.4l3.8-4.8h-3z"/><path d="M12 17.8V21"/>',
  book: '<path d="M4 5.8C4 4.8 4.8 4 5.8 4H12v16H5.8c-1 0-1.8-.8-1.8-1.8z"/><path d="M20 5.8c0-1-.8-1.8-1.8-1.8H12v16h6.2c1 0 1.8-.8 1.8-1.8z"/>',
  chat: '<path d="M4 20l1.4-4.2A8 8 0 1 1 8.3 18.7z"/><path d="M9 10.2c.3 2.2 2.6 4.4 4.9 4.7l1.3-1.3-1.9-1-.9.7c-.8-.4-1.5-1.1-1.8-1.8l.7-.9-1-1.9z"/>',
  camera: '<path d="M3.5 8.2h3.6l1.5-2.5h6.8l1.5 2.5h3.6v11.3h-17z"/><circle cx="12" cy="13.6" r="3.4"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  check: '<path d="M5 12.6l4.6 4.5L19 7.6"/>',
  gift: '<path d="M4 11h16v9H4zM3 7.5h18V11H3zM12 7.5V20"/><path d="M12 7.5C10 7.5 8 6.8 8 5.3 8 4 9 3.4 10 3.6c1.4.3 2 2.2 2 3.9zM12 7.5c2 0 4-.7 4-2.2 0-1.3-1-1.9-2-1.7-1.4.3-2 2.2-2 3.9z"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
};
export const CATEGORY_ICON = {
  Llaveros: 'key', Accesorios: 'sparkle', Mascotas: 'paw', Oficina: 'pen', Hogar: 'home', Decoración: 'plant',
  Infantil: 'palette', Juguetes: 'cube', Navidad: 'tree', Papelería: 'book',
};

/** Devuelve un <span> con el SVG del ícono; decorativo (aria-hidden). */
export function icon(name, cls = '') {
  const el = document.createElement('span');
  el.className = `i ${cls}`.trim();
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = `<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${P[name] ?? P.sparkle}</svg>`;
  return el;
}
