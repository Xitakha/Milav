import { defineConfig } from 'vite';

// base relativa: funciona en https://<usuario>.github.io/<repo>/ sin configurar nada
export default defineConfig({ base: './', build: { target: 'es2022' } });
