export const STAGES = Object.freeze([
    { key: "offer", label: "Teklif", position: [-3.6, 0.8, 0.25] },
    { key: "compare", label: "Karşılaştırma", position: [-1.15, -0.35, 0.8] },
    { key: "control", label: "Kontrol", position: [1.3, 0.55, -0.15] },
    { key: "policy", label: "Poliçe", position: [3.65, -0.45, 0.55] }
]);

export function clamp01(value) {
    return Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
}

export function getActiveStageIndex(progress) {
    return Math.min(STAGES.length - 1, Math.floor(clamp01(progress) * STAGES.length));
}

export function getSceneBudget(width) {
    if (width < 768) {
        return { pixelRatio: 1.25, secondaryPoints: 0, pointerParallax: 0 };
    }

    if (width < 1024) {
        return { pixelRatio: 1.5, secondaryPoints: 6, pointerParallax: 0.45 };
    }

    return { pixelRatio: 1.5, secondaryPoints: 12, pointerParallax: 1 };
}

export function damp(current, target, lambda, deltaSeconds) {
    return current + (target - current) * (1 - Math.exp(-lambda * deltaSeconds));
}
