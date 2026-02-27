/**
 * <solar-portfolio> Web Component
 *
 * A standalone Custom Element that renders a portfolio as either:
 *   - An interactive 3D constellation (Three.js, WebGL)
 *   - A static accessible CSS grid (fallback)
 *
 * Attributes:
 *   data-json  – URL to JSON file with portfolio items
 *   variant    – "constellation" (default) | "grid"
 *   poster     – URL to a static placeholder image
 *   accent     – Hex color string for accent highlights
 */

import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

// ─── Types ───────────────────────────────────────────────────────────────────

interface PortfolioItem {
  id: string;
  title: string;
  description: string;
  image: string;
  tags: string[];
  url: string;
}

interface PortfolioData {
  items: PortfolioItem[];
}

// ─── Styles (inlined in Shadow DOM) ──────────────────────────────────────────

const COMPONENT_STYLES = `
  :host {
    display: block;
    position: relative;
    font-family: 'Georgia', 'Times New Roman', serif;
    --accent: #8C52FF;
    --bg: #0a0a0a;
    --fg: #f2f2f2;
    --muted: #888;
    --card-bg: #1a1a1a;
    --border: #333;
  }

  .container {
    position: relative;
    width: 100%;
  }

  /* ── Poster / Loading ── */
  .poster {
    width: 100%;
    aspect-ratio: 16/9;
    object-fit: cover;
    border-radius: 12px;
  }

  .loading {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 400px;
    color: var(--muted);
    font-size: 0.9rem;
  }

  .loading::after {
    content: '';
    width: 24px;
    height: 24px;
    border: 2px solid var(--muted);
    border-top-color: var(--accent);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin-left: 8px;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  /* ── WebGL Canvas ── */
  .constellation-wrap {
    position: relative;
    width: 100%;
    aspect-ratio: 16/9;
    min-height: 400px;
    border-radius: 12px;
    overflow: hidden;
    background: var(--bg);
  }

  .constellation-wrap canvas {
    display: block;
    width: 100% !important;
    height: 100% !important;
  }

  .hint {
    position: absolute;
    bottom: 12px;
    left: 50%;
    transform: translateX(-50%);
    font-size: 0.7rem;
    color: var(--muted);
    background: rgba(0,0,0,0.6);
    backdrop-filter: blur(8px);
    padding: 6px 16px;
    border-radius: 999px;
    white-space: nowrap;
    pointer-events: none;
  }

  /* ── Labels (DOM overlay on canvas) ── */
  .label-layer {
    position: absolute;
    inset: 0;
    pointer-events: none;
    overflow: hidden;
  }

  .label {
    position: absolute;
    font-size: 10px;
    color: var(--fg);
    opacity: 0.7;
    white-space: nowrap;
    transform: translate(-50%, -50%);
    transition: opacity 0.2s;
    pointer-events: auto;
    cursor: pointer;
    background: none;
    border: none;
    font-family: inherit;
    padding: 2px 6px;
  }

  .label:hover {
    opacity: 1;
    color: var(--accent);
  }

  /* ── Static Grid ── */
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 20px;
    padding: 8px 0;
  }

  .grid-item {
    background: var(--card-bg);
    border: 1px solid var(--border);
    border-radius: 12px;
    overflow: hidden;
    cursor: pointer;
    transition: transform 0.2s, border-color 0.2s;
  }

  .grid-item:hover, .grid-item:focus-visible {
    transform: translateY(-4px);
    border-color: var(--accent);
    outline: none;
  }

  .grid-item img {
    width: 100%;
    aspect-ratio: 16/10;
    object-fit: cover;
    display: block;
  }

  .grid-item-body {
    padding: 16px;
  }

  .grid-item-body h3 {
    font-size: 1rem;
    margin: 0 0 6px;
    color: var(--fg);
  }

  .grid-item-body .tags {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .tag {
    font-size: 0.65rem;
    padding: 2px 8px;
    border-radius: 999px;
    border: 1px solid var(--accent);
    color: var(--accent);
    background: transparent;
    font-family: system-ui, sans-serif;
  }

  /* ── Overlay Card ── */
  .overlay {
    position: absolute;
    inset: 0;
    z-index: 20;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0,0,0,0.8);
    backdrop-filter: blur(6px);
    padding: 24px;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.25s;
  }

  .overlay.active {
    opacity: 1;
    pointer-events: auto;
  }

  .card {
    background: var(--card-bg);
    border: 1px solid var(--border);
    border-radius: 16px;
    max-width: 720px;
    width: 100%;
    display: flex;
    flex-direction: row;
    overflow: hidden;
    box-shadow: 0 20px 60px rgba(0,0,0,0.5);
    position: relative;
  }

  @media (max-width: 640px) {
    .card { flex-direction: column; }
  }

  .card img {
    width: 50%;
    object-fit: cover;
    display: block;
  }

  @media (max-width: 640px) {
    .card img { width: 100%; aspect-ratio: 16/10; }
  }

  .card-body {
    padding: 24px;
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  .card-body h3 {
    font-size: 1.4rem;
    margin: 0 0 12px;
    color: var(--fg);
    padding-right: 32px;
  }

  .card-body p {
    font-size: 0.85rem;
    line-height: 1.6;
    color: var(--muted);
    margin: 0 0 16px;
  }

  .card-body .tags {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    border-top: 1px solid var(--border);
    padding-top: 12px;
    margin-top: auto;
  }

  .close-btn, .nav-btn {
    position: absolute;
    background: rgba(0,0,0,0.6);
    border: 1px solid var(--border);
    color: var(--fg);
    cursor: pointer;
    border-radius: 50%;
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.1rem;
    transition: background 0.15s;
    z-index: 25;
  }

  .close-btn:hover, .nav-btn:hover {
    background: rgba(0,0,0,0.9);
  }

  .close-btn { top: 12px; right: 12px; }

  .nav-prev { top: 50%; left: -48px; transform: translateY(-50%); }
  .nav-next { top: 50%; right: -48px; transform: translateY(-50%); }

  @media (max-width: 820px) {
    .nav-prev { left: 8px; }
    .nav-next { right: 8px; }
  }

  /* ── Fallback message ── */
  .fallback-notice {
    text-align: center;
    padding: 12px;
    font-size: 0.75rem;
    color: var(--muted);
  }

  /* ── Reduced-motion grid wrapper ── */
  .grid-wrap {
    position: relative;
  }
`;

