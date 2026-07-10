'use strict';

const $ = (s) => document.querySelector(s);
const FONTS_FALLBACK = ['Montserrat', 'Poppins', 'Roboto', 'Open Sans', 'Lato',
  'Playfair Display', 'Merriweather', 'EB Garamond', 'Cinzel', 'Great Vibes', 'Dancing Script'];

const state = {
  list: [],
  tpl: null,        // template em edicao
  selectedId: null,
  zoom: 1,
  testValues: {},   // valores de teste dos parametros
  fonts: FONTS_FALLBACK,
};

// ---------- API ----------
const api = {
  async get(url) { const r = await fetch(url); if (!r.ok) throw new Error(r.status); return r.json(); },
  async json(method, url, body) {
    const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!r.ok) throw new Error(r.status);
    return r.status === 204 ? null : r.json();
  },
};

// ---------- util ----------
const uid = () => (crypto.randomUUID ? crypto.randomUUID().slice(0, 8) : String(Math.floor(performance.now() * 1000)));
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function elStyleObj(el) {
  return {
    left: (el.x || 0) + 'px',
    top: (el.y || 0) + 'px',
    width: (el.w || 200) + 'px',
    fontFamily: `'${el.fontFamily || 'Montserrat'}',sans-serif`,
    fontSize: (el.fontSize || 32) + 'px',
    fontWeight: el.fontWeight || 400,
    fontStyle: el.fontStyle || 'normal',
    color: el.color || '#ffffff',
    textAlign: el.align || 'center',
    lineHeight: el.lineHeight || 1.2,
    letterSpacing: (el.letterSpacing || 0) + 'px',
    textTransform: el.uppercase ? 'uppercase' : 'none',
    textShadow: el.shadow ? '0 2px 6px rgba(0,0,0,.55)' : 'none',
  };
}
function elText(el) {
  if (el.binding) return state.testValues[el.binding] || `{${el.binding}}`;
  return el.content || '';
}

// ---------- lista de templates ----------
async function loadList() {
  state.list = await api.get('/api/templates');
  const ul = $('#tpl-list');
  ul.innerHTML = '';
  for (const t of state.list) {
    const li = document.createElement('li');
    li.className = state.tpl && state.tpl.id === t.id ? 'active' : '';
    const span = document.createElement('span');
    span.textContent = t.name;
    span.style.flex = '1';
    span.onclick = () => openTemplate(t.id);
    const del = document.createElement('button');
    del.className = 'li-del';
    del.textContent = '×';
    del.title = 'Excluir';
    del.onclick = (e) => { e.stopPropagation(); deleteTemplate(t.id, t.name); };
    li.append(span, del);
    ul.appendChild(li);
  }
}

async function deleteTemplate(id, name) {
  if (!confirm(`Excluir "${name}"?\nEssa acao nao pode ser desfeita.`)) return;
  await fetch('/api/templates/' + id, { method: 'DELETE' });
  if (state.tpl && state.tpl.id === id) {
    state.tpl = null;
    state.selectedId = null;
    enableUI(false);
    $('#props').hidden = true;
    $('#url-panel').hidden = true;
    $('#tpl-name').value = '';
  }
  await loadList();
}

async function openTemplate(id) {
  state.tpl = await api.get('/api/templates/' + id);
  state.selectedId = null;
  state.testValues = {};
  enableUI(true);
  $('#tpl-name').value = state.tpl.name;
  $('#tpl-format').value = state.tpl.format || 'png';
  await loadList();
  renderStage();
  renderProps();
  renderUrlPanel();
}

// ---------- nova imagem (upload de fundo) ----------
$('#btn-new').onclick = () => $('#file-input').click();
$('#file-input').onchange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const dims = await readImageDims(file);
  const fd = new FormData();
  fd.append('file', file);
  const up = await fetch('/api/uploads', { method: 'POST', body: fd }).then((r) => r.json());
  const tpl = await api.json('POST', '/api/templates', {
    name: file.name.replace(/\.[^.]+$/, ''),
    width: dims.w, height: dims.h,
    background: up.url, format: 'png', elements: [],
  });
  e.target.value = '';
  await openTemplate(tpl.id);
};

function readImageDims(file) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.src = URL.createObjectURL(file);
  });
}

