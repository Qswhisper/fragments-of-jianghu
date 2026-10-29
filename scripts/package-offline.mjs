import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { projectRoot, assertManagedPath, resetGeneratedDirectory } from './project-paths.mjs';

const execFileAsync = promisify(execFile);
const distWebRoot = path.join(projectRoot, "dist", "web");
const outputRoot = path.join(projectRoot, "output", "offline-package");
const bundleRoot = path.join(outputRoot, "KGame-offline");
const zipPath = path.join(outputRoot, "KGame-offline.zip");

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

async function writeReadme() {
  const metadata=JSON.parse(await fs.readFile(path.join(bundleRoot,'release.json'),'utf8'));
  const lines = [
    "KGame 离线试玩包 / Offline package",
    "版本 / Version: "+(metadata.releaseVersion||metadata.version),
    "",
    "1. 解压整个 ZIP 后，用 Chrome（或 Edge）打开 play.html，进入四流派五卷旅程。",
    "2. 无需安装或启动本地服务器；请保留包内文件和目录结构。",
    "3. 进度自动保存在该浏览器的本地存储中。继续游玩时使用同一浏览器和文件位置。",
    "4. 菜单可调整音量、音乐、音效及战斗动画；浏览器要求交互时，点击游戏即可启用声音。",
    "5. index.html 是旧规则回归入口；完整游戏入口为 play.html。",
    "6. 音频许可与署名见 assets/audio/ATTRIBUTION.md；其他素材记录保留在相应 assets 子目录。",
    "7. 小范围试玩说明与空白记录表见 PLAYTEST.md。可以约 15 分钟停止，不要求通关。",
    "8. 配乐为用户选用的苍凉交锋（旅途 / 战斗 / 宿敌）；场景切换淡化，同角色续播，暂停菜单会暂停音乐。",
    "",
    "1. Use Chrome (or Edge) to open play.html for the full realistic journey. index.html retains the older rule baseline.",
    "2. Progress is saved in the browser localStorage for this local package path.",
    "3. If the browser blocks local autoplay, click once on the canvas to unlock audio.",
    "4. The package is fully static: no local server is required. Keep the extracted directory structure intact."
  ];

  await fs.writeFile(
    path.join(bundleRoot, "README-OFFLINE.txt"),
    lines.join("\r\n"),
    "utf8"
  );
}

async function createZipIfPossible() {
  if (process.platform !== "win32") {
    return false;
  }

  await assertManagedPath('output/offline-package/KGame-offline.zip');
  await fs.rm(zipPath, { force: true });
  let shell = path.join(process.env.LOCALAPPDATA || '', 'Microsoft', 'powershell', 'pwsh.exe');
  try { await fs.access(shell); } catch { shell = 'powershell.exe'; }
  await execFileAsync(shell, [
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-Command",
    "$ErrorActionPreference = 'Stop'; Add-Type -AssemblyName System.IO.Compression.FileSystem; [IO.Compression.ZipFile]::CreateFromDirectory($env:KGAME_BUNDLE_ROOT, $env:KGAME_ZIP_PATH)"
  ], { windowsHide: true, env: { ...process.env, KGAME_BUNDLE_ROOT: bundleRoot, KGAME_ZIP_PATH: zipPath } });
  return true;
}

async function main() {
  await fs.stat(distWebRoot);
  await resetGeneratedDirectory('output/offline-package/KGame-offline');
  await fs.mkdir(outputRoot, { recursive: true });
  await copyEntry(distWebRoot, bundleRoot);
  await fs.copyFile(path.join(projectRoot,'docs/PLAYTEST-KIT.md'),path.join(bundleRoot,'PLAYTEST.md'));
  await writeReadme();
  const zipped = await createZipIfPossible();

  console.log(`Offline package ready at ${bundleRoot}`);
  if (zipped) {
    console.log(`Offline zip ready at ${zipPath}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
