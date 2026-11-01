import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const html = await read('index.html');
const headScript = html.match(/<script>\s*([\s\S]*?riscodex-intro-seen[\s\S]*?)<\/script>/)[1];
const introSource = await read('js/brand-intro.js');
function classList() {
    const classes = new Set();
    return { add: (...names) => names.forEach((name) => classes.add(name)), remove: (...names) => names.forEach((name) => classes.delete(name)), contains: (name) => classes.has(name) };
}
function runHead({ hash = '', hidden = false, reduced = false, seen = null, storageThrows = false } = {}) {
    const stored = {};
    const root = { classList: classList() };
    const sessionStorage = {
        getItem(key) { if (storageThrows) throw new Error('blocked'); return key === 'riscodex-intro-seen' ? seen : null; },
        setItem(key, value) { stored[key] = value; }
    };
    const timers = [];
    runInNewContext(headScript, { location: { hash }, matchMedia: () => ({ matches: reduced }), sessionStorage, document: { documentElement: root, hidden }, setTimeout: (callback, delay) => timers.push({ callback, delay }) });
    return { active: root.classList.contains('brand-intro-active'), stored, timers, root };
}
test('the head script plays the intro once per session with a failsafe', () => {
    const first = runHead();
    assert.equal(first.active, true);
    assert.equal(first.stored['riscodex-intro-seen'], '1');
    assert.equal(first.timers[0].delay, 4000);
    first.timers[0].callback();
    assert.equal(first.root.classList.contains('brand-intro-active'), false);
    assert.equal(runHead({ seen: '1' }).active, false);
});
test('the intro is skipped for reduced motion, deep links, background tabs and blocked storage', () => {
    assert.equal(runHead({ reduced: true }).active, false);
    assert.equal(runHead({ hidden: true }).active, false);
    assert.equal(runHead({ hash: '#platform' }).active, false);
    assert.equal(runHead({ storageThrows: true }).active, false);
});
function runIntro({ active, now }) {
    const root = { classList: classList() };
    if (active) root.classList.add('brand-intro-active', 'brand-intro-landing');
    const events = [];
    let created = 0;
    const document = {
        documentElement: root,
        createElement() { created += 1; throw new Error('the overlay should not be built'); },
        dispatchEvent(event) { events.push(event.type); }
    };
    runInNewContext(introSource, { document, performance: { now: () => now }, Event: class { constructor(type) { this.type = type; } }, window: {} });
    return { root, events, created };
}
test('the intro script stays idle unless the head script opted in', () => {
    const idle = runIntro({ active: false, now: 100 });
    assert.equal(idle.created, 0);
    assert.deepEqual(idle.events, []);
});
test('a slow load opens the page straight away and still unfolds the network', () => {
    const late = runIntro({ active: true, now: 2500 });
    assert.equal(late.created, 0);
    assert.equal(late.root.classList.contains('brand-intro-active'), false);
    assert.equal(late.root.classList.contains('brand-intro-landing'), false);
    assert.deepEqual(late.events, ['riscodex:intro-reveal']);
});
test('the hero points wait for the intro but never stay scattered', async () => {
    const scene = await read('js/risk-field.js');
    assert.match(scene, /riscodex:intro-reveal/);
    assert.match(scene, /brand-intro-active/);
    assert.match(scene, /setTimeout\(settle, 4000\)/);
    const css = await read('css/landing.css');
    assert.match(css, /\.brand-intro-active \.hero-enter \{ animation-play-state: paused; \}/);
    assert.match(html, /<script defer src="js\/brand-intro\.js\?v=\d+"><\/script>/);
});
