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
 *   3. The plugin registers its own settings page ("美化 / Beautify") that
 *      dogfoods the language and lets the user tune it (enable, density,
 *      motion). Preferences persist in localStorage.
 *
 * Third-party plugin pages (archived conversations, plugin-owned settings,
 * …) opt into the same language by adding `data-dshb-scan` to their root, or
 * by using the `data-dshb-*` attributes directly — see docs/DESIGN.md.
 *
 * This file is a single self-contained client module: plain JavaScript, no
 * imports beyond the module-loader's `react`, and the stylesheet is embedded
 * below (mirror of lib/styles/settings.css, kept in sync by the repo
 * script `pnpm run sync-styles`).
 */
window.__ModuleLoader__.load({
	id: "dsh-settings-beautify",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");

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
			const VERSION = "0.1.0";

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
			 * Tiny uSES-friendly store for the Beautify page. `getSnapshot`
			 * returns a stable reference until the next update.
			 */
			function createPrefsStore() {
				let state = loadPrefs();
				const listeners = new Set();
				return {
					getSnapshot() {
						return state;
					},
					subscribe(listener) {
						listeners.add(listener);
						return () => {
							listeners.delete(listener);
						};
					},
					update(patch) {
						state = { ...state, ...patch };
						savePrefs(state);
						applyPrefsToDialog();
						for (const listener of listeners) listener();
					},
					load() {
						return loadPrefs();
					}
				};
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
				createPrefsStore,
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
:is([data-dshb-panel], [data-dshb-scan]) [data-dshb-nav] { width: 200px; }
:is([data-dshb-panel], [data-dshb-scan]) [data-dshb-nav-title] {
  font-size: 15px;
  font-weight: 600;
  line-height: 24px;
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
:is([data-dshb-panel], [data-dshb-scan]) [data-dshb-header] { padding: 20px 22px 8px 20px; }
:is([data-dshb-panel], [data-dshb-scan]) [data-dshb-close] {
  border-radius: 8px;
  transition: background-color var(--dshb-duration) var(--dshb-ease), color var(--dshb-duration) var(--dshb-ease);
}
:is([data-dshb-panel], [data-dshb-scan]) [data-dshb-close]:hover { background: var(--dshb-hover); }
:is([data-dshb-panel], [data-dshb-scan]) [data-dshb-options] {
  padding-right: 28px;
  padding-bottom: 28px;
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

/* ---------- the Beautify page itself ----------
   The control page keeps its own layout classes so it stays usable even
   while the language is disabled. */
.dshbSection { display: flex; flex-direction: column; gap: 14px; }
.dshbRow {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 0;
  border-bottom: 1px solid var(--dsw-alias-border-l2);
}
.dshbRow:last-child { border-bottom: none; }
.dshbRowText {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  min-width: 0;
  padding-right: 48px;
}
.dshbToggle {
  position: relative;
  flex: none;
  width: 40px;
  height: 22px;
  padding: 2px;
  border: none;
  border-radius: 999px;
  background: var(--dsw-alias-border-l2);
  cursor: pointer;
  transition: background-color var(--dshb-duration) var(--dshb-ease);
}
.dshbToggle[aria-checked="true"] { background: var(--dsw-alias-brand-primary); }
.dshbToggle:disabled { cursor: default; opacity: 0.5; }
.dshbToggle::after {
  content: "";
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--dsw-alias-label-primary-foreground);
  transition: transform var(--dshb-duration) var(--dshb-ease);
}
.dshbToggle[aria-checked="true"]::after { transform: translateX(18px); }
.dshbPills { display: flex; flex-wrap: wrap; gap: 8px; }
.dshbPill {
  min-height: 36px;
  padding: 0 14px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 999px;
  background: transparent;
  color: var(--dsw-alias-label-primary);
  font: inherit;
  font-size: var(--dshb-size-body);
  line-height: var(--dshb-line-body);
  cursor: pointer;
  transition: background-color var(--dshb-duration) var(--dshb-ease), border-color var(--dshb-duration) var(--dshb-ease);
}
.dshbPill:hover { background: var(--dshb-hover); }
.dshbPill[data-selected="true"] {
  background: color-mix(in srgb, var(--dsw-alias-brand-primary) 12%, transparent);
  border-color: var(--dshb-focus);
}
.dshbVersion {
  color: var(--dsw-alias-label-secondary);
  white-space: nowrap;
}

/* ---------- reduced motion ---------- */
@media (prefers-reduced-motion: reduce) {
  [data-dshb-panel] *,
  [data-dshb-scan] * {
    transition: none !important;
    animation: none !important;
  }
}
`;

		//#region dshb-locales
		const NS = "dsh-settings-beautify";
		const zh = {
			nav: "美化",
			title: "界面美化",
			intro: "一套贯穿所有设置页面的设计语言：统一的标题、解释与内容层级，一致的卡片、控件、焦点与动效。",
			"enabled.title": "启用美化",
			"enabled.desc": "为设置界面应用 Beautify 设计语言；关闭后恢复 DSH 原始外观。",
			"density.title": "界面密度",
			"density.desc": "调整设置页行与卡片的间距松紧。",
			"density.compact": "紧凑",
			"density.default": "标准",
			"density.comfortable": "宽松",
			"motion.title": "动效",
			"motion.desc": "卡片悬停微动效与过渡动画；系统开启“减少动态效果”时自动关闭。",
			"about.title": "关于",
			"about.desc": "版本与项目信息。",
			"about.versionLabel": "版本",
			"about.repo": "源码与反馈",
			"about.repoDesc": "在 GitHub 上查看项目、提交 issue 或参与适配。"
		};
		const en = {
			nav: "Beautify",
			title: "Interface Beautify",
			intro: "One design language across every settings page: a unified title / explanation / content hierarchy, with consistent cards, controls, focus and motion.",
			"enabled.title": "Enable Beautify",
			"enabled.desc": "Apply the Beautify design language to the settings surface. Turn off to restore DSH's original look.",
			"density.title": "Density",
			"density.desc": "Adjust the spacing between rows and cards on settings pages.",
			"density.compact": "Compact",
			"density.default": "Default",
			"density.comfortable": "Comfortable",
			"motion.title": "Motion",
			"motion.desc": "Card hover micro-motion and transitions. Automatically disabled when the system prefers reduced motion.",
			"about.title": "About",
			"about.desc": "Version and project information.",
			"about.versionLabel": "Version",
			"about.repo": "Source & feedback",
			"about.repoDesc": "View the project on GitHub, file issues, or contribute adaptations."
		};
		//#endregion

		//#region dshb-section
		const REPO_URL = "https://github.com/leogottadothebest/DSH-Setting-Beautify";
		const VERSION = "0.1.0";

		/**
		 * The plugin's own settings page, built with the design language's
		 * own attributes (dogfooding) and layout classes (always available).
		 */
		function createBeautifySection(React) {
			return function BeautifySection(props) {
				const { usePrefs, setPrefs, locale, version } = props;
				const prefs = usePrefs();
				React.useSyncExternalStore(locale.subscribe, locale.getSnapshot);
				const t = (key) => locale.bind(NS)(key);
				const h = React.createElement;

				const row = (key, title, desc, control) =>
					h("div", { key, className: "dshbRow", "data-dshb-row": "" },
						h("div", { className: "dshbRowText", "data-dshb-item-text": "" },
							h("div", { "data-dshb-item-title": "" }, title),
							desc === null ? null : h("div", { "data-dshb-item-desc": "" }, desc)),
						control);

				const toggle = (checked, onToggle, disabled) =>
					h("button", {
						type: "button",
						role: "switch",
						"aria-checked": checked ? "true" : "false",
						className: "dshbToggle",
						"data-dshb-toggle": "",
						disabled: disabled === true ? true : undefined,
						onClick: onToggle
					});

				const densities = ["compact", "default", "comfortable"];
				const pills = h("div", { className: "dshbPills" },
					densities.map((density) =>
						h("button", {
							key: density,
							type: "button",
							className: "dshbPill",
							"data-dshb-pill": "",
							"data-selected": prefs.density === density ? "true" : undefined,
							onClick: () => setPrefs({ density })
						}, t("density." + density))));

				return h("div", { className: "dshbSection", "data-dshb-scan": "" },
					h("h2", { "data-dshb-page-title": "" }, t("title")),
					h("p", { "data-dshb-page-desc": "" }, t("intro")),
					row("enabled", t("enabled.title"), t("enabled.desc"),
						toggle(prefs.enabled, () => setPrefs({ enabled: !prefs.enabled }))),
					row("density", t("density.title"), t("density.desc"), pills),
					row("motion", t("motion.title"), t("motion.desc"),
						toggle(prefs.motion, () => setPrefs({ motion: !prefs.motion }), !prefs.enabled)),
					row("version", t("about.title"), t("about.desc"),
						h("code", { className: "dshbVersion", "data-dshb-code": "" }, t("about.versionLabel") + " v" + version)),
					row("repo", t("about.repo"), t("about.repoDesc"),
						h("a", {
							className: "dshbRepoLink",
							"data-dshb-link": "",
							href: REPO_URL,
							target: "_blank",
							rel: "noreferrer"
						}, t("about.repo"))));
			};
		}

		/**
		 * Client plugin body: install the language, run the tagger, and
		 * register the Beautify settings page.
		 */
		function apply(ctx) {
			const core = createDshbCore(window);
			ctx.effect(() => core.installStyles(), "dsh-settings-beautify: styles");
			ctx.effect(() => ctx.locale.register(NS, { zh, en }), "dsh-settings-beautify: dictionaries");
			ctx.effect(() => core.startTagger(), "dsh-settings-beautify: tagger");

			const store = core.createPrefsStore();
			const usePrefs = () => react.useSyncExternalStore(store.subscribe, store.getSnapshot);

			ctx.slots.inject("settings.section", () => ctx.slots.register({
				name: "settings.section",
				id: "beautify",
				order: 30,
				label: () => ctx.locale.bind(NS)("nav"),
				locale: NS,
				inject: () => ({
					usePrefs,
					setPrefs: store.update,
					locale: ctx.locale,
					version: VERSION
				})
			}, createBeautifySection(react)));
		}
		//#endregion

		// Debug / introspection handle: lets users run
		// `window.DSHB.scanAll()` etc. from the browser console.
		if (typeof window !== "undefined" && window !== null) {
			try {
				window.DSHB = createDshbCore(window);
			} catch {
				// headless or hostile environment — the plugin still boots
			}
		}

		exports.inject = ["slots", "locale"];
		exports.apply = apply;
		return module.exports;
	}
});
