import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const index = process.argv.indexOf('--entry');
if (index !== -1 && !process.argv[index + 1]) throw new Error('Missing --entry value');
const entry = path.resolve(root, index === -1 ? 'index.html' : process.argv[index + 1]);
const html = (await fs.readFile(entry, 'utf8')).replace(/<!--[\s\S]*?-->/g, '');
const sources = [...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["']/g)].map(match => match[1]);
if (!sources.length) throw new Error('No runtime scripts found');
for (const source of sources) {
  if (/^(?:[a-z]+:|\/\/)/i.test(source)) throw new Error(`Offline runtime must use local scripts: ${source}`);
  const filename = path.resolve(path.dirname(entry), source.split(/[?#]/)[0]);
  const code = await fs.readFile(filename, 'utf8');
  new vm.Script(code, { filename });
}
console.log(`Runtime syntax and script references passed: ${sources.length} scripts (${entry})`);