// ---------- stage ----------
function computeZoom() {
  const area = $('.stage-area');
  const availW = area.clientWidth - 48;
  const availH = area.clientHeight - 48;
  state.zoom = Math.min(1, availW / state.tpl.width, availH / state.tpl.height);
}

function renderStage() {
  computeZoom();
  const stage = $('#stage');
  const wrap = $('#stage-wrap');
  stage.style.width = state.tpl.width + 'px';
  stage.style.height = state.tpl.height + 'px';
  stage.style.transform = `scale(${state.zoom})`;
  wrap.style.width = state.tpl.width * state.zoom + 'px';
  wrap.style.height = state.tpl.height * state.zoom + 'px';

  stage.innerHTML = '';
  if (state.tpl.background) {
    const img = document.createElement('img');
    img.className = 'bg';
    img.src = state.tpl.background; // URL publica do Vercel Blob
    img.draggable = false;
    stage.appendChild(img);
  }
  for (const el of state.tpl.elements) stage.appendChild(makeElNode(el));
  // guias de encaixe (snap)
  const gv = document.createElement('div'); gv.className = 'guide guide-v'; gv.id = 'guide-v'; gv.style.display = 'none';
  const gh = document.createElement('div'); gh.className = 'guide guide-h'; gh.id = 'guide-h'; gh.style.display = 'none';
  stage.append(gv, gh);
}

function makeElNode(el) {
  const node = document.createElement('div');
  node.className = 'el' + (el.id === state.selectedId ? ' selected' : '');
  node.dataset.id = el.id;
  Object.assign(node.style, elStyleObj(el));
  node.textContent = elText(el);
  node.onmousedown = (e) => startDrag(e, el, node);

  if (el.id === state.selectedId) {
    const h = document.createElement('div');
    h.className = 'handle';
    h.onmousedown = (e) => { e.stopPropagation(); startResize(e, el, node); };
    node.appendChild(h);
  }
  return node;
}

function startDrag(e, el, node) {
  e.preventDefault();
  if (el.id !== state.selectedId) selectElement(el.id);
  document.body.classList.add('dragging');
  const guideV = $('#guide-v'), guideH = $('#guide-h');
  const sx = e.clientX, sy = e.clientY, ox = el.x, oy = el.y;
  const cw = state.tpl.width, ch = state.tpl.height;
  const T = 7 / state.zoom; // limiar de encaixe (px do canvas)

  const move = (ev) => {
    let nx = ox + (ev.clientX - sx) / state.zoom;
    let ny = oy + (ev.clientY - sy) / state.zoom;
    const w = el.w, h = node.offsetHeight;

    // encaixe horizontal (centro / bordas do canvas)
    let showV = false, vx = 0;
    if (Math.abs(nx + w / 2 - cw / 2) < T) { nx = cw / 2 - w / 2; showV = true; vx = cw / 2; }
    else if (Math.abs(nx) < T) { nx = 0; showV = true; vx = 0; }
    else if (Math.abs(nx + w - cw) < T) { nx = cw - w; showV = true; vx = cw; }

    // encaixe vertical (centro / bordas do canvas)
    let showH = false, hy = 0;
    if (Math.abs(ny + h / 2 - ch / 2) < T) { ny = ch / 2 - h / 2; showH = true; hy = ch / 2; }
    else if (Math.abs(ny) < T) { ny = 0; showH = true; hy = 0; }
    else if (Math.abs(ny + h - ch) < T) { ny = ch - h; showH = true; hy = ch; }

    // trava para nao perder o elemento fora do canvas
    nx = Math.max(20 - w, Math.min(cw - 20, nx));
    ny = Math.max(10 - h, Math.min(ch - 10, ny));

    el.x = Math.round(nx); el.y = Math.round(ny);
    node.style.left = el.x + 'px';
    node.style.top = el.y + 'px';

    guideV.style.display = showV ? 'block' : 'none'; if (showV) guideV.style.left = vx + 'px';
    guideH.style.display = showH ? 'block' : 'none'; if (showH) guideH.style.top = hy + 'px';
    $('#p-x').value = el.x; $('#p-y').value = el.y;
  };
  const up = () => {
    document.removeEventListener('mousemove', move);
    document.removeEventListener('mouseup', up);
    document.body.classList.remove('dragging');
    guideV.style.display = 'none'; guideH.style.display = 'none';
    syncPropsInputs(); renderUrlPanel();
  };
  document.addEventListener('mousemove', move);
  document.addEventListener('mouseup', up);
}

