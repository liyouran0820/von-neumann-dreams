# P00-EXPORT-002：官方模板仅包含 Universal 可执行文件

本文件负责该平台导出缺陷、修复与复验关联。续写追加结果，保留原失败证据。

- 被测源码：`5bbe5a322abb3aa9d2f3fc693c836557bdf5ad3f`，P00-1 / A00：FAIL。
- 实际：arm64预设寻找`godot_macos_debug.arm64`，官方4.7.2模板只有`.universal`；导出被明确拒绝。
- 原始报告：`artifacts/build/p00-bootstrap-macos.failed-5bbe5a3.report.json`。
- 依据：[Godot官方macOS导出平台说明](https://docs.godotengine.org/en/stable/classes/class_editorexportplatformmacos.html#class-editorexportplatformmacos-property-binary-format-architecture)明确支持arm64，但官方模板只带Universal二进制。
- 修复方式：构建工具从同版本官方模板提取arm64切片，生成专用模板；原下载模板保持不变。记录来源和派生哈希，仍要求最终可执行文件只有arm64、签名有效且独立以Metal启动。不改用Universal包放宽门槛。
- 复验：待修复提交后干净归档构建。
