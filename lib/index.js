/**
 * dsh-settings-beautify — host half.
 *
 * The Beautify surface is entirely client-side: the client half injects the
 * design-language stylesheet, runs the DOM normalizer (the `data-dshb-*`
 * tagger), and registers its own settings page ("美化 / Beautify") with
 * preferences persisted in the browser's localStorage.
 *
 * This host entry exists so the bundle entry declared by cordis.patch.yml
 * resolves, the package shows up as a running plugin in the plugin inventory,
 * and future host-side features (e.g. a served settings namespace) have a
 * natural seat.
 */

/** Stable Cordis plugin name. */
export const name = "dsh-settings-beautify";

/** Services required by this host half. */
export const inject = [];

/**
 * Host plugin body. No-op by design — see the file comment.
 */
export function apply() {
  // Intentionally empty: the client half owns all behavior.
}
