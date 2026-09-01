# DSH Beautify — Design Language Specification

This document is the contract behind `dsh-settings-beautify`. It defines the
design language applied to the DSH settings surface and the
`data-dshb-*` attribute contract any page — including third-party pages — can
opt into.

## 1. Design principles

1. **One hierarchy everywhere.** Every settings page is
   *title → explanation → content*. Compact preference rows (the General
   section) are the same hierarchy at item level:
   *item title → item description → control*.
2. **Typography is a scale, not a guess.** One token per role; nothing on a
   settings page invents its own size.
3. **Surfaces repeat.** Cards, rows, controls, tabs, badges and focus rings
   share one radius/spacing/color vocabulary.
4. **Theme-proof.** Every color resolves through DSH's own `--dsw-*` tokens,
   so light, dark and system themes keep working with zero plugin code.
5. **Motion is a preference.** Micro-motion is subtle, short, and respects
   `prefers-reduced-motion`; the user can disable it.
6. **Non-invasive.** The language is applied by a DOM normalizer over
   build-hashed class names; unrecognized DOM is left untouched.

## 2. Typography scale

Tokens are defined on `[data-dshb-panel]` / `[data-dshb-scan]` roots.

| Token | Size / Weight / Line | Role |
| --- | --- | --- |
| `--dshb-size-title-page` | 18px / 600 / 26px | Page title (models, plugins, market, desktop, agent presets) |
| `--dshb-size-desc` | 13px / 400 / 20px | Page explanation, group explanation, item description |
| `--dshb-size-title-group` | 14px / 600 / 22px | Group heading inside a page |
| `--dshb-size-title-item` | 14px / 500 / 22px | Preference-row title, card title, field label |
| `--dshb-size-body` | 14px / 400 / 22px | Body text, controls, tab labels |
| `--dshb-size-caption` | 12px / 400 / 18px | Badges, hints, timestamps |
| `--dshb-size-code` | 12px / 400 / 18px | Code, fingerprints, URLs |

Colors: titles → `--dsw-alias-label-primary`; explanations/captions →
`--dsw-alias-label-tertiary`; body secondary → `--dsw-alias-label-secondary`.

Why these numbers? The settings panel content column is ~620–700px wide;
18px/600 page titles read as a heading without competing with the 14px body;
13px explanations stay legible yet subordinate; 14px/500 item titles match
the DSH row convention that most settings rows already approximate.

## 3. Surfaces

| Element | Spec |
| --- | --- |
| Card (`data-dshb-card`) | radius `--dshb-radius-card` (12px), border `--dshb-card-border` (`--dsw-alias-border-l2`), background `--dshb-card-bg` (`--dsw-alias-bg-layer-2`), 160ms ease transitions |
| Card hover (interactive cards) | border → `--dsw-alias-label-dimmed`, `translateY(-1px)`, soft shadow (only when motion is on) |
| Row (`data-dshb-row`) | 16px vertical padding; density variants 12px / 20px |
| Input / select (`data-dshb-input`) | 36px min-height, radius `--dshb-radius-control` (8px), `--dsw-alias-border-l2`, focus: brand border + 2px 18% halo |
| Pill (`data-dshb-pill`) | radius `--dshb-radius-pill` (999px), 36px min-height, 14px body type |
| Toggle (`data-dshb-toggle`) | pill radius; focus ring 2px brand |
| Tabs (`data-dshb-tab`) | 14px / 500; active + hover → `--dsw-alias-label-primary` |
| Badge (`data-dshb-badge`) | pill radius, 12px caption, 2px/8px padding |
| Focus ring | 2px `--dsw-alias-brand-primary`, offset 2px, on every control and nav cell |
| Scrollbar (panel) | 8px, `--dsw-alias-scrollbar-bg-l2` thumb, pill radius |

