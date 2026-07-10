# Riscodex Continuous Three.js Story Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the existing hero decision network into one performant Three.js scene that changes meaningfully across every landing-page section.

**Architecture:** Move the existing canvas into a viewport-fixed global story layer while keeping all content and labels in the DOM. Add dependency-free section-progress helpers to the core module, then drive one renderer through seven scene layouts using damped transforms, reusable geometries, dynamic connection buffers, satellites, and process gates.

**Tech Stack:** HTML5, CSS, vanilla ES modules, Three.js 0.184.0, Node.js built-in test runner, browser visual verification.

## Global Constraints

- Keep one renderer, one canvas, and one camera for the complete page.
- Keep all existing HTML copy, navigation, cards, forms, and TR/EN behavior.
- Use story sections in this exact order: hero, about, platform, problem, solutions, operating-model, access-request.
- Keep canvas `aria-hidden="true"`, non-focusable, and `pointer-events: none`.
- Cap pixel ratio at 1.5 desktop/tablet and 1.25 mobile.
- Cap secondary points at 24 desktop, 12 tablet, and 6 mobile.
- Disable camera travel, flow markers, pointer parallax, and breathing motion for reduced motion.
- Do not add post-processing, shadows, textures, models, physics, audio, or OrbitControls.
- Do not stage or commit unrelated user changes.

---

### Task 1: Section-story state core

**Files:**
- Modify: `js/decision-network-core.mjs`
- Modify: `tests/decision-network-core.test.mjs`

**Interfaces:**
- Produces: `STORY_SECTION_IDS`, `getStorySectionIndex(scrollY, viewportHeight, sectionOffsets)`, and `getSectionProgress(scrollY, viewportHeight, sectionTop, sectionHeight)`.

- [ ] **Step 1: Write failing tests**

Add tests that assert the exact seven-section order, probe the page at 55% viewport height, and clamp local section progress between 0 and 1.

```js
assert.deepEqual(STORY_SECTION_IDS, [
    "hero", "about", "platform", "problem", "solutions", "operating-model", "access-request"
]);
assert.equal(getStorySectionIndex(0, 800, [0, 900, 1800]), 0);
assert.equal(getStorySectionIndex(600, 800, [0, 900, 1800]), 1);
assert.equal(getSectionProgress(600, 800, 900, 900), 0.15555555555555556);
```

- [ ] **Step 2: Verify RED**

Run: `node --test tests/decision-network-core.test.mjs`

Expected: FAIL because the story exports do not exist.

- [ ] **Step 3: Implement pure helpers**

```js
export const STORY_SECTION_IDS = Object.freeze([
    "hero", "about", "platform", "problem", "solutions", "operating-model", "access-request"
]);

export function getStorySectionIndex(scrollY, viewportHeight, sectionOffsets) {
    const probe = scrollY + viewportHeight * 0.55;
    return sectionOffsets.reduce((active, offset, index) => probe >= offset ? index : active, 0);
}

export function getSectionProgress(scrollY, viewportHeight, sectionTop, sectionHeight) {
    return clamp01((scrollY + viewportHeight * 0.55 - sectionTop) / Math.max(1, sectionHeight));
}
```

- [ ] **Step 4: Verify GREEN**

Run: `node --test tests/decision-network-core.test.mjs`

Expected: all tests pass.

### Task 2: Global canvas and section contracts

**Files:**
- Modify: `index.html`
- Modify: `tests/decision-network-core.test.mjs`

**Interfaces:**
- Produces: `.decision-story-layer[data-decision-network]`, `#decision-network`, and `data-story-section` markers for all seven sections.

- [ ] **Step 1: Write a failing markup contract**

Assert one global story layer, one canvas, and all seven section markers:

```js
assert.match(html, /class="decision-story-layer" data-decision-network/);
assert.equal((html.match(/data-story-section=/g) || []).length, 7);
```

- [ ] **Step 2: Verify RED**

Run: `node --test tests/decision-network-core.test.mjs`

Expected: markup contract fails.

- [ ] **Step 3: Move the canvas into a fixed global layer**

Place the story layer after the existing fixed page-grid background:

```html
<div class="decision-story-layer" data-decision-network aria-hidden="true">
    <canvas id="decision-network" aria-hidden="true"></canvas>
</div>
```

Keep hero labels, status, atmosphere, and CSS fallback in `.brand-hero-visual`, but remove the duplicate canvas and `data-decision-network` from that hero overlay.

