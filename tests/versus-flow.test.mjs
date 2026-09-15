import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
const source = await readFile(new URL('../js/versus.js', import.meta.url), 'utf8');
function setup() {
    const element = (dataset = {}) => ({ dataset, attrs: {}, handlers: {}, hidden: false,
        addEventListener(event, handler) { this.handlers[event] = handler; },
        setAttribute(key, value) { this.attrs[key] = value; },
        focus() { this.focused = true; }
    });
    const buttons = Array.from({length: 3}, (_, i) => element({step: String(i)}));
    const panels = Array.from({length: 3}, () => element());
    const next = [element({next: '1'}), element({next: '2'})];
    const counter = {};
    const document = {
        querySelectorAll(selector) { return {'[data-step]':buttons, '.step-panel':panels, '[data-next]':next}[selector]; },
        getElementById() { return counter; }
    };
    runInNewContext(source, {document});
    return { buttons, panels, next, counter };
}
test('example advances from comparison to recommendation with one visible panel and focus', () => {
    const {buttons, panels, next, counter} = setup();
    next[0].handlers.click();
    assert.deepEqual(panels.map(p=>p.hidden),[true,false,true]);
    assert.equal(panels[1].focused,true);
    next[1].handlers.click();
    assert.deepEqual(panels.map(p=>p.hidden),[true,true,false]);
    assert.deepEqual(buttons.map(b=>b.attrs['aria-pressed']),['false','false','true']);
    assert.equal(counter.textContent,'03 / 03');
});
test('keyboard navigation wraps and supports Home and End', () => {
    const {buttons, panels} = setup();
    const key = (index, value) => {
        let prevented = false;
        buttons[index].handlers.keydown({key:value,preventDefault(){prevented=true;}});
        return prevented;
    };
    assert.equal(key(0,'ArrowLeft'),true);
    assert.equal(panels[2].hidden,false);
    assert.equal(buttons[2].focused,true);
    key(2,'Home');
    assert.equal(panels[0].hidden,false);
    key(0,'End');
    assert.equal(panels[2].hidden,false);
    assert.equal(key(2,'Tab'),false);
});
test('all Versus translations match their locale files and page bindings resolve', async () => {
    const sandbox={window:{}};
    runInNewContext(await readFile(new URL('../js/versus-translations.js',import.meta.url),'utf8'),sandbox);
    const html=await readFile(new URL('../versus/index.html',import.meta.url),'utf8');
    for(const lang of ['tr','en']) {
        const locale=JSON.parse(await readFile(new URL(`../locales/versus-${lang}.json`,import.meta.url),'utf8'));
        assert.deepEqual(JSON.parse(JSON.stringify(sandbox.window.__versusTranslations[lang])),locale);
        for(const [,key] of html.matchAll(/data-i18n(?:-aria-label|-html|-placeholder)?="([^"]+)"/g)) {
            assert.equal(typeof key.split('.').reduce((v,k)=>v?.[k],locale),'string',`${lang}: ${key}`);
        }
    }
    const ids=new Set([...html.matchAll(/id="([^"]+)"/g)].map(m=>m[1]));
    for(const [,id] of html.matchAll(/href="#([^"]+)"/g)) assert.ok(ids.has(id),id);
});
