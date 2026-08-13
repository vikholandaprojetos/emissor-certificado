// Storage com 2 modos:
//  - PRODUCAO (Vercel): Vercel Blob, se BLOB_READ_WRITE_TOKEN existir.
//  - LOCAL (dev/teste): arquivo data/db.json + imagens como data URI. Sem token, isolado.
import { put, head, list, del } from '@vercel/blob';
import { nanoid } from 'nanoid';
import fs from 'node:fs';
import path from 'node:path';

const LOCAL = !process.env.BLOB_READ_WRITE_TOKEN;
const DATA_DIR = process.env.DATA_DIR || 'data';
const DB_FILE = path.join(DATA_DIR, 'db.json');
const T = 'templates/';

// ---- helpers LOCAL (arquivo) ----
function ldb() {
  try { return JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); }
  catch { return { templates: {}, submissions: {} }; }
}
function lsave(db) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

// ---- helpers BLOB ----
async function readJson(url) {
  const r = await fetch(url, { cache: 'no-store' });
  if (!r.ok) throw new Error('blob fetch ' + r.status);
  return r.json();
}
function putJson(pathname, obj) {
  return put(pathname, JSON.stringify(obj), {
    access: 'public', contentType: 'application/json', addRandomSuffix: false, allowOverwrite: true,
  });
}

function toTemplate(row) {
  if (!row) return null;
  return { id: row.id, name: row.name, ...row.data, createdAt: row.createdAt, updatedAt: row.updatedAt };
}

export const templates = {
  async list() {
    if (LOCAL) return Object.values(ldb().templates).map(toTemplate).sort((a, b) => b.updatedAt - a.updatedAt);
    const { blobs } = await list({ prefix: T });
    const arr = await Promise.all(blobs.map((b) => readJson(b.url).catch(() => null)));
    return arr.filter(Boolean).sort((a, b) => b.updatedAt - a.updatedAt);
  },
  async get(id) {
    if (LOCAL) return toTemplate(ldb().templates[id]);
    try { const m = await head(`${T}${id}.json`); return await readJson(m.url); }
    catch { return null; }
  },
  async create({ id, name, data }) {
    const now = Date.now();
    const obj = { id, name, ...data, createdAt: now, updatedAt: now };
    if (LOCAL) { const db = ldb(); db.templates[id] = { id, name, data, createdAt: now, updatedAt: now }; lsave(db); return obj; }
    await putJson(`${T}${id}.json`, obj);
    return obj;
  },
  async update(id, { name, data }) {
    const ex = await this.get(id);
    if (!ex) return null;
    const obj = { id, name, ...data, createdAt: ex.createdAt, updatedAt: Date.now() };
    if (LOCAL) { const db = ldb(); db.templates[id] = { id, name, data, createdAt: ex.createdAt, updatedAt: obj.updatedAt }; lsave(db); return obj; }
    await putJson(`${T}${id}.json`, obj);
    return obj;
  },
  async remove(id) {
    if (LOCAL) { const db = ldb(); delete db.templates[id]; lsave(db); return; }
    try { const m = await head(`${T}${id}.json`); await del(m.url); } catch { /* ja nao existe */ }
  },
};

// ---- Envios do formulario (email + nome + data) por template ----
export async function addSubmission(templateId, sub) {
  const rec = { id: nanoid(10), email: sub.email, name: sub.name, at: Date.now() };
  if (LOCAL) { const db = ldb(); (db.submissions[templateId] ||= []).push(rec); lsave(db); return rec; }
  await put(`submissions/${templateId}/${rec.id}.json`, JSON.stringify(rec), {
    access: 'public', contentType: 'application/json', addRandomSuffix: false,
  });
  return rec;
}

export async function listSubmissions(templateId) {
  if (LOCAL) return (ldb().submissions[templateId] || []).slice().sort((a, b) => b.at - a.at);
  const { blobs } = await list({ prefix: `submissions/${templateId}/` });
  const arr = await Promise.all(
    blobs.map((b) => fetch(b.url, { cache: 'no-store' }).then((r) => r.json()).catch(() => null))
  );
  return arr.filter(Boolean).sort((a, b) => b.at - a.at);
}

// Sobe a imagem de fundo. LOCAL: data URI (isolado). PROD: Vercel Blob (URL publica).
export async function putUpload(file) {
  if (LOCAL) return `data:${file.mimetype || 'image/png'};base64,${file.buffer.toString('base64')}`;
  const ext = (file.originalname.match(/\.[^.]+$/) || ['.png'])[0];
  const { url } = await put(`uploads/${nanoid(10)}${ext}`, file.buffer, {
    access: 'public', contentType: file.mimetype || 'image/png', addRandomSuffix: false,
  });
  return url;
}
