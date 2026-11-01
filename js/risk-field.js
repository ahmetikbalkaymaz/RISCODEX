// Hero scene: scattered points (risk) settle into the Riscodex R (codex), then breathe, catch a passing light
// and shy away from the pointer. Scrolling past the hero scatters them again.
(() => {
    const canvas = document.querySelector('[data-risk-field]');
    const hero = document.querySelector('[data-story-section="hero"]');
    if (!canvas?.getContext || !hero) return;
    const context = canvas.getContext('2d');
    const root = document.documentElement;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');

    // The R mark from the brand lockup, in its own coordinate space.
    const MARK = {
        bowl: 'M1282.05,1204.91H1136.39l-185.17-258,115.71-161.23c21.3-29.77,24-66.91,7.37-99.51s-48.52-52-85.12-52H765.95V515.84H989.18a214.07,214.07,0,0,1,173.88,338.85l-66.19,92.22Z',
        upper: 'M765.97 688.83L917.55 900.13L990.38 798.62L911.63 688.83Z',
        accent: 'M765.97 1204.93L917.55 993.62L990.38 1095.13L911.63 1204.93Z',
        left: 765.95, top: 515.84, width: 516.1, height: 689.09
    };
    const INK = [16, 24, 39];
    const ACCENT = [40, 91, 209];
    const SETTLE_SECONDS = 1.6;
    const SHIMMER_SECONDS = 7;
    const POINTER_RADIUS = 80;

    let points = [];
    let width = 0;
    let height = 0;
    let dotRadius = 1.6;
    let settleStart = Infinity;
    let pointerX = -1e4;
    let pointerY = -1e4;
    let frame = 0;
    let onScreen = true;

    const clamp01 = (value) => Math.min(1, Math.max(0, value));
    const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
    const now = () => performance.now() / 1000;

    function build() {
        const box = canvas.getBoundingClientRect();
        if (!box.width || !box.height) return false;
        width = box.width;
        height = box.height;
        const ratio = Math.min(2, window.devicePixelRatio || 1);
        canvas.width = Math.round(width * ratio);
        canvas.height = Math.round(height * ratio);
        context.setTransform(ratio, 0, 0, ratio, 0, 0);

        // Fit the R into the stage and rasterise it once to find where the points belong.
        const markHeight = height * (width < 640 ? 0.78 : 0.62);
        const scale = markHeight / MARK.height;
        const offsetX = (width - MARK.width * scale) / 2 - MARK.left * scale;
        const offsetY = (height - markHeight) / 2 - MARK.top * scale;
        const stencil = document.createElement('canvas');
        stencil.width = Math.ceil(width);
        stencil.height = Math.ceil(height);
        const pen = stencil.getContext('2d');
        pen.setTransform(scale, 0, 0, scale, offsetX, offsetY);
        pen.fillStyle = '#000';
        pen.fill(new Path2D(MARK.bowl));
        pen.fill(new Path2D(MARK.upper));
        pen.fillStyle = '#f00';
        pen.fill(new Path2D(MARK.accent));
        const pixels = pen.getImageData(0, 0, stencil.width, stencil.height).data;

        const gap = Math.max(6, Math.round(markHeight / 54));
        dotRadius = gap * 0.27;
        const scattered = () => [Math.random() * width, Math.random() * height];
        points = [];
        for (let row = 0, y = gap / 2; y < height; row += 1, y += gap) {
            for (let x = (row % 2 ? gap / 2 : 0) + gap / 2; x < width; x += gap) {
                const index = (Math.floor(y) * stencil.width + Math.floor(x)) * 4;
                if (pixels[index + 3] < 128) continue;
                const [sx, sy] = scattered();
                points.push({ tx: x, ty: y, sx, sy, accent: pixels[index] > 200 && pixels[index + 1] < 60, delay: Math.random() * 0.45, phase: Math.random() * 6.28, ox: 0, oy: 0 });
            }
        }
        // A thin haze of points that never settle keeps the "risk" around the mark.
        const haze = Math.round(points.length * 0.22);
        for (let i = 0; i < haze; i += 1) {
            const [sx, sy] = scattered();
            points.push({ tx: sx, ty: sy, sx, sy, free: true, phase: Math.random() * 6.28, ox: 0, oy: 0 });
        }
        return true;
    }

    function draw(time) {
        context.clearRect(0, 0, width, height);
        const heroBox = hero.getBoundingClientRect();
        const scrollScatter = reducedMotion.matches ? 0 : clamp01(-heroBox.top / (heroBox.height * 0.8)) * 0.85;
        const canvasBox = canvas.getBoundingClientRect();
        const localX = pointerX - canvasBox.left;
        const localY = pointerY - canvasBox.top;
        const shimmerAt = ((time % SHIMMER_SECONDS) / SHIMMER_SECONDS) * (width + 400) - 200;

        for (const point of points) {
            let x;
            let y;
            let settled;
            if (point.free) {
                x = point.tx + Math.sin(time * 0.3 + point.phase) * 10;
                y = point.ty + Math.cos(time * 0.25 + point.phase) * 8;
                settled = 0;
            } else {
                settled = easeInOut(clamp01((time - settleStart - point.delay) / SETTLE_SECONDS)) * (1 - scrollScatter);
                const breathe = reducedMotion.matches ? 0 : Math.sin(time * 0.9 + point.phase) * 0.8 * settled;
                x = point.sx + (point.tx - point.sx) * settled + breathe;
                y = point.sy + (point.ty - point.sy) * settled - breathe;
            }

            // Ease each point away from the pointer and back again.
            const dx = x - localX;
            const dy = y - localY;
            const distance = Math.hypot(dx, dy);
            const push = distance < POINTER_RADIUS ? (1 - distance / POINTER_RADIUS) ** 2 * 28 : 0;
            point.ox += ((push ? (dx / distance) * push : 0) - point.ox) * 0.14;
            point.oy += ((push ? (dy / distance) * push : 0) - point.oy) * 0.14;

            const lit = !point.free && Math.abs(point.tx - point.ty * 0.45 - shimmerAt) < 46 ? settled : 0;
            const tone = point.accent ? ACCENT : INK.map((channel, i) => channel + (ACCENT[i] - channel) * lit);
            const alpha = point.free ? 0.16 : 0.22 + 0.7 * settled;
            context.fillStyle = `rgba(${tone[0]},${tone[1]},${tone[2]},${alpha})`;
            context.beginPath();
            context.arc(x + point.ox, y + point.oy, dotRadius, 0, Math.PI * 2);
            context.fill();
        }
    }

    function loop() {
        frame = 0;
        draw(now());
        if (!reducedMotion.matches && onScreen && !document.hidden) frame = requestAnimationFrame(loop);
    }

    function start() {
        if (!frame) frame = requestAnimationFrame(loop);
    }

    function settle() {
        if (settleStart === Infinity) settleStart = now();
    }

    function refresh() {
        if (!build()) return;
        if (reducedMotion.matches) settleStart = -Infinity;
        draw(now());
        start();
    }

    // While the logo intro plays the points wait scattered and settle as it hands over to the page.
    if (reducedMotion.matches) settleStart = -Infinity;
    else if (root.classList.contains('brand-intro-active')) {
        document.addEventListener('riscodex:intro-reveal', settle, { once: true });
        window.setTimeout(settle, 4000);
    } else {
        settleStart = now() + 0.3;
    }

    window.addEventListener('pointermove', (event) => {
        if (!finePointer.matches || reducedMotion.matches) return;
        pointerX = event.clientX;
        pointerY = event.clientY;
    }, { passive: true });
    document.documentElement.addEventListener('pointerleave', () => { pointerX = -1e4; pointerY = -1e4; });
    window.addEventListener('scroll', () => { if (reducedMotion.matches) return; start(); }, { passive: true });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) start(); });
    reducedMotion.addEventListener('change', refresh);
    if ('IntersectionObserver' in window) {
        new IntersectionObserver(([entry]) => {
            onScreen = entry.isIntersecting;
            if (onScreen) start();
        }).observe(canvas);
    }
    if ('ResizeObserver' in window) new ResizeObserver(refresh).observe(canvas);
    else window.addEventListener('resize', refresh);
    refresh();
})();
