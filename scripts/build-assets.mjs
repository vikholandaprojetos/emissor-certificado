// Embute os arquivos de webui/ em src/webui-assets.js (base64).
// Rode sempre que editar webui/*: npm run build:assets
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const b = (p) => fs.readFileSync(path.join(ROOT, p)).toString('base64');

const out = `// GERADO automaticamente a partir de webui/. Nao edite a mao.
// Para regenerar: npm run build:assets
const dec = (s) => Buffer.from(s, 'base64').toString('utf8');
export const ASSETS = {
  index: dec('${b('webui/index.html')}'),
  css: dec('${b('webui/style.css')}'),
  js: dec('${b('webui/editor.js')}'),
};
`;

fs.writeFileSync(path.join(ROOT, 'src/webui-assets.js'), out);
console.log('src/webui-assets.js gerado.');
