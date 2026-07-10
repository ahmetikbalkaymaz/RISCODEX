# Riscodex Three.js Decision Network Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the static hero workspace with a performant, accessible Three.js network that explains the Teklif → Karşılaştırma → Kontrol → Poliçe decision flow.

**Architecture:** Keep the existing static landing-page architecture. Put deterministic scroll/state math in a dependency-free ES module, keep Three.js rendering and lifecycle in a separate browser module, and let `index.html` own semantic labels, fallback markup, and responsive styling. Load Three.js r184 through the CDN import-map pattern documented by the official Three.js installation guide.

**Tech Stack:** HTML5, CSS, vanilla ES modules, Three.js 0.184.0, Node.js built-in test runner, browser visual verification.

## Global Constraints

- Preserve the existing white, charcoal, navy, and Riscodex blue visual language.
- Keep the existing hero headline, description, CTAs, language switching, navigation, metrics, and reveal behavior intact.
- Do not add OrbitControls, post-processing, shadow maps, physics, audio, textures, or 3D model assets.
- Use exactly four primary stages: `Teklif`, `Karşılaştırma`, `Kontrol`, `Poliçe`.
- Cap renderer pixel ratio at `1.5` on desktop and `1.25` below `768px`.
- Use no more than 12 secondary points on desktop, 6 on tablet, and 0 on mobile.
- Pause `requestAnimationFrame` while the hero is outside the viewport.
- Respect `prefers-reduced-motion: reduce` by disabling camera travel, data flow, and pointer parallax.
- Fall back to semantic CSS markup when WebGL is unavailable, Three.js fails to load, or the WebGL context is lost.
- Keep the canvas non-focusable, `aria-hidden="true"`, and unable to intercept pointer input.
- Pin all Three.js imports to `0.184.0`; do not use `latest`.
- Do not stage or commit the user’s unrelated existing changes.

---

## File Map

- Create `js/decision-network-core.mjs`: pure stage-selection, clamping, responsive-budget, and interpolation helpers.
- Create `js/decision-network.js`: Three.js scene creation, DOM binding, scroll/pointer input, observers, fallback handling, and teardown.
- Create `tests/decision-network-core.test.mjs`: deterministic Node tests for all pure decision-network state rules.
- Modify `index.html`: import map, module script, hero scene/fallback markup, and component styles.

### Task 1: Decision-network state core

**Files:**
- Create: `js/decision-network-core.mjs`
- Create: `tests/decision-network-core.test.mjs`

**Interfaces:**
- Consumes: viewport width, reduced-motion flag, normalized hero progress, interpolation values.
- Produces: `STAGES`, `clamp01(value)`, `getActiveStageIndex(progress)`, `getSceneBudget(width)`, and `damp(current, target, lambda, deltaSeconds)`.

- [ ] **Step 1: Write the failing core tests**

Create `tests/decision-network-core.test.mjs`:

```js
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
```

- [ ] **Step 2: Run the tests and verify they fail**

Run: `node --test tests/decision-network-core.test.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `js/decision-network-core.mjs`.

- [ ] **Step 3: Implement the minimal pure state module**

Create `js/decision-network-core.mjs`:

```js
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
    return Math.min(3, Math.floor(clamp01(progress) * 4));
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
```

- [ ] **Step 4: Run the core tests and verify they pass**

Run: `node --test tests/decision-network-core.test.mjs`

Expected: 5 tests, 5 pass, 0 fail.

- [ ] **Step 5: Commit the state core**

```bash
git add js/decision-network-core.mjs tests/decision-network-core.test.mjs
git commit -m "test: define decision network state rules"
```

### Task 2: Semantic hero shell and static fallback

**Files:**
- Modify: `index.html` in the `<head>` styles/import-map area and the `.brand-hero-visual` markup.
- Test: `tests/decision-network-core.test.mjs`

**Interfaces:**
- Consumes: existing `.brand-hero`, `.brand-hero-visual`, and hero content layers.
- Produces: `#decision-network`, `#decision-network-fallback`, `.decision-network-label[data-stage]`, and `.decision-network-status` contracts used by Task 3.

- [ ] **Step 1: Add a failing markup-contract test**

Append to `tests/decision-network-core.test.mjs`:

