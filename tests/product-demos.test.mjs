import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const source = await read('js/product-demos.js');
function classList() {
    const classes = new Set();
    return {
        add: (name) => classes.add(name), remove: (name) => classes.delete(name), contains: (name) => classes.has(name),
        toggle(name, force) { if (force ?? !classes.has(name)) classes.add(name); else classes.delete(name); }
    };
}
function setup({ reduced = false, lang = 'tr' } = {}) {
    let clock = 0;
    let timers = [];
    let frames = [];
    let nextId = 1;
    const part = (showAt) => { const el = { dataset: { showAt: String(showAt) }, classList: classList() }; el.closest = () => el; return el; };
    const parts = [1, 2, 3, 4, 5, 6].map(part);
    const counter = { dataset: { countTo: '41250' }, textContent: '41.250 TL', closest: () => parts[3] };
    const demo = { classList: classList(), querySelectorAll: (selector) => (selector === '[data-show-at]' ? parts : [counter]) };
    let observe;
    const window = {
        matchMedia: () => ({ matches: reduced, addEventListener() {} }),
        IntersectionObserver: class { constructor(callback) { observe = callback; } observe() {} disconnect() {} }
    };
    const document = { documentElement: { lang }, hidden: false, querySelectorAll: () => [demo], addEventListener() {} };
    runInNewContext(source, {
        window, document, IntersectionObserver: window.IntersectionObserver, performance: { now: () => clock },
        setTimeout: (fn, ms) => { const id = nextId++; timers.push({ id, fn, at: clock + ms }); return id; },
        clearTimeout: (id) => { timers = timers.filter((timer) => timer.id !== id); },
        requestAnimationFrame: (fn) => { const id = nextId++; frames.push({ id, fn }); return id; },
        cancelAnimationFrame: (id) => { frames = frames.filter((frame) => frame.id !== id); }
    });
    const flushFrames = () => { while (frames.length) { const batch = frames; frames = []; batch.forEach((frame) => frame.fn(clock)); } };
    const runNextTimer = () => {
        timers.sort((a, b) => a.at - b.at);
        const timer = timers.shift();
        clock = timer.at;
        timer.fn();
        clock += 1000;
        flushFrames();
    };
    const shown = () => parts.map((p) => p.classList.contains('is-shown'));
    return { demo, parts, counter, shown, runNextTimer, enter: (isIntersecting) => observe([{ target: demo, isIntersecting }]), pending: () => timers.length };
}
test('a card on screen builds up step by step, holds, then replays', () => {
    const { demo, counter, shown, runNextTimer, enter } = setup();
    enter(true);
    assert.equal(demo.classList.contains('is-animated'), true);
    assert.deepEqual(shown(), [false, false, false, false, false, false]);
    for (let step = 1; step <= 6; step += 1) {
        runNextTimer();
        assert.equal(shown().filter(Boolean).length, step);
    }
    assert.equal(counter.textContent, '41.250 TL');
    runNextTimer();
    assert.equal(demo.classList.contains('is-resetting'), false, 'the finished card holds first');
    runNextTimer();
    assert.equal(demo.classList.contains('is-resetting'), true);
    runNextTimer();
    assert.equal(demo.classList.contains('is-resetting'), false);
    assert.deepEqual(shown(), [false, false, false, false, false, false]);
});
test('leaving the screen stops the card, and reduced motion never animates it', () => {
    const playing = setup();
    playing.enter(true);
    playing.enter(false);
    assert.equal(playing.pending(), 0);
    const still = setup({ reduced: true });
    still.enter(true);
    assert.equal(still.demo.classList.contains('is-animated'), false);
    assert.equal(still.pending(), 0);
});
test('the counted premium ends on the translated amount in English too', () => {
    const { counter, runNextTimer, enter } = setup({ lang: 'en' });
    enter(true);
    for (let step = 1; step <= 4; step += 1) runNextTimer();
    assert.equal(counter.textContent, 'TRY 41,250');
});
test('both product rows carry a translated preview card', async () => {
    const html = await read('index.html');
    const sandbox = { window: {} };
    runInNewContext(await read('js/landing-translations.js'), sandbox);
    for (const product of ['tariffeq', 'versus']) {
        const row = html.match(new RegExp(`<article[^>]*data-product="${product}"[\\s\\S]*?</article>`))[0];
        assert.match(row, /<figure class="product-demo" data-demo/);
    }
    for (const lang of ['tr', 'en']) {
        const locale = sandbox.window.__landingTranslations[lang];
        const stored = JSON.parse(await read(`locales/landing-${lang}.json`));
        assert.deepEqual(JSON.parse(JSON.stringify(locale.platform.preview)), stored.platform.preview);
        for (const [, key] of html.matchAll(/data-i18n(?:-aria-label)?="(platform\.preview\.[^"]+)"/g)) {
            assert.equal(typeof key.split('.').reduce((value, part) => value?.[part], locale), 'string', `${lang}: ${key}`);
        }
        assert.equal(locale.platform.preview.tariff.premium, lang === 'en' ? 'TRY 41,250' : '41.250 TL');
    }
});
