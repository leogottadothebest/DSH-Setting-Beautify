/**
 * jsdom-based test for the dsh-settings-beautify client core.
 *
 * It loads the real lib/client.js inside a jsdom window (with a stubbed
 * module loader and a fake `react`), then drives the DOM normalizer
 * (`window.DSHB.scanAll`) against settings panels reconstructed from the
 * real DSH settings DOM — general items, models cards, plugins tabs,
 * desktop settings, an opted-in third-party page — and asserts the
 * `data-dshb-*` tagging contract.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";
import { JSDOM } from "jsdom";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const clientSource = readFileSync(join(root, "lib", "client.js"), "utf8");

let passed = 0;
let failed = 0;
function ok(condition, label) {
  if (condition) {
    passed += 1;
    console.log(`  ✓ ${label}`);
  } else {
    failed += 1;
    console.error(`  ✗ ${label}`);
  }
}
function eq(actual, expected, label) {
  ok(actual === expected, `${label} (got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)})`);
}

/** Boot one isolated window with the client module loaded. */
function boot(domBody) {
  const dom = new JSDOM(`<!doctype html><html><body>${domBody}</body></html>`, {
    url: "https://dsh.test/",
    runScripts: "outside-only",
    pretendToBeVisual: true
  });
  const { window } = dom;
  const fakeReact = {
    createElement: () => ({}),
    useSyncExternalStore: () => ({}),
    useState: () => [],
    useEffect: () => {}
  };
  const required = new Set();
  window.__ModuleLoader__ = {
    load({ id, factory }) {
      factory((name) => {
        required.add(name);
        if (name === "react") return fakeReact;
        throw new Error(`unexpected require(${name})`);
      });
    }
  };
  vm.runInContext(clientSource, dom.getInternalVMContext());
  return { dom, window, required };
}

// ---------------------------------------------------------------- fixtures
const generalItems = `
  <div data-slot="settings.general.item">
    <div style="border-bottom:1px solid #eee;padding:16px 0;display:flex;align-items:center">
      <div style="flex:1;display:flex;flex-direction:column;gap:4px">
        <div style="font-size:14px">界面主题</div>
        <div style="font-size:12px;color:#999">选择深色或浅色外观</div>
      </div>
      <button style="border-radius:18px;height:36px;width:120px">深色</button>
    </div>
  </div>
  <div data-slot="settings.general.item">
    <div style="border-bottom:1px solid #eee;padding:16px 0;display:flex;align-items:center">
      <div style="flex:1;display:flex;flex-direction:column;gap:4px">
        <div style="font-size:14px">外观</div>
      </div>
      <div style="display:flex;gap:8px">
        <button style="border:1px solid #ddd;border-radius:16px;padding:20px 32px;width:180px">浅色</button>
        <button style="border:1px solid #ddd;border-radius:16px;padding:20px 32px;width:180px">深色</button>
      </div>
    </div>
  </div>`;

const modelsSection = `
  <div class="models-root">
    <h2 class="title" style="font-size:16px;font-weight:500">模型</h2>
    <p class="intro" style="font-size:14px;color:#999">配置模型提供方与密钥</p>
    <ul class="rows" style="display:flex;flex-direction:column;gap:8px">
      <li style="border:1px solid #ddd;border-radius:12px;padding:12px 14px;display:flex;align-items:center;gap:10px">
        <div style="display:flex;align-items:center;gap:6px">
          <span style="font-size:14px;font-weight:500">DeepSeek</span>
          <span style="border:1px solid #ccc;border-radius:4px;font-size:11px;padding:1px 6px">Beta</span>
        </div>
        <button style="border:1px solid #ddd;border-radius:8px;height:32px;padding:0 12px;margin-left:auto">配置</button>
      </li>
    </ul>
  </div>`;

