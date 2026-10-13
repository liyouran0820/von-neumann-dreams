# P00-EXPORT-003：解包目录的 Finder 元数据导致签名核验拒绝

本文件负责此缺陷的环境证据、修复与复验。续写追加事实，不覆盖失败包与原报告。

- 被测源码：`07191af8dba44e276291996432aa038d12aaa93c`，P00-1 / A00：FAIL。
- 原生arm64包已生成；严格签名核验提示resource fork/Finder information detritus。
- 检查新生成的解包目录：仅.app根存在`com.apple.FinderInfo`及File Provider元数据，未发现quarantine。打包代码内容未被改写。
- 原始证据：`artifacts/build/p00-bootstrap-macos.failed-07191af.report.json`与同名`.zip`；包SHA-256为`3803f85babbec0b6cdb0cb26f90ed883101174b4028717e8dc7769b124ec0bbd`。
- 修复：只清除本次生成.app根的FinderInfo装饰属性，然后重新严格核验签名。保留quarantine/provenance，不关闭Gatekeeper、不跳过签名检查、不改变包代码或验收标准。
- 复验：待修复提交后的干净构建和独立Metal启动。
