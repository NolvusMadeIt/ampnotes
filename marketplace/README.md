# AMP Marketplace (Next.js)

This is the new standalone marketplace site for AMP desktop.

## Goals

- Free and paid themes/plugins catalog
- Listing detail pages with AMP-compatible manifest URLs
- Hidden admin route (`/admin`) with no public nav link
- Public creator submission route (`/submit`) for free assets
- Gumroad-ready paid flow (`nolvusmadeit.gumroad.com`)
- Local-first now, Vercel deploy later

## Run Local

```bash
cd marketplace
npm install
npm run dev
```

Marketplace runs on:

- [http://localhost:4100](http://localhost:4100)

## Admin Access

No public login link is exposed.

- Go directly to `/admin`
- Set this environment variable in `marketplace/.env.local`:

```bash
MARKETPLACE_ADMIN_KEY=your-strong-private-key
```

Without this key, admin defaults to `change-this-now` and should be treated as insecure for local-only testing.

## API Endpoints

- `GET /api/health`
- `GET /api/listings`
- `GET /api/listings/:slug`
- `GET /api/manifests/plugin/:id`
- `GET /api/manifests/theme/:id`
- `GET /api/submissions` (counts only)

These manifest URLs are designed for AMP app import workflows.

## Submission Flow (Free Repo Assets)

- Public users can submit free plugins/themes at `/submit`.
- Paid products are intentionally not accepted in this repo submission path.
- Submissions are stored locally in:
  - `marketplace/data/submissions.json`
- `/admin` shows pending submissions for moderation/review.

## Docs Route Blocking

`/docs` is intentionally blocked by middleware in this app.

Important constraint:

- If a repository is public, source files cannot be hidden from users with repo access.
- To keep private docs private, move source docs to a private repo/service and only deploy curated public output.
