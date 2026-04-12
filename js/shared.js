/* === Tasty Jam — Shared JS ===
   Theme system, dynamic footer, contact form handler, and i18n.
   In C++ terms: the shared runtime library linked by every page. */

// --- i18n ---
// Initialize i18next - load translations from JSON files
async function initI18n() {
  try {
    const lng = localStorage.getItem('tj-language') || (navigator.language.split('-')[0] || 'en');
    const supportedLangs = ['en', 'fr', 'es', 'de', 'ja', 'pt', 'ko'];
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
  const supportedLangs = ['en', 'fr', 'es', 'de', 'ja', 'pt', 'ko'];
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

// --- Top-right control group: Ko-fi · Language · Theme ---
// Single function that builds all three pill buttons as a flex container.
// Each pill is a 40×40 circle that expands leftward on hover to reveal a label.
// Also owns App Store badge language swapping (one place for all lang-switch side effects).
function injectTopbar() {
  const currentLang = window.tj?.currentLanguage || 'en';
  const langs      = ['en', 'fr', 'es', 'de', 'ja', 'pt', 'ko'];
  const langCodes  = { en: 'EN', fr: 'FR', es: 'ES', de: 'DE', ja: 'JP', pt: 'PT', ko: 'KO' };
  const langNames  = { en: 'English', fr: 'Français', es: 'Español', de: 'Deutsch', ja: '日本語', pt: 'Português', ko: '한국어' };

  // Is the page currently in light mode?
  const isLight = document.documentElement.classList.contains('light') ||
    (!document.documentElement.classList.contains('dark') &&
     window.matchMedia('(prefers-color-scheme: light)').matches);

  const options = langs.map(l =>
    `<option value="${l}"${l === currentLang ? ' selected' : ''}>${langCodes[l]} — ${langNames[l]}</option>`
  ).join('');

  // Theme label describes the mode you'll switch TO (not the current mode).
  const themeLabelText = isLight
    ? t('theme.switchDark', 'Dark mode')
    : t('theme.switchLight', 'Light mode');

  const bar = document.createElement('div');
  bar.className = 'tj-topbar';
  bar.innerHTML = `
    <a class="topbar-btn kofi-btn"
       href="https://ko-fi.com/tastyjam"
       target="_blank"
       rel="noopener noreferrer"
       aria-label="Support me on Ko-fi">
      <span class="btn-icon"><span class="kofi-icon" aria-hidden="true"></span></span>
      <span class="btn-label">Support me on Ko-fi</span>
    </a>
    <div class="topbar-btn lang-btn" role="button" aria-label="Language">
      <span class="btn-icon lang-code" aria-hidden="true">${langCodes[currentLang]}</span>
      <span class="btn-label">${langNames[currentLang]}</span>
      <select aria-label="Language" onchange="setLanguage(this.value)">${options}</select>
    </div>
    <button class="topbar-btn theme-btn" aria-label="${t('theme.toggle', 'Toggle light/dark mode')}">
      <span class="btn-icon" aria-hidden="true">
        <span class="icon-moon">🌙</span>
        <span class="icon-sun">☀️</span>
      </span>
      <span class="btn-label theme-label">${themeLabelText}</span>
    </button>
  `;

  // Wire up theme button (event listener keeps label in sync after toggle)
  const themeBtn   = bar.querySelector('.theme-btn');
  const themeLabel = bar.querySelector('.theme-label');
  themeBtn.addEventListener('click', () => {
    toggleTheme();
    const nowLight = document.documentElement.classList.contains('light');
    themeLabel.textContent = nowLight
      ? t('theme.switchDark', 'Dark mode')
      : t('theme.switchLight', 'Light mode');
    // Re-init Ko-fi widget with updated theme color (affects popup header)
    _initKofi(nowLight);
  });

  // Gradient backdrop (lives behind the topbar, masks scrolled content)
  const grad = document.createElement('div');
  grad.className = 'tj-topbar-gradient';

  document.body.prepend(grad);
  document.body.prepend(bar);

  // Swap App Store badge to match current language
  _updateAppStoreBadge(currentLang);

  // Load Ko-fi Widget_2.js — gives the popup panel when clicking our pill.
  // We don't call draw() (our pill IS the button); init() sets the popup colour.
  _loadKofiWidget(isLight);
}

// Returns the hex background colour to pass to kofiwidget2.init() for the
// current theme.  Must be a solid hex that keeps white text readable (Ko-fi
// always uses white text in its popup header).
function _kofiWidgetColor(isLight) {
  return isLight ? '#5b21b6' : '#1e1530';
}

function _initKofi(isLight) {
  if (typeof kofiwidget2 !== 'undefined') {
    kofiwidget2.init('Support me on Ko-fi', _kofiWidgetColor(isLight), 'T6T81XNNN5');
  }
}

function _loadKofiWidget(isLight) {
  const s = document.createElement('script');
  s.type = 'text/javascript';
  s.src  = 'https://storage.ko-fi.com/cdn/widget/Widget_2.js';
  s.onload = () => _initKofi(isLight);
  document.head.appendChild(s);
}

// Updates all .app-store-badge-link img src to the current language badge.
// Falls back to 'en' if no badge exists for the language.
function _updateAppStoreBadge(lang) {
  const supported = ['en', 'fr', 'es', 'de', 'ja', 'pt', 'ko'];
  const code = supported.includes(lang) ? lang : 'en';
  document.querySelectorAll('.app-store-badge-link img').forEach(img => {
    img.src = `/assets/app-store-badges/${code}.svg`;
  });
}

// --- Currency widget (reusable component) ---
// Usage: initCurrencyWidget({ selectId, prices })
//   prices: { month: 4.99, year: 29.99 }  — subscription (shows both tiers)
//   prices: { once: 19.99 }               — one-time purchase
//
// Strategy: one bulk fetch for ALL currencies on init, stored in localStorage
// with a 4hr TTL so every page shares the same data — no per-selection fetches.
// Each <option> is pre-populated with the converted price so the value is
// visible as soon as the user opens the dropdown, no interaction required.

const _TJ_CURRENCIES = [
  { code: 'CAD', flag: '🇨🇦' },
  { code: 'EUR', flag: '🇪🇺' },
  { code: 'GBP', flag: '🇬🇧' },
  { code: 'AUD', flag: '🇦🇺' },
  { code: 'JPY', flag: '🇯🇵' },
  { code: 'MXN', flag: '🇲🇽' },
  { code: 'BRL', flag: '🇧🇷' },
  { code: 'INR', flag: '🇮🇳' },
  { code: 'KRW', flag: '🇰🇷' },
  { code: 'CHF', flag: '🇨🇭' },
  { code: 'SEK', flag: '🇸🇪' },
  { code: 'NOK', flag: '🇳🇴' },
  { code: 'DKK', flag: '🇩🇰' },
  { code: 'NZD', flag: '🇳🇿' },
  { code: 'SGD', flag: '🇸🇬' },
  { code: 'HKD', flag: '🇭🇰' },
  { code: 'CNY', flag: '🇨🇳' },
  { code: 'PLN', flag: '🇵🇱' },
  { code: 'CZK', flag: '🇨🇿' },
  { code: 'HUF', flag: '🇭🇺' },
];

const _TJ_FX_KEY = 'tj_fx_rates_v2';
const _TJ_FX_TTL = 4 * 60 * 60 * 1000; // 4 hours

// Format a price using Intl.NumberFormat — handles decimal separators, thousands
// grouping, currency symbols, and suffix-vs-prefix placement automatically per locale.
// Like using printf with a locale-aware format string instead of building the string manually.
// The browser locale drives formatting (e.g. "19,99 €" in de, "€19.99" in en).
function _tjFmtPrice(amt, cur) {
  try {
    return new Intl.NumberFormat(navigator.language || 'en', {
      style: 'currency',
      currency: cur,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amt);
  } catch {
    // Fallback for very old browsers that don't support Intl.NumberFormat with currency
    return `${cur} ${amt.toFixed(2)}`;
  }
}

// Fetches all rates in one request; returns the rates object or null on failure.
// Shared across all pages via localStorage — like a process-wide singleton cache.
async function _tjLoadRates() {
  try {
    const stored = JSON.parse(localStorage.getItem(_TJ_FX_KEY) || 'null');
    if (stored && Date.now() - stored._ts < _TJ_FX_TTL) return stored.rates;
  } catch { }
  try {
    const codes = _TJ_CURRENCIES.map(c => c.code).join(',');
    const r = await fetch(`https://api.frankfurter.dev/v1/latest?from=USD&to=${codes}`);
    if (!r.ok) return null;
    const d = await r.json();
    localStorage.setItem(_TJ_FX_KEY, JSON.stringify({ rates: d.rates, _ts: Date.now() }));
    return d.rates;
  } catch {
    return null;
  }
}

function _tjPriceLabel(prices, rate, code) {
  if (prices.month && prices.year) {
    return `≈ ${_tjFmtPrice(prices.month * rate, code)}/mo · ${_tjFmtPrice(prices.year * rate, code)}/yr`;
  }
  if (prices.once) return `≈ ${_tjFmtPrice(prices.once * rate, code)}`;
  return '';
}

async function initCurrencyWidget({ selectId = 'currency-select', prices = {} } = {}) {
  const sel = document.getElementById(selectId);
  if (!sel) return;

  // Render placeholder options immediately so the select isn't empty while fetching.
  sel.innerHTML =
    `<option value="">${t('common.seePriceIn', 'See price in…')}</option>` +
    _TJ_CURRENCIES.map(c => `<option value="${c.code}">${c.flag} ${c.code}</option>`).join('');

  const rates = await _tjLoadRates();
  if (!rates) return; // leave plain options, no prices shown — better than 'unavailable'

  // Rewrite every option with the converted price baked into the label.
  // Like pre-computing a lookup table at startup rather than on every access.
  sel.innerHTML =
    `<option value="">${t('common.seePriceIn', 'See price in…')}</option>` +
    _TJ_CURRENCIES.map(c => {
      const rate = rates[c.code];
      const label = rate ? ` — ${_tjPriceLabel(prices, rate, c.code)}` : '';
      return `<option value="${c.code}">${c.flag} ${c.code}${label}</option>`;
    }).join('');
}

// --- Footer ---
// Call with optional overrides: injectFooter({ links: [...] })
function injectFooter(opts = {}) {
  const el = document.getElementById('tj-footer');
  if (!el) return;
  const links = opts.links || [
    { href: '/spark/privacy.html', text: t('common.privacy', 'Privacy') },
    { href: '/', text: t('common.allApps', 'All Apps') },
    { href: 'https://ko-fi.com/tastyjam', text: t('common.supportDev', 'Support the dev') },
    { href: `mailto:${t('common.email', 'support@tastyjam.ca')}`, text: t('common.email', 'support@tastyjam.ca') },
  ];
  const linksHtml = links.map(l => `<a href="${l.href}">${l.text}</a>`).join('');
  const year = new Date().getFullYear();
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
// data-app: spark | klick | chlorophyll | fart-soundboard (omit for landing page)
// data-page: support | privacy | terms | accessibility (omit for landing page)
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
  const pageLabels = { support: null, privacy: t('common.privacy', 'Privacy'), terms: t('common.terms', 'Terms'), accessibility: 'Accessibility' };

  // Legal links available for this app
  const legalLinks = {
    spark: [{ href: '/spark/privacy.html', text: t('common.privacy', 'Privacy') }, { href: '/spark/terms.html', text: t('common.terms', 'Terms') }],
    klick: [{ href: '/klick/privacy.html', text: t('common.privacy', 'Privacy') }, { href: '/klick/terms.html', text: t('common.terms', 'Terms') }],
    chlorophyll: [{ href: '/chlorophyll/privacy.html', text: t('common.privacy', 'Privacy') }, { href: '/chlorophyll/terms.html', text: t('common.terms', 'Terms') }, { href: '/chlorophyll/accessibility.html', text: 'Accessibility' }],
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

// --- data-i18n translation pass ---
// Walks all [data-i18n] elements and sets their textContent from the loaded translations.
// Like a find-and-replace over the DOM — runs once after initI18n() resolves.
function translateDataAttrs() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const val = t(el.dataset.i18n, el.textContent);
    if (val) el.textContent = val;
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const val = t(el.dataset.i18nPlaceholder, el.placeholder);
    if (val) el.placeholder = val;
  });
}

// --- Auto-init on DOMContentLoaded ---
document.addEventListener('DOMContentLoaded', async () => {
  await initI18n();
  translateDataAttrs();
  injectTopbar();
  injectNav();
  injectFooter(); // default footer — pages override via tj:ready with custom links
  // Auto-init contact form if present
  const form = document.getElementById('contact-form');
  if (form) initContactForm('contact-form', 'https://formspree.io/f/maqqlpre');
  // Signal to page-specific scripts that i18n + shared UI is ready.
  // Like a condition_variable broadcast — waiters can now safely call t().
  document.dispatchEvent(new Event('tj:ready'));
});
