import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const source = await read('js/risk-field.js');
// A 400 × 400 stage whose stencil is a block standing in for the R, with a red (accent) foot.
function setup({ reduced = false, introActive = false } = {}) {
    let clock = 0;
    let frames = [];
    let fills = [];
    const listeners = {};
    const on = (target) => (type, handler) => { listeners[`${target}:${type}`] = handler; };
    let pendingArc;
    const context = {
        setTransform() {}, clearRect() { fills = []; }, beginPath() {},
        arc(x, y) { pendingArc = { x, y }; },
        fill() { fills.push({ ...pendingArc, style: this.fillStyle }); }
    };
    const stencil = () => {
        const sheet = { width: 0, height: 0 };
        sheet.getContext = () => ({
            setTransform() {}, fill() {},
            getImageData() {
                const data = new Uint8ClampedArray(sheet.width * sheet.height * 4);
                for (let y = 100; y < 300; y += 1) for (let x = 150; x < 250; x += 1) {
                    const i = (y * sheet.width + x) * 4;
                    data[i + 3] = 255;
                    if (y > 260) data[i] = 255;
                }
                return { data };
            }
        });
        return sheet;
    };
    const canvas = { getContext: () => context, getBoundingClientRect: () => ({ width: 400, height: 400, left: 0, top: 0 }) };
    const hero = { getBoundingClientRect: () => ({ top: 0, height: 800 }) };
    const classes = new Set(introActive ? ['brand-intro-active'] : []);
    const document = {
        querySelector: (selector) => (selector === '[data-risk-field]' ? canvas : hero),
        documentElement: { classList: { contains: (name) => classes.has(name) }, addEventListener: on('root') },
        createElement: stencil,
        addEventListener: on('document'),
        hidden: false
    };
    const window = {
        matchMedia: (query) => ({ matches: query.includes('reduce') ? reduced : true, addEventListener() {} }),
        addEventListener: on('window'), setTimeout: () => 0, devicePixelRatio: 1
    };
    runInNewContext(source, {
        window, document, performance: { now: () => clock * 1000 }, Math,
        Path2D: class {}, requestAnimationFrame: (fn) => { frames.push(fn); return frames.length; }
    });
    const runFrame = (atSeconds) => { clock = atSeconds; const batch = frames; frames = []; batch.forEach((fn) => fn()); };
    const alphas = () => fills.map((fill) => Number(fill.style.match(/,([\d.]+)\)$/)[1]));
    return { runFrame, alphas, fills: () => fills, listeners, pendingFrames: () => frames.length, setClock: (s) => { clock = s; } };
}
const settledShare = (alphas) => alphas.filter((alpha) => alpha > 0.9).length / alphas.length;
test('points stay scattered during the intro and settle into the mark after it hands over', () => {
    const scene = setup({ introActive: true });
    scene.runFrame(5);
    assert.equal(settledShare(scene.alphas()), 0);
    scene.listeners['document:riscodex:intro-reveal']();
    scene.runFrame(9);
    const share = settledShare(scene.alphas());
    assert.ok(share > 0.7, `settled share ${share}`);
    const settled = scene.fills().filter((fill) => Number(fill.style.match(/,([\d.]+)\)$/)[1]) > 0.9);
    assert.ok(settled.every((fill) => fill.x > 140 && fill.x < 260 && fill.y > 90 && fill.y < 310));
    assert.ok(settled.some((fill) => fill.style.startsWith('rgba(40,91,209')), 'the foot of the mark is drawn in the accent blue');
});
test('without the intro the points settle on their own shortly after load', () => {
    const scene = setup();
    scene.runFrame(0.1);
    assert.equal(settledShare(scene.alphas()), 0);
    scene.runFrame(4);
    assert.ok(settledShare(scene.alphas()) > 0.7);
});
test('reduced motion draws the finished mark once and keeps no animation running', () => {
    const scene = setup({ reduced: true });
    scene.runFrame(0);
    assert.ok(settledShare(scene.alphas()) > 0.7);
    assert.equal(scene.pendingFrames(), 0);
});
test('the hero uses the 2D risk field and nothing from the old 3D scene remains', async () => {
    const html = await read('index.html');
    const css = await read('css/landing.css');
    const hero = html.match(/<section[^>]*data-story-section="hero"[\s\S]*?<\/section>/)[0];
    assert.match(hero, /<canvas class="risk-field" data-risk-field aria-hidden="true"><\/canvas>/);
    assert.match(html, /<script defer src="js\/risk-field\.js\?v=[\w-]+"><\/script>/);
    assert.doesNotMatch(html + css, /decision-network|importmap|three\.module/);
    const intro = await read('js/brand-intro.js');
    const bowl = source.match(/bowl: '([^']+)'/)[1];
    assert.ok(intro.includes(bowl), 'the hero R uses the same shape as the logo intro');
});
