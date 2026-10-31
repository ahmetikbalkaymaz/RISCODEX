import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const html = await read('index.html');
const source = await read('js/footer-mark.js');
function setup({ reduced = false, top = 1000, height = 400, innerHeight = 900 } = {}) {
    const props = {};
    const handlers = {};
    const mark = {
        style: { setProperty(key, value) { props[key] = value; }, removeProperty(key) { delete props[key]; } },
        getBoundingClientRect() { return { top: mark.top, height }; },
        top
    };
    const window = { innerHeight, addEventListener(event, handler) { handlers[event] = handler; }, matchMedia: () => ({ matches: reduced, addEventListener() {} }) };
    runInNewContext(source, { window, document: { querySelector: () => mark }, requestAnimationFrame(callback) { callback(); return 0; } });
    const scrollTo = (nextTop) => { mark.top = nextTop; handlers.scroll(); };
    return { props, scrollTo };
}
test('footer logo progress starts half on screen and completes once fully visible', () => {
    const { props, scrollTo } = setup();
    assert.equal(props['--p'], '0.000');
    scrollTo(900 - 400 * 0.45);
    assert.equal(props['--p'], '0.000');
    scrollTo(900 - 400 * 0.45 - (400 * 0.55 + 40) / 2);
    assert.equal(props['--p'], '0.500');
    scrollTo(900 - 400 - 40);
    assert.equal(props['--p'], '1.000');
    scrollTo(-200);
    assert.equal(props['--p'], '1.000');
});
test('reduced motion leaves the footer logo at its finished state', () => {
    const { props, scrollTo } = setup({ reduced: true });
    scrollTo(800);
    assert.equal(props['--p'], undefined);
});
test('the footer holds the one copy of the logo that the intro clones', async () => {
    assert.equal(html.match(/data-brand-lockup/g).length, 1);
    const footer = html.slice(html.indexOf('<footer'), html.indexOf('</footer>'));
    assert.match(footer, /<div class="footer-mark" data-footer-mark><svg class="brand-lockup"[^>]*aria-hidden="true"/);
    assert.equal(footer.match(/pathLength="1"/g).length, 3);
    assert.equal(footer.match(/<g style="--i:\d">/g).length, 8);
    assert.equal(footer.match(/class="lockup-node"/g).length, 4);
    const intro = await read('js/brand-intro.js');
    assert.match(intro, /querySelector\('\[data-brand-lockup\]'\)/);
    assert.match(intro, /cloneNode\(true\)/);
    const css = await read('css/landing.css');
    assert.match(css, /\.footer-mark \{ --p: 1;/);
    assert.match(css, /\.brand-intro \.lockup-network \{ display: none; \}/);
});