- [ ] **Step 4: Mark story sections**

Add exact markers:

```html
<section class="brand-hero ..." data-story-section="hero">
<section id="about" ... data-story-section="about">
<section id="platform" ... data-story-section="platform">
<section id="problem" ... data-story-section="problem">
<section id="solutions" ... data-story-section="solutions">
<section id="operating-model" ... data-story-section="operating-model">
<footer id="access-request" ... data-story-section="access-request">
```

- [ ] **Step 5: Add scoped global-layer styles**

Use `position: fixed; inset: 0; z-index: 1; pointer-events: none;` for the story layer. Keep content sections above it. Give selected section content containers restrained white atmosphere gradients so the 3D scene remains visible without reducing text contrast. Keep hero labels aligned to the right-side visual plane.

- [ ] **Step 6: Verify GREEN**

Run: `node --test tests/decision-network-core.test.mjs`

Expected: all tests pass.

### Task 3: Seven-state Three.js scene

**Files:**
- Modify: `js/decision-network.js`
- Modify: `tests/decision-network-core.test.mjs`

**Interfaces:**
- Consumes: story helpers and section marker contracts.
- Produces: `STORY_LAYOUTS`, dynamic main-node positions, product satellites, process gates, and section-aware camera targets.

- [ ] **Step 1: Write a failing scene contract**

Assert source contains `STORY_LAYOUTS`, `data-story-section`, `satelliteNodes`, `processGates`, `visibilitychange`, and dynamic connection attribute updates.

- [ ] **Step 2: Verify RED**

Run: `node --test tests/decision-network-core.test.mjs`

Expected: scene contract fails.

- [ ] **Step 3: Define seven scene layouts**

Each layout must define four node targets, camera position/look-at, connection emphasis, satellite opacity, gate opacity, and root rotation/scale. Use the approved visual meanings:

- hero: S-curve decision flow
- about: compact decision core
- platform: central modular system with satellites
- problem: separated nodes and weak/broken connections
- solutions: three aligned reconnecting paths
- operating-model: depth corridor with three gates
- access-request: converged central decision node

- [ ] **Step 4: Add reusable secondary geometry**

Create up to eight satellite nodes from shared geometry/materials and three torus-based process gates. Change visibility through damped scale and material opacity; do not add or remove meshes during scroll.

- [ ] **Step 5: Make connections follow moving nodes**

Reuse each connection’s buffer attribute. On each frame, update its cubic-curve control points from current node positions, write sampled curve points into the existing Float32Array, and set `needsUpdate = true`. Do not create vectors, arrays, geometries, or materials inside the frame loop.

- [ ] **Step 6: Drive the story from scroll state**

Cache section offsets on resize. On scroll, calculate active section and local progress with the pure helpers. Damp nodes, camera, root, satellites, gates, connections, and particle targets toward the selected layout. Keep hero’s four internal stage states while the hero is active.

- [ ] **Step 7: Add lifecycle and performance behavior**

Pause on `document.visibilitychange` when hidden and resume when visible. Apply 24/12/6 secondary-point budgets. For reduced motion, snap to stable section layouts and render only on section or resize changes.

- [ ] **Step 8: Verify GREEN**

Run: `node --test tests/decision-network-core.test.mjs`

Run: `node --check js/decision-network.js`

Expected: all tests and syntax checks pass.

### Task 4: Browser verification

**Files:**
- Modify only if evidence requires: `index.html`, `js/decision-network.js`, `js/decision-network-core.mjs`

- [ ] **Step 1: Verify desktop**

At 1280×720, verify every section produces its intended state, transitions do not jump, text stays readable, CTA controls remain clickable, and no horizontal overflow exists.

- [ ] **Step 2: Verify mobile**

At 390×844, verify the simplified camera path, maximum six secondary points, pixel ratio cap 1.25, and no content overlap or horizontal overflow.

- [ ] **Step 3: Verify language, reduced motion, and fallback contracts**

Switch TR/EN and verify hero labels/status. Confirm reduced-motion source and CSS contracts. Confirm default CSS fallback remains visible if the global canvas is not ready.

- [ ] **Step 4: Final verification**

Run: `node --test`

Run: `node --check js/decision-network.js`

Run: `git diff --check`

Expected: all commands exit 0 and browser console has no Three.js errors.
