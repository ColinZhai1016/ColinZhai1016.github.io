(() => {
  'use strict';

  const preferenceKey = 'colin-portfolio.language';
  const root = document.documentElement;
  const toggle = document.querySelector('[data-language-toggle]');
  if (!toggle) return;

  const valid = (value) => value === 'zh' || value === 'en' ? value : null;
  const readPreference = () => {
    try { return valid(localStorage.getItem(preferenceKey)); }
    catch { return null; }
  };
  const requested = valid(new URL(location.href).searchParams.get('lang'));
  const saved = readPreference();
  let language = (location.protocol === 'file:' ? requested || saved : saved || requested) || 'en';

  const attributes = ['alt', 'aria-label', 'aria-roledescription', 'title', 'content'];
  const annotated = ['[data-zh]', ...attributes.map((name) => `[data-zh-${name}]`)].join(',');
  const textNode = (element) => Array.from(element.childNodes)
    .find((node) => node.nodeType === Node.TEXT_NODE && node.nodeValue.trim());
  const translations = Array.from(document.querySelectorAll(annotated)).map((element) => {
    const node = element.hasAttribute('data-zh') && !element.hasAttribute('data-copy-label')
      ? textNode(element) : null;
    return {
      element,
      text: node ? { en: node.nodeValue, zh: element.getAttribute('data-zh') } : null,
      attributes: attributes.filter((name) => element.hasAttribute(name) && element.hasAttribute(`data-zh-${name}`))
        .map((name) => ({ name, en: element.getAttribute(name), zh: element.getAttribute(`data-zh-${name}`) })),
    };
  });
  const pageLinks = Array.from(document.querySelectorAll('a[href]'))
    .map((link) => ({ link, href: link.getAttribute('href') }))
    .filter(({ href }) => /^(?:\.\/)?(?:index|music|travel|photography)\.html(?:[?#]|$)/.test(href));

  window.portfolioLanguage = Object.freeze({
    text: (english, chinese) => language === 'zh' ? chinese : english,
    data: (element, name) => (language === 'zh' && element.getAttribute(`data-zh-${name}`))
      || element.getAttribute(`data-${name}`) || '',
  });

  function apply(next, remember = false) {
    language = next;
    root.lang = language === 'zh' ? 'zh-CN' : 'en';
    translations.forEach(({ element, text, attributes: entries }) => {
      if (text) {
        const node = textNode(element);
        if (node) node.nodeValue = text[language];
      }
      entries.forEach(({ name, en, zh }) => element.setAttribute(name, language === 'zh' ? zh : en));
    });

    // Carry the choice between local HTML files as well as on the hosted site.
    pageLinks.forEach(({ link, href }) => {
      const url = new URL(href, location.href);
      url.searchParams.set('lang', language);
      link.setAttribute('href', `${href.split(/[?#]/, 1)[0]}${url.search}${url.hash}`);
    });
    toggle.dataset.currentLanguage = language;
    toggle.setAttribute('aria-label', language === 'zh' ? '切换为英文' : 'Switch to Chinese');
    toggle.hidden = false;

    if (remember) {
      try { localStorage.setItem(preferenceKey, language); }
      catch { /* The language parameter still works when storage is unavailable. */ }
      try {
        const url = new URL(location.href);
        url.searchParams.set('lang', language);
        history.replaceState(history.state, '', url);
      } catch { /* Some browsers restrict history changes for local files. */ }
    }
    document.dispatchEvent(new CustomEvent('portfolio:language', { detail: { language } }));
  }

  toggle.addEventListener('click', () => apply(language === 'en' ? 'zh' : 'en', true));
  window.addEventListener('pageshow', (event) => {
    const currentPreference = event.persisted && location.protocol !== 'file:' && readPreference();
    if (currentPreference && currentPreference !== language) apply(currentPreference, true);
  });
  apply(language);
})();
