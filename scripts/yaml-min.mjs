/**
 * Minimal YAML subset parser for verification tooling: nested maps with
 * two-space indentation, `key: value` scalars, comments, and `- ` list
 * items (dropped). Enough for ~/.dsh/.credentials.yaml — not a general YAML
 * implementation.
 */
export function parse(text) {
  const lines = text.split(/\r?\n/u).filter((line) => line.trim() !== "" && !line.trim().startsWith("#"));
  const root = {};
  const stack = [{ indent: -1, node: root }];
  for (const raw of lines) {
    const indent = raw.match(/^\s*/u)[0].length;
    const line = raw.trim();
    if (line.startsWith("- ")) continue; // list items are ignored
    const m = line.match(/^([^:]+):\s*(.*)$/u);
    if (m === null) continue;
    const [, key, value] = m;
    while (stack.length > 1 && indent <= stack[stack.length - 1].indent) stack.pop();
    const parent = stack[stack.length - 1].node;
    const trimmed = value.trim().replace(/^['"]|['"]$/gu, "");
    if (trimmed === "") {
      const child = {};
      parent[key.trim()] = child;
      stack.push({ indent, node: child });
    } else {
      parent[key.trim()] = trimmed;
    }
  }
  return root;
}
