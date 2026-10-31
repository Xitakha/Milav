# Milav · Cotizador de llaveros

App web (sin backend) que identifica en una foto los iconos 3D de un llavero y calcula el precio
a partir de los valores que tú defines. Corre 100 % en el navegador y se publica en GitHub Pages.

## Cómo funciona
1. **Catálogo:** registras cada icono con nombre, precio y 3–5 fotos.
2. **Cotizar:** subes una foto; la app separa los objetos (fondo liso), los reconoce con CLIP
   (transformers.js) comparándolos con las fotos registradas, y suma los precios.
3. **Confirmación:** lo dudoso aparece marcado como «Revisar» y se puede corregir o agregar a mano.
4. **Ajustes:** moneda, precio de argolla, redondeo, descuentos por cantidad y exigencia de coincidencia.

Los datos se guardan en el navegador (IndexedDB). Usa **Ajustes → Exportar / Importar catálogo**
para respaldarlos o pasarlos a otro dispositivo.

## Desarrollo
```bash
npm install
npm run dev     # servidor local
npm test        # pruebas de la lógica (segmentación, coincidencia, precios, catálogo)
npm run build   # genera dist/
```
La primera vez, el navegador descarga el modelo (~90 MB) y lo deja en caché.

## Publicar en GitHub Pages
En el repo: **Settings → Pages → Source: GitHub Actions**. Cada push a `main` ejecuta las pruebas,
compila y despliega (`.github/workflows/deploy.yml`).
