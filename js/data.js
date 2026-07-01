// Catalog loading and derived star records.

import { ciToTemp, lumFromAbsmag, spectLetter } from "./astro.js";

export const FLAG_PLANETS = 1;
export const FLAG_SYNTH = 2;
export const FLAG_NAMED = 4;

// Search aliases: IAU proper names in the catalog aren't always what people
// type. Keys are lowercase queries, values are catalog names.
export const ALIASES = {
  "sun": "Sol",
  "alpha centauri": "Rigil Kentaurus",
  "alpha centauri a": "Rigil Kentaurus",
  "alpha centauri b": "Toliman",
  "alpha cen": "Rigil Kentaurus",
  "40 eridani": "Keid",
  "40 eri": "Keid",
  "omicron2 eridani": "Keid",
  "epsilon eridani": "Ran",
  "eps eridani": "Ran",
  "51 pegasi": "Helvetios",
  "51 peg": "Helvetios",
  "epsilon indi": "Eps Ind",
  "beta pictoris": "Bet Pic",
  "polaris": "Polaris",
  "north star": "Polaris",
  "vulcan": "Keid",
  "erid": "Keid",
  "rocky's home": "Keid",
  "arrakis": "Canopus",
  "dune": "Canopus",
  "pandora": "Rigil Kentaurus",
  "trisolaris": "Rigil Kentaurus",
  "babylon 5": "Ran",
  "adrian": "tau Ceti",
};

export class Star {
  constructor(rec) {
    const [id, name, x, y, z, mag, absmag, ci, lum, spect, con, flags] = rec;
    this.id = id;
    this.name = name;
    this.x = x; this.y = y; this.z = z;
    this.mag = mag;
    this.absmag = absmag;
    this.ci = ci;
    this.lum = lum;
    this.spect = spect;
    this.con = con;
    this.flags = flags;
    this.dist = Math.sqrt(x * x + y * y + z * z);
    this.system = null; // attached after systems.json loads
  }
  get hasPlanets() { return (this.flags & FLAG_PLANETS) !== 0; }
  get isSynthetic() { return (this.flags & FLAG_SYNTH) !== 0; }
  get isNamed() { return (this.flags & FLAG_NAMED) !== 0; }
  get spectClass() { return spectLetter(this.spect); }

  // Effective temperature: measured host Teff > color-index estimate.
  temp() {
    const st = this.system && this.system.star;
    if (st && st.st_teff) return { v: st.st_teff, est: false };
    const t = ciToTemp(this.ci);
    return t ? { v: t, est: true } : null;
  }
  luminosity() {
    if (this.lum != null) return { v: this.lum, est: this.isSynthetic };
    const l = lumFromAbsmag(this.absmag);
    return l != null ? { v: l, est: true } : null;
  }
}

async function fetchJSON(url, onProgress) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  const total = +res.headers.get("content-length") || 0;
  if (!res.body || !total || !onProgress) return res.json();
  const reader = res.body.getReader();
  const chunks = [];
  let got = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    got += value.length;
    onProgress(got / total);
  }
  const buf = new Uint8Array(got);
  let off = 0;
  for (const c of chunks) { buf.set(c, off); off += c.length; }
  return JSON.parse(new TextDecoder().decode(buf));
}

export async function loadCatalog(onProgress) {
  let p1 = 0, p2 = 0;
  const report = () => onProgress && onProgress((p1 + p2) / 2);
  const [starsRaw, systems] = await Promise.all([
    fetchJSON("data/stars.json", (p) => { p1 = p; report(); }),
    fetchJSON("data/systems.json", (p) => { p2 = p; report(); }),
  ]);

  const stars = starsRaw.stars.map((rec) => new Star(rec));
  const byId = new Map(stars.map((s) => [s.id, s]));
  const byName = new Map();
  for (const s of stars) {
    const key = s.name.toLowerCase();
    if (!byName.has(key)) byName.set(key, s);
  }

  for (const [sid, sys] of Object.entries(systems)) {
    const star = byId.get(+sid);
    if (star) star.system = sys;
  }

  return { stars, byId, byName, systems };
}

export function findByName(catalog, name) {
  const key = name.toLowerCase();
  const aliased = ALIASES[key];
  if (aliased) {
    const hit = catalog.byName.get(aliased.toLowerCase());
    if (hit) return hit;
  }
  return catalog.byName.get(key) || null;
}

// Lightweight substring search across names, aliases and host designations.
export function searchStars(catalog, query, limit = 12) {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const scored = [];
  const seen = new Set();
  const push = (star, score) => {
    if (seen.has(star.id)) return;
    seen.add(star.id);
    scored.push({ star, score });
  };
  for (const [alias, target] of Object.entries(ALIASES)) {
    if (alias.startsWith(q) || (q.length > 3 && alias.includes(q))) {
      const s = catalog.byName.get(target.toLowerCase());
      if (s) push(s, alias.startsWith(q) ? 1.5 : 3.5);
    }
  }
  for (const s of catalog.stars) {
    const n = s.name.toLowerCase();
    let score = null;
    if (n === q) score = 0;
    else if (n.startsWith(q)) score = 1;
    else if (n.includes(q)) score = 3;
    if (score != null) {
      if (s.hasPlanets) score -= 0.4;
      if (s.isNamed) score -= 0.3;
      if (s.mag != null) score += Math.max(0, s.mag) / 40;
      push(s, score);
    }
  }
  scored.sort((a, b) => a.score - b.score);
  return scored.slice(0, limit).map((r) => r.star);
}
