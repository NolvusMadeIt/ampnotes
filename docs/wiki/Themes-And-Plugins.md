# Themes And Plugins

AMP supports local themes and plugins through manifests. They are designed to be easy to edit as files while still being safe enough for an open-source project.

## Theme Builder

The Themes page includes a visual builder with live previews for:

- Background, cards, text, muted text, and borders.
- Popovers, inputs, focus rings, accent buttons, and action text.
- Success, warning, and danger states.
- Chart tokens.
- Sidebar background, active state, hover state, and dividers.

When editing an installed theme, click **Edit** to load it into both the visual builder and the manifest editor. Use **Sync Builder to Manifest** before saving visual changes.

Selecting a color token in the builder focuses the matching preview card, so contributors can immediately see how background, input, popover, status, chart, and sidebar colors will render.

## Plugins

Plugins are registered through JSON manifests and written to local files. A plugin can expose token-like values such as `{wordcount}` or `{tools.wordcount}` for markdown surfaces.

The static marketplace prototype in `docs/index.html` supports both theme and plugin listing drafts and exports the manifest or full showcase gallery as JSON.

## Safety Rules

- Treat imported manifests as untrusted input.
- Keep permissions explicit and small.
- Avoid remote code execution.
- Use HTTPS homepages for public packages.
- Validate plugin/theme data before storage and again before any future website publishing flow.
