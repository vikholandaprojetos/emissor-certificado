// Carrega arquivos de fonte (WOFF) para o Satori, a partir do fontsource via jsDelivr.
// Satori aceita TTF/OTF/WOFF (nao WOFF2). Cache em memoria entre invocacoes quentes.

const PKG = {
  'Montserrat': 'montserrat',
  'Poppins': 'poppins',
  'Roboto': 'roboto',
  'Open Sans': 'open-sans',
  'Lato': 'lato',
  'Playfair Display': 'playfair-display',
  'Merriweather': 'merriweather',
  'EB Garamond': 'eb-garamond',
  'Cinzel': 'cinzel',
  'Great Vibes': 'great-vibes',
  'Dancing Script': 'dancing-script',
};

const cache = new Map();

async function fetchWoff(pkg, weight, style) {
  const key = `${pkg}-${weight}-${style}`;
  if (cache.has(key)) return cache.get(key);
  const url = `https://cdn.jsdelivr.net/npm/@fontsource/${pkg}@5/files/${pkg}-latin-${weight}-${style}.woff`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`font ${key}: HTTP ${res.status}`);
  const data = await res.arrayBuffer();
  cache.set(key, data);
  return data;
}

// Tenta o peso/estilo pedido; cai para 400 normal do mesmo pacote se faltar.
async function loadOne(family, weight, style) {
  const pkg = PKG[family] || 'montserrat';
  try {
    return await fetchWoff(pkg, weight, style);
  } catch {
    try { return await fetchWoff(pkg, 400, 'normal'); }
    catch { return null; }
  }
}

export async function loadFonts(elements) {
  const wanted = new Map();
  for (const el of elements || []) {
    const family = el.fontFamily || 'Montserrat';
    const weight = el.fontWeight || 400;
    const style = el.fontStyle === 'italic' ? 'italic' : 'normal';
    wanted.set(`${family}|${weight}|${style}`, { family, weight, style });
  }
  // fallback garantido: Satori precisa de pelo menos uma fonte
  wanted.set('Montserrat|400|normal', { family: 'Montserrat', weight: 400, style: 'normal' });

  const fonts = [];
  for (const { family, weight, style } of wanted.values()) {
    const data = await loadOne(family, weight, style);
    if (data) fonts.push({ name: family, data, weight, style });
  }
  return fonts;
}