const pluginsSection = `
  <div class="plugins-root">
    <h2 style="font-size:18px;font-weight:600">插件</h2>
    <p style="font-size:13px;color:#999">管理已安装的插件</p>
    <div role="tablist" style="border-bottom:1px solid #eee;display:flex;gap:22px">
      <button role="tab" data-active="true" style="font-size:13px">已安装</button>
      <button role="tab" style="font-size:13px">插件市场</button>
    </div>
    <div class="card" style="border:1px solid #ddd;border-radius:12px">
      <div style="padding:14px 16px">
        <div style="font-size:15px;font-weight:600">dsh-settings-beautify</div>
        <div style="font-size:13px;color:#999">设置界面美化</div>
      </div>
      <div style="border-top:1px solid #eee;padding:12px 0">
        <div style="padding:12px 16px">
          <div style="font-size:13px;font-weight:500;display:flex;align-items:center;gap:8px">选项一 <span style="border-radius:999px;font-size:11px;padding:1px 8px;background:#f0f0f0">beta</span></div>
          <input style="border:1px solid #ddd;border-radius:8px;height:34px;width:200px">
        </div>
      </div>
    </div>
  </div>`;

const desktopSection = `
  <div class="dshDesktopSettings">
    <header>
      <h2>桌面</h2>
      <p>桌面外壳设置</p>
    </header>
    <section>
      <h3>配置文件</h3>
      <p>选择当前使用的配置文件</p>
      <div class="dshDesktopSettingsList">
        <button style="border:1px solid #ddd;border-radius:10px;padding:13px 14px;width:300px;text-align:left"><span>默认</span></button>
      </div>
      <p style="border:1px solid #eee;border-radius:8px;padding:10px 12px;font-size:12px">提示：修改后需要重启</p>
    </section>
  </div>`;

const archivedPage = `
  <div data-dshb-scan>
    <h2>已归档对话</h2>
    <div style="border-bottom:1px solid #eee;padding:16px 0;display:flex;align-items:center">
      <div style="flex:1;display:flex;flex-direction:column;gap:4px">
        <div style="font-size:14px">2024-01-01 的对话</div>
        <div style="font-size:12px;color:#999">3 条消息 · 归档于 1 月前</div>
      </div>
      <button style="border-radius:18px;height:36px;width:100px">恢复</button>
    </div>
  </div>`;

function panelWith(sectionHtml) {
  return `
  <div class="overlay">
    <div class="mask"></div>
    <div class="panel" role="dialog" aria-modal="true">
      <nav>
        <div class="navTitle">设置</div>
        <div class="navList">
          <button class="navCell">通用</button>
          <button class="navCell" aria-current="true">模型</button>
        </div>
      </nav>
      <div class="content">
        <div class="header">
          <div class="actions"><button style="border:1px solid #ddd;border-radius:999px;padding:4px 12px">打开文档</button></div>
          <button class="close" style="width:28px;height:28px;border-radius:28px">✕</button>
        </div>
        <div class="options">
          <div data-slot="settings.section">${sectionHtml}</div>
        </div>
      </div>
    </div>
  </div>`;
}

// ---------------------------------------------------------------- the tests
const { window, required } = boot(`${panelWith(modelsSection)}${archivedPage}`);
const DSHB = window.DSHB;
const $ = (sel) => window.document.querySelector(sel);
const $$ = (sel) => [...window.document.querySelectorAll(sel)];

/** Replace the active section content (as a nav click would) and rescan. */
function setSection(html) {
  const host = $('[data-slot="settings.section"]');
  host.innerHTML = html;
  DSHB.scanAll();
}

console.log("\n1) panel chrome");
const panel = $('.panel[role="dialog"]');
DSHB.scanAll();
ok(panel.hasAttribute("data-dshb-panel"), "panel tagged data-dshb-panel");
eq(panel.getAttribute("data-dshb-motion"), "on", "motion on by default");
eq(panel.getAttribute("data-dshb-density"), "default", "density default by default");
ok($("nav").hasAttribute("data-dshb-nav"), "nav tagged");
ok($(".navTitle").hasAttribute("data-dshb-nav-title"), "nav title tagged");
eq($$(".navCell").length, 2, "two nav cells");
ok($$(".navCell").every((el) => el.hasAttribute("data-dshb-nav-cell")), "every nav cell tagged");
ok($(".content").hasAttribute("data-dshb-content"), "content tagged");
ok($(".header").hasAttribute("data-dshb-header"), "header tagged");
ok($(".close").hasAttribute("data-dshb-close"), "close button tagged");
ok($(".actions button").hasAttribute("data-dshb-close"), "header action button tagged as chrome action");
ok($(".options").hasAttribute("data-dshb-options"), "options tagged");
ok($('[data-slot="settings.section"]').hasAttribute("data-dshb-section"), "section host tagged");

