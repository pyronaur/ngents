---
name: pi-extensions
description: Search and suggest Pi packages, especially extensions, from a local cache of the pi.dev package gallery and npm `pi-package` registry results. Use when explicitly invoked to find Pi extensions/packages by capability, compare install candidates, or list packages by type.
disable-model-invocation: true
---

# Pi Extensions

Use the bundled scripts first. They avoid re-deriving the package source and preserve pi.dev type metadata.

## Fast path

```bash
node scripts/search-pi-packages.mjs browser --type extension --limit 20
node scripts/search-pi-packages.mjs subagent --limit 10
node scripts/search-pi-packages.mjs --refresh web search --type extension
```

Default cache path:

```text
~/.cache/pi-extensions/pi-packages.json
```

## Source facts

- `pi.dev/packages` has no browser-visible JSON API for the catalog.
- The gallery is npm packages tagged `pi-package`.
- npm API: `https://registry.npmjs.org/-/v1/search?text=keywords:pi-package&size=250&from=0`.
- pi.dev package pages expose richer card metadata in HTML: `data-package-name`, `data-package-search`, `data-package-types`, `data-package-downloads`, `data-package-date`.
- Use pi.dev gallery cache for suggestions because it includes package resource types (`extension`, `skill`, `theme`, `prompt`).
- Use npm cache when package descriptions, keywords, authors, publisher, version, or links are enough.

## Scripts

- `scripts/search-pi-packages.mjs`: search local pi.dev gallery cache; refreshes automatically when missing or stale.
- `scripts/cache-pi-gallery.mjs [out]`: cache all pi.dev gallery cards as JSON.
- `scripts/cache-pi-npm.mjs [out]`: cache npm search results for `keywords:pi-package`.

For suggestions, return package name, type, downloads, install command, and one-line reason from the matched search text. Do not recommend installing without source review.
