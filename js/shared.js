/* === Tasty Jam — Shared JS ===
   Theme system, dynamic footer, contact form handler, and i18n.
   In C++ terms: the shared runtime library linked by every page. */

// --- i18n ---
// Initialize i18next - load translations from JSON files
async function initI18n() {
  try {
    const lng = localStorage.getItem('tj-language') || (navigator.language.split('-')[0] || 'en');
    const supportedLangs = ['en', 'fr', 'es', 'de', 'ja', 'pt'];
    const language = supportedLangs.includes(lng) ? lng : 'en';

    // Load translation file
    const response = await fetch(`/locales/${language}.json`);
    const translations = await response.json();
    window.tj = window.tj || {};
    window.tj.i18n = translations;
    window.tj.currentLanguage = language;

    // Set HTML lang attribute
    document.documentElement.lang = language;

    return language;
  } catch (error) {
    console.error('Failed to load i18n:', error);
    window.tj = window.tj || {};
    window.tj.currentLanguage = 'en';
    return 'en';
  }
}

function t(key, fallback = '') {
  const translations = (window.tj && window.tj.i18n) || {};
  const keys = key.split('.');
  let value = translations;
  for (const k of keys) {
    value = value?.[k];
  }
  return value || fallback || key;
}

function setLanguage(lang) {
  const supportedLangs = ['en', 'fr', 'es', 'de', 'ja', 'pt'];
  if (!supportedLangs.includes(lang)) return;
  localStorage.setItem('tj-language', lang);
  location.reload();
}

// --- Theme ---
function getPreferredTheme() {
  const stored = localStorage.getItem('tj-theme');
  if (stored) return stored;
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}
function applyTheme(theme) {
  document.documentElement.classList.remove('light', 'dark');
  document.documentElement.classList.add(theme);
}
function toggleTheme() {
  const current = document.documentElement.classList.contains('light') ? 'light' : 'dark';
  const next = current === 'light' ? 'dark' : 'light';
  applyTheme(next);
  localStorage.setItem('tj-theme', next);
}
// Apply immediately
const _initialTheme = getPreferredTheme();
if (_initialTheme === 'light') applyTheme('light');

// --- Theme toggle button ---
// Call this to inject the toggle button into the page.
function injectThemeToggle() {
  const btn = document.createElement('button');
  btn.className = 'theme-toggle';
  btn.setAttribute('aria-label', t('theme.toggle', 'Toggle light/dark mode'));
  btn.innerHTML = '<span class="icon-moon">🌙</span><span class="icon-sun">☀️</span>';
  btn.addEventListener('click', toggleTheme);
  document.body.prepend(btn);
}

// --- Language selector (top of page) ---
// Injects a compact language pill fixed to the top-left of the page.
function injectLangSelector() {
  const currentLang = window.tj?.currentLanguage || 'en';
  const langs = ['en', 'fr', 'es', 'de', 'ja', 'pt'];
  const langLabels = { en: 'EN', fr: 'FR', es: 'ES', de: 'DE', ja: 'JP', pt: 'PT' };
  const options = langs.map(l => `<option value="${l}"${l === currentLang ? ' selected' : ''}>${langLabels[l]}</option>`).join('');

  const wrap = document.createElement('div');
  wrap.className = 'lang-selector-top';
  wrap.innerHTML = `<select aria-label="Language" onchange="setLanguage(this.value)">${options}</select>`;

  // Insert after the theme-toggle button so both sit in the top corners.
  const themeBtn = document.querySelector('.theme-toggle');
  if (themeBtn && themeBtn.nextSibling) {
    document.body.insertBefore(wrap, themeBtn.nextSibling);
  } else {
    document.body.prepend(wrap);
  }
}

