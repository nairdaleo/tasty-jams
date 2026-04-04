# Tasty Jams — Website

## Identity

| Field | Value |
|---|---|
| Domain | `tastyjam.ca` (singular, no 's') |
| DNS | Fullhost → GitHub Pages CNAME |
| GitHub repo | `nairdaleo/tasty-jams` |
| Deploy | GitHub Actions → `https://nairdaleo.github.io/tasty-jams/` |
| Local path | `/Users/adrian/gitworks/me/tasty-jams` |
| Support email | `support@tastyjam.ca` |
| Contact form | Formspree: `https://formspree.io/f/maqqlpre` |
| Git SSH | `git@me.github.com:nairdaleo/tasty-jams.git` |

## Architecture

Static site. No build step, no framework, no bundler. All paths are absolute (start with `/`).

```
tasty-jams/
  index.html               # umbrella landing page, app cards
  CNAME                    # tastyjam.ca
  css/shared.css           # all shared CSS — single source of truth
  js/shared.js             # theme, nav, footer, i18n, contact form
  locales/                 # {en,fr,es,de,ja,pt}.json
  assets/
    spark-icon.png         # 1024×1024
    klick-icon.png         # 1024×1024
    chlorophyll-icon-light.png  # 1024×1024 light variant
    chlorophyll-icon-dark.png   # 1024×1024 dark variant (extracted from .pxm)
    app-store-badges/      # {en,fr,es,de,ja,pt}.svg
    favicon-32.png
    apple-touch-icon.png
  spark/
    index.html             # support page
    privacy.html
    terms.html
  klick/
    index.html
    privacy.html
    terms.html
  chlorophyll/
    index.html             # "coming soon" state — no App Store badge yet
    privacy.html
    terms.html
  fart-soundboard/
    index.html             # archived app
    privacy.html
```

## Shared CSS (`css/shared.css`)

CSS custom properties — dark by default, light via `:root.light` + `@media (prefers-color-scheme: light)`:

```css
--bg, --surface, --surface-hover, --border, --border-hover
--text, --text-muted, --text-dim
--accent (#a78bfa dark / #7c3aed light), --accent-solid
--font-display ("Playfair Display"), --font-body ("DM Sans")
```

Contains: reset, theme toggle button, nav, container, header, tagline, sections, FAQ cards, feature grid, form, pills, badges, footer, privacy typography, pricing pill, currency widget, responsive.

## Shared JS (`js/shared.js`)

- **Theme**: detect/apply/toggle/persist via `localStorage('tj-theme')`. Applied immediately before DOMContentLoaded to avoid flash.
- **Nav injection**: `injectNav(appKey, pageType)` — auto-populates `<nav id="tj-nav">` from `data-app` / `data-page` attributes. Legal links come from `legalLinks` map keyed by app. Current page link is auto-hidden.
- **Footer injection**: `injectFooter({ links: [...] })` — call in `DOMContentLoaded`.
- **Contact form**: auto-initialized on `form#contact-form` — POSTs to Formspree, shows `#msgOk` / `#msgErr`.
- **i18n**: `initI18n()` → fetches `/locales/{lang}.json` → `window.tj.i18n`. `t(key, fallback)` resolves dotted keys. `setLanguage(lang)` persists + reloads. Supported: `en fr es de ja pt`.

## Page Template

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <!-- favicon links (absolute /assets/...) -->
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>AppName – Page · Tasty Jam</title>
  <meta name="description" content="..." />
  <!-- Google Fonts: DM Sans + Playfair Display -->
  <link rel="stylesheet" href="/css/shared.css" />
  <!-- page-specific <style> if needed -->
</head>
<body>
<div class="container">   <!-- or "container privacy" for legal pages -->
  <nav id="tj-nav" data-app="APP_KEY" data-page="PAGE_TYPE"></nav>
  <!-- content -->
  <div id="tj-footer"></div>
</div>
<script src="/js/shared.js"></script>
<script>
  document.addEventListener('DOMContentLoaded', () => {
    injectFooter({ links: [...] });
  });
</script>
</body>
</html>
```

`data-app`: `spark | klick | chlorophyll | fart-soundboard`
`data-page`: `support | privacy | terms`

## App Cards (index.html)

Card pattern — **use `<div onclick>` not `<a>`** so child pill `<a>` links handle their own clicks:

```html
<div class="card" role="link" data-app="KEY">
  <!-- badge: class="badge" | "badge coming" | "badge archived" -->
  <span class="badge coming" data-i18n="KEY.badge">Coming soon</span>
  <!-- icon: plain img OR diagonal composite for light/dark -->
  <div class="card-icon"><img src="/assets/KEY-icon.png" alt="..." /></div>
  <div class="card-name" data-i18n="KEY.name">Name</div>
  <p class="card-desc" data-i18n="KEY.description">...</p>
  <div class="card-links">
    <a class="pill" href="/KEY/" onclick="event.stopPropagation()">Support</a>
    <a class="pill" href="/KEY/privacy.html" onclick="event.stopPropagation()">Privacy</a>
  </div>
  <!-- App Store badge OR coming-soon pill -->
