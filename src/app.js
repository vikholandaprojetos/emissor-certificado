import express from 'express';
import multer from 'multer';
import { nanoid } from 'nanoid';
import { templates, putUpload } from './store.js';
import { renderImage } from './renderer.js';
import { FONTS } from './fonts.js';

const app = express();
app.use(express.json({ limit: '2mb' }));

// upload em memoria -> Vercel Blob (limite ~4.5MB de body na Vercel)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024 },
});

const ALLOWED_FORMATS = ['png', 'jpeg', 'pdf'];
const pickFormat = (f) => (ALLOWED_FORMATS.includes(f) ? f : 'png');

function normalizeData(body) {
  return {
    width: Number(body.width) || 1000,
    height: Number(body.height) || 705,
    background: body.background || null,
    format: pickFormat(body.format),
    elements: Array.isArray(body.elements) ? body.elements : [],
  };
}

// ---- API do admin (protegida pelo Edge Middleware) ----
app.get('/api/fonts', (_req, res) => res.json(FONTS));

app.get('/api/templates', async (_req, res) => {
  const list = await templates.list();
  res.json(list.map((t) => ({ id: t.id, name: t.name, updatedAt: t.updatedAt })));
});

app.get('/api/templates/:id', async (req, res) => {
  const tpl = await templates.get(req.params.id);
  if (!tpl) return res.status(404).json({ error: 'not found' });
  res.json(tpl);
});

app.post('/api/templates', async (req, res) => {
  const { name, ...rest } = req.body || {};
  const id = nanoid(8);
  const tpl = await templates.create({ id, name: name || 'Sem nome', data: normalizeData(rest) });
  res.status(201).json(tpl);
});

app.put('/api/templates/:id', async (req, res) => {
  const existing = await templates.get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'not found' });
  const { name, ...rest } = req.body || {};
  const tpl = await templates.update(req.params.id, { name: name || existing.name, data: normalizeData(rest) });
  res.json(tpl);
});

app.delete('/api/templates/:id', async (req, res) => {
  await templates.remove(req.params.id);
  res.status(204).end();
});

app.post('/api/uploads', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'no file' });
  try {
    const url = await putUpload(req.file);
    res.json({ url });
  } catch (err) {
    console.error('upload error', err);
    res.status(500).json({ error: 'upload failed' });
  }
});

// ---- Endpoint publico da imagem: /i/:id?name=victor ----
app.get('/i/:id', async (req, res) => {
  const tpl = await templates.get(req.params.id);
  if (!tpl) return res.status(404).send('not found');
  const { _format, _dl, ...values } = req.query;
  const format = pickFormat(_format || tpl.format);
  try {
    const { buffer, contentType } = await renderImage(tpl, values, format);
    res.set('Content-Type', contentType);
    // cache na CDN da Vercel: repeticoes nao reexecutam a funcao
    res.set('Cache-Control', 'public, max-age=86400, s-maxage=86400');
    if (format === 'pdf') {
      const safe = (tpl.name || 'certificado').replace(/[^\w.-]+/g, '_');
      res.set('Content-Disposition', `${_dl ? 'attachment' : 'inline'}; filename="${safe}.pdf"`);
    }
    res.send(buffer);
  } catch (err) {
    console.error('render error', err);
    res.status(500).send('render error');
  }
});

app.get('/healthz', (_req, res) => res.json({ ok: true }));

export default app;
