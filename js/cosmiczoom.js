// "Powers of Ten" cosmic zoom: a continuous log-scale journey from the quantum
// foam up through atoms, cells, creatures, worlds, the star map, the galaxy,
// the observable universe and out to the speculative multiverse / omniverse.
//
// Rendered procedurally on a 2D canvas. The single state variable is `logM`,
// the base-10 log of the scale (in meters) currently filling the viewport.
// Each "stage" owns a span of logM and draws itself with a fade at its edges.

const STAGES = [
  { key: "quantum",   lo: -35, hi: -18, name: "Quantum foam",           note: "Planck scale · 10⁻³⁵ m", blurb: "At the Planck length, spacetime itself is thought to seethe and fluctuate. Below here, 'distance' may lose meaning." },
  { key: "nucleus",   lo: -18, hi: -13, name: "Atomic nucleus",         note: "protons & neutrons · ~10⁻¹⁵ m", blurb: "A dense knot of quarks bound by the strong force — 99.9% of an atom's mass in a ten-thousandth of its width." },
  { key: "atom",      lo: -13, hi: -8,  name: "The atom",               note: "electron cloud · ~10⁻¹⁰ m", blurb: "A fuzzy shell of electron probability around a tiny nucleus. Almost all of it is empty space." },
  { key: "molecule",  lo: -9,  hi: -6.5,name: "DNA & molecules",        note: "the double helix · ~10⁻⁹ m", blurb: "Atoms bond into molecules; the DNA helix stores the instructions for building a creature." },
  { key: "cell",      lo: -6.5,hi: -3.5,name: "The living cell",        note: "~10⁻⁵ m", blurb: "The smallest unit of life — a membrane enclosing a working chemical city, nucleus and all." },
  { key: "creature",  lo: -3.5,hi: 1.0, name: "A living creature",      note: "~1 m", blurb: "Trillions of cells, cooperating. Every human is a colony of them, briefly awake and looking up." },
  { key: "country",   lo: 1.0, hi: 6.5, name: "Land & country",         note: "coastlines · ~10⁵ m", blurb: "Cities, rivers and borders — the whole human world fits in this thin skin of a planet." },
  { key: "planet",    lo: 6.5, hi: 8.2, name: "The planet",             note: "Earth · 1.3×10⁷ m", blurb: "A pale blue dot. The only place any of us has ever lived." },
  { key: "system",    lo: 8.2, hi: 13.5,name: "The planetary system",   note: "orbits · ~10¹² m", blurb: "Worlds circling a star. The catalog you were just exploring holds thousands of these." },
  { key: "stars",     lo: 13.5,hi: 18.2,name: "The local stars",        note: "light-years · ~10¹⁶ m", blurb: "The Sun's neighborhood — the same stars you can select on the main map." },
  { key: "galaxy",    lo: 18.2,hi: 22.0,name: "The Milky Way",          note: "~10⁵ ly · ~10²¹ m", blurb: "A few hundred billion stars in a barred spiral. We orbit its core once every ~230 million years." },
  { key: "cluster",   lo: 22.0,hi: 24.3,name: "The Local Group",        note: "galaxy clusters · ~10²³ m", blurb: "The Milky Way, Andromeda and dozens of dwarfs, bound into a cluster by gravity." },
  { key: "web",       lo: 24.3,hi: 26.8,name: "The cosmic web",         note: "filaments · ~10²⁶ m", blurb: "On the largest scales, galaxies string into filaments and sheets around vast empty voids." },
  { key: "universe",  lo: 26.8,hi: 27.6,name: "Observable universe",    note: "~93 billion ly across", blurb: "Everything we can ever see: the cosmic microwave background, the edge of the light that has had time to reach us." },
  { key: "multiverse",lo: 27.6,hi: 30.5,name: "The multiverse",         note: "speculative", blurb: "If inflation or the many-worlds interpretation are right, our universe may be one bubble among countless others." },
  { key: "omniverse", lo: 30.5,hi: 33.0,name: "The omniverse",          note: "speculative — all that could be", blurb: "The union of every possible universe, every set of physical laws. Here the map runs out, and imagination takes over." },
];

const LO = STAGES[0].lo, HI = STAGES[STAGES.length - 1].hi;

