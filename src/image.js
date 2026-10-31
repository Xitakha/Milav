import { segment, squareBox } from './segment.js';

const WORK_MAX = 1024; // lado máximo del lienzo de trabajo
const SEG_MAX = 400; // lado máximo para segmentar (más rápido)

export async function fileToCanvas(file) {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, WORK_MAX / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * k);
  c.height = Math.round(bmp.height * k);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close?.();
  return c;
}

/** Detecta objetos; devuelve cajas en coordenadas del lienzo original y el color de fondo. */
export function detect(canvas) {
  const k = Math.min(1, SEG_MAX / Math.max(canvas.width, canvas.height));
  const s = document.createElement('canvas');
  s.width = Math.max(1, Math.round(canvas.width * k));
  s.height = Math.max(1, Math.round(canvas.height * k));
  const ctx = s.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(canvas, 0, 0, s.width, s.height);
  const { boxes, background } = segment(ctx.getImageData(0, 0, s.width, s.height));
  return {
    background,
    boxes: boxes.map((b) => ({ x: b.x / k, y: b.y / k, w: b.w / k, h: b.h / k, area: b.area / (k * k) })),
  };
}

/** Recorta la caja (con margen) a un cuadrado de `size` px; lo que queda fuera de la foto se rellena con el fondo. */
export function cropSquare(canvas, box, background, size = 224) {
  const { cx, cy, side } = squareBox(box);
  const out = document.createElement('canvas');
  out.width = out.height = size;
  const ctx = out.getContext('2d');
  ctx.fillStyle = `rgb(${background.join(',')})`;
  ctx.fillRect(0, 0, size, size);
  ctx.drawImage(canvas, cx - side / 2, cy - side / 2, side, side, 0, 0, size, size);
  return out;
}

export function wholeSquare(canvas, size = 224) {
  const bg = [255, 255, 255];
  return cropSquare(canvas, { x: 0, y: 0, w: canvas.width, h: canvas.height }, bg, size);
}

export function thumb(canvas, size = 96) {
  const t = document.createElement('canvas');
  t.width = t.height = size;
  t.getContext('2d').drawImage(canvas, 0, 0, size, size);
  return t.toDataURL('image/jpeg', 0.7);
}

/** Gira el lienzo `turns` cuartos de vuelta (en sentido horario). */
export function rotateCanvas(canvas, turns) {
  if (!turns) return canvas;
  const out = document.createElement('canvas');
  const odd = turns % 2 === 1;
  out.width = odd ? canvas.height : canvas.width;
  out.height = odd ? canvas.width : canvas.height;
  const ctx = out.getContext('2d');
  ctx.translate(out.width / 2, out.height / 2);
  ctx.rotate((turns * Math.PI) / 2);
  ctx.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);
  return out;
}
