# AMP

AMP means **All My Prompts**. It is a desktop-first prompt notebook for writing, reading, improving, validating, sharing, and organizing prompts without making the workflow feel like a settings panel.

The app is intentionally shaped like a mix of OneNote, Joplin, and Notion: a notebook navigation column, a page list column, and a readable center workspace that can switch between home feed, read view, and edit mode.

## Highlights

- Three-column notebook layout with responsive fallback for smaller screens.
- Blog-style prompt reading on click, with explicit edit/use actions when the user wants to build.
- Markdown-first prompt editor with formatting controls and plugin token support.
- Local templates with create, edit, delete, and add-from-prompt workflows.
- Groq-powered prompt improvement and validation when the user adds an API key.
- Share/import flow with required validation and selected prompt/template exports.
- Theme builder with live previews for foundation, interactive, status, chart, sidebar, popover, and input tokens.
- Plugin and theme manifests are stored as local files with folder-open actions for advanced editing.
- Desktop window size and position are remembered between launches.
- Static GitHub Pages marketplace prototype for showcasing and exporting themes/plugins lives in `docs/`.

## Development

```bash
npm install
npm run dev
```

## Scripts

- `npm run dev` starts the Electron development environment.
- `npm run build` builds `out/main`, `out/preload`, and `out/renderer`.
- `npm run typecheck` runs TypeScript checks.
- `npm test` runs the Vitest suites.
- `npm run rebuild:native` rebuilds Electron native modules such as `better-sqlite3`.

## Data And Security

- Core data is stored locally in SQLite through the Electron main process.
- Groq API keys are stored in the OS keychain through `keytar`.
- Plugin and theme manifests are validated before storage.
- Theme tokens reject unsafe CSS patterns such as `url(`, `@import`, and `expression(`.
- Sharing/export validates required prompt metadata before anything leaves the app.

## Marketplace Roadmap

The footer includes a placeholder Marketplace link. The future marketplace website is planned to support prompt, template, plugin, and theme submission/download flows while keeping local-first usage intact.

The repo includes a static prototype at `docs/index.html` for GitHub Pages. It uses the AMP `Custom System` light/dark theme tokens and lets users stage theme/plugin listings with title, description, image, manifest JSON, and export actions.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development workflow, security expectations, and review guidelines.

## License

MIT. See [LICENSE](LICENSE).
