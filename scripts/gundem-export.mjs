// Builds the site's gundem/haberler.json from Riscodex Gündem news records (one <id>.json per story).
// Usage: node scripts/gundem-export.mjs <dir of all stories> [output file]
//        node scripts/gundem-export.mjs --merge <dir of new or corrected stories> [feed file]
// The output only changes when the news changes, so a scheduled run commits nothing on a quiet day.
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SECTORS = ['enerji', 'madencilik', 'liman', 'altyapi', 'kimya', 'metal', 'imalat', 'gida', 'gayrimenkul', 'saglik', 'hizmet', 'sigorta', 'mevzuat'];
const TYPES = ['yatirim', 'devreye', 'kapasite', 'izin', 'ihale', 'satinalma', 'satis', 'kapanis', 'finansman', 'yapilanma', 'duzenleme'];
const STAGES = ['plan', 'izin', 'sozlesme', 'insaat', 'devreye', 'isletme', 'anlasma', 'onay', 'tamam'];

const text = (value) => (typeof value === 'string' ? value.trim() : '');
const safeUrl = (value) => (/^https?:\/\/[^\s]+$/i.test(text(value)) ? text(value) : '');
const oneOf = (value, allowed) => (allowed.includes(value) ? value : '');
const list = (value) => (Array.isArray(value) ? value : []);

export function toItem(id, record) {
    const item = {
        id,
        d: text(record.d),
        addedAt: text(record.addedAt),
        sec: oneOf(record.sec, SECTORS),
        tur: oneOf(record.tur, TYPES),
        abroad: record.abroad === true,
        stage: oneOf(record.stage, STAGES),
        title: text(record.title),
        spot: text(record.spot),
        firm: text(record.firm),
        firms: list(record.firms).map((firm) => ({ name: text(firm?.name), ticker: text(firm?.ticker), slug: text(firm?.slug) })).filter((firm) => firm.name),
        alias: text(record.alias),
        place: text(record.place),
        body: list(record.body).map(text).filter(Boolean),
        link: text(record.link),
        facts: list(record.facts).map((fact) => ({ k: text(fact?.k), v: text(fact?.v) })).filter((fact) => fact.k && fact.v),
        src: text(record.src),
        srcType: text(record.srcType),
        url: safeUrl(record.url),
        sources: list(record.sources).map((source) => ({ name: text(source?.name), url: safeUrl(source?.url) })).filter((source) => source.name && source.url)
    };
    if (text(record.correction)) item.correction = text(record.correction);
    if (text(record.project?.slug)) item.project = { slug: text(record.project.slug), name: text(record.project.name) };
    return item;
}

// A record reaches the site only with the parts a reader needs to trust it.
export function isPublishable(item) {
    return /^[a-z0-9-]+$/.test(item.id) && /^\d{4}-\d{2}-\d{2}$/.test(item.d) && item.sec && item.title && item.body.length > 0 && item.sources.length >= 2;
}

function feedOf(items) {
    items.sort((a, b) => b.d.localeCompare(a.d) || b.addedAt.localeCompare(a.addedAt) || a.id.localeCompare(b.id));
    const updatedAt = items.reduce((latest, item) => (item.addedAt > latest ? item.addedAt : latest), '');
    return { updatedAt, count: items.length, items };
}

export function buildFeed(records) {
    const items = records.map(({ id, record }) => toItem(id, record)).filter(isPublishable);
    return { ...feedOf(items), skipped: records.length - items.length };
}

// Adds new stories to a published feed and applies corrections. A record for a story already in the
// feed may hold only the fields that changed. A change that would leave a story unpublishable is
// refused, so the story stays as it was.
export function mergeFeed(feed, records) {
    const byId = new Map(feed.items.map((item) => [item.id, item]));
    const result = { added: [], updated: [], skipped: [] };
    for (const { id, record } of records) {
        const current = byId.get(id);
        const item = toItem(id, { ...current, ...record });
        if (!isPublishable(item)) { result.skipped.push(id); continue; }
        byId.set(id, item);
        result[current ? 'updated' : 'added'].push(id);
    }
    return { feed: feedOf([...byId.values()]), ...result };
}

async function readRecords(dir) {
    const files = (await readdir(dir)).filter((name) => name.endsWith('.json')).sort();
    return Promise.all(files.map(async (name) => ({ id: basename(name, '.json'), record: JSON.parse(await readFile(join(dir, name), 'utf8')) })));
}

async function writeFeed(output, feed) {
    await mkdir(dirname(output), { recursive: true });
    await writeFile(output, `${JSON.stringify(feed, null, 2)}\n`);
}

async function main() {
    const args = process.argv.slice(2);
    if (args[0] === '--merge') {
        const [, inputDir, output = 'gundem/haberler.json'] = args;
        if (!inputDir) throw new Error('Usage: node scripts/gundem-export.mjs --merge <dir of new or corrected stories> [feed file]');
        const records = await readRecords(inputDir);
        if (!records.length) { console.log(`No stories in ${inputDir}; ${output} is unchanged.`); return; }
        const { feed, added, updated, skipped } = mergeFeed(JSON.parse(await readFile(output, 'utf8')), records);
        await writeFeed(output, feed);
        console.log(`${output} now holds ${feed.count} news: ${added.length} added, ${updated.length} updated${skipped.length ? `, ${skipped.length} skipped (missing title, body, date or two sources): ${skipped.join(', ')}` : ''}.`);
        return;
    }
    const [inputDir, output = 'gundem/haberler.json'] = args;
    if (!inputDir) throw new Error('Usage: node scripts/gundem-export.mjs <haberler dir> [output file]');
    const records = await readRecords(inputDir);
    if (!records.length) throw new Error(`No news found in ${inputDir}; refusing to publish an empty feed.`);
    const { skipped, ...feed } = buildFeed(records);
    await writeFeed(output, feed);
    console.log(`Wrote ${feed.count} news to ${output}${skipped ? ` (${skipped} skipped: missing title, body, date or two sources)` : ''}.`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    main().catch((error) => { console.error(error.message); process.exit(1); });
}
