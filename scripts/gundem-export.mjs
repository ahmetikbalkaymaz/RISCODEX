// Turns the Riscodex Gündem artifact's "haberler" collection into the site's gundem/haberler.json.
// Usage: node scripts/gundem-export.mjs <dir of exported haberler/*.json> [output file]
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

export function buildFeed(records) {
    const items = records.map(({ id, record }) => toItem(id, record)).filter(isPublishable);
    items.sort((a, b) => b.d.localeCompare(a.d) || b.addedAt.localeCompare(a.addedAt) || a.id.localeCompare(b.id));
    const updatedAt = items.reduce((latest, item) => (item.addedAt > latest ? item.addedAt : latest), '');
    return { updatedAt, count: items.length, items, skipped: records.length - items.length };
}

async function main() {
    const [inputDir, output = 'gundem/haberler.json'] = process.argv.slice(2);
    if (!inputDir) throw new Error('Usage: node scripts/gundem-export.mjs <haberler dir> [output file]');
    const files = (await readdir(inputDir)).filter((name) => name.endsWith('.json')).sort();
    const records = await Promise.all(files.map(async (name) => ({ id: basename(name, '.json'), record: JSON.parse(await readFile(join(inputDir, name), 'utf8')) })));
    if (!records.length) throw new Error(`No news found in ${inputDir}; refusing to publish an empty feed.`);
    const { skipped, ...feed } = buildFeed(records);
    await mkdir(dirname(output), { recursive: true });
    await writeFile(output, `${JSON.stringify(feed, null, 2)}\n`);
    console.log(`Wrote ${feed.count} news to ${output}${skipped ? ` (${skipped} skipped: missing title, body, date or two sources)` : ''}.`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    main().catch((error) => { console.error(error.message); process.exit(1); });
}
