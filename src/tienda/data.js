// Única fuente de datos de la tienda: los mismos JSON del repo (carpeta /data).
// Para cambiar un precio: editar data/productos.json en GitHub; al guardar se vuelve a publicar solo.
import productos from '../../data/productos.json';
import negocio from '../../data/negocio.json';
import logoUrl from '../assets/logo.png';

export const PRODUCTS = productos.productos;
export const BY_ID = new Map(PRODUCTS.map((p) => [p.id, p]));
export const NEGOCIO = negocio;
export const LOGO = logoUrl;

// Fotos reales: basta con guardar src/assets/productos/<id-del-producto>.webp (o .jpg/.png)
const photos = import.meta.glob('../assets/productos/*.{webp,jpg,jpeg,png}', { eager: true, query: '?url', import: 'default' });
const PHOTO = new Map(Object.entries(photos).map(([path, url]) => [path.split('/').pop().replace(/\.[^.]+$/, ''), url]));
export const photoOf = (id) => PHOTO.get(id) ?? null;
