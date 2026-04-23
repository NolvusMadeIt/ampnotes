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

### Safety and Validation

- Manifest schema is validated at import/register time.
- Entry and permission values are constrained by app contracts.
- Malformed manifests are rejected with actionable errors.

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
- live preview
- builder-to-manifest sync
- manifest-to-builder load
- marketplace code support

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
