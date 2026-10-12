# von-neumann-dreams 🧠☕

本文件负责项目入口和文档导航。续写时更新入口、运行方式和当前阶段，详细玩法写入设计方案，变更经过写入 `log.md`。

> 仓库名冯·诺依曼的梦😁，队员成分不明、身份不明，最终以比赛结束时的发量和穿搭为准（bushi

## 午夜学院 · 夜校协议

当前阶段：第一版网页 Demo 已实现。三个短关卡验证记忆、实时依赖与共享状态；第一关先看三张卡运行，后续逐卡编辑、试验并调试。

当前方向：The Midnight Academy 选题下的编程解谜小游戏。玩家编排纸灵的条件行动规则，由程序完成移动、取样和连接，让程序与建筑相互影响。只按世界结果判定通关，接受有效的不同程序。

## 运行

需要 Node.js 20 或更新版本，无需安装第三方依赖。

```bash
npm run dev
```

打开 [本地 Demo](http://127.0.0.1:5173/)。按 `Ctrl+C` 停止预览。服务只监听本机；端口占用时可用 `DEMO_PORT=5174 npm run dev`。

```bash
npm test
npm run build
```

构建生成 `dist/index.html`，内联全部脚本和样式，不请求外部资源。构建产物由 `.gitignore` 排除。当前实际浏览器验收使用本地 HTTP 预览；离线文件打开和断网验收尚未完成。

第一关点击“开始第一关”观察运行。之后点击指令卡上的“修改”选择条件与动作，或用上移、下移调整优先级；“添加指令卡”扩展程序。“看一步”逐步执行，“查看连接”显示依赖。编辑后世界从起点重置，规则自动保存在当前浏览器。

## 文档

- [docs/FINAL_GAME_PLAN.md](docs/FINAL_GAME_PLAN.md)：当前最终推荐方案，统一核心机制、执行规则、关卡目标和首版范围。
- [docs/DEMO_V1.md](docs/DEMO_V1.md)：实际首版范围、操作方式、实现结构、验证结果与限制。
- [PROJECT_INTRODUCTION.md](PROJECT_INTRODUCTION.md)：项目目标、来源、讨论基础和范围。
- [docs/NIGHT_SCHOOL_PROTOCOL_DESIGN.md](docs/NIGHT_SCHOOL_PROTOCOL_DESIGN.md)：两份构思合并后的完整设计草案，含玩法、规则、关卡、原型范围和验证目标。
- [docs/MECHANIC_EXPLORATION.md](docs/MECHANIC_EXPLORATION.md)：机制设计流程、首个候选的规则推演、边界与验证目标。
- [AGENTS.md](AGENTS.md)：项目协作与文档维护规则。
- [log.md](log.md)：已发生的变更与检查记录。

当前设计以最终推荐方案为入口。地图、美术参数和实现细节可根据原型证据调整；建议规格与已实现、已验证的状态分别记录。

## Git

远程仓库：[liyouran0820/von-neumann-dreams](https://github.com/liyouran0820/von-neumann-dreams)。

- `main` 跟踪 `origin/main`，作为远程主分支的本地基线。
- `codex/integrate-design-plan` 整合远程 README 与本地设计文档。
- `codex/first-playable-demo` 开发第一版可玩原型。
- `codex/design-history` 保留连接远程前的本地设计提交历史。
- 后续工作使用 `codex/` 前缀分支，阶段改动经审查后提交；构建产物、安装包和本地配置通过 `.gitignore` 管理。

## 欢迎来到我们的编程马拉松仓库喵

### 喵喵

如果你分不清一段代码是 AI 写的，还是队友熬夜写的——

恭喜，测试成功。

如果连作者本人都分不清这段代码为什么能跑——

恭喜，项目进入哲学阶段。

**愿我们的程序终止，愿我们的梦想不终止。**

*希望codex额度能撑到比赛结束喵🐱*
