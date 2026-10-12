# von-neumann-dreams 🧠☕

本文件负责项目入口、文档导航与运行方式。续写保持当前状态准确；完整规则进入设计方案，检查进入 Demo 文档，变更进入 `log.md`。

> 仓库名冯·诺依曼的梦😁，队员成分不明、身份不明，最终以比赛结束时的发量和穿搭为准（bushi

## 午夜学院 · 夜白映射

当前为 GPT-6 Astra 制作的五关可玩灰盒，采用用户最新五关设计：**一次推动，两端独立受阻；真实状态留下，虚影依赖唯一映射。** 原刻轨版本保存为 `f4705f7`。

点真实物件预览 → 激活映射 → 左右推动。点地面 / WASD 走路；V 只切观察，站在 P1/P2 上按 F 穿门才改变身体世界。E 激活、Q 解除、方向键推动、Z 撤销，均有按钮。

五关全部可选，也能顺序继续。提示主动查看；桥上误解除可以撤销或恢复完整安全点。

## 运行与检查

需要 Node.js 20 或更新版本，无第三方运行依赖。

```bash
npm run dev
```

打开 [本地 Demo](http://127.0.0.1:5173/)。服务只监听本机，`Ctrl+C` 停止。端口占用可用 `DEMO_PORT=5174 npm run dev`。

```bash
npm test
npm run verify:puzzles
npm run build
```

23 项规则检查通过，五关参考与合法替代路线成立；五关已通过本地浏览器正常操作验收。没有独立新玩家趣味测试。

构建生成 `dist/index.html`，内联全部脚本、样式、图标与许可，不请求外部资源；产物保持 Git 忽略。当前浏览器验收用本地 HTTP，离线打开与断网验收未完成。

此版使用二维离散灰盒，优先检验完整五关、独立阻挡、支撑与恢复。完整美术、连续三维物理与音效不在本次实现内，实际边界见 Demo 文档。

## 文档

- [docs/FINAL_GAME_PLAN.md](docs/FINAL_GAME_PLAN.md)：当前双世界规则、五关与参赛表达。
- [docs/NIGHT_WHITE_DEMO.md](docs/NIGHT_WHITE_DEMO.md)：操作、实际验证与灰盒边界。
- [docs/sources/夜白映射_五关关卡设计.md](docs/sources/夜白映射_五关关卡设计.md)：当前批准的五关原文快照。
- [PROJECT_INTRODUCTION.md](PROJECT_INTRODUCTION.md)：背景、来源与当前范围。
- [docs/MECHANIC_EXPLORATION.md](docs/MECHANIC_EXPLORATION.md)：机制候选、后果与取舍经过。
- [docs/MAPPING_DEMO.md](docs/MAPPING_DEMO.md)：刻轨版 `f4705f7` 的历史实现与检查。
- [docs/DEMO_V2.md](docs/DEMO_V2.md)：指令交换试验 `480d261`。
- [docs/DEMO_V1.md](docs/DEMO_V1.md)：亮暗符印原型 `eb63a22`。
- [docs/NIGHT_SCHOOL_PROTOCOL_DESIGN.md](docs/NIGHT_SCHOOL_PROTOCOL_DESIGN.md)：早期构思历史草案。
- [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)：Lucide 图标来源与许可。
- [AGENTS.md](AGENTS.md)：协作、文档职责与续写约定。
- [log.md](log.md)：实际修改与检查记录。

## Git

远程：[liyouran0820/von-neumann-dreams](https://github.com/liyouran0820/von-neumann-dreams)。当前分支 `codex/night-white-demo`。原刻轨分支 `codex/correspondence-demo` 与旧试验均保留。`main` 跟踪 `origin/main`，原设计历史在 `codex/design-history`。

本轮远程更新连接超时，未取得更新后的远程状态，未推送；合并前需重新获取远程。阶段改动审查后本地提交，采用 `codex/` 分支前缀。

## 欢迎来到我们的编程马拉松仓库喵

### 喵喵

如果你分不清一段代码是 AI 写的，还是队友熬夜写的——

恭喜，测试成功。

如果连作者本人都分不清这段代码为什么能跑——

恭喜，项目进入哲学阶段。

**愿我们的程序终止，愿我们的梦想不终止。**

*希望codex额度能撑到比赛结束喵🐱*
