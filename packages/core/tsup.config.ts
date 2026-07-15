import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],

  // O Core deve funcionar no navegador e também poder ser
  // importado com segurança em ambientes SSR.
  platform: 'neutral',

  // Mantém o JavaScript distribuído alinhado ao tsconfig.base.json.
  target: 'es2022',

  dts: true,
  sourcemap: true,
  clean: true,
});