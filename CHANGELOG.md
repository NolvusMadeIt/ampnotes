# Changelog

## 0.1.3 - 2026-04-22

- Integrated the AMP marketplace as an in-app page with app-owned navigation, footer behavior, themed scrollbars, marketplace side navigation, breadcrumbs, and filter controls.
- Added marketplace theme/plugin install flows, including install progress, installed states, Settings integration, active-theme prompts, and installed theme/plugin sections.
- Added marketplace manifest/code validation so submitted assets require screenshots, install metadata, checksums, and HTTPS `.zip` package URLs when package files are provided.
- Added Gumroad purchase support with modal license verification and remembered verified product state for paid marketplace assets.
- Added admin marketplace dashboard controls for listing metadata, install code generation, product links, and private/manual testing workflows.
- Expanded Settings with installed themes, hidden custom theme builder entry, wider custom theme editing, and app-wide theme token coverage previews.
- Replaced blocking window prompts with themed in-app dialogs/toasts and moved toast notifications to the bottom-right with stronger theme contrast.
- Improved prompt read/summary rendering so markdown is rendered consistently instead of flattened.
- Added prompt image support through upload, paste, and drag/drop, with desktop images saved into organized per-profile/per-prompt folders.
- Added read-mode prompt metadata: use case, target models, creator name, date, and compact tags with `+N` overflow.
