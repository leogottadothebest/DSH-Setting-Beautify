/**
 * Live verification for dsh-settings-beautify against a running DSH Desktop.
 *
 * Requirements:
 *  - DSH Desktop running with the plugin installed (profile patch entry),
 *    restarted AFTER install, and in a mode that permits ordinary browser
 *    access (mode "compatibility" + openBrowser true, see ~/.dsh/settings.yaml).
 *  - Google Chrome installed at /Applications/Google Chrome.app.
 *
 * What it does:
 *  1. Reads the browser-session secret from ~/.dsh/.credentials.yaml and
 *     forges the authority-bound auth cookie (same scheme as
 *     @deepseek-ai/dsh-client-connection) — nothing is printed.
 *  2. Launches headless Chrome with a temp profile, injects the cookie,
 *     loads http://127.0.0.1:43120/, opens the settings dialog and dumps:
 *       - window.DSHB presence,
 *       - the nav cells (expect a "美化 / Beautify" cell),
 *       - data-dshb-* tagging on the active section,
 *       - computed typography of a tagged page title,
 *     and saves a screenshot to ./verify-settings.png.
 *
 * Usage: node scripts/verify-live.mjs [port=43120]
 */
import { createHmac, createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { parse as parseYaml } from "./yaml-min.mjs";

const PORT = Number(process.argv[2] ?? 43120);
const ORIGIN = `http://127.0.0.1:${PORT}`;
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const SCREENSHOT = join(process.cwd(), "verify-settings.png");

// ---------- forge the auth cookie (no output of secrets) ----------
function readAuthSecret() {
  const doc = parseYaml(readFileSync(join(homedir(), ".dsh", ".credentials.yaml"), "utf8"));
  return doc.records?.["client-connection/browser-session"]?.payload?.secret;
}
function b64url(bytes) {
  return Buffer.from(bytes).toString("base64").replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
}
function cookieFor(secret, authority) {
  const body = b64url(Buffer.from(JSON.stringify({
    version: 1,
    authority,
    issuedAt: Date.now(),
    expiresAt: Date.now() + 7 * 86400e3
  }), "utf8"));
  const value = `v1.${body}.${b64url(createHmac("sha256", secret).update(body).digest())}`;
  const name = "dsh-auth-" + b64url(createHash("sha256").update(authority).digest());
  return `${name}=${value}`;
}

// ---------- minimal CDP client over the built-in WebSocket ----------
function cdp(wsUrl) {
  const ws = new WebSocket(wsUrl);
  const pending = new Map();
  let seq = 0;
  const ready = new Promise((resolve, reject) => {
    ws.onopen = () => resolve();
    ws.onerror = (e) => reject(new Error(`CDP websocket error: ${e.message ?? e}`));
  });
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id !== undefined && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(msg.error.message));
      else resolve(msg.result);
    }
  };
  return {
    async call(method, params = {}) {
      await ready;
      const id = ++seq;
      ws.send(JSON.stringify({ id, method, params }));
      return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
    },
    close() { try { ws.close(); } catch {} }
  };
}

