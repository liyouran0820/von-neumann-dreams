# von-neumann-dreams 🧠☕

本文件负责项目入口、文档导航和运行方式。续写保持当前状态准确；完整规则放入设计方案，实际检查放入 Demo 文档，变更写入 `log.md`。

> 仓库名冯·诺依曼的梦😁，队员成分不明、身份不明，最终以比赛结束时的发量和穿搭为准（bushi

## 午夜学院 · 映射实验

当前为可玩的刻轨映射 Demo：**走路、推拉、连接两个纹章，让物件沿各自刻轨一起变化。** 保留朋友稿的中央庭院、两个实验台和全部五道谜题。先用直接操控验证机制，旧编程玩法保存于 Git。

从“从实验台开始”进入，学馆全部开放。点地面走路，点金色手印或同名按钮走近并抓住，沿箭头推 / 反向拉；点两个青色纹章连接，结束映射后继续移动。点击现有连线可以断开。撤回恢复完整状态，重来恢复当前场景。

键盘：方向键 / WASD 走路和推拉，E 抓 / 放，M 编辑映射，Z 撤回。提示按需打开。

## 运行与检查

需要 Node.js 20 或更新版本，无第三方运行依赖。

```bash
npm run dev
```

打开 [本地 Demo](http://127.0.0.1:5173/)。按 `Ctrl+C` 停止服务。服务只监听本机；端口占用可用 `DEMO_PORT=5174 npm run dev`。

```bash
npm test
npm run verify:puzzles
npm run build
```

40 项规则检查通过，五题参考与部分替代路线成立；五题也通过本地浏览器的实际操作验收。此结果不代表独立玩家趣味测试。

构建生成 `dist/index.html`，脚本、样式、图标和许可全部内联，不请求外部资源。构建产物由 `.gitignore` 排除。当前浏览器检查使用本地 HTTP，离线打开与断网验收未完成。

这是二维浅立体白盒原型。导环与桥支撑使用简化约束，完整三维碰撞与最终美术仍待制作。完整边界见 Demo 文档。

## 文档

- [docs/FINAL_GAME_PLAN.md](docs/FINAL_GAME_PLAN.md)：当前玩法契约、五题与参赛表达。
- [docs/MAPPING_DEMO.md](docs/MAPPING_DEMO.md)：实际范围、操作、检查与白盒简化。
- [docs/sources/The-Midnight-Academy-Correspondence-Design.md](docs/sources/The-Midnight-Academy-Correspondence-Design.md)：批准的朋友稿完整来源快照。
- [docs/sources/夜白映射_五关关卡设计.md](docs/sources/夜白映射_五关关卡设计.md)：用户明确只留作参考的双世界五关稿，不属于当前规则。
- [PROJECT_INTRODUCTION.md](PROJECT_INTRODUCTION.md)：项目背景、来源和范围。
- [docs/MECHANIC_EXPLORATION.md](docs/MECHANIC_EXPLORATION.md)：机制候选、后果与淘汰经过。
- [docs/DEMO_V1.md](docs/DEMO_V1.md)：首版亮暗符印原型历史。
- [docs/DEMO_V2.md](docs/DEMO_V2.md)：已弃用的指令交换试验历史。
- [docs/NIGHT_SCHOOL_PROTOCOL_DESIGN.md](docs/NIGHT_SCHOOL_PROTOCOL_DESIGN.md)：早期合并构思历史草案。
- [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)：Lucide 图标来源与许可。
- [AGENTS.md](AGENTS.md)：协作方式、文档职责和续写约定。
- [log.md](log.md)：实际修改与检查记录。

用户明确要求忽略后续 `夜白映射_PRD.md`，本版继续采用单世界刻轨映射稿。

## Git

远程：[liyouran0820/von-neumann-dreams](https://github.com/liyouran0820/von-neumann-dreams)。当前分支 `codex/correspondence-demo`；首版 `eb63a22`、旧交换试验 `480d261` 均保留。`main` 跟踪 `origin/main`；设计历史在 `codex/design-history`，原整合分支为 `codex/integrate-design-plan`。

本轮远程更新因连接超时未取得新状态，未推送。后续合并前需重新获取远程。阶段改动审查后本地提交，使用 `codex/` 分支前缀。

## 欢迎来到我们的编程马拉松仓库喵

### 喵喵

如果你分不清一段代码是 AI 写的，还是队友熬夜写的——

恭喜，测试成功。

如果连作者本人都分不清这段代码为什么能跑——

恭喜，项目进入哲学阶段。

**愿我们的程序终止，愿我们的梦想不终止。**

*希望codex额度能撑到比赛结束喵🐱*
