// Execucao LOCAL (fora da Vercel). O app.js ja serve landing (/), admin (/admin) e API.
// Obs: a renderizacao local exige um Chrome (PUPPETEER_EXECUTABLE_PATH) e o BLOB_READ_WRITE_TOKEN.
import app from './app.js';
import { PORT } from './config.js';
import { closeBrowser } from './renderer.js';

const server = app.listen(PORT, () => {
  console.log(`Local em http://localhost:${PORT}/  (painel: /admin/)`);
});

async function shutdown() {
  await closeBrowser();
  server.close(() => process.exit(0));
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
