import { defineConfig } from 'vite';
import { crx } from '@crxjs/vite-plugin';
import { copyFileSync } from 'fs';
import manifest from './manifest.json' with { type: 'json' };

export default defineConfig({
  plugins: [
    crx({ manifest }),
    {
      name: 'copy-css',
      writeBundle() {
        // Copy CSS file that the plugin doesn't handle
        copyFileSync('styles.css', 'dist/styles.css');
      }
    }
  ],
  resolve: {
    alias: {
      '@': new URL('./src', import.meta.url).pathname
    }
  }
});