Motion: `--dshb-duration` 160ms, `--dshb-ease` `cubic-bezier(0.16, 1, 0.3, 1)`.
Density: `data-dshb-density="compact"` shrinks rows to 12px and list gaps to
8px; `"comfortable"` grows rows to 20px and gaps to 14px.

## 4. Page architecture

A normalized settings page looks like this (the tagger produces these
attributes automatically):

```html
<div data-slot="settings.section">            <!-- section host -->
  <div class="page-root">                      <!-- content column, capped at 720px -->
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

## 5. The `data-dshb-*` attribute contract

### 5.1 Auto-tagged roles (settings panel)

The normalizer observes the settings dialog and tags:

| Attribute | Meaning |
| --- | --- |
| `data-dshb-panel` | Settings dialog root. Removing it disables the whole language (the "Enable Beautify" toggle does exactly this). |
| `data-dshb-nav`, `data-dshb-nav-title`, `data-dshb-nav-cell` | Nav rail chrome. |
| `data-dshb-content`, `data-dshb-header`, `data-dshb-actions`, `data-dshb-close`, `data-dshb-options` | Panel chrome. |
| `data-dshb-section` | The active section host (`[data-slot="settings.section"]`). |
| `data-dshb-page-title`, `data-dshb-page-desc` | First heading + its prose sibling. |
| `data-dshb-group-title`, `data-dshb-group-desc` | Subsequent headings + prose siblings. |
| `data-dshb-card`, `data-dshb-card-interactive`, `data-dshb-card-list` | Bordered, rounded surfaces and their containers. |
| `data-dshb-row`, `data-dshb-item-text`, `data-dshb-item-title`, `data-dshb-item-desc` | Preference rows and their text column. |
| `data-dshb-control`, `data-dshb-input`, `data-dshb-toggle`, `data-dshb-pill` | Interactive controls. |
| `data-dshb-field` | Label + input groups. |
| `data-dshb-tabs`, `data-dshb-tab` | Tab lists and tabs. |
| `data-dshb-badge`, `data-dshb-code`, `data-dshb-link` | Small text furniture. |
| `data-dshb-motion`, `data-dshb-density` | Preference mirrors on the panel root. |

### 5.2 Opt-in for third-party pages

Any page outside the settings panel (an archived-conversations page, a
plugin-owned settings-like page, …) can join the language in two ways:

**A. One attribute.** Add `data-dshb-scan` to the page root. The normalizer
then applies the generic pass: headings → page/group title + prose, bordered
rounded elements → cards, divider rows → rows (with title/description/control
detection), inputs/pills/toggles/badges/code/links → their roles.

```html
<div data-dshb-scan>
  <h2>已归档对话</h2>
  <div>… row with title/desc/control …</div>
</div>
```

**B. Full control.** Use the attributes directly in your own JSX; the
normalizer respects existing attributes and never overrides them.

### 5.3 Stability promise

`data-dshb-*` attributes are a stable public contract. DSH build-hashed class
names are *not*. The normalizer is defensive: unknown structures are ignored,
and a failed heuristic only means a node keeps its original styling.

## 6. Preferences

| Key | Values | Effect |
| --- | --- | --- |
| `enabled` | `true` / `false` | Adds/removes `data-dshb-panel` (and `-motion`/`-density`), toggling the whole language. |
| `density` | `compact` / `default` / `comfortable` | Sets `data-dshb-density`; scales row padding and list gaps. |
| `motion` | `true` / `false` | Sets `data-dshb-motion`; controls hover micro-motion. `prefers-reduced-motion` always wins. |

Stored in `localStorage` under `dsh-settings-beautify:prefs`. The plugin is
headless — no settings page owns these values; tune them from the browser
console with `window.DSHB.setPrefs({ ... })`.

## 7. Future directions

- Alternate palettes via the existing `--dshb-*` tokens (soft / high-contrast
  card treatments, larger type tiers).
- Opt-in host-side settings namespace for per-profile preference sync.
- RTL and larger-a11y-type audit once DSH ships those surfaces.
