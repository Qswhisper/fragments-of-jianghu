# 江湖残卷 · Fragments of Jianghu

晚清背景的单机武侠卡牌构筑游戏。四种流派，五卷路线；取舍招式与旧物，再遇记得你招式的宿敌。

## 下载

[最新版本](https://github.com/Qswhisper/fragments-of-jianghu/releases/latest)：Windows 完整离线安装包、Android APK、PC 浏览器离线 ZIP。

Android 8+；Windows 为 x64。浏览器版解压完整目录，用 Chrome 或 Edge 打开 `play.html`。

存档保存在本机，三种入口各自独立。安卓用原签名包覆盖升级；浏览器保持原文件路径。卸载或清除数据会删除进度。

## 从源码运行

需要 Node.js 20+、Python 3.11+。大资源从完整 PC 包恢复，并按 SHA256 校验：

```sh
npm ci
npm run assets:setup
```

然后打开 `play.html`。检查用 `npm test`；[构建说明](docs/BUILDING.md) · [更新记录](docs/RELEASE_NOTES.md)。

## 许可

原创代码采用 [MIT](LICENSE)；美术、音乐与字体遵循[各自许可](THIRD_PARTY_NOTICES.md)。
