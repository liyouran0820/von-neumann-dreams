# von-neumann-dreams 🧠☕

本文件负责项目入口、文档导航与运行方式。续写保持当前状态准确；完整规则进入设计方案，检查进入 Demo 文档，变更进入 `log.md`。

> 仓库名冯·诺依曼的梦😁，队员成分不明、身份不明，最终以比赛结束时的发量和穿搭为准（bushi

## 午夜学院 · 夜白映射

当前按用户的开发计划 v1.2 迁移到 **Godot 4.7.2 / Forward+ / Metal / macOS arm64**。P00 原生启动、测试运行器与干净导出已通过；原生五关玩法、完整视觉和真人验收尚未完成。

当前分支 `codex/godot-plan-v1-2`。进度以 [原生状态](docs/NATIVE_DEMO_STATUS.md)、[差距审查](docs/requirements_gap_analysis.md) 和 [验收登记](docs/acceptance/registry.json) 为准，旧网页结果不转标原生通过。

## 原生运行与验证

锁定编辑器与同版本模板；参数、设备及实际证据见 [验收基线](docs/acceptance_baseline.md)。完整命令见 [原生状态](docs/NATIVE_DEMO_STATUS.md)。当前可运行的原生包只是 P00 空工程。

```bash
export DEMO_GODOT_BIN="/path/to/Godot.app/Contents/MacOS/Godot"
"$DEMO_GODOT_BIN" --path .
python3 tools/verify.py --stage P00 --engine "$DEMO_GODOT_BIN" --window-probe --report-dir artifacts/acceptance/P00
```

没有独立导出证据时，以上阶段报告会保留未执行项。只有全部必需检查通过才能记 PASS；空套件和未来能力不伪装通过。构建从已提交的干净源码归档产生，详情见原生状态文档。

## 历史网页试验

网页五关保存在 `66fb648`，Three.js 双世界立体呈现试验保存在 `74ab81d`。现有 [本地网页预览](http://127.0.0.1:5173/) 可作对照，采用旧离散规则及 V 观察，不是新计划的原生交付。

```bash
npm ci
npm run dev
npm test
npm run build
```

Node.js 20+；Three.js 与 esbuild 版本锁定，无运行时 CDN。构建输出保持 Git 忽略。该网页呈现版本未完成全关视觉验收；详见 [网页试验记录](docs/WEB_DIORAMA_WIP.md)。

## 需求与文档

- [三份原始来源](docs/sources/native_v1.2/SOURCES.md)：PRD 定规则，五关稿定内容，开发计划定技术和验收。
- [source_manifest.json](docs/source_manifest.json)：来源哈希、旧原图身份与用户批准的新视觉基线。
- [NATIVE_DEMO_STATUS.md](docs/NATIVE_DEMO_STATUS.md)：当前阶段、实际运行与验证范围。
- [requirements_gap_analysis.md](docs/requirements_gap_analysis.md)：可复用、需补齐、需迁移和外部条件。
- [acceptance_baseline.md](docs/acceptance_baseline.md)：冻结参数、证据格式与状态语义。
- [PROJECT_INTRODUCTION.md](PROJECT_INTRODUCTION.md)：背景、历史和当前范围。
- [AGENTS.md](AGENTS.md)：协作与文档边界；[log.md](log.md)：实际变更和检查。
- [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)：已用依赖与素材许可。

五关不能改图、目标、出口或启用 G5 备用简化来通过验收。真实玩家尚未安排，工程/关卡/前端/玩法理解分别报告。

## Git

远程：[liyouran0820/von-neumann-dreams](https://github.com/liyouran0820/von-neumann-dreams)。本轮获取成功，远程 `main` 仍为 `49eebbe`，没有新的远程提交需要整合。只做本地阶段提交，未推送、合并或发布。

旧刻轨版本 `f4705f7`、指令交换 `480d261`、首版 `eb63a22` 和设计历史均保留。缓存、SDK、导出包和完整录像 / 日志进入 Git 忽略目录。

## 欢迎来到我们的编程马拉松仓库喵

### 喵喵

如果你分不清一段代码是 AI 写的，还是队友熬夜写的——

恭喜，测试成功。

如果连作者本人都分不清这段代码为什么能跑——

恭喜，项目进入哲学阶段。

**愿我们的程序终止，愿我们的梦想不终止。**

*希望codex额度能撑到比赛结束喵🐱*