```js
import { readFile } from "node:fs/promises";

test("hero exposes the decision-network canvas and accessible fallback", async () => {
    const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
    assert.match(html, /id="decision-network"[^>]*aria-hidden="true"/);
    assert.match(html, /id="decision-network-fallback"/);
    assert.equal((html.match(/class="decision-network-label"/g) || []).length, 4);
    assert.match(html, /type="module" src="js\/decision-network\.js"/);
    assert.match(html, /three@0\.184\.0/);
});
```

- [ ] **Step 2: Run the contract test and verify it fails**

Run: `node --test tests/decision-network-core.test.mjs`

Expected: the existing five core tests pass and the markup-contract test fails because `#decision-network` is absent.

- [ ] **Step 3: Add the pinned import map and module entrypoint**

Add inside `<head>` after the existing scripts:

```html
<script type="importmap">
{
    "imports": {
        "three": "https://cdn.jsdelivr.net/npm/three@0.184.0/build/three.module.js"
    }
}
</script>
<script type="module" src="js/decision-network.js"></script>
```

- [ ] **Step 4: Replace only the existing static workspace wrapper**

Replace the contents of `.brand-hero-visual` with this semantic shell while leaving the surrounding hero copy unchanged:

```html
<div class="decision-network-shell" data-decision-network>
    <canvas id="decision-network" aria-hidden="true"></canvas>
    <div class="decision-network-atmosphere" aria-hidden="true"></div>
    <div class="decision-network-labels" aria-live="off">
        <div class="decision-network-label is-active" data-stage="0"><span>01</span><strong>Teklif</strong></div>
        <div class="decision-network-label" data-stage="1"><span>02</span><strong>Karşılaştırma</strong></div>
        <div class="decision-network-label" data-stage="2"><span>03</span><strong>Kontrol</strong></div>
        <div class="decision-network-label" data-stage="3"><span>04</span><strong>Poliçe</strong></div>
    </div>
    <div class="decision-network-status" aria-live="polite">
        <span class="decision-network-status-dot"></span>
        <span data-network-status>Karar akışı: Teklif</span>
    </div>
    <div id="decision-network-fallback" class="decision-network-fallback" role="img"
        aria-label="Teklif, karşılaştırma, kontrol ve poliçe aşamalarından oluşan Riscodex karar akışı">
        <span data-fallback-stage="0">Teklif</span><i></i>
        <span data-fallback-stage="1">Karşılaştırma</span><i></i>
        <span data-fallback-stage="2">Kontrol</span><i></i>
        <span data-fallback-stage="3">Poliçe</span>
    </div>
</div>
```

- [ ] **Step 5: Add scoped component CSS**

Add rules that:

```css
.decision-network-shell { position: absolute; inset: 7.25rem 0 3.5rem; overflow: hidden; }
#decision-network { width: 100%; height: 100%; display: block; pointer-events: none; opacity: 0; transition: opacity .5s ease; }
.decision-network-shell.is-ready #decision-network { opacity: 1; }
.decision-network-shell.is-ready .decision-network-fallback { opacity: 0; visibility: hidden; }
.decision-network-atmosphere { position: absolute; inset: 0; pointer-events: none; background: linear-gradient(90deg,#f6f8fb 0%,rgba(246,248,251,.78) 14%,transparent 48%); }
.decision-network-labels { position: absolute; inset: 0; pointer-events: none; }
.decision-network-label { position: absolute; display: grid; gap: .2rem; color: #526174; opacity: .4; transition: opacity .35s ease, transform .35s ease, color .35s ease; }
.decision-network-label.is-active { color: #08111f; opacity: 1; transform: translateY(-4px); }
.decision-network-label span { font-size: .65rem; font-weight: 700; color: #2563eb; }
.decision-network-label strong { font-size: .8rem; }
.decision-network-status { position: absolute; top: 1rem; right: clamp(1rem,4vw,4rem); display: flex; gap: .55rem; align-items: center; padding: .65rem .85rem; border: 1px solid rgba(15,23,42,.1); background: rgba(255,255,255,.82); backdrop-filter: blur(14px); font-size: .72rem; font-weight: 650; color: #334155; }
.decision-network-status-dot { width: .45rem; height: .45rem; border-radius: 999px; background: #16805c; box-shadow: 0 0 0 5px rgba(22,128,92,.08); }
.decision-network-fallback { position: absolute; inset: 20% 7% 14%; display: flex; align-items: center; justify-content: center; transition: opacity .35s ease; }
.decision-network-fallback span { display: grid; place-items: center; width: 5.5rem; aspect-ratio: 1; border: 1px solid rgba(37,99,235,.22); border-radius: 50%; background: rgba(255,255,255,.9); color: #0f172a; font-size: .68rem; font-weight: 700; box-shadow: 0 16px 36px rgba(15,23,42,.08); }
.decision-network-fallback i { width: clamp(1rem,3vw,3.5rem); height: 1px; background: rgba(37,99,235,.3); }
```

