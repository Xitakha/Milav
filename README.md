# Milav · Tienda y herramientas

Sitio estático (GitHub Pages) con dos partes que comparten los mismos datos:
- **Tienda** (`/`): catálogo, ficha de producto, carrito y pedido por WhatsApp. Código en `src/tienda/`.
- **Cotizador por foto** (`/cotizador/`): reconoce piezas de un llavero en una foto y suma los precios; también administra
  catálogo de piezas, colores y precios del llavero. Código en `src/` y `cotizador/`.

## Skill de diseño (Impeccable)
`.claude/skills/impeccable/` contiene la skill [Impeccable](https://github.com/pbakaus/impeccable) (Apache 2.0, v4.8.0) para
Claude Code: comandos de diseño como `/impeccable critique`, `/impeccable audit`, `/impeccable polish` o `/impeccable shape`.
Se instaló **sin** el hook automático. Para actualizarla: `npx impeccable update`. La primera vez descarga su motor desde
las releases de GitHub y verifica su SHA-256 antes de ejecutarlo.

## Datos de la tienda (carpeta `data/`)
| Archivo | Contenido |
|---|---|
| `data/productos.json` | Los 39 productos: nombre, categoría, **precio**, descripción, opciones, medidas… |
| `data/negocio.json` | Contacto, plazos, envío, canales de pago |
| `data/llavero-opciones.json` | Opciones del llavero personalizado (para el configurador) |

**Cambiar un precio:** en GitHub abre `data/productos.json`, pulsa el lápiz ✏️, cambia `"precio": 90000` y guarda
(*Commit changes*). La tienda se vuelve a publicar sola. `"precio": null` muestra «Precio a cotizar».

**Agregar fotos de producto:** guarda la imagen como `src/assets/productos/<id>.webp` (o `.jpg`/`.png`), donde `<id>` es el
`"id"` del producto en `productos.json` (ej. `tren-armable.webp`). Se usa sola; sin foto se muestra un ícono de la categoría.

## Rutas de la tienda
`#/` inicio · `#/catalogo[/Categoría]` · `#/producto/<id>` · `#/carrito` · `#/info` · `#/personalizador`

---
# Cotizador de llaveros por foto

App web (sin backend) que identifica en una foto los iconos 3D de un llavero y calcula el precio
a partir de los valores que tú defines. Corre 100 % en el navegador y se publica en GitHub Pages.

## Cómo funciona
1. **Catálogo:** todo lo que lleva un llavero es una *pieza* con precio: iconos, letras, cuentas, mosquetón, insignia, cordón… Se organizan por categoría (con buscador) y puedes marcar las que se agregan **automáticamente** a cada cotización (ej. cordón y mosquetón). La primera vez quedan creadas las piezas base (Letra, Cuenta, Mosquetón, Insignia, Cordón) para que les pongas precio. Cada pieza lleva 3–5 fotos (opcional; sin fotos se agrega a mano). Las que cambian de color (letras, cuentas…) van como una sola pieza.
2. **Cotizar:** subes una foto sobre hoja blanca; la app separa los objetos, los reconoce con CLIP
   (transformers.js) comparándolos con las fotos registradas y suma los precios agrupados
   (ej. «4 × Cuenta»). Si no separa bien un llavero armado, toca cada pieza en la foto.
3. **Confirmación:** lo dudoso aparece marcado como «Revisar» y se puede corregir o agregar a mano.
4. **Ajustes:** moneda, cargo fijo por llavero, redondeo, descuentos por cantidad y exigencia de coincidencia.

Los datos se guardan en el navegador (IndexedDB). Usa **Ajustes → Exportar / Importar catálogo**
para respaldarlos o pasarlos a otro dispositivo.

## Catálogo de ejemplo
`public/starter/` trae recortes de las piezas reales (iconos, letras, insignia, mosquetón, cuentas, cordón)
y un `manifest.json` con nombres provisionales. En **Catálogo → Cargar catálogo de ejemplo** se registran
con precio 0; las huellas de reconocimiento se calculan en el navegador (1–2 min la primera vez).
Para añadir piezas al paquete: copiar la imagen a esa carpeta y agregarla al manifiesto.

## Desarrollo
```bash
npm install
npm run dev     # servidor local (tienda en /, cotizador en /cotizador/)
npm test        # pruebas de la lógica (segmentación, coincidencia, precios, catálogo)
npm run build   # genera dist/
```
La primera vez, el navegador descarga el modelo (~90 MB) y lo deja en caché.

## Publicar en GitHub Pages
En el repo: **Settings → Pages → Source: GitHub Actions**. Cada push a `main` ejecuta las pruebas,
compila y despliega (`.github/workflows/deploy.yml`).
