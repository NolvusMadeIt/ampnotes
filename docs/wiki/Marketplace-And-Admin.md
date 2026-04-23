# Marketplace And Admin

This page documents AMP marketplace integration, install flow, and admin distribution behavior.

## Marketplace Integration Model

AMP loads marketplace content in-app and can install package assets into local AMP state.

- Public-facing marketplace catalog can be deployed separately (for example Vercel).
- App embeds marketplace as a page-level experience.
- Header/footer chrome can be inherited by AMP when the marketplace is embedded.

## Asset Types

- **Themes**: token-based visual packs with optional typography/system values.
- **Plugins**: capability packages with manifest-defined entry + permissions.

## Install Flow

Theme/plugin install flow includes:

1. User clicks install/download from marketplace listing.
2. AMP validates manifest payload / code.
3. Asset is registered in installed state.
4. Installed asset appears in Settings:
   - Themes -> Installed Themes
   - Plugins -> Installed Plugins
5. For themes, user can activate immediately or keep current default.

## Paid Assets

AMP supports paid asset gating through Gumroad verification flow:

- Purchase URL launch
- License verification prompt
- Verified product persistence on device
- Install unlock after successful verification

## Admin Responsibilities

Admin-managed workflow includes:

- Create/maintain listing manifests
- Include screenshot metadata for submission quality
- Generate marketplace install code payloads
- Control paid/public listing behavior

## Submission Requirements

Submission validation should include:

- Valid schema version
- Compatibility field
- Screenshot field
- Checksum requirements
- Package URL and package checksum for distributed ZIP packages

## Example Theme Listing Payload (Abbreviated)

```json
{
  "schemaVersion": 1,
  "id": "theme.midnight-ink",
  "name": "Midnight Ink",
  "compatibility": "AMP 0.1.0+",
  "screenshot": "/screenshots/midnight-ink.png",
  "checksum": "sha256:...",
  "packageUrl": "https://example.com/midnight-ink.zip",
  "packageChecksum": "sha256:..."
}
```

## Operational Guidance

- Keep marketplace repo private if admin controls should remain restricted.
- Keep public catalog output deployable for users.
- Treat listing manifest validation as a release gate, not a soft warning.
