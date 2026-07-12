import * as THREE from "three";
import {
    STAGES,
    STORY_SECTION_IDS,
    damp,
    getActiveStageIndex,
    getSceneBudget,
    getSectionProgress,
    getStorySectionIndex
} from "./decision-network-core.mjs";

const STORY_LAYOUTS = Object.freeze([
    {
        nodes: [[-2.7, 0.8, 0.25], [-0.9, -0.35, 0.8], [0.9, 0.55, -0.15], [2.7, -0.45, 0.55]],
        camera: [0, 0.35, 11.5], lookAt: [0.35, 0, 0], root: [2.35, 0, 0], rotation: [0, 0, 0], scale: 1,
        connections: [0.55, 0.2, 0.16], satellites: 0, gates: 0, points: 0.42, highlight: 0, bend: 0.62
    },
    {
        nodes: [[-1.05, 0.72, 0.25], [1.05, 0.72, -0.15], [-0.9, -0.75, 0.35], [0.9, -0.75, -0.2]],
        camera: [0.2, 0.2, 10.2], lookAt: [0, 0, 0], root: [2.45, 0, 0], rotation: [0.12, 0.28, -0.06], scale: 1.22,
        connections: [0.42, 0.42, 0.42], satellites: 0.14, gates: 0, points: 0.34, highlight: 0, bend: 0.32
    },
    {
        nodes: [[-1.65, 0.1, 0.3], [-0.25, 0.65, -0.15], [0.35, -0.65, 0.45], [1.7, 0.05, -0.3]],
        camera: [0, 0.15, 10.7], lookAt: [0, 0, 0], root: [0, 0, 0], rotation: [-0.08, -0.22, 0.08], scale: 1.12,
        connections: [0.5, 0.5, 0.5], satellites: 0.62, gates: 0, points: 0.52, highlight: 1, bend: 0.42
    },
    {
        nodes: [[-3.25, 1.55, -0.8], [-1.1, -1.55, 0.9], [1.25, 1.8, -0.65], [3.35, -1.35, 0.65]],
        camera: [-0.25, 0.3, 12.1], lookAt: [0, 0, 0], root: [0, 0, 0], rotation: [0.06, 0.18, -0.12], scale: 0.94,
        connections: [0.08, 0.035, 0.08], satellites: 0.08, gates: 0, points: 0.58, highlight: -1, bend: 1.15
    },
    {
        nodes: [[-2.6, 0.9, 0.15], [-0.85, 0.15, 0.55], [0.85, -0.25, 0], [2.6, 0.72, 0.35]],
        camera: [0.15, 0.2, 11], lookAt: [0.2, 0.1, 0], root: [1.9, 0, 0], rotation: [-0.05, -0.16, 0.04], scale: 1.02,
        connections: [0.62, 0.62, 0.62], satellites: 0.22, gates: 0, points: 0.4, highlight: 2, bend: 0.38
    },
    {
        nodes: [[-0.65, 0.2, 2.4], [0.5, -0.2, 0.65], [-0.35, 0.18, -1.25], [0.35, -0.1, -3]],
        camera: [0.2, 0.1, 10.6], lookAt: [0, 0, -0.4], root: [2.3, 0, 0], rotation: [0, 0.1, 0], scale: 1.05,
        connections: [0.58, 0.58, 0.32], satellites: 0, gates: 0.58, points: 0.26, highlight: 0, bend: 0.24
    },
    {
        nodes: [[-0.65, 0.28, 0.2], [0.65, 0.28, 0], [-0.55, -0.45, 0.15], [0.55, -0.45, -0.1]],
        camera: [0, 0.1, 9.8], lookAt: [0, 0, 0], root: [-2.55, 0, 0], rotation: [0.06, -0.18, 0], scale: 1.3,
        connections: [0.64, 0.64, 0.64], satellites: 0.1, gates: 0, points: 0.18, highlight: 3, bend: 0.25
    }
]);

