# Contributing to AMP

Thanks for contributing to **AMP (All My Prompts)**.

AMP is built for real prompt operations, not just demos. Contributions should keep that standard: readable UX, reliable behavior, and safe manifest handling.

## Branch Policy (Required)

- Direct pushes to `main` are blocked by repository branch protection.
- All work must be done on a feature/fix branch and merged via Pull Request.
- At least one approving review is required before `main` can be updated.
- Admin bypass is disabled by policy; approvals are required for everyone.

### Standard Flow

```bash
git checkout -b feat/your-change
git push -u origin feat/your-change
```

Then open a Pull Request into `main` and request review.

## Development Setup

```bash
npm install
npm run dev
```

## Required Checks Before PR

```bash
npm run typecheck
npm run build
npm test
```

Native handling:

```bash
npm run rebuild:node
npm run rebuild:native
```

`npm test` already runs `rebuild:node` first, and `npm run dev` runs `rebuild:native` before Electron startup.

## Contribution Priorities

1. **Clarity First**
   - Prompt reading should feel intentional.
   - Editing should be explicit, not accidental.
2. **Workflow Integrity**
   - Share/export/import flows must keep validation guarantees.
   - Plugin/theme flows must remain understandable for non-experts.
3. **Security by Default**
   - Treat imported manifests as untrusted.
   - Keep permission surfaces small and explicit.
4. **Production Readiness**
   - Avoid unfinished UI controls.
   - Every clickable action should have a clear purpose.

## UI Guidelines

- Avoid noisy outlines and excessive rounding.
- Keep theme contrast clean in light and dark mode.
- Prefer useful labels over novelty copy.
- Preserve responsive behavior for desktop, tablet, and phone breakpoints.

## Plugin & Theme Rules

- Manifest IDs should be stable and unique.
- Homepages must be HTTPS when provided.
- Entry paths must stay safe (no traversal).
- Keep plugin permissions minimal.
- If you add import/export behavior, test:
  - Paste JSON
  - Local file
  - Local folder
  - Marketplace URL

## Pull Request Checklist

- [ ] Feature is complete enough to be used immediately.
- [ ] Empty/partial actions are removed or disabled.
- [ ] Error handling is visible and human-readable.
- [ ] Docs updated (README and wiki pages if user-facing).
- [ ] No debug-only UI left behind.


## Release Checklist

Maintainers should use this flow for desktop releases:

```bash
npm run typecheck
npm run dist
```

Then create a GitHub Release with the installer and update metadata from `dist/`.

Release assets should include:

- `AMP-Setup-<version>.exe`
- `AMP-Setup-<version>.exe.blockmap` when generated
- `latest.yml` when generated

Keep release notes clear enough for non-developers: what changed, what was fixed, and whether an update is recommended.

## Issue Reports

When opening issues, include:

- Expected behavior
- Actual behavior
- Repro steps
- Screenshot/video for UI issues
- OS, Node version, and whether running `dev` or packaged app

## License

By contributing, you agree your contributions are licensed under the project’s MIT license.

