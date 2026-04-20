# Themes and Plugins

AMP treats themes and plugins as first-class, file-based assets.

## Plugin Workflow

### Create Or Edit

- Open Settings, then the Plugins tab.
- Paste or edit plugin manifest JSON.
- Save to register or update the plugin.
- Use **Open Folder** to edit package files directly when needed.

### Import Options

- Paste JSON directly.
- Load JSON from a marketplace URL.
- Import a local JSON manifest file.
- Import from a local folder containing `manifest.json`.

### Export Options

- Copy JSON from the UI.
- Export manifest to file.
- Open plugin folder for direct editing.

### Safety Rules

- Permissions are allow-listed.
- Entry paths are sanitized.
- Homepages must use HTTPS when provided.
- Imported plugin code should remain sandboxed and reviewable.

## Theme Workflow

### Visual Builder

The Theme Builder supports:

- Foundation tokens (`--bg`, `--surface`, `--text`, `--border`, etc.).
- Interactive tokens (`--input`, `--ring`, `--popover`, `--accent`).
- Status tokens (`--success`, `--warning`, `--danger`).
- Chart tokens (`--chart-1` through `--chart-5`).
- Sidebar token set.
- Icon color tokens.
- Typography dropdowns for sans, serif, and mono families.
- Radius and shadow controls.

Each color token is tied to visible preview cards so users can see where the token appears before saving.

### Manifest Sync

- Build visually, then sync builder values into JSON manifest.
- Load an existing manifest back into the builder for edits.
- Custom/imported themes appear in Settings > General > Reading & Typography > Theme preset.
- AMP honors custom theme font tokens when a marketplace theme is active.

### Import/Export Options

- Paste JSON.
- Marketplace URL import.
- Local JSON file import.
- Local folder import (`manifest.json`).
- File export.
- Open theme folder.

## Marketplace Prototype

The repo includes marketplace work in both `docs/` and `marketplace/`. The desktop app can install marketplace packages through deep links or local folder imports.