// --- Currency widget (reusable component) ---
// Usage: initCurrencyWidget({ selectId, outputId, noteId, prices })
//   prices: { month: 4.99, year: 29.99 }  — subscription (shows both tiers)
//   prices: { once: 19.99 }               — one-time purchase
const _TJ_FX_FORMAT = {
  CAD: { symbol: 'CA$', dec: 2 }, EUR: { symbol: '€', dec: 2 }, GBP: { symbol: '£', dec: 2 },
  AUD: { symbol: 'A$', dec: 2 }, JPY: { symbol: '¥', dec: 0 }, MXN: { symbol: 'MX$', dec: 2 },
  BRL: { symbol: 'R$', dec: 2 }, INR: { symbol: '₹', dec: 0 }, KRW: { symbol: '₩', dec: 0 },
  CHF: { symbol: 'CHF ', dec: 2 }, SEK: { symbol: 'kr', dec: 2, sfx: true },
  NOK: { symbol: 'kr', dec: 2, sfx: true }, DKK: { symbol: 'kr', dec: 2, sfx: true },
  NZD: { symbol: 'NZ$', dec: 2 }, SGD: { symbol: 'S$', dec: 2 }, HKD: { symbol: 'HK$', dec: 2 },
  CNY: { symbol: '¥', dec: 2 }, PLN: { symbol: 'zł', dec: 2, sfx: true },
  CZK: { symbol: 'Kč', dec: 2, sfx: true }, HUF: { symbol: 'Ft', dec: 0, sfx: true },
};

function _tjFmtPrice(amt, cur) {
  const f = _TJ_FX_FORMAT[cur] || { symbol: cur + ' ', dec: 2 };
  const n = amt.toFixed(f.dec).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return f.sfx ? n + ' ' + f.symbol : f.symbol + n;
}

async function _tjGetRate(cur) {
  const KEY = 'tj_fx_cache';
  try {
    const c = JSON.parse(sessionStorage.getItem(KEY) || '{}');
    if (c[cur] && Date.now() - c._ts < 4 * 3600 * 1000) return c[cur];
  } catch { }
  // api.frankfurter.app — free, open-source, CORS-enabled, no auth required
  const r = await fetch('https://api.frankfurter.app/latest?from=USD&to=' + cur);
  if (!r.ok) throw new Error('FX fetch failed');
  const d = await r.json();
  const rate = d.rates[cur];
  if (!rate) throw new Error('Rate not in response');
  try {
    const c = JSON.parse(sessionStorage.getItem(KEY) || '{}');
    c[cur] = rate;
    c._ts = Date.now();
    sessionStorage.setItem(KEY, JSON.stringify(c));
  } catch { }
  return rate;
}

function initCurrencyWidget({ selectId = 'currency-select', outputId = 'price-converted', noteId = 'price-note', prices = {} } = {}) {
  const sel = document.getElementById(selectId);
  const out = document.getElementById(outputId);
  const note = document.getElementById(noteId);
  if (!sel || !out) return;

  sel.addEventListener('change', async () => {
    const cur = sel.value;
    if (!cur) {
      out.textContent = '';
      if (note) note.style.display = 'none';
      return;
    }
    out.textContent = '…';
    if (note) note.style.display = 'none';
    try {
      const rate = await _tjGetRate(cur);
      if (prices.month && prices.year) {
        // Subscription: show both tiers
        out.textContent = '≈ ' + _tjFmtPrice(prices.month * rate, cur) + '/mo · ' + _tjFmtPrice(prices.year * rate, cur) + '/yr';
      } else if (prices.once) {
        out.textContent = '≈ ' + _tjFmtPrice(prices.once * rate, cur);
      } else {
        out.textContent = 'unavailable';
      }
      if (note) note.style.display = 'block';
    } catch {
      out.textContent = 'unavailable';
    }
  });
}

// --- Footer ---
// Call with optional overrides: injectFooter({ links: [...] })
function injectFooter(opts = {}) {
  const el = document.getElementById('tj-footer');
  if (!el) return;
  const links = opts.links || [
    { href: '/spark/privacy.html', text: t('common.privacy', 'Privacy') },
    { href: '/', text: t('common.allApps', 'All Apps') },
    { href: `mailto:${t('common.email', 'support@tastyjam.ca')}`, text: t('common.email', 'support@tastyjam.ca') }
  ];
  const linksHtml = links.map(l => `<a href="${l.href}">${l.text}</a>`).join('');
  const year = new Date().getFullYear();

  // Language selector
  const currentLang = window.tj?.currentLanguage || 'en';
  const langs = ['en', 'fr', 'es', 'de', 'ja', 'pt'];
  const langLabels = { en: 'English', fr: 'Français', es: 'Español', de: 'Deutsch', ja: '日本語', pt: 'Português' };
  const langSelector = `<div class="lang-selector"><label for="lang-select">Language:</label><select id="lang-select" onchange="setLanguage(this.value)">` +
    langs.map(l => `<option value="${l}" ${l === currentLang ? 'selected' : ''}>${langLabels[l]}</option>`).join('') +
    `</select></div>`;

  el.className = 'site-footer';
  el.innerHTML = `<span>${t('footer.copyright', '© {year} Tasty Jam').replace('{year}', year)}</span><div class="footer-links">${linksHtml}</div>`;
}

