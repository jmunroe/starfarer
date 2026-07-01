#!/usr/bin/env python3
"""Build the app's data files from source catalogs.

Sources (fetched by tools/fetch_data.sh into tools/raw/):
  - HYG Stellar Database v4.1 (astronexus/HYG-Database, CC BY-SA 4.0)
  - Open Exoplanet Catalogue tables (OpenExoplanetCatalogue/oec_tables, MIT)

Outputs:
  - data/stars.json    compact star records for the 3D map
  - data/systems.json  planetary systems keyed by star id

Star selection: everything within 30 pc, everything naked-eye (mag <= 6.5),
every star with a proper name, every matched exoplanet host, plus synthetic
entries (positions from OEC RA/Dec/distance) for hosts absent from HYG so
that all cataloged planetary systems appear on the map.
"""

import csv
import json
import math
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(HERE, "raw")
OUT = os.path.join(HERE, "..", "data")

HYG_CSV = os.path.join(RAW, "hygdata_v41.csv")
OEC_CSV = os.path.join(RAW, "open_exoplanet_catalogue.txt")

DIST_LIMIT_PC = 30.0
MAG_LIMIT = 6.5
UNKNOWN_DIST = 90000.0  # HYG uses 100000 for unknown parallax

GREEK = {
    "alf": "Alp", "alpha": "Alp", "bet": "Bet", "beta": "Bet", "gam": "Gam",
    "gamma": "Gam", "del": "Del", "delta": "Del", "eps": "Eps",
    "epsilon": "Eps", "zet": "Zet", "zeta": "Zet", "eta": "Eta",
    "the": "The", "theta": "The", "iot": "Iot", "iota": "Iot",
    "kap": "Kap", "kappa": "Kap", "lam": "Lam", "lambda": "Lam",
    "mu": "Mu", "nu": "Nu", "xi": "Xi", "omi": "Omi", "omicron": "Omi",
    "pi": "Pi", "rho": "Rho", "sig": "Sig", "sigma": "Sig", "tau": "Tau",
    "ups": "Ups", "upsilon": "Ups", "phi": "Phi", "chi": "Chi",
    "psi": "Psi", "ome": "Ome", "omega": "Ome",
}


def parse_ra_hms(s):
    """'19 19 43.4040' (hours) -> degrees, or None."""
    parts = s.strip().split()
    if not parts:
        return None
    try:
        h = float(parts[0])
        m = float(parts[1]) if len(parts) > 1 else 0.0
        sec = float(parts[2]) if len(parts) > 2 else 0.0
    except ValueError:
        return None
    return (h + m / 60.0 + sec / 3600.0) * 15.0


def parse_dec_dms(s):
    parts = s.strip().split()
    if not parts:
        return None
    try:
        sign = -1.0 if parts[0].lstrip().startswith("-") else 1.0
        d = abs(float(parts[0]))
        m = float(parts[1]) if len(parts) > 1 else 0.0
        sec = float(parts[2]) if len(parts) > 2 else 0.0
    except ValueError:
        return None
    return sign * (d + m / 60.0 + sec / 3600.0)


def ang_sep_deg(ra1, de1, ra2, de2):
    r1, d1, r2, d2 = map(math.radians, (ra1, de1, ra2, de2))
    c = (math.sin(d1) * math.sin(d2)
         + math.cos(d1) * math.cos(d2) * math.cos(r1 - r2))
    return math.degrees(math.acos(max(-1.0, min(1.0, c))))


def norm_name(s):
    return re.sub(r"[^a-z0-9]", "", s.lower())


def f(v):
    if v is None or v == "":
        return None
    try:
        x = float(v)
    except ValueError:
        return None
    if math.isnan(x) or math.isinf(x):
        return None
    return x


def rnd(v, nd):
    return None if v is None else round(v, nd)


def host_name_of(planet_name):
    """Strip a trailing planet letter: 'HD 154857 b' -> 'HD 154857'."""
    m = re.match(r"^(.*?)\s+([b-z])$", planet_name.strip())
    if m:
        return m.group(1)
    # 'Kepler-16 (AB) b' style
    m = re.match(r"^(.*?)\s*\(AB\)\s*[b-z]$", planet_name.strip())
    if m:
        return m.group(1)
    return planet_name.strip()


def load_hyg():
    stars = []
    with open(HYG_CSV, newline="") as fh:
        for row in csv.DictReader(fh):
            stars.append(row)
    return stars