async function main() {
  const secret = readAuthSecret();
  if (secret === undefined) throw new Error("browser-session secret not found in ~/.dsh/.credentials.yaml");
  const cookie = cookieFor(secret, `127.0.0.1:${PORT}`);

  const chrome = spawn(CHROME, [
    "--headless=new",
    "--remote-debugging-port=0",
    "--disable-gpu",
    "--no-first-run",
    "--user-data-dir=/tmp/dshb-verify-profile",
    "--window-size=1280,860",
    "about:blank"
  ], { stdio: ["ignore", "ignore", "pipe"] });
  chrome.stderr.on("data", () => {});
  const teardown = () => { try { chrome.kill(); } catch {} };
  process.on("exit", teardown);

  // discover the debugging port from chrome's stderr line
  const port = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("chrome did not print a devtools port")), 15000);
    chrome.stderr.on("data", (chunk) => {
      const m = String(chunk).match(/DevTools listening on ws:\/\/127\.0\.0\.1:(\d+)/);
      if (m) { clearTimeout(timer); resolve(Number(m[1])); }
    });
    chrome.on("exit", () => reject(new Error("chrome exited early")));
  });

  const tabs = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: "PUT" })).json();
  const client = cdp(tabs.webSocketDebuggerUrl);
  await client.call("Network.enable");
  await client.call("Page.enable");
  await client.call("Network.setCookie", {
    name: cookie.split("=")[0],
    value: cookie.split("=").slice(1).join("="),
    url: ORIGIN,
    httpOnly: true,
    sameSite: "Strict"
  });
  await client.call("Page.navigate", { url: ORIGIN + "/" });

  const evaluate = async (expression) => {
    const r = await client.call("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error(`page evaluation failed: ${r.exceptionDetails.text}`);
    return r.result?.value;
  };

  // wait for the app shell
  for (let i = 0; i < 60; i += 1) {
    if (await evaluate(`document.querySelector('[aria-haspopup="dialog"]') !== null`)) break;
    await new Promise((r) => setTimeout(r, 500));
  }

  console.log("\n== 1) client module presence ==");
  console.log("window.DSHB:", await evaluate(`typeof window.DSHB`));

  console.log("\n== 2) open settings ==");
  await evaluate(`document.querySelector('[aria-haspopup="dialog"]').click()`);
  await new Promise((r) => setTimeout(r, 800));
  const navCells = await evaluate(`[...document.querySelectorAll('[data-dshb-nav-cell]')].map((el) => el.textContent.trim())`);
  console.log("nav cells:", JSON.stringify(navCells));
  console.log("panel tagged:", await evaluate(`document.querySelector('[data-slot="settings.section"]')?.closest('[role="dialog"]')?.hasAttribute("data-dshb-panel") ?? false`));

  console.log("\n== 3) active section tagging ==");
  const active = await evaluate(`(() => {
    const host = document.querySelector('[data-slot="settings.section"]');
    const title = host?.querySelector('[data-dshb-page-title]');
    const desc = host?.querySelector('[data-dshb-page-desc]');
    const titleStyle = title ? getComputedStyle(title) : null;
    return {
      title: title?.textContent.trim() ?? null,
      desc: desc?.textContent.trim() ?? null,
      titleFont: titleStyle ? titleStyle.fontSize + ' / ' + titleStyle.fontWeight + ' / ' + titleStyle.lineHeight : null,
      cards: host?.querySelectorAll('[data-dshb-card]').length ?? 0,
      rows: host?.querySelectorAll('[data-dshb-row]').length ?? 0,
      controls: host?.querySelectorAll('[data-dshb-control]').length ?? 0,
      inputs: host?.querySelectorAll('[data-dshb-input]').length ?? 0,
      badges: host?.querySelectorAll('[data-dshb-badge]').length ?? 0
    };
  })()`);
  console.log(JSON.stringify(active, null, 2));

  console.log("\n== 4) Beautify page ==");
  await evaluate(`[...document.querySelectorAll('[data-dshb-nav-cell]')].find((el) => el.textContent.includes('美化') || el.textContent.includes('Beautify'))?.click()`);
  await new Promise((r) => setTimeout(r, 600));
  const beautify = await evaluate(`(() => {
    const host = document.querySelector('[data-slot="settings.section"]');
    return {
      title: host?.querySelector('[data-dshb-page-title]')?.textContent.trim() ?? null,
      rows: [...(host?.querySelectorAll('[data-dshb-row]') ?? [])].map((r) => r.querySelector('[data-dshb-item-title]')?.textContent.trim() ?? r.textContent.trim().slice(0, 24)),
      toggles: host?.querySelectorAll('[data-dshb-toggle]').length ?? 0,
      pills: host?.querySelectorAll('[data-dshb-pill]').length ?? 0
    };
  })()`);
  console.log(JSON.stringify(beautify, null, 2));

  const shot = await client.call("Page.captureScreenshot", { format: "png" });
  writeFileSync(SCREENSHOT, Buffer.from(shot.data, "base64"));
  console.log(`\nscreenshot saved: ${SCREENSHOT}`);

  client.close();
  teardown();
}

main().catch((error) => {
  console.error("verify-live failed:", error.message);
  process.exit(1);
});
