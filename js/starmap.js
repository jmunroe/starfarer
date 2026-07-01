// The 3D star map: renders the catalog as shader points in true parsec
// coordinates, with orbit/zoom/pan controls, picking, DOM labels, a distance
// grid and fly-to animation.

import * as THREE from "three";
import { ciToTemp, tempToColor, PC_TO_LY } from "./astro.js";

const STAR_VERT = `
attribute float size;
attribute float visible;
varying vec3 vColor;
varying float vVis;
void main() {
  vColor = color;
  vVis = visible;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  float dist = length(mv.xyz);
  float atten = clamp(70.0 / dist, 0.35, 6.0);
  gl_PointSize = size * atten;
  gl_Position = projectionMatrix * mv;
}`;

const STAR_FRAG = `
varying vec3 vColor;
varying float vVis;
void main() {
  if (vVis < 0.5) discard;
  vec2 uv = gl_PointCoord - 0.5;
  float d = length(uv) * 2.0;
  if (d > 1.0) discard;
  float core = smoothstep(0.5, 0.0, d);
  float glow = pow(max(0.0, 1.0 - d), 2.2) * 0.55;
  float a = core + glow;
  gl_FragColor = vec4(vColor * (0.55 + core), a);
}`;

const RING_VERT = `
attribute float size;
attribute float visible;
varying float vVis;
void main() {
  vVis = visible;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  float dist = length(mv.xyz);
  float atten = clamp(70.0 / dist, 0.35, 6.0);
  gl_PointSize = (size + 9.0) * atten;
  gl_Position = projectionMatrix * mv;
}`;

const RING_FRAG = `
uniform float uOpacity;
varying float vVis;
void main() {
  if (vVis < 0.5 || uOpacity <= 0.0) discard;
  vec2 uv = gl_PointCoord - 0.5;
  float d = length(uv) * 2.0;
  float ring = smoothstep(0.10, 0.02, abs(d - 0.72));
  if (ring < 0.02) discard;
  gl_FragColor = vec4(0.55, 0.85, 1.0, ring * 0.85 * uOpacity);
}`;

function starVisualSize(star) {
  const lum = star.lum != null ? star.lum
    : star.absmag != null ? Math.pow(10, (4.83 - star.absmag) / 2.5) : null;
  if (lum == null) return star.hasPlanets ? 2.4 : 1.8;
  return THREE.MathUtils.clamp(2.6 * Math.pow(Math.max(lum, 1e-6), 0.11), 1.1, 11);
}

function starColor(star) {
  const t = (star.system && star.system.star && star.system.star.st_teff)
    || ciToTemp(star.ci) || 5500;
  return tempToColor(t);
}

const EASE = (t) => 1 - Math.pow(1 - t, 3);

export class StarMap {
  constructor(container, catalog, { onSelect } = {}) {
    this.container = container;
    this.catalog = catalog;
    this.onSelect = onSelect || (() => {});
    this.selected = null;
    this.labelCandidates = [];
    this.labelPool = [];
    this.gridLabels = [];
    this.anim = null;
    this.showLabels = true;

    this._initScene();
    this._initStars();
    this._initGrid();
    this._initControls();
    this._initLabels();

    window.addEventListener("resize", () => this._resize());
    this._resize();
    this._tick = this._tick.bind(this);
    requestAnimationFrame(this._tick);
  }