def build_hyg_indexes(stars):
    by_hd, by_hip, by_gl, by_name, by_bf = {}, {}, {}, {}, {}
    for row in stars:
        i = int(row["id"])
        if row["hd"]:
            by_hd.setdefault(row["hd"], i)
        if row["hip"]:
            by_hip.setdefault(row["hip"], i)
        if row["gl"]:
            key = norm_name(row["gl"])
            by_gl.setdefault(key, i)
            # 'Gl 551' also matchable as 'GJ 551'
            if key.startswith("gl"):
                by_gl.setdefault("gj" + key[2:], i)
        if row["proper"]:
            by_name.setdefault(norm_name(row["proper"]), i)
        if row["bayer"] and row["con"]:
            key = norm_name(row["bayer"] + row["con"])
            comp = row["comp"]
            if comp in ("", "1"):
                by_bf.setdefault(key, i)
        if row["flam"] and row["con"]:
            key = norm_name(row["flam"] + row["con"])
            if row["comp"] in ("", "1"):
                by_bf.setdefault(key, i)
    return by_hd, by_hip, by_gl, by_name, by_bf


def match_host(host, ra_deg, dec_deg, dist_pc, idx, stars_by_id, pos_grid):
    by_hd, by_hip, by_gl, by_name, by_bf = idx
    h = host.strip()
    m = re.match(r"^HD\s*(\d+)", h, re.I)
    if m and m.group(1) in by_hd:
        return by_hd[m.group(1)]
    m = re.match(r"^HIP\s*(\d+)", h, re.I)
    if m and m.group(1) in by_hip:
        return by_hip[m.group(1)]
    m = re.match(r"^(?:GJ|Gl|Gliese)\s*([\d.]+\s*[A-C]?)$", h, re.I)
    if m:
        key = norm_name("gj" + m.group(1))
        if key in by_gl:
            return by_gl[key]
    key = norm_name(h)
    if key in by_name:
        return by_name[key]
    # Greek Bayer designations: 'tau Cet', 'eps Eridani', '51 Peg'
    m = re.match(r"^([A-Za-z]+|\d+)\s+([A-Za-z]+)\s*[A-C]?$", h)
    if m:
        g = m.group(1).lower()
        g = GREEK.get(g, m.group(1))
        key = norm_name(g + m.group(2)[:3])
        if key in by_bf:
            return by_bf[key]
    # positional match
    if ra_deg is None or dec_deg is None:
        return None
    cell = (int(ra_deg), int(dec_deg))
    best, best_sep = None, 0.03  # ~2 arcmin window
    for dx in (-1, 0, 1):
        for dy in (-1, 0, 1):
            for sid in pos_grid.get(((cell[0] + dx) % 360, cell[1] + dy), ()):
                row = stars_by_id[sid]
                sep = ang_sep_deg(ra_deg, dec_deg,
                                  float(row["ra"]) * 15.0, float(row["dec"]))
                if sep < best_sep:
                    hd = float(row["dist"])
                    if dist_pc and hd < UNKNOWN_DIST:
                        if abs(hd - dist_pc) / max(dist_pc, 1.0) > 0.25:
                            continue
                    best, best_sep = sid, sep
    return best


def spectral_letter(spect):
    if not spect:
        return ""
    m = re.match(r"^\s*([OBAFGKMLTYCWSD])", spect.upper())
    return m.group(1) if m else ""


def temp_to_ci(teff):
    """Rough inverse of Ballesteros' formula for synthetic hosts."""
    if not teff or teff <= 0:
        return None
    lo, hi = -0.4, 3.5
    for _ in range(60):
        mid = (lo + hi) / 2
        t = 4600.0 * (1.0 / (0.92 * mid + 1.7) + 1.0 / (0.92 * mid + 0.62))
        if t > teff:
            lo = mid
        else:
            hi = mid
    return (lo + hi) / 2


