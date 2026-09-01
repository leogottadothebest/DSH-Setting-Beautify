/**
 * Host-side types for dsh-settings-beautify.
 *
 * The host half is intentionally inert — see lib/index.js. All behavior
 * lives in the client half (`dsh-settings-beautify/client`).
 */

/** Stable Cordis plugin name. */
export declare const name: "dsh-settings-beautify";

/** Services required by this host half (none). */
export declare const inject: readonly [];

/**
 * Host plugin body. No-op by design: the client half owns all behavior.
 */
export declare function apply(ctx: unknown): void;
