import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';

export default defineConfig({
  resolve: { dedupe: ['react', 'react-dom'] },
  plugins: [react(), { name:'bakery-push-worker', generateBundle(){this.emitFile({type:'asset',fileName:'push-sw.js',source:readFileSync(new URL('../public/push-sw.js',import.meta.url),'utf8')});} }],
  server: {
    host: '0.0.0.0',
  },
  preview: {
    host: '0.0.0.0',
  },
});
