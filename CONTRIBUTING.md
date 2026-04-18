# Contributing To AMP

Thanks for helping improve AMP, All My Prompts. This project should stay simple for everyday users while still being powerful for prompt authors, theme builders, and plugin developers.

## Local Setup

```bash
npm install
npm run dev
```

Before opening a pull request, run:

```bash
npm run typecheck
npm run build
npm test
```

If native SQLite tests fail because `better-sqlite3` was built for the wrong runtime, close running AMP/Electron processes, run `npm rebuild better-sqlite3`, and rerun the tests. After test work, `npm run rebuild:native` restores Electron native modules.

## Pull Request Expectations

- Keep the app local-first and privacy-conscious.
- Preserve the notebook/read/edit mental model.
- Do not add heavy dependencies without a clear user-facing reason.
- Keep UI changes restrained, readable, and consistent with the existing theme system.
- Add or update tests for data behavior, validation, sharing, or marketplace logic.
- Update README/wiki docs when changing user-visible workflows.

## Plugin And Theme Safety

Plugins and themes should be treated as untrusted input.

- Keep manifests explicit and minimal.
- Use HTTPS homepages for public packages.
- Do not request broad permissions unless the feature truly needs them.
- Never execute unreviewed code with unrestricted filesystem or network access.
- Validate imported plugin/theme data in both desktop and future website flows.

## Design Guidelines

- Clicking a prompt should read like a blog post first, not throw users into editing.
- Edit/create actions should be explicit.
- Avoid bright outline-heavy themes and excessive rounding.
- Prefer clear, useful labels over clever copy.
- Make validation visible when content will be shared, exported, or published.

## Reporting Issues

When filing an issue, include:

- What you expected to happen.
- What actually happened.
- Steps to reproduce.
- Screenshots or a short recording for UI issues.
- OS, Node version, and whether you are running dev or packaged AMP.
