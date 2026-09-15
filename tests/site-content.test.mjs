import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";

const rootUrl = new URL("../", import.meta.url);

async function read(relativePath) {
    return readFile(new URL(relativePath, rootUrl), "utf8");
}

test("Versus Tools replaces Versus Check with the approved calculator list", async () => {
    const html = await read("index.html");
    const translationSource = await read("js/landing-translations.js");
    const sandbox = { window: {} };

    runInNewContext(translationSource, sandbox);

    const translations = JSON.parse(JSON.stringify(sandbox.window.__landingTranslations));
    const expected = {
        tr: ["Ticari/Sınai poliçe primi hesaplama", "Yangın abonman hesaplama"],
        en: ["Commercial/industrial policy premium calculation", "Fire declaration policy calculation"]
    };

    assert.equal(translations.tr.platform.modules.title, "Versus Tools");
    assert.equal(translations.en.platform.modules.title, "Versus Tools");
    assert.deepEqual(Object.values(translations.tr.platform.modules.tools), expected.tr);
    assert.deepEqual(Object.values(translations.en.platform.modules.tools), expected.en);
    assert.equal((html.match(/data-i18n="platform\.modules\.tools\./g) || []).length, 2);
    assert.doesNotMatch(html, /data-i18n="platform\.modules\.cta"/);
    assert.doesNotMatch(html, /Versus Check/);
});

test("footer exposes the current company details without placeholder policy links", async () => {
    const html = await read("index.html");
    const versusHtml = await read("versus/index.html");
    const translationSource = await read("js/landing-translations.js");
    const sandbox = { window: {} };

    runInNewContext(translationSource, sandbox);

    const translations = JSON.parse(JSON.stringify(sandbox.window.__landingTranslations));

    assert.match(html, /mailto:info@riscodex\.com/);
    assert.match(html, />info@riscodex\.com</);
    assert.doesNotMatch(html, /contact@riscodex\.com/);
    assert.doesNotMatch(html, /data-i18n="footer\.(?:privacy|terms)"/);
    assert.match(versusHtml, /mailto:info@riscodex\.com/);
    assert.doesNotMatch(versusHtml, /contact@riscodex\.com/);
    assert.equal(translations.tr.footer.copyright, "&copy; 2026 RISCODEX Teknoloji A.Ş.");
    assert.equal(translations.en.footer.copyright, "&copy; 2026 RISCODEX Technology Inc.");
});

test("standalone locale files match the embedded landing translations", async () => {
    const tr = JSON.parse(await read("locales/landing-tr.json"));
    const en = JSON.parse(await read("locales/landing-en.json"));
    const legacyTr = JSON.parse(await read("locales/tr.json"));
    const legacyEn = JSON.parse(await read("locales/en.json"));

    assert.equal(tr.platform.modules.title, "Versus Tools");
    assert.equal(en.platform.modules.title, "Versus Tools");
    assert.deepEqual(Object.values(tr.platform.modules.tools), [
        "Ticari/Sınai poliçe primi hesaplama",
        "Yangın abonman hesaplama"
    ]);
    assert.deepEqual(Object.values(en.platform.modules.tools), [
        "Commercial/industrial policy premium calculation",
        "Fire declaration policy calculation"
    ]);
    assert.equal(tr.footer.copyright, "&copy; 2026 RISCODEX Teknoloji A.Ş.");
    assert.equal(en.footer.copyright, "&copy; 2026 RISCODEX Technology Inc.");
    assert.equal(legacyTr.footer.copyright, "&copy; 2026 RISCODEX Teknoloji A.Ş.");
    assert.equal(legacyEn.footer.copyright, "&copy; 2026 RISCODEX Technology Inc.");
});


test("company homepage has two products, embedded Tools, and only LocateLoss as upcoming", async () => {
    const html = await read("index.html");
    assert.equal((html.match(/data-product="/g) || []).length, 2);
    const versus = html.match(/<article[^>]*data-product="versus"[\s\S]*?<\/article>/)?.[0];
    assert.ok(versus, "Versus AI has a dedicated product section");
    assert.match(versus, /platform\.modules\.tools\.commercial/);
    assert.match(versus, /platform\.modules\.tools\.fire/);
    assert.match(html, /LocateLoss/);
    assert.doesNotMatch(html, /platform\.future|platform\.legend|id="problem"|id="operating-model"|<video/);
});

test("homepage navigation and hero actions reach real company sections", async () => {
    const html = await read("index.html");
    const ids = new Set([...html.matchAll(/id="([^"]+)"/g)].map((match) => match[1]));
    for (const [, target] of html.matchAll(/href="#([^"]+)"/g)) assert.ok(ids.has(target), target);
    const hero = html.match(/<section[^>]*data-story-section="hero"[\s\S]*?<\/section>/)?.[0];
    assert.ok(hero);
    assert.match(hero, /href="#platform"/);
    assert.match(hero, /href="#access-request"/);
    assert.doesNotMatch(hero, /href="https:\/\/tariffeq/);
});
