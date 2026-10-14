# von-neumann-dreams 🧠☕

本文件负责项目入口、文档导航与运行方式。续写保持当前状态准确；完整规则进入设计方案，检查进入 Demo 文档，变更进入 `log.md`。

> 仓库名冯·诺依曼的梦😁，队员成分不明、身份不明，最终以比赛结束时的发量和穿搭为准（bushi

## 午夜学院 · 夜白映射

Godot原生迁移另按用户的开发计划 v1.2 记录，环境为 **Godot 4.7.2 / Forward+ / Metal / macOS arm64**。P00 原生启动、测试运行器与干净导出已通过；P01状态与几何模块已保存，81项模块检查通过。原生五关玩法、完整视觉和真人验收尚未完成。

默认网页按五关学习 **AND → OR → NOT → XOR → NAND与组合**。光门保留为玩法，镜面改变感应器的0/1输入；第二关器材穿模已修复，第四关采用异或联动双门，第三关保持单光门。具体规则、验证和回溯方法见[逻辑门课程](docs/LOGIC_GATES_CURRICULUM.md)。原生进度仍以[原生状态](docs/NATIVE_DEMO_STATUS.md)为准，网页结果不转标原生通过。

2.0关卡更新按[开发计划v2.0](开发计划v2.0.md)在现有网页上增量实施：保留原版本关卡与进度，新增独立十三关，复用系统、脚本和资源，新UI保持现有设计语言。十三关已接入网页候选，使用`?version=v2`或选馆菜单进入；默认旧五关、历史入口与存档保留。98项自动检查和35条实际浏览器通关路线通过，独立玩家试玩仍待执行，详见[2.0网页状态](docs/V2_DEMO_STATUS.md)。

## 功能实现状态

当前默认网页为 AND、OR、NOT、XOR、NAND 五种逻辑门课程，状态见[课程记录](docs/LOGIC_GATES_CURRICULUM.md)。下表说明保留的原版映射对照与原生工程，实际截图来自原版映射对照。

| 功能 | 原版映射对照 | Godot 原生版 |
| --- | --- | --- |
| G1—G5 五关、固定配对与两端独立阻挡 | 已实现，有规则与参考路线验证记录 | 尚未接入完整玩法 |
| 单组映射、实体虚影桥、真实箱状态留存 | 已实现 | 尚未完成 |
| 单世界显示、Space 点按观察、传送门穿行 | 已实现 | 尚未迁移到原生界面 |
| 撤销、安全点恢复、提示与通关记录 | 已实现；重置与清除记录有确认弹窗 | 尚未完成 |
| Three.js 立体场景、柔白与夜侧配色 | 已实现；全五关视觉验收尚未完成 | 完整视觉尚未完成 |
| 原生启动、导出、状态与几何模块 | 不适用 | P00 已验收；两个模块共 81 项检查通过 |
| 独立新玩家盲测与体验时长 | 尚未完成 | 尚未完成 |

原版映射对照的工程修复记录为 `b2860d7`，28 项自动检查、构建与五关参考路线通过；详见[网页试验记录](docs/WEB_DIORAMA_WIP.md)。这些结果不转为原生验收结果。

## 提交材料与演示

