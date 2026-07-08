// Fontes disponiveis no editor E no renderizador (Chromium).
// Ambos carregam o MESMO link do Google Fonts -> a fonte sai identica.
// Para self-host / offline, troque por @font-face apontando para /uploads/fonts.

export const FONTS = [
  { family: 'Montserrat', weights: [400, 600, 700, 800] },
  { family: 'Poppins', weights: [400, 600, 700] },
  { family: 'Roboto', weights: [400, 700] },
  { family: 'Open Sans', weights: [400, 600, 700] },
  { family: 'Lato', weights: [400, 700, 900] },
  { family: 'Playfair Display', weights: [400, 700, 900] },
  { family: 'Merriweather', weights: [400, 700] },
  { family: 'EB Garamond', weights: [400, 500, 600] },
  { family: 'Cinzel', weights: [400, 600, 700] }, // otimo p/ certificados
  { family: 'Great Vibes', weights: [400] }, // assinatura / script
  { family: 'Dancing Script', weights: [400, 700] }, // script
];

// Monta a URL do Google Fonts com todas as familias/pesos.
export function googleFontsHref() {
  const families = FONTS.map((f) => {
    const name = f.family.replace(/ /g, '+');
    const weights = f.weights.join(';');
    return `family=${name}:wght@${weights}`;
  }).join('&');
  return `https://fonts.googleapis.com/css2?${families}&display=swap`;
}
