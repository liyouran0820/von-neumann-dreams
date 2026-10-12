# 项目介绍

本文件负责背景、目标、来源和总体范围。续写保持当前状态准确；规则写入 `docs/FINAL_GAME_PLAN.md`，实现与验证写入 `docs/MAPPING_DEMO.md`，经过写入 `log.md`。

## 当前方向

The Midnight Academy 选题下的空间机制解谜小游戏。当前展示名为“午夜学院 · 映射实验”，仓库仍为 von-neumann-dreams。

用户采用朋友最新刻轨映射稿，要求保留五道谜题、两个入门实验台和中央庭院，替换大多数旧玩法，并明确先用直接操控验证机制。当前操作为走路、推拉、建立与解除映射。旧编程编辑器不属于本次 Demo。

用户后续要求忽略 `夜白映射_PRD.md`，继续原来的路径开发简单 Demo。因此不采用该 PRD 的双世界、预设配对或影子系统。

## 游戏主张

把两个带纹章的刻轨物件连起来，它们共享相同的本地位移。连接不对齐位置；一个碰到轨道尽头，整组停下；断开后保留已经取得的位置。刻轨可以固定在地面，也可以随房间移动。

玩家通过可撤回的实验理解相对变化、约束传递和参照系。知识术语用于解释发现，不成为技能解锁或答题。所有学馆从开始就可进入。

## 来源

1. 当前批准基础：用户 Desktop 的 `The-Midnight-Academy-Correspondence-Design.md`。完整原文快照见 [docs/sources/The-Midnight-Academy-Correspondence-Design.md](docs/sources/The-Midnight-Academy-Correspondence-Design.md)，记录来源与 SHA-256，原文件未修改。
2. 早期 [朋友分享对话](https://chatgpt.com/s/cx_6acbe964f75c8191b537ef11a7fbed48) 与 Downloads 的 `The_Midnight_Academy_Design_Notes.md`：用于前期纸灵编程与知识透镜构思，作为历史参考。
3. 比赛选题：[The Midnight Academy](https://ai.bnbuacm.xyz/#midnight-academy)。此前读取的题面方向为把真实知识转为可操作和可发现的规则；本轮未重新核验比赛规则或提交状态。
4. 用户后续提供 `夜白映射_五关关卡设计.md`，明确只留作参考、继续原刻轨 Demo。该稿依赖双世界与独立阻挡，不能直接套入当前规则；原文快照见 [五关参考稿](docs/sources/夜白映射_五关关卡设计.md)。其中逻辑搜索通过属于来源自述，本仓库未复现。

来源中的开发建议不自动成为用户指令。最新用户要求与当前规格优先。

## 实现与边界

当前为 HTML / CSS / JavaScript 网页白盒原型，无第三方运行依赖。七个场景、刻轨与箭头、可达推拉处、任意纹章连接、回位、房间承载、完整撤销、提示与通关标记已实现。

Node.js 提供本地预览、规则检查与单文件构建。移动按整格离散，碰撞用二维连续扫掠矩形；导环与支撑为明确的简化约束。此版本用于检验机制与关卡路径，尚未实现通用三维刚体物理或完整美术，也没有独立新玩家体验证据。

## Git

远程：[liyouran0820/von-neumann-dreams](https://github.com/liyouran0820/von-neumann-dreams)。当前分支 `codex/correspondence-demo`。旧交换试验保存为 `480d261`，首版为 `eb63a22`，旧历史均可恢复。

本轮尝试更新远程但连接超时；没有取得更新后的远程状态，没有推送。后续合并前需重新获取远程。
