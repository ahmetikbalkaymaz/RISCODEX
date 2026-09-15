// Pointer effects are opt-in by device capability and never run on touch screens.
(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const pointer = window.matchMedia('(hover: hover) and (pointer: fine)');
    document.querySelectorAll('[data-spotlight]').forEach((surface) => {
        let frame = 0;
        let position;
        const reset = () => {
            cancelAnimationFrame(frame);
            frame = 0;
            ['--light-x', '--light-y'].forEach((name) => surface.style.removeProperty(name));
        };
        surface.addEventListener('pointermove', (event) => {
            if (motion.matches || !pointer.matches || event.pointerType === 'touch') return;
            const bounds = surface.getBoundingClientRect();
            position = [(event.clientX - bounds.left) / bounds.width, (event.clientY - bounds.top) / bounds.height];
            if (frame) return;
            frame = requestAnimationFrame(() => {
                frame = 0;
                surface.style.setProperty('--light-x', `${position[0] * 100}%`);
                surface.style.setProperty('--light-y', `${position[1] * 100}%`);
            });
        }, { passive: true });
        surface.addEventListener('pointerleave', reset);
        surface.addEventListener('focusin', reset);
        motion.addEventListener('change', reset);
        pointer.addEventListener('change', reset);
    });
})();
