/**
 * Serverless entry untuk Vercel: menangani semua /api/* dengan Express app.
 * Vercel memetakan file catch-all ini ke path /api/*. Karena Express app
 * bersifat callable (req, res), ia bisa langsung diekspor sebagai handler.
 *
 * Variabel environment (APPS_SCRIPT_URL, APPS_SCRIPT_SECRET, SESSION_SECRET,
 * ADMIN_USERNAME, ADMIN_PASSWORD) diambil dari Environment Variables Vercel.
 */
import { createApp } from '../src/server/app.ts';

const app = createApp();

export default app;