Position desktop labels near the projected S-curve (`12%/31%/57%/78%` horizontally with alternating vertical offsets). Below `1024px`, place the shell in the existing lower hero visual area and hide all but the active label. Below `768px`, reduce fallback circles to `4rem` and hide the status chip if it competes with the headline. In `prefers-reduced-motion`, remove CSS transitions.

- [ ] **Step 6: Run the contract and regression tests**

Run: `node --test tests/decision-network-core.test.mjs`

Expected: 6 tests, 6 pass, 0 fail.

- [ ] **Step 7: Commit the semantic shell**

```bash
git add index.html tests/decision-network-core.test.mjs
git commit -m "feat: add decision network hero shell"
```

### Task 3: Three.js scene and lifecycle

**Files:**
- Create: `js/decision-network.js`
- Modify: `tests/decision-network-core.test.mjs`

**Interfaces:**
- Consumes: core exports from `./decision-network-core.mjs` and Task 2 DOM contracts.
- Produces: an auto-starting decision network with internal `start()`, `pause()`, `resize()`, `render()`, `activateFallback()`, and `destroy()` lifecycle functions.

- [ ] **Step 1: Extend the markup contract for lifecycle safeguards**

Append a separate lifecycle-contract test that reads `js/decision-network.js` directly:

```js
test("scene module includes the required lifecycle safeguards", async () => {
    const moduleSource = await readFile(new URL("../js/decision-network.js", import.meta.url), "utf8");
    assert.match(moduleSource, /webglcontextlost/);
    assert.match(moduleSource, /prefers-reduced-motion/);
    assert.match(moduleSource, /IntersectionObserver/);
    assert.match(moduleSource, /ResizeObserver/);
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `node --test tests/decision-network-core.test.mjs`

Expected: FAIL with `ENOENT` for `js/decision-network.js`.

- [ ] **Step 3: Build the renderer and scene graph**

Create `js/decision-network.js` with:

```js
import * as THREE from "three";
import { STAGES, clamp01, damp, getActiveStageIndex, getSceneBudget } from "./decision-network-core.mjs";