def main():
    hyg = load_hyg()
    stars_by_id = {int(r["id"]): r for r in hyg}
    idx = build_hyg_indexes(hyg)

    # spatial grid over (ra_deg, dec_deg) for positional matching
    pos_grid = {}
    for r in hyg:
        cell = (int(float(r["ra"]) * 15.0) % 360, int(float(r["dec"])))
        pos_grid.setdefault(cell, []).append(int(r["id"]))

    # ---- read OEC planets, group by host ----
    systems = {}     # host display name -> dict
    with open(OEC_CSV, newline="") as fh:
        for row in csv.DictReader(fh):
            name = row["name"].strip()
            if not name:
                continue
            host = host_name_of(name)
            sysd = systems.setdefault(host, {
                "host": host,
                "ra": parse_ra_hms(row["system_rightascension"]),
                "dec": parse_dec_dms(row["system_declination"]),
                "dist": f(row["system_distance"]),
                "st_mass": f(row["hoststar_mass"]),
                "st_radius": f(row["hoststar_radius"]),
                "st_teff": f(row["hoststar_temperature"]),
                "st_feh": f(row["hoststar_metallicity"]),
                "st_age": f(row["hoststar_age"]),
                "planets": [],
            })
            for k_src, k_dst in (("hoststar_mass", "st_mass"),
                                 ("hoststar_radius", "st_radius"),
                                 ("hoststar_temperature", "st_teff"),
                                 ("hoststar_metallicity", "st_feh"),
                                 ("hoststar_age", "st_age"),
                                 ("system_distance", "dist")):
                if sysd[k_dst] is None:
                    sysd[k_dst] = f(row[k_src])
            sysd["planets"].append({
                "name": name,
                "mass_mj": f(row["mass"]),
                "radius_rj": f(row["radius"]),
                "period_d": f(row["period"]),
                "sma_au": f(row["semimajoraxis"]),
                "ecc": f(row["eccentricity"]),
                "inc_deg": f(row["inclination"]),
                "temp_k": f(row["temperature"]),
                "method": row["discoverymethod"].strip() or None,
                "year": int(row["discoveryyear"]) if row["discoveryyear"].strip().isdigit() else None,
                "binary": row["binaryflag"].strip() not in ("", "0"),
            })

    # ---- match hosts to HYG ----
    matched, synthetic = {}, []
    for host, sysd in systems.items():
        sid = match_host(host, sysd["ra"], sysd["dec"], sysd["dist"],
                         idx, stars_by_id, pos_grid)
        if sid is not None:
            matched.setdefault(sid, []).append(sysd)
        else:
            synthetic.append(sysd)

    n_multi = sum(1 for v in matched.values() if len(v) > 1)
    if n_multi:
        # merge rare duplicate-host matches into one system record
        for sid, lst in matched.items():
            if len(lst) > 1:
                base = lst[0]
                for extra in lst[1:]:
                    base["planets"].extend(extra["planets"])
        print(f"note: merged {n_multi} duplicate host matches", file=sys.stderr)
    matched = {sid: lst[0] for sid, lst in matched.items()}

    # ---- select HYG stars for the map ----
    selected = {}
    for r in hyg:
        i = int(r["id"])
        d = float(r["dist"])
        keep = (d <= DIST_LIMIT_PC and d < UNKNOWN_DIST) \
            or float(r["mag"]) <= MAG_LIMIT \
            or bool(r["proper"]) \
            or i in matched
        if keep:
            selected[i] = r

    # ---- emit stars ----
    # record: [id, name, x, y, z, mag, absmag, ci, lum, spect, con, flags]
    FLAG_PLANETS, FLAG_SYNTH, FLAG_NAMED = 1, 2, 4
    out_stars = []
    for i, r in sorted(selected.items()):
        name = r["proper"]
        # a matched exoplanet host name beats a bare catalog designation
        if not name and i in matched:
            name = matched[i]["host"]
        flags = 0
        if name:
            flags |= FLAG_NAMED
        if not name:
            if r["bf"]:
                name = re.sub(r"\s+", " ", r["bf"]).strip()
            elif r["gl"]:
                name = r["gl"].strip()
            elif r["hd"]:
                name = "HD " + r["hd"]
            elif r["hip"]:
                name = "HIP " + r["hip"]
            else:
                name = "HYG " + r["id"]
        if i in matched:
            flags |= FLAG_PLANETS
        d = float(r["dist"])
        out_stars.append([
            i, name,
            rnd(float(r["x"]), 3), rnd(float(r["y"]), 3), rnd(float(r["z"]), 3),
            rnd(float(r["mag"]), 2), rnd(float(r["absmag"]), 2),
            f(r["ci"]) if r["ci"] else None,
            rnd(f(r["lum"]), 4) if r["lum"] else None,
            r["spect"].strip(), r["con"], flags,
        ])

    next_id = max(int(r["id"]) for r in hyg) + 1
    out_systems = {}

    def emit_system(sid, sysd, host_display):
        st = {k: sysd[k] for k in
              ("st_mass", "st_radius", "st_teff", "st_feh", "st_age")}
        out_systems[str(sid)] = {
            "host": host_display,
            "star": {k: v for k, v in st.items() if v is not None},
            "planets": sorted(
                sysd["planets"],
                key=lambda p: (p["sma_au"] is None,
                               p["sma_au"] or 0,
                               p["period_d"] or 0, p["name"])),
        }

    for sid, sysd in matched.items():
        r = stars_by_id[sid]
        emit_system(sid, sysd, r["proper"] or sysd["host"])

    # ---- synthetic hosts (not in HYG): place from OEC RA/Dec/dist ----
    n_placed = n_skipped = 0
    for sysd in synthetic:
        ra, dec, d = sysd["ra"], sysd["dec"], sysd["dist"]
        if ra is None or dec is None or d is None or d <= 0:
            n_skipped += 1
            continue
        rr, dd = math.radians(ra), math.radians(dec)
        x = d * math.cos(dd) * math.cos(rr)
        y = d * math.cos(dd) * math.sin(rr)
        z = d * math.sin(dd)
        ci = temp_to_ci(sysd["st_teff"])
        lum = None
        if sysd["st_radius"] and sysd["st_teff"]:
            lum = (sysd["st_radius"] ** 2) * ((sysd["st_teff"] / 5772.0) ** 4)
        sid = next_id
        next_id += 1
        out_stars.append([
            sid, sysd["host"],
            rnd(x, 3), rnd(y, 3), rnd(z, 3),
            None, None, rnd(ci, 3) if ci else None,
            rnd(lum, 4) if lum else None,
            "", "", FLAG_PLANETS | FLAG_SYNTH,
        ])
        emit_system(sid, sysd, sysd["host"])
        n_placed += 1

    # ---- curated additions ----
    # WISE 0855-0714: Y-class sub-brown dwarf 2.28 pc away, discovered 2014,
    # too faint for HYG but a key waypoint in Project Hail Mary.
    ra = (8 + 55 / 60 + 10.83 / 3600) * 15.0
    dec = -(7 + 14 / 60 + 42.5 / 3600)
    d = 2.28
    rr, dd = math.radians(ra), math.radians(dec)
    wise_id = next_id
    next_id += 1
    out_stars.append([
        wise_id, "WISE 0855-0714",
        rnd(d * math.cos(dd) * math.cos(rr), 3),
        rnd(d * math.cos(dd) * math.sin(rr), 3),
        rnd(d * math.sin(dd), 3),
        None, None, None, None, "Y4", "Hya", FLAG_SYNTH,
    ])

    # The Solar System: planet data from NASA planetary fact sheets.
    # Same units as OEC records (Jupiter masses / radii, days, AU, K).
    def solp(name, mass_mj, radius_rj, period_d, sma_au, ecc, temp_k):
        return {"name": name, "mass_mj": mass_mj, "radius_rj": radius_rj,
                "period_d": period_d, "sma_au": sma_au, "ecc": ecc,
                "inc_deg": None, "temp_k": temp_k, "method": "in situ",
                "year": None, "binary": False}
    out_systems["0"] = {
        "host": "Sol",
        "star": {"st_mass": 1.0, "st_radius": 1.0, "st_teff": 5772.0,
                 "st_feh": 0.0, "st_age": 4.6},
        "planets": [
            solp("Mercury", 0.000174, 0.0341, 87.97, 0.387, 0.2056, 440),
            solp("Venus", 0.00256, 0.0847, 224.70, 0.723, 0.0068, 737),
            solp("Earth", 0.00315, 0.0892, 365.26, 1.000, 0.0167, 288),
            solp("Mars", 0.000338, 0.0474, 686.98, 1.524, 0.0934, 210),
            solp("Jupiter", 1.0, 1.0, 4332.6, 5.204, 0.0489, 165),
            solp("Saturn", 0.299, 0.833, 10759.2, 9.573, 0.0565, 134),
            solp("Uranus", 0.0457, 0.354, 30688.5, 19.165, 0.0472, 76),
            solp("Neptune", 0.0540, 0.344, 60182.0, 30.178, 0.0086, 72),
        ],
    }
    for s in out_stars:
        if s[0] == 0:
            s[11] |= FLAG_PLANETS

    os.makedirs(OUT, exist_ok=True)
    with open(os.path.join(OUT, "stars.json"), "w") as fh:
        json.dump({
            "meta": {
                "source": "HYG v4.1 (CC BY-SA 4.0) + Open Exoplanet Catalogue",
                "units": {"xyz": "parsec"},
                "fields": ["id", "name", "x", "y", "z", "mag", "absmag",
                           "ci", "lum", "spect", "con", "flags"],
                "flags": {"planets": 1, "synthetic": 2, "named": 4},
            },
            "stars": out_stars,
        }, fh, separators=(",", ":"), allow_nan=False)
    with open(os.path.join(OUT, "systems.json"), "w") as fh:
        json.dump(out_systems, fh, separators=(",", ":"), allow_nan=False)

    n_planets = sum(len(s["planets"]) for s in out_systems.values())
    print(f"stars: {len(out_stars)} (HYG {len(selected)}, synthetic {n_placed}, "
          f"skipped-no-position {n_skipped})")
    print(f"systems: {len(out_systems)}  planets: {n_planets}  "
          f"matched-to-HYG: {len(matched)}")


if __name__ == "__main__":
    main()
