# AMP Wiki

AMP means **All My Prompts**. It is a local-first prompt notebook for writing, reading, validating, sharing, and extending prompts.

## Core Workflow

1. Use the left notebook navigation to choose All Pages, Starred, Recent, Templates, Plugins, or Themes.
2. Use the second column to browse pages and tags.
3. Click a prompt to read it in the center workspace.
4. Choose **Use this prompt** only when you want to edit/build from it.
5. Use **Help me improve** or **Validate Prompt** after configuring a Groq API key in Settings.

## Sharing

Share/export only includes selected prompts and templates. Prompts must pass required metadata validation before they can be shared or exported.

## Marketplace

The Marketplace footer link is a placeholder until the community site is available. Future marketplace flows are planned for prompts, templates, plugins, and themes.

The repository also includes a static GitHub Pages prototype in `docs/index.html`. It previews the AMP Custom System theme, supports light/dark mode, and lets contributors stage a local theme/plugin listing with title, description, preview image, manifest JSON, and export buttons.

## Local Data

AMP stores app data locally in SQLite. Groq API keys are stored in the OS keychain.
