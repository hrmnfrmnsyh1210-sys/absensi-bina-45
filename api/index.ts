/**
 * Serverless entry untuk Vercel (pola resmi Express-on-Vercel):
 * satu fungsi di /api, dan vercel.json me-rewrite semua /api/* ke sini.
 * Express app bersifat callable (req, res) sehingga bisa diekspor langsung.
 *
 * Variabel environment (APPS_SCRIPT_URL, APPS_SCRIPT_SECRET, SESSION_SECRET,
 * ADMIN_USERNAME, ADMIN_PASSWORD) diambil dari Environment Variables Vercel.
 */
import { createApp } from '../src/server/app.js';

const app = createApp();

export default app;
