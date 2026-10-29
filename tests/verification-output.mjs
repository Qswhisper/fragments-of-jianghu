import fs from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {fileURLToPath, pathToFileURL} from 'node:url';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const evidenceRoot = path.join(projectRoot, 'output', 'verification');

export async function createVerificationOutput(scope, explicit) {
  if (!/^[a-z0-9-]+$/i.test(scope)) throw new Error('Invalid verification scope');
  const parent = process.env.KGAME_VERIFICATION_ROOT;
  const target = path.resolve(projectRoot, explicit || (parent
    ? path.join(parent, scope)
    : path.join(evidenceRoot, `${scope}-${new Date().toISOString().slice(0,10).replaceAll('-','')}-${randomUUID().slice(0,8)}`)));
  const relative = path.relative(evidenceRoot, target);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('Evidence must be a new directory inside output/verification');
  }
  await fs.mkdir(path.dirname(target), {recursive:true});
  // A reused directory is an error, even when empty. Never erase earlier evidence.
  await fs.mkdir(target);
  console.log(`Verification evidence: ${target}`);
  return pathToFileURL(target + path.sep);
}
