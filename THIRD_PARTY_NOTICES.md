# 素材与第三方声明

MIT 仅适用于本仓库的原创程序代码，不自动覆盖图像、录音、音乐、字体和截图。完整游戏包保留现有来源、许可全文、署名与加工记录；取回资源后可在以下路径查看。

| 类别 | 来源与条件 | 包内记录 |
| --- | --- | --- |
| 中文字体 | 霞鹜文楷、Noto Serif SC、Noto Sans SC；SIL OFL 1.1，衍生字体已重命名 | `assets/fonts/SOURCE.md`、`*-OFL.txt`、`manifest.json` |
| 既有实录音效 | 各原作者的 CC0、OGA-BY、CC-BY 等许可；保留必需署名和许可文本 | `assets/audio/ATTRIBUTION.md`、各音效目录的 manifest 与 licenses |
| 新生成物理音效 | ElevenLabs，制作记录注明生成时使用付费计划；随游戏组合使用，不能将此游戏资源当作独立音效库再分发 | `assets/audio/sfx/*/SOURCE.md`、manifest 与 terms 快照 |
| 三首配乐 | 用户提供的 Suno《苍凉交锋·旅途／战斗／宿敌》；作者于2026-10-29明确确认三首均为其付费会员期作品，并有权随游戏公开分发 | `assets/audio/music/suno-weathered-v1/manifest.json` 与下述补充 |
| 游戏美术与截图 | 项目制作的生成/加工美术及现有历史参考；原来源与相关第三方授权继续适用，不另行承诺排他著作权或通用素材授权 | 资源包内对应来源记录；素材不适用代码 MIT |

Suno 的补充确认晚于既有 manifest 的“本地采用”记录，旧 manifest 保持原字节。本次确认不等同于对纯 AI 内容的排他版权保证，也不会把音乐改标成 Creative Commons。歌曲原件、账户凭据与付费资料不进入公开源码仓库。

部分历史参考与制作原件仅保留在作者的本地制作工作区；它们不属于开发者运行游戏所需的公开下载内容。对独立素材再利用，请先逐项核对对应许可；MIT 不授予第三方商标、肖像、录音或音乐的额外权利。

安装包由本项目构建，运行时不要求连接 Gemini、ElevenLabs 或 Suno API。制作使用的 API 凭据和官方 Android 签名私钥均不随源码或安装包公开。
