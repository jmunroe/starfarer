// Starfarer — application entry point. Loads catalogs, wires the star map,
// info panel, system view, sci-fi tours, cosmic zoom, search and filters.

import { loadCatalog, findByName, searchStars, FLAG_PLANETS } from "./data.js";
import { StarMap } from "./starmap.js";
import { SystemView } from "./system.js";
import { CosmicZoom } from "./cosmiczoom.js";
import { TOURS, FICTION_NOTES } from "./tours.js";
import {
  tempToColor, radiusFromLumTemp, massFromLum, habitableZone,
  spectDescription, spectLetter, planetClass, PLANET_CLASSES,
  fmt, fmtDist, fmtPeriod, RJ_TO_RE, MJ_TO_ME,
} from "./astro.js";

const $ = (sel) => document.querySelector(sel);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

const state = {
  units: localStorage.getItem("units") || "ly", // 'ly' | 'pc'
  catalog: null, map: null, system: null, zoom: null,
  tour: null, tourStep: 0,
  filters: { hosts: false, eye: false, spect: new Set(["O", "B", "A", "F", "G", "K", "M", "other"]), maxDist: 100 },
};

async function main() {
  const fill = $("#load-fill");
  try {
    state.catalog = await loadCatalog((p) => { fill.style.width = Math.round(p * 100) + "%"; });
  } catch (e) {
    $(".load-sub").textContent = "failed to load catalogs: " + e.message;
    console.error(e);
    return;
  }
  fill.style.width = "100%";

  state.map = new StarMap($("#scene-container"), state.catalog, { onSelect: showStar });
  state.map.units = state.units;
  state.map.onFrame = updateHud;
  state.system = new SystemView($("#systemview"));
  state.zoom = new CosmicZoom($("#cosmiczoom"));

  buildTours();
  wireUI();

  setTimeout(() => $("#loading").classList.add("done"), 250);

  // deep-link: #star=Name or #tour=id or #zoom
  applyHash();
  window.addEventListener("hashchange", applyHash);
  if (!location.hash) {
    // gentle intro framing on the solar neighborhood
    const sol = findByName(state.catalog, "Sol");
    if (sol) setTimeout(() => state.map.select(sol), 400);
  }
}

// ---------------- info panel ----------------
function showStar(star) {
  const panel = $("#infopanel");
  panel.hidden = false;
  $("#info-name").textContent = star.name;

  const lum = star.luminosity();
  const temp = star.temp();
  const [r, g, b] = tempToColor(temp ? temp.v : 5500);
  const swatch = `<span class="star-swatch" style="background:rgb(${(r*255)|0},${(g*255)|0},${(b*255)|0})"></span>`;
  const desc = spectDescription(star.spect);
  const tagBits = [
    star.spect ? star.spect : (star.isSynthetic ? "exoplanet host" : "star"),
    desc, `constellation ${star.con || "—"}`,
  ].filter(Boolean).map(esc);
  $("#info-tag").innerHTML = swatch + tagBits.join(" · ");

  const st = star.system && star.system.star;
  const rows = [];
  rows.push(kv("Distance", star.id === 0 ? "0 (home)" : fmtDist(star.dist, state.units)));
  if (star.mag != null) rows.push(kv("Apparent magnitude", fmt(star.mag, 2)));
  if (star.absmag != null) rows.push(kv("Absolute magnitude", fmt(star.absmag, 2)));
  if (temp) rows.push(kv("Temperature", `${fmt(temp.v, 0)} K`, temp.est));
  if (lum) rows.push(kv("Luminosity", `${fmt(lum.v, lum.v < 10 ? 3 : 1)} L☉`, lum.est));

  // radius / mass: measured host values first, else derived
  let radius = st && st.st_radius != null ? { v: st.st_radius, est: false } : null;
  if (!radius && lum && temp) { const rr = radiusFromLumTemp(lum.v, temp.v); if (rr) radius = { v: rr, est: true }; }
  if (radius) rows.push(kv("Radius", `${fmt(radius.v, 2)} R☉`, radius.est));
  let mass = st && st.st_mass != null ? { v: st.st_mass, est: false } : null;
  if (!mass && lum) { const mm = massFromLum(lum.v); if (mm) mass = { v: mm, est: true }; }
  if (mass) rows.push(kv("Mass", `${fmt(mass.v, 2)} M☉`, mass.est));
  if (st && st.st_age != null) rows.push(kv("Age", `${fmt(st.st_age, 2)} Gyr`));
  if (st && st.st_feh != null) rows.push(kv("Metallicity [Fe/H]", fmt(st.st_feh, 2)));

  let body = `<div class="kv">${rows.join("")}</div>`;
  if (rows.some((x) => x.includes("est"))) {
    body += `<div class="est-note"><b>~</b> estimated from color/brightness where a direct measurement isn't in the catalog</div>`;
  }

  // planets
  if (star.hasPlanets && star.system) {
    const planets = star.system.planets;
    body += `<div class="info-section">${planets.length} PLANET${planets.length === 1 ? "" : "S"}</div>`;
    const hz = lum ? habitableZone(lum.v) : null;
    for (const p of planets) {
      const cls = classDot(p);
      const inHZ = hzTest(p, hz, star);
      const meta = planetMeta(p);
      body += `<div class="planet-row" data-planet="${esc(p.name)}">
        <span class="planet-dot" style="background:${cls.color}"></span>
        <span class="p-name">${esc(shortPlanet(p.name))}${inHZ ? '<span class="hz-badge">HZ</span>' : ""}</span>
        <span class="p-meta">${meta}</span></div>`;
    }
    body += `<button class="open-system-btn">◎ Open orbit view</button>`;
  }

  // fiction notes
  const notes = FICTION_NOTES[star.name];
  if (notes) {
    for (const n of notes) {
      body += `<div class="fiction-note"><span class="fn-src">${esc(n.source)}</span>${esc(n.text)}</div>`;
    }
  }

  $("#info-body").innerHTML = body;
  $("#info-body").querySelectorAll(".planet-row").forEach((row) => {
    row.addEventListener("click", () => openSystem(star, row.dataset.planet));
  });
  const btn = $("#info-body").querySelector(".open-system-btn");
  if (btn) btn.addEventListener("click", () => openSystem(star));

  updateHud();
}

