# 第三方素材与许可

本文件负责当前实际使用的第三方素材来源与许可证。续写时按源码中的实际使用增删来源、记录核验版本并保留必要许可；原创角色、庭院与规则说明进入设计文档。单文件构建须保留下列许可。

## Lucide 交互图标

采用官方 Lucide SVG，路径内联于 `web/icons.js`，无需图标依赖或网络请求。`unlink` 的四个直线元素等价转换为 SVG 路径；其余路径保持来源数据。界面统一使用 24×24 视框、无填充、圆端点和圆连接。

2026-10-13 通过官方 GitHub API 核验，HTTPS 请求保留 TLS 证书验证。

| 图标 | 导出键 | 原始文件 | 核验的 Git blob |
| --- | --- | --- | --- |
| link | link | [Lucide 源文件](https://github.com/lucide-icons/lucide/blob/main/icons/link.svg) | `645e746a888689bb7b37e35b39873037d6b9f6be` |
| unlink | unlink | [Lucide 源文件](https://github.com/lucide-icons/lucide/blob/main/icons/unlink.svg) | `a89aa2f1c051b74508d2b5c7c324dbfdae2e50bf` |
| hand | hand | [Lucide 源文件](https://github.com/lucide-icons/lucide/blob/main/icons/hand.svg) | `30af9046926e671bb2d3a2e8bc9c15da06e900b0` |
| arrow-up | arrowUp | [Lucide 源文件](https://github.com/lucide-icons/lucide/blob/main/icons/arrow-up.svg) | `50a81cb370d77bccdab4e91c1aeff36b763cdfbf` |
| undo-2 | undo | [Lucide 源文件](https://github.com/lucide-icons/lucide/blob/main/icons/undo-2.svg) | `3e93594c0a400186e7f6e8f1d3981dc82cffe7e8` |
| house | home | [Lucide 源文件](https://github.com/lucide-icons/lucide/blob/main/icons/house.svg) | `10e4097e290fdb2f1f919b264bf4e3095348de7c` |

[Lucide 官方许可证](https://github.com/lucide-icons/lucide/blob/main/LICENSE)核验的 blob 为 `718bb3f0e44153809972abed31839375804bf652`。六个图标适用 ISC；所用的 `link` 与 `arrow-up` 列在 Feather 衍生图标清单，另保留 MIT。以下保存本轮官方完整许可证，`web/icons.js` 顶部也保存同一声明，构建时必须保留该注释。

## 官方许可证原文

```text
ISC License

Copyright (c) 2026 Lucide Icons and Contributors

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.

---

The following Lucide icons are derived from the Feather project:

airplay, alert-circle, alert-octagon, alert-triangle, aperture, arrow-down-circle, arrow-down-left, arrow-down-right, arrow-down, arrow-left-circle, arrow-left, arrow-right-circle, arrow-right, arrow-up-circle, arrow-up-left, arrow-up-right, arrow-up, at-sign, calendar, cast, check, chevron-down, chevron-left, chevron-right, chevron-up, chevrons-down, chevrons-left, chevrons-right, chevrons-up, circle, clipboard, clock, code, columns, command, compass, corner-down-left, corner-down-right, corner-left-down, corner-left-up, corner-right-down, corner-right-up, corner-up-left, corner-up-right, crosshair, database, divide-circle, divide-square, dollar-sign, download, external-link, feather, frown, hash, headphones, help-circle, info, italic, key, layout, life-buoy, link-2, link, loader, lock, log-in, log-out, maximize, meh, minimize, minimize-2, minus-circle, minus-square, minus, monitor, moon, more-horizontal, more-vertical, move, music, navigation-2, navigation, octagon, pause-circle, percent, plus-circle, plus-square, plus, power, radio, rss, search, server, share, shopping-bag, sidebar, smartphone, smile, square, table-2, tablet, target, terminal, trash-2, trash, triangle, tv, type, upload, x-circle, x-octagon, x-square, x, zoom-in, zoom-out

The MIT License (MIT) (for the icons listed above)

Copyright (c) 2013-present Cole Bemis

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
