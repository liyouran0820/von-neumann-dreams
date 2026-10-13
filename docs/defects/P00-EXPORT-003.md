# P00-EXPORT-003：解包目录的 Finder 元数据导致签名核验拒绝

本文件负责此缺陷的环境证据、修复与复验。续写追加事实，不覆盖失败包与原报告。

- 被测源码：`07191af8dba44e276291996432aa038d12aaa93c`，P00-1 / A00：FAIL。
- 原生arm64包已生成；严格签名核验提示resource fork/Finder information detritus。
- 检查新生成的解包目录：仅.app根存在`com.apple.FinderInfo`及File Provider元数据，未发现quarantine。打包代码内容未被改写。
- 原始证据：`artifacts/build/p00-bootstrap-macos.failed-07191af.report.json`与同名`.zip`；包SHA-256为`3803f85babbec0b6cdb0cb26f90ed883101174b4028717e8dc7769b124ec0bbd`。
- 修复：只清除本次生成.app根的FinderInfo装饰属性，然后重新严格核验签名。保留quarantine/provenance，不关闭Gatekeeper、不跳过签名检查、不改变包代码或验收标准。
- 复验：待修复提交后的干净构建和独立Metal启动。

## 复验与进一步定位

`c416ef8963f6065d882d88ba7be4beefb4703689`在同步目录移除FinderInfo后仍失败；该失败报告保存在`artifacts/build/p00-bootstrap-macos.failed-c416ef8.report.json`。

将完全相同的ZIP（SHA-256 `0ef28e87152f6fe24a5dd6e63e5f9eae8925a50b736e6daaa579d1fd50a1e707`）解压到非同步的系统临时目录，无FinderInfo，严格签名验证立即退出0。未修改包字节或安全属性。诊断原文在`artifacts/build/p00-metadata-location-diagnostic.json`。

最终修复改为在独立非同步目录检查和运行解包应用，取消元数据删除步骤。来源Git检出、设备、签名标准、渲染器和画质保持原标准；后续正式构建报告记录真实解包路径。

## 结案

在 `4c2fbcb39ede1c0ad4798fa9d8189040845bb414` 的干净归档导出与独立Metal运行中复验通过，原失败记录保留。阶段摘要见 `../acceptance/P00-4c2fbcb.json`。
