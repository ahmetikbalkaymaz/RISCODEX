import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
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

test("Versus AI page does not ship demo video media or playback controls", async () => {
    const versusHtml = await read("versus/index.html");
    const translationSource = await read("js/versus-translations.js");
    const tr = JSON.parse(await read("locales/versus-tr.json"));
    const en = JSON.parse(await read("locales/versus-en.json"));

    assert.doesNotMatch(versusHtml, /<video\b/i);
    assert.doesNotMatch(versusHtml, /versus-ai-demo\.(?:mp4|jpg)/);
    assert.doesNotMatch(versusHtml, /initializeDemoVideos|enableManualVideoMode/);
    assert.doesNotMatch(translationSource, /demo video|demo videosu|Videoyu oynat|Play video|video_aria/i);
    assert.equal(Object.hasOwn(tr.story.media, "manual_hint"), false);
    assert.equal(Object.hasOwn(tr.story.media, "video_aria"), false);
    assert.equal(Object.hasOwn(en.story.media, "manual_hint"), false);
    assert.equal(Object.hasOwn(en.story.media, "video_aria"), false);
    await assert.rejects(access(new URL("../assets/versus-ai-demo.mp4", import.meta.url)));
    await assert.rejects(access(new URL("../assets/versus-ai-demo-poster.jpg", import.meta.url)));
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