const shell = document.querySelector(".decision-story-layer[data-decision-network]");
const canvas = document.getElementById("decision-network");
const fallback = document.getElementById("decision-network-fallback");
const hero = document.querySelector('[data-story-section="hero"]');
const heroOverlay = document.querySelector(".decision-network-shell");
const storySections = STORY_SECTION_IDS.map((id) => document.querySelector(`[data-story-section="${id}"]`));
const labels = Array.from(document.querySelectorAll(".decision-network-label"));
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function activateFallback() {
    shell?.classList.remove("is-ready");
    shell?.classList.add("is-fallback");
    heroOverlay?.classList.remove("is-ready");
    fallback?.removeAttribute("aria-hidden");
}

if (shell && canvas && fallback && hero && storySections.every(Boolean)) {
    try {
        initializeDecisionStory();
    } catch (error) {
        activateFallback();
    }
}

function initializeDecisionStory() {
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "high-performance" });
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    const storyRoot = new THREE.Group();
    const nodeGroups = [];
    const nodeMaterials = [];
    const wireMaterials = [];
    const haloMaterials = [];
    const halos = [];
    const connections = [];
    const satelliteNodes = [];
    const processGates = [];
    const geometries = new Set();
    const materials = new Set();
    const cameraLookAt = new THREE.Vector3();
    const tempPoint = new THREE.Vector3();
    const sectionOffsets = new Array(STORY_SECTION_IDS.length).fill(0);
    const sectionHeights = new Array(STORY_SECTION_IDS.length).fill(1);
    const secondaryCoordinates = [
        -4.6, 1.9, -0.8, -3.9, -1.8, 0.2, -3.25, 1.3, 0.8, -2.8, -1.25, -1,
        -2.1, 2.1, -0.35, -1.7, -1.9, 0.55, -1.1, 1.45, -1.2, -0.6, -1.1, 1,
        0.1, 2.05, 0.25, 0.35, -1.65, -0.8, 0.85, 1.15, -1.15, 1.25, -2.1, 0.45,
        1.7, 1.75, 0.85, 2.05, -1.35, -1, 2.45, 0.95, -0.35, 2.8, -2, 0.65,
        3.15, 1.65, -0.9, 3.5, -1.05, 0.15, 3.9, 1.05, 0.75, 4.25, -1.75, -0.45,
        -4.35, 0.25, 0.4, -2.25, 0.15, -1.45, 0.65, 0.15, 1.25, 4.45, 0.35, -0.65
    ];

    let budget = getSceneBudget(window.innerWidth);
    let activeStageIndex = 0;
    let activeStoryIndex = 0;
    let sectionProgress = 0;
    let targetPointerX = 0;
    let targetPointerY = 0;
    let pointerX = 0;
    let pointerY = 0;
    let frameId = 0;
    let lastFrameTime = 0;
    let isVisible = !document.hidden;
    let isDestroyed = false;
    let resizeObserver = null;
    let visibilityObserver = null;

    renderer.setClearColor(0xf6f8fb, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    scene.fog = new THREE.FogExp2(0xf6f8fb, 0.03);
    camera.position.set(...STORY_LAYOUTS[0].camera);
    storyRoot.position.set(...STORY_LAYOUTS[0].root);
    scene.add(storyRoot);

    const ambientLight = new THREE.AmbientLight(0xffffff, 2.15);
    const activeLight = new THREE.DirectionalLight(0x5b8cff, 3.2);
    activeLight.position.set(2.5, 3.5, 5.5);
    scene.add(ambientLight, activeLight);

    const coreGeometry = rememberGeometry(new THREE.IcosahedronGeometry(0.42, 2));
    const haloGeometry = rememberGeometry(new THREE.SphereGeometry(0.7, 20, 14));
    const ringGeometry = rememberGeometry(new THREE.TorusGeometry(0.58, 0.014, 8, 64));
    const markerGeometry = rememberGeometry(new THREE.SphereGeometry(0.055, 10, 8));
    const satelliteGeometry = rememberGeometry(new THREE.OctahedronGeometry(0.13, 1));
    const gateGeometry = rememberGeometry(new THREE.TorusGeometry(1.15, 0.025, 8, 72));

    STORY_LAYOUTS[0].nodes.forEach((position, index) => {
        const group = new THREE.Group();
        const coreMaterial = rememberMaterial(new THREE.MeshStandardMaterial({
            color: 0x101c31, emissive: 0x173d91, emissiveIntensity: index === 0 ? 0.34 : 0.06,
            metalness: 0.36, roughness: 0.28, flatShading: true
        }));
        const wireMaterial = rememberMaterial(new THREE.MeshBasicMaterial({
            color: 0x5b8cff, wireframe: true, transparent: true, opacity: index === 0 ? 0.62 : 0.2, depthWrite: false
        }));
        const haloMaterial = rememberMaterial(new THREE.MeshBasicMaterial({
            color: 0x2563eb, transparent: true, opacity: index === 0 ? 0.28 : 0.05, depthWrite: false, side: THREE.BackSide
        }));
        const ringMaterial = rememberMaterial(new THREE.MeshBasicMaterial({
            color: 0x2563eb, transparent: true, opacity: index === 0 ? 0.58 : 0.14, depthWrite: false
        }));
        const core = new THREE.Mesh(coreGeometry, coreMaterial);
        const wire = new THREE.Mesh(coreGeometry, wireMaterial);
        const halo = new THREE.Mesh(haloGeometry, haloMaterial);
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);

        wire.scale.setScalar(1.025);
        ring.rotation.set(Math.PI * 0.64, Math.PI * 0.18, 0);
        group.position.set(...position);
        group.add(halo, ring, core, wire);
        storyRoot.add(group);
        nodeGroups.push(group);
        nodeMaterials.push(coreMaterial);
        wireMaterials.push(wireMaterial);
        haloMaterials.push(haloMaterial);
        halos.push(halo);
    });

    for (let index = 0; index < 3; index += 1) {
        const positionArray = new Float32Array(65 * 3);
        const positionAttribute = new THREE.BufferAttribute(positionArray, 3);
        const geometry = rememberGeometry(new THREE.BufferGeometry());
        const material = rememberMaterial(new THREE.LineBasicMaterial({
            color: 0x2563eb, transparent: true, opacity: STORY_LAYOUTS[0].connections[index], depthWrite: false
        }));
        const curve = new THREE.CubicBezierCurve3(new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3());
        const markers = [];

        geometry.setAttribute("position", positionAttribute);
        storyRoot.add(new THREE.Line(geometry, material));

        for (let markerIndex = 0; markerIndex < 3; markerIndex += 1) {
            const markerMaterial = rememberMaterial(new THREE.MeshBasicMaterial({
                color: 0x5b8cff, transparent: true, opacity: 0, depthWrite: false
            }));
            const marker = new THREE.Mesh(markerGeometry, markerMaterial);
            storyRoot.add(marker);
            markers.push({ mesh: marker, material: markerMaterial, phase: markerIndex / 3 });
        }

        connections.push({ curve, material, markers, positionAttribute, direction: index % 2 === 0 ? -1 : 1 });
    }

    const satelliteMaterial = rememberMaterial(new THREE.MeshBasicMaterial({
        color: 0x2563eb, transparent: true, opacity: 0, depthWrite: false
    }));
    const satellitePositions = [[-2.5, 1.55, -0.4], [-1.4, -1.55, 0.2], [-0.45, 1.65, 0.7], [0.65, -1.5, -0.65], [1.55, 1.45, 0.15], [2.45, -1.35, 0.65], [2.8, 0.75, -0.75], [-2.85, -0.55, -0.15]];
    satellitePositions.forEach((position) => {
        const satellite = new THREE.Mesh(satelliteGeometry, satelliteMaterial);
        satellite.position.set(...position);
        satellite.scale.setScalar(0.001);
        storyRoot.add(satellite);
        satelliteNodes.push(satellite);
    });

    const gateMaterial = rememberMaterial(new THREE.MeshBasicMaterial({
        color: 0x173d91, transparent: true, opacity: 0, depthWrite: false
    }));
    [[0, 0, 2.2], [0, 0, 0.1], [0, 0, -2]].forEach((position) => {
        const gate = new THREE.Mesh(gateGeometry, gateMaterial);
        gate.position.set(...position);
        gate.rotation.y = Math.PI * 0.5;
        gate.scale.setScalar(0.001);
        storyRoot.add(gate);
        processGates.push(gate);
    });

    const secondaryGeometry = rememberGeometry(new THREE.BufferGeometry());
    secondaryGeometry.setAttribute("position", new THREE.Float32BufferAttribute(secondaryCoordinates, 3));
    secondaryGeometry.setDrawRange(0, budget.secondaryPoints);
    const secondaryMaterial = rememberMaterial(new THREE.PointsMaterial({
        color: 0x5276a8, size: 0.055, transparent: true, opacity: 0.42, depthWrite: false, sizeAttenuation: true
    }));
    const secondaryPointCloud = new THREE.Points(secondaryGeometry, secondaryMaterial);
    storyRoot.add(secondaryPointCloud);

    function rememberGeometry(geometry) {
        geometries.add(geometry);
        return geometry;
    }

    function rememberMaterial(material) {
        materials.add(material);
        return material;
    }

    function cacheSectionMetrics() {
        storySections.forEach((section, index) => {
            sectionOffsets[index] = section.offsetTop;
            sectionHeights[index] = Math.max(1, section.offsetHeight);
        });
    }

    function updateActiveStage(nextStageIndex, force = false) {
        if (!force && nextStageIndex === activeStageIndex && shell.dataset.activeStage) return;
        activeStageIndex = nextStageIndex;
        shell.dataset.activeStage = String(nextStageIndex);
        labels.forEach((label, index) => label.classList.toggle("is-active", index === nextStageIndex));
    }

    function updateStoryTarget() {
        activeStoryIndex = getStorySectionIndex(window.scrollY, window.innerHeight, sectionOffsets);
        sectionProgress = getSectionProgress(
            window.scrollY,
            window.innerHeight,
            sectionOffsets[activeStoryIndex],
            sectionHeights[activeStoryIndex]
        );
        const sectionId = STORY_SECTION_IDS[activeStoryIndex];
        shell.dataset.activeStory = sectionId;
        document.body.dataset.activeStory = sectionId;

        if (activeStoryIndex === 0) {
            updateActiveStage(getActiveStageIndex(Math.min(1, window.scrollY / Math.max(1, hero.offsetHeight))));
        }

        if (reducedMotion) {
            updateScene(1, 0);
            renderer.render(scene, camera);
        }
    }

    function updatePointer(event) {
        if (reducedMotion || budget.pointerParallax === 0) return;
        targetPointerX = (event.clientX / Math.max(1, window.innerWidth)) * 2 - 1;
        targetPointerY = (event.clientY / Math.max(1, window.innerHeight)) * 2 - 1;
    }

    function updateDynamicConnection(connection, index, bend) {
        const start = nodeGroups[index].position;
        const end = nodeGroups[index + 1].position;
        connection.curve.v0.copy(start);
        connection.curve.v3.copy(end);
        connection.curve.v1.copy(start).lerp(end, 0.35);
        connection.curve.v2.copy(start).lerp(end, 0.68);
        connection.curve.v1.y += connection.direction * bend;
        connection.curve.v2.y += connection.direction * bend;
        connection.curve.v1.z += 0.2;
        connection.curve.v2.z -= 0.16;

        for (let pointIndex = 0; pointIndex < 65; pointIndex += 1) {
            connection.curve.getPoint(pointIndex / 64, tempPoint);
            connection.positionAttribute.setXYZ(pointIndex, tempPoint.x, tempPoint.y, tempPoint.z);
        }
        connection.positionAttribute.needsUpdate = true;
    }

    function updateScene(deltaSeconds, elapsedSeconds) {
        const layout = STORY_LAYOUTS[activeStoryIndex];
        const parallax = reducedMotion ? 0 : budget.pointerParallax;
        const highlight = activeStoryIndex === 0
            ? activeStageIndex
            : activeStoryIndex === 5 ? Math.min(2, Math.floor(sectionProgress * 3)) : layout.highlight;

        pointerX = damp(pointerX, targetPointerX, 4.5, deltaSeconds);
        pointerY = damp(pointerY, targetPointerY, 4.5, deltaSeconds);
        camera.position.x = damp(camera.position.x, layout.camera[0] + pointerX * 0.22 * parallax, 3.2, deltaSeconds);
        camera.position.y = damp(camera.position.y, layout.camera[1] - pointerY * 0.16 * parallax, 3.2, deltaSeconds);
        camera.position.z = damp(camera.position.z, layout.camera[2], 3.2, deltaSeconds);
        cameraLookAt.x = damp(cameraLookAt.x, layout.lookAt[0], 3.2, deltaSeconds);
        cameraLookAt.y = damp(cameraLookAt.y, layout.lookAt[1], 3.2, deltaSeconds);
        cameraLookAt.z = damp(cameraLookAt.z, layout.lookAt[2], 3.2, deltaSeconds);
        camera.lookAt(cameraLookAt);

        storyRoot.position.x = damp(storyRoot.position.x, layout.root[0], 3.5, deltaSeconds);
        storyRoot.position.y = damp(storyRoot.position.y, layout.root[1], 3.5, deltaSeconds);
        storyRoot.position.z = damp(storyRoot.position.z, layout.root[2], 3.5, deltaSeconds);
        storyRoot.rotation.x = damp(storyRoot.rotation.x, layout.rotation[0], 3.5, deltaSeconds);
        storyRoot.rotation.y = damp(storyRoot.rotation.y, layout.rotation[1], 3.5, deltaSeconds);
        storyRoot.rotation.z = damp(storyRoot.rotation.z, layout.rotation[2], 3.5, deltaSeconds);
        const rootScale = damp(storyRoot.scale.x, layout.scale, 3.5, deltaSeconds);
        storyRoot.scale.setScalar(rootScale);

        nodeGroups.forEach((group, index) => {
            const target = layout.nodes[index];
            group.position.x = damp(group.position.x, target[0], 4.2, deltaSeconds);
            group.position.y = damp(group.position.y, target[1], 4.2, deltaSeconds);
            group.position.z = damp(group.position.z, target[2], 4.2, deltaSeconds);
            const isHighlighted = index === highlight;
            const nodeScale = damp(group.scale.x, isHighlighted ? 1.2 : 1, 5.5, deltaSeconds);
            group.scale.setScalar(nodeScale);
            if (!reducedMotion) {
                group.rotation.y += deltaSeconds * (isHighlighted ? 0.28 : 0.1);
                group.rotation.x += deltaSeconds * 0.04;
            }
            nodeMaterials[index].emissiveIntensity = damp(nodeMaterials[index].emissiveIntensity, isHighlighted ? 0.38 : 0.07, 5.5, deltaSeconds);
            wireMaterials[index].opacity = damp(wireMaterials[index].opacity, isHighlighted ? 0.68 : 0.22, 5.5, deltaSeconds);
            haloMaterials[index].opacity = damp(haloMaterials[index].opacity, isHighlighted ? 0.3 : 0.045, 5.5, deltaSeconds);
            halos[index].scale.setScalar(1 + (isHighlighted && !reducedMotion ? Math.sin(elapsedSeconds * 1.8) * 0.04 : 0));
        });

        connections.forEach((connection, index) => {
            updateDynamicConnection(connection, index, layout.bend);
            connection.material.opacity = damp(connection.material.opacity, layout.connections[index], 5, deltaSeconds);
            const markersVisible = layout.connections[index] > 0.35 && !reducedMotion;
            connection.markers.forEach((marker) => {
                marker.material.opacity = damp(marker.material.opacity, markersVisible ? 0.9 : 0, 7, deltaSeconds);
                if (markersVisible) {
                    connection.curve.getPointAt((elapsedSeconds * 0.18 + marker.phase) % 1, marker.mesh.position);
                }
            });
        });

        satelliteMaterial.opacity = damp(satelliteMaterial.opacity, layout.satellites, 5, deltaSeconds);
        satelliteNodes.forEach((satellite, index) => {
            const scale = damp(satellite.scale.x, layout.satellites > 0.2 ? 1 : 0.001, 5, deltaSeconds);
            satellite.scale.setScalar(scale);
            if (!reducedMotion) satellite.rotation.y += deltaSeconds * (0.2 + index * 0.015);
        });

        gateMaterial.opacity = damp(gateMaterial.opacity, layout.gates, 5, deltaSeconds);
        processGates.forEach((gate, index) => {
            const gateScale = damp(gate.scale.x, layout.gates > 0.2 ? 1 : 0.001, 5, deltaSeconds);
            gate.scale.setScalar(gateScale);
            if (!reducedMotion) gate.rotation.z = elapsedSeconds * 0.04 * (index % 2 === 0 ? 1 : -1);
        });

        secondaryMaterial.opacity = damp(secondaryMaterial.opacity, layout.points, 5, deltaSeconds);
        secondaryPointCloud.rotation.y = reducedMotion ? 0 : elapsedSeconds * 0.015;
        secondaryPointCloud.rotation.x = reducedMotion ? 0 : Math.sin(elapsedSeconds * 0.08) * 0.05;
    }

    function renderFrame(time) {
        frameId = 0;
        if (isDestroyed || !isVisible) return;
        const deltaSeconds = Math.min(0.05, Math.max(1 / 240, (time - lastFrameTime) / 1000 || 1 / 60));
        lastFrameTime = time;
        updateScene(deltaSeconds, time / 1000);
        renderer.render(scene, camera);
        if (!reducedMotion) frameId = window.requestAnimationFrame(renderFrame);
    }

    function start() {
        if (isDestroyed || reducedMotion || frameId || !isVisible) return;
        lastFrameTime = performance.now();
        frameId = window.requestAnimationFrame(renderFrame);
    }

    function pause() {
        if (!frameId) return;
        window.cancelAnimationFrame(frameId);
        frameId = 0;
    }

    function resize() {
        if (isDestroyed) return;
        const { width, height } = shell.getBoundingClientRect();
        if (width <= 0 || height <= 0) return;
        budget = getSceneBudget(window.innerWidth);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, budget.pixelRatio));
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.fov = window.innerWidth < 768 ? 42 : 34;
        camera.updateProjectionMatrix();
        secondaryGeometry.setDrawRange(0, budget.secondaryPoints);
        cacheSectionMetrics();
        updateStoryTarget();
    }

    function handleVisibility(entries) {
        isVisible = (entries[0]?.isIntersecting ?? true) && !document.hidden;
        if (isVisible) start(); else pause();
    }

    function handleDocumentVisibility() {
        isVisible = !document.hidden;
        if (isVisible) start(); else pause();
    }

    function handleContextLost(event) {
        event.preventDefault();
        destroy();
        activateFallback();
    }

    function destroy() {
        if (isDestroyed) return;
        isDestroyed = true;
        pause();
        resizeObserver?.disconnect();
        visibilityObserver?.disconnect();
        window.removeEventListener("scroll", updateStoryTarget);
        window.removeEventListener("pointermove", updatePointer);
        window.removeEventListener("resize", resize);
        document.removeEventListener("visibilitychange", handleDocumentVisibility);
        canvas.removeEventListener("webglcontextlost", handleContextLost);
        geometries.forEach((geometry) => geometry.dispose());
        materials.forEach((material) => material.dispose());
        renderer.dispose();
    }

    cacheSectionMetrics();
    updateStoryTarget();
    resize();
    updateScene(1, 0);
    renderer.render(scene, camera);
    shell.classList.add("is-ready");
    heroOverlay?.classList.add("is-ready");
    fallback.setAttribute("aria-hidden", "true");

    window.addEventListener("scroll", updateStoryTarget, { passive: true });
    window.addEventListener("resize", resize, { passive: true });
    document.addEventListener("visibilitychange", handleDocumentVisibility);
    canvas.addEventListener("webglcontextlost", handleContextLost);
    if (!reducedMotion) window.addEventListener("pointermove", updatePointer, { passive: true });

    if ("ResizeObserver" in window) {
        resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(shell);
    }
    if ("IntersectionObserver" in window) {
        visibilityObserver = new IntersectionObserver(handleVisibility, { threshold: 0.001 });
        visibilityObserver.observe(document.body);
    } else {
        start();
    }
}
