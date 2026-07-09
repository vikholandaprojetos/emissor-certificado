// Pagina de login estilizada (substitui o popup nativo do Basic Auth).
export function loginPage(error = '') {
  return `<!doctype html>
<html lang="pt-br">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Entrar — Emissor de Certificados</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700&family=Cinzel:wght@700&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Montserrat', system-ui, sans-serif;
      min-height: 100vh; display: flex; align-items: center; justify-content: center;
      padding: 24px; color: #e6e8ec;
      background: radial-gradient(1200px 600px at 50% -10%, #16223b 0%, #0b0f17 55%, #080a10 100%);
    }
    .card {
      width: 100%; max-width: 380px;
      background: rgba(26,29,36,.7); border: 1px solid #262b35; border-radius: 18px;
      padding: 36px 30px; box-shadow: 0 20px 60px rgba(0,0,0,.45);
    }
    h1 { font-family: 'Cinzel', serif; font-size: 22px; text-align: center; margin-bottom: 4px; color: #e8c877; }
    p.sub { text-align: center; color: #8b93a1; font-size: 13px; margin-bottom: 24px; }
    label { display: block; font-size: 13px; color: #aab2c0; margin: 14px 0 6px; }
    input {
      width: 100%; padding: 11px 12px; border-radius: 9px;
      border: 1px solid #2c313b; background: #12151b; color: #e6e8ec; font: inherit;
    }
    input:focus { outline: none; border-color: #e8c877; }
    button {
      width: 100%; margin-top: 22px; padding: 12px; border: none; border-radius: 9px;
      background: #e8c877; color: #1a1206; font-weight: 700; font-size: 15px; cursor: pointer;
    }
    button:hover { filter: brightness(1.05); }
    .err { margin-top: 16px; background: rgba(239,68,68,.12); border: 1px solid rgba(239,68,68,.4);
           color: #fca5a5; padding: 9px 12px; border-radius: 9px; font-size: 13px; text-align: center; }
  </style>
</head>
<body>
  <form class="card" method="post" action="/admin/login">
    <h1>Emissor de Certificados</h1>
    <p class="sub">Acesso ao painel</p>
    <label for="username">Usuário</label>
    <input id="username" name="username" type="text" autocomplete="username" autofocus required>
    <label for="password">Senha</label>
    <input id="password" name="password" type="password" autocomplete="current-password" required>
    ${error ? `<div class="err">${error}</div>` : ''}
    <button type="submit">Entrar</button>
  </form>
</body>
</html>`;
}
