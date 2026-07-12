import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import {
    STAGES,
    STORY_SECTION_IDS,
    clamp01,
    damp,
    getActiveStageIndex,
    getSectionProgress,
    getStorySectionIndex,
    getSceneBudget
} from "../js/decision-network-core.mjs";

test("exposes the approved four-stage flow", () => {
    assert.deepEqual(STAGES.map(({ key }) => key), ["offer", "compare", "control", "policy"]);
});

test("keeps every primary node inside the desktop hero framing budget", () => {
    const horizontalExtent = Math.max(...STAGES.map(({ position }) => Math.abs(position[0])));

    assert.ok(horizontalExtent <= 2.75);
});

test("exposes the approved seven-section story order", () => {
    assert.deepEqual(STORY_SECTION_IDS, [
        "hero",
        "about",
        "platform",
        "problem",
        "solutions",
        "operating-model",
        "access-request"
    ]);
});

test("selects the active story section from a viewport probe", () => {
    const offsets = [0, 900, 1800];

    assert.equal(getStorySectionIndex(0, 800, offsets), 0);
    assert.equal(getStorySectionIndex(600, 800, offsets), 1);
    assert.equal(getStorySectionIndex(1500, 800, offsets), 2);
});

test("normalizes and clamps local section progress", () => {
    assert.equal(getSectionProgress(0, 800, 900, 900), 0);
    assert.equal(getSectionProgress(600, 800, 900, 900), 140 / 900);
    assert.equal(getSectionProgress(2000, 800, 900, 900), 1);
});

test("clamps scroll progress into the scene range", () => {
    assert.equal(clamp01(-0.2), 0);
    assert.equal(clamp01(0.4), 0.4);
    assert.equal(clamp01(1.3), 1);
    assert.equal(clamp01(Number.NaN), 0);
});

test("maps normalized progress to four stable stages", () => {
    assert.equal(getActiveStageIndex(0), 0);
    assert.equal(getActiveStageIndex(0.249), 0);
    assert.equal(getActiveStageIndex(0.25), 1);
    assert.equal(getActiveStageIndex(0.5), 2);
    assert.equal(getActiveStageIndex(0.75), 3);
    assert.equal(getActiveStageIndex(1), 3);
});

test("returns the exact responsive render budgets", () => {
    assert.deepEqual(getSceneBudget(1440), { pixelRatio: 1.5, secondaryPoints: 24, pointerParallax: 1 });
    assert.deepEqual(getSceneBudget(900), { pixelRatio: 1.5, secondaryPoints: 12, pointerParallax: 0.45 });
    assert.deepEqual(getSceneBudget(390), { pixelRatio: 1.25, secondaryPoints: 6, pointerParallax: 0 });
});

test("damp approaches the target without overshooting", () => {
    const value = damp(0, 10, 8, 1 / 60);
    assert.ok(value > 0 && value < 10);
    assert.equal(damp(4, 4, 8, 1 / 60), 4);
});

test("hero exposes the decision-network canvas and accessible fallback", async () => {
    const html = await readFile(new URL("../index.html", import.meta.url), "utf8");

    assert.match(html, /id="decision-network"[^>]*aria-hidden="true"/);
    assert.match(html, /id="decision-network-fallback"/);
    assert.equal((html.match(/class="decision-network-label(?: is-active)?"/g) || []).length, 4);
    assert.doesNotMatch(html, /decision-network-status|data-network-status/);
    assert.match(html, /src="js\/landing-translations\.js\?v=20260710"/);
    assert.match(html, /type="module" src="js\/decision-network\.js\?v=20260710-3"/);
    assert.match(html, /three@0\.184\.0/);
});

test("page exposes one global story canvas and seven marked sections", async () => {
    const html = await readFile(new URL("../index.html", import.meta.url), "utf8");

    assert.equal((html.match(/class="decision-story-layer" data-decision-network/g) || []).length, 1);
    assert.equal((html.match(/id="decision-network"/g) || []).length, 1);
    assert.equal((html.match(/data-story-section="(?:hero|about|platform|problem|solutions|operating-model|access-request)"/g) || []).length, 7);
});

test("global story layering preserves the hero visual absolute positioning", async () => {
    const html = await readFile(new URL("../index.html", import.meta.url), "utf8");

    assert.doesNotMatch(html, /\.brand-hero-content,\s*\.brand-hero-visual\s*{\s*position:\s*relative/);
    assert.doesNotMatch(html, /\.brand-hero-visual::before\s*{[\s\S]*?rgba\(255, 255, 255, 0\.96\)[\s\S]*?}/);
});

test("reduced-motion CSS removes decision-network transitions", async () => {
    const html = await readFile(new URL("../index.html", import.meta.url), "utf8");

    assert.match(
        html,
        /@media \(prefers-reduced-motion: reduce\)[\s\S]*?#decision-network,[\s\S]*?\.decision-network-fallback[\s\S]*?transition: none !important;/
    );
});

test("scene module includes the required lifecycle safeguards", async () => {
    const moduleSource = await readFile(new URL("../js/decision-network.js", import.meta.url), "utf8");

    assert.match(moduleSource, /webglcontextlost/);
    assert.match(moduleSource, /prefers-reduced-motion/);
    assert.match(moduleSource, /IntersectionObserver/);
    assert.match(moduleSource, /ResizeObserver/);
    assert.doesNotMatch(moduleSource, /status_prefix|data-network-status/);
    assert.match(moduleSource, /cancelAnimationFrame/);
    assert.match(moduleSource, /dispose\(\)/);
});

test("scene module implements the continuous seven-state story", async () => {
    const moduleSource = await readFile(new URL("../js/decision-network.js", import.meta.url), "utf8");

    assert.match(moduleSource, /STORY_LAYOUTS/);
    assert.match(moduleSource, /data-story-section/);
    assert.match(moduleSource, /satelliteNodes/);
    assert.match(moduleSource, /processGates/);
    assert.match(moduleSource, /visibilitychange/);
    assert.match(moduleSource, /positionAttribute\.needsUpdate = true/);
    assert.match(moduleSource, /renderer\.setClearColor\(0xf6f8fb, 0\)/);
    assert.match(moduleSource, /dataset\.activeStory/);
    assert.doesNotMatch(moduleSource, /body\.dataset\.storySection/);
});

test("decision-network copy is available in both landing-page languages", async () => {
    const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
    const translationSource = await readFile(new URL("../js/landing-translations.js", import.meta.url), "utf8");
    const sandbox = { window: {} };

    runInNewContext(translationSource, sandbox);

    const translations = JSON.parse(JSON.stringify(sandbox.window.__landingTranslations));
    assert.deepEqual(translations.tr.hero.decision_network.stages, {
        offer: "Teklif",
        compare: "Karşılaştırma",
        control: "Kontrol",
        policy: "Poliçe"
    });
    assert.deepEqual(translations.en.hero.decision_network.stages, {
        offer: "Offer",
        compare: "Comparison",
        control: "Control",
        policy: "Policy"
    });
    assert.equal((html.match(/data-i18n="hero\.decision_network\.stages\./g) || []).length, 8);
    assert.match(html, /data-i18n-aria-label="hero\.decision_network\.aria"/);
});