// ─── SVG Icons (inline, no dependencies) ─────────────────────────────────────

const ICON_CLOSE = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
const ICON_LEFT = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>`;
const ICON_RIGHT = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 6 15 12 9 18"/></svg>`;

// ─── Utilities ───────────────────────────────────────────────────────────────

function isWebGLAvailable(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
    );
  } catch {
    return false;
  }
}

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// ─── Constellation Scene (Vanilla Three.js) ──────────────────────────────────

class ConstellationScene {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private thumbnailMeshes: THREE.Mesh[] = [];
  private textures: (THREE.Texture | null)[] = [];
  private items: PortfolioItem[] = [];
  private animId = 0;
  private labelLayer: HTMLDivElement;
  private labelElements: HTMLButtonElement[] = [];
  private accentColor: string;
  private onItemClick: (index: number) => void;

  // Procedural star field
  private stars: THREE.Points | null = null;

  // Orbit positions
  private basePositions: THREE.Vector3[] = [];
  private currentPositions: THREE.Vector3[] = [];

  constructor(
    container: HTMLDivElement,
    labelLayer: HTMLDivElement,
    items: PortfolioItem[],
    accent: string,
    onItemClick: (index: number) => void
  ) {
    this.items = items;
    this.accentColor = accent;
    this.onItemClick = onItemClick;
    this.labelLayer = labelLayer;

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(this.renderer.domElement);

    // Scene
    this.scene = new THREE.Scene();

    // Camera
    this.camera = new THREE.PerspectiveCamera(50, 2, 0.1, 100);
    this.camera.position.set(0, 0, 5);

    // Controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableZoom = false;
    this.controls.enablePan = false;
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = 0.3;
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minPolarAngle = Math.PI / 4;
    this.controls.maxPolarAngle = (Math.PI * 3) / 4;

    // Lights
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const point1 = new THREE.PointLight(0xffffff, 0.8);
    point1.position.set(5, 5, 5);
    this.scene.add(point1);
    const point2 = new THREE.PointLight(0xf5c847, 0.4);
    point2.position.set(-5, -5, 5);
    this.scene.add(point2);

    // Build scene
    this.createStars();
    this.createThumbnails();
    this.createLabels();

    // Resize
    this.resize();
    window.addEventListener("resize", this.resize);

    // Click detection
    this.renderer.domElement.addEventListener("click", this.handleCanvasClick);

    // Start
    this.animate();
  }

  private resize = () => {
    const parent = this.renderer.domElement.parentElement;
    if (!parent) return;
    const w = parent.clientWidth;
    const h = parent.clientHeight;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  };

