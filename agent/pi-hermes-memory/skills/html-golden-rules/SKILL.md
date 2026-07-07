---
name: html-golden-rules
description: "Modern semantic and accessible HTML rules (2026). Use whenever writing or reviewing markup, templates, forms, dialogs, navigation, static HTML apps, or accessibility fixes."
---

# HTML Golden Rules (2026)

## Document skeleton
Every page starts with language, charset, viewport, and a real title:

```html
<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>App name</title>
</head>
<body>
  <main id="main-content">...</main>
</body>
</html>
```

## Semantics first
- Choose elements by meaning, not appearance: `header`, `main`, `footer`, `nav`, `article`, `section`, `aside`.
- Use buttons for actions and anchors for navigation. Do not build clickable `div`/`span` controls.
- Keep heading levels logical; do not jump from `h1` to `h3` because it looks nicer.

## Native interactive APIs
- Prefer `button`, `label`, `select`, `textarea`, `details/summary`, `dialog`, and `popover` before custom ARIA widgets.
- Every form control gets an explicit label (`for`/`id`) or an accessible name.
- ARIA supplements native HTML; it does not replace it.

## Images and resource hints
```html
<picture>
  <source srcset="hero.avif" type="image/avif">
  <img src="hero.jpg" width="1280" height="720" alt="..." fetchpriority="high">
</picture>
<img src="thumb.jpg" loading="lazy" decoding="async" alt="...">
```

- Use `preload` only for critical assets; use `prefetch` for likely next navigations.
- Always set image dimensions to prevent layout shift.

## Security in markup
- External links opened in a new tab need `rel="noopener noreferrer"`.
- Escape text and attributes; never inject untrusted strings through `innerHTML` unless sanitized.

## Pitfalls
- Div soup instead of landmarks.
- `tabindex > 0` breaks natural keyboard navigation.
- Missing or redundant image alt text (`"image of"` is usually noise).
- Form fields without labels; custom controls without keyboard support.

## Verification
- W3C Validator reports no structural errors.
- Lighthouse/accessibility score targets 100.
- Keyboard-only test reaches every control with visible focus.
- NVDA/VoiceOver announces a sensible page structure.
