// Renderizacao SEM navegador: Satori (elementos -> SVG) + sharp (SVG -> PNG/JPG).
// Funciona em serverless (Vercel) sem Chromium.
import satori from 'satori';
import sharp from 'sharp';
import { loadFonts } from './fonts-loader.js';
import { DEVICE_SCALE } from './config.js';

const CONTENT_TYPE = { png: 'image/png', jpeg: 'image/jpeg' };

// Converte a URL do fundo (Blob) para data URI, pois o Satori precisa dos bytes.
async function toDataUri(url) {
  if (!url) return null;
  if (url.startsWith('data:')) return url;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fundo: HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const ct = res.headers.get('content-type') || 'image/png';
  return `data:${ct};base64,${buf.toString('base64')}`;
}

function textOf(el, values) {
  let t = el.binding ? (values[el.binding] ?? el.content ?? '') : (el.content ?? '');
  t = String(t);
  if (el.uppercase) t = t.toUpperCase();
  return t;
}

function buildTree(tpl, values, bgDataUri) {
  const children = [];
  if (bgDataUri) {
    children.push({
      type: 'img',
      props: {
        src: bgDataUri,
        style: { position: 'absolute', left: 0, top: 0, width: tpl.width, height: tpl.height, objectFit: 'cover' },
      },
    });
  }
  for (const el of tpl.elements || []) {
    const align = el.align || 'center';
    children.push({
      type: 'div',
      props: {
        style: {
          position: 'absolute',
          left: el.x || 0,
          top: el.y || 0,
          width: el.w || 200,
          display: 'flex',
          justifyContent: align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start',
          fontFamily: el.fontFamily || 'Montserrat',
          fontSize: el.fontSize || 32,
          fontWeight: el.fontWeight || 400,
          fontStyle: el.fontStyle || 'normal',
          color: el.color || '#ffffff',
          textAlign: align,
          lineHeight: el.lineHeight || 1.2,
          letterSpacing: (el.letterSpacing || 0) + 'px',
          ...(el.shadow ? { textShadow: '0 2px 6px rgba(0,0,0,.55)' } : {}),
        },
        children: textOf(el, values),
      },
    });
  }
  return {
    type: 'div',
    props: {
      style: { position: 'relative', display: 'flex', width: tpl.width, height: tpl.height, overflow: 'hidden' },
      children,
    },
  };
}

// Renderiza no formato pedido (png|jpeg). Retorna { buffer, contentType }.
export async function renderImage(tpl, values, format = 'png') {
  format = CONTENT_TYPE[format] ? format : 'png';
  const contentType = CONTENT_TYPE[format];

  const [fonts, bgDataUri] = await Promise.all([
    loadFonts(tpl.elements || []),
    toDataUri(tpl.background),
  ]);

  const svg = await satori(buildTree(tpl, values, bgDataUri), {
    width: tpl.width,
    height: tpl.height,
    fonts,
  });

  const density = 72 * (DEVICE_SCALE || 2); // nitidez (retina)
  const img = sharp(Buffer.from(svg), { density });
  const buffer = format === 'jpeg'
    ? await img.jpeg({ quality: 90 }).toBuffer()
    : await img.png().toBuffer();

  return { buffer, contentType };
}

// compat: nao ha mais navegador para fechar
export async function closeBrowser() {}
