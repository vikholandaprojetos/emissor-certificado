import { googleFontsHref } from './fonts.js';

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Resolve o texto de um elemento a partir dos parametros da URL.
function resolveText(el, values) {
  if (el.binding) {
    const v = values[el.binding];
    return v != null && v !== '' ? v : (el.content ?? '');
  }
  return el.content ?? '';
}

function elementStyle(el) {
  const s = [];
  s.push('position:absolute');
  s.push(`left:${el.x || 0}px`);
  s.push(`top:${el.y || 0}px`);
  s.push(`width:${el.w || 200}px`);
  s.push(`font-family:'${el.fontFamily || 'Montserrat'}',sans-serif`);
  s.push(`font-size:${el.fontSize || 32}px`);
  s.push(`font-weight:${el.fontWeight || 400}`);
  s.push(`font-style:${el.fontStyle || 'normal'}`);
  s.push(`color:${el.color || '#ffffff'}`);
  s.push(`text-align:${el.align || 'center'}`);
  s.push(`line-height:${el.lineHeight || 1.2}`);
  if (el.letterSpacing) s.push(`letter-spacing:${el.letterSpacing}px`);
  if (el.uppercase) s.push('text-transform:uppercase');
  if (el.shadow) s.push('text-shadow:0 2px 6px rgba(0,0,0,.55)');
  s.push('margin:0');
  s.push('white-space:pre-wrap');
  s.push('word-break:break-word');
  s.push('box-sizing:border-box');
  return s.join(';');
}

export function elementHTML(el, values) {
  return `<div class="el" data-id="${esc(el.id)}" style="${elementStyle(el)}">${esc(resolveText(el, values))}</div>`;
}

// Pagina completa que o Playwright fotografa (elemento #stage).
export function stageHTML(tpl, values = {}) {
  const bg = tpl.background || ''; // URL publica do Vercel Blob
  const els = (tpl.elements || []).map((el) => elementHTML(el, values)).join('\n');
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="${googleFontsHref()}" rel="stylesheet">
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: transparent; }
  #stage {
    position: relative;
    width: ${tpl.width}px;
    height: ${tpl.height}px;
    overflow: hidden;
  }
  #stage .bg { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
</style>
</head>
<body>
  <div id="stage">
    ${bg ? `<img class="bg" src="${bg}" alt="">` : ''}
    ${els}
  </div>
</body>
</html>`;
}
