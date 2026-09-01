# dsh-settings-beautify

One design language for the DSH settings surface.

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![npm version](https://img.shields.io/npm/v/dsh-settings-beautify.svg)](https://www.npmjs.com/package/dsh-settings-beautify)

[简体中文](README.zh.md)

## What it does

DSH's settings are composed from many plugins, and each page historically
speaks a slightly different typography and surface language — page titles in
16/18/22px, explanations in 12/13/14px, cards with 8/10/12px radii, controls
with their own heights and focus styles.

**dsh-settings-beautify** normalizes every settings page onto a single design
language:

- **Architecture**: every page is built from the same three-part hierarchy —
  **标题 / Title** → **解释 / Explanation** → **内容 / Content** (通用 General
  settings keeps its preference-row form, which is the same hierarchy in a
  compact variant).
- **Typography**: one size for every page title, one for every explanation,
  one for every item title and item description — regardless of which plugin
  contributed the page.
- **Surfaces**: consistent card radius/border/background, consistent rows,
  controls, focus rings, tabs, badges and scrollbars, all driven by DSH's own
  `--dsw-*` tokens, so **light / dark / system** themes keep working.
- **Motion**: subtle, tasteful hover micro-motion that respects
  `prefers-reduced-motion` and can be turned off.
- **Extensible**: any page — including pages contributed by other plugins,
  such as archived-conversation lists — opts into the same language with one
  attribute (`data-dshb-scan`), and the DOM normalizer handles the rest.

It works without touching DSH's source: the plugin observes the settings
panel, marks each structural role with a stable `data-dshb-*` attribute (the
built-in class names are build-hashed and can't be relied on), and a scoped
stylesheet applies the language on top.

## What is covered

| Surface | Built in |
| --- | --- |
| Settings shell (nav rail, header, close, scrollbars) | ✅ |
| 通用 General — every preference row (language, appearance, font size, Enter behavior, agent presets, permissions, …) | ✅ |
| 模型 Models | ✅ |
| 智能体预设 Agent presets | ✅ |
| 插件 Plugins (tabs, cards, config fields) | ✅ |
| 插件市场 Plugin market (inventory tab) | ✅ |
| 桌面 Desktop (profiles, network, notifications) | ✅ |
| Any third-party page that adds `data-dshb-scan` to its root (e.g. an archived-conversations page) | ✅ |

## Installation

### From the plugin market

`dsh-settings-beautify` follows the DSH community-market package contract
(`dsh.bundle.patch` + `dsh.client` manifest), so it can be installed from the
market or with:

```sh
dsh plugin --profile <profile> add dsh-settings-beautify
```

### Manual install (development)

```sh
pnpm add dsh-settings-beautify        # into the profile's package set
# and ensure the bundle entry is declared, e.g. via the profile patch:
#   - insert:
#       - id: dsh-settings-beautify
#         name: dsh-settings-beautify
```

After install, restart DSH Desktop (or reload the web window). A new
**美化 / Beautify** page appears in the settings nav rail.

## Usage

Open **设置 Settings** → **美化 Beautify**:

- **启用美化 Enable Beautify** — apply or restore the original DSH look.
- **界面密度 Density** — 紧凑 Compact / 标准 Default / 宽松 Comfortable.
- **动效 Motion** — card hover micro-motion and transitions.
- **关于 About** — version and source link.

Preferences are stored in the browser's `localStorage`
(`dsh-settings-beautify:prefs`); no host files or settings namespaces are
touched.

## The design language

The full specification — tokens, hierarchy, spacing/radius/motion scale, and
the `data-dshb-*` attribute contract — lives in
[docs/DESIGN.md](docs/DESIGN.md). A condensed version:

| Role | Font | Color |
| --- | --- | --- |
| Page title (页面标题) | 18px / 600 / 26px | `--dsw-alias-label-primary` |
| Page explanation (页面解释) | 13px / 400 / 20px | `--dsw-alias-label-tertiary` |
| Group title (组标题) | 14px / 600 / 22px | `--dsw-alias-label-primary` |
| Item title (条目标题) | 14px / 500 / 22px | `--dsw-alias-label-primary` |
| Item description (条目解释) | 13px / 400 / 20px | `--dsw-alias-label-tertiary` |
| Body (正文) | 14px / 400 / 22px | `--dsw-alias-label-primary` |
| Caption (辅助文字) | 12px / 400 / 18px | `--dsw-alias-label-tertiary` |

Cards: 12px radius · `--dsw-alias-border-l2` · `--dsw-alias-bg-layer-2`.
Controls: 8px radius, 36px min-height, brand focus ring. Radii are tokenized
(`--dshb-*`) so a future version can offer alternate palettes.

## Contributing pages from other plugins

The DOM normalizer auto-tags the built-in pages. For **your** plugin's page,
either:

1. Add `data-dshb-scan` to the page root — the normalizer then applies the
   same heading/prose/card/row/control rules generically; or
2. Use the attributes directly (`data-dshb-page-title`,
   `data-dshb-item-title`, `data-dshb-card`, …) for full control.

See the [extensibility contract](docs/DESIGN.md#the-data-dshb-attribute-contract).

## Development

```sh
pnpm install
pnpm check        # syntax checks
pnpm test         # jsdom tests for the DOM normalizer (66 assertions)
pnpm sync-styles  # regenerate lib/styles/settings.css from lib/client.js
```

The test suite reconstructs the real DSH settings DOM (general items, models
cards, plugins tabs/fields, desktop groups, an opted-in third-party page) in
jsdom and asserts the full `data-dshb-*` tagging contract.

## Compatibility

- DSH Desktop 2.x (bundled web UI). The tagger is defensive: anything it
  cannot recognize is simply left untouched.
- The stylesheet only runs inside the settings panel scope; nothing outside
  settings is restyled.

## Security

No network requests, no host APIs, no file access, no remote code. Preferences
live in `localStorage`. See [SECURITY.md](SECURITY.md).

## License

MIT — see [LICENSE](LICENSE).
