# Deploy na Vercel (com domínio no Cloudflare)

## Como está montado

| Rota | O que é | Acesso |
|---|---|---|
| `/admin/` | Editor visual (estático) | **Protegido** (Edge Middleware) |
| `/api/*` | API de templates/upload | **Protegido** (Edge Middleware) |
| `/i/:id?name=...` | Imagem/PDF dinâmico | **Público** (necessário p/ e-mail) |

- **Renderização**: `puppeteer-core` + `@sparticuz/chromium` (Chromium serverless).
- **Storage**: Vercel Blob (templates em JSON + imagens de fundo).
- **Senha**: Edge Middleware (`middleware.js`) protege `/admin` e `/api`.

---

## Passo a passo

### 1. Subir o código pro GitHub
```bash
git init && git add . && git commit -m "gerador de imagens"
# crie um repo no GitHub e:
git remote add origin git@github.com:SEU_USER/SEU_REPO.git
git push -u origin main
```

### 2. Importar na Vercel
- vercel.com > **Add New > Project** > importe o repositório.
- Framework Preset: **Other** (deixe como está; o `vercel.json` cuida do resto).
- **Não** faça o deploy final ainda — configure o storage e as envs antes (passos 3 e 4).

### 3. Conectar o Vercel Blob (storage)
- No projeto: aba **Storage > Create Database > Blob > Create**.
- Conecte ao projeto. Isso cria a env **`BLOB_READ_WRITE_TOKEN`** automaticamente.

### 4. Definir a senha do painel
- **Settings > Environment Variables**, adicione:
  - `ADMIN_USER` = seu usuário
  - `ADMIN_PASS` = uma senha forte
- (Opcional) `DEVICE_SCALE` = `2`

### 5. Deploy
- **Deployments > Redeploy** (ou o primeiro deploy).
- Acesse `https://SEU-PROJETO.vercel.app/admin/` → o navegador vai pedir usuário/senha.

---

## Domínio no Cloudflare

1. Na Vercel: **Settings > Domains > Add** → digite `certificados.seudominio.com`.
   A Vercel mostra o registro a criar.
2. No **Cloudflare > DNS > Records**, adicione:
   - **Type**: `CNAME`
   - **Name**: `certificados` (o subdomínio)
   - **Target**: `cname.vercel-dns.com`
   - **Proxy status**: **DNS only** (nuvem CINZA) — recomendado, deixa a Vercel gerenciar o SSL.
3. Volte na Vercel e aguarde o domínio validar (fica "Valid Configuration").

> **Se preferir manter o proxy do Cloudflare (nuvem laranja):** vá em
> **SSL/TLS > Overview** e use o modo **Full (strict)**. Sem isso, dá loop de redirect.
> Na dúvida, use **DNS only** (cinza) — é o caminho sem dor.

---

## Testar
- `https://certificados.seudominio.com/admin/` → cria template, sobe fundo, posiciona texto.
- URL da imagem: `https://certificados.seudominio.com/i/<id>?name=Fulano`
- PDF: acrescente `&_format=pdf` (ou `&_format=pdf&_dl=1` p/ baixar).

## Limitações e cuidados na Vercel
- **Cold start**: a primeira imagem após um tempo ocioso demora ~2–5s (o Chromium precisa subir).
  As próximas são rápidas e a Vercel cacheia a imagem na CDN (`Cache-Control`).
- **Timeout**: `maxDuration` está em 60s (`vercel.json`). Suficiente, mas fique de olho.
- **Upload até ~4.5MB**: limite de body das funções da Vercel. Certificado em PNG/JPG normal cabe.
- **A imagem `/i/` é pública**: quem tiver o link pode trocar `?name=`. Se quiser impedir
  (URLs assinadas com HMAC), peça — dá pra adicionar.
