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
