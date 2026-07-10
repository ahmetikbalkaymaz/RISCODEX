import test from "node:test";
import assert from "node:assert/strict";
import {
    STAGES,
    clamp01,
    damp,
    getActiveStageIndex,
    getSceneBudget
} from "../js/decision-network-core.mjs";

test("exposes the approved four-stage flow", () => {
    assert.deepEqual(STAGES.map(({ key }) => key), ["offer", "compare", "control", "policy"]);
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
    assert.deepEqual(getSceneBudget(1440), { pixelRatio: 1.5, secondaryPoints: 12, pointerParallax: 1 });
    assert.deepEqual(getSceneBudget(900), { pixelRatio: 1.5, secondaryPoints: 6, pointerParallax: 0.45 });
    assert.deepEqual(getSceneBudget(390), { pixelRatio: 1.25, secondaryPoints: 0, pointerParallax: 0 });
});

test("damp approaches the target without overshooting", () => {
    const value = damp(0, 10, 8, 1 / 60);
    assert.ok(value > 0 && value < 10);
    assert.equal(damp(4, 4, 8, 1 / 60), 4);
});