  private createStars() {
    const count = 120;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const phi = (i / count) * Math.PI * 2 * 5.7;
      const theta = (i / count) * Math.PI * 3.2;
      const radius = 2.5 + (i % 7) * 0.4;
      positions[i * 3] = Math.cos(phi) * Math.sin(theta) * radius;
      positions[i * 3 + 1] = Math.sin(phi) * Math.sin(theta) * radius * 0.6;
      positions[i * 3 + 2] = Math.cos(theta) * radius * 0.8;
    }
    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.03,
      transparent: true,
      opacity: 0.4,
      sizeAttenuation: true,
    });
    this.stars = new THREE.Points(geom, mat);
    this.scene.add(this.stars);
  }

  private createThumbnails() {
    const loader = new THREE.TextureLoader();
    const spread = [
      [-1.8, 0.8, -1.5],
      [-0.5, 1.0, 0.8],
      [0.8, 0.9, -0.8],
      [1.9, 0.6, 1.2],
      [-1.6, -0.2, 1.0],
      [-0.4, 0.1, -1.2],
      [0.6, -0.3, 1.5],
      [1.7, -0.1, -0.5],
      [-1.0, -0.9, -0.3],
      [1.1, -0.8, 0.6],
    ];

    this.items.forEach((item, i) => {
      const pos = spread[i % spread.length];
      const basePos = new THREE.Vector3(pos[0], pos[1], pos[2]);
      this.basePositions.push(basePos.clone());
      this.currentPositions.push(basePos.clone());

      const geom = new THREE.PlaneGeometry(0.8, 0.53);
      const mat = new THREE.MeshStandardMaterial({
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide,
        color: 0xffffff,
      });

      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.copy(basePos);
      mesh.userData = { index: i };
      this.scene.add(mesh);
      this.thumbnailMeshes.push(mesh);

      // Load texture
      this.textures.push(null);
      loader.load(
        item.image,
        (tex) => {
          tex.colorSpace = THREE.SRGBColorSpace;
          mat.map = tex;
          mat.needsUpdate = true;
          this.textures[i] = tex;
        },
        undefined,
        () => {
          // failed to load – tint the plane with accent color
          mat.color.set(this.accentColor);
        }
      );
    });
  }

  private createLabels() {
    this.items.forEach((item, i) => {
      const btn = document.createElement("button");
      btn.className = "label";
      btn.textContent = item.title;
      btn.setAttribute("aria-label", `View ${item.title}`);
      btn.addEventListener("click", () => this.onItemClick(i));
      this.labelLayer.appendChild(btn);
      this.labelElements.push(btn);
    });
  }

  private handleCanvasClick = (e: MouseEvent) => {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const hits = this.raycaster.intersectObjects(this.thumbnailMeshes);
    if (hits.length > 0) {
      const idx = hits[0].object.userData.index;
      if (typeof idx === "number") this.onItemClick(idx);
    }
  };

  private animate = () => {
    this.animId = requestAnimationFrame(this.animate);
    const time = performance.now() * 0.001;

    // Orbital movement
    this.thumbnailMeshes.forEach((mesh, i) => {
      const base = this.basePositions[i];
      const cur = this.currentPositions[i];
      const speed = 0.08 + i * 0.01;
      const offset = (i * Math.PI * 2) / this.items.length;
      const angle = time * speed + offset;
      const r = 0.4;

      const tx = base.x + Math.cos(angle) * r * 0.45;
      const ty = base.y + Math.sin(angle * 0.7) * r * 0.3;
      const tz = base.z + Math.sin(angle * 0.5) * r * 0.25;

      cur.x += (tx - cur.x) * 0.02;
      cur.y += (ty - cur.y) * 0.02;
      cur.z += (tz - cur.z) * 0.02;

      mesh.position.copy(cur);
      mesh.rotation.y = Math.sin(time * 0.3 + offset) * 0.05;
    });

    // Update label positions (project 3D → 2D)
    const w = this.renderer.domElement.clientWidth;
    const h = this.renderer.domElement.clientHeight;
    this.thumbnailMeshes.forEach((mesh, i) => {
      const pos = mesh.position.clone();
      pos.y -= 0.38; // offset below thumbnail
      pos.project(this.camera);
      const x = (pos.x * 0.5 + 0.5) * w;
      const y = (-pos.y * 0.5 + 0.5) * h;
      const btn = this.labelElements[i];
      if (btn) {
        btn.style.left = `${x}px`;
        btn.style.top = `${y}px`;

        // Depth-based opacity
        const dist = this.camera.position.distanceTo(mesh.position);
        const blur = Math.max(0, Math.min(4, (dist - 4) * 1.2));
        btn.style.filter = `blur(${blur}px)`;
        btn.style.opacity = `${Math.max(0.3, 1 - blur * 0.15)}`;
      }
    });

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };

  destroy() {
    cancelAnimationFrame(this.animId);
    window.removeEventListener("resize", this.resize);
    this.renderer.domElement.removeEventListener("click", this.handleCanvasClick);
    this.renderer.dispose();
    this.thumbnailMeshes.forEach((m) => {
      m.geometry.dispose();
      (m.material as THREE.Material).dispose();
    });
    this.textures.forEach((t) => t?.dispose());
    if (this.stars) {
      this.stars.geometry.dispose();
      (this.stars.material as THREE.Material).dispose();
    }
  }
}

