# Windows 完整安装包

Windows x64，内含 Electron 运行环境，无需另装浏览器。

## 构建

需要 Node.js 20+、Python 3.11+ 和 Pillow（`python -m pip install Pillow`）。先生成完整离线目录，再运行：

```sh
npm ci --prefix desktop
npm run package:windows -- --game-dir output/offline-package/KGame-offline
```

当前本地正式 PC 目录可直接用 `npm run package:windows`。每次构建使用新输出目录；运行时与工具版本由锁文件固定。

## 存档与许可

存档位于 `%APPDATA%/FragmentsOfJianghu`，协议固定为 `jianghu://game`，与浏览器版和安卓独立。安装包不自动更新，默认不作数字签名。

[封装依赖许可](THIRD_PARTY_NOTICES.md)；游戏素材遵循项目的第三方声明。

## 检查

`npm run test:windows` 检查资源协议；`node tests/windows-app.mjs --exe <实际EXE> --cinematic` 使用隐藏窗口和隔离存档检查出牌、剧情、结算与续档。
