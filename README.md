# AmpNotes

Desktop-first prompt notebook built with Electron + React + TypeScript + Tailwind.

## Run

```bash
npm install
npm run dev
```

## Scripts

- `npm run dev` start Electron dev environment
- `npm run build` build `out/main`, `out/preload`, and `out/renderer`
- `npm run typecheck` run TypeScript checks
- `npm test` run Vitest suites

## MVP implemented

- Local multi-profile create/sign-in/sign-out with persisted session
- Prompt CRUD with pin/star/search/recent usage and copy-to-clipboard workflow
- Tag/category support and template starter prompts
- Tri-pane desktop layout with responsive fallback
- Theme system (light/dark/system) with tokenized design language
- Optional Groq-based prompt refinement with compare/apply flow
- Local sharing/import: encoded share codes + JSON/TXT import/export
- IPC contract-first architecture (`profile.*`, `prompt.*`, `tag.*`, `search.*`, `refine.*`, `share.*`, `settings.*`)

## Notes

- Core data is stored in SQLite (`better-sqlite3`) in Electron main process.
- Groq API keys are stored in OS keychain via `keytar`.
- Future cloud short-code sharing can be added without breaking share package format.
