// Landing publica servida em "/" pela funcao Express.
export const LANDING_HTML = `<!doctype html>
<html lang="pt-br">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Emissor de Certificados</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800&family=Cinzel:wght@600;700&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Montserrat', system-ui, sans-serif;
      min-height: 100vh;
      display: flex; align-items: center; justify-content: center;
      padding: 24px; color: #e6e8ec;
      background: radial-gradient(1200px 600px at 50% -10%, #16223b 0%, #0b0f17 55%, #080a10 100%);
    }
    .card {
      max-width: 560px; width: 100%; text-align: center;
      background: rgba(26, 29, 36, .6); border: 1px solid #262b35;
      border-radius: 20px; padding: 48px 40px; backdrop-filter: blur(6px);
      box-shadow: 0 20px 60px rgba(0, 0, 0, .45);
    }
    .badge {
      display: inline-block; font-size: 12px; letter-spacing: 2px; text-transform: uppercase;
      color: #e8c877; border: 1px solid rgba(232, 200, 119, .35);
      border-radius: 999px; padding: 6px 14px; margin-bottom: 22px;
    }
    h1 {
      font-family: 'Cinzel', serif; font-size: 34px; line-height: 1.15; margin-bottom: 14px;
      background: linear-gradient(90deg, #f4dfa0, #e8c877);
      -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
    }
    p.lead { color: #aab2c0; font-size: 16px; line-height: 1.6; margin-bottom: 30px; }
    .btn {
      display: inline-block; background: #e8c877; color: #1a1206; font-weight: 700;
      text-decoration: none; padding: 13px 26px; border-radius: 10px;
      transition: transform .12s ease, box-shadow .12s ease;
    }
    .btn:hover { transform: translateY(-2px); box-shadow: 0 10px 24px rgba(232, 200, 119, .28); }
    .features { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; margin-top: 30px; }
    .chip { font-size: 13px; color: #8b93a1; border: 1px solid #262b35; border-radius: 8px; padding: 7px 12px; }
    footer { margin-top: 28px; font-size: 12px; color: #5b6472; }
  </style>
</head>
<body>
  <div class="card">
    <span class="badge">Imagens dinâmicas via URL</span>
    <h1>Emissor de Certificados</h1>
    <p class="lead">
      Gere certificados e imagens personalizadas automaticamente — cada pessoa
      recebe a sua, com o nome preenchido pela URL. Ideal para e-mails e eventos.
    </p>
    <a class="btn" href="/admin/">Abrir painel &rarr;</a>
    <div class="features">
      <span class="chip">Editor visual</span>
      <span class="chip">PNG · JPG · PDF</span>
      <span class="chip">Parâmetros na URL</span>
    </div>
    <footer>Acesso ao painel é restrito.</footer>
  </div>
</body>
</html>`;
