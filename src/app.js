import express from 'express';
import multer from 'multer';
import crypto from 'node:crypto';
import { nanoid } from 'nanoid';
import { templates, putUpload } from './store.js';
import { renderImage } from './renderer.js';
import { FONTS } from './fonts.js';
import { LANDING_HTML } from './landing.js';
import { loginPage } from './login-page.js';
import { ASSETS } from './webui-assets.js';

const app = express();
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: false }));

// Envolve handlers async: erros viram resposta 500 rapida (evita travar em 504)
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// ---- Sessao por cookie assinado (login estilizado, com "Sair") ----
const ADMIN_USER = process.env.ADMIN_USER || '';
const ADMIN_PASS = process.env.ADMIN_PASS || '';
const AUTH_ON = !!(ADMIN_USER || ADMIN_PASS);
const SECRET = process.env.SESSION_SECRET || `${ADMIN_USER}:${ADMIN_PASS}:emissor`;
const TOKEN = crypto.createHmac('sha256', SECRET).update('authenticated-v1').digest('hex');

function parseCookies(header) {
  const out = {};
  (header || '').split(';').forEach((p) => {
    const i = p.indexOf('=');
    if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}
function isAuthed(req) {
  if (!AUTH_ON) return true;
  const sid = parseCookies(req.headers.cookie).sid || '';
  if (sid.length !== TOKEN.length) return false;
  return crypto.timingSafeEqual(Buffer.from(sid), Buffer.from(TOKEN));
}
function setSession(req, res) {
  const https = String(req.headers['x-forwarded-proto'] || '').includes('https');
  res.setHeader('Set-Cookie',
    `sid=${TOKEN}; HttpOnly; Path=/; Max-Age=604800; SameSite=Lax${https ? '; Secure' : ''}`);
}
function clearSession(res) {
  res.setHeader('Set-Cookie', 'sid=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax');
}

// ---- Landing publica ----
app.get('/', (_req, res) => res.type('html').send(LANDING_HTML));

// ---- Login / logout ----
app.get('/admin/login', (req, res) => {
  if (isAuthed(req)) return res.redirect('/admin/');
  res.type('html').send(loginPage());
});
app.post('/admin/login', (req, res) => {
  const { username, password } = req.body || {};
  if (AUTH_ON && username === ADMIN_USER && password === ADMIN_PASS) {
    setSession(req, res);
    return res.redirect('/admin/');
  }
  res.status(401).type('html').send(loginPage('Usuário ou senha inválidos.'));
});
app.get('/admin/logout', (_req, res) => {
  clearSession(res);
  res.redirect('/admin/login');
});

// ---- Assets do painel (nao sensiveis: apenas client-side) ----
app.get('/admin/style.css', (_req, res) => res.type('css').send(ASSETS.css));
app.get('/admin/editor.js', (_req, res) => res.type('js').send(ASSETS.js));

// ---- Painel (protegido) ----
app.get(['/admin', '/admin/'], (req, res) => {
  if (!isAuthed(req)) return res.redirect('/admin/login');
  res.type('html').send(ASSETS.index);
});

// ---- API (protegida) ----
app.use('/api', (req, res, next) => {
  if (isAuthed(req)) return next();
  res.status(401).json({ error: 'auth required' });
});

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 4 * 1024 * 1024 } });
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

app.get('/api/fonts', (_req, res) => res.json(FONTS));

app.get('/api/templates', wrap(async (_req, res) => {
  const list = await templates.list();
  res.json(list.map((t) => ({ id: t.id, name: t.name, updatedAt: t.updatedAt })));
}));
app.get('/api/templates/:id', wrap(async (req, res) => {
  const tpl = await templates.get(req.params.id);
  if (!tpl) return res.status(404).json({ error: 'not found' });
  res.json(tpl);
}));
app.post('/api/templates', wrap(async (req, res) => {
  const { name, ...rest } = req.body || {};
  const id = nanoid(8);
  const tpl = await templates.create({ id, name: name || 'Sem nome', data: normalizeData(rest) });
  res.status(201).json(tpl);
}));
app.put('/api/templates/:id', wrap(async (req, res) => {
  const existing = await templates.get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'not found' });
  const { name, ...rest } = req.body || {};
  const tpl = await templates.update(req.params.id, { name: name || existing.name, data: normalizeData(rest) });
  res.json(tpl);
}));
app.delete('/api/templates/:id', wrap(async (req, res) => {
  await templates.remove(req.params.id);
  res.status(204).end();
}));
app.post('/api/uploads', upload.single('file'), wrap(async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'no file' });
  const url = await putUpload(req.file);
  res.json({ url });
}));

// ---- Endpoint publico da imagem: /i/:id?name=victor ----
app.get('/i/:id', wrap(async (req, res) => {
  const tpl = await templates.get(req.params.id);
  if (!tpl) return res.status(404).send('not found');
  const { _format, _dl, ...values } = req.query;
  const format = pickFormat(_format || tpl.format);
  try {
    const { buffer, contentType } = await renderImage(tpl, values, format);
    res.set('Content-Type', contentType);
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
}));

// Diagnostico temporario: confirma se o store aceita gravar PUBLICO (o que usamos)
app.get('/_diag/blob', wrap(async (_req, res) => {
  const { put } = await import('@vercel/blob');
  const steps = { token: !!process.env.BLOB_READ_WRITE_TOKEN };
  try {
    const r = await put(`diag/test-${nanoid(6)}.txt`, 'hello', { access: 'public', addRandomSuffix: true });
    steps.put = 'ok (store PUBLICO): ' + r.url;
  } catch (e) { steps.put = 'ERROR: ' + (e?.message || e); }
  res.json(steps);
}));

app.get('/healthz', (_req, res) =>
  res.json({
    ok: true,
    blob: !!process.env.BLOB_READ_WRITE_TOKEN,
    auth: AUTH_ON,
    blobVars: Object.keys(process.env).filter((k) => k.includes('BLOB')),
  })
);

// Handler de erro: qualquer excecao async vira 500 JSON com a mensagem real
app.use((err, _req, res, _next) => {
  console.error('API error:', err);
  res.status(500).json({ error: err?.message || 'internal error' });
});

export default app;
