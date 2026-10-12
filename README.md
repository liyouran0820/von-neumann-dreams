# von-neumann-dreams 🧠☕

本文件负责项目入口和文档导航。续写时更新入口、运行方式和当前阶段，详细玩法写入设计方案，变更经过写入 `log.md`。

> 仓库名冯·诺依曼的梦😁，队员成分不明、身份不明，最终以比赛结束时的发量和穿搭为准（bushi

## 午夜学院 · 夜校协议

当前阶段：已整合最终推荐方案 v1，等待机制原型验证。采用先机制、后关卡的设计顺序；仓库目前包含设计文档，尚无游戏实现。

当前方向：The Midnight Academy 选题下的编程解谜小游戏。编程是主要操控方式：玩家编排纸灵的行为规则，由程序完成移动、取样和连接，让程序与建筑相互影响；透镜与可恢复的直接试验辅助理解。

## 文档

- [docs/FINAL_GAME_PLAN.md](docs/FINAL_GAME_PLAN.md)：当前最终推荐方案，统一核心机制、执行规则、关卡目标和首版范围。
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
