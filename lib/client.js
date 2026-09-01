/**
 * dsh-settings-beautify — client half.
 *
 * A single design language for the DSH settings surface:
 *
 *   1. A DOM normalizer ("tagger") watches the settings panel and marks every
 *      structural role with a stable `data-dshb-*` attribute — page title,
 *      page explanation, group title, item title, item description, control,
 *      card, input, toggle, pill, badge, tabs, … — so the stylesheet never
 *      depends on DSH's build-hashed CSS class names.
 *   2. A scoped stylesheet applies the design language on top of those
 *      attributes: unified typography (title / explanation / content
 *      hierarchy), consistent cards, controls, focus rings, tabs, badges,
 *      scrollbars and optional motion. All colors come from DSH's own
 *      `--dsw-*` tokens, so light/dark/system themes keep working.
 *   3. The plugin is headless by design: it adds no settings page of its own
 *      (nothing appears in the settings nav rail). Preferences are read from
 *      localStorage (`dsh-settings-beautify:prefs`) and can be changed from
 *      the browser console via `window.DSHB.setPrefs(...)`.
 *
 * Third-party plugin pages (archived conversations, plugin-owned settings,
 * …) opt into the same language by adding `data-dshb-scan` to their root, or
 * by using the `data-dshb-*` attributes directly — see docs/DESIGN.md.
 *
 * This file is a single self-contained client module: plain JavaScript with
 * no module-loader dependencies (not even `react`), and the stylesheet is
 * embedded below (mirror of lib/styles/settings.css, kept in sync by the
 * repo script `pnpm run sync-styles`).
 */