function kv(k, v, est = false) {
  return `<span class="k">${esc(k)}</span><span class="v${est ? " est" : ""}">${v}</span>`;
}
function classDot(p) {
  return PLANET_CLASSES[planetClass(p)];
}
function shortPlanet(name) {
  return name;
}
function planetMeta(p) {
  const bits = [];
  if (p.radius_rj != null) bits.push(`${fmt(p.radius_rj * RJ_TO_RE, 1)} R⊕`);
  else if (p.mass_mj != null) bits.push(`${fmt(p.mass_mj * MJ_TO_ME, p.mass_mj * MJ_TO_ME < 20 ? 1 : 0)} M⊕`);
  if (p.period_d != null) bits.push(fmtPeriod(p.period_d));
  return bits.join(" · ") || (p.method || "");
}
function hzTest(p, hz, star) {
  let sma = p.sma_au;
  if (sma == null && p.period_d != null) {
    const m = (star.system.star && star.system.star.st_mass) || 1;
    sma = Math.cbrt(m * Math.pow(p.period_d / 365.25, 2));
  }
  return !!(hz && sma && sma >= hz.inner && sma <= hz.outer);
}

// ---------------- system view ----------------
function openSystem(star, focusPlanet = null) {
  state.system.show(star);
  if (focusPlanet) requestAnimationFrame(() => state.system.selectPlanet(focusPlanet));
  state.map.paused = true;
}
function closeSystem() {
  state.system.hide();
  state.map.paused = false;
}

// ---------------- tours ----------------
function buildTours() {
  const list = $("#tour-list");
  list.innerHTML = "";
  for (const t of TOURS) {
    const div = document.createElement("div");
    div.className = "tour-item";
    div.innerHTML = `<div class="t-src">${esc(t.source)}</div>
      <div class="t-name">${esc(t.name)}</div>
      <div class="t-desc">${esc(t.desc)}</div>`;
    div.addEventListener("click", () => { startTour(t); closePanels(); });
    list.appendChild(div);
  }
}
function startTour(tour) {
  state.tour = tour;
  state.tourStep = -1;
  $("#tourcard").hidden = false;
  $("#tour-title").textContent = `${tour.name} — ${tour.source}`;
  nextStop(1);
}
function nextStop(dir) {
  const t = state.tour;
  if (!t) return;
  state.tourStep = Math.max(0, Math.min(t.stops.length - 1, state.tourStep + dir));
  const stop = t.stops[state.tourStep];
  $("#tour-stopname").textContent = stop.title;
  $("#tour-story").textContent = stop.story;
  $("#tour-science").innerHTML = "<b>Real science:</b> " + stop.science;
  $("#tour-step").textContent = `${state.tourStep + 1} / ${t.stops.length}`;
  $("#tour-prev").disabled = state.tourStep === 0;
  $("#tour-next").disabled = state.tourStep === t.stops.length - 1;
  const star = findByName(state.catalog, stop.star);
  if (star) {
    state.map.select(star, { fly: true });
    if (stop.openSystem && star.hasPlanets) {
      setTimeout(() => openSystem(star), 1500);
    }
  }
}
function exitTour() {
  state.tour = null;
  $("#tourcard").hidden = true;
}

