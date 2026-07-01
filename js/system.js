// Planetary system view: an animated top-down orbit map on a 2D canvas with
// habitable-zone shading, plus planet detail cards.

import {
  habitableZone, eqTemp, planetClass, PLANET_CLASSES, tempToColor, ciToTemp,
  fmt, fmtPeriod, RJ_TO_RE, MJ_TO_ME,
} from "./astro.js";

const TAU = Math.PI * 2;

export class SystemView {
  constructor(root) {
    this.root = root;
    this.canvas = root.querySelector("#sys-canvas");
    this.ctx = this.canvas.getContext("2d");
    this.side = root.querySelector("#sys-side");
    this.title = root.querySelector("#sys-title");
    this.playBtn = root.querySelector("#sys-play");
    this.speedEl = root.querySelector("#sys-speed");
    this.logEl = root.querySelector("#sys-log");
    this.playing = true;
    this.simT = 0;
    this.lastNow = null;
    this.star = null;
    this.planets = [];
    this.selectedPlanet = null;
    this.open = false;

    this.playBtn.addEventListener("click", () => {
      this.playing = !this.playing;
      this.playBtn.textContent = this.playing ? "⏸" : "▶";
    });
    this.logEl.addEventListener("change", () => this._layout());
    window.addEventListener("resize", () => { if (this.open) this._layout(); });
    this.canvas.addEventListener("click", (e) => this._pick(e));
    this._tick = this._tick.bind(this);
  }

  show(star) {
    this.star = star;
    const sys = star.system;
    const lum = star.luminosity();
    this.lum = lum ? lum.v : null;
    this.hz = habitableZone(this.lum);
    this.planets = sys.planets.map((p, i) => {
      // fall back through period (Kepler, host mass) for a plottable orbit
      let sma = p.sma_au;
      let smaEst = false;
      if (sma == null && p.period_d != null) {
        const mstar = (sys.star && sys.star.st_mass) || 1;
        sma = Math.cbrt(mstar * Math.pow(p.period_d / 365.25, 2));
        smaEst = true;
      }
      let temp = p.temp_k, tempEst = false;
      if (temp == null && this.lum && sma) {
        temp = eqTemp(this.lum, sma);
        tempEst = true;
      }
      const cls = planetClass(p);
      return {
        ...p, sma, smaEst, temp, tempEst, cls,
        color: PLANET_CLASSES[cls].color,
        phase: (i * 2.399963) % TAU, // golden-angle spread at t=0
        inHZ: !!(this.hz && sma && sma >= this.hz.inner && sma <= this.hz.outer),
      };
    });
    this.selectedPlanet = null;
    this.title.innerHTML = `${esc(sys.host)} <span class="sys-count">· ${this.planets.length} planet${this.planets.length === 1 ? "" : "s"}</span>`;
    this._renderCards();
    this.root.hidden = false;
    this.open = true;
    this.simT = 0;
    this.lastNow = null;
    this._layout();
    requestAnimationFrame(this._tick);
  }

  hide() {
    this.open = false;
    this.root.hidden = true;
  }

  _layout() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = this.root.clientWidth, h = this.root.clientHeight;
    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.w = w; this.h = h;
    this.cx = w * 0.42;
    this.cy = h * 0.54;

