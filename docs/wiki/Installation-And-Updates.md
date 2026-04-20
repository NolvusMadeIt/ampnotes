# Installation And Updates

AMP is packaged for Windows as an NSIS installer.

## Install

1. Open the latest release on GitHub.
2. Download `AMP-Setup-<version>.exe`.
3. Run the installer.
4. Launch AMP from the Start Menu, desktop shortcut, or taskbar.

## Update Checks

AMP checks GitHub Releases for new versions when the packaged desktop app starts. The app also includes a **Check updates** action in the top navigation.

If an update exists, AMP prompts before opening or downloading the new release. If no release exists yet, development builds will say no published release was found.

## Build Locally

```bash
npm install
npm run dist
```

Generated installer files are written to `dist/`.

For current release packaging (0.1.2), expected assets include:

- `AMP-Setup-0.1.2.exe`
- `AMP-Setup-0.1.2.exe.blockmap`
- `latest.yml`

## Native Module Repair

If Electron reports that `better-sqlite3` was compiled for the wrong Node version, rebuild native modules:

```bash
npm run rebuild:native
```

For Node/Vitest usage:

```bash
npm run rebuild:node
```

## Release Checklist

1. Update `package.json` version.
2. Run `npm run typecheck`.
3. Run `npm test`.
4. Run `npm run dist`.
5. Commit and push changes.
6. Create a GitHub release tag such as `v0.1.2`.
7. Upload the installer and update metadata from `dist/`.
