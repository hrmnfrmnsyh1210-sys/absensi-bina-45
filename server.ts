/**
 * Entry pengembangan lokal: Express + Vite middleware, mendengarkan port.
 * (Di Vercel, entry-nya adalah api/[...path].ts — file ini tidak dipakai.)
 */
import 'dotenv/config';
import path from 'path';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import { createApp } from './src/server/app';
import * as store from './src/server/store';

const PORT = 3000;

async function startServer() {
  const app = createApp();

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  await store.ensureStore();

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server berjalan. Buka di browser: http://localhost:${PORT}`);
    console.log(
      store.isPersistent()
        ? '[data] Tersambung ke Google Sheets.'
        : '[data] Mode in-memory (data contoh, hilang saat restart). ' +
            'Isi kredensial Apps Script di .env untuk menyimpan permanen.',
    );
  });
}

startServer();
