import { defineConfig } from 'vite';
import { resolve } from 'node:path';

// base relativa: funciona en https://<usuario>.github.io/<repo>/ sin configurar nada.
// Dos páginas: la tienda (/) y el cotizador por foto (/cotizador/).
export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    rollupOptions: {
      input: { tienda: resolve(__dirname, 'index.html'), cotizador: resolve(__dirname, 'cotizador/index.html') },
    },
  },
});
