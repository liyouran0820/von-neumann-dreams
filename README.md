# von-neumann-dreams 🧠☕

本文件负责项目入口、文档导航与运行方式。续写保持当前状态准确；完整规则进入设计方案，检查进入 Demo 文档，变更进入 `log.md`。

> 仓库名冯·诺依曼的梦😁，队员成分不明、身份不明，最终以比赛结束时的发量和穿搭为准（bushi

## 午夜学院 · 夜白映射

当前按用户的开发计划 v1.2 迁移到 **Godot 4.7.2 / Forward+ / Metal / macOS arm64**。P00 原生启动、测试运行器与干净导出已通过；P01状态与几何模块已保存，81项模块检查通过。原生五关玩法、完整视觉和真人验收尚未完成。

当前网页按五关学习 **AND → OR → NOT → XOR → NAND与组合**。光门保留为玩法，镜面改变感应器的0/1输入；第二关器材穿模已修复，第四关采用异或联动双门，第三关保持单光门。具体规则、验证和回溯方法见[逻辑门课程](docs/LOGIC_GATES_CURRICULUM.md)。原生进度仍以[原生状态](docs/NATIVE_DEMO_STATUS.md)为准，网页结果不转标原生通过。

## 原生运行与验证

锁定编辑器与同版本模板；参数、设备及实际证据见 [验收基线](docs/acceptance_baseline.md)。完整命令见 [原生状态](docs/NATIVE_DEMO_STATUS.md)。当前可运行的原生包只是 P00 空工程。

```bash
export DEMO_GODOT_BIN="/path/to/Godot.app/Contents/MacOS/Godot"
"$DEMO_GODOT_BIN" --path .
python3 tools/verify.py --stage P00 --engine "$DEMO_GODOT_BIN" --window-probe --report-dir artifacts/acceptance/P00
```

没有独立导出证据时，以上阶段报告会保留未执行项。只有全部必需检查通过才能记 PASS；空套件和未来能力不伪装通过。构建从已提交的干净源码归档产生，详情见原生状态文档。

## 网页试玩与版本对照

打开[本地网页预览](http://127.0.0.1:5173/)进入五项逻辑门试炼。点按Space切换世界，点击实验开关改变输入，光门房间可点击镜面或按R转向；札记只记录已观察到的结果。选馆菜单提供[原版五关对照](http://127.0.0.1:5173/?version=original)，另保留[上一逻辑光学试验](http://127.0.0.1:5173/?version=optics)，各版进度独立。

完整旧版已打标签 `codex/pre-logic-optics-20261013`，指向 `560ed6f`。原网页五关 `66fb648`、双视图试验 `74ab81d` 也继续保留。新版遵守已批准的[单世界交互](docs/UI_INTERACTION_AMENDMENT.md)，源码与旧版对照规则同时留存。

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
- [AI_USAGE.md](AI_USAGE.md)：团队核心创意来源、Codex 使用范围及人工与 AI 分工。
- [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)：已用依赖与素材许可。

五关不能改图、目标、出口或启用 G5 备用简化来通过验收。真实玩家尚未安排，工程/关卡/前端/玩法理解分别报告。

## Git

远程：[liyouran0820/von-neumann-dreams](https://github.com/liyouran0820/von-neumann-dreams)。`main`统一接收当前逻辑门课程和工程修复；开发历史保留在`codex/logic-gates-curriculum`。原版`560ed6f`、旧逻辑光学分支及两个回溯标签继续保留，详见课程文档。原生开发分支的`7915359`也已整合，完整历史和来源原文保留。

旧刻轨版本 `f4705f7`、指令交换 `480d261`、首版 `eb63a22` 和设计历史均保留。缓存、SDK、导出包和完整录像 / 日志进入 Git 忽略目录。

## 欢迎来到我们的编程马拉松仓库喵

### 喵喵

如果你分不清一段代码是 AI 写的，还是队友熬夜写的——

恭喜，测试成功。

如果连作者本人都分不清这段代码为什么能跑——

恭喜，项目进入哲学阶段。

**愿我们的程序终止，愿我们的梦想不终止。**

*希望codex额度能撑到比赛结束喵🐱*
