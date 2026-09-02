# DSH Beautify — 设计语言规范

本文档是 `dsh-settings-beautify` 背后的契约：它定义应用到 DSH 设置界面的设计语言，以及任何页面（包括第三方页面）都可以接入的 `data-dshb-*` 属性契约。

## 1. 设计原则

1. **处处同一层级。** 每个设置页面都是 *标题 → 解释 → 具体内容*。紧凑的偏好行（通用设置）是同一层级在条目级别的体现：*条目标题 → 条目解释 → 控件*。
2. **排版是刻度，不是猜测。** 每个角色一个 token；设置页面上没有任何元素自造字号。
3. **表面重复出现。** 卡片、行、控件、标签页、徽章与焦点环共享同一套圆角/间距/颜色词汇。
4. **主题免疫。** 所有颜色都经由 DSH 自身的 `--dsw-*` token 解析，浅色、深色与跟随系统主题无需任何插件代码即可生效。
5. **动效是一种偏好。** 微动效克制、短促，尊重 `prefers-reduced-motion`，且可被用户关闭。
6. **非侵入。** 语言由 DOM 归一化器在构建期哈希类名之上应用；无法识别的 DOM 保持原样。

## 2. 排版刻度

token 定义在 `[data-dshb-panel]` / `[data-dshb-scan]` 根上。

| Token | 字号 / 字重 / 行高 | 角色 |
| --- | --- | --- |
| `--dshb-size-title-page` | 18px / 600 / 26px | 页面标题（模型、插件、市场、桌面、智能体预设） |
| `--dshb-size-desc` | 13px / 400 / 20px | 页面解释、组解释、条目解释 |
| `--dshb-size-title-group` | 14px / 600 / 22px | 页面内的组标题 |
| `--dshb-size-title-item` | 14px / 500 / 22px | 偏好行标题、卡片标题、字段标签 |
| `--dshb-size-body` | 14px / 400 / 22px | 正文、控件、标签页文字 |
| `--dshb-size-caption` | 12px / 400 / 18px | 徽章、提示、时间戳 |
| `--dshb-size-code` | 12px / 400 / 18px | 代码、指纹、URL |

颜色：标题 → `--dsw-alias-label-primary`；解释/辅助 → `--dsw-alias-label-tertiary`；次要正文 → `--dsw-alias-label-secondary`。

为什么是这些数值？设置面板内容列约 620–700px 宽；18px/600 的页面标题足以充当标题而不与 14px 正文争抢；13px 解释文字清晰可读又保持从属地位；14px/500 的条目标题与 DSH 既有设置行的行约定一致。

## 3. 表面

| 元素 | 规范 |
| --- | --- |
| 卡片（`data-dshb-card`） | 圆角 `--dshb-radius-card`（12px），描边 `--dshb-card-border`（`--dsw-alias-border-l2`），底色 `--dshb-card-bg`（`--dsw-alias-bg-layer-3`，相对 layer-2 面板抬升），160ms 缓动过渡 |
| 卡片悬停（可交互卡片） | 描边 → `--dsw-alias-label-dimmed`，`translateY(-1px)`，柔和阴影（仅在动效开启时） |
| 行（`data-dshb-row`） | 上下 16px 内边距；密度变体 12px / 20px |
| 输入框 / 选择框（`data-dshb-input`） | 36px 最小高度，圆角 `--dshb-radius-control`（8px），`--dsw-alias-border-l2`，焦点：品牌色描边 + 2px 18% 光环 |
| 胶囊（`data-dshb-pill`） | 圆角 `--dshb-radius-pill`（999px），36px 最小高度，14px 正文 |
| 开关（`data-dshb-toggle`） | 胶囊圆角；2px 品牌色焦点环 |
| 标签页（`data-dshb-tab`） | 14px / 500；激活与悬停 → `--dsw-alias-label-primary` |
| 徽章（`data-dshb-badge`） | 胶囊圆角，12px 辅助文字，2px/8px 内边距 |
| 焦点环 | 2px `--dsw-alias-brand-primary`，偏移 2px，作用于每个控件与导航单元 |
| 滚动条（面板内） | 8px，`--dsw-alias-scrollbar-bg-l2` 滑块，胶囊圆角 |

动效：`--dshb-duration` 160ms，`--dshb-ease` `cubic-bezier(0.16, 1, 0.3, 1)`。
密度：`data-dshb-density="compact"` 将行缩至 12px、列表间距 8px；`"comfortable"` 将行增至 20px、间距 14px。

**标题 → 注释间距。** 标题与其正下方的小字注释永远保持 `--dshb-gap-title-desc`（4px）——与 DSH 自带行文本列的距离一致。机制：被标记的文字列（`data-dshb-item-text`）统一为 4px 纵向 flex 列（其直属标题/注释子元素的 margin 清零）；未被文字列包裹的注释补同样 4px 的 `margin-top`；在 opt-in 页面上，后跟说明段的页面/分组标题（`page-desc` / `group-desc`）去掉下边距，使说明段紧贴标题下方 4px。DSH 自带页面的页面/分组节奏保持不变：标题/说明段的配对规则只作用于 opt-in（`data-dshb-scan`）页面。文字列识别覆盖**每一个设置节**——包括 DSH 自带的特性卡片（Agent 预设、桌面 Profile、插件市场）——但本身是单个控件的卡片（主题方块、市场磁贴、可展开行）保持原样，不改变其自有排版。