- **源码**：`web/`、`src/`、`scenes/`、`scripts/`、`tools/` 和 `tests/`。
- **AI 使用说明**：[AI_USAGE.md](AI_USAGE.md)。核心创意与 PRD 创意由团队独立提出，AI 辅助范围单独说明。
- **AI 对话记录**：[ai-logs/](ai-logs/README.md)，含真实对话正文节选与五张原始对话截图。
- **实际运行截图**：[screenshots/](screenshots/README.md)，共四张网页原型实际截图。
- **本地试玩**：[打开游戏](http://127.0.0.1:5173/)，需先启动下文的本地服务；此地址仅在运行服务的电脑上有效。
- **对外演示**：目前没有公网网页链接；视频由团队稍后自行提交，本轮不制作或上传视频。

## 核心文件清单

| 文件 | 作用 |
| --- | --- |
| [web/engine.js](web/engine.js) | 双世界状态、映射、独立阻挡、身体移动、支撑、撤销与判胜 |
| [web/levels.js](web/levels.js) | 原版 G1—G5 地图、机关、配对、目标与提示 |
| [web/academy-levels.js](web/academy-levels.js) | 默认旧五关逻辑课程配置 |
| [web/levels-v2.js](web/levels-v2.js) | 独立十三关实体、接线、地图、目标与提示 |
| [web/level-catalog.js](web/level-catalog.js) | 关卡目录与独立存储 |
| [web/level-validation.js](web/level-validation.js) | 新格式、引用、光学与跨世界接线校验 |
| [web/science.js](web/science.js) | 逻辑电路与光学规则 |
| [web/course-ui.js](web/course-ui.js) | 课程电路面板与实验札记 |
| [web/app.js](web/app.js) | 页面交互、键盘输入、关卡选择和进度保存 |
| [web/renderer.js](web/renderer.js) | Three.js 场景、物体、材质、预览与虚影呈现 |
| [scripts/build.mjs](scripts/build.mjs) | 生成本地网页脚本与内联单文件演示产物 |
| [tests/engine.test.mjs](tests/engine.test.mjs) | 网页规则、合法路线、失败恢复和反例检查 |
| [tests/build.test.mjs](tests/build.test.mjs) | 含空格及特殊字符路径的构建回归 |
| [project.godot](project.godot) | Godot 原生工程入口 |
| [src/domain/game_state.gd](src/domain/game_state.gd) | 原生领域状态模块 |
| [src/domain/state_codec.gd](src/domain/state_codec.gd) | 原生状态编码、校验与恢复基础 |
| [src/domain/geometry_query.gd](src/domain/geometry_query.gd) | 原生碰撞与支撑几何查询 |
| [tools/verify.py](tools/verify.py) | 原生阶段验收与证据报告 |

## 原生运行与验证

锁定编辑器与同版本模板；参数、设备及实际证据见 [验收基线](docs/acceptance_baseline.md)。完整命令见 [原生状态](docs/NATIVE_DEMO_STATUS.md)。当前可运行的原生包只是 P00 空工程。

```bash
export DEMO_GODOT_BIN="/path/to/Godot.app/Contents/MacOS/Godot"
"$DEMO_GODOT_BIN" --path .
python3 tools/verify.py --stage P00 --engine "$DEMO_GODOT_BIN" --window-probe --report-dir artifacts/acceptance/P00
```

没有独立导出证据时，以上阶段报告会保留未执行项。只有全部必需检查通过才能记 PASS；空套件和未来能力不伪装通过。构建从已提交的干净源码归档产生，详情见原生状态文档。

## 网页试玩与版本对照

打开[本地网页预览](http://127.0.0.1:5173/)进入五项逻辑门试炼。点按Space切换世界，点击实验开关改变输入，光门房间可点击镜面或按R转向；札记只记录已观察到的结果。选馆菜单包含旧五关与2.0十三关两个分组，使用`?version=v2`直达新关；历史版本的开发对照方式见[课程记录](docs/LOGIC_GATES_CURRICULUM.md)。

完整旧版已打标签 `codex/pre-logic-optics-20261013`，指向 `560ed6f`。原网页五关 `66fb648`、双视图试验 `74ab81d` 也继续保留。新版遵守已批准的[单世界交互](docs/UI_INTERACTION_AMENDMENT.md)，源码与旧版对照规则同时留存。

```bash
npm ci
npm run dev
npm test
npm run verify:v2
npm run build
```

单文件上传2.0：运行`npm run build -- --default-version=v2`，上传生成的`dist/index.html`，打开文件或服务器根地址即可进入十三关。普通`npm run build`保持默认旧五关；导出文件仍可从菜单切换旧关，显式版本查询参数优先。

Node.js 20+；Three.js 与 esbuild 版本锁定，无运行时 CDN。构建输出保持 Git 忽略。该网页呈现版本未完成全关视觉验收；详见 [网页试验记录](docs/WEB_DIORAMA_WIP.md)。

## 需求与文档

- [开发计划v2.0.md](开发计划v2.0.md)：基于现有可玩版本新增十三关，涵盖旧关保留、复用与必要扩展、UI一致性、存储兼容、八阶段任务及新旧回归验收。
- [关卡设计v2.0.md](关卡设计v2.0.md)：最新十三关设计，原第六关删除；第四关加入错位校准与XOR/AND双门，第五关以一对真箱和双世界AND激活白桥再映到夜侧。镜面反射融入第六、七、十二、十三关，不增设镜面教学关；包含已学特性的递进要求及试玩反馈后的01双靶AND、02双AND和08/09 AND接线，已在网页候选实现。
- [三份原始来源](docs/sources/native_v1.2/SOURCES.md)：PRD 定规则，五关稿定内容，开发计划定技术和验收。
- [source_manifest.json](docs/source_manifest.json)：来源哈希、旧原图身份与用户批准的新视觉基线。
- [V2_DEMO_STATUS.md](docs/V2_DEMO_STATUS.md)：十三关网页候选、运行、验证、反馈修复与待试玩项。
- [NATIVE_DEMO_STATUS.md](docs/NATIVE_DEMO_STATUS.md)：原生阶段、实际运行与验证范围。
- [requirements_gap_analysis.md](docs/requirements_gap_analysis.md)：可复用、需补齐、需迁移和外部条件。
- [acceptance_baseline.md](docs/acceptance_baseline.md)：冻结参数、证据格式与状态语义。
- [PROJECT_INTRODUCTION.md](PROJECT_INTRODUCTION.md)：背景、历史和当前范围。
- [AGENTS.md](AGENTS.md)：协作与文档边界；[log.md](log.md)：实际变更和检查。
- [AI_USAGE.md](AI_USAGE.md)：团队核心创意来源、Codex 使用范围及人工与 AI 分工。
- [ai-logs/](ai-logs/README.md)：团队提供的 5 张 AI 对话截图、开发过程摘要及原文件校验清单。
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