// ---------------- search ----------------
function wireSearch() {
  const input = $("#search");
  const box = $("#search-results");
  let items = [], sel = -1;

  const render = () => {
    if (!items.length) { box.hidden = true; return; }
    box.innerHTML = items.map((s, i) => {
      const cls = i === sel ? "sr-item sel" : "sr-item";
      const meta = [s.spect || (s.isSynthetic ? "host" : ""), fmtDist(s.dist, state.units)].filter(Boolean).join(" · ");
      const planets = s.hasPlanets ? `<span class="sr-planets">◎ ${s.system ? s.system.planets.length : ""}</span>` : "";
      return `<div class="${cls}" data-i="${i}">
        <span class="sr-name">${esc(s.name)}</span>
        <span class="sr-meta">${esc(meta)} ${planets}</span></div>`;
    }).join("");
    box.hidden = false;
    box.querySelectorAll(".sr-item").forEach((el) => {
      el.addEventListener("click", () => choose(items[+el.dataset.i]));
    });
  };
  const choose = (star) => {
    input.value = "";
    box.hidden = true;
    items = []; sel = -1;
    state.map.select(star, { fly: true });
  };

  input.addEventListener("input", () => {
    items = searchStars(state.catalog, input.value, 12);
    sel = items.length ? 0 : -1;
    render();
  });
  input.addEventListener("keydown", (e) => {
    if (box.hidden) return;
    if (e.key === "ArrowDown") { sel = Math.min(items.length - 1, sel + 1); render(); e.preventDefault(); }
    else if (e.key === "ArrowUp") { sel = Math.max(0, sel - 1); render(); e.preventDefault(); }
    else if (e.key === "Enter") { if (items[sel]) choose(items[sel]); }
    else if (e.key === "Escape") { box.hidden = true; input.blur(); }
  });
  input.addEventListener("blur", () => setTimeout(() => (box.hidden = true), 150));
  input.addEventListener("focus", () => { if (items.length) box.hidden = false; });
}

// ---------------- filters ----------------
function applyFilters() {
  const f = state.filters;
  const maxPc = f.maxDist >= 100 ? Infinity : f.maxDist;
  const count = state.map.applyFilter((s) => {
    if (s.id === 0) return true; // always keep Sol
    if (f.hosts && !s.hasPlanets) return false;
    if (f.eye && (s.mag == null || s.mag > 6.5)) return false;
    if (s.dist > maxPc) return false;
    const letter = spectLetter(s.spect);
    const key = "OBAFGKM".includes(letter) ? letter : "other";
    if (!f.spect.has(key)) return false;
    return true;
  });
  $("#flt-count").textContent = `${count.toLocaleString()} stars shown`;
}

function wireFilters() {
  $("#flt-hosts").addEventListener("change", (e) => { state.filters.hosts = e.target.checked; applyFilters(); });
  $("#flt-eye").addEventListener("change", (e) => { state.filters.eye = e.target.checked; applyFilters(); });
  $("#spect-chips").querySelectorAll(".chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      const k = chip.dataset.sp;
      chip.classList.toggle("on");
      if (chip.classList.contains("on")) state.filters.spect.add(k);
      else state.filters.spect.delete(k);
      applyFilters();
    });
  });
  const distSlider = $("#flt-dist");
  distSlider.addEventListener("input", (e) => {
    const v = +e.target.value;
    state.filters.maxDist = v;
    $("#dist-val").textContent = v >= 100 ? "∞" : fmtDist(v, state.units);
    applyFilters();
  });
  $("#opt-grid").addEventListener("change", (e) => state.map.setGridVisible(e.target.checked));
  $("#opt-labels").addEventListener("change", (e) => state.map.setLabelsVisible(e.target.checked));
  $("#opt-rings").addEventListener("change", (e) => state.map.setRingsVisible(e.target.checked));
  $("#flt-reset").addEventListener("click", () => {
    state.filters = { hosts: false, eye: false, spect: new Set(["O", "B", "A", "F", "G", "K", "M", "other"]), maxDist: 100 };
    $("#flt-hosts").checked = false; $("#flt-eye").checked = false;
    $("#spect-chips").querySelectorAll(".chip").forEach((c) => c.classList.add("on"));
    distSlider.value = 100; $("#dist-val").textContent = "∞";
    applyFilters();
  });
}