console.log("\n2) models page (title / explanation / content)");
eq($(".models-root h2").getAttribute("data-dshb-page-title"), "", "models title tagged page-title");
eq($(".models-root .intro").getAttribute("data-dshb-page-desc"), "", "models intro tagged page-desc");
ok($(".models-root ul").hasAttribute("data-dshb-card-list"), "models list tagged card-list");
const modelCard = $(".models-root li");
ok(modelCard.hasAttribute("data-dshb-card"), "model row tagged card");
ok(modelCard.hasAttribute("data-dshb-card-interactive"), "model row interactive (contains button)");
ok($(".models-root span[style*='11px']").hasAttribute("data-dshb-badge"), "model tag badge");
ok($(".models-root button").hasAttribute("data-dshb-control"), "model action control");

console.log("\n3) plugins page (tabs / cards / fields)");
setSection(pluginsSection);
eq($('.plugins-root [role="tablist"]').getAttribute("data-dshb-tabs"), "", "tablist tagged tabs");
eq($$('.plugins-root [role="tab"]').length, 2, "two tabs");
ok($$('.plugins-root [role="tab"]').every((el) => el.hasAttribute("data-dshb-tab")), "every tab tagged");
ok($(".plugins-root .card").hasAttribute("data-dshb-card"), "plugin card tagged card");
const field = $(".plugins-root .card input").parentElement;
ok(field.hasAttribute("data-dshb-field"), "plugin config field tagged field");
ok(field.firstElementChild.hasAttribute("data-dshb-item-title"), "plugin field label tagged item-title");
ok($(".plugins-root input").hasAttribute("data-dshb-input"), "plugin input tagged input");
ok($(".plugins-root input").hasAttribute("data-dshb-control"), "plugin input tagged control");
ok($(".plugins-root span").hasAttribute("data-dshb-badge"), "plugin badge tagged badge");

console.log("\n4) desktop settings (groups)");
setSection(desktopSection);
eq($(".dshDesktopSettings header h2").getAttribute("data-dshb-page-title"), "", "desktop title tagged page-title");
eq($(".dshDesktopSettings header p").getAttribute("data-dshb-page-desc"), "", "desktop intro tagged page-desc");
eq($(".dshDesktopSettings section h3").getAttribute("data-dshb-group-title"), "", "desktop group h3 tagged group-title");
eq($(".dshDesktopSettings section h3 + p").getAttribute("data-dshb-group-desc"), "", "desktop group intro tagged group-desc");
const choice = $(".dshDesktopSettingsList button");
ok(choice.hasAttribute("data-dshb-card"), "desktop choice tagged card");
ok(choice.hasAttribute("data-dshb-control"), "desktop choice tagged control");
ok(!choice.hasAttribute("data-dshb-pill"), "desktop choice not a pill (wide)");
const notice = $(".dshDesktopSettings section > p:last-child");
ok(!notice.hasAttribute("data-dshb-badge"), "notice paragraph is not a badge");

