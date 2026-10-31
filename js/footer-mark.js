// Ties the footer logo's draw-in to how far it has scrolled into view.
(() => {
    const mark = document.querySelector('[data-footer-mark]');
    if (!mark) return;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;

    function update() {
        frame = 0;
        if (reducedMotion.matches) { mark.style.removeProperty('--p'); return; }
        const rect = mark.getBoundingClientRect();
        // Starts once the logo is about half on screen and completes when all of it is, which the page bottom always allows.
        const progress = Math.min(1, Math.max(0, (window.innerHeight - rect.top - rect.height * 0.45) / (rect.height * 0.55 + 40)));
        mark.style.setProperty('--p', progress.toFixed(3));
    }

    const request = () => { if (!frame) frame = requestAnimationFrame(update); };
    window.addEventListener('scroll', request, { passive: true });
    window.addEventListener('resize', request);
    reducedMotion.addEventListener('change', update);
    update();
})();
