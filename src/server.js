// Execucao LOCAL (fora da Vercel). Serve tambem os estaticos do admin.
// Obs: a renderizacao local exige um Chrome instalado (defina PUPPETEER_EXECUTABLE_PATH)
// e as envs do Blob (BLOB_READ_WRITE_TOKEN). Na Vercel isso e automatico.
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import app from './app.js';
import { PORT } from './config.js';
import { closeBrowser } from './renderer.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// Local = ambiente confiavel (a protecao por senha e o Edge Middleware, so na Vercel)
app.use('/admin', express.static(path.join(ROOT, 'public', 'admin')));
app.get('/', (_req, res) => res.redirect('/admin/'));

const server = app.listen(PORT, () => {
  console.log(`Local em http://localhost:${PORT}/admin/`);
});

async function shutdown() {
  await closeBrowser();
  server.close(() => process.exit(0));
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
