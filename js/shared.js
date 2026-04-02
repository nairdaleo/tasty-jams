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
  el.innerHTML = `<span>${t('footer.copyright', '© {year} Tasty Jam').replace('{year}', year)}</span><div class="footer-links">${linksHtml}</div>${langSelector}`;
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
    'fart-soundboard': { name: t('fartSoundboard.name', 'Fart Soundboard'), path: '/fart-soundboard/' }
  };
  const pageLabels = { support: null, privacy: t('common.privacy', 'Privacy'), terms: t('common.terms', 'Terms') };

  // Legal links available for this app
  const legalLinks = {
    spark: [{ href: '/spark/privacy.html', text: t('common.privacy', 'Privacy') }, { href: '/spark/terms.html', text: t('common.terms', 'Terms') }],
    klick: [{ href: '/klick/privacy.html', text: t('common.privacy', 'Privacy') }, { href: '/klick/terms.html', text: t('common.terms', 'Terms') }],
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
  injectNav();
  injectFooter();
  // Auto-init contact form if present
  const form = document.getElementById('contact-form');
  if (form) initContactForm('contact-form', 'https://formspree.io/f/maqqlpre');
});
