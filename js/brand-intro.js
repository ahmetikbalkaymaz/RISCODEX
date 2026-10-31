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

    // Shapes come from the brand lockup SVG, each fitted to its place in the horizontal navbar logo (3078 × 1025).
    const LOGO = `<svg viewBox="0 0 2069.3 689.09" focusable="false">
<g class="intro-mark" transform="translate(-765.95 -515.84)">
<path pathLength="1" d="M1282.05,1204.91H1136.39l-185.17-258,115.71-161.23c21.3-29.77,24-66.91,7.37-99.51s-48.52-52-85.12-52H765.95V515.84H989.18a214.07,214.07,0,0,1,173.88,338.85l-66.19,92.22Z"/>
<polygon pathLength="1" points="765.97 688.83 917.55 900.13 990.38 798.62 911.63 688.83 765.97 688.83"/>
<polygon pathLength="1" class="is-accent" points="765.97 1204.93 917.55 993.62 990.38 1095.13 911.63 1204.93 765.97 1204.93"/>
</g>
<g class="intro-word">
<g style="--i:0"><path d="M570.78,525.74V337.49H604.4V367.08C608.43,349.6,631.96,335.48,665.58,334.81H675.66V370.44C638.68,370.44,608.43,383.21,605.07,420.19V525.74Z"/></g>
<g style="--i:1"><rect x="717.34" y="337.49" width="34.95" height="188.25"/><circle cx="735.49" cy="281.02" r="22.19"/></g>
<g style="--i:2"><g transform="translate(291 -932.679) scale(0.919 0.955)"><path d="M641,1532.16a111.09,111.09,0,0,1-25.38-2.94c-21.32-4.93-41.45-15.8-56.14-32l34.16-31.13a66.55,66.55,0,0,0,36.92,22.81c9.51,2.11,20.2,1.85,28.08-3.88,8.68-6.32,10.69-19.24,3-27.3-7.84-8.27-21.92-9-32.27-11.77-14.28-3.79-29.14-7.81-40.67-17.54-14.56-12.28-20.49-31.3-17.11-49.85,7.58-41.6,50.95-58.2,88.87-52.18,22.17,3.52,44.39,14.1,56.23,33.17l-36.59,27.89a45.69,45.69,0,0,0-36-20.89c-9.33-.4-21.94,3.53-23.13,14.7-.69,6.48,3.7,12.63,9.23,16.07s12.08,4.74,18.44,6.18c12.5,2.83,25,6.44,36.2,12.59s21.28,15.05,27.08,26.49c8.16,16.1,6.94,36.18-1.67,52s-24,27.51-41.19,33.14A90.87,90.87,0,0,1,641,1532.16Z"/></g></g>
<g style="--i:3"><g transform="translate(269.072 -932.679) scale(0.989 0.955)"><path d="M836.47,1484.69a56,56,0,1,1,39.58-95.62l33.59-33.59a103.49,103.49,0,1,0,0,146.37v0l-33.59-33.55A55.73,55.73,0,0,1,836.47,1484.69Z"/></g></g>
<g style="--i:4"><g transform="translate(348.501 -932.791) scale(0.932 0.955)"><path d="M1018.3,1372.64a56,56,0,1,1-56,56,56.08,56.08,0,0,1,56-56m0-47.47a103.48,103.48,0,1,0,103.48,103.48,103.48,103.48,0,0,0-103.48-103.48Z"/></g></g>
<g style="--i:5"><g transform="translate(356.605 -975.189) scale(0.942 0.983)"><path d="M1296.81,1255.81v92.84c-12.77-14.66-31.11-23.46-56-23.46a103.48,103.48,0,1,0,0,207c24.91,0,43.25-8.8,56-23.46v23.48h47.47V1255.81Zm-56,228.87a56.08,56.08,0,0,1-56-56c0-.05,0-.1,0-.16s0-.1,0-.16a56,56,0,1,1,112,0c0,.05,0,.1,0,.16s0,.1,0,.16A56.08,56.08,0,0,1,1240.79,1484.68Z"/></g></g>
<g style="--i:6"><g transform="translate(416.927 -933.093) scale(0.925 0.955)"><path d="M1461.77,1532.15q-30.33,0-53.45-14a97.65,97.65,0,0,1-35.82-37.34q-12.7-23.31-12.7-51.74a104.83,104.83,0,0,1,13.27-52.12,101.71,101.71,0,0,1,36.2-37.72q22.93-14,52.5-14t52.12,14a98.42,98.42,0,0,1,35.25,37.72,108.61,108.61,0,0,1,12.7,52.12q0,4.18-.38,8.72t-1.14,9.48H1412.87q4.16,17.44,16.87,28.43t32,11q16.67,0,29-7.58a56.06,56.06,0,0,0,19.14-19l39.8,29.95q-11.75,18.58-35.25,30.33T1461.77,1532.15Zm-.76-163q-18.2,0-31.08,11T1412.87,1409h97.42A55.68,55.68,0,0,0,1493,1380.9Q1480,1369.16,1461,1369.15Z"/></g></g>
<g style="--i:7"><g transform="translate(455.242 -867.712) scale(0.909 0.909)"><polygon points="1774 1532.16 1713.21 1447.42 1684 1488.13 1715.58 1532.16 1774 1532.16"/><polygon points="1774 1325.18 1713.21 1409.92 1684 1369.21 1715.58 1325.18 1774 1325.18"/><polygon points="1699.73 1428.69 1670.53 1469.36 1625.43 1532.16 1567.02 1532.16 1641.32 1428.69 1567.02 1325.18 1625.43 1325.18 1670.53 1387.98 1699.73 1428.69"/></g></g>
</g>
</svg>`;
    const LOGO_ASPECT = 3078 / 1025;
    const SKIP_EVENTS = ['pointerdown', 'keydown', 'wheel', 'touchstart'];
    const target = document.querySelector('#navbar .brand img');
    const intro = document.createElement('div');
    intro.className = 'brand-intro';
    intro.setAttribute('aria-hidden', 'true');
    intro.innerHTML = LOGO;
    const logo = intro.querySelector('svg');
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
    intro.querySelector('.intro-word > :last-child').addEventListener('animationend', () => {
        clearTimeout(timer);
        timer = window.setTimeout(() => land(false), 120);
    }, { once: true });
    SKIP_EVENTS.forEach((type) => window.addEventListener(type, skip, { passive: true }));
    // A reload part-way down the page should not replay the intro over the content.
    if (window.scrollY > 40) skip();
})();
