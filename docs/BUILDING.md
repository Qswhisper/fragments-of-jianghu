# 构建

Node.js 20+、Python 3.11+。自动检查使用系统 Chrome；不需要下载 Chromium。

```sh
npm ci
npm run assets:setup
# 已有完整 PC 包时：npm run assets:setup -- --archive /path/to/PC.zip
npm test
npm run test:narrative
npm run build:release
npm run package:offline
```

资源版本由 `runtime-assets.json` 固定；恢复工具不会覆盖源码或已修改的资源。

## Android

安装 JDK 17+、Android SDK 36 / Build Tools 36.0.0，配置 `JAVA_HOME` 与 `ANDROID_HOME`，再运行 `npm run package:android`。自行分发需使用自己的签名；仓库不提供原签名私钥。更换签名无法覆盖官方安装包。

## Windows

```sh
npm ci --prefix desktop
npm run package:windows -- --game-dir output/offline-package/KGame-offline
```

需先生成离线目录。EXE 自带 Electron 运行环境；默认构建不作数字签名。运行存档在 `%APPDATA%/FragmentsOfJianghu`，与浏览器版独立。封装细节见 [desktop/README](../desktop/README.md)。
