// Storage no Vercel Blob: templates como JSON e uploads como imagens publicas.
// Requer a env BLOB_READ_WRITE_TOKEN (criada ao conectar um Blob Store na Vercel).
import { put, head, list, del } from '@vercel/blob';
import { nanoid } from 'nanoid';

const T = 'templates/';

function requireToken() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error('Vercel Blob nao conectado: falta BLOB_READ_WRITE_TOKEN. Conecte um Blob Store na aba Storage e faca Redeploy.');
  }
}

async function readJson(url) {
  const r = await fetch(url, { cache: 'no-store' });
  if (!r.ok) throw new Error('blob fetch ' + r.status);
  return r.json();
}

function putJson(pathname, obj) {
  return put(pathname, JSON.stringify(obj), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}

export const templates = {
  async list() {
    requireToken();
    const { blobs } = await list({ prefix: T });
    const arr = await Promise.all(blobs.map((b) => readJson(b.url).catch(() => null)));
    return arr.filter(Boolean).sort((a, b) => b.updatedAt - a.updatedAt);
  },
  async get(id) {
    try {
      const meta = await head(`${T}${id}.json`);
      return await readJson(meta.url);
    } catch {
      return null;
    }
  },
  async create({ id, name, data }) {
    const now = Date.now();
    const obj = { id, name, ...data, createdAt: now, updatedAt: now };
    await putJson(`${T}${id}.json`, obj);
    return obj;
  },
  async update(id, { name, data }) {
    const ex = await this.get(id);
    if (!ex) return null;
    const obj = { id, name, ...data, createdAt: ex.createdAt, updatedAt: Date.now() };
    await putJson(`${T}${id}.json`, obj);
    return obj;
  },
  async remove(id) {
    try {
      const meta = await head(`${T}${id}.json`);
      await del(meta.url);
    } catch { /* ja nao existe */ }
  },
};

// Sobe a imagem de fundo e devolve a URL publica.
export async function putUpload(file) {
  requireToken();
  const ext = (file.originalname.match(/\.[^.]+$/) || ['.png'])[0];
  const { url } = await put(`uploads/${nanoid(10)}${ext}`, file.buffer, {
    access: 'public',
    contentType: file.mimetype || 'image/png',
    addRandomSuffix: false,
  });
  return url;
}
