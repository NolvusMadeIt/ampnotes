# AMP Production Polish TODO

This checklist tracks the current polish phase request.

## Core App Cleanup

- [x] Remove classic app runtime and make Neo workspace the only main app path.
- [x] Remove classic switch button from UI.
- [x] Clean route wiring so one app path controls all major workflows.
- [x] Keep settings, share/import, refine, validation, and template flows connected.

## UX And Product Copy

- [x] Replace confusing header copy (`AMP Studio / Prompt Foundry`) with clear AMP naming.
- [x] Add richer About page content explaining what AMP is, why it exists, and what it is good for.
- [x] Expand ToS content to match product scope and publishing/marketplace context.
- [x] Add stable footer actions in main app for Marketplace, About, and ToS.

## Plugin + Theme Pipeline

- [x] Support plugin import by pasted JSON.
- [x] Support plugin import by marketplace URL.
- [x] Support plugin import by local manifest file.
- [x] Support plugin import by local folder (`manifest.json`).
- [x] Support plugin manifest export to file.
- [x] Support plugin folder-open action for direct editing.
- [x] Support theme import by pasted JSON.
- [x] Support theme import by marketplace URL.
- [x] Support theme import by local manifest file.
- [x] Support theme import by local folder (`manifest.json`).
- [x] Support theme manifest export to file.
- [x] Support theme folder-open action for direct editing.

## Documentation

- [x] Rewrite README with full product and architecture overview.
- [x] Rewrite CONTRIBUTING with workflow and quality expectations.
- [x] Add `contribute.md` alias page.
- [x] Update repo wiki docs under `docs/wiki`.

## Stability

- [x] Keep window size/position persistence enabled.
- [x] Run typecheck/build verification pass after changes.
- [ ] Run full production release checklist for monetization phase (next phase).

## Marketplace V2 TODO (TailAwesome-Style)

This phase remakes the marketplace so AMP themes/plugins can be discovered, sold, imported, and managed cleanly.

### Product + Experience

- [x] Redesign marketplace UI to a modern catalog layout inspired by `tailawesome.com` (not a clone).
- [x] Define clear listing cards for `Theme` and `Plugin` with free/paid badges.
- [x] Add richer listing detail pages with screenshots, compatibility, changelog, and install steps.
- [ ] Add curated sections: New, Trending, Staff Picks, Free, Paid.
- [x] Add search, filters, and sort controls that work fast on large catalogs.
- [x] Ensure the site theme visually matches AMP default desktop theme.

### Catalog Data Model

- [x] Define listing schema for free/paid products (id, slug, type, version, compatibility, price, author, assets).
- [ ] Add manifest validation pipeline for uploaded plugin/theme packages.
- [ ] Add versioning policy for updates and rollback metadata.
- [ ] Add product status workflow: draft, review, published, archived.

### Gumroad Integration

- [x] Map paid listings to Gumroad products (`nolvusmadeit.gumroad.com`).
- [x] Add Gumroad buy widgets/buttons on paid listing pages.
- [ ] Add verification flow for paid access tokens/licenses before download/import.
- [ ] Add fallback purchase link behavior if widget fails.
- [ ] Add sales analytics capture hooks for internal dashboard metrics.

### AMP App Integration

- [x] Build marketplace API endpoints for listing fetch + manifest fetch.
- [ ] Add in-app marketplace browser screen (or modal) that reads site catalog.
- [ ] Add one-click install from marketplace URL into AMP plugin/theme manager.
- [ ] Add install safety checks in app before apply (permissions, schema, signatures when available).
- [ ] Add compatibility messaging when manifest target version differs from local AMP version.

### Admin Panel (`/admin`)

- [x] Create private admin control panel route at `/admin`.
- [x] Do not expose a visible login link in public navigation.
- [ ] Add strong auth for `/admin` (session + MFA-ready design + brute-force rate limit).
- [ ] Add content moderation tools for listings, reports, and takedowns.
- [ ] Add product CRUD tools for title, description, media, pricing, and release status.
- [ ] Add upload management for screenshots and package artifacts.
- [ ] Add audit log for sensitive admin actions.

### Security + Repo/Docs Strategy

- [ ] Implement security headers, CSRF, rate limits, and upload scanning baseline.
- [ ] Add package signature/checksum verification path for imported manifests.
- [ ] Add abuse/report flow for malicious plugins/themes.
- [ ] Add hardened input validation for all marketplace forms and imports.
- [x] Decide docs protection strategy:
- [x] Document hard constraint: if this repo stays public, `/docs` source cannot be hidden in the same repo.
- [ ] Option A: move sensitive docs source to private repo and publish only compiled public docs output.
- [ ] Option B: keep internal docs outside git and deploy only generated site artifacts.

### Monetization Readiness

- [ ] Add payout and fee model spec (platform fee, creator payout cadence, refunds).
- [ ] Add legal pages specific to marketplace seller/buyer terms.
- [ ] Add trust badges and review/rating system plan.
- [ ] Add launch checklist for alpha creators and early paid listings.

### Delivery Plan

- [ ] Phase 1: Information architecture + design system + schema.
- [ ] Phase 2: Public catalog + listing pages + filters/search.
- [ ] Phase 3: Gumroad paid flow + license verification + in-app install.
- [ ] Phase 4: Admin panel + moderation + analytics.
- [ ] Phase 5: Security hardening + production QA + launch.
