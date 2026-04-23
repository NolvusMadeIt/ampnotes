# Installation And Updates

AMP ships as a Windows installer with GitHub Releases as the distribution and update source.

## Install AMP

1. Open the latest release in the repository.
2. Download `AMP-Setup-<version>.exe`.
3. Run the installer and choose install location if needed.
4. Launch AMP from Start Menu, desktop shortcut, or taskbar.

## Auto-Update Architecture

AMP uses `electron-updater` with GitHub provider metadata.

Required release assets:

- `AMP-Setup-<version>.exe`
- `AMP-Setup-<version>.exe.blockmap`
- `latest.yml`

If any of these are missing, update checks may report stale version state.

## In-App Update Flow

Users can trigger updates from **Check updates** in the app.

Update actions:

- Update now
- Install when app closes
- Auto next launch
- View release changes

Release notes are pulled from repository update notes and shown in-app.

## Development Build Notes

Development (`electron-vite dev`) does not behave like packaged release update mode.
Use packaged builds (`npm run dist`) to verify production updater behavior.

## Local Build Commands

```bash
npm install
npm run typecheck
npm run dist
```

Installer artifacts are generated in `dist/`.

## Native Module Repair

For Electron native module rebuild:

```bash
npm run rebuild:native
```

For Node-based testing context:

```bash
npm run rebuild:node
```

## Release Procedure (Production)

1. Update app version (`package.json` + renderer fallback version).
2. Update `updates.md` release notes.
3. Run `npm run typecheck`.
4. Build installer (`npm run dist`).
5. Commit and push.
6. Tag release (`vX.Y.Z`).
7. Create GitHub release and upload:
   - `.exe`
   - `.blockmap`
   - `latest.yml`
8. Verify in-app updater detects latest release.
