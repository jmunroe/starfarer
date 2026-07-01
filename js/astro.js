// Astrophysical helper math. Every "estimate" here is labeled as such in the
// UI; measured catalog values always take precedence over derived ones.

export const PC_TO_LY = 3.26156;
export const SUN_TEFF = 5772;          // K
export const RJ_TO_RE = 11.209;        // Jupiter radii -> Earth radii
export const MJ_TO_ME = 317.83;        // Jupiter masses -> Earth masses

// Ballesteros (2012): effective temperature from B-V color index.
export function ciToTemp(ci) {
  if (ci == null || !isFinite(ci)) return null;
  return 4600 * (1 / (0.92 * ci + 1.7) + 1 / (0.92 * ci + 0.62));
}

// Solar luminosities from absolute visual magnitude (bolometric shortcut).
export function lumFromAbsmag(absmag) {
  if (absmag == null || !isFinite(absmag)) return null;
  return Math.pow(10, (4.83 - absmag) / 2.5);
}

// Stefan-Boltzmann: stellar radius (solar radii) from L (Lsun) and Teff (K).
export function radiusFromLumTemp(lum, teff) {
  if (!lum || !teff) return null;
  return Math.sqrt(lum) * Math.pow(SUN_TEFF / teff, 2);
}

// Very rough main-sequence mass from luminosity (solar masses). Only shown
// for dwarf-like stars, always flagged as an estimate.
export function massFromLum(lum) {
  if (!lum || lum <= 0) return null;
  if (lum > 30000 || lum < 1e-5) return null;
  return Math.pow(lum, 1 / 3.8);
}

// Conservative habitable zone bounds in AU (Kopparapu-style flux limits).
export function habitableZone(lum) {
  if (!lum || lum <= 0) return null;
  return { inner: Math.sqrt(lum / 1.1), outer: Math.sqrt(lum / 0.53) };
}

// Planet equilibrium temperature (K), zero albedo, from stellar L and a (AU).
export function eqTemp(lum, smaAU) {
  if (!lum || !smaAU) return null;
  return 278.5 * Math.pow(lum, 0.25) / Math.sqrt(smaAU);
}

// Blackbody-ish color for a stellar temperature. Returns [r,g,b] in 0..1.
// Piecewise fit in the spirit of Tanner Helland's photographic curve,
// tweaked so M stars stay warm-orange rather than deep red on dark bg.
export function tempToColor(t) {
  if (!t || !isFinite(t)) return [0.78, 0.82, 0.88];
  t = Math.min(40000, Math.max(1000, t)) / 100;
  let r, g, b;
  if (t <= 66) {
    r = 1;
    g = Math.min(1, Math.max(0, 0.3900816 * Math.log(t) - 0.6318414));
    b = t <= 19 ? 0 : Math.min(1, Math.max(0, 0.5432068 * Math.log(t - 10) - 1.19625408));
  } else {
    r = Math.min(1, Math.max(0, 1.2929362 * Math.pow(t - 60, -0.1332047)));
    g = Math.min(1, Math.max(0, 1.1298909 * Math.pow(t - 60, -0.0755148)));
    b = 1;
  }
  // lift the floor a bit so cool stars remain visible on near-black
  return [r, 0.25 + 0.75 * g, 0.2 + 0.8 * b].map((v) => Math.min(1, v));
}

export const PLANET_CLASSES = {
  rocky:   { label: "rocky",        color: "#e0b884" },
  super:   { label: "super-Earth",  color: "#8fd18f" },
  neptune: { label: "Neptune-like", color: "#7fb4ff" },
  giant:   { label: "gas giant",    color: "#d9a0e8" },
  unknown: { label: "unknown",      color: "#9aa7b8" },
};

// Classify by radius when known, else by mass.
export function planetClass(p) {
  const re = p.radius_rj != null ? p.radius_rj * RJ_TO_RE : null;
  const me = p.mass_mj != null ? p.mass_mj * MJ_TO_ME : null;
  if (re != null) {
    if (re < 1.35) return "rocky";
    if (re < 2.1) return "super";
    if (re < 6.5) return "neptune";
    return "giant";
  }
  if (me != null) {
    if (me < 2.2) return "rocky";
    if (me < 10) return "super";
    if (me < 60) return "neptune";
    return "giant";
  }
  return "unknown";
}

// Spectral class letter for filtering / description.
export function spectLetter(spect) {
  if (!spect) return "";
  const m = /^\s*([OBAFGKMLTYCWSD])/i.exec(spect);
  return m ? m[1].toUpperCase() : "";
}

const SPECT_DESC = {
  O: "blue supergiant-class, extremely hot", B: "blue-white, very hot",
  A: "white, hot", F: "yellow-white", G: "yellow, Sun-like",
  K: "orange dwarf/giant", M: "red dwarf or red giant",
  L: "very cool dwarf", T: "methane brown dwarf", Y: "coldest brown dwarf",
  C: "carbon star", W: "Wolf-Rayet star", S: "zirconium-rich giant",
  D: "white dwarf",
};
export function spectDescription(spect) {
  return SPECT_DESC[spectLetter(spect)] || "";
}

// ---- formatting ----
export function fmt(v, digits = 2) {
  if (v == null || !isFinite(v)) return "—";
  if (v !== 0 && (Math.abs(v) < 0.01 || Math.abs(v) >= 1e6)) {
    return v.toExponential(1);
  }
  const s = v.toFixed(digits);
  return s.replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");
}

export function fmtDist(pc, unit) {
  if (pc == null || !isFinite(pc)) return "—";
  return unit === "pc" ? `${fmt(pc, pc < 10 ? 2 : 1)} pc`
                       : `${fmt(pc * PC_TO_LY, pc * PC_TO_LY < 10 ? 2 : 1)} ly`;
}

export function fmtPeriod(days) {
  if (days == null) return "—";
  if (days < 100) return `${fmt(days, days < 10 ? 2 : 1)} days`;
  return `${fmt(days / 365.25, 2)} years`;
}
