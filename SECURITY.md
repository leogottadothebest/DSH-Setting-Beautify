# Security Policy

## Scope

`dsh-settings-beautify` is a cosmetic client plugin. Its runtime behavior is:

- Injecting one stylesheet (`<style id="dsh-settings-beautify-styles">`) that
  only restyles the settings panel via `data-dshb-*` attributes;
- Observing the DOM (MutationObserver) to tag structural roles with
  `data-dshb-*` attributes;
- Registering a "美化 / Beautify" settings page; preferences are stored in
  the browser's `localStorage` under `dsh-settings-beautify:prefs` only.

The plugin makes **no network requests**, declares **no host APIs**, reads or
writes **no files**, and never executes remote code. It ships no third-party
runtime dependencies.

## Reporting a vulnerability

Please do **not** open a public issue for security problems. Report them
privately to the maintainers:

- Open a private advisory via the GitHub repository's
  [Security Advisories](https://github.com/leogottadothebest/dsh-settings-beautify/security/advisories)
  page, or
- Email the maintainers (address listed in the repository description).

You should receive an acknowledgment within 3 business days. Please include:

1. The DSH Desktop version and platform;
2. The plugin version;
3. Steps to reproduce;
4. Impact assessment, if known.

## Supported versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |
| < 0.1   | :x:                |

## Notes for downstream consumers

- The plugin is a UI theme; treat it as untrusted code like any other DSH
  plugin. Review the source before installing (it is small and readable).
- Preferences live in `localStorage` and are not synced between profiles.
