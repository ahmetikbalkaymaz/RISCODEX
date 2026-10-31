(() => {
    const scene = document.querySelector('[data-compare-scene]');
    if (!scene) return;
    const rows = [...scene.querySelectorAll('[data-row]')];
    const phases = [...scene.querySelectorAll('[data-phase]')];
    const verdict = scene.querySelector('[data-verdict]');
    const sticky = scene.querySelector('.compare-sticky');
    // Stage 0 reads the documents, one stage per row follows, the last stage shows the verdict.
    const stageCount = rows.length + 2;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;
    let width = window.innerWidth;

    const phaseFor = (stage) => (stage === 0 ? 0 : stage < stageCount - 1 ? 1 : 2);

    function setPhase(active) {
        phases.forEach((phase, i) => {
            phase.classList.toggle('is-active', i === active);
            if (i === active) phase.setAttribute('aria-current', 'step'); else phase.removeAttribute('aria-current');
        });
    }

    function render() {
        frame = 0;
        const rect = scene.getBoundingClientRect();
        const travel = Math.max(1, rect.height - window.innerHeight);
        const progress = Math.min(1, Math.max(0, -rect.top / travel));
        const stage = Math.min(stageCount - 1, Math.floor(progress * stageCount));
        scene.style.setProperty('--scene-progress', progress.toFixed(3));
        if (scene.dataset.stage === String(stage)) return;
        scene.dataset.stage = String(stage);
        rows.forEach((row) => {
            const index = Number(row.dataset.row);
            row.classList.toggle('is-revealed', index <= stage);
            row.classList.toggle('is-current', index === stage);
        });
        verdict.classList.toggle('is-revealed', stage === stageCount - 1);
        setPhase(phaseFor(stage));
    }

    function request() {
        if (!frame && scene.classList.contains('is-scrubbing')) frame = requestAnimationFrame(render);
    }

    // The pinned frame is only used when the whole comparison, verdict included, fits on screen.
    function fitsPinned() {
        scene.classList.add('is-scrubbing');
        const style = window.getComputedStyle(sticky);
        const available = sticky.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
        // Small screens show only the current row's flag, which can add up to two lines while scrolling.
        const flagRoom = window.innerWidth < 640 ? 28 : 0;
        return sticky.firstElementChild.offsetHeight + flagRoom <= available;
    }

    function setMode() {
        const scrub = !reducedMotion.matches && fitsPinned();
        scene.classList.toggle('is-scrubbing', scrub);
        if (scrub) { delete scene.dataset.stage; render(); return; }
        // Static mode shows the whole comparison at once.
        delete scene.dataset.stage;
        scene.style.removeProperty('--scene-progress');
        rows.forEach((row) => row.classList.remove('is-revealed', 'is-current'));
        verdict.classList.remove('is-revealed');
        setPhase(-1);
    }

    window.addEventListener('scroll', request, { passive: true });
    window.addEventListener('resize', () => {
        // Mobile browser bars fire height-only resizes; re-check the layout only when the width changes.
        if (window.innerWidth !== width) { width = window.innerWidth; setMode(); } else request();
    });
    reducedMotion.addEventListener('change', setMode);
    document.addEventListener('landing:language', setMode);
    document.fonts?.ready.then(setMode);
    setMode();
})();
