# Starfarer

**An interactive 3D atlas of real stars and planets — and the science-fiction
worlds set among them.**

Starfarer plots 15,000+ real stars in true three-dimensional space and 5,200
confirmed exoplanets, lets you fly between them, open any planetary system to
watch its orbits to scale, and take guided tours through the *real* star systems
where science fiction takes place — from *Project Hail Mary* to *Star Trek*,
*Contact*, *Dune*, *Interstellar* and more. A separate **Cosmic Zoom** mode
carries you on a continuous "powers of ten" journey from the Planck length up
through atoms, cells, worlds, the galaxy and the observable universe.

It was inspired by the lovely [gaia-mary](https://valhovey.github.io/gaia-mary/)
*Project Hail Mary* star map, and aims to go further: real photometric colors and
luminosities, real planetary systems, habitable-zone estimates, and a whole shelf
of sci-fi universes instead of just one.

No build step, no framework, no tracking — it's static HTML/CSS/JavaScript with a
single vendored copy of three.js.

## Run it

Because it uses ES modules and `fetch`, open it through a web server (not
`file://`):

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

Or deploy the folder to any static host (GitHub Pages, Netlify, etc.).

## What you can do

- **Explore the star map** — drag to orbit, scroll to zoom, click a star to
  inspect it, double-click to fly there. Stars are colored and sized from their
  measured color index and luminosity. Cyan diamonds mark stars with known
  planets.
- **Inspect any star** — distance, magnitudes, temperature, luminosity, radius,
  mass, age and metallicity. Values measured in the catalogs are shown plainly;
  values *derived* from other measurements (e.g. temperature from color) are
  marked with a `~`.
- **Open a planetary system** — an animated top-down orbit map with the star's
  estimated habitable zone shaded in, plus a detail card for every planet (mass,
  radius, period, semi-major axis, eccentricity, equilibrium temperature,
  discovery year and method).
- **Take a sci-fi tour** — guided, multi-stop journeys anchored to real stars.
  The story text is fiction (and labeled as such); every stop is a real
  astronomical object and every "Real science" note is factual.
- **Cosmic Zoom** — slide or auto-fly across 68 orders of magnitude, from the
  quantum foam to the speculative omniverse, with the current viewport scale
  shown at all times.
- **Search & filter** — fuzzy search (with sci-fi aliases like "Vulcan" →
  40 Eridani), filter by spectral class / distance / planet hosts, and toggle
  light-years vs. parsecs.

### Deep links

- `#star=Tau%20Ceti` — open on a specific star
- `#tour=hailmary` — start a specific tour (`hailmary`, `startrek`, `contact`,
  `interstellar`, `dune`, `avatar`, `threebody`, `babylon5`)
- `#zoom=galaxy` — open Cosmic Zoom at a given scale

## The science, and what's estimated

Positions, magnitudes, spectral types and (where available) luminosities and
color indices come straight from the catalogs. To keep the interface honest:

- **Measured** stellar values (temperature, radius, mass, age, metallicity for
  planet hosts) are shown without a marker.
- **Estimated** values carry a `~` and a footnote. Temperature is derived from
  the B–V color index (Ballesteros 2012); luminosity from absolute magnitude;
  radius from the Stefan–Boltzmann law; a rough main-sequence mass from
  luminosity. Habitable zones use Kopparapu-style flux limits; planet
  equilibrium temperatures assume zero albedo. A planet's semi-major axis is
  reconstructed from its period and host mass (Kepler's third law) when the axis
  isn't tabulated.

Stars without a measured distance in the catalog are omitted from the 3D map.
A handful of hosts absent from the star catalog (many *Kepler* systems, plus the
curated additions below) are placed from the exoplanet catalog's RA/Dec/distance.

### Curated additions

- **The Solar System** is included with planet data from NASA's planetary fact
  sheets, so you can open "Sol" and see Earth in its habitable zone.
- **WISE 0855−0714**, the coldest known brown dwarf and a *Project Hail Mary*
  waypoint, is too faint for the star catalog and is added from its published
  position and distance.

## Data sources

- **[HYG Stellar Database v4.1](https://github.com/astronexus/HYG-Database)** —
  merged Hipparcos, Yale Bright Star and Gliese catalogs. Licensed CC BY-SA 4.0.
- **[Open Exoplanet Catalogue](https://github.com/OpenExoplanetCatalogue/oec_tables)** —
  confirmed exoplanets and host-star properties. Licensed MIT.
- **[NASA planetary fact sheets](https://nssdc.gsfc.nasa.gov/planetary/factsheet/)** —
  Solar System planet data.
- Rendering by **[three.js](https://threejs.org)** (MIT), vendored in `vendor/`.

## Rebuilding the data

The app reads two generated files, `data/stars.json` and `data/systems.json`.
To regenerate them from source:

```bash
tools/fetch_data.sh        # downloads the raw catalogs into tools/raw/
python3 tools/build_data.py  # writes data/stars.json and data/systems.json
```

`build_data.py` selects stars within 30 pc, all naked-eye stars, all named
stars and every exoplanet host; cross-matches planets to host stars by catalog
ID, designation and sky position; and derives the compact records the app uses.

## Project layout

```
index.html            app shell and DOM
css/style.css         all styling
js/app.js             entry point: wiring, info panel, search, filters, deep links
js/data.js            catalog loading, star records, search, sci-fi aliases
js/astro.js           astrophysics helpers (colors, temps, HZ, formatting)
js/starmap.js         the three.js 3D star map (render, controls, picking, labels)
js/system.js          animated planetary-system orbit view
js/cosmiczoom.js      the powers-of-ten Cosmic Zoom mode
js/tours.js           sci-fi tour content and per-star fiction notes
data/                 generated star and system JSON
tools/                data fetch + build pipeline
vendor/               three.js (vendored)
```

## Credits & honesty

Story text in the tours and the per-star "appears in fiction" notes is
**fiction**, presented as such alongside the real astronomy. Any resemblance
between a real star's actual properties and how a novelist imagined its planets
is, mostly, a happy accident — which is part of the fun.