function startResize(e, el, node) {
  e.preventDefault();
  const sx = e.clientX, ow = el.w;
  const move = (ev) => {
    el.w = Math.max(20, Math.round(ow + (ev.clientX - sx) / state.zoom));
    node.style.width = el.w + 'px';
  };
  const up = () => { document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); syncPropsInputs(); };
  document.addEventListener('mousemove', move);
  document.addEventListener('mouseup', up);
}

// ---------- adicionar / selecionar ----------
$('#btn-add-text').onclick = () => {
  const el = {
    id: uid(), type: 'text', binding: '', content: 'Novo texto',
    x: Math.round(state.tpl.width * 0.3), y: Math.round(state.tpl.height * 0.4),
    w: Math.round(state.tpl.width * 0.4),
    fontFamily: 'Montserrat', fontSize: 40, fontWeight: 700, fontStyle: 'normal',
    color: '#ffffff', align: 'center', lineHeight: 1.2, letterSpacing: 0,
    uppercase: false, shadow: false,
  };
  state.tpl.elements.push(el);
  selectElement(el.id);
  renderStage();
  renderProps();
};

function selectElement(id) {
  state.selectedId = id;
  document.querySelectorAll('.el').forEach((n) => n.classList.toggle('selected', n.dataset.id === id));
  renderStage();
  renderProps();
}

function selectedEl() { return state.tpl?.elements.find((e) => e.id === state.selectedId); }

// ---------- painel de propriedades ----------
function fillFontSelect() {
  const sel = $('#p-font');
  if (sel.options.length) return;
  for (const f of state.fonts) {
    const o = document.createElement('option');
    o.value = f; o.textContent = f; o.style.fontFamily = `'${f}'`;
    sel.appendChild(o);
  }
}

function renderProps() {
  const el = selectedEl();
  $('#props').hidden = !el;
  if (!el) return;
  fillFontSelect();
  syncPropsInputs();
}

function syncPropsInputs() {
  const el = selectedEl();
  if (!el) return;
  $('#p-content').value = el.content || '';
  $('#p-binding').value = el.binding || '';
  $('#p-font').value = el.fontFamily || 'Montserrat';
  $('#p-weight').value = el.fontWeight || 400;
  $('#p-size').value = el.fontSize || 32;
  $('#p-color').value = el.color || '#ffffff';
  $('#p-align').value = el.align || 'center';
  $('#p-width').value = el.w || 200;
  $('#p-x').value = el.x || 0;
  $('#p-y').value = el.y || 0;
  $('#p-ls').value = el.letterSpacing || 0;
  $('#p-lh').value = el.lineHeight || 1.2;
  $('#p-upper').checked = !!el.uppercase;
  $('#p-italic').checked = el.fontStyle === 'italic';
  $('#p-shadow').checked = !!el.shadow;
}

function bindProp(id, key, transform) {
  $(id).addEventListener('input', () => {
    const el = selectedEl(); if (!el) return;
    const node = $(id);
    let v = node.type === 'checkbox' ? node.checked : node.value;
    if (transform) v = transform(v);
    el[key] = v;
    renderStage();
    renderUrlPanel();
  });
}
bindProp('#p-content', 'content');
bindProp('#p-binding', 'binding', (v) => v.trim().replace(/[^a-zA-Z0-9_]/g, ''));
bindProp('#p-font', 'fontFamily');
bindProp('#p-weight', 'fontWeight', Number);
bindProp('#p-size', 'fontSize', Number);
bindProp('#p-color', 'color');
bindProp('#p-align', 'align');
bindProp('#p-width', 'w', Number);
bindProp('#p-x', 'x', Number);
bindProp('#p-y', 'y', Number);
bindProp('#p-ls', 'letterSpacing', Number);
bindProp('#p-lh', 'lineHeight', Number);
bindProp('#p-upper', 'uppercase');
bindProp('#p-italic', 'fontStyle', (v) => (v ? 'italic' : 'normal'));
bindProp('#p-shadow', 'shadow');

$('#btn-del').onclick = () => {
  state.tpl.elements = state.tpl.elements.filter((e) => e.id !== state.selectedId);
  state.selectedId = null;
  renderStage(); renderProps(); renderUrlPanel();
};

