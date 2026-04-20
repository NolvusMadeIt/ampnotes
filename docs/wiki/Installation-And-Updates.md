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
3. Run `npm run dist`.
4. Commit and push changes.
5. Create a GitHub release tag such as `v0.1.1`.
6. Upload the installer and update metadata from `dist/`.