// --- Contact form ---
// Call after DOM ready with the form ID and Formspree endpoint.
function initContactForm(formId, endpoint) {
  const form = document.getElementById(formId);
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    const msgOk = document.getElementById('msgOk');
    const msgErr = document.getElementById('msgErr');
    btn.disabled = true;
    btn.textContent = t('spark.contactForm.sendingBtn', 'Sending…');
    try {
      const r = await fetch(endpoint, {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json' }
      });
      if (r.ok) {
        if (msgOk) msgOk.style.display = 'block';
        if (msgErr) msgErr.style.display = 'none';
        form.reset();
      } else { throw new Error(); }
    } catch {
      if (msgErr) msgErr.style.display = 'block';
      if (msgOk) msgOk.style.display = 'none';
    } finally {
      btn.disabled = false;
      btn.textContent = t('spark.contactForm.submitBtn', 'Send message');
    }
  });
}

// --- Nav ---
// Builds breadcrumb + legal links from data attributes.
// Usage: <nav id="tj-nav" data-app="spark" data-page="support"></nav>
// data-app: spark | klick | fart-soundboard (omit for landing page)
// data-page: support | privacy | terms (omit for landing page)
function injectNav() {
  const el = document.getElementById('tj-nav');
  if (!el) return;
  const app = el.dataset.app;
  const page = el.dataset.page;

  const apps = {
    spark: { name: t('spark.name', 'Spark'), path: '/spark/' },
    klick: { name: t('klick.name', 'Klick'), path: '/klick/' },
    chlorophyll: { name: t('chlorophyll.name', 'Chlorophyll'), path: '/chlorophyll/' },
    'fart-soundboard': { name: t('fartSoundboard.name', 'Fart Soundboard'), path: '/fart-soundboard/' }
  };
  const pageLabels = { support: null, privacy: t('common.privacy', 'Privacy'), terms: t('common.terms', 'Terms') };

  // Legal links available for this app
  const legalLinks = {
    spark: [{ href: '/spark/privacy.html', text: t('common.privacy', 'Privacy') }, { href: '/spark/terms.html', text: t('common.terms', 'Terms') }],
    klick: [{ href: '/klick/privacy.html', text: t('common.privacy', 'Privacy') }, { href: '/klick/terms.html', text: t('common.terms', 'Terms') }],
    chlorophyll: [{ href: '/chlorophyll/privacy.html', text: t('common.privacy', 'Privacy') }, { href: '/chlorophyll/terms.html', text: t('common.terms', 'Terms') }],
    'fart-soundboard': [{ href: '/fart-soundboard/privacy.html', text: t('common.privacy', 'Privacy') }]
  };

  let crumbs = `<a href="/">${t('nav.tastyJam', 'Tasty Jam')}</a>`;
  if (app && apps[app]) {
    crumbs += `<span class="sep">/</span><a href="${apps[app].path}">${apps[app].name}</a>`;
    const label = pageLabels[page];
    if (label) crumbs += `<span class="sep">/</span>${label}`;
  }

  // Legal pill links (skip the current page)
  let pills = '';
  if (app && legalLinks[app]) {
    const currentPath = window.location.pathname;
    const links = legalLinks[app].filter(l => !currentPath.endsWith(l.href.split('/').pop()));
    if (links.length) {
      pills = '<span class="nav-legal">' + links.map(l => `<a class="pill" href="${l.href}">${l.text}</a>`).join('') + '</span>';
    }
  }

  el.innerHTML = `<div class="nav-crumbs">${crumbs}</div>${pills}`;
}

// --- Auto-init on DOMContentLoaded ---
document.addEventListener('DOMContentLoaded', async () => {
  await initI18n();
  injectThemeToggle();
  injectLangSelector();
  injectNav();
  injectFooter();
  // Auto-init contact form if present
  const form = document.getElementById('contact-form');
  if (form) initContactForm('contact-form', 'https://formspree.io/f/maqqlpre');
});
