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

## Consecuencias para el diseño
- **Sin pasarela de pagos**: no hace falta servidor de pagos. El flujo es: el cliente arma el pedido → ve datos de transferencia → envía el comprobante (WhatsApp o formulario) → se confirma a mano.
- Los pedidos se pueden recibir inicialmente por WhatsApp/correo con el detalle y la imagen del llavero, sin backend propio. Backend de pedidos queda para una fase posterior.
- «Bajo pedido» simplifica el catálogo: no hay inventario, solo disponibilidad de colores.
- El plazo (3 a 5 días) se muestra en producto, carrito y confirmación.

## Pendiente de definir
1. **Catálogos**: acceso a los dos catálogos (ver más abajo) para extraer productos, categorías y precios.
2. **Datos de transferencia** (banco, tipo y número de cuenta, titular) y a qué número/correo llegan los comprobantes.
3. **Envío**: ¿tarifa fija, por zona o por transportadora? ¿Quién lo paga? ¿Contra entrega?
4. **Paleta de colores sólidos** disponible (cordón, cuentas, mosquetón, letras, iconos): lista de nombres/colores reales.
5. **Opciones del llavero**: tipos de argolla/mosquetón (¿cuáles hay?), precio del cordón (¿fijo o por largo?), cuentas (¿tamaños?), insignia (¿opcional?).
6. **STL**: formato y dónde se entregan (ver abajo). Basta empezar con 5 a 8 piezas para el prototipo.
7. **Dominio y logo** (¿ya existen?).
8. **Políticas**: cambios/devoluciones de productos personalizados, datos personales (Ley 1581).

## Cómo compartir archivos con el proyecto
- **Catálogos**: subir los archivos (PDF/imágenes/Excel) al repo en una carpeta `catalogo/` desde GitHub
  (*Add file → Upload files*), o adjuntarlos en el chat.
- **STL**: carpeta `stl/` en el repo. El navegador de GitHub admite hasta 25 MB por archivo; si alguno es más
  grande se sube con `git`.