## 4. 页面架构

归一化后的设置页面长这样（这些属性由归一化器自动打上）：

```html
<div data-slot="settings.section">            <!-- 节宿主 -->
  <div class="page-root">                      <!-- 内容列，上限 720px -->
    <h2 data-dshb-page-title>模型</h2>
    <p  data-dshb-page-desc>配置模型提供方与密钥</p>
    <h3 data-dshb-group-title>已配置</h3>
    <p  data-dshb-group-desc>……</p>
    <ul data-dshb-card-list>
      <li data-dshb-card data-dshb-card-interactive>…</li>
    </ul>
    <div data-dshb-row>
      <div data-dshb-item-text>
        <div data-dshb-item-title>界面主题</div>
        <div data-dshb-item-desc>选择深色或浅色外观</div>
      </div>
      <button data-dshb-control data-dshb-pill>深色</button>
    </div>
  </div>
</div>
```

## 5. `data-dshb-*` 属性契约

### 5.1 自动标记的角色（设置面板）

归一化器观察设置对话框并打上：

| 属性 | 含义 |
| --- | --- |
| `data-dshb-panel` | 设置对话框根。移除该属性即整体关闭设计语言（“启用美化”开关做的正是这件事）。 |
| `data-dshb-nav`、`data-dshb-nav-title`、`data-dshb-nav-cell` | 导航栏框架。 |
| `data-dshb-content`、`data-dshb-header`、`data-dshb-actions`、`data-dshb-close`、`data-dshb-options` | 面板框架。 |
| `data-dshb-section` | 当前节宿主（`[data-slot="settings.section"]`）。 |
| `data-dshb-page-title`、`data-dshb-page-desc` | 第一个标题及其后的说明段落。 |
| `data-dshb-group-title`、`data-dshb-group-desc` | 后续标题及其后的说明段落。 |
| `data-dshb-card`、`data-dshb-card-interactive`、`data-dshb-card-list` | 带描边圆角的表面及其容器。 |
| `data-dshb-row`、`data-dshb-item-text`、`data-dshb-item-title`、`data-dshb-item-desc` | 偏好行及其文本列。在 opt-in 页面上，卡片内上下堆叠的“标题在上、注释在下”文字列（例如已归档对话行）也会自动获得相同的 item-text 角色。 |
| `data-dshb-control`、`data-dshb-input`、`data-dshb-toggle`、`data-dshb-pill` | 交互控件。 |
| `data-dshb-field` | 标签 + 输入框组合。 |
| `data-dshb-tabs`、`data-dshb-tab` | 标签页列表与标签页。 |
| `data-dshb-badge`、`data-dshb-code`、`data-dshb-link` | 小号文本家具。 |
| `data-dshb-motion`、`data-dshb-density` | 面板根上的偏好镜像。 |

### 5.2 第三方页面接入

设置面板之外的任何页面（已归档对话页、插件自有的类设置页面等）都可以两种方式加入设计语言——被托管在设置对话框**内部**的第三方节也一样：把属性加到该节根节点即可。

**方式 A：一个属性。** 在页面根节点添加 `data-dshb-scan`。归一化器随后应用泛化规则：标题 → 页面/组标题 + 说明，带描边圆角元素 → 卡片，分隔行 → 行（自动识别标题/解释/控件），卡片内的堆叠“标题+注释”文字列 → item-text/title/desc，输入框/胶囊/开关/徽章/代码/链接 → 对应角色。这类页面上的标题 → 注释间距统一归一为 4px（`--dshb-gap-title-desc`）。

```html
<div data-dshb-scan>
  <h2>已归档对话</h2>
  <div>… 带标题/解释/控件的行 …</div>
</div>
```

**方式 B：完全控制。** 直接在自有 JSX 中使用属性；归一化器尊重既有属性，绝不覆盖。

### 5.3 稳定性承诺

`data-dshb-*` 属性是稳定的公开契约；DSH 构建期哈希类名**不是**。归一化器是防御性的：未知结构一律忽略，启发式失败只意味着该节点保留原始样式。

## 6. 偏好

| 键 | 取值 | 效果 |
| --- | --- | --- |
| `enabled` | `true` / `false` | 添加/移除 `data-dshb-panel`（及 `-motion`/`-density`），整体开关设计语言。 |
| `density` | `compact` / `default` / `comfortable` | 设置 `data-dshb-density`；缩放行内边距与列表间距。 |
| `motion` | `true` / `false` | 设置 `data-dshb-motion`；控制悬停微动效。`prefers-reduced-motion` 始终优先。 |

存储于 `localStorage` 的 `dsh-settings-beautify:prefs` 键下。插件无界面化——没有任何设置页拥有这些值；可在浏览器控制台用 `window.DSHB.setPrefs({ ... })` 调整。

## 7. 未来方向

- 通过现有 `--dshb-*` token 提供备选外观（柔和/高对比卡片、更大字号档位）。
- 可选的主机侧设置命名空间，实现跨 Profile 偏好同步。
- DSH 提供对应界面后，补充 RTL 与更大无障碍字号审计。