// deterministic PRNG so procedural scenes don't shimmer between frames
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export class CosmicZoom {
  constructor(root) {
    this.root = root;
    this.canvas = root.querySelector("#cz-canvas");
    this.ctx = this.canvas.getContext("2d");
    this.nameEl = root.querySelector("#cz-name");
    this.noteEl = root.querySelector("#cz-note");
    this.blurbEl = root.querySelector("#cz-blurb");
    this.slider = root.querySelector("#cz-slider");
    this.scaleEl = root.querySelector("#cz-scale");
    this.open = false;
    this.logM = 1.0;        // start at human scale
    this.goal = 1.0;
    this.autoDir = 0;       // -1 in, +1 out, 0 idle
    this.t = 0;

    this.slider.min = LO; this.slider.max = HI; this.slider.step = 0.01;
    this.slider.addEventListener("input", () => {
      this.goal = +this.slider.value; this.autoDir = 0;
      this._syncButtons();
    });
    root.querySelector("#cz-in").addEventListener("click", () => this._auto(-1));
    root.querySelector("#cz-out").addEventListener("click", () => this._auto(1));
    this.canvas.addEventListener("wheel", (e) => {
      e.preventDefault();
      this.goal = clamp(this.goal + e.deltaY * 0.0016, LO, HI);
      this.autoDir = 0; this._syncButtons();
    }, { passive: false });
    window.addEventListener("resize", () => { if (this.open) this._resize(); });
    this._tick = this._tick.bind(this);
  }

  _auto(dir) {
    this.autoDir = this.autoDir === dir ? 0 : dir;
    this._syncButtons();
  }
  _syncButtons() {
    this.root.querySelector("#cz-in").classList.toggle("active", this.autoDir === -1);
    this.root.querySelector("#cz-out").classList.toggle("active", this.autoDir === 1);
  }

  show(atStage = null) {
    this.root.hidden = false;
    this.open = true;
    if (atStage) {
      const st = STAGES.find((s) => s.key === atStage);
      if (st) this.goal = this.logM = (st.lo + st.hi) / 2;
    }
    this._resize();
    this.last = null;
    requestAnimationFrame(this._tick);
  }
  hide() { this.open = false; this.root.hidden = true; this.autoDir = 0; }

  _resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = this.root.clientWidth, h = this.root.clientHeight;
    this.canvas.width = w * dpr; this.canvas.height = h * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.w = w; this.h = h;
  }

  _tick(now) {
    if (!this.open) return;
    requestAnimationFrame(this._tick);
    if (this.last == null) this.last = now;
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.t += dt;

    if (this.autoDir !== 0) {
      this.goal = clamp(this.goal + this.autoDir * dt * 1.7, LO, HI);
      if (this.goal <= LO || this.goal >= HI) { this.autoDir = 0; this._syncButtons(); }
    }
    this.logM += (this.goal - this.logM) * Math.min(1, dt * 6);
    this.slider.value = this.logM;

    this._draw();
    this._updateText();
  }

  _updateText() {
    let cur = STAGES[0];
    for (const s of STAGES) {
      if (this.logM >= s.lo) cur = s;
    }
    if (this.nameEl.textContent !== cur.name) {
      this.nameEl.textContent = cur.name;
      this.noteEl.textContent = cur.note;
      this.blurbEl.textContent = cur.blurb;
    }
    this.scaleEl.textContent = "viewport ≈ " + humanScale(this.logM);
  }

  // fade weight for a stage: 1 in its core, ramping to 0 across `edge` decades
  _w(st) {
    const edge = 0.9;
    const a = smooth((this.logM - (st.lo - edge)) / edge);
    const b = smooth(((st.hi + edge) - this.logM) / edge);
    return clamp(Math.min(a, b), 0, 1);
  }

  _draw() {
    const { ctx, w, h } = this;
    ctx.fillStyle = "#02040a";
    ctx.fillRect(0, 0, w, h);
    for (const st of STAGES) {
      const wgt = this._w(st);
      if (wgt <= 0.001) continue;
      ctx.save();
      ctx.globalAlpha = wgt;
      const fn = this["_scene_" + st.key];
      if (fn) fn.call(this, wgt);
      ctx.restore();
    }
  }

  // ---- scenes. cx,cy center; `s` fraction of viewport ----
  get cx() { return this.w / 2; }
  get cy() { return this.h / 2; }
  get R() { return Math.min(this.w, this.h) / 2; }

  _scene_quantum(a) {
    const { ctx } = this, R = this.R;
    const rnd = rng(7);
    for (let i = 0; i < 260; i++) {
      const x = this.cx + (rnd() - 0.5) * R * 2.4;
      const y = this.cy + (rnd() - 0.5) * R * 2.4;
      const ph = this.t * (1 + rnd() * 3) + rnd() * 10;
      const r = 3 + Math.abs(Math.sin(ph)) * 22 * (0.4 + rnd());
      ctx.beginPath();
      ctx.arc(x, y, r, 0, 7);
      ctx.strokeStyle = `rgba(120,${140 + rnd() * 90 | 0},255,${0.05 + Math.abs(Math.sin(ph)) * 0.18})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    this._caption(a, "spacetime foam");
  }

  _scene_nucleus(a) {
    const { ctx } = this, R = this.R * 0.7;
    const rnd = rng(11);
    for (let i = 0; i < 26; i++) {
      const ang = rnd() * 7, rr = Math.pow(rnd(), 0.5) * R * 0.5;
      const x = this.cx + Math.cos(ang) * rr + Math.sin(this.t + i) * 3;
      const y = this.cy + Math.sin(ang) * rr + Math.cos(this.t + i) * 3;
      const proton = i % 2 === 0;
      this._ball(x, y, R * 0.13, proton ? "#ff8a6a" : "#8ab4ff");
    }
  }

  _scene_atom(a) {
    const { ctx } = this, R = this.R;
    this._ball(this.cx, this.cy, R * 0.1, "#ffd08a");
    for (let sh = 1; sh <= 3; sh++) {
      const rr = R * (0.22 + sh * 0.22);
      ctx.beginPath();
      ctx.ellipse(this.cx, this.cy, rr, rr * 0.42, sh * 1.1, 0, 7);
      ctx.strokeStyle = "rgba(140,180,255,0.35)";
      ctx.lineWidth = 1;
      ctx.stroke();
      const n = sh + 1;
      for (let e = 0; e < n; e++) {
        const ang = this.t * (2.4 / sh) + (e / n) * 7;
        const x = this.cx + Math.cos(ang) * rr * Math.cos(sh * 1.1) - Math.sin(ang) * rr * 0.42 * Math.sin(sh * 1.1);
        const y = this.cy + Math.cos(ang) * rr * Math.sin(sh * 1.1) + Math.sin(ang) * rr * 0.42 * Math.cos(sh * 1.1);
        this._ball(x, y, 4.5, "#9fd0ff");
      }
    }
  }

  _scene_molecule(a) {
    const { ctx } = this, R = this.R;
    const turns = 3.2, N = 120;
    for (let strand = 0; strand < 2; strand++) {
      ctx.beginPath();
      for (let i = 0; i <= N; i++) {
        const f = i / N;
        const y = this.cy + (f - 0.5) * R * 1.7;
        const ph = f * turns * 7 + this.t * 0.8 + strand * Math.PI;
        const x = this.cx + Math.sin(ph) * R * 0.4;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.strokeStyle = strand ? "rgba(127,180,255,0.8)" : "rgba(217,160,232,0.8)";
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    for (let i = 0; i <= 22; i++) {
      const f = i / 22;
      const y = this.cy + (f - 0.5) * R * 1.7;
      const ph = f * turns * 7 + this.t * 0.8;
      const x1 = this.cx + Math.sin(ph) * R * 0.4;
      const x2 = this.cx + Math.sin(ph + Math.PI) * R * 0.4;
      ctx.beginPath();
      ctx.moveTo(x1, y); ctx.lineTo(x2, y);
      ctx.strokeStyle = "rgba(120,220,150,0.5)";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  _scene_cell(a) {
    const { ctx } = this, R = this.R;
    const g = ctx.createRadialGradient(this.cx, this.cy, R * 0.1, this.cx, this.cy, R * 0.95);
    g.addColorStop(0, "rgba(120,200,255,0.10)");
    g.addColorStop(0.8, "rgba(90,150,220,0.16)");
    g.addColorStop(1, "rgba(120,200,255,0.02)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(this.cx, this.cy, R * 0.92, 0, 7); ctx.fill();
    ctx.strokeStyle = "rgba(150,200,255,0.5)"; ctx.lineWidth = 3; ctx.stroke();
    this._ball(this.cx, this.cy, R * 0.28, "rgba(180,150,240,0.7)");
    const rnd = rng(23);
    for (let i = 0; i < 30; i++) {
      const ang = rnd() * 7, rr = R * (0.35 + rnd() * 0.5);
      this._ball(this.cx + Math.cos(ang + this.t * 0.1) * rr, this.cy + Math.sin(ang + this.t * 0.1) * rr, R * 0.03, "rgba(120,220,180,0.6)");
    }
  }

  _scene_creature(a) {
    // a simple looking-up figure silhouette on a ground line
    const { ctx } = this, R = this.R;
    ctx.fillStyle = "rgba(20,30,50,0.9)";
    ctx.fillRect(0, this.cy + R * 0.5, this.w, this.h);
    ctx.strokeStyle = "rgba(180,205,235,0.85)";
    ctx.lineWidth = Math.max(3, R * 0.02);
    const bx = this.cx, gy = this.cy + R * 0.5;
    ctx.beginPath();
    ctx.arc(bx, gy - R * 0.62, R * 0.09, 0, 7); ctx.stroke();       // head
    ctx.beginPath();
    ctx.moveTo(bx, gy - R * 0.53); ctx.lineTo(bx, gy - R * 0.2);    // torso
    ctx.moveTo(bx, gy - R * 0.45); ctx.lineTo(bx + R * 0.16, gy - R * 0.5); // arm up
    ctx.moveTo(bx, gy - R * 0.45); ctx.lineTo(bx - R * 0.12, gy - R * 0.32);
    ctx.moveTo(bx, gy - R * 0.2); ctx.lineTo(bx - R * 0.1, gy);     // legs
    ctx.moveTo(bx, gy - R * 0.2); ctx.lineTo(bx + R * 0.1, gy);
    ctx.stroke();
    // stars above
    const rnd = rng(31);
    for (let i = 0; i < 60; i++) {
      const x = rnd() * this.w, y = rnd() * (gy - R * 0.1);
      ctx.globalAlpha = a * (0.3 + 0.6 * Math.abs(Math.sin(this.t + i)));
      this._ball(x, y, 1.2, "#dfeaff");
    }
    ctx.globalAlpha = a;
  }

  _scene_country(a) {
    // procedural coastline + city lights
    const { ctx } = this;
    ctx.fillStyle = "rgba(10,22,40,1)";
    ctx.fillRect(0, 0, this.w, this.h);
    const rnd = rng(43);
    ctx.beginPath();
    ctx.moveTo(0, this.h * 0.6);
    for (let x = 0; x <= this.w; x += 12) {
      const y = this.h * (0.55 + 0.12 * Math.sin(x * 0.01 + 1) + 0.05 * Math.sin(x * 0.043));
      ctx.lineTo(x, y);
    }
    ctx.lineTo(this.w, this.h); ctx.lineTo(0, this.h); ctx.closePath();
    ctx.fillStyle = "rgba(24,40,30,0.95)";
    ctx.fill();
    for (let i = 0; i < 220; i++) {
      const x = rnd() * this.w;
      const y = this.h * (0.6 + rnd() * 0.38);
      ctx.globalAlpha = a * (0.4 + 0.6 * Math.abs(Math.sin(this.t * 2 + i)));
      this._ball(x, y, rnd() * 1.6 + 0.5, "#ffdd99");
    }
    ctx.globalAlpha = a;
  }

  _scene_planet(a) {
    const { ctx } = this, R = this.R;
    const g = ctx.createRadialGradient(this.cx - R * 0.2, this.cy - R * 0.2, R * 0.1, this.cx, this.cy, R * 0.8);
    g.addColorStop(0, "#8fd0ff");
    g.addColorStop(0.5, "#2f6bb0");
    g.addColorStop(1, "#0b2a4a");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(this.cx, this.cy, R * 0.72, 0, 7); ctx.fill();
    // continents
    const rnd = rng(53);
    ctx.fillStyle = "rgba(70,120,70,0.75)";
    for (let i = 0; i < 9; i++) {
      const ang = rnd() * 7, rr = rnd() * R * 0.55;
      ctx.beginPath();
      ctx.ellipse(this.cx + Math.cos(ang) * rr, this.cy + Math.sin(ang) * rr, R * (0.08 + rnd() * 0.14), R * (0.06 + rnd() * 0.1), rnd() * 7, 0, 7);
      ctx.fill();
    }
    // atmosphere rim
    ctx.strokeStyle = "rgba(150,200,255,0.5)"; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(this.cx, this.cy, R * 0.72, 0, 7); ctx.stroke();
  }

  _scene_system(a) {
    const { ctx } = this, R = this.R;
    this._ball(this.cx, this.cy, R * 0.08, "#ffe08a");
    for (let i = 1; i <= 5; i++) {
      const rr = R * (0.15 + i * 0.14);
      ctx.beginPath(); ctx.arc(this.cx, this.cy, rr, 0, 7);
      ctx.strokeStyle = "rgba(150,175,205,0.3)"; ctx.lineWidth = 1; ctx.stroke();
      const ang = this.t * (1.4 / i) + i;
      this._ball(this.cx + Math.cos(ang) * rr, this.cy + Math.sin(ang) * rr, 3 + i * 0.6, ["#e0b884", "#8fd18f", "#7fb4ff", "#d9a0e8", "#9aa7b8"][i - 1]);
    }
  }

  _scene_stars(a) {
    const rnd = rng(67);
    for (let i = 0; i < 300; i++) {
      const x = rnd() * this.w, y = rnd() * this.h;
      const b = 0.3 + rnd() * 0.7;
      this.ctx.globalAlpha = a * b * (0.7 + 0.3 * Math.sin(this.t + i));
      const hue = ["#fff", "#ffd9a8", "#a8c8ff", "#ffb98a"][i % 4];
      this._ball(x, y, rnd() * 1.8 + 0.4, hue);
    }
    this.ctx.globalAlpha = a;
  }

  _scene_galaxy(a) {
    const { ctx } = this, R = this.R;
    const rnd = rng(83);
    const arms = 2, spin = this.t * 0.05;
    const g = ctx.createRadialGradient(this.cx, this.cy, 0, this.cx, this.cy, R);
    g.addColorStop(0, "rgba(255,240,210,0.4)");
    g.addColorStop(0.3, "rgba(180,180,255,0.08)");
    g.addColorStop(1, "transparent");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(this.cx, this.cy, R, 0, 7); ctx.fill();
    for (let i = 0; i < 2600; i++) {
      const arm = i % arms;
      const t = Math.pow(rnd(), 0.5);
      const ang = t * 6 + arm * (7 / arms) + spin + (rnd() - 0.5) * 0.5;
      const rr = t * R * 0.95;
      const x = this.cx + Math.cos(ang) * rr;
      const y = this.cy + Math.sin(ang) * rr * 0.62;
      ctx.globalAlpha = a * (0.5 + rnd() * 0.5);
      this._ball(x, y, rnd() * 1.2 + 0.3, i % 9 === 0 ? "#a8c8ff" : "#fff");
    }
    ctx.globalAlpha = a;
  }

  _scene_cluster(a) {
    const rnd = rng(97);
    for (let i = 0; i < 40; i++) {
      const x = rnd() * this.w, y = rnd() * this.h;
      const r = rnd() * this.R * 0.14 + 4;
      const g = this.ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, "rgba(255,245,220,0.7)");
      g.addColorStop(1, "transparent");
      this.ctx.fillStyle = g;
      this.ctx.beginPath(); this.ctx.ellipse(x, y, r, r * (0.4 + rnd() * 0.5), rnd() * 7, 0, 7); this.ctx.fill();
    }
  }

  _scene_web(a) {
    const { ctx } = this;
    const rnd = rng(103);
    const nodes = [];
    for (let i = 0; i < 40; i++) nodes.push([rnd() * this.w, rnd() * this.h]);
    ctx.strokeStyle = "rgba(120,150,220,0.18)"; ctx.lineWidth = 1;
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const d = Math.hypot(nodes[i][0] - nodes[j][0], nodes[i][1] - nodes[j][1]);
        if (d < this.w * 0.22) {
          ctx.beginPath(); ctx.moveTo(...nodes[i]); ctx.lineTo(...nodes[j]); ctx.stroke();
        }
      }
    }
    for (const [x, y] of nodes) {
      const g = ctx.createRadialGradient(x, y, 0, x, y, 26);
      g.addColorStop(0, "rgba(200,220,255,0.6)"); g.addColorStop(1, "transparent");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 26, 0, 7); ctx.fill();
    }
  }

  _scene_universe(a) {
    const { ctx } = this, R = this.R;
    // CMB-like mottled sphere
    const rnd = rng(113);
    ctx.save();
    ctx.beginPath(); ctx.arc(this.cx, this.cy, R * 0.85, 0, 7); ctx.clip();
    for (let i = 0; i < 900; i++) {
      const x = this.cx + (rnd() - 0.5) * R * 1.8;
      const y = this.cy + (rnd() - 0.5) * R * 1.8;
      const v = rnd();
      ctx.fillStyle = v > 0.6 ? "rgba(255,140,90,0.5)" : v > 0.3 ? "rgba(90,140,255,0.5)" : "rgba(120,120,160,0.4)";
      ctx.beginPath(); ctx.arc(x, y, rnd() * 10 + 4, 0, 7); ctx.fill();
    }
    ctx.restore();
    ctx.strokeStyle = "rgba(200,180,255,0.6)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(this.cx, this.cy, R * 0.85, 0, 7); ctx.stroke();
  }

  _scene_multiverse(a) {
    const rnd = rng(127);
    for (let i = 0; i < 26; i++) {
      const x = rnd() * this.w, y = rnd() * this.h;
      const r = rnd() * this.R * 0.3 + this.R * 0.06;
      const drift = Math.sin(this.t * 0.3 + i) * 6;
      const g = this.ctx.createRadialGradient(x + drift, y, 0, x + drift, y, r);
      const hue = 180 + rnd() * 160;
      g.addColorStop(0, `hsla(${hue},70%,70%,0.5)`);
      g.addColorStop(0.7, `hsla(${hue},70%,55%,0.12)`);
      g.addColorStop(1, "transparent");
      this.ctx.fillStyle = g;
      this.ctx.beginPath(); this.ctx.arc(x + drift, y, r, 0, 7); this.ctx.fill();
      this.ctx.strokeStyle = `hsla(${hue},70%,75%,0.35)`;
      this.ctx.lineWidth = 1;
      this.ctx.beginPath(); this.ctx.arc(x + drift, y, r, 0, 7); this.ctx.stroke();
    }
  }

  _scene_omniverse(a) {
    const { ctx } = this;
    const rnd = rng(131);
    // nested luminous rings receding to a point — "all that could be"
    for (let i = 0; i < 60; i++) {
      const f = i / 60;
      const r = this.R * (1.3 - f) * (0.9 + 0.1 * Math.sin(this.t + i));
      const hue = (this.t * 20 + i * 12) % 360;
      ctx.strokeStyle = `hsla(${hue},80%,70%,${a * (0.05 + 0.25 * f)})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(this.cx, this.cy, Math.abs(r), 0, 7); ctx.stroke();
    }
    const g = ctx.createRadialGradient(this.cx, this.cy, 0, this.cx, this.cy, this.R * 0.3);
    g.addColorStop(0, "rgba(255,255,255,0.9)"); g.addColorStop(1, "transparent");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(this.cx, this.cy, this.R * 0.3, 0, 7); ctx.fill();
  }

  _ball(x, y, r, color) {
    const ctx = this.ctx;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r * 2);
    g.addColorStop(0, color);
    g.addColorStop(0.5, color);
    g.addColorStop(1, "transparent");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r * 2, 0, 7); ctx.fill();
  }

  _caption() {}
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function smooth(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }

function humanScale(logM) {
  const m = Math.pow(10, logM);
  const units = [
    [9.461e15, "light-years"], [1.496e11, "AU"], [1000, "km"],
    [1, "m"], [1e-3, "mm"], [1e-6, "µm"], [1e-9, "nm"], [1e-12, "pm"],
  ];
  for (const [scale, name] of units) {
    if (m >= scale) {
      const v = m / scale;
      return `${v >= 100 ? v.toExponential(1) : v.toPrecision(2)} ${name}`;
    }
  }
  return `${m.toExponential(1)} m`;
}
