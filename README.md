# AMP

**AMP** stands for **All My Prompts**.

AMP is a desktop-first prompt operations app for writing, validating, organizing, packaging, and shipping reusable prompts. It is built for people who want prompts to feel less like loose notes and more like assets: easy to read, easy to improve, easy to share, and safe to extend.

## Highlights

- Focused desktop workspace for prompt drafting, reading, editing, and validation.
- Local profiles with a 48-hour session window so the app stays convenient without staying open forever.
- Prompt lanes, tag folders, favorites, recent usage, templates, and searchable organization.
- Groq-powered prompt improvement and validation when a Groq API key is configured.
- Share/import/export flows with validation gates so incomplete prompts do not ship by accident.
- File-backed plugin and theme manifests that can be pasted, imported from folders, imported from marketplace URLs, exported, and edited again.
- Marketplace-ready deep links for installing themes and plugins from AMP Marketplace pages.
- Windows installer support with GitHub Releases based update checks.

## Download And Updates

The Windows app is distributed as an NSIS installer from GitHub Releases.

- Installer artifact: `AMP-Setup-<version>.exe`
- Current app version: `0.1.1`
- Release feed: `https://github.com/NolvusMadeIt/ampnotes/releases`

AMP checks for new GitHub releases when the packaged desktop app starts. Users can also run **Check updates** from the top navigation. If a new release exists, AMP prompts before opening/downloading the update.

## Development

```bash
npm install
npm run dev
```

If Electron reports a native module ABI mismatch for `better-sqlite3`, rebuild native modules:

```bash
npm run rebuild:native
```

## Build And Package

Build the app only:

```bash
npm run build
```

Create the Windows installer:

```bash
npm run dist
```

The installer and update metadata are generated in `dist/`.

## Quality Checks

```bash
npm run typecheck
npm run build
npm test
```

`npm test` rebuilds `better-sqlite3` for Node before running Vitest. `npm run dev` rebuilds native modules for Electron before launching.

## Project Layout

- `src/main`: Electron main process, updater, IPC, SQLite repositories, filesystem packages, security checks.
- `src/preload`: typed bridge API exposed to the renderer.
- `src/renderer`: React UI, app workspace, auth, settings, legal pages, marketplace integrations, theme system.
- `src/shared`: DTOs, runtime contracts, and validation rules.
- `src/assets`: app icon and shared desktop assets.
- `docs`: static marketplace prototype and local wiki pages.
- `marketplace`: local Next.js marketplace app for theme/plugin discovery and submissions.

## Marketplace Direction

AMP is designed so creators can distribute:

- Prompt packs
- Template bundles
- Utility plugins
- Visual theme packs

Free marketplace submissions can be staged in the repository. Paid assets can be linked externally, including Gumroad or future storefronts. The desktop app supports installation from marketplace links and local folders, so the public site and desktop client work as one product instead of two disconnected pieces.

## Security Model

- Imported manifests are treated as untrusted input.
- Plugin permissions are allow-listed.
- Plugin entry paths are sanitized.
- Theme token keys and values are sanitized.
- Dangerous CSS patterns such as `url(`, `@import`, and `expression(` are rejected.
- HTTPS homepages are enforced for public plugin/theme packages.
- Prompt sharing/export enforces required metadata validation.
- Groq API keys are stored with OS keychain integration.

## Documentation

- [Contributing](./CONTRIBUTING.md)
- [Quick Contribute Alias](./contribute.md)
- [Wiki Home](./docs/wiki/Home.md)
- [Wiki: Installation And Updates](./docs/wiki/Installation-And-Updates.md)
- [Wiki: Themes And Plugins](./docs/wiki/Themes-And-Plugins.md)
- [Terms of Service UI Page](./src/renderer/features/legal/TermsOfServicePage.tsx)
- [About UI Page](./src/renderer/features/legal/AboutPage.tsx)

## License

MIT. See [LICENSE](./LICENSE).
