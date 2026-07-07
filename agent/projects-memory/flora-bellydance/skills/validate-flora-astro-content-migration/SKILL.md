---
name: "validate-flora-astro-content-migration"
description: "Compare and migrate content from the legacy Flora Bellydance site into this Astro repo"
version: 1
created: "2026-06-18"
updated: "2026-06-18"
---
## When to Use
Use when updating this repo from the legacy flora-bellydance.de content or checking whether the new Astro pages contain all old website information.

## Procedure
1. Fetch the legacy URL(s), especially `/bellydance-bauchtanz-muenchen/` and `/bellydance-bauchtanz-muenchen/bauchtanz`, and extract visible text, links, image/video counts, meta title/description, legal sections, reviews, FAQs, events, and contact data.
2. Compare the extracted content against `src/pages/index.astro`, `src/pages/shows/index.astro`, `src/pages/tanzkurse/index.astro`, `src/pages/ueber-flora/index.astro`, `src/pages/galerie/index.astro`, `src/pages/impressum/index.astro`, `src/pages/datenschutz/index.astro`, and navigation components.
3. Keep gallery/media as placeholders unless the user provides final Flora-approved files, but preserve reachable structure and accurate descriptions/count intent where needed.
4. For contact form changes, keep the optional `PUBLIC_WEB3FORMS_ACCESS_KEY` Web3Forms path and mailto fallback intact unless the user explicitly chooses another backend.
5. Validate with `npm install` if dependencies are missing, then `npm run build`. Remove generated/temp artifacts such as `.astro/`, `dist/`, scraped legacy HTML/text files, and `node_modules/` if they should not remain in the repo.

## Pitfalls
- Do not invent legal facts. If hosting or form provider changes, update Datenschutz accordingly and flag that final legal review is still needed.
- Do not replace placeholder photos/videos unless Flora has approved the media selection.
- Do not leave placeholder secrets such as `DEIN-WEB3FORMS-KEY` in production code.

## Verification
1. `npm run build` completes successfully and includes all expected static routes.
2. `rg` finds no stale placeholders like `DEIN-WEB3FORMS-KEY`, `Cloudflare Pages`, or `Netlify` unless intentionally present.
3. `git status --short` shows only intentional source changes and no temp scrape/build artifacts.