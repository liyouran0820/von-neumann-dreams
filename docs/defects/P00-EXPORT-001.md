# P00-EXPORT-001：arm64 导出缺少纹理导入配置

本文件负责此缺陷的失败证据、修复与复验关联。续写追加结果，不覆盖原失败结论或降低验收标准。

- 被测源码：`77a2805326778ad81d58930ed5f68cec3bda8b5a`。
- 阶段：P00-1 / A00，状态：FAIL，等待修复后复验。
- 命令：`python3 tools/build.py --preset 'macOS Demo' --engine <locked-4.7.2> --output artifacts/build/p00-bootstrap-macos.zip`。
- 预期：从干净源码导出arm64最小包。
- 实际：Godot拒绝导出，提示arm64必须启用 `rendering/textures/vram_compression/import_etc2_astc`。
- 原始报告：`artifacts/build/p00-bootstrap-macos.failed-77a2805.report.json`，含完整命令和原始输出，产物目录保持Git忽略。
- 修复：启用对应平台必需的ETC2/ASTC导入选项；不改Forward+/Metal、MSAA、渲染比例或玩法参数。
- 复验：待修复提交后的干净归档构建与独立窗口启动。
