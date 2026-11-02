import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const umami = /<script defer src="https:\/\/cloud\.umami\.is\/script\.js" data-website-id="8fc436bc-f10e-4d40-af4f-ce2382d3a72d" data-domains="riscodex\.com,www\.riscodex\.com"( data-auto-track="false")?><\/script>/;

test('every page loads Umami once, counting only the live domain', async () => {
    for (const page of ['index.html', 'versus/index.html', 'gundem/index.html']) {
        const html = await read(page);
        assert.match(html, umami, page);
        assert.equal(html.match(/cloud\.umami\.is/g).length, 1, page);
    }
});
test('Gündem reports its own views, so Umami loads first with automatic counting off', async () => {
    const html = await read('gundem/index.html');
    assert.equal(html.match(umami)[1], ' data-auto-track="false"');
    assert.ok(html.indexOf('cloud.umami.is') < html.indexOf('gundem.js'), 'Umami runs before gundem.js');
    const source = await read('js/gundem.js');
    assert.match(source, /\/gundem\/haber\//);
    assert.match(source, /trackView\(r\)/);
});
