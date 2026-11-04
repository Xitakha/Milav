# Fase 1 · Base de la tienda

## Hecho
- Estructura: tienda en `/` y cotizador por foto en `/cotizador/` (mismo repo y publicación).
- **Una sola fuente de datos** (`data/`), con prueba automática de integridad (ids únicos, precios válidos, sin notas internas visibles).
- Páginas: inicio, catálogo (categorías, búsqueda sin tildes, orden por precio), ficha de producto (opciones, personalización,
  cantidad), carrito (persistente), pedido por WhatsApp con el detalle, envíos/pagos, página provisional del llavero.
- Productos sin precio: «Precio a cotizar»; se pueden agregar al carrito y salen «por cotizar» en el mensaje.
- Marca: logo recortado de la portada del catálogo, colores oliva/lila/menta.

## Decisiones que quedaron simples a propósito
- **Sin pasarela de pagos** (transferencia): el pedido se envía por WhatsApp y se confirma a mano.
- **Rutas con `#`** para funcionar en GitHub Pages sin configuración. Contrapartida: peor posicionamiento en Google que una web
  con una página por producto. Se puede mejorar más adelante.
- **Precios en JSON editable en GitHub**; el apartado de ajuste manual de precios dentro de la app queda para la siguiente etapa.

## Pendiente
- Fotos reales de producto (hoy: ícono de categoría).
- Precios de los 6 productos «a cotizar» y confirmaciones de `docs/fase0-decisiones.md`.
- Configurador de llaveros (necesita los STL), datos de transferencia y dominio.
