import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const root = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  build: {
    rolldownOptions: {
      input: {
        main: resolve(root, 'index.html'),
        animationTest: resolve(root, 'animation-test.html')
      }
    }
  }
});
