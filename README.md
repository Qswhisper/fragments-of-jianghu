# 江湖残卷 · Fragments of Jianghu

**1.0 正式版**

晚清背景的单机武侠卡牌构筑游戏。选择流派，在五卷江湖路线中取舍招式、旧物和遭遇，与留下恩怨的宿敌再次交手。

- 四种战斗流派，围绕各自体系组合招式。
- 支持点击出牌、拖拽选取目标和连续出牌。
- PC 浏览器离线游玩，另提供 Android 安装包。
- 存档保存在本机，无需登录。

这是第一个正式公开版本。仓库从当前版本建立首次提交。

## 下载与游玩

在 [Releases → v1.0](https://github.com/Qswhisper/fragments-of-jianghu/releases/tag/v1.0) 下载：

| 文件 | 用途 |
| --- | --- |
| `Fragments-of-Jianghu-1.0-Android.apk` | Android 8 及以上，横屏离线运行 |
| `Fragments-of-Jianghu-1.0-PC.zip` | 解压完整目录，用 Chrome 或 Edge 打开 `play.html` |

PC 请保持相同的浏览器、用户配置及游戏文件路径来继续存档。Android 使用官方同签名包覆盖升级可保留进度。清除浏览器数据、清除应用数据或卸载会影响本机存档；PC 和 Android 存档彼此独立。

战斗中可以点牌后点目标，也可以拖牌到目标；长按或悬停细读。暂停菜单可调整声音、播放速度与减弱动效。

## 从源码运行

仓库保存程序源码和构建工具。大资源通过完整 PC 游戏包获取，并按固定 SHA256 校验；仓库不包含制作原件、候选图库或开发历史。

需要 Node.js 20+、Python 3.11+，以及用于自动化检查的系统 Chrome。

```sh
npm ci
# 已下载 PC 包时可直接使用，文件名和所在位置不限：
npm run assets:setup -- --archive "/path/to/Fragments-of-Jianghu-1.0-PC.zip"
# 从已配置 origin 的 GitHub 克隆获取时，也可自动下载：
npm run assets:setup
```

然后用 Chrome 或 Edge 打开 `play.html`。资源安装工具只提取 `runtime-assets.json` 指定的资源，拒绝覆盖已经修改过的资源，也不会从 ZIP 覆盖程序源码。

```sh
npm test
npm run test:realistic
npm run test:journey
npm run test:paper-chain
npm run build:release
```

构建、Android 工具链和签名说明见 [BUILDING](docs/BUILDING.md)。

## 许可与来源

原创程序代码采用 [MIT License](LICENSE)。保留版权声明和许可文本后，可以使用、修改和再发布代码。

美术、音乐、音效、字体和游戏截图各自遵循 [素材与第三方声明](THIRD_PARTY_NOTICES.md)，不因代码采用 MIT 而自动改为 MIT。资源包保留了来源、许可全文及必要署名。

遇到问题可在本仓库提交 Issue，说明设备、下载版本、所在场景和重现步骤；请避免提交 API 密钥或个人存档信息。
