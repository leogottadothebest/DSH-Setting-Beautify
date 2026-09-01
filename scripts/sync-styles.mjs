/**
 * Keep lib/styles/settings.css in sync with the stylesheet embedded in
 * lib/client.js (the dshb-styles region). Run: pnpm run sync-styles
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const clientSource = readFileSync(join(root, "lib", "client.js"), "utf8");
const match = clientSource.match(/const CSS = `\n([\s\S]*?)`;/);
if (match === null) {
  console.error("sync-styles: could not locate the CSS block in lib/client.js");
  process.exit(1);
}
const css = match[1];
const header =
  "/* Generated mirror of the stylesheet embedded in lib/client.js (dshb-styles region).\n" +
  "   Keep in sync with: pnpm run sync-styles */\n";
writeFileSync(join(root, "lib", "styles", "settings.css"), header + css);
console.log(`sync-styles: wrote ${css.length} chars to lib/styles/settings.css`);