// ---------------- panels / nav ----------------
function closePanels() {
  for (const id of ["filters-panel", "tours-panel", "help-panel"]) $("#" + id).hidden = true;
  for (const b of document.querySelectorAll(".nav-btn")) b.classList.remove("active");
  $("#search-results").hidden = true;
}
function togglePanel(panelId, btnId) {
  const panel = $("#" + panelId);
  const willOpen = panel.hidden;
  closePanels();
  panel.hidden = !willOpen;
  if (btnId) $("#" + btnId).classList.toggle("active", willOpen);
}

function wireUI() {
  wireSearch();
  wireFilters();

  $("#btn-tours").addEventListener("click", () => togglePanel("tours-panel", "btn-tours"));
  $("#btn-filters").addEventListener("click", () => togglePanel("filters-panel", "btn-filters"));
  $("#btn-help").addEventListener("click", () => togglePanel("help-panel", "btn-help"));
  $("#btn-zoom").addEventListener("click", () => { closePanels(); state.map.paused = true; state.zoom.show(); });
  $("#cz-close").addEventListener("click", () => { state.zoom.hide(); state.map.paused = false; });

  document.querySelectorAll(".panel-close[data-close]").forEach((b) => {
    b.addEventListener("click", () => { $("#" + b.dataset.close).hidden = true; closePanels(); });
  });
  $("#info-close").addEventListener("click", () => {
    $("#infopanel").hidden = true;
    state.map.selected = null;
    updateHud();
  });

  $("#btn-units").addEventListener("click", toggleUnits);
  $("#btn-units").textContent = state.units.toUpperCase();

  $("#sys-back").addEventListener("click", closeSystem);
  $("#tour-next").addEventListener("click", () => nextStop(1));
  $("#tour-prev").addEventListener("click", () => nextStop(-1));
  $("#tour-exit").addEventListener("click", exitTour);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (!$("#systemview").hidden) closeSystem();
      else if (!$("#cosmiczoom").hidden) { state.zoom.hide(); state.map.paused = false; }
      else { closePanels(); $("#infopanel").hidden = true; state.map.selected = null; exitTour(); }
    }
    if (e.target.tagName === "INPUT") return;
    if (state.tour) {
      if (e.key === "ArrowRight") nextStop(1);
      if (e.key === "ArrowLeft") nextStop(-1);
    }
    if (e.key === "/") { $("#search").focus(); e.preventDefault(); }
  });
}

function toggleUnits() {
  state.units = state.units === "ly" ? "pc" : "ly";
  localStorage.setItem("units", state.units);
  state.map.units = state.units;
  $("#btn-units").textContent = state.units.toUpperCase();
  if (state.map.selected) showStar(state.map.selected);
  const v = state.filters.maxDist;
  $("#dist-val").textContent = v >= 100 ? "∞" : fmtDist(v, state.units);
  updateHud();
}

function updateHud() {
  const s = state.map.selected;
  $("#hud-focus").textContent = s ? `◉ ${s.name}` : "";
  const r = state.map.sph ? state.map.sph.radius : 0;
  $("#hud-range").textContent = "view span ≈ " + fmtDist(r, state.units);
}

// ---------------- deep links ----------------
function applyHash() {
  const h = location.hash.slice(1);
  if (!h) return;
  const params = new URLSearchParams(h);
  if (params.has("zoom")) { state.map.paused = true; state.zoom.show(params.get("zoom") || null); return; }
  if (params.has("tour")) {
    const t = TOURS.find((x) => x.id === params.get("tour"));
    if (t) startTour(t);
    return;
  }
  if (params.has("star")) {
    const star = findByName(state.catalog, params.get("star")) ||
      searchStars(state.catalog, params.get("star"), 1)[0];
    if (star) state.map.select(star, { fly: true });
  }
}

main();