console.log("\n5) general items (title / explanation / control)");
setSection(generalItems);
const rows = $$('[data-slot="settings.general.item"] > div');
eq(rows.length, 2, "two general rows");
ok(rows.every((el) => el.hasAttribute("data-dshb-row")), "every general row tagged row");
const first = rows[0];
eq(first.querySelector(":scope > div > div:first-child").getAttribute("data-dshb-item-title"), "", "first row title tagged item-title");
eq(first.querySelector(":scope > div > div:nth-child(2)").getAttribute("data-dshb-item-desc"), "", "first row desc tagged item-desc");
ok(first.querySelector(":scope > button").hasAttribute("data-dshb-pill"), "row selector tagged pill (rounded, narrow)");
const second = rows[1];
ok(second.querySelector(":scope > div").hasAttribute("data-dshb-item-text"), "appearance row text column tagged");
ok(second.querySelector(":scope > div > div:first-child").hasAttribute("data-dshb-item-title"), "appearance row title tagged");
ok($$(".panel button[style*='border-radius:16px']").every((el) => el.hasAttribute("data-dshb-card")), "appearance cubes tagged card");
ok($$(".panel button[style*='border-radius:16px']").every((el) => el.hasAttribute("data-dshb-control")), "appearance cubes tagged control");
ok(!$$(".panel button[style*='border-radius:16px']").some((el) => el.hasAttribute("data-dshb-pill")), "appearance cubes not pills (wide)");

console.log("\n6) opted-in third-party page (data-dshb-scan)");
const archived = $('[data-dshb-scan]');
eq(archived.querySelector("h2").getAttribute("data-dshb-page-title"), "", "archived page title tagged");
ok(archived.querySelector("div[style*='border-bottom']").hasAttribute("data-dshb-row"), "archived row tagged row");
ok(archived.querySelector("div[style*='font-size:14px']").hasAttribute("data-dshb-item-title"), "archived row title tagged");
ok(archived.querySelector("div[style*='font-size:12px']").hasAttribute("data-dshb-item-desc"), "archived row desc tagged");
ok(archived.querySelector("button").hasAttribute("data-dshb-pill"), "archived restore button tagged pill");

console.log("\n6b) section switch resets the scroll position");
const optionsEl = $(".options");
setSection(modelsSection);
optionsEl.scrollTop = 200;
setSection(desktopSection);
eq(optionsEl.scrollTop, 0, "switching sections resets the scroll to the top");
optionsEl.scrollTop = 120;
DSHB.scanAll();
eq(optionsEl.scrollTop, 120, "re-rendering the same section keeps the scroll");

console.log("\n7) preferences (enable / density / motion)");
eq(DSHB.loadPrefs().enabled, true, "enabled by default");
DSHB.setPrefs({ enabled: false });
ok(!panel.hasAttribute("data-dshb-panel"), "disabling removes data-dshb-panel");
ok(!panel.hasAttribute("data-dshb-density"), "disabling removes density attr");
DSHB.setPrefs({ enabled: true, density: "compact", motion: false });
ok(panel.hasAttribute("data-dshb-panel"), "re-enabling restores data-dshb-panel");
eq(panel.getAttribute("data-dshb-density"), "compact", "density compact mirrored");
eq(panel.getAttribute("data-dshb-motion"), "off", "motion off mirrored");
DSHB.setPrefs({ enabled: true, density: "default", motion: true });

console.log("\n8) module shape");
eq(required.size, 0, "client module requires nothing (headless, no react)");
ok(typeof window.DSHB.scanAll === "function", "window.DSHB exposes scanAll");
ok(typeof window.DSHB.setPrefs === "function", "window.DSHB exposes setPrefs (headless preferences)");

console.log("\n9) stylesheet sanity");
const cssText = readFileSync(join(root, "lib", "styles", "settings.css"), "utf8");
const cssBody = cssText.slice(cssText.indexOf("/* ===="));
eq(cssBody.split("{").length, cssBody.split("}").length, "balanced braces in lib/styles/settings.css");
ok(cssBody.includes(":is([data-dshb-panel], [data-dshb-scan])"), "stylesheet uses scoped :is selectors");
ok(cssBody.includes("[data-dshb-page-title]"), "stylesheet covers page-title");
ok(cssBody.includes("[data-dshb-item-desc]"), "stylesheet covers item-desc");
ok(cssBody.includes("prefers-reduced-motion"), "stylesheet respects reduced motion");
const embedded = clientSource.match(/const CSS = `\n([\s\S]*?)`;/)?.[1] ?? "";
eq(cssBody, embedded, "lib/styles/settings.css is in sync with the embedded stylesheet");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