</div>
<script>
  document.querySelector('[data-app="KEY"].card').addEventListener('click', (e) => {
    if (e.target.closest('a')) return;
    window.location = '/KEY/';
  });
</script>
```

## Diagonal Icon Composite (light/dark split)

Used on Chlorophyll card (64px) and support page (120px). Pure CSS, no JS:

```html
<div style="position:relative;width:120px;height:120px;border-radius:26px;overflow:hidden;">
  <img src="/assets/chlorophyll-icon-light.png" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;clip-path:polygon(0 0,100% 0,0 100%);z-index:1" />
  <img src="/assets/chlorophyll-icon-dark.png"  style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;clip-path:polygon(100% 0,100% 100%,0 100%);z-index:2" />
  <!-- optional ::after seam line via CSS -->
</div>
```

## Pricing Pill + Currency Converter

Present on all three app support pages. Base prices always shown in USD explicitly.

```html
<div class="pricing-block">
  <div class="pricing-pill">
    <span>Free tier available</span>
    <span class="price-sep">·</span>
    <span>Pro: <span class="price-em">$X.XX USD</span> [one-time | /month]</span>
  </div>
  <div class="currency-widget">
    <span>See price in</span>
    <select id="currency-select">...</select>
    <span class="price-converted" id="price-converted"></span>
  </div>
  <p class="price-note" id="price-note" style="display:none">
    Approximate conversion via live exchange rate. Actual App Store price may differ...
  </p>
</div>
```

**Exchange rate API**: `https://api.frankfurter.app/latest?from=USD&to={CURRENCY}` — free, open-source, no auth key, CORS-enabled.
**Cache**: `sessionStorage('tj_fx_cache')` — 4-hour TTL, shared across all pages on the same session.
**Formatting**: JPY/KRW/HUF/INR = no decimals; SEK/NOK/DKK/PLN/CZK/HUF = suffix notation (e.g. `399.50 kr`).

Spark: converts both `/mo` and `/yr` simultaneously → `≈ CA$6.89/mo · CA$41.39/yr`.
Klick + Chlorophyll: single one-time price.

## App Inventory

| App | Key | Status | Pro price | Model |
|---|---|---|---|---|
| Chlorophyll | `chlorophyll` | Coming soon | $19.99 USD one-time | One-time IAP |
| Spark | `spark` | Live | $4.99/mo or $29.99/yr | Subscription |
| Klick | `klick` | Live | $4.99 USD one-time | One-time IAP |
| Fart Soundboard | `fart-soundboard` | Archived | — | TestFlight only |

**Chlorophyll App Store ID**: `id0000000000` — placeholder. Update in `chlorophyll/index.html` badge href when live.
**Spark App Store URL**: `https://apps.apple.com/app/spark-adhd-habit-tracker/id6760031434`
**Klick App Store URL**: `https://apps.apple.com/app/klick-multi-counter/id6761296630`

## i18n

All locale files at `/locales/{en,fr,es,de,ja,pt}.json`. Structure:

```json
{
  "common": { "support": "...", "privacy": "...", "privacyPolicy": "...", ... },
  "homepage": { "brand": "...", "taglines": [...] },
  "spark": { "badge": "...", "name": "...", "description": "...", "faq": {...}, "contactForm": {...} },
  "klick": { ... },
  "chlorophyll": { ... },
  "fartSoundboard": { ... }
}
```

When adding a new app, add its key to **all** locale files.

## Adding a New App Checklist

1. Create `/APP/` with `index.html`, `privacy.html`, `terms.html`
2. Add icon PNG (1024×1024) to `/assets/`
3. Add `legalLinks` entry in `js/shared.js`
4. Add card to `index.html` following the card pattern (newest first)
5. Add `click` handler script below card
6. Add translations to all 6 locale files
7. Add pricing pill + currency widget to support page

## GitHub Pages HTTPS Fix

If `cert_state` is null (cert not provisioning):
```bash
gh api repos/nairdaleo/tasty-jams/pages -X DELETE -f cname=""  # remove custom domain
sleep 5
gh api repos/nairdaleo/tasty-jams/pages -X PATCH -f cname="tastyjam.ca"  # re-add
```

## Git

```bash
cd /Users/adrian/gitworks/me/tasty-jams
git add [specific files]
git commit -m "..."
git push origin main
```

Push triggers GitHub Actions deploy automatically.
