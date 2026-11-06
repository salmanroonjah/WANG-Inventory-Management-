import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { defineConfig, Plugin } from 'vite';

/**
 * The repo root index.html is the built GitHub Pages output (it points at old
 * hashed bundles). In development always serve index.source.html, which loads
 * the live source (/src/main.tsx), so the dev server can never show a stale build.
 */
function devSourceIndex(): Plugin {
  return {
    name: 'wang-dev-source-index',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = (req.url || '').split('?')[0];
        if (url !== '/' && url !== '/index.html') return next();
        try {
          const raw = fs.readFileSync(path.resolve(__dirname, 'index.source.html'), 'utf8');
          const html = await server.transformIndexHtml(req.url || '/', raw);
          res.setHeader('Content-Type', 'text/html');
          res.end(html);
        } catch (e) {
          next(e);
        }
      });
    }
  };
}

export default defineConfig(() => {
  return {
    base: './',
    plugins: [devSourceIndex(), react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
