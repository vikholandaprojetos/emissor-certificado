// Pagina publica de visualizacao: mostra a imagem gerada + botao de download.
// Ex.: /view/:id?nome=Victor  ->  exibe /i/:id?nome=Victor e um botao Baixar.
function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

export function viewPage(id, qs, name) {
  const q = qs ? '?' + qs : '';
  const sep = qs ? '&' : '?';
  // Sempre PNG para EXIBIR (um <img> nao renderiza PDF, so imagem).
  const imgUrl = `/i/${id}${q}${sep}_format=png`;
  const dlUrl = `/i/${id}${q}${sep}_format=png&_dl=1`;
  const pdfUrl = `/i/${id}${q}${sep}_format=pdf&_dl=1`;
  return `<!doctype html>
<html lang="pt-br">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(name || 'Certificado')}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700&family=Cinzel:wght@700&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Montserrat', system-ui, sans-serif; color: #e6e8ec; min-height: 100vh;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 22px; padding: 28px;
      background: radial-gradient(1200px 600px at 50% -10%, #16223b 0%, #0b0f17 55%, #080a10 100%);
    }
    h1 { font-family: 'Cinzel', serif; font-size: 20px; color: #e8c877; text-align: center; }
    .frame {
      max-width: 100%; border-radius: 12px; overflow: hidden;
      box-shadow: 0 20px 60px rgba(0,0,0,.5); border: 1px solid #262b35; background: #0b0d10;
    }
    .frame img { display: block; max-width: 100%; height: auto; }
    .btn {
      display: inline-flex; align-items: center; gap: 8px;
      background: #e8c877; color: #1a1206; font-weight: 700; text-decoration: none;
      padding: 13px 26px; border-radius: 10px; font-size: 15px;
      transition: transform .12s ease, box-shadow .12s ease;
    }
    .btn:hover { transform: translateY(-2px); box-shadow: 0 10px 24px rgba(232,200,119,.28); }
    .btn.ghost { background: transparent; color: #e8c877; border: 1px solid rgba(232,200,119,.5); }
    .btn.ghost:hover { box-shadow: none; background: rgba(232,200,119,.08); }
    .actions { display: flex; gap: 12px; flex-wrap: wrap; justify-content: center; }
    .hint { color: #8b93a1; font-size: 13px; }
  </style>
</head>
<body>
  <h1>${esc(name || 'Seu certificado')}</h1>
  <div class="frame"><img src="${esc(imgUrl)}" alt="${esc(name || 'certificado')}"></div>
  <div class="actions">
    <a class="btn" href="${esc(dlUrl)}" download>⬇ Baixar imagem</a>
    <a class="btn ghost" href="${esc(pdfUrl)}" download>⬇ Baixar PDF</a>
  </div>
  <div class="hint">Clique para salvar em alta resolução.</div>
</body>
</html>`;
}
