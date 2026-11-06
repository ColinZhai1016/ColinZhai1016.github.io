(() => {
  'use strict';

  const preferenceKey = 'colin-portfolio.theme';
  const root = document.documentElement;
  const valid = (value) => value === 'dark' || value === 'light' ? value : null;

  function readPreference() {
    try { return valid(localStorage.getItem(preferenceKey)); }
    catch { return null; }
  }

  const requested = valid(new URL(location.href).searchParams.get('theme'));
  const saved = readPreference();
  let theme = (location.protocol === 'file:' ? requested || saved : saved || requested) || 'light';
  root.dataset.theme = theme;

  document.addEventListener('DOMContentLoaded', () => {
    const languageToggle = document.querySelector('.header-actions [data-language-toggle]');
    if (!languageToggle) return;
    const pageLinks = Array.from(document.querySelectorAll('a[href]')).filter((link) =>
      /^(?:\.\/)?(?:index|music|travel|photography)\.html(?:[?#]|$)/.test(link.getAttribute('href')));
    const themeColor = document.querySelector('meta[name="theme-color"]');
    const lightThemeColor = themeColor?.content;

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'theme-toggle';
    toggle.setAttribute('data-theme-toggle', '');
    toggle.innerHTML = `
      <svg class="theme-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true">
        <circle cx="12" cy="12" r="4"/>
        <path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4m0-14.2-1.4 1.4M6.3 17.7l-1.4 1.4"/>
      </svg>
      <svg class="theme-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" aria-hidden="true">
        <path d="M20.9 14.2A9 9 0 0 1 9.8 3.1a9 9 0 1 0 11.1 11.1Z"/>
      </svg>`;
    languageToggle.before(toggle);

    function updateControl() {
      const dark = theme === 'dark';
      const t = (en, zh) => window.portfolioLanguage?.text(en, zh) ?? en;
      toggle.setAttribute('aria-label', t('Dark mode', '深色模式'));
      toggle.setAttribute('aria-pressed', String(dark));
      toggle.title = dark ? t('Switch to light mode', '切换到浅色模式') : t('Switch to dark mode', '切换到深色模式');
    }

    function carryTheme() {
      pageLinks.forEach((link) => {
        const href = link.getAttribute('href');
        const url = new URL(href, location.href);
        url.searchParams.set('theme', theme);
        link.setAttribute('href', `${href.split(/[?#]/, 1)[0]}${url.search}${url.hash}`);
      });
    }

    function apply(next, updateUrl = false) {
      theme = next;
      root.dataset.theme = theme;
      if (themeColor) themeColor.content = theme === 'dark' ? '#111812' : lightThemeColor;
      updateControl();
      carryTheme();
      if (updateUrl) {
        try {
          const url = new URL(location.href);
          url.searchParams.set('theme', theme);
          history.replaceState(history.state, '', url);
        } catch { /* The switch can still be used on this page. */ }
      }
    }

    toggle.addEventListener('click', () => {
      apply(theme === 'light' ? 'dark' : 'light', true);
      try { localStorage.setItem(preferenceKey, theme); }
      catch { /* The theme is also carried in links. */ }
    });
    document.addEventListener('portfolio:language', () => {
      updateControl();
      carryTheme();
    });
    window.addEventListener('storage', (event) => {
      const next = valid(event.newValue);
      if (event.key === preferenceKey && next && next !== theme) apply(next, true);
    });
    window.addEventListener('pageshow', (event) => {
      const next = event.persisted && readPreference();
      if (next && next !== theme) apply(next, true);
    });
    apply(theme);
  }, { once: true });
})();