// ─── Custom Element ──────────────────────────────────────────────────────────

class SolarPortfolio extends HTMLElement {
  static observedAttributes = ["data-json", "variant", "poster", "accent"];

  private shadow: ShadowRoot;
  private container: HTMLDivElement;
  private items: PortfolioItem[] = [];
  private scene: ConstellationScene | null = null;
  private activeIndex: number | null = null;

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: "open" });

    // Base styles
    const style = document.createElement("style");
    style.textContent = COMPONENT_STYLES;
    this.shadow.appendChild(style);

    this.container = document.createElement("div");
    this.container.className = "container";
    this.shadow.appendChild(this.container);
  }

  connectedCallback() {
    this.load();
  }

  disconnectedCallback() {
    this.scene?.destroy();
    this.scene = null;
  }

  attributeChangedCallback() {
    // Re-render when attributes change
    if (this.isConnected) {
      this.scene?.destroy();
      this.scene = null;
      this.load();
    }
  }

  private get accent(): string {
    return this.getAttribute("accent") || "#8C52FF";
  }

  private get variant(): string {
    return this.getAttribute("variant") || "constellation";
  }

  private get posterUrl(): string | null {
    return this.getAttribute("poster");
  }

  private async load() {
    this.container.innerHTML = "";
    this.updateAccentColor();

    const jsonUrl = this.getAttribute("data-json");
    if (!jsonUrl) {
      this.container.innerHTML = `<div class="fallback-notice">No data-json attribute provided.</div>`;
      return;
    }

    // Show poster or loading
    if (this.posterUrl) {
      this.container.innerHTML = `<img class="poster" src="${this.posterUrl}" alt="Portfolio loading…" />`;
    } else {
      this.container.innerHTML = `<div class="loading">Loading portfolio</div>`;
    }

    try {
      const resp = await fetch(jsonUrl);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data: PortfolioData = await resp.json();
      this.items = data.items || [];
    } catch (err) {
      this.container.innerHTML = `<div class="fallback-notice">Failed to load portfolio data.</div>`;
      console.error("[solar-portfolio]", err);
      return;
    }

    this.render();
  }

  private updateAccentColor() {
    this.container.style.setProperty("--accent", this.accent);
    // Also set on :host via inline
    (this.shadow.host as HTMLElement).style.setProperty("--accent", this.accent);
  }

  private render() {
    this.container.innerHTML = "";
    const useGrid =
      this.variant === "grid" ||
      prefersReducedMotion() ||
      !isWebGLAvailable();

    if (useGrid) {
      this.renderGrid(!isWebGLAvailable() && this.variant !== "grid");
    } else {
      this.renderConstellation();
    }
  }

  // ── Grid Mode ──────────────────────────────────────────────────────────────

  private renderGrid(showWebGLNotice = false) {
    const wrap = document.createElement("div");
    wrap.className = "grid-wrap";

    if (showWebGLNotice) {
      const notice = document.createElement("div");
      notice.className = "fallback-notice";
      notice.textContent = "WebGL is unavailable — showing static grid view.";
      wrap.appendChild(notice);
    }

    if (prefersReducedMotion() && this.variant !== "grid") {
      const notice = document.createElement("div");
      notice.className = "fallback-notice";
      notice.textContent = "Reduced-motion preference detected — showing static grid.";
      wrap.appendChild(notice);
    }

    const grid = document.createElement("div");
    grid.className = "grid";
    grid.setAttribute("role", "list");

    this.items.forEach((item, i) => {
      const card = document.createElement("div");
      card.className = "grid-item";
      card.setAttribute("role", "listitem");
      card.setAttribute("tabindex", "0");
      card.setAttribute("aria-label", item.title);
      card.addEventListener("click", () => this.showCard(i));
      card.addEventListener("keydown", (e: KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          this.showCard(i);
        }
      });

      card.innerHTML = `
        <img src="${item.image}" alt="${item.title}" loading="lazy" />
        <div class="grid-item-body">
          <h3>${item.title}</h3>
          <div class="tags">
            ${item.tags.map((t) => `<span class="tag">${t}</span>`).join("")}
          </div>
        </div>
      `;
      grid.appendChild(card);
    });

    wrap.appendChild(grid);

    // Overlay container for card
    const overlay = document.createElement("div");
    overlay.className = "overlay";
    overlay.id = "card-overlay";
    wrap.appendChild(overlay);

    this.container.appendChild(wrap);
  }

  // ── Constellation Mode ─────────────────────────────────────────────────────

  private renderConstellation() {
    const wrap = document.createElement("div");
    wrap.className = "constellation-wrap";

    const canvasContainer = document.createElement("div");
    canvasContainer.style.cssText = "position:absolute;inset:0;";
    wrap.appendChild(canvasContainer);

    const labelLayer = document.createElement("div");
    labelLayer.className = "label-layer";
    wrap.appendChild(labelLayer);

    const hint = document.createElement("div");
    hint.className = "hint";
    hint.textContent = "Drag to explore · Click any thumbnail for details";
    wrap.appendChild(hint);

    // Overlay container
    const overlay = document.createElement("div");
    overlay.className = "overlay";
    overlay.id = "card-overlay";
    wrap.appendChild(overlay);

    this.container.appendChild(wrap);

    // Init Three.js scene
    this.scene = new ConstellationScene(
      canvasContainer,
      labelLayer,
      this.items,
      this.accent,
      (index) => this.showCard(index)
    );
  }

  // ── Card Overlay ───────────────────────────────────────────────────────────

  private showCard(index: number) {
    this.activeIndex = index;
    const item = this.items[index];
    if (!item) return;

    const overlay = this.shadow.getElementById("card-overlay") as HTMLDivElement;
    if (!overlay) return;

    const hasPrev = index > 0;
    const hasNext = index < this.items.length - 1;

    overlay.innerHTML = `
      ${hasPrev ? `<button class="nav-btn nav-prev" aria-label="Previous project">${ICON_LEFT}</button>` : ""}
      ${hasNext ? `<button class="nav-btn nav-next" aria-label="Next project">${ICON_RIGHT}</button>` : ""}
      <div class="card">
        <button class="close-btn" aria-label="Close">${ICON_CLOSE}</button>
        <img src="${item.image}" alt="${item.title}" />
        <div class="card-body">
          <h3>${item.title}</h3>
          <p>${item.description}</p>
          <div class="tags">
            ${item.tags.map((t) => `<span class="tag">${t}</span>`).join("")}
          </div>
        </div>
      </div>
    `;

    overlay.classList.add("active");

    // Event listeners
    overlay.querySelector(".close-btn")?.addEventListener("click", () => this.hideCard());
    overlay.querySelector(".nav-prev")?.addEventListener("click", (e) => {
      e.stopPropagation();
      this.showCard(index - 1);
    });
    overlay.querySelector(".nav-next")?.addEventListener("click", (e) => {
      e.stopPropagation();
      this.showCard(index + 1);
    });
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) this.hideCard();
    });

    // Keyboard
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape") this.hideCard();
      if (e.key === "ArrowLeft" && hasPrev) this.showCard(index - 1);
      if (e.key === "ArrowRight" && hasNext) this.showCard(index + 1);
    };
    document.addEventListener("keydown", keyHandler);
    overlay.dataset.keyHandler = "true";
    // Store cleanup reference
    (overlay as any)._keyHandler = keyHandler;
  }

  private hideCard() {
    this.activeIndex = null;
    const overlay = this.shadow.getElementById("card-overlay") as HTMLDivElement;
    if (!overlay) return;
    overlay.classList.remove("active");
    overlay.innerHTML = "";
    // Remove keyboard handler
    if ((overlay as any)._keyHandler) {
      document.removeEventListener("keydown", (overlay as any)._keyHandler);
      delete (overlay as any)._keyHandler;
    }
  }
}

// ─── Register ────────────────────────────────────────────────────────────────

if (!customElements.get("solar-portfolio")) {
  customElements.define("solar-portfolio", SolarPortfolio);
}

export { SolarPortfolio };
