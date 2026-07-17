import express from 'express';
import multer from 'multer';
import crypto from 'node:crypto';
import { nanoid } from 'nanoid';
import { templates, putUpload } from './store.js';
import { renderImage } from './renderer.js';
import { FONTS } from './fonts.js';
import { LANDING_HTML } from './landing.js';
import { loginPage } from './login-page.js';
import { viewPage } from './view-page.js';
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

// ---- Pagina publica de visualizacao + download: /view/:id?nome=... ----
app.get('/view/:id', wrap(async (req, res) => {
  const tpl = await templates.get(req.params.id);
  if (!tpl) return res.status(404).send('not found');
  const { formato, ...values } = req.query;
  const imgFmt = (formato === 'jpg' || formato === 'jpeg') ? 'jpeg' : 'png';
  const qs = new URLSearchParams(values).toString();
  res.type('html').send(viewPage(req.params.id, qs, tpl.name, imgFmt));
}));

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
const EXT = { png: 'png', jpeg: 'jpg', pdf: 'pdf' };
function normalizeData(body) {
  return {
    width: Number(body.width) || 1000,
    height: Number(body.height) || 705,
    background: body.background || null,
    // formato PADRAO da URL /i/ (email/exibicao) e sempre imagem; PDF so via ?_format=pdf
    format: body.format === 'jpeg' ? 'jpeg' : 'png',
    folder: (body.folder || '').trim(),
    elements: Array.isArray(body.elements) ? body.elements : [],
  };
}

app.get('/api/fonts', (_req, res) => res.json(FONTS));

app.get('/api/templates', wrap(async (_req, res) => {
  const list = await templates.list();
  res.json(list.map((t) => ({ id: t.id, name: t.name, folder: t.folder || '', updatedAt: t.updatedAt })));
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
  const { _format, _dl, formato, ...values } = req.query;

  // Parametro amigavel: ?formato=imagem|png|jpg|pdf|pagina  (mesma URL, saidas diferentes)
  const fmt = String(formato || _format || '').toLowerCase();
  if (fmt === 'pagina' || fmt === 'page') {
    const qs = new URLSearchParams(values).toString();
    return res.type('html').send(viewPage(req.params.id, qs, tpl.name));
  }
  const alias = { imagem: 'png', jpg: 'jpeg' };
  // padrao do template e sempre imagem (PDF so quando pedido)
  const def = tpl.format === 'jpeg' ? 'jpeg' : 'png';
  const format = pickFormat(alias[fmt] || fmt || def);
  try {
    const { buffer, contentType } = await renderImage(tpl, values, format);
    res.set('Content-Type', contentType);
    // cache curto no edge + serve "stale" enquanto revalida: troca de fundo
    // aparece em ~1 min, mas o e-mail continua carregando rapido (servido do cache)
    res.set('Cache-Control', 'public, max-age=60, s-maxage=60, stale-while-revalidate=86400');
    if (_dl || format === 'pdf') {
      const safe = (tpl.name || 'imagem').replace(/[^\w.-]+/g, '_');
      const disp = _dl ? 'attachment' : 'inline';
      res.set('Content-Disposition', `${disp}; filename="${safe}.${EXT[format]}"`);
    }
    res.send(buffer);
  } catch (err) {
    console.error('render error', err);
    if (req.query._debug) {
      return res.status(500).type('text').send('RENDER ERROR:\n' + (err?.stack || err?.message || String(err)));
    }
    res.status(500).send('render error');
  }
}));

app.get('/healthz', (_req, res) =>
  res.json({
    ok: true,
    blob: !!process.env.BLOB_READ_WRITE_TOKEN,
    auth: AUTH_ON,
    blobVars: Object.keys(process.env).filter((k) => k.includes('BLOB')),
    node: process.version,
    arch: process.arch,
    region: process.env.VERCEL_REGION || null,
  })
);

// Handler de erro: qualquer excecao async vira 500 JSON com a mensagem real
app.use((err, _req, res, _next) => {
  console.error('API error:', err);
  res.status(500).json({ error: err?.message || 'internal error' });
});

export default app;
