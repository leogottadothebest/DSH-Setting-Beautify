# dsh-settings-beautify

一套贯穿 DSH 所有设置界面的设计语言。

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![npm version](https://img.shields.io/npm/v/dsh-settings-beautify.svg)](https://www.npmjs.com/package/dsh-settings-beautify)

[English](README.md)

## 它能做什么

DSH 的设置界面由大量插件组合而成，历史上每一页都说着略有不同的排版与表面语言——页面标题 16/18/22px 不一，解释文字 12/13/14px 不一，卡片圆角 8/10/12px 不一，控件各自有各自的高度与焦点样式。

**dsh-settings-beautify** 把所有设置页面统一到同一套设计语言上：

- **架构**：每一页都由相同的三段层级构成——**标题 → 解释 → 具体内容**（通用设置保持偏好行形式，即同一层级关系的紧凑变体）。
- **排版**：所有页面标题一个字号，所有解释一个字号，所有条目标题、条目解释各一个字号——无论页面由哪个插件贡献。
- **表面**：统一的卡片圆角/描边/底色、统一的行、控件、焦点环、标签页、徽章与滚动条，全部由 DSH 自身的 `--dsw-*` token 驱动，**浅色 / 深色 / 跟随系统**主题自然生效。
- **动效**：克制的悬停微动效与过渡，尊重 `prefers-reduced-motion`，可单独关闭。
- **可扩展**：任何页面——包括其他插件贡献的页面（例如已归档对话列表）——只需在根节点加一个属性（`data-dshb-scan`）即可套用同一设计语言，其余交给 DOM 归一化器处理。
- **无界面化**：插件不会在设置导航栏添加任何条目——没有自己的设置页。偏好可选、仅存于 `localStorage`。

插件无需改动 DSH 源码：它观察设置面板，为每个结构角色打上稳定的 `data-dshb-*` 属性（内置类名是构建期哈希，不可依赖），再由作用域样式表在其上应用设计语言。

## 覆盖范围

| 界面 | 内置支持 |
| --- | --- |
| 设置外壳（导航栏、头部、关闭、滚动条） | ✅ |
| 通用 General —— 每一条偏好行（语言、外观、字号、回车行为、智能体预设、权限预设等） | ✅ |
| 模型 Models | ✅ |
| 智能体预设 Agent presets | ✅ |
| 插件 Plugins（标签页、卡片、配置字段） | ✅ |
| 插件市场 Plugin market（已安装清单页） | ✅ |
| 桌面 Desktop（配置文件、网络、通知） | ✅ |
| 任何在根节点添加 `data-dshb-scan` 的第三方页面（例如已归档对话页） | ✅ |

## 安装

### 从插件市场

`dsh-settings-beautify` 遵循 DSH Community Market 的包规范（`dsh.bundle.patch` + `dsh.client` 清单），可从市场安装，或使用：

```sh
dsh plugin --profile <profile> add dsh-settings-beautify
```

### 手动安装（开发）

```sh
pnpm add dsh-settings-beautify        # 安装到当前 Profile 的包集合
# 并通过 Profile patch 声明 bundle 入口，例如：
#   - insert:
#       - id: dsh-settings-beautify
#         name: dsh-settings-beautify
```

安装后重启 DSH Desktop（或刷新 Web 窗口）即自动生效——设置导航栏不会新增任何条目。

## 偏好（无界面化）

插件没有自己的设置页。偏好从浏览器 `localStorage` 的 `dsh-settings-beautify:prefs` 键读取：

| 键 | 取值 | 效果 |
| --- | --- | --- |
| `enabled` | `true` / `false` | 应用设计语言，或恢复 DSH 原始外观。 |
| `density` | `compact` / `default` / `comfortable` | 行与列表间距。 |
| `motion` | `true` / `false` | 卡片悬停微动效。`prefers-reduced-motion` 始终优先。 |

默认值：`{"enabled": true, "density": "default", "motion": true}`。如需调整，在浏览器控制台执行：

```js
window.DSHB.setPrefs({ density: "compact" })   // 或 { enabled: false }、{ motion: false }
```

不触碰任何主机文件或设置命名空间。

## 设计语言

完整规范——token、层级、间距/圆角/动效刻度，以及 `data-dshb-*` 属性契约——见 [docs/DESIGN.zh.md](docs/DESIGN.zh.md)。速览：

| 角色 | 字体 | 颜色 |
| --- | --- | --- |
| 页面标题 | 18px / 600 / 26px | `--dsw-alias-label-primary` |
| 页面解释 | 13px / 400 / 20px | `--dsw-alias-label-tertiary` |
| 组标题 | 14px / 600 / 22px | `--dsw-alias-label-primary` |
| 条目标题 | 14px / 500 / 22px | `--dsw-alias-label-primary` |
| 条目解释 | 13px / 400 / 20px | `--dsw-alias-label-tertiary` |
| 正文 | 14px / 400 / 22px | `--dsw-alias-label-primary` |
| 辅助文字 | 12px / 400 / 18px | `--dsw-alias-label-tertiary` |

卡片：12px 圆角 · `--dsw-alias-border-l2` · `--dsw-alias-bg-layer-2`。控件：8px 圆角、36px 最小高度、品牌色焦点环。半径等均以 `--dshb-*` token 化，未来版本可平滑提供其他外观方案。

## 为其他插件页面接入

DOM 归一化器自动覆盖内置页面。对于**你自己插件**的页面，二选一：

1. 在页面根节点添加 `data-dshb-scan`——归一化器会用同样的标题/解释/卡片/行/控件规则泛化处理；或
2. 直接使用属性（`data-dshb-page-title`、`data-dshb-item-title`、`data-dshb-card` 等）获得完全控制。

见[扩展契约](docs/DESIGN.zh.md#data-dshb-属性契约)。

## 设计说明

插件刻意保持**无界面化**：只重绘设置界面本身。如果你更希望有一个可见的控制页，那是一个很小的后续改动——提个 issue，可以在偏好开关后面加上。

## 开发

```sh
pnpm install
pnpm check        # 语法检查
pnpm test         # DOM 归一化器的 jsdom 测试（66 条断言）
pnpm sync-styles  # 由 lib/client.js 重新生成 lib/styles/settings.css
```

测试套件在 jsdom 中重建真实 DSH 设置 DOM（通用条目、模型卡片、插件标签页/字段、桌面分组、一个接入的第三方页面），并断言完整的 `data-dshb-*` 标记契约。

## 兼容性

- DSH Desktop 2.x（内置 Web UI）。归一化器是防御性的：无法识别的部分一律保持原样。
- 样式表只在设置面板作用域内生效；设置之外的界面不会被重绘。

## 安全

无网络请求、无主机 API、无文件读写、无远程代码。偏好仅存于 `localStorage`。见 [SECURITY.zh.md](SECURITY.zh.md)。

## 许可证

MIT —— 见 [LICENSE](LICENSE)。
