# Tasty Jams Website — Project Context

## Architecture
- Static site, no build tools, no framework
- Hosted on GitHub Pages at tastyjam.ca (CNAME in repo root)
- Repo: github.com/nairdaleo/tasty-jams
- Local: /Users/adrian/gitworks/me/tasty-jams

## Shared Components
- `css/shared.css` — all CSS variables, palettes (dark/light), theme toggle, reset, nav, sections, FAQ cards, forms, badges, pills, footer, privacy typography, support headers, animations, responsive
- `js/shared.js` — theme (detect/apply/toggle/persist via localStorage 'tj-theme'), toggle button injection, nav injection (data-driven from data-app/data-page attributes), footer injection with per-page link overrides, contact form handler (Formspree endpoint: https://formspree.io/f/maqqlpre), i18n system (loads from /locales/*.json)

## Page Template Pattern
Every page follows this structure:
```html
<head>
  <!-- favicon links (absolute paths starting with /) -->
  <!-- Google Fonts: DM Sans + Playfair Display -->
  <link rel="stylesheet" href="/css/shared.css" />
  <!-- page-specific <style> if needed -->
</head>
<body>
<div class="container">  <!-- or class="container privacy" for legal pages -->
  <nav id="tj-nav" data-app="APP_KEY" data-page="PAGE_TYPE"></nav>
  <!-- page content -->
  <div id="tj-footer"></div>
</div>
<script src="/js/shared.js"></script>
<script>
  document.addEventListener('DOMContentLoaded', () => {
    injectFooter({ links: [...] });
  });
</script>
</body>
```

## Nav System
- `data-app`: spark | klick | chlorophyll | fart-soundboard
- `data-page`: support | privacy | terms
- Legal links auto-populated from legalLinks map in shared.js
- Current page's link is auto-hidden

## Apps & Their Pages
| App | Key | Path | Pages | Badge |
|-----|-----|------|-------|-------|
| Chlorophyll | chlorophyll | /chlorophyll/ | support, privacy, terms | coming |
| Spark | spark | /spark/ | support, privacy, terms | (default) |
| Klick | klick | /klick/ | support, privacy, terms | (default) |
| Fart Soundboard | fart-soundboard | /fart-soundboard/ | support, privacy | archived |

## Landing Page Card Pattern
Each app card on index.html:
```html
<div class="card" role="link" data-app="KEY"
     onclick="if(!event.target.closest('a'))window.location='/PATH/'">
  <span class="badge [coming|archived]" data-i18n="KEY.badge"></span>
  <div class="card-icon"><img src="/assets/ICON.png" alt="..." /></div>
  <div class="card-name" data-i18n="KEY.name"></div>
  <p class="card-desc" data-i18n="KEY.description"></p>
  <div class="card-links">
    <a class="pill" href="/PATH/" onclick="event.stopPropagation()" data-i18n="common.support">Support</a>
    <a class="pill" href="/PATH/privacy.html" onclick="event.stopPropagation()" data-i18n="common.privacy">Privacy</a>
  </div>
</div>
```

## i18n
- Translations in /locales/{en,fr,es,de,ja,pt}.json
- Elements use data-i18n="key.path" attributes
- t() function resolves nested keys with fallback

## Adding a New App
1. Create /APP/ directory with index.html, privacy.html, terms.html
2. Add app to legalLinks in js/shared.js
3. Add card to index.html following the card pattern
4. Add icon to /assets/
5. Add translations to all locale files

## Key Conventions
- All paths are absolute (start with /)
- Email: support@tastyjam.ca
- Domain: tastyjam.ca (singular, no 's')
- Copyright: © {year} Tasty Jam
- Contact form: Formspree endpoint, form id="contact-form" for auto-init
- Theme: persisted in localStorage as 'tj-theme', shared across all pages
- Cards use <div onclick> (not <a>) so child <a> pills can handle their own clicks
- Price converter on Klick page uses api.frankfurter.dev/v1/
