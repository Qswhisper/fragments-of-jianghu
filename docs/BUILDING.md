# 构建与资源

## 公开源码与大资源

源码仓库从当前 1.0 正式版开始；安装包放在 GitHub Releases，大资源不进入 Git 历史。

`runtime-assets.json` 固定了完整 PC 包的大小和 SHA256，以及各项外部资源的路径、大小和 SHA256。包括中文字体包、三首音乐的本地嵌入数据和全部既有运行素材。

资源工具需要 Python 3.11+：`npm run assets:setup -- --archive <完整PC包路径>`。自动下载时从 origin 识别 GitHub 仓库；也可显式传 `--repo OWNER/REPOSITORY`。可以通过进程环境 `KGAME_PYTHON` 指定 Python 可执行文件。

已有相同资源会跳过；已有不同内容会停止并保留本地修改。下载走公开 Release 的 HTTPS 地址，校验失败不安装。安装工具检查 ZIP 路径和目标路径中的链接，只提取清单中的资源，不覆盖源码。

资源本身不属于 MIT 代码授权范围；请参阅 THIRD_PARTY_NOTICES.md 和包内许可，不将其中的商业生成音效另做独立音效库分发。

## Web / PC

执行 `npm ci` 和资源安装后，直接打开 `play.html`。`index.html` 用于旧规则回归，完整旅程入口是 `play.html`。

`npm run build:release` 生成 `dist/web`。`npm run package:offline` 生成开发用离线包，位置由构建脚本输出。浏览器无需服务器即可运行完整离线游戏。

## 自动化验证

测试使用已安装的 Chrome，以无头、静音方式运行。`npm test` 检查规则和输入；`test:realistic` 检查战斗呈现；`test:journey` 检查旅程与存档；`test:paper-chain` 检查后续出牌、取消、费用、存读档及黄纸材质探针。测试使用隔离存档。

自动化、模拟器、真人听感和物理设备检查的范围不同。公开版本仍可能存在设备特定问题；受控黄纸绘制检查不等于覆盖所有 Android GPU。

## Android（当前构建工具面向 Windows）

需要 JDK 17+、Android SDK Platform 36 / Build Tools 36.0.0、Python 3.11+、Pillow。设置 `JAVA_HOME` 和 `ANDROID_HOME`，完成 `git init` 或正常克隆及资源准备后运行 `npm run package:android`。

公开代码保留 versionName=1.0、versionCode=100199，对应首个正式版基线；后续官方升级递增 versionCode，不为重命名清空存档。

官方签名私钥不会公开。构建工具会在本地受忽略的 `output/android-signing` 中建立独立签名；需要自有签名时可设置 `KGAME_SIGNING_DIRECTORY`。自行签名的包不能作为官方包的同签名覆盖升级。

本地 `.env*`、私钥、构建产物、依赖目录和缓存不得提交。复制新的资源清单或改变素材包时，应同时更新清单的路径、大小、SHA256 与 Release 附件，重新验证完整取回与运行。
