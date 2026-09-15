(() => {
    const translations = window.__landingTranslations || {};
    const storageKey = 'riscodex-lang';
    const menu = document.getElementById('mobile-menu');
    const menuButton = document.getElementById('mobile-menu-button');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const navLinks = [...document.querySelectorAll('.nav-link')];
    const sections = [...document.querySelectorAll('[data-story-section]')];
    let language = 'tr';
    try { language = localStorage.getItem(storageKey) || 'tr'; } catch { /* Storage can be disabled. */ }

    function closeMenu() {
        menu.hidden = true;
        menuButton.setAttribute('aria-expanded', 'false');
    }
    menuButton.addEventListener('click', () => {
        menu.hidden = !menu.hidden;
        menuButton.setAttribute('aria-expanded', String(!menu.hidden));
    });
    menu.addEventListener('click', (event) => { if (event.target.closest('a')) closeMenu(); });
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && !menu.hidden) { closeMenu(); menuButton.focus(); }
    });
    window.matchMedia('(min-width: 1024px)').addEventListener('change', closeMenu);

    function setLanguage(next) {
        const locale = translations[next];
        if (!locale) return;
        const get = (key) => key.split('.').reduce((value, part) => value?.[part], locale);
        const bindings = {
            'data-i18n': (el, value) => { el.textContent = value; },
            'data-i18n-html': (el, value) => { el.innerHTML = value; },
            'data-i18n-placeholder': (el, value) => { el.placeholder = value; },
            'data-i18n-aria-label': (el, value) => { el.setAttribute('aria-label', value); }
        };
        for (const [attr, apply] of Object.entries(bindings)) {
            document.querySelectorAll(`[${attr}]`).forEach((el) => {
                const value = get(el.getAttribute(attr));
                if (typeof value === 'string') apply(el, value);
            });
        }
        document.documentElement.lang = next;
        document.title = locale.meta.title;
        document.querySelector('meta[name="description"]').content = locale.hero.description;
        document.querySelectorAll('[data-lang-copy]').forEach((el) => { el.hidden = el.dataset.langCopy !== next; });
        document.querySelectorAll('.lang-toggle').forEach((button) => {
            const active = button.dataset.lang === next;
            button.classList.toggle('is-active', active);
            button.setAttribute('aria-pressed', String(active));
        });
        try { localStorage.setItem(storageKey, next); } catch { /* The page works without storage. */ }
        requestAnimationFrame(() => document.dispatchEvent(new Event('landing:language')));
    }
    document.querySelectorAll('[data-lang]').forEach((button) => button.addEventListener('click', () => setLanguage(button.dataset.lang)));
    window.setLanguage = setLanguage;
    setLanguage(translations[language] ? language : 'tr');

    if ('IntersectionObserver' in window && !reducedMotion.matches) {
        const revealObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                entry.target.classList.add('reveal-visible');
                revealObserver.unobserve(entry.target);
            });
        }, { threshold: .06 });
        document.querySelectorAll('.reveal-on-scroll').forEach((el) => {
            el.classList.add('reveal-pending');
            revealObserver.observe(el);
        });
        reducedMotion.addEventListener('change', () => {
            if (reducedMotion.matches) {
                document.querySelectorAll('.reveal-pending').forEach((el) => el.classList.add('reveal-visible'));
                revealObserver.disconnect();
            }
        });
    }
    let scrollFrame = 0;
    function updateNav() {
        scrollFrame = 0;
        const current = sections.filter((section) => section.getBoundingClientRect().top <= 180).at(-1);
        navLinks.forEach((link) => {
            const active = link.hash === `#${current?.id}`;
            link.classList.toggle('is-active', active);
            if (active) link.setAttribute('aria-current', 'location'); else link.removeAttribute('aria-current');
        });
    }
    window.addEventListener('scroll', () => { if (!scrollFrame) scrollFrame = requestAnimationFrame(updateNav); }, { passive: true });
    updateNav();
})();
