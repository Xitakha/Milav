# Fase 0 · Decisiones de la tienda Milav

## Confirmado
| Tema | Decisión |
|---|---|
| País / moneda | Colombia · peso colombiano (COP) |
| Pago | Transferencia bancaria (por ahora; sin pasarela) |
| Envíos | A toda Colombia |
| Modelo de venta | Bajo pedido, sin stock |
| Plazo de entrega | 3 a 5 días |
| Productos | Los de los catálogos de `C:\Users\raico\OneDrive\Catalogo Milav` (con sus precios) |
| Llaveros | Sin máximo de piezas; solo colores sólidos |
| Archivos 3D | Hay STL de las piezas del llavero; para los demás productos se envían fotos |

## Reglas de precio del llavero (confirmadas)
| Concepto | Precio (COP) |
|---|---|
| Base: cordón + **una** argolla **o** cadena | 3.000 |
| Cada icono | 500 |
| Cada letra (sin contar espacios) | 500 |
| Mosquetón (opcional) | 1.000 |
| Cada cuenta | 200 |
| Insignia | **pendiente** (hoy 0) |

Tipos de enganche: argolla, cadena y mosquetón. Todo editable en la app (Ajustes → Llavero personalizado).
Implementado en `src/keychain.js` con pruebas.

## Otros acuerdos
- **Envío:** lo paga el cliente; normalmente entre $15.000 y $30.000 según el destino. Se mostrará como rango estimado (editable en Ajustes).
- **Colores:** por ahora los primarios (rojo, amarillo, azul). Herramienta para agregar, editar,
  desactivar y eliminar colores en la pestaña **Colores** (`src/colors.js`); se guardan en el respaldo del catálogo.
- **Datos de transferencia:** vacíos por ahora; se completan después.
- **Dominio:** sin definir. **Logo:** está dentro de los catálogos.
- **STL:** se entregarán luego, ya consolidados.

## Consecuencias para el diseño
- **Sin pasarela de pagos**: no hace falta servidor de pagos. El flujo es: el cliente arma el pedido → ve datos de transferencia → envía el comprobante (WhatsApp o formulario) → se confirma a mano.
- Los pedidos se pueden recibir inicialmente por WhatsApp/correo con el detalle y la imagen del llavero, sin backend propio. Backend de pedidos queda para una fase posterior.
- «Bajo pedido» simplifica el catálogo: no hay inventario, solo disponibilidad de colores.
- El plazo (3 a 5 días) se muestra en producto, carrito y confirmación.

## Pendiente de definir
1. **Catálogos**: aún no están en el repo (ver más abajo). Hacen falta para extraer productos, categorías, precios y el logo.
2. **Insignia** (la pieza grande redonda con flor de lis de las fotos de llaveros): ¿es un producto aparte o parte del llavero?, ¿se cobra?, ¿es opcional?
3. **Envío:** confirmar si hay tarifa por ciudad/zona más precisa que el rango o contra entrega.
4. **Datos de transferencia** y a qué número/correo llegan los comprobantes.
5. **Paleta real de colores** del filamento (hoy solo primarios).
6. **STL** de las piezas del llavero. Basta empezar con 5 a 8 para el prototipo.
7. **Dominio** (sin definir).
8. **Políticas**: cambios/devoluciones de productos personalizados, datos personales (Ley 1581).

## Cómo compartir archivos con el proyecto
- **Catálogos**: subir los archivos (PDF/imágenes/Excel) al repo en una carpeta `catalogo/` desde GitHub
  (*Add file → Upload files*), o adjuntarlos en el chat.
- **STL**: carpeta `stl/` en el repo. El navegador de GitHub admite hasta 25 MB por archivo; si alguno es más
  grande se sube con `git`.
