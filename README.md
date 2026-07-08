# Gerador de Imagens Dinâmicas (NiftyImages self-hosted)

Gera imagens dinâmicas via URL — ex.: `https://seu-dominio/i/<id>?name=victor` — com um
**editor visual** para montar o template: você sobe o fundo (certificado), posiciona os
textos arrastando e liga cada campo a um parâmetro da URL.

## Como funciona

- **Editor visual** (`/admin/`): sobe a imagem de fundo, adiciona textos, arrasta para o
  lugar (com guias de encaixe), escolhe fonte/cor/tamanho e define o **parâmetro de URL**.
- **Renderização**: Chromium (`puppeteer-core` + `@sparticuz/chromium`) fotografa o mesmo
  HTML/CSS do editor → o resultado sai idêntico (WYSIWYG). Também exporta **PDF**.
- **Endpoint público**: `GET /i/:id?param=valor` devolve o PNG/JPG/PDF (cacheado na CDN).

## Stack

- **Vercel** (Serverless Functions + Edge Middleware)
- **Vercel Blob** — storage de templates (JSON) e imagens de fundo
- **puppeteer-core + @sparticuz/chromium** — render/PDF
- **Express** — API, empacotada como função em `api/index.js`
- Admin em HTML/CSS/JS puro (`public/admin/`)

## Deploy

Veja **[VERCEL.md](VERCEL.md)** — passo a passo (Vercel Blob, senha do admin e domínio no Cloudflare).

## Uso

1. Abra `/admin/`, **+ Nova imagem** e suba o fundo do certificado.
2. **+ Adicionar texto**, arraste para o lugar, ajuste fonte/tamanho/cor.
3. No campo **Parâmetro de URL**, coloque `name`. Deixe vazio para texto fixo.
4. **Salvar**. Copie a URL — ex.: `/i/ab12cd34?name=victor`. PDF: `&_format=pdf`.

## Rodar local (opcional)

Precisa de: um Chrome instalado (`PUPPETEER_EXECUTABLE_PATH`) e um `BLOB_READ_WRITE_TOKEN`
(de um Blob Store da Vercel). Veja `.env.example`.

```bash
npm install
npm start   # http://localhost:3000/admin/
```

## Variáveis de ambiente

| Variável | Onde | Descrição |
|---|---|---|
| `ADMIN_USER` / `ADMIN_PASS` | Vercel | Senha do painel (vazio = sem senha) |
| `BLOB_READ_WRITE_TOKEN` | auto (Vercel Blob) | Acesso ao storage |
| `DEVICE_SCALE` | opcional | Resolução da imagem (2 = retina) |
| `PUPPETEER_EXECUTABLE_PATH` | local | Caminho do Chrome (só p/ rodar fora da Vercel) |

## Estrutura

```
api/index.js       entrada da Vercel (exporta a app Express)
middleware.js      Edge Middleware: Basic Auth em /admin e /api
vercel.json        rotas + memória/timeout da função
src/
  app.js           rotas da API + endpoint /i/:id
  renderer.js      Chromium serverless (screenshot/PDF)
  render-html.js   HTML da "stage" (fonte da renderização)
  store.js         Vercel Blob (templates + uploads)
  fonts.js         fontes disponíveis (Google Fonts)
public/admin/      editor visual
```
