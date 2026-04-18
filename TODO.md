# AMP Production Polish TODO

This checklist tracks the current polish phase request.

## Core App Cleanup

- [x] Remove classic app runtime and make Neo workspace the only main app path.
- [x] Remove classic switch button from UI.
- [x] Clean route wiring so one app path controls all major workflows.
- [x] Keep settings, share/import, refine, validation, and template flows connected.

## UX And Product Copy

- [x] Replace confusing header copy (`AMP Studio / Prompt Foundry`) with clear AMP naming.
- [x] Add richer About page content explaining what AMP is, why it exists, and what it is good for.
- [x] Expand ToS content to match product scope and publishing/marketplace context.
- [x] Add stable footer actions in main app for Marketplace, About, and ToS.

## Plugin + Theme Pipeline

- [x] Support plugin import by pasted JSON.
- [x] Support plugin import by marketplace URL.
- [x] Support plugin import by local manifest file.
- [x] Support plugin import by local folder (`manifest.json`).
- [x] Support plugin manifest export to file.
- [x] Support plugin folder-open action for direct editing.
- [x] Support theme import by pasted JSON.
- [x] Support theme import by marketplace URL.
- [x] Support theme import by local manifest file.
- [x] Support theme import by local folder (`manifest.json`).
- [x] Support theme manifest export to file.
- [x] Support theme folder-open action for direct editing.

## Documentation

- [x] Rewrite README with full product and architecture overview.
- [x] Rewrite CONTRIBUTING with workflow and quality expectations.
- [x] Add `contribute.md` alias page.
- [x] Update repo wiki docs under `docs/wiki`.

## Stability

- [x] Keep window size/position persistence enabled.
- [x] Run typecheck/build verification pass after changes.
- [ ] Run full production release checklist for monetization phase (next phase).