const shell = document.querySelector("[data-decision-network]");
const canvas = document.getElementById("decision-network");
const fallback = document.getElementById("decision-network-fallback");
const labels = Array.from(document.querySelectorAll(".decision-network-label"));
const status = document.querySelector("[data-network-status]");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if (shell && canvas && fallback) {
    try {
        initializeDecisionNetwork();
    } catch (error) {
        activateFallback();
    }
}
```

Inside `initializeDecisionNetwork()`:

- Create a transparent `THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "high-performance" })`.
- Create one `PerspectiveCamera(34, aspect, 0.1, 100)` at `[0, 0.4, 11.5]`.
- Add ambient light `0xffffff` at `2.2` and directional blue light `0x5b8cff` at `3.0`.
- Share one `IcosahedronGeometry(0.42, 2)` across four node groups.
- Give each node a solid core, a wireframe shell, and a transparent halo mesh.
- Build three cubic Bézier curves between consecutive stage positions and render them as low-opacity `THREE.Line` objects.
- Put three small shared-geometry marker meshes on each connection; animate only the active connection.
- Generate deterministic secondary points from a fixed numeric coordinate table rather than `Math.random()`.
- Keep references in `nodeGroups`, `halos`, `connections`, `flowMarkers`, and `secondaryPointCloud` arrays/objects so no scene traversal is needed per frame.

- [ ] **Step 4: Implement scroll, pointer, label, and render state**

Use the hero bounding rectangle to compute progress:

```js
function getHeroProgress() {
    const rect = shell.closest(".brand-hero").getBoundingClientRect();
    const travel = Math.max(1, rect.height + window.innerHeight);
    return clamp01((window.innerHeight - rect.top) / travel);
}
```

On scroll, update only `targetProgress` and `targetStageIndex`. In the render loop:

- Damp camera x/y toward the active stage focus while retaining the full network in frame.
- Damp node scale toward `1.18` for active and `1` for inactive.
- Damp halo opacity toward `0.28` for active and `0.05` for inactive.
- Move active-connection markers with `(elapsed * 0.16 + markerOffset) % 1`.
- Apply pointer parallax only when `pointerParallax > 0` and reduced motion is false.
- Update DOM labels only when the active stage index changes.
- Render no faster than the animation loop and create no geometry/materials inside `render()`.

Use the existing Turkish stage labels for status text: `Karar akışı: ${STAGES[index].label}`.

- [ ] **Step 5: Implement responsive budgets and lifecycle safety**

Implement:

- `ResizeObserver` on `shell`, setting renderer size and camera aspect only for non-zero dimensions.
- `IntersectionObserver` on the hero, calling `start()` when intersecting and `pause()` when not.
- `webglcontextlost` handler that calls `event.preventDefault()`, `destroy()`, and `activateFallback()`.
- `activateFallback()` that removes `.is-ready`, adds `.is-fallback`, and leaves semantic fallback visible.
- `destroy()` that cancels RAF, disconnects observers, removes listeners, and disposes all unique geometries/materials plus the renderer.
- A reduced-motion branch that fixes progress to the first active stage, disables markers and pointer input, and renders only when resize/state changes.
- `getSceneBudget(window.innerWidth)` on initialization and resize; cap device pixel ratio with `Math.min(window.devicePixelRatio || 1, budget.pixelRatio)`.

After the first successful render, add `.is-ready` to `shell`.

- [ ] **Step 6: Run automated tests**

Run: `node --test tests/decision-network-core.test.mjs`

Expected: all tests pass with 0 failures.

Run: `git diff --check`

Expected: no whitespace errors.

- [ ] **Step 7: Commit the Three.js scene**

```bash
git add js/decision-network.js tests/decision-network-core.test.mjs
git commit -m "feat: render interactive Three.js decision flow"
```

### Task 4: Browser verification and visual refinement

**Files:**
- Modify if required by verification: `index.html`, `js/decision-network.js`, `js/decision-network-core.mjs`
- Test: `tests/decision-network-core.test.mjs`

**Interfaces:**
- Consumes: completed feature from Tasks 1–3.
- Produces: verified desktop/mobile/reduced-motion/fallback behavior without console errors.

- [ ] **Step 1: Start the local site and verify the desktop first viewport**

Run: `python3 -m http.server 4173`

Open `http://127.0.0.1:4173/` at a desktop viewport. Confirm:

- Hero headline and both CTAs remain fully readable and clickable.
- Four nodes form a clear S-curve on the right.
- Only the active label is strongly emphasized.
- The page has no horizontal overflow.
- Browser console contains no errors.

- [ ] **Step 2: Verify scroll progression**

Scroll through the hero at four representative positions. Confirm status and active label order is exactly `Teklif`, `Karşılaştırma`, `Kontrol`, `Poliçe`; camera movement is restrained; normal document scrolling is never captured or locked.

- [ ] **Step 3: Verify responsive behavior**

At approximately `900px` width confirm six secondary points and reduced parallax. At approximately `390px` width confirm no secondary points, no parallax, a single active label, no content overlap, and a pixel-ratio cap of 1.25.

- [ ] **Step 4: Verify accessibility and fallback**

Emulate `prefers-reduced-motion: reduce` and confirm a static scene with no camera travel, marker movement, or parallax. Block the Three.js CDN or force WebGL unavailable and confirm the four-stage CSS fallback remains visible and usable content/navigation is unaffected.

- [ ] **Step 5: Apply only evidence-driven visual fixes**

If a check fails, change the smallest scoped style or lifecycle value that corrects that specific failure. Do not redesign other page sections or add new dependencies.

- [ ] **Step 6: Run final verification**

Run: `node --test tests/decision-network-core.test.mjs`

Expected: all tests pass with 0 failures.

Run: `git diff --check`

Expected: no whitespace errors.

Check `git status --short` and verify only intended feature files plus the user’s pre-existing unrelated changes are present.

- [ ] **Step 7: Commit verification refinements if any**

```bash
git add index.html js/decision-network.js js/decision-network-core.mjs tests/decision-network-core.test.mjs
git commit -m "fix: refine decision network responsive behavior"
```
