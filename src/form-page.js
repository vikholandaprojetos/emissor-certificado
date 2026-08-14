// Formulario publico de emissao em 3 etapas: email -> nome -> confirmar -> gerar.
function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
}

export function formPage(id, tpl) {
  const title = esc(tpl.publicTitle || tpl.name || 'Seu Certificado');
  return `<!doctype html>
<html lang="pt-br">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Seu Certificado — ${title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Inter', system-ui, sans-serif; color: #1e293b; min-height: 100vh; padding: 32px 16px;
    background: linear-gradient(160deg, #eafaf1 0%, #eef2ff 60%, #f8fafc 100%);
  }
  .wrap { max-width: 620px; margin: 0 auto; }
  .head { text-align: center; margin-bottom: 22px; }
  .head h1 { font-size: 30px; color: #0f9d63; display: flex; gap: 10px; justify-content: center; align-items: center; }
  .head .sub { font-weight: 700; color: #334155; margin-top: 8px; }
  .steps { display: flex; align-items: center; justify-content: center; gap: 6px; margin: 22px 0; }
  .dot { width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
    font-weight: 700; background: #e2e8f0; color: #64748b; flex: 0 0 auto; }
  .dot.on { background: #1e293b; color: #fff; }
  .dot.done { background: #0f9d63; color: #fff; }
  .bar { height: 3px; width: 46px; background: #e2e8f0; }
  .bar.done { background: #0f9d63; }
  .steplabel { text-align: center; color: #64748b; font-size: 13px; margin-top: -12px; margin-bottom: 20px; }
  .card { background: #fff; border-radius: 16px; padding: 28px; box-shadow: 0 10px 30px rgba(2,6,23,.08); border: 1px solid #eef2f7; }
  .card h2 { font-size: 21px; color: #1d4ed8; margin-bottom: 8px; }
  .card p.lead { color: #475569; margin-bottom: 18px; }
  label { display: block; font-weight: 600; font-size: 14px; margin-bottom: 8px; }
  input {
    width: 100%; padding: 14px; border-radius: 10px; border: 1px solid #e2e8f0; background: #f8fafc;
    font: inherit; margin-bottom: 8px;
  }
  input:focus { outline: none; border-color: #1d4ed8; background: #fff; }
  .btn {
    width: 100%; padding: 15px; border: none; border-radius: 10px; font-weight: 700; font-size: 16px;
    cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;
  }
  .btn.primary { background: #2563eb; color: #fff; }
  .btn.green { background: #0f9d63; color: #fff; }
  .btn.ghost { background: #fff; color: #1e293b; border: 1px solid #e2e8f0; }
  .btn:hover { filter: brightness(1.05); }
  .row { display: flex; gap: 10px; margin-top: 14px; }
  .warn { background: #fefce8; border: 1px solid #fde68a; color: #854d0e; padding: 12px 14px; border-radius: 10px; font-size: 14px; margin: 14px 0; }
  .err { background: #fef2f2; border: 1px solid #fecaca; color: #b91c1c; padding: 12px 14px; border-radius: 10px; font-size: 14px; margin-top: 12px; display: none; }
  .preview { background: #eef4ff; border: 1px solid #dbeafe; border-radius: 12px; padding: 22px; text-align: center; margin-bottom: 16px; }
  .preview small { color: #64748b; }
  .preview .name { font-size: 30px; color: #1e3a8a; margin-top: 6px; font-family: Georgia, serif; }
  .frame { border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; margin-bottom: 16px; background: #f8fafc; }
  .frame img { display: block; width: 100%; height: auto; }
  .loading { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; padding: 70px 20px; color: #64748b; }
  .spinner { width: 46px; height: 46px; border: 4px solid #e2e8f0; border-top-color: #0f9d63; border-radius: 50%; animation: spin .8s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .btn.disabled { opacity: .55; pointer-events: none; }
  .muted { color: #64748b; font-size: 13px; text-align: center; }
  .spin { pointer-events: none; opacity: .7; }
</style>
</head>
<body>
<div class="wrap">
  <div class="head">
    <h1>📄 Seu Certificado</h1>
    <div class="sub">${title}</div>
  </div>
  <div class="steps" id="steps"></div>
  <div class="steplabel" id="steplabel"></div>
  <div id="app"></div>
  <p class="muted" style="margin-top:18px">Instituto • Emissão de certificado</p>
</div>
<script>
const ID = ${JSON.stringify(id)};
const PARAMS = Object.fromEntries(new URLSearchParams(location.search));
const st = { step: 1, email: '', name: '' };
const app = document.getElementById('app');

function renderSteps() {
  const s = st.step;
  const d = (n, label) => {
    let cls = 'dot';
    if (s > n || (n < 4 && s === 4)) cls += ' done';
    else if (s === n) cls += ' on';
    return '<div class="' + cls + '">' + (s > n ? '✓' : n) + '</div>';
  };
  const bar = (n) => '<div class="bar' + (s > n ? ' done' : '') + '"></div>';
  document.getElementById('steps').innerHTML = d(1) + bar(1) + d(2) + bar(2) + d(3);
  document.getElementById('steplabel').textContent = 'Passo ' + Math.min(s, 3) + ' de 3';
}

function esc(x){ return String(x==null?'':x).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;'); }

function render() {
  renderSteps();
  if (st.step === 1) app.innerHTML = viewEmail();
  else if (st.step === 2) app.innerHTML = viewName();
  else if (st.step === 3) app.innerHTML = viewConfirm();
  else app.innerHTML = viewDone();
  wire();
}

function viewEmail() {
  return '<div class="card"><h2>👋 Bem-vindo(a)!</h2>' +
    '<p class="lead">Para começar, digite o e-mail que você usou na inscrição do evento.</p>' +
    '<label>Seu e-mail de cadastro:</label>' +
    '<input id="in-email" type="email" placeholder="exemplo@email.com" value="' + esc(st.email) + '" autocomplete="email">' +
    '<div class="err" id="err"></div>' +
    '<button class="btn primary" id="go" style="margin-top:12px">Continuar →</button></div>';
}
function viewName() {
  return '<div class="card"><h2>✍️ Como você quer ser chamado(a)?</h2>' +
    '<p class="lead">Digite seu nome completo exatamente como quer que apareça no certificado.</p>' +
    '<label>Seu nome completo:</label>' +
    '<input id="in-name" type="text" placeholder="Maria Silva Santos" value="' + esc(st.name) + '" autocomplete="name">' +
    '<div class="warn">⚠️ <b>Atenção:</b> digite com cuidado! O nome não poderá ser alterado depois de emitir o certificado.</div>' +
    '<div class="err" id="err"></div>' +
    '<div class="row"><button class="btn ghost" id="back">← Voltar</button>' +
    '<button class="btn primary" id="go">Continuar →</button></div></div>';
}
function viewConfirm() {
  return '<div class="card"><h2>✅ Confira seu nome</h2>' +
    '<p class="lead">Certifique-se de que está tudo certo antes de gerar o certificado.</p>' +
    '<div class="preview"><small>O nome aparecerá assim:</small><div class="name">' + esc(st.name) + '</div></div>' +
    '<div class="warn">⚠️ Está tudo correto? Não será possível alterar depois!</div>' +
    '<div class="err" id="err"></div>' +
    '<div class="row"><button class="btn ghost" id="back">✎ Corrigir nome</button>' +
    '<button class="btn green" id="go">✨ Está perfeito! Gerar</button></div></div>';
}
function viewDone() {
  const q = new URLSearchParams({ ...PARAMS, nome: st.name }).toString();
  const img = '/i/' + ID + '?' + q + '&_format=png';
  const pdf = '/i/' + ID + '?' + q + '&formato=pdf&_dl=1';
  return '<div class="card"><h2 id="doneh2">⏳ Gerando seu certificado...</h2>' +
    '<p class="lead" id="donelead">Isso pode levar alguns segundos. Aguarde...</p>' +
    '<div class="frame">' +
      '<div class="loading" id="loading"><div class="spinner"></div><span>Gerando seu certificado...</span></div>' +
      '<img id="certimg" src="' + img + '" alt="certificado" style="display:none" onload="onCertLoad()" onerror="onCertError()">' +
    '</div>' +
    '<a class="btn green disabled" id="pdfbtn" href="' + pdf + '" download>⬇ Baixar certificado em PDF</a></div>';
}

function onCertLoad() {
  var l = document.getElementById('loading'); if (l) l.style.display = 'none';
  var i = document.getElementById('certimg'); if (i) i.style.display = 'block';
  var h = document.getElementById('doneh2'); if (h) h.textContent = '🎉 Seu certificado está pronto!';
  var p = document.getElementById('donelead'); if (p) p.textContent = 'Confira abaixo e clique no botão para baixar.';
  var b = document.getElementById('pdfbtn'); if (b) b.classList.remove('disabled');
}
function onCertError() {
  var l = document.getElementById('loading');
  if (l) l.innerHTML = '<span style="color:#b91c1c">Não foi possível gerar agora. Recarregue a página e tente de novo.</span>';
  var h = document.getElementById('doneh2'); if (h) h.textContent = '😕 Ops...';
}

function showErr(msg) { const e = document.getElementById('err'); if (e) { e.textContent = msg; e.style.display = 'block'; } }

function wire() {
  const go = document.getElementById('go');
  const back = document.getElementById('back');
  if (back) back.onclick = () => { st.step -= 1; render(); };
  if (!go) return;

  if (st.step === 1) {
    const inp = document.getElementById('in-email');
    inp.onkeydown = (e) => { if (e.key === 'Enter') go.click(); };
    go.onclick = async () => {
      const email = inp.value.trim().toLowerCase();
      if (!email.includes('@')) return showErr('Digite um e-mail válido.');
      go.classList.add('spin'); go.textContent = 'Verificando...';
      try {
        const r = await fetch('/f/' + ID + '/check', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
        const d = await r.json();
        if (d.ok) { st.email = email; st.step = 2; render(); }
        else showErr('E-mail não encontrado na lista de inscritos. Verifique e tente de novo.');
      } catch { showErr('Erro ao verificar. Tente novamente.'); }
      finally { if (document.getElementById('go') === go) { go.classList.remove('spin'); go.textContent = 'Continuar →'; } }
    };
  } else if (st.step === 2) {
    const inp = document.getElementById('in-name');
    inp.focus();
    inp.onkeydown = (e) => { if (e.key === 'Enter') go.click(); };
    go.onclick = () => {
      const name = inp.value.trim();
      if (name.length < 2) return showErr('Digite seu nome completo.');
      st.name = name; st.step = 3; render();
    };
  } else if (st.step === 3) {
    go.onclick = async () => {
      go.classList.add('spin'); go.textContent = 'Gerando...';
      try {
        const r = await fetch('/f/' + ID + '/emit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: st.email, name: st.name, params: { ...PARAMS, nome: st.name } }) });
        const d = await r.json();
        if (d.ok) { st.step = 4; render(); }
        else showErr('Não foi possível gerar. ' + (d.error === 'email' ? 'E-mail não autorizado.' : 'Tente novamente.'));
      } catch { showErr('Erro ao gerar. Tente novamente.'); }
      finally { if (document.getElementById('go') === go) { go.classList.remove('spin'); go.textContent = '✨ Está perfeito! Gerar'; } }
    };
  }
}

render();
</script>
</body>
</html>`;
}
