// Plays the product preview cards step by step while they are on screen. Without JS they show the finished state.
(() => {
    const demos = [...document.querySelectorAll('[data-demo]')];
    if (!demos.length || !('IntersectionObserver' in window)) return;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const STEP_MS = 650;
    const HOLD_MS = 3200;
    const RESET_MS = 450;
    const COUNT_MS = 900;

    function formatMoney(value) {
        return document.documentElement.lang === 'en'
            ? `TRY ${value.toLocaleString('en-US')}`
            : `${value.toLocaleString('tr-TR')} TL`;
    }

    function createPlayer(demo) {
        const parts = [...demo.querySelectorAll('[data-show-at]')];
        const counters = [...demo.querySelectorAll('[data-count-to]')];
        const lastStep = Math.max(...parts.map((part) => Number(part.dataset.showAt)));
        let step = lastStep;
        let timer = 0;
        let frame = 0;
        let playing = false;

        function countUp(counter) {
            const target = Number(counter.dataset.countTo);
            const start = performance.now();
            const tick = (now) => {
                const t = Math.min(1, (now - start) / COUNT_MS);
                const eased = 1 - (1 - t) ** 3;
                counter.textContent = formatMoney(t === 1 ? target : Math.round((target * eased) / 10) * 10);
                if (t < 1) frame = requestAnimationFrame(tick);
            };
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(tick);
        }

        function show(next) {
            step = next;
            parts.forEach((part) => part.classList.toggle('is-shown', Number(part.dataset.showAt) <= step));
            counters.forEach((counter) => {
                if (Number(counter.closest('[data-show-at]').dataset.showAt) === step) countUp(counter);
            });
        }

        function advance() {
            if (step < lastStep) {
                show(step + 1);
                timer = setTimeout(advance, STEP_MS);
                return;
            }
            // Hold the finished card, fade it out and play it again.
            timer = setTimeout(() => {
                demo.classList.add('is-resetting');
                timer = setTimeout(() => {
                    demo.classList.remove('is-resetting');
                    show(0);
                    timer = setTimeout(advance, STEP_MS);
                }, RESET_MS);
            }, HOLD_MS);
        }

        function stop() {
            playing = false;
            clearTimeout(timer);
            cancelAnimationFrame(frame);
            demo.classList.remove('is-resetting');
        }

        return {
            play() {
                if (playing || reducedMotion.matches) return;
                playing = true;
                demo.classList.add('is-animated');
                show(0);
                timer = setTimeout(advance, 300);
            },
            pause: stop,
            finish() {
                stop();
                demo.classList.remove('is-animated');
                show(lastStep);
                cancelAnimationFrame(frame);
                counters.forEach((counter) => { counter.textContent = formatMoney(Number(counter.dataset.countTo)); });
            }
        };
    }

    const players = new Map(demos.map((demo) => [demo, createPlayer(demo)]));
    const onScreen = new Set();
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            const player = players.get(entry.target);
            if (entry.isIntersecting) onScreen.add(entry.target); else onScreen.delete(entry.target);
            if (entry.isIntersecting && !document.hidden) player.play(); else player.pause();
        });
    }, { threshold: 0.45 });
    demos.forEach((demo) => observer.observe(demo));

    reducedMotion.addEventListener('change', () => {
        if (!reducedMotion.matches) return;
        observer.disconnect();
        players.forEach((player) => player.finish());
    });
    document.addEventListener('visibilitychange', () => {
        players.forEach((player, demo) => {
            if (document.hidden) player.pause(); else if (onScreen.has(demo)) player.play();
        });
    });
})();
