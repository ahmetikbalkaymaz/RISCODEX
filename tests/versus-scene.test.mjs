import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
const source = await readFile(new URL('../js/versus-scene.js', import.meta.url), 'utf8');
function setup({ reduced = false, contentHeight = 600 } = {}) {
    const element = (dataset = {}) => {
        const classes = new Set();
        return { dataset, attrs: {},
            classList: {
                add(name) { classes.add(name); },
                toggle(name, force) { if (force ?? !classes.has(name)) classes.add(name); else classes.delete(name); },
                remove(...names) { names.forEach((name) => classes.delete(name)); },
                contains(name) { return classes.has(name); }
            },
            setAttribute(key, value) { this.attrs[key] = value; },
            removeAttribute(key) { delete this.attrs[key]; }
        };
    };
    const rows = Array.from({length: 5}, (_, i) => element({row: String(i + 1)}));
    const phases = Array.from({length: 3}, (_, i) => element({phase: String(i)}));
    const verdict = element();
    const sticky = { clientHeight: 1000, firstElementChild: { offsetHeight: contentHeight } };
    const scene = Object.assign(element(), {
        top: 0, height: 4200, props: {},
        style: { setProperty(key, value) { scene.props[key] = value; }, removeProperty(key) { delete scene.props[key]; } },
        getBoundingClientRect() { return { top: this.top, height: this.height }; },
        querySelectorAll(selector) { return {'[data-row]': rows, '[data-phase]': phases}[selector]; },
        querySelector(selector) { return {'[data-verdict]': verdict, '.compare-sticky': sticky}[selector]; }
    });
    const handlers = {};
    const window = { innerHeight: 1000, innerWidth: 1280,
        addEventListener(event, handler) { handlers[event] = handler; },
        matchMedia() { return { matches: reduced, addEventListener() {} }; },
        getComputedStyle() { return { paddingTop: '92px', paddingBottom: '28px' }; }
    };
    const document = { querySelector() { return scene; }, addEventListener() {} };
    runInNewContext(source, { window, document, requestAnimationFrame(callback) { callback(); return 0; } });
    const scrollTo = (top) => { scene.top = -top; handlers.scroll(); };
    return { scene, rows, phases, verdict, scrollTo };
}
const revealed = (rows) => rows.map((row) => row.classList.contains('is-revealed'));
test('scrolling walks from reading through each row to the verdict', () => {
    const {scene, rows, phases, verdict, scrollTo} = setup();
    assert.equal(scene.classList.contains('is-scrubbing'), true);
    assert.equal(scene.dataset.stage, '0');
    assert.deepEqual(revealed(rows), [false, false, false, false, false]);
    assert.equal(phases[0].attrs['aria-current'], 'step');
    scrollTo(3200 * 3 / 7 + 1);
    assert.equal(scene.dataset.stage, '3');
    assert.deepEqual(revealed(rows), [true, true, true, false, false]);
    assert.deepEqual(rows.map((row) => row.classList.contains('is-current')), [false, false, true, false, false]);
    assert.equal(phases[1].classList.contains('is-active'), true);
    assert.equal(verdict.classList.contains('is-revealed'), false);
    scrollTo(5000);
    assert.equal(scene.dataset.stage, '6');
    assert.equal(scene.props['--scene-progress'], '1.000');
    assert.deepEqual(revealed(rows), [true, true, true, true, true]);
    assert.equal(verdict.classList.contains('is-revealed'), true);
    assert.equal(phases[2].attrs['aria-current'], 'step');
    assert.equal(phases[1].attrs['aria-current'], undefined);
});
test('reduced motion and a comparison taller than the screen stay static', () => {
    for (const options of [{reduced: true}, {contentHeight: 900}]) {
        const {scene, rows, phases, scrollTo} = setup(options);
        scrollTo(2000);
        assert.equal(scene.classList.contains('is-scrubbing'), false);
        assert.equal(scene.dataset.stage, undefined);
        assert.deepEqual(revealed(rows), [false, false, false, false, false]);
        assert.equal(phases.some((phase) => phase.classList.contains('is-active')), false);
    }
});
