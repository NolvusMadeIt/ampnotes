# Prompt Workspace

This page documents every major prompt workflow surface in AMP.

## Workspace Layout

AMP uses a three-column productivity layout:

1. **Navigation rail**: Home, Ready, Drafting, Favorites, Recently used, Templates, tags, folders, and app actions.
2. **Prompt lane**: prompt cards, lane search, Gmail-style selection actions, and card context menu.
3. **Focus panel**: Summary, Read, Edit, validation, refine, copy/share, and template conversion.

## Prompt Data Model (High-Level)

Each prompt includes:

- `title`
- `content` (markdown)
- `category`
- `tags[]`
- `folder`
- `useCase`
- `aiTarget`
- validation metadata
- timestamps (`createdAt`, `updatedAt`, `lastUsedAt`)

## Lane Behavior

Built-in lanes:

- Home
- Ready (quality score >= 80)
- Drafting (quality score < 80)
- Favorites
- Recently used
- Templates

Tag folders can be user-created and persisted locally per profile.

## Prompt Card Behavior

Prompt cards support:

- Single-select open
- Multi-select checkbox workflow
- Select all in current lane
- Bulk actions (favorite toggle, clear selection, delete selected)
- Right-click context actions for selection + organization
- Drag-and-drop to folder groups

When markdown contains image embeds (`![alt](url)`), a compact thumbnail appears on the card.

## Markdown Behavior

### Read Mode

- Full markdown rendering
- Headings, lists, blockquotes, inline links, inline code, fenced code
- Inline image rendering for embedded markdown images

### Summary Mode

- Uses compact markdown summary
- Intended for quick-scanning and metadata-first reading

### Edit Mode

- Full markdown edit textarea
- Supports image insertion by:
  - local upload
  - paste image from clipboard
  - drag/drop image file

Saved images are persisted by the app and referenced back into markdown.

## Validation + Refine

Validation and refine are exposed in the focus panel and context actions:

- **Validate**: checks prompt structure and quality gating.
- **Improve/Refine**: provider-assisted rewrite flow (when configured).

Validation is visible in prompt metadata and used for quality score cues.

## Share/Import Workflow

From prompt actions:

- Copy prompt
- Share/export
- Add as template

Import supports share code and file-backed flows.

## Example Prompt Entry

```md
## Use Case
Generate implementation-ready engineering tasks from product specs.

## Prompt
Convert this product spec into implementation tasks with:
- API changes
- data model updates
- edge cases
- test plan
```

## Best Practices

- Keep title specific and task-oriented.
- Use tags for retrieval; use folders for broader grouping.
- Define `useCase` and `aiTarget` for better long-term reuse.
- Validate before sharing or packaging.
