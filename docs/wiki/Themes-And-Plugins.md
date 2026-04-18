# Themes and Plugins

AMP treats themes and plugins as first-class, file-based assets.

## Plugin Workflow

### Create or Edit

- Use the Plugin Manifest editor in Settings.
- Save manifest JSON to register or update.
- Edit existing plugins from the Installed list.

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
- HTTPS homepage enforced when provided.

## Theme Workflow

### Visual Builder

The Theme Builder supports:

- Foundation tokens (`--bg`, `--surface`, `--text`, `--border`, etc.)
- Interactive tokens (`--input`, `--ring`, `--popover`, `--accent`)
- Status tokens (`--success`, `--warning`, `--danger`)
- Chart tokens (`--chart-1` through `--chart-5`)
- Sidebar token set
- Typography dropdowns for sans/serif/mono families
- Radius and shadow controls

Each color token is tied to a visible preview card so users can see where the token appears.

### Manifest Sync

- Build visually, then sync builder values into JSON manifest.
- Load an existing manifest back into the builder for edits.

### Import/Export Options

- Paste JSON
- Marketplace URL import
- Local JSON file import
- Local folder import (`manifest.json`)
- File export
- Open theme folder

## Marketplace Prototype

The repo includes a static marketplace prototype at `docs/index.html` where users can stage and export plugin/theme listings with title, description, image, and manifest.
