// Renderizacao serverless: puppeteer-core + @sparticuz/chromium (Chromium que cabe na Vercel).
// Sem cache em disco (serverless nao tem disco persistente) -> cache via Cache-Control/CDN.
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
import { stageHTML } from './render-html.js';
import { DEVICE_SCALE } from './config.js';

const CONTENT_TYPE = { png: 'image/png', jpeg: 'image/jpeg', pdf: 'application/pdf' };

// serverless: sem stack grafica (WebGL) -> mais leve e estavel
chromium.setGraphicsMode = false;

// Se PUPPETEER_EXECUTABLE_PATH estiver setado, usamos um Chrome local (dev).
// Caso contrario, usamos o Chromium empacotado do @sparticuz (Vercel).
const LOCAL_CHROME = process.env.PUPPETEER_EXECUTABLE_PATH || '';

let browserPromise = null;
async function getBrowser() {
  if (!browserPromise) {
    browserPromise = puppeteer.launch({
      args: LOCAL_CHROME ? ['--no-sandbox', '--disable-dev-shm-usage'] : chromium.args,
      executablePath: LOCAL_CHROME || (await chromium.executablePath()),
      headless: LOCAL_CHROME ? true : chromium.headless,
      defaultViewport: null,
    });
  }
  return browserPromise;
}

export async function closeBrowser() {
  if (browserPromise) {
    const b = await browserPromise;
    await b.close();
    browserPromise = null;
  }
}

// Renderiza o template no formato pedido (png|jpeg|pdf). Retorna { buffer, contentType }.
export async function renderImage(tpl, values, format = 'png') {
  format = CONTENT_TYPE[format] ? format : 'png';
  const contentType = CONTENT_TYPE[format];

  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setViewport({
      width: tpl.width,
      height: tpl.height,
      deviceScaleFactor: format === 'pdf' ? 1 : DEVICE_SCALE,
    });
    await page.setContent(stageHTML(tpl, values), {
      waitUntil: 'networkidle0',
      timeout: 25000,
    });
    await page.evaluate(() => document.fonts.ready);

    let buffer;
    if (format === 'pdf') {
      buffer = await page.pdf({
        width: `${tpl.width}px`,
        height: `${tpl.height}px`,
        printBackground: true,
        pageRanges: '1',
        margin: { top: '0', right: '0', bottom: '0', left: '0' },
      });
    } else {
      const stage = await page.$('#stage');
      buffer = await stage.screenshot(
        format === 'jpeg' ? { type: 'jpeg', quality: 90 } : { type: 'png' }
      );
    }
    return { buffer, contentType };
  } finally {
    await page.close();
  }
}
