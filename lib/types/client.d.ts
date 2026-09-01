/**
 * Client-side types for dsh-settings-beautify.
 *
 * The client half is loaded through the `dsh.client` manifest declaration
 * (package.json) and registered as a Cordis plugin that:
 *  - injects the design-language stylesheet,
 *  - runs the `data-dshb-*` DOM normalizer on the settings panel, and
 *  - registers the "美化 / Beautify" settings section (id `beautify`).
 */

/** Stable Cordis plugin name (client half). */
export declare const name: "dsh-settings-beautify";

/** Services required by the client half. */
export declare const inject: readonly ["slots", "locale"];

/**
 * Client plugin body.
 */
export declare function apply(ctx: {
  slots: unknown;
  locale: unknown;
  effect(callback: () => void | (() => void), label?: string): void;
}): void;