// ---------- painel de URL / parametros ----------
function bindings() {
  return [...new Set(state.tpl.elements.filter((e) => e.binding).map((e) => e.binding))];
}

function renderUrlPanel() {
  const params = bindings();
  $('#url-panel').hidden = false;
  const form = $('#params-form');
  form.innerHTML = '';
  for (const p of params) {
    const label = document.createElement('label');
    label.textContent = p;
    const inp = document.createElement('input');
    inp.value = state.testValues[p] || '';
    inp.placeholder = 'valor de teste';
    inp.oninput = () => { state.testValues[p] = inp.value; renderStage(); renderUrlPanel(); };
    label.appendChild(inp);
    form.appendChild(label);
  }
  $('#gen-url').textContent = genUrl();
  $('#view-url').textContent = genViewUrl();
}

function queryString() {
  return bindings()
    .map((p) => `${encodeURIComponent(p)}=${encodeURIComponent(state.testValues[p] || 'valor')}`)
    .join('&');
}
function genUrl() {
  const qs = queryString();
  return location.origin + '/i/' + state.tpl.id + (qs ? `?${qs}` : '');
}
function genViewUrl() {
  const qs = queryString();
  return location.origin + '/view/' + state.tpl.id + (qs ? `?${qs}` : '');
}

$('#btn-copy').onclick = () => navigator.clipboard.writeText(genUrl());
$('#btn-open').onclick = () => window.open(genUrl(), '_blank');
function download(extraParams) {
  const url = genUrl();
  const a = document.createElement('a');
  a.href = url + (url.includes('?') ? '&' : '?') + extraParams;
  a.download = '';
  document.body.appendChild(a);
  a.click();
  a.remove();
}
$('#btn-download').onclick = () => download('_dl=1');
$('#btn-pdf').onclick = () => download('_format=pdf&_dl=1');
$('#btn-copy-view').onclick = () => navigator.clipboard.writeText(genViewUrl());
$('#btn-open-view').onclick = () => window.open(genViewUrl(), '_blank');

// ---------- salvar ----------
$('#btn-save').onclick = async () => {
  const payload = {
    name: $('#tpl-name').value || 'Sem nome',
    width: state.tpl.width, height: state.tpl.height,
    background: state.tpl.background, format: $('#tpl-format').value,
    elements: state.tpl.elements,
  };
  await api.json('PUT', '/api/templates/' + state.tpl.id, payload);
  state.tpl.format = payload.format;
  state.tpl.name = payload.name;
  await loadList();
  flash('Salvo!');
};

function flash(msg) {
  const b = $('#btn-save');
  const old = b.textContent;
  b.textContent = msg;
  setTimeout(() => (b.textContent = old), 1200);
}

// ---------- UI enable ----------
function enableUI(on) {
  $('#tpl-name').disabled = !on;
  $('#tpl-format').disabled = !on;
  $('#btn-save').disabled = !on;
  $('#btn-add-text').disabled = !on;
  $('#stage-empty').hidden = on;
  $('#stage-wrap').hidden = !on;
}

window.addEventListener('resize', () => { if (state.tpl) renderStage(); });

// clicar no fundo (stage/imagem) desseleciona
$('#stage').addEventListener('mousedown', (e) => {
  if (e.target.id === 'stage' || e.target.classList.contains('bg')) {
    state.selectedId = null;
    renderStage(); renderProps();
  }
});

// teclado: setas movem, Delete exclui
document.addEventListener('keydown', (e) => {
  const el = selectedEl();
  if (!el) return;
  const tag = (e.target.tagName || '').toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
  if (e.key === 'Delete') {
    state.tpl.elements = state.tpl.elements.filter((x) => x.id !== el.id);
    state.selectedId = null;
    renderStage(); renderProps(); renderUrlPanel();
    e.preventDefault();
    return;
  }
  const step = e.shiftKey ? 10 : 1;
  const moves = { ArrowLeft: ['x', -step], ArrowRight: ['x', step], ArrowUp: ['y', -step], ArrowDown: ['y', step] };
  if (moves[e.key]) {
    const [axis, d] = moves[e.key];
    el[axis] += d;
    renderStage(); syncPropsInputs(); renderUrlPanel();
    e.preventDefault();
  }
});

// ---------- boot ----------
(async function init() {
  try { state.fonts = (await api.get('/api/fonts')).map((f) => f.family); } catch {}
  await loadList();
})();
