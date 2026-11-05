const path = require('node:path');
const output = process.env.KGAME_WINDOWS_OUTPUT;
const resources = process.env.KGAME_WINDOWS_RESOURCES;
const gameSource = process.env.KGAME_WINDOWS_GAME_SOURCE;
if (!output || !path.isAbsolute(output)) throw new Error('Build through scripts/build-windows.mjs with a fresh absolute output path.');
if (!resources || !path.isAbsolute(resources)) throw new Error('Missing prepared build resources.');
if (!gameSource || !path.isAbsolute(gameSource)) throw new Error('Missing prepared game directory.');
module.exports = {
  appId: 'com.kgame.jianghu.desktop',
  productName: '江湖残卷',
  electronVersion: '45.1.0',
  asar: true,
  compression: 'normal',
  directories: {output, buildResources: resources},
  files: ['app/**/*', 'package.json'],
  extraResources: [
    {from: gameSource, to: 'game', filter: ['**/*']},
    {from: path.join(resources,'game-manifest.json'), to: 'game-manifest.json'},
    {from: '../LICENSE', to: 'GAME-LICENSE.txt'},
    {from: '../THIRD_PARTY_NOTICES.md', to: 'GAME-THIRD-PARTY-NOTICES.md'},
    {from: 'THIRD_PARTY_NOTICES.md', to: 'DESKTOP-THIRD-PARTY-NOTICES.md'}
  ],
  win: {
    target: [{target: 'nsis', arch: ['x64']}],
    executableName: '江湖残卷',
    icon: path.join(resources,'icon.ico'),
    forceCodeSigning: false
  },
  nsis: {
    artifactName: '江湖残卷_1.0正式版_Windows安装.exe',
    oneClick: false,
    perMachine: false,
    allowElevation: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    deleteAppDataOnUninstall: false,
    installerLanguages: ['zh_CN'],
    displayLanguageSelector: false,
    runAfterFinish: true
  },
  publish: null
};
