import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const projectRoot = fileURLToPath(new URL('../', import.meta.url));

export function projectPath(relative) {
  const target = path.resolve(projectRoot, relative);
  const inside = path.relative(projectRoot, target);
  if (!inside || inside === '..' || inside.startsWith(`..${path.sep}`) || path.isAbsolute(inside)) {
    throw new Error(`Expected a path inside the project: ${relative}`);
  }
  return target;
}

// Never remove a generated directory through a symlink or junction.
export async function assertManagedPath(relative) {
  const target = projectPath(relative);
  for (let current = target; current !== path.resolve(projectRoot); current = path.dirname(current)) {
    try {
      const stat = await fs.lstat(current);
      if (stat.isSymbolicLink()) throw new Error(`Refusing generated path through a link: ${current}`);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
  return target;
}

export async function resetGeneratedDirectory(relative) {
  if (!['dist/web', 'output/offline-package/KGame-offline'].includes(relative)) {
    throw new Error(`Not a managed build directory: ${relative}`);
  }
  const target = await assertManagedPath(relative);
  await fs.rm(target, { recursive: true, force: true });
  await fs.mkdir(target, { recursive: true });
  return target;
}
