// Plays the Riscodex logo intro once per session. The inline head script decides whether it runs.
(() => {
    const root = document.documentElement;
    if (!root.classList.contains('brand-intro-active')) return;
    // On a slow load the visitor has already waited; open the page instead of starting the intro late.
    if (performance.now() > 2000) {
        root.classList.remove('brand-intro-active', 'brand-intro-landing');
        document.dispatchEvent(new Event('riscodex:intro-reveal'));
        return;
    }

    const LOGO_ASPECT = 3078 / 1025;
    const SKIP_EVENTS = ['pointerdown', 'keydown', 'wheel', 'touchstart'];
    const target = document.querySelector('#navbar .brand img');
    // The footer carries the one copy of the logo shapes; the intro flies a clone of it.
    const source = document.querySelector('[data-brand-lockup]');
    if (!source) {
        root.classList.remove('brand-intro-active', 'brand-intro-landing');
        document.dispatchEvent(new Event('riscodex:intro-reveal'));
        return;
    }
    const intro = document.createElement('div');
    intro.className = 'brand-intro';
    intro.setAttribute('aria-hidden', 'true');
    const logo = source.cloneNode(true);
    logo.removeAttribute('data-brand-lockup');
    intro.append(logo);
    let landing = false;

    // Where the navbar image actually draws its logo inside an object-fit: contain box.
    function drawnLogoRect(image) {
        const box = image?.getBoundingClientRect();
        if (!box?.width) return null;
        const aspect = image.naturalWidth ? image.naturalWidth / image.naturalHeight : LOGO_ASPECT;
        const width = Math.min(box.width, box.height * aspect);
        const height = width / aspect;
        return { left: box.left + (box.width - width) / 2, top: box.top + (box.height - height) / 2, width };
    }

    function finish() {
        SKIP_EVENTS.forEach((type) => window.removeEventListener(type, skip));
        intro.remove();
        root.classList.remove('brand-intro-active', 'brand-intro-landing');
    }

    // Cross-fade the landed logo into the navbar image so small drawing differences never show.
    function settle() {
        root.classList.remove('brand-intro-landing');
        intro.classList.add('is-settled');
        window.setTimeout(finish, 240);
    }

    function land(fast) {
        if (landing) return;
        landing = true;
        clearTimeout(timer);
        intro.classList.toggle('is-skipping', fast);
        const from = logo.getBoundingClientRect();
        const to = drawnLogoRect(target);
        const duration = fast ? 350 : 700;
        // Reveal the page underneath while the logo flies to the navbar.
        intro.classList.add('is-leaving');
        root.classList.remove('brand-intro-active');
        window.setTimeout(settle, duration + 40);
        if (to && from.width && logo.animate) {
            logo.animate([
                { transform: 'none' },
                { transform: `translate(${to.left - from.left}px, ${to.top - from.top}px) scale(${to.width / from.width})` }
            ], { duration, easing: 'cubic-bezier(.7, 0, .2, 1)', fill: 'forwards' });
        }
        // Announced after the flight starts, so the 3D scene boots behind a running compositor animation.
        document.dispatchEvent(new Event('riscodex:intro-reveal'));
    }

    function skip() { land(true); }

    root.classList.add('brand-intro-landing');
    document.body.append(intro);
    // Fly once the last letter has settled; CSS animations can start late while the 3D scene boots.
    let timer = window.setTimeout(() => land(false), 3000);
    intro.querySelector('.lockup-word > :last-child').addEventListener('animationend', () => {
        clearTimeout(timer);
        timer = window.setTimeout(() => land(false), 120);
    }, { once: true });
    SKIP_EVENTS.forEach((type) => window.addEventListener(type, skip, { passive: true }));
    // A reload part-way down the page should not replay the intro over the content.
    if (window.scrollY > 40) skip();
})();
