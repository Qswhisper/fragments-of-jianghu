import fs from "node:fs/promises";
import path from "node:path";
import {execFileSync} from 'node:child_process';
import { projectRoot, assertManagedPath, resetGeneratedDirectory } from './project-paths.mjs';
import {assertReleaseContent} from './release-content.mjs';

const distRoot = path.join(projectRoot, "dist");
const outputIndex=process.argv.indexOf('--output');
const explicitOutput=outputIndex<0?null:process.argv[outputIndex+1];
if(outputIndex>=0&&(!explicitOutput||!path.resolve(projectRoot,explicitOutput).startsWith(path.join(projectRoot,'output')+path.sep)))throw Error('Explicit release output must be a new directory inside output.');
const webRoot = explicitOutput?await assertManagedPath(explicitOutput):path.join(distRoot, "web");
const runtimeDirs = ["data", "systems", "render", "scenes", "assets"];
const runtimeFiles = ["play.html", "main.js", "THIRD_PARTY_NOTICES.md", "LICENSE",
  "art/realistic-combat/presentation.js", "art/realistic-combat/dynamics.js", "art/realistic-combat/journey.js"];

async function copyEntry(sourcePath, targetPath) {
  const stat = await fs.stat(sourcePath);

  if (stat.isDirectory()) {
    await fs.mkdir(targetPath, { recursive: true });
    const entries = await fs.readdir(sourcePath, { withFileTypes: true });

    for (const entry of entries) {
      await copyEntry(
        path.join(sourcePath, entry.name),
        path.join(targetPath, entry.name)
      );
    }
    return;
  }

  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.copyFile(sourcePath, targetPath);
}

async function writeReleaseMetadata() {
  const packageInfo = JSON.parse(await fs.readFile(path.join(projectRoot,'package.json'),'utf8'));
  let sourceRevision = null, sourceDirty = null;
  try {
    const options = {cwd:projectRoot,encoding:'utf8',windowsHide:true};
    sourceRevision = execFileSync('git',['-c','safe.directory='+projectRoot,'rev-parse','HEAD'],options).trim();
    sourceDirty = !!execFileSync('git',['-c','safe.directory='+projectRoot,'status','--porcelain'],options).trim();
  } catch { /* A copied source checkout can still build without Git. */ }
  const metadataPath = path.join(webRoot, "release.json");
  const metadata = {
    version: packageInfo.version,
    releaseVersion: packageInfo.releaseVersion || packageInfo.version,
    sourceRevision,
    sourceDirty,
    generatedAt: new Date().toISOString(),
    channel: "static-web",
    entry: "play.html",
    includesTestApi: false,
    sourceFiles: runtimeFiles,
    sourceDirs: runtimeDirs
  };

  await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2), "utf8");
}

async function main() {
  await assertReleaseContent(projectRoot);
  if(explicitOutput){await fs.mkdir(path.dirname(webRoot),{recursive:true});await fs.mkdir(webRoot);}
  else await resetGeneratedDirectory('dist/web');

  for (const fileName of runtimeFiles) {
    await copyEntry(
      path.join(projectRoot, fileName),
      path.join(webRoot, fileName)
    );
  }
  const entryPath=path.join(webRoot,'play.html');
  const entry=await fs.readFile(entryPath,'utf8');
  await fs.writeFile(entryPath,entry.replace('<script src="test-api.js"></script>',''));

  for (const dirName of runtimeDirs) {
    await copyEntry(
      path.join(projectRoot, dirName),
      path.join(webRoot, dirName)
    );
  }

  await writeReleaseMetadata();
  await assertReleaseContent(webRoot);
  console.log(`Release build ready at ${webRoot}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