    const plotted = this.planets.filter((p) => p.sma);
    const maxA = Math.max(
      0.05,
      ...plotted.map((p) => p.sma),
      this.hz ? this.hz.outer * 1.05 : 0,
    );
    const minA = Math.min(...(plotted.length ? plotted.map((p) => p.sma) : [0.05]));
    const rMax = Math.min(this.cx, this.cy) - 40;
    const rMin = 46;
    this.useLog = this.logEl.checked;
    if (this.useLog) {
      const lmin = Math.log10(Math.max(minA * 0.6, 1e-4));
      const lmax = Math.log10(maxA * 1.15);
      this.a2r = (a) => rMin + (Math.log10(Math.max(a, 1e-4)) - lmin) / Math.max(lmax - lmin, 0.2) * (rMax - rMin);
    } else {
      this.a2r = (a) => rMin + (a / (maxA * 1.15)) * (rMax - rMin);
    }
  }

  _pick(e) {
    const rect = this.canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    let best = null, bestD = 22;
    for (const p of this.planets) {
      if (!p._px) continue;
      const d = Math.hypot(p._px - mx, p._py - my);
      if (d < bestD) { bestD = d; best = p; }
    }
    this.selectPlanet(best ? best.name : null);
  }

  selectPlanet(name) {
    this.selectedPlanet = name;
    for (const el of this.side.querySelectorAll(".pcard")) {
      el.classList.toggle("sel", el.dataset.name === name);
      if (el.dataset.name === name) el.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }

  _renderCards() {
    this.side.innerHTML = "";
    for (const p of this.planets) {
      const card = document.createElement("div");
      card.className = "pcard";
      card.dataset.name = p.name;
      const cls = PLANET_CLASSES[p.cls];
      const re = p.radius_rj != null ? p.radius_rj * RJ_TO_RE : null;
      const me = p.mass_mj != null ? p.mass_mj * MJ_TO_ME : null;
      card.innerHTML = `
        <div class="pc-head">
          <span class="planet-dot" style="background:${cls.color}"></span>
          ${esc(p.name)}
          ${p.inHZ ? '<span class="hz-badge">HZ</span>' : ""}
          <span class="pc-type">${cls.label}</span>
        </div>
        <div class="kv">
          ${kv("mass", me != null ? `${fmt(me, me < 20 ? 2 : 0)} M⊕` : p.mass_mj != null ? `${fmt(p.mass_mj)} MJ` : "—")}
          ${kv("radius", re != null ? `${fmt(re, 2)} R⊕` : "—")}
          ${kv("orbital period", fmtPeriod(p.period_d))}
          ${kv("semi-major axis", p.sma != null ? `${fmt(p.sma, p.sma < 1 ? 3 : 2)} AU` : "—", p.smaEst)}
          ${kv("eccentricity", p.ecc != null ? fmt(p.ecc, 3) : "—")}
          ${kv("temperature", p.temp != null ? `${fmt(p.temp, 0)} K (${fmt(p.temp - 273.15, 0)} °C)` : "—", p.tempEst)}
          ${kv("discovered", p.method === "in situ" ? "known since antiquity" : p.year ? `${p.year} · ${esc(p.method || "?")}` : esc(p.method || "—"))}
        </div>
        ${p.inHZ ? `<div class="pc-blurb">Orbits inside the star's estimated habitable zone, where liquid water could exist on a rocky surface.</div>` : ""}
      `;
      card.addEventListener("click", () => this.selectPlanet(p.name));
      this.side.appendChild(card);
    }
    const est = this.planets.some((p) => p.smaEst || p.tempEst);
    if (est) {
      const note = document.createElement("div");
      note.className = "est-note";
      note.style.padding = "0 4px";
      note.innerHTML = "<b>~</b> derived from other measured values (Kepler's third law / stellar flux)";
      this.side.appendChild(note);
    }
  }

  _tick(now) {
    if (!this.open) return;
    requestAnimationFrame(this._tick);
    if (this.lastNow == null) this.lastNow = now;
    const dt = Math.min(0.1, (now - this.lastNow) / 1000);
    this.lastNow = now;
    if (this.playing) {
      // slider is log-speed: 1 => ~8 Earth-years per second on screen
      const speed = Math.pow(10, +this.speedEl.value - 1) * 8;
      this.simT += dt * speed;
    }
    this._draw(now / 1000);
  }

  _draw(t) {
    const { ctx, w, h, cx, cy } = this;
    ctx.clearRect(0, 0, w, h);

    // habitable zone annulus
    if (this.hz) {
      const r0 = this.a2r(this.hz.inner), r1 = this.a2r(this.hz.outer);
      ctx.beginPath();
      ctx.arc(cx, cy, r1, 0, TAU);
      ctx.arc(cx, cy, r0, 0, TAU, true);
      ctx.fillStyle = "rgba(111, 220, 140, 0.07)";
      ctx.fill();
      for (const r of [r0, r1]) {
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, TAU);
        ctx.strokeStyle = "rgba(111, 220, 140, 0.35)";
        ctx.setLineDash([4, 6]);
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      ctx.setLineDash([]);
      ctx.fillStyle = "rgba(111, 220, 140, 0.75)";
      ctx.font = "10.5px 'Segoe UI', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("habitable zone", cx, cy - (this.a2r(this.hz.inner) + this.a2r(this.hz.outer)) / 2 - 6);
    }

    // star
    const st = (this.star.system && this.star.system.star) || {};
    const teff = st.st_teff || ciToTemp(this.star.ci) || 5500;
    const [r, g, b] = tempToColor(teff);
    const sr = Math.min(34, 10 + Math.sqrt(st.st_radius || 1) * 9);
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, sr * 2.6);
    const col = `rgb(${(r * 255) | 0},${(g * 255) | 0},${(b * 255) | 0})`;
    grad.addColorStop(0, col);
    grad.addColorStop(0.45, `rgba(${(r * 255) | 0},${(g * 255) | 0},${(b * 255) | 0},0.35)`);
    grad.addColorStop(1, "transparent");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, sr * 2.6, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(cx, cy, sr * 0.55, 0, TAU);
    ctx.fill();

    // orbits + planets
    ctx.font = "11px 'Segoe UI', sans-serif";
    for (const p of this.planets) {
      if (!p.sma) { p._px = null; continue; }
      const orbR = this.a2r(p.sma);
      const ecc = Math.min(p.ecc || 0, 0.85);
      const bR = orbR * Math.sqrt(1 - ecc * ecc);
      const sel = this.selectedPlanet === p.name;
      ctx.beginPath();
      ctx.ellipse(cx - orbR * ecc, cy, orbR, bR, 0, 0, TAU);
      ctx.strokeStyle = sel ? "rgba(127,212,255,0.8)" : "rgba(150,175,205,0.28)";
      ctx.lineWidth = sel ? 1.6 : 1;
      ctx.stroke();

      const yrs = p.period_d ? p.period_d / 365.25 : Math.pow(p.sma, 1.5);
      const ang = p.phase + (this.simT / Math.max(yrs, 1e-4)) * TAU;
      const px = cx - orbR * ecc + Math.cos(ang) * orbR;
      const py = cy + Math.sin(ang) * bR;
      p._px = px; p._py = py;

      const re = p.radius_rj != null ? p.radius_rj * RJ_TO_RE
        : p.mass_mj != null ? Math.cbrt(p.mass_mj * MJ_TO_ME) : 1.5;
      const pr = Math.max(2.5, Math.min(11, 2.2 + Math.sqrt(re) * 1.9));
      if (p.inHZ) {
        ctx.beginPath();
        ctx.arc(px, py, pr + 4, 0, TAU);
        ctx.strokeStyle = "rgba(111,220,140,0.7)";
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(px, py, pr, 0, TAU);
      ctx.fillStyle = p.color;
      ctx.fill();
      if (sel) {
        ctx.beginPath();
        ctx.arc(px, py, pr + 7, 0, TAU);
        ctx.strokeStyle = "rgba(127,212,255,0.9)";
        ctx.stroke();
      }
      ctx.fillStyle = sel ? "#cfe9ff" : "rgba(200,218,240,0.7)";
      ctx.textAlign = "left";
      const short = p.name.replace(this.star.system.host, "").trim() || p.name;
      ctx.fillText(short, px + pr + 5, py + 3.5);
    }

    // unplottable planets note
    const missing = this.planets.filter((p) => !p.sma).length;
    if (missing) {
      ctx.fillStyle = "rgba(130,153,181,0.8)";
      ctx.textAlign = "left";
      ctx.fillText(`+ ${missing} planet${missing > 1 ? "s" : ""} without orbit data (see cards)`, 16, h - 40);
    }
  }
}

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}
function kv(k, v, est = false) {
  return `<span class="k">${k}</span><span class="v${est ? " est" : ""}">${v}</span>`;
}
