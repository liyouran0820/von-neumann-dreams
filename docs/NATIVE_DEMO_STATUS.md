# 夜白映射原生工程状态

本文件负责当前原生工程进度、运行方法、验证范围及下一阶段入口。续写以实际源码与被测提交为准；规格进入开发计划/基线，阶段证据进入 `acceptance/`，不把历史网页检查计作原生通过。

## 当前状态

P00通过：锁定Godot4.7.2标准版，空工程从干净Git归档导出arm64包，严格签名校验通过，独立Forward+/Metal窗口实际启动。窗口1920×1080，GPU报告Apple M4 (Apple9)，两独立World3D、4×MSAA、100%渲染和60Hz配置已测。

被测源码：`4c2fbcb39ede1c0ad4798fa9d8189040845bb414`。证据摘要：[P00报告](acceptance/P00-4c2fbcb.json)。故意失败断言原始结果仍为FAIL且退出1；空套件为NOT_IMPLEMENTED且退出2，没有伪装通过。

原生包当前只有启动环境和运行器，尚无原生五关玩法。P01—P09、K01—K05与U01—U05未通过，不能称为最终Demo。

## 本机复现

锁定编辑器在本工作区忽略的 `artifacts/tools/godot-4.7.2/Godot.app/Contents/MacOS/Godot`。同版本macOS模板已经准备；构建工具从官方Universal模板派生arm64切片，保留来源/派生哈希，不改版本。

```bash
export DEMO_GODOT_BIN="$PWD/artifacts/tools/godot-4.7.2/Godot.app/Contents/MacOS/Godot"
python3 tools/build.py --preset "macOS Demo" --engine "$DEMO_GODOT_BIN" --output artifacts/build/p00-bootstrap-macos.zip
python3 tools/verify.py --stage P00 --engine "$DEMO_GODOT_BIN" --window-probe --export-probe artifacts/build/p00-bootstrap-macos.report.json --report-dir artifacts/acceptance/P00/current
```

正式构建要求源码已提交。报告关联实际被测SHA；文档/证据提交后不能拿旧包自动当新SHA的结果，必要时用对应实现提交复验。导出包和完整日志在artifacts中，保持Git忽略。

## 来源与基线

三份原文在 `sources/native_v1.2/` 按字节归档；对应关系与哈希见 `source_manifest.json`。PRD定规则、五关稿定内容、计划v1.2定工程/视觉/验收。

用户确认1000×572上传图为新的正式视觉基线，旧1672×941记录保留。视图、字号、画质、碰撞与试玩门槛未降低。

设备与参数分别见 `device_profile.json`、`acceptance_baseline.json`。186项要求/预期在 `acceptance/registry.json` 追踪；真实玩家与安排仍待用户协调，不虚构人选或预约。

## 下一阶段

按P01-1状态/序列化、P01-2几何、P01-3固定步/事务推进，再进入P02。领域层不引用场景节点；只有新规则和实际测试的证据能够结案。