window.__ModuleLoader__.load({
	id: "dsh-settings-beautify",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		//#region dshb-core
		/**
		 * Pure browser core: tagger + preferences + stylesheet installation.
		 * Takes the window explicitly so the same code is unit-testable
		 * (test/tagger.test.mjs) and runs inside the module loader.
		 */
		function createDshbCore(win) {
			const doc = win.document;
			const STYLE_ID = "dsh-settings-beautify-styles";
			const STORAGE_KEY = "dsh-settings-beautify:prefs";
			const VERSION = "0.2.5";

			/** Interactive element shapes — never candidates for text roles. */
			const INTERACTIVE = 'button, input, select, textarea, [role="switch"], [role="combobox"], a, label';

			/** Short role names; attribute form is `data-dshb-<role>`. */
			const R = {
				panel: "panel",
				nav: "nav",
				navTitle: "nav-title",
				navCell: "nav-cell",
				content: "content",
				header: "header",
				actions: "actions",
				close: "close",
				options: "options",
				section: "section",
				pageTitle: "page-title",
				pageDesc: "page-desc",
				groupTitle: "group-title",
				groupDesc: "group-desc",
				cardList: "card-list",
				card: "card",
				cardInteractive: "card-interactive",
				row: "row",
				itemText: "item-text",
				itemTitle: "item-title",
				itemDesc: "item-desc",
				control: "control",
				input: "input",
				toggle: "toggle",
				pill: "pill",
				field: "field",
				tabs: "tabs",
				tab: "tab",
				badge: "badge",
				code: "code",
				link: "link",
				scan: "scan",
				version: "version"
			};

			function attr(role) {
				return "data-dshb-" + (R[role] ?? role);
			}
			function hasRole(el, role) {
				return el.hasAttribute(attr(role));
			}
			function tag(el, role) {
				if (el !== null && el.nodeType === 1 && !hasRole(el, role)) el.setAttribute(attr(role), "");
			}

			// ---------- preferences ----------
			const PREF_DEFAULTS = { enabled: true, density: "default", motion: true };
			const DENSITIES = ["compact", "default", "comfortable"];

			function loadPrefs() {
				try {
					const raw = win.localStorage.getItem(STORAGE_KEY);
					if (raw === null) return { ...PREF_DEFAULTS };
					const parsed = JSON.parse(raw);
					return {
						enabled: typeof parsed.enabled === "boolean" ? parsed.enabled : PREF_DEFAULTS.enabled,
						density: DENSITIES.includes(parsed.density) ? parsed.density : PREF_DEFAULTS.density,
						motion: typeof parsed.motion === "boolean" ? parsed.motion : PREF_DEFAULTS.motion
					};
				} catch {
					return { ...PREF_DEFAULTS };
				}
			}
			function savePrefs(prefs) {
				try {
					win.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
				} catch {
					// storage unavailable (private mode, …) — preferences stay session-local
				}
			}
			/** Mirror preferences onto the settings dialog; returns the dialog or null. */
			function findSettingsDialog() {
				const host = doc.querySelector('[data-slot="settings.section"]');
				if (host === null) return null;
				return host.closest('[role="dialog"]');
			}
			function applyPrefsToDialog() {
				const dialog = findSettingsDialog();
				if (dialog === null) return;
				const prefs = loadPrefs();
				if (prefs.enabled) {
					dialog.setAttribute(attr("panel"), "");
					dialog.setAttribute(attr("motion"), prefs.motion ? "on" : "off");
					dialog.setAttribute(attr("density"), prefs.density);
				} else {
					// Every rule is scoped under [data-dshb-panel]: dropping the
					// attribute restores DSH's original look in one step.
					dialog.removeAttribute(attr("panel"));
					dialog.removeAttribute(attr("motion"));
					dialog.removeAttribute(attr("density"));
				}
			}
			/**
			 * Merge one preference patch into localStorage and mirror it onto
			 * the open settings dialog. Headless by design: no settings UI
			 * owns these values (see the `setPrefs` debug handle).
			 */
			function updatePrefs(patch) {
				const prefs = { ...loadPrefs(), ...patch };
				savePrefs(prefs);
				applyPrefsToDialog();
				return prefs;
			}

			// ---------- computed-style helpers ----------
			/** parseFloat that treats unset values (""/NaN) as 0px. */
			function px(value) {
				const n = parseFloat(value);
				return Number.isFinite(n) ? n : 0;
			}
			function visible(el) {
				const cs = win.getComputedStyle(el);
				return cs.display !== "none" && cs.visibility !== "hidden" && !el.hidden;
			}
			function isInteractive(el) {
				return el.matches(INTERACTIVE);
			}
			/** Length of non-interactive text within `el` (depth-limited walk). */
			function textOf(el, depth, maxDepth) {
				if (isInteractive(el)) return 0;
				if (depth > maxDepth) return 0;
				let n = 0;
				for (const node of el.childNodes) {
					if (node.nodeType === 3) n += node.nodeValue.replace(/\s/g, "").length;
					else if (node.nodeType === 1) n += textOf(node, depth + 1, maxDepth);
				}
				return n;
			}
			/** The element right after a heading that carries prose (p, or bare div). */
			function proseSibling(el) {
				const next = el.nextElementSibling;
				if (next === null) return null;
				if (next.tagName === "P") return next;
				if (next.tagName === "DIV" && next.children.length === 0) return next;
				return null;
			}
			function isCard(el) {
				const cs = win.getComputedStyle(el);
				if (cs.display === "none" || cs.visibility === "hidden") return false;
				if (el.closest("[" + attr("nav") + "]") !== null) return false;
				if (px(cs.borderRadius) < 8) return false;
				const top = px(cs.borderTopWidth);
				if (!(top > 0)) return false;
				if (!(px(cs.borderBottomWidth) > 0 && px(cs.borderLeftWidth) > 0 && px(cs.borderRightWidth) > 0)) return false;
				return true;
			}
			function isCardInteractive(el) {
				if (el.matches('button, [role="button"], [role="tab"]')) return true;
				return el.querySelector('button, [role="button"], [role="tab"], a') !== null;
			}
			function rectWidth(el) {
				return el.getBoundingClientRect().width || px(win.getComputedStyle(el).width) || 0;
			}
			function rectHeight(el) {
				return el.getBoundingClientRect().height || px(win.getComputedStyle(el).height) || 0;
			}
			function isToggleShape(el) {
				const w = rectWidth(el);
				const h = rectHeight(el);
				return w >= 30 && w <= 64 && h >= 16 && h <= 32;
			}
			function isPill(el) {
				const cs = win.getComputedStyle(el);
				if (px(cs.borderRadius) < 12) return false;
				return rectWidth(el) < 140;
			}
			function isBadge(el) {
				if (isInteractive(el)) return false;
				const text = el.textContent.trim();
				if (text.length === 0 || text.length > 40) return false;
				const cs = win.getComputedStyle(el);
				const size = px(cs.fontSize);
				if (!(size > 0 && size <= 12.5)) return false;
				if (px(cs.borderRadius) < 4) return false;
				if (px(cs.paddingTop) >= 8) return false;
				if (px(cs.paddingLeft) >= 12) return false;
				return true;
			}
			function isListRow(el) {
				const cs = win.getComputedStyle(el);
				if (px(cs.borderTopWidth) !== 0) return false;
				if (!(px(cs.borderBottomWidth) > 0)) return false;
				const pt = px(cs.paddingTop);
				return pt >= 8 && pt <= 28;
			}
			function hasInputDescendant(el) {
				return el.querySelector("input, select, textarea") !== null;
			}
			function hasLabelChild(el) {
				for (const child of el.children) {
					if (child.tagName !== "SPAN" && child.tagName !== "DIV" && child.tagName !== "LABEL") continue;
					if (isInteractive(child)) continue;
					if (child.textContent.trim().length > 0 && textOf(child, 0, 2) > 0) return true;
				}
				return false;
			}

			// ---------- tagging passes ----------
			function tagControl(el) {
				tag(el, "control");
				if (el.tagName === "INPUT" || el.tagName === "SELECT" || el.tagName === "TEXTAREA") {
					tag(el, "input");
					return;
				}
				if (el.getAttribute("role") === "switch" || el.hasAttribute("aria-checked") || el.hasAttribute("data-state")) {
					tag(el, "toggle");
					return;
				}
				if (isToggleShape(el)) {
					tag(el, "toggle");
					return;
				}
				if (isPill(el)) tag(el, "pill");
			}
			/** Title/description pass for one row root (shared by settings rows and scan-root rows). */
			function scanRow(row) {
				tag(row, "row");
				let best = null;
				let bestScore = 0;
				for (const child of row.children) {
					if (isInteractive(child)) continue;
					if (child.tagName === "svg") continue;
					const score = textOf(child, 0, 3);
					if (score > bestScore) {
						bestScore = score;
						best = child;
					}
				}
				if (best !== null) {
					tag(best, "itemText");
					let titled = false;
					for (const kid of best.children) {
						if (isInteractive(kid) || kid.tagName === "svg") continue;
						if (kid.textContent.trim().length === 0) continue;
						if (!titled) {
							tag(kid, "itemTitle");
							titled = true;
						} else {
							tag(kid, "itemDesc");
							break;
						}
					}
					if (!titled) tag(best, "itemTitle");
				}
				for (const el of row.querySelectorAll('button, input, select, textarea, [role="switch"], [role="combobox"]')) {
					tagControl(el);
				}
			}
			function scanField(field) {
				tag(field, "field");
				let titled = false;
				for (const child of field.children) {
					if (isInteractive(child)) continue;
					if (child.textContent.trim().length === 0) continue;
					if (hasInputDescendant(child)) continue;
					if (!titled) {
						tag(child, "itemTitle");
						titled = true;
					}
				}
			}
			/** Headings / prose / cards / controls pass shared by section and scan roots. */
			function scanRoot(root, generalItems) {
				// page title + page explanation
				const headings = Array.from(root.querySelectorAll("h1, h2, h3, h4"));
				let pageTitle = null;
				for (const h of headings) {
					if (hasRole(h, "pageTitle") || hasRole(h, "groupTitle")) continue;
					if (!visible(h)) continue;
					pageTitle = h;
					break;
				}
				if (pageTitle !== null) {
					tag(pageTitle, "pageTitle");
					const prose = proseSibling(pageTitle);
					if (prose !== null) tag(prose, "pageDesc");
				}
				// group titles + explanations
				for (const h of headings) {
					if (h === pageTitle || hasRole(h, "pageTitle")) continue;
					if (!visible(h)) continue;
					tag(h, "groupTitle");
					const prose = proseSibling(h);
					if (prose !== null) tag(prose, "groupDesc");
				}
				// card lists
				for (const list of root.querySelectorAll("ul, ol")) {
					if (list.closest("[" + attr("card") + "]") !== null) continue;
					tag(list, "cardList");
				}
				// cards
				const cardCandidates = root.querySelectorAll("div, li, section, article, button, form");
				for (const el of cardCandidates) {
					if (hasRole(el, "card") || hasRole(el, "row")) continue;
					if (!visible(el)) continue;
					if (isCard(el)) {
						tag(el, "card");
						if (isCardInteractive(el)) tag(el, "cardInteractive");
					}
				}
				// containers whose direct children are all cards
				for (const el of root.querySelectorAll("div, ul, ol")) {
					if (hasRole(el, "cardList")) continue;
					let cards = 0;
					for (const child of el.children) {
						if (hasRole(child, "card")) cards += 1;
						if (cards >= 2) break;
					}
					if (cards >= 2) tag(el, "cardList");
				}
				// settings item rows (data-slot contract)
				if (generalItems) {
					for (const item of root.querySelectorAll('[data-slot="settings.general.item"]')) {
						const row = item.firstElementChild;
						if (row !== null) scanRow(row);
					}
				} else {
					// generic divider rows inside opted-in roots
					for (const el of root.querySelectorAll("div, li")) {
						if (hasRole(el, "row") || hasRole(el, "card")) continue;
						if (isListRow(el)) scanRow(el);
					}
				}
				// fields (label + input pairs)
				for (const el of root.querySelectorAll("div")) {
					if (hasRole(el, "field") || hasRole(el, "card") || hasRole(el, "row")) continue;
					if (hasInputDescendant(el) && hasLabelChild(el)) scanField(el);
				}
				// tabs
				const tablist = root.querySelector('[role="tablist"]');
				if (tablist !== null) {
					tag(tablist, "tabs");
					for (const tab of tablist.querySelectorAll('[role="tab"], button')) tag(tab, "tab");
				}
				// controls
				for (const el of root.querySelectorAll('button, input, select, textarea, [role="switch"], [role="combobox"]')) {
					if (hasRole(el, "tab")) continue;
					tagControl(el);
				}
				// badges
				for (const el of root.querySelectorAll("span, div")) {
					if (hasRole(el, "badge") || hasRole(el, "card") || hasRole(el, "row")) continue;
					if (isBadge(el)) tag(el, "badge");
				}
				// code + links
				for (const el of root.querySelectorAll("code")) tag(el, "code");
				for (const el of root.querySelectorAll("a")) tag(el, "link");
			}
			/** Settings-panel pass: chrome (nav/content) + the active section. */
			function scanSettingsPanel() {
				const sectionHost = doc.querySelector('[data-slot="settings.section"]');
				if (sectionHost === null) return false;
				const panel = sectionHost.closest('[role="dialog"]');
				if (panel === null) return false;
				tag(panel, "panel");
				applyPrefsToDialog();
				for (const child of panel.children) {
					if (child.tagName === "NAV") {
						tag(child, "nav");
						const first = child.firstElementChild;
						if (first !== null) tag(first, "navTitle");
						for (const btn of child.querySelectorAll("button")) tag(btn, "navCell");
					} else {
						tag(child, "content");
						for (const piece of child.children) {
							if (piece === child.firstElementChild) {
								tag(piece, "header");
								for (const btn of piece.querySelectorAll("button")) tag(btn, "close");
							} else {
								tag(piece, "options");
							}
						}
					}
				}
				tag(sectionHost, "section");
				scanRoot(sectionHost, true);
				return true;
			}
			/** Generic pass for opted-in third-party pages. */
			function scanGenericRoots() {
				for (const root of doc.querySelectorAll("[" + attr("scan") + "]")) {
					if (root.closest('[data-slot="settings.section"]') !== null) continue;
					scanRoot(root, false);
				}
			}
			/** One full scan: settings panel (if open) + opted-in roots. */
			function scanAll() {
				scanSettingsPanel();
				scanGenericRoots();
			}

			// ---------- observer ----------
			function startTagger() {
				let raf = 0;
				const scan = () => {
					raf = 0;
					scanAll();
				};
				const schedule = () => {
					if (raf === 0) raf = win.requestAnimationFrame(scan);
				};
				const observer = new win.MutationObserver(schedule);
				observer.observe(doc.documentElement, { childList: true, subtree: true });
				schedule();
				const settleTimer = win.setTimeout(scan, 300);
				return () => {
					observer.disconnect();
					if (raf !== 0) win.cancelAnimationFrame(raf);
					win.clearTimeout(settleTimer);
				};
			}

			// ---------- stylesheet ----------
			function installStyles() {
				if (doc === undefined || doc.getElementById(STYLE_ID) !== null) return;
				const style = doc.createElement("style");
				style.id = STYLE_ID;
				style.setAttribute("data-plugin", "dsh-settings-beautify");
				style.setAttribute("data-plugin-css", "dsh-settings-beautify/settings.css");
				style.textContent = CSS;
				doc.head.appendChild(style);
			}

			return {
				VERSION,
				loadPrefs,
				savePrefs,
				applyPrefsToDialog,
				updatePrefs,
				setPrefs: updatePrefs,
				startTagger,
				installStyles,
				scanAll,
				scanSettingsPanel,
				attr,
				tag,
				hasRole
			};
		}
		//#endregion

		//#region dshb-styles
		/** The design language. Mirror: lib/styles/settings.css (repo script keeps them in sync). */
		const CSS = `
/* ==========================================================================
   dsh-settings-beautify — settings design language
   --------------------------------------------------------------------------
   Every rule is scoped under the tagged settings panel ([data-dshb-panel])
   or an opted-in page ([data-dshb-scan]); the tagger removes the panel
   attribute while the language is disabled, which turns everything off.
   All colors come from DSH's own --dsw-* tokens so light/dark/system
   themes keep working.
   ========================================================================== */
:is([data-dshb-panel], [data-dshb-scan]) {
  --dshb-size-title-page: 18px;
  --dshb-weight-title-page: 600;
  --dshb-line-title-page: 26px;
  --dshb-size-title-group: 14px;
  --dshb-weight-title-group: 600;
  --dshb-line-title-group: 22px;
  --dshb-size-title-item: 14px;
  --dshb-weight-title-item: 500;
  --dshb-line-title-item: 22px;
  --dshb-size-desc: 13px;
  --dshb-line-desc: 20px;
  --dshb-size-body: 14px;
  --dshb-line-body: 22px;
  --dshb-size-caption: 12px;
  --dshb-line-caption: 18px;
  --dshb-size-code: 12px;
  --dshb-line-code: 18px;
  --dshb-radius-card: 12px;
  --dshb-radius-control: 8px;
  --dshb-radius-pill: 999px;
  --dshb-duration: 160ms;
  --dshb-ease: cubic-bezier(0.16, 1, 0.3, 1);
  --dshb-card-bg: var(--dsw-alias-bg-layer-2);
  --dshb-card-border: var(--dsw-alias-border-l2);
  --dshb-focus: var(--dsw-alias-brand-primary);
  --dshb-focus-halo: color-mix(in srgb, var(--dshb-focus) 18%, transparent);
  --dshb-hover: var(--dsw-alias-interactive-bg-hover);
}

/* ---------- panel chrome ---------- */
[data-dshb-panel] {
  color: var(--dsw-alias-label-primary);
  -webkit-font-smoothing: antialiased;
  width: 880px; /* 800 -> 880: room for a consistent 720px content column */
}
:is([data-dshb-panel], [data-dshb-scan]) [data-dshb-nav] {
  width: 200px;
  gap: 16px; /* 标题与菜单之间的留白严格受控 */
  padding-top: 16px;
}
:is([data-dshb-panel], [data-dshb-scan]) [data-dshb-nav-title] {
  font-size: 20px; /* 左上角“设置”标题加大 */
  font-weight: 600;
  line-height: 28px;
  letter-spacing: -0.01em;
}
:is([data-dshb-panel], [data-dshb-scan]) [data-dshb-nav-cell] {
  border-radius: 10px;
  transition: background-color var(--dshb-duration) var(--dshb-ease);
}
:is([data-dshb-panel], [data-dshb-scan]) [data-dshb-nav-cell]:hover { background: var(--dshb-hover); }
:is([data-dshb-panel], [data-dshb-scan]) [data-dshb-nav-cell][aria-current="true"] {
  background: color-mix(in srgb, var(--dshb-focus) 12%, transparent);
  color: var(--dsw-alias-label-primary);
  font-weight: 500;
}
:is([data-dshb-panel], [data-dshb-scan]) [data-dshb-nav-cell]:focus-visible {
  outline: 2px solid var(--dshb-focus);
  outline-offset: -2px;
}
:is([data-dshb-panel], [data-dshb-scan]) [data-dshb-header] { padding: 16px 22px 8px 20px; }
:is([data-dshb-panel], [data-dshb-scan]) [data-dshb-close] {
  border-radius: 8px;
  transition: background-color var(--dshb-duration) var(--dshb-ease), color var(--dshb-duration) var(--dshb-ease);
}
:is([data-dshb-panel], [data-dshb-scan]) [data-dshb-close]:hover { background: var(--dshb-hover); }
:is([data-dshb-panel], [data-dshb-scan]) [data-dshb-options] {
  padding-top: 6px; /* 右列顶部与左菜单顶部平行：54 + 6 = 60 = 16 + 28 + 16 */
  padding-right: 28px;
  padding-bottom: 16px; /* 底部留白严格受控 */
  scrollbar-width: thin;
  scrollbar-color: var(--dsw-alias-scrollbar-bg-l2) transparent;
}
:is([data-dshb-panel], [data-dshb-scan]) [data-dshb-options]::-webkit-scrollbar { width: 8px; height: 8px; }
:is([data-dshb-panel], [data-dshb-scan]) [data-dshb-options]::-webkit-scrollbar-thumb {
  background: var(--dsw-alias-scrollbar-bg-l2);
  border-radius: 999px;
}
:is([data-dshb-panel], [data-dshb-scan]) [data-dshb-options]::-webkit-scrollbar-thumb:hover {
  background: var(--dsw-alias-scrollbar-hover-l2);
}

/* ---------- page architecture: title / explanation / content ---------- */
[data-dshb-section] > * { max-width: 720px; }
:is([data-dshb-panel], [data-dshb-scan]) [data-dshb-page-title] {
  font-size: var(--dshb-size-title-page);
  font-weight: var(--dshb-weight-title-page);
  line-height: var(--dshb-line-title-page);
  letter-spacing: -0.01em;
  color: var(--dsw-alias-label-primary);
}
:is([data-dshb-panel], [data-dshb-scan]) [data-dshb-page-desc] {
  font-size: var(--dshb-size-desc);
  line-height: var(--dshb-line-desc);
  color: var(--dsw-alias-label-tertiary);
}
:is([data-dshb-panel], [data-dshb-scan]) [data-dshb-group-title] {
  font-size: var(--dshb-size-title-group);
  font-weight: var(--dshb-weight-title-group);
  line-height: var(--dshb-line-title-group);
  letter-spacing: normal;
  text-transform: none;
  color: var(--dsw-alias-label-primary);
}
:is([data-dshb-panel], [data-dshb-scan]) [data-dshb-group-desc] {
  font-size: var(--dshb-size-desc);
  line-height: var(--dshb-line-desc);
  color: var(--dsw-alias-label-tertiary);
}
:is([data-dshb-panel], [data-dshb-scan]) [data-dshb-item-title] {
  font-size: var(--dshb-size-title-item);
  font-weight: var(--dshb-weight-title-item);
  line-height: var(--dshb-line-title-item);
  color: var(--dsw-alias-label-primary);
}
:is([data-dshb-panel], [data-dshb-scan]) [data-dshb-item-desc] {
  font-size: var(--dshb-size-desc);
  line-height: var(--dshb-line-desc);
  color: var(--dsw-alias-label-tertiary);
}
:is([data-dshb-panel], [data-dshb-scan]) p {
  font-size: var(--dshb-size-body);
  line-height: var(--dshb-line-body);
}

/* ---------- rows ---------- */
:is([data-dshb-panel], [data-dshb-scan]) [data-dshb-row] { padding-top: 16px; padding-bottom: 16px; }
:is([data-dshb-panel], [data-dshb-scan]) [data-dshb-row]:first-child { padding-top: 8px; }
[data-dshb-panel][data-dshb-density="compact"] [data-dshb-row] { padding-top: 12px; padding-bottom: 12px; }
[data-dshb-panel][data-dshb-density="comfortable"] [data-dshb-row] { padding-top: 20px; padding-bottom: 20px; }

/* ---------- cards ---------- */
:is([data-dshb-panel], [data-dshb-scan]) [data-dshb-card] {
  border: 1px solid var(--dshb-card-border);
  border-radius: var(--dshb-radius-card);
  background: var(--dshb-card-bg);
  transition:
    border-color var(--dshb-duration) var(--dshb-ease),
    background-color var(--dshb-duration) var(--dshb-ease),
    transform var(--dshb-duration) var(--dshb-ease),
    box-shadow var(--dshb-duration) var(--dshb-ease);
}
:is([data-dshb-panel], [data-dshb-scan]) [data-dshb-card-interactive]:hover {
  border-color: var(--dsw-alias-label-dimmed);
  transform: translateY(-1px);
  box-shadow: 0 4px 14px color-mix(in srgb, #000 10%, transparent);
}
[data-dshb-panel][data-dshb-motion="off"] [data-dshb-card-interactive]:hover {
  transform: none;
  box-shadow: none;
}
[data-dshb-panel][data-dshb-motion="off"] [data-dshb-card] { transition: none; }
:is([data-dshb-panel], [data-dshb-scan]) [data-dshb-card-list] { gap: 10px; }
[data-dshb-panel][data-dshb-density="compact"] [data-dshb-card-list] { gap: 8px; }
[data-dshb-panel][data-dshb-density="comfortable"] [data-dshb-card-list] { gap: 14px; }

/* ---------- controls ---------- */
:is([data-dshb-panel], [data-dshb-scan]) [data-dshb-control] { font-family: inherit; }
:is([data-dshb-panel], [data-dshb-scan]) [data-dshb-input] {
  min-height: 36px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: var(--dshb-radius-control);
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-primary);
  font-size: var(--dshb-size-body);
  line-height: var(--dshb-line-body);
}
:is([data-dshb-panel], [data-dshb-scan]) [data-dshb-input]:focus-visible {
  outline: none;
  border-color: var(--dshb-focus);
  box-shadow: 0 0 0 2px var(--dshb-focus-halo);
}
:is([data-dshb-panel], [data-dshb-scan]) [data-dshb-pill] {
  min-height: 36px;
  padding-left: 14px;
  padding-right: 14px;
  border-radius: var(--dshb-radius-pill);
  font-size: var(--dshb-size-body);
  line-height: var(--dshb-line-body);
}
:is([data-dshb-panel], [data-dshb-scan]) [data-dshb-pill]:hover:not(:disabled) { background: var(--dshb-hover); }
:is([data-dshb-panel], [data-dshb-scan]) [data-dshb-toggle] { border-radius: var(--dshb-radius-pill); }
:is([data-dshb-panel], [data-dshb-scan]) [data-dshb-toggle]:focus-visible {
  outline: 2px solid var(--dshb-focus);
  outline-offset: 2px;
}
:is([data-dshb-panel], [data-dshb-scan]) [data-dshb-control]:focus-visible {
  outline: 2px solid var(--dshb-focus);
  outline-offset: 2px;
}

/* ---------- tabs ---------- */
:is([data-dshb-panel], [data-dshb-scan]) [data-dshb-tab] {
  font-size: var(--dshb-size-body);
  font-weight: 500;
}
:is([data-dshb-panel], [data-dshb-scan]) [data-dshb-tab]:hover,
:is([data-dshb-panel], [data-dshb-scan]) [data-dshb-tab][data-active="true"],
:is([data-dshb-panel], [data-dshb-scan]) [data-dshb-tab][aria-selected="true"] {
  color: var(--dsw-alias-label-primary);
}

/* ---------- badges / code / links ---------- */
:is([data-dshb-panel], [data-dshb-scan]) [data-dshb-badge] {
  padding-top: 2px;
  padding-bottom: 2px;
  padding-left: 8px;
  padding-right: 8px;
  border-radius: var(--dshb-radius-pill);
  font-size: var(--dshb-size-caption);
  line-height: var(--dshb-line-caption);
}
:is([data-dshb-panel], [data-dshb-scan]) [data-dshb-code] {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
  font-size: var(--dshb-size-code);
  line-height: var(--dshb-line-code);
}
:is([data-dshb-panel], [data-dshb-scan]) [data-dshb-link] {
  color: var(--dsw-alias-brand-primary);
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 2px;
}
:is([data-dshb-panel], [data-dshb-scan]) [data-dshb-link]:hover { text-decoration-thickness: 2px; }

/* ---------- reduced motion ---------- */
@media (prefers-reduced-motion: reduce) {
  [data-dshb-panel] *,
  [data-dshb-scan] * {
    transition: none !important;
    animation: none !important;
  }
}
`;

		//#endregion

		/**
		 * Client plugin body: install the language and run the tagger.
		 * Headless by design — no settings section, no locale, no React.
		 */
		function apply(ctx) {
			const core = createDshbCore(window);
			ctx.effect(() => core.installStyles(), "dsh-settings-beautify: styles");
			ctx.effect(() => core.startTagger(), "dsh-settings-beautify: tagger");
		}

		// Debug / introspection handle: lets users run
		// `window.DSHB.scanAll()` / `window.DSHB.setPrefs({...})` etc. from
		// the browser console.
		if (typeof window !== "undefined" && window !== null) {
			try {
				window.DSHB = createDshbCore(window);
			} catch {
				// headless or hostile environment — the plugin still boots
			}
		}

		exports.inject = [];
		exports.apply = apply;
		return module.exports;
	}
});
