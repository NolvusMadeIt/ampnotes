# Themes And Plugins

AMP manages themes and plugins as manifest-driven, installable assets.

## Plugin System

### Plugin Manifest Workflow

From **Settings > Plugins**, users and admins can:

- paste/edit manifest JSON
- load manifest from marketplace code
- import from file or local folder
- copy/export manifest JSON
- open plugin folder
- enable/disable/remove installed plugin

### Plugin Creation Flow (Recommended)

1. Build your plugin package (typically a `.zip`) with runtime files and a valid entry script.
2. Create or paste the plugin manifest JSON in **Settings > Plugins**.
3. Save with **Save Plugin Manifest** so AMP validates schema and metadata.
4. Generate an `amp-plugin:` install code with **Copy Code**.
5. Share/publish that code so other AMP users can load and install the same manifest contract.

Why this flow exists:
- install codes move a validated manifest payload between users
- package/runtime code stays in your plugin artifact
- AMP rejects malformed manifests before install

### Plugin Manifest Requirements (Typical)

- `schemaVersion`
- `id`
- `name`
- `version`
- `description`
- `author`
- `compatibility`
- `entry`
- optional package metadata (`packageUrl`, `packageChecksum`, `packageSizeBytes`)

## Theme System

### Installed Themes

From **Settings > Themes**:

- view installed themes
- activate/deactivate
- open folder
- export/copy JSON
- remove

### Customize Themes

From **Settings > Customize Themes**:

- visual token editing
- typography controls
- shape/radius/layout controls
- effects controls (shadow, offsets, blur, spread, color)
- live preview
- builder-to-manifest sync
- manifest-to-builder load
- marketplace code support

### Theme Creation Flow (Recommended)

1. Edit tokens in Theme Builder (colors, typography, layout, effects).
2. Run **Create Manifest from Builder** to sync controls into JSON.
3. Save the manifest to install it into **Installed Themes**.
4. Generate and share an `amp-theme:` install code with **Copy Code**.

Why this flow exists:
- themes map to AMP token contracts only
- styling is predictable across app sections
- install codes distribute validated theme manifests consistently

### Token Coverage

Theme controls include:

- app shell tokens
- surface hierarchy
- text + icon tokens
- interactive controls
- status tokens
- typography stacks
- spacing/layout values
- scrollbar and focus styling values

## Marketplace Packaging

Themes/plugins can be distributed via marketplace code and ZIP package metadata.

Recommended package metadata:

- screenshot
- checksum
- package URL (HTTPS `.zip`)
- package checksum
- release notes
- compatibility range

## Validation Expectations

AMP validates plugin/theme manifests before registration. Common rejection causes:

- invalid JSON
- missing required fields
- malformed compatibility or permissions
- malformed screenshot/checksum/package fields

Validation is enforced before install to prevent arbitrary payloads from being blindly registered.

## Example Plugin Manifest (Abbreviated)

```json
{
  "schemaVersion": 1,
  "id": "tools.wordcount",
  "name": "Word Count",
  "version": "1.0.0",
  "entry": "plugins/wordcount/index.js",
  "compatibility": "AMP 0.1.0+"
}
```

## Example Theme Manifest (Abbreviated)

```json
{
  "schemaVersion": 1,
  "id": "theme.sunset-paper",
  "name": "Sunset Paper",
  "version": "1.0.0",
  "compatibility": "AMP 0.1.0+",
  "tokens": {
    "light": { "--bg": "#f6efe6" },
    "dark": { "--bg": "#1f1713" }
  }
}
```
