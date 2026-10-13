# 原生验收基线

本文件负责冻结范围、参数、验收状态语义和用户批准变更。续写保持历史可追溯；原始定义见来源计划，机器参数见同名JSON，证据进入 `acceptance/`。

## 基线

- 版本：`native-demo-1.2-single-world-space-toggle-2`；前版 `native-demo-1.2-reference-amendment-1` 与其 P00 证据保留于 Git 历史及阶段报告。
- 来源：PRD1.0、五关灰盒交付1.0、开发计划1.2，原始哈希见 `source_manifest.json`。
- 视觉更正：用户2026-10-13明确批准已上传1000×572图作为正式基线，哈希`84949b06d212237b82fbc386d83a377ab6633302384e7cf7a2ce7a605246716b`。原计划的1672×941/6550d6…身份作为历史保留。
- 交互更正：用户明确采用单世界显示、点按 Space 往返切换；白天以柔白色为主。覆盖原固定双视图/Tab 条款，详见 [修订记录](UI_INTERACTION_AMENDMENT.md)。网页已实现，原生 P02/U 阶段尚待落地，旧报告不追溯改写。
- 技术：Godot4.7.2标准版、类型化GDScript、Forward+、Metal、macOS arm64。版本/驱动不自动回退。
- 范围：连续G1—G5；不采用G5备用简化、不移动目标、墙或出口。
- 冻结尺寸、时序、误差、历史、相机和质量参数见 `acceptance_baseline.json`。U03后补充版本化材质/灯光数值；现阶段不宣称profile或视觉通过。

## 状态与报告

只允许PASS、FAIL、NOT_RUN、BLOCKED、NOT_IMPLEMENTED，只有PASS计入完成。所有阶段、子项、T/X/V、I/H及K专项预期录入 `acceptance/registry.json`；当前未来功能不伪装通过。

报告须记录tested_source_commit、源码/内容/夹具/profile/主题/参考图哈希、引擎与设备、命令、预期、实际、状态及原始证据。实现提交后再对被测SHA验证，验收摘要另行提交。空套件、缺证据、跳过均非PASS。

已知成功断言应退出0；故意失败断言必须非0并保留FAIL原始报告。此二者同时正确才满足运行器自测，不把故意失败断言涂改成PASS。

## 外部条件

真人测试尚未安排；实施负责人暂为Codex，需求/真实参与者协调人为用户。48人日是来源任务量估算，没有据此承诺日期。P09只有取得五名合格真实玩家证据才可通过。