  _initScene() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x04070f);
    this.container.appendChild(this.renderer.domElement);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(55, 1, 0.005, 40000);
  }

  _initStars() {
    const stars = this.catalog.stars;
    const n = stars.length;
    const pos = new Float32Array(n * 3);
    const col = new Float32Array(n * 3);
    const size = new Float32Array(n);
    const vis = new Float32Array(n).fill(1);
    this.indexOf = new Map();
    for (let i = 0; i < n; i++) {
      const s = stars[i];
      this.indexOf.set(s.id, i);
      pos[i * 3] = s.x; pos[i * 3 + 1] = s.y; pos[i * 3 + 2] = s.z;
      const [r, g, b] = starColor(s);
      col[i * 3] = r; col[i * 3 + 1] = g; col[i * 3 + 2] = b;
      size[i] = starVisualSize(s);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    geo.setAttribute("size", new THREE.BufferAttribute(size, 1));
    geo.setAttribute("visible", new THREE.BufferAttribute(vis, 1));
    this.starGeo = geo;
    const mat = new THREE.ShaderMaterial({
      vertexShader: STAR_VERT, fragmentShader: STAR_FRAG,
      vertexColors: true, transparent: true,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
    this.scene.add(this.points);

    // planet-host ring markers share position/size/visibility buffers, but
    // non-hosts are masked out via their own visibility attribute
    const hostVis = new Float32Array(n);
    for (let i = 0; i < n; i++) hostVis[i] = stars[i].hasPlanets ? 1 : 0;
    this.hostVisBase = hostVis;
    const rgeo = new THREE.BufferGeometry();
    rgeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    rgeo.setAttribute("size", new THREE.BufferAttribute(size, 1));
    rgeo.setAttribute("visible", new THREE.BufferAttribute(hostVis.slice(), 1));
    this.ringGeo = rgeo;
    this.ringMat = new THREE.ShaderMaterial({
      vertexShader: RING_VERT, fragmentShader: RING_FRAG,
      uniforms: { uOpacity: { value: 1 } },
      transparent: true, depthWrite: false,
    });
    this.rings = new THREE.Points(rgeo, this.ringMat);
    this.rings.frustumCulled = false;
    this.scene.add(this.rings);
  }

  _initGrid() {
    this.grid = new THREE.Group();
    const mat = new THREE.LineBasicMaterial({
      color: 0x3a5a80, transparent: true, opacity: 0.28,
    });
    this.gridRadiiPc = [5, 10, 25, 50, 100, 250];
    for (const r of this.gridRadiiPc) {
      const pts = [];
      for (let i = 0; i <= 128; i++) {
        const a = (i / 128) * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, 0));
      }
      const g = new THREE.BufferGeometry().setFromPoints(pts);
      this.grid.add(new THREE.Line(g, mat));
    }
    const cross = [];
    for (const r of [[-250, 0], [250, 0], [0, -250], [0, 250]]) {
      cross.push(new THREE.Vector3(0, 0, 0), new THREE.Vector3(r[0], r[1], 0));
    }
    const cg = new THREE.BufferGeometry().setFromPoints(cross);
    this.grid.add(new THREE.LineSegments(cg, new THREE.LineBasicMaterial({
      color: 0x3a5a80, transparent: true, opacity: 0.14,
    })));
    this.scene.add(this.grid);
  }

  _initControls() {
    // spherical orbit around a target point, with inertia-free damping
    this.target = new THREE.Vector3(0, 0, 0);
    this.sph = new THREE.Spherical(34, Math.PI / 2.6, 0.5);
    this.sphGoal = this.sph.clone();
    this.targetGoal = this.target.clone();

    const el = this.renderer.domElement;
    let drag = null;
    let moved = 0;

    el.addEventListener("pointerdown", (e) => {
      drag = { x: e.clientX, y: e.clientY, btn: e.button, id: e.pointerId };
      moved = 0;
      el.setPointerCapture(e.pointerId);
    });
    el.addEventListener("pointermove", (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      drag.x = e.clientX; drag.y = e.clientY;
      moved += Math.abs(dx) + Math.abs(dy);
      if (drag.btn === 2 || e.shiftKey) {
        // pan in the camera plane, scaled to view radius
        const k = this.sph.radius * 0.0016;
        const fwd = new THREE.Vector3().subVectors(this.target, this.camera.position).normalize();
        const right = new THREE.Vector3().crossVectors(fwd, this.camera.up).normalize();
        const up = new THREE.Vector3().crossVectors(right, fwd).normalize();
        this.targetGoal.addScaledVector(right, -dx * k).addScaledVector(up, dy * k);
      } else {
        this.sphGoal.theta -= dx * 0.005;
        this.sphGoal.phi = THREE.MathUtils.clamp(this.sphGoal.phi - dy * 0.005, 0.05, Math.PI - 0.05);
      }
      this.anim = null;
    });
    const endDrag = (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const wasClick = moved < 6 && drag.btn === 0;
      drag = null;
      if (wasClick) this._pick(e.clientX, e.clientY);
    };
    el.addEventListener("pointerup", endDrag);
    el.addEventListener("pointercancel", () => { drag = null; });
    el.addEventListener("dblclick", (e) => {
      const s = this._pick(e.clientX, e.clientY, true);
      if (s) this.flyTo(s);
    });
    el.addEventListener("wheel", (e) => {
      e.preventDefault();
      const k = Math.exp(e.deltaY * 0.0011);
      this.sphGoal.radius = THREE.MathUtils.clamp(this.sphGoal.radius * k, 0.05, 6000);
      this.anim = null;
    }, { passive: false });
    el.addEventListener("contextmenu", (e) => e.preventDefault());

    // touch pinch zoom
    const touches = new Map();
    el.addEventListener("touchstart", (e) => {
      for (const t of e.changedTouches) touches.set(t.identifier, [t.clientX, t.clientY]);
    }, { passive: true });
    el.addEventListener("touchmove", (e) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const [a, b] = e.touches;
        const dNow = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
        const pa = touches.get(a.identifier), pb = touches.get(b.identifier);
        if (pa && pb) {
          const dPrev = Math.hypot(pa[0] - pb[0], pa[1] - pb[1]);
          if (dPrev > 0) {
            this.sphGoal.radius = THREE.MathUtils.clamp(
              this.sphGoal.radius * (dPrev / dNow), 0.05, 6000);
          }
        }
        touches.set(a.identifier, [a.clientX, a.clientY]);
        touches.set(b.identifier, [b.clientX, b.clientY]);
      }
    }, { passive: false });
    el.addEventListener("touchend", (e) => {
      for (const t of e.changedTouches) touches.delete(t.identifier);
    }, { passive: true });
  }

  _initLabels() {
    // candidates: proper-named stars plus nearby planet hosts
    this.labelCandidates = this.catalog.stars.filter(
      (s) => s.isNamed || (s.hasPlanets && s.dist < 55));
    for (let i = 0; i < 44; i++) {
      const div = document.createElement("div");
      div.className = "star-label";
      div.style.display = "none";
      document.body.appendChild(div);
      this.labelPool.push(div);
    }
    this.marker = document.createElement("div");
    this.marker.id = "sel-marker";
    this.marker.style.display = "none";
    document.body.appendChild(this.marker);

    for (const r of this.gridRadiiPc) {
      const div = document.createElement("div");
      div.className = "star-label dim";
      div.style.display = "none";
      div.dataset.r = r;
      document.body.appendChild(div);
      this.gridLabels.push(div);
    }
  }

  _resize() {
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  // Project a world position to screen px; returns null if behind camera.
  _project(v3, out) {
    const p = out.copy(v3).project(this.camera);
    if (p.z > 1 || p.z < -1) return null;
    const w = this.renderer.domElement.clientWidth;
    const h = this.renderer.domElement.clientHeight;
    return { x: (p.x + 1) / 2 * w, y: (1 - p.y) / 2 * h };
  }

  _pick(cx, cy, quiet = false) {
    const stars = this.catalog.stars;
    const vis = this.starGeo.getAttribute("visible").array;
    const tmp = new THREE.Vector3();
    let best = null, bestD = 15;
    for (let i = 0; i < stars.length; i++) {
      if (vis[i] < 0.5) continue;
      const s = stars[i];
      tmp.set(s.x, s.y, s.z);
      const sp = this._project(tmp, tmp);
      if (!sp) continue;
      const d = Math.hypot(sp.x - cx, sp.y - cy) - starVisualSize(s) * 0.4;
      if (d < bestD) { bestD = d; best = s; }
    }
    if (best && !quiet) this.select(best);
    return best;
  }

  select(star, { fly = false } = {}) {
    this.selected = star;
    this.onSelect(star);
    if (fly) this.flyTo(star);
  }

  flyTo(star, radius = null) {
    const r = radius != null ? radius
      : THREE.MathUtils.clamp(1.2 + star.dist * 0.06, 0.6, 26);
    this.anim = {
      t0: performance.now(), dur: 1400,
      fromTarget: this.target.clone(),
      toTarget: new THREE.Vector3(star.x, star.y, star.z),
      fromR: this.sph.radius, toR: r,
    };
    this.sphGoal.radius = r;
  }

  resetView() {
    this.anim = {
      t0: performance.now(), dur: 1200,
      fromTarget: this.target.clone(), toTarget: new THREE.Vector3(0, 0, 0),
      fromR: this.sph.radius, toR: 34,
    };
    this.sphGoal.radius = 34;
  }

  // filterFn(star) -> boolean; returns number of visible stars
  applyFilter(filterFn) {
    const stars = this.catalog.stars;
    const vis = this.starGeo.getAttribute("visible");
    const hvis = this.ringGeo.getAttribute("visible");
    let count = 0;
    for (let i = 0; i < stars.length; i++) {
      const on = filterFn(stars[i]) ? 1 : 0;
      vis.array[i] = on;
      hvis.array[i] = on && this.hostVisBase[i] ? 1 : 0;
      count += on;
    }
    vis.needsUpdate = true;
    hvis.needsUpdate = true;
    this.visibleCount = count;
    return count;
  }

  setGridVisible(v) { this.grid.visible = v; }
  setRingsVisible(v) { this.ringMat.uniforms.uOpacity.value = v ? 1 : 0; }
  setLabelsVisible(v) { this.showLabels = v; }

  _updateLabels() {
    const tmp = new THREE.Vector3();
    const camPos = this.camera.position;
    const w = this.renderer.domElement.clientWidth;
    const h = this.renderer.domElement.clientHeight;
    const vis = this.starGeo.getAttribute("visible").array;

    const placed = [];
    let used = 0;
    if (this.showLabels) {
      const cands = [];
      for (const s of this.labelCandidates) {
        const idx = this.indexOf.get(s.id);
        if (vis[idx] < 0.5) continue;
        const dCam = Math.hypot(s.x - camPos.x, s.y - camPos.y, s.z - camPos.z);
        // priority: bright and close to camera first
        const mag = s.mag != null ? s.mag : 10;
        cands.push({ s, w: mag + dCam * 0.06 - (s.hasPlanets ? 1.5 : 0) - (s.id === (this.selected && this.selected.id) ? 99 : 0) });
      }
      cands.sort((a, b) => a.w - b.w);
      for (const { s } of cands) {
        if (used >= this.labelPool.length) break;
        tmp.set(s.x, s.y, s.z);
        const sp = this._project(tmp, tmp);
        if (!sp || sp.x < 0 || sp.x > w || sp.y < 0 || sp.y > h) continue;
        let clash = false;
        for (const p of placed) {
          if (Math.abs(p.x - sp.x) < 92 && Math.abs(p.y - sp.y) < 20) { clash = true; break; }
        }
        if (clash) continue;
        placed.push(sp);
        const div = this.labelPool[used++];
        div.textContent = s.name;
        div.className = "star-label" + (s.hasPlanets ? " host" : "") + (s.mag != null && s.mag > 5 ? " dim" : "");
        div.style.display = "block";
        div.style.left = sp.x + "px";
        div.style.top = sp.y + "px";
      }
    }
    for (let i = used; i < this.labelPool.length; i++) {
      this.labelPool[i].style.display = "none";
    }

    // selection marker
    if (this.selected) {
      tmp.set(this.selected.x, this.selected.y, this.selected.z);
      const sp = this._project(tmp, tmp);
      if (sp) {
        this.marker.style.display = "block";
        this.marker.style.left = sp.x + "px";
        this.marker.style.top = sp.y + "px";
      } else this.marker.style.display = "none";
    } else this.marker.style.display = "none";

    // grid ring labels along +X
    for (let i = 0; i < this.gridLabels.length; i++) {
      const div = this.gridLabels[i];
      if (!this.grid.visible) { div.style.display = "none"; continue; }
      const r = this.gridRadiiPc[i];
      tmp.set(r * 0.7071, r * 0.7071, 0);
      const sp = this._project(tmp, tmp);
      if (!sp || sp.x < 20 || sp.x > w - 20 || sp.y < 40 || sp.y > h - 20 ||
          r > this.sph.radius * 12 || r < this.sph.radius * 0.08) {
        div.style.display = "none";
        continue;
      }
      div.textContent = this.units === "pc" ? `${r} pc` : `${Math.round(r * PC_TO_LY)} ly`;
      div.style.display = "block";
      div.style.left = sp.x + "px";
      div.style.top = sp.y + "px";
    }
  }

  _tick(now) {
    requestAnimationFrame(this._tick);
    if (this.paused) return;

    if (this.anim) {
      const a = this.anim;
      const t = Math.min(1, (now - a.t0) / a.dur);
      const e = EASE(t);
      this.targetGoal.lerpVectors(a.fromTarget, a.toTarget, e);
      this.target.copy(this.targetGoal);
      this.sphGoal.radius = a.fromR + (a.toR - a.fromR) * e;
      if (t >= 1) this.anim = null;
    }

    // damped approach to goals
    this.sph.theta += (this.sphGoal.theta - this.sph.theta) * 0.14;
    this.sph.phi += (this.sphGoal.phi - this.sph.phi) * 0.14;
    this.sph.radius += (this.sphGoal.radius - this.sph.radius) * 0.14;
    this.target.lerp(this.targetGoal, 0.14);

    const off = new THREE.Vector3().setFromSpherical(this.sph);
    // spherical is y-up; swap so z stays "celestial north"
    this.camera.position.set(
      this.target.x + off.x, this.target.y + off.z, this.target.z + off.y);
    this.camera.up.set(0, 0, 1);
    this.camera.lookAt(this.target);
    this.camera.near = Math.max(0.002, this.sph.radius * 0.01);
    this.camera.far = 50000;
    this.camera.updateProjectionMatrix();

    this.renderer.render(this.scene, this.camera);
    this._updateLabels();
    if (this.onFrame) this.onFrame();
  }
}
