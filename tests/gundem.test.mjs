import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { runInNewContext } from 'node:vm';
import { buildFeed, mergeFeed, toItem, isPublishable } from '../scripts/gundem-export.mjs';
const run = promisify(execFile);
const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const record = (overrides = {}) => ({
    d: '2026-10-21', addedAt: '2026-10-21T09:00:00+03:00', sec: 'gayrimenkul', tur: 'yatirim', abroad: false, stage: 'izin',
    title: 'Reysaş Tuzla’da depo inşaatına başlıyor', spot: 'Yapı ruhsatı alındı.', firm: 'Reysaş GYO',
    firms: [{ name: 'Reysaş GYO', ticker: 'RYGYO', slug: 'reysas-gyo' }], alias: 'reysas', place: 'İstanbul, Tuzla',
    body: ['Reysaş GYO yapı ruhsatı aldı.'], link: '', facts: [{ k: 'Tarih', v: '21.10.2026' }], rank: 0,
    src: 'Kamuyu Aydınlatma Platformu', srcType: 'Kamuyu Aydınlatma Platformu', url: 'https://example.com/kap',
    sources: [{ name: 'Foreks', url: 'https://example.com/a' }, { name: 'Borsanın Gündemi', url: 'https://example.com/b' }],
    ...overrides
});
test('the export keeps reader-facing fields, drops internal ones and neutralises unsafe links', () => {
    const item = toItem('reysas-tuzla', record({ url: 'javascript:alert(1)', sec: 'bilinmeyen', correction: ' Tutar düzeltildi. ', project: { slug: 'tuzla', name: 'Tuzla depo' } }));
    assert.equal(item.url, '');
    assert.equal(item.sec, '');
    assert.equal('rank' in item, false);
    assert.equal(item.correction, 'Tutar düzeltildi.');
    assert.deepEqual(item.project, { slug: 'tuzla', name: 'Tuzla depo' });
});
test('only stories with a date, sector, body and two sources are published', () => {
    assert.equal(isPublishable(toItem('ok', record())), true);
    assert.equal(isPublishable(toItem('one-source', record({ sources: [{ name: 'Tek', url: 'https://example.com' }] }))), false);
    assert.equal(isPublishable(toItem('no-body', record({ body: [] }))), false);
    assert.equal(isPublishable(toItem('Bad Id', record())), false);
});
test('the feed is sorted newest first and stays identical when the news has not changed', () => {
    const records = [
        { id: 'older', record: record({ d: '2026-10-01', addedAt: '2026-10-01T08:00:00+03:00' }) },
        { id: 'newer', record: record({ d: '2026-10-30', addedAt: '2026-10-30T19:40:00+03:00' }) },
        { id: 'same-day-earlier', record: record({ d: '2026-10-30', addedAt: '2026-10-30T08:40:00+03:00' }) }
    ];
    const feed = buildFeed(records);
    assert.deepEqual(feed.items.map((item) => item.id), ['newer', 'same-day-earlier', 'older']);
    assert.equal(feed.updatedAt, '2026-10-30T19:40:00+03:00');
    assert.deepEqual(buildFeed([...records].reverse()), feed);
});
test('the command line writes the feed and refuses to publish an empty one', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'gundem-'));
    const output = join(dir, 'out', 'haberler.json');
    await writeFile(join(dir, 'reysas-tuzla.json'), JSON.stringify(record()));
    await run('node', ['scripts/gundem-export.mjs', dir, output], { cwd: new URL('..', import.meta.url) });
    const written = JSON.parse(await readFile(output, 'utf8'));
    assert.equal(written.count, 1);
    assert.equal('skipped' in written, false);
    const empty = await mkdtemp(join(tmpdir(), 'gundem-empty-'));
    await assert.rejects(run('node', ['scripts/gundem-export.mjs', empty, output], { cwd: new URL('..', import.meta.url) }));
    assert.equal(JSON.parse(await readFile(output, 'utf8')).count, 1, 'a failed run leaves the last good feed in place');
});
test('the homepage menus link to Gündem in both languages', async () => {
    const home = await read('index.html');
    const sandbox = { window: {} };
    runInNewContext(await read('js/landing-translations.js'), sandbox);
    for (const lang of ['tr', 'en']) {
        assert.equal(typeof sandbox.window.__landingTranslations[lang].nav.gundem, 'string');
        assert.equal(JSON.parse(await read(`locales/landing-${lang}.json`)).nav.gundem, sandbox.window.__landingTranslations[lang].nav.gundem);
    }
    assert.equal((home.match(/class="nav-link" href="gundem\/"/g) || []).length, 2, 'desktop and mobile menus link to Gündem');
    assert.match(await read('gundem/index.html'), /<a class="logo-home" href="\.\.\/"/, 'the Gündem logo leads back to the company site');
});
test('the news views escape story text instead of injecting it as HTML', async () => {
    const source = await read('js/gundem.js');
    assert.match(source, /const esc = /);
    // Only lines that build HTML matter; search text, document.title and textContent take plain strings.
    const markup = source.split('\n').filter((line) => line.includes('<') && !/document\.title|textContent/.test(line)).join('\n');
    assert.doesNotMatch(markup, /\$\{(n|x|r|f|firm)\.(title|spot|src|srcType|link|correction|name|place|firm|url)\}/);
    assert.match(source, /rel="noopener"/);
    assert.match(source, /safeUrl\(n\.url\)/);
});
test('the homepage Gündem row shows the newest headlines as plain text and keeps a link without JS', async () => {
    const home = await read('index.html');
    const row = home.match(/<article[^>]*data-product="gundem"[\s\S]*?<\/article>/)?.[0];
    assert.ok(row, 'Gündem has its own product row');
    assert.ok(home.indexOf('data-product="versus"') < home.indexOf('data-product="gundem"'), 'Gündem follows Versus AI');
    assert.ok(home.indexOf('data-product="gundem"') < home.indexOf('LocateLoss'), 'LocateLoss stays last');
    assert.match(row, /<a class="gundem-fallback" href="gundem\/"/);
    assert.match(row, /<a class="button-secondary" href="gundem\/"/);
    assert.match(home, /<script defer src="js\/gundem-latest\.js\?v=\d+"><\/script>/);
    const sandbox = { window: {} };
    runInNewContext(await read('js/landing-translations.js'), sandbox);
    for (const lang of ['tr', 'en']) {
        const locale = sandbox.window.__landingTranslations[lang];
        assert.deepEqual(JSON.parse(JSON.stringify(locale.platform.gundem)), JSON.parse(await read(`locales/landing-${lang}.json`)).platform.gundem);
        for (const [, key] of row.matchAll(/data-i18n(?:-aria-label)?="(platform\.gundem\.[^"]+)"/g)) {
            assert.equal(typeof key.split('.').reduce((value, part) => value?.[part], locale), 'string', `${lang}: ${key}`);
        }
        assert.match(locale.platform.gundem.updated, /\{count\}[\s\S]*\{date\}/);
    }
    const source = await read('js/gundem-latest.js');
    assert.doesNotMatch(source, /innerHTML|insertAdjacentHTML/, 'headlines go in as text');
    assert.match(source, /encodeURIComponent\(n\.id\)/);
});
test('merging adds new stories, applies field corrections and refuses changes that break a story', () => {
    const { skipped, ...feed } = buildFeed([{ id: 'reysas-tuzla', record: record() }]);
    const merged = mergeFeed(feed, [
        { id: 'yeni-haber', record: record({ d: '2026-11-04', addedAt: '2026-11-04T09:20:00+03:00', title: 'Yeni haber' }) },
        { id: 'reysas-tuzla', record: { title: 'Reysaş Tuzla’da depo inşaatına başladı', correction: '04.11.2026: Başlık düzeltildi.' } },
        { id: 'tek-kaynak', record: record({ sources: [{ name: 'Tek', url: 'https://example.com' }] }) }
    ]);
    assert.deepEqual([merged.added, merged.updated, merged.skipped], [['yeni-haber'], ['reysas-tuzla'], ['tek-kaynak']]);
    assert.deepEqual(merged.feed.items.map((item) => item.id), ['yeni-haber', 'reysas-tuzla']);
    assert.equal(merged.feed.count, 2);
    assert.equal(merged.feed.updatedAt, '2026-11-04T09:20:00+03:00');
    const corrected = merged.feed.items[1];
    assert.equal(corrected.title, 'Reysaş Tuzla’da depo inşaatına başladı');
    assert.equal(corrected.correction, '04.11.2026: Başlık düzeltildi.');
    assert.equal(corrected.spot, 'Yapı ruhsatı alındı.', 'fields the correction does not name stay as they were');
    const broken = mergeFeed(merged.feed, [{ id: 'reysas-tuzla', record: { body: [] } }]);
    assert.deepEqual(broken.skipped, ['reysas-tuzla']);
    assert.equal(broken.feed.items[1].body.length, 1, 'a refused change leaves the published story alone');
});
test('the merge command updates the feed in place and leaves it alone when there is nothing new', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'gundem-merge-'));
    const feedFile = join(dir, 'haberler.json');
    const { skipped, ...feed } = buildFeed([{ id: 'reysas-tuzla', record: record() }]);
    await writeFile(feedFile, `${JSON.stringify(feed, null, 2)}\n`);
    const empty = await mkdtemp(join(tmpdir(), 'gundem-merge-empty-'));
    await run('node', ['scripts/gundem-export.mjs', '--merge', empty, feedFile], { cwd: new URL('..', import.meta.url) });
    assert.equal(await readFile(feedFile, 'utf8'), `${JSON.stringify(feed, null, 2)}\n`);
    const fresh = await mkdtemp(join(tmpdir(), 'gundem-merge-new-'));
    await writeFile(join(fresh, 'yeni-haber.json'), JSON.stringify(record({ d: '2026-11-04', title: 'Yeni haber' })));
    const { stdout } = await run('node', ['scripts/gundem-export.mjs', '--merge', fresh, feedFile], { cwd: new URL('..', import.meta.url) });
    assert.match(stdout, /2 news: 1 added, 0 updated/);
    assert.deepEqual(JSON.parse(await readFile(feedFile, 'utf8')).items.map((item) => item.id), ['yeni-haber', 'reysas-tuzla']);
});
