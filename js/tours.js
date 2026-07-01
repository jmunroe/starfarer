// Guided tours through the real star systems of science fiction.
// Story text is fiction (and labeled as such in the UI); every stop is a real
// astronomical object from the catalog, and the "science" line is real.

export const TOURS = [
  {
    id: "hailmary",
    name: "Project Hail Mary",
    source: "Andy Weir · novel & film",
    desc: "Follow the astrophage from Tau Ceti to Sol — and Ryland Grace's one-way mission to save two worlds.",
    stops: [
      {
        star: "Sol",
        title: "Sol — the dimming Sun",
        story: "The Sun is losing light. A faint arc — the Petrova line — stretches toward Venus, the trail of a microbe that feeds on stars. In a few decades Earth will freeze. The Hail Mary is humanity's last throw.",
        science: "The Sun is a <b>G2V dwarf</b>, 4.6 billion years old. A real 10% dimming would drop Earth's equilibrium temperature by roughly 7 °C — comparable to a full ice age.",
      },
      {
        star: "tau Ceti",
        title: "Tau Ceti — where it began",
        story: "Every infected star in the local bubble traces back here. Tau Ceti hosts the astrophage breeding ground — and the planet Adrian, whose atmosphere hides the predator that becomes humanity's cure.",
        science: "Tau Ceti is the nearest single Sun-like star (<b>G8V, 11.9 ly</b>). It really does have a planetary system: multiple candidate super-Earths, with tau Ceti e and f skirting the habitable zone.",
      },
      {
        star: "Ran",
        title: "Epsilon Eridani — first to fall",
        story: "The infection's first jump from Tau Ceti. Its Petrova line glows in Grace's telescope logs, proof the plague spreads from star to star like spores on the wind.",
        science: "Epsilon Eridani (IAU name <b>Ran</b>) is a young K2 dwarf 10.5 ly away with a dusty debris disk and a confirmed Jupiter-class planet, AEgir (ε Eri b).",
      },
      {
        star: "Sirius",
        title: "Sirius — the bright victim",
        story: "Even the brightest star in Earth's sky is infected. From Sirius the astrophage leapt onward to a dark, cold stepping stone no one had mapped.",
        science: "Sirius A is an <b>A-type dwarf</b> just 8.6 ly away, 25× the Sun's luminosity, orbited by Sirius B — the nearest white dwarf, a dead star the size of Earth with the mass of the Sun.",
      },
      {
        star: "WISE 0855-0714",
        title: "WISE 0855−0714 — the cold stepping stone",
        story: "A failed star, invisible to the eye, that the astrophage used as a waypoint. From here the spores fanned out to four more suns — including ours.",
        science: "<b>WISE 0855−0714</b> is real: the coldest known sub-brown dwarf (~250 K, below water's freezing point), 7.4 ly away, discovered in 2014 by the WISE infrared survey. It likely has water-ice clouds.",
      },
      {
        star: "Wolf 359",
        title: "Wolf 359, Lalande 21185, Ross 128 — the spreading front",
        story: "Three faint red dwarfs, all infected, all doomed to dim. The pattern of Petrova lines across these stars is what lets Earth's scientists reconstruct the infection map.",
        science: "All three are real red dwarfs within 11 ly. <b>Ross 128 b</b>, discovered in 2017, is one of the nearest temperate, roughly Earth-sized planets known.",
      },
      {
        star: "Keid",
        title: "40 Eridani — Rocky's home",
        story: "'Erid.' Home of the Eridians — engineers of ammonia and stone, whose sun is dying of the same plague. Here Grace and Rocky, two species with nothing in common but a problem, save each other.",
        science: "40 Eridani (<b>Keid</b>, 16.3 ly) is a gorgeous triple: a K dwarf, plus the most easily observed white dwarf in the sky, plus a red dwarf. A super-Earth candidate, 40 Eri b, was reported in 2018.",
      },
    ],
  },
  {
    id: "startrek",
    name: "Star Trek",
    source: "Gene Roddenberry · TV & film",
    desc: "Vulcan, the Battle of Wolf 359, and the real stars of the Federation.",
    stops: [
      {
        star: "Keid",
        title: "40 Eridani A — Vulcan",
        story: "The homeworld of Spock, Surak and the Vulcan High Command orbits the K-dwarf primary of this triple system. Live long and prosper.",
        science: "Star Trek's producers (with Gene Roddenberry) endorsed <b>40 Eridani A</b> as Vulcan's sun in 1991. It's a stable 5.5-billion-year-old K dwarf — a plausible host for a life-bearing world.",
      },
      {
        star: "Wolf 359",
        title: "Wolf 359 — the battle",
        story: "Stardate 44002.3: forty Federation starships meet a single Borg cube here. Thirty-nine are destroyed, 11,000 lives lost. 'Resistance is futile.'",
        science: "<b>Wolf 359</b> is one of the faintest, smallest red dwarfs known — 7.9 ly away, ~9% of the Sun's mass, shining at 1/1000 of solar luminosity. Two candidate planets were reported in 2019.",
      },
      {
        star: "Rigil Kentaurus",
        title: "Alpha Centauri — Zefram Cochrane's home",
        story: "The inventor of warp drive settled here after his historic first flight. In the 24th century it's a founding member system of the Federation.",
        science: "<b>Alpha Centauri A</b> is the nearest Sun-like star (4.37 ly), part of a triple system with Toliman (B) and the red dwarf Proxima — which really hosts at least three planets.",
      },
      {
        star: "Rigel",
        title: "Rigel — the crowded system",
        story: "Rigel II through Rigel XII appear across every Trek era — cabaret worlds, mining colonies, Orion traders. It may be the most-visited star in the franchise.",
        science: "<b>Rigel</b> is a blue supergiant ~860 ly away shining with ~120,000 Suns' worth of light. Massive stars like it live fast and die in supernovae — poor hosts for civilizations, great ones for drama.",
      },
      {
        star: "Deneb",
        title: "Deneb — where the voyages began",
        story: "'Encounter at Farpoint', the very first episode of The Next Generation, takes the Enterprise-D to Deneb IV and the mystery of Farpoint Station.",
        science: "<b>Deneb</b> is one of the most luminous stars visible to the naked eye — an A-class supergiant roughly 1,400 ly away, so bright it's a beacon across half the galaxy's spiral arm.",
      },
    ],
  },
  {
    id: "contact",
    name: "Contact",
    source: "Carl Sagan · novel & film",
    desc: "A signal from Vega, a machine, and a journey to the center of the galaxy.",
    stops: [
      {
        star: "Sol",
        title: "Earth — 'small moves, Ellie'",
        story: "Ellie Arroway listens to the static of the cosmos until the night the noise becomes numbers: primes, 2, 3, 5, 7… broadcast from a star 25 light-years away.",
        science: "The real search continues: SETI has surveyed thousands of stars for narrowband radio signals. The 'Wow!' signal of 1977 remains the most tantalizing unexplained candidate.",
      },
      {
        star: "Vega",
        title: "Vega — the transmitter",
        story: "The Machine drops Ellie into a radio-loud junkyard orbiting Vega — a relay in a galactic network built by civilizations long gone, who engineer wormholes and write messages into π.",
        science: "<b>Vega</b> (A0V, 25 ly) was the first star ever photographed and a former pole star. It spins so fast it bulges at the equator, and IRAS found a debris disk around it in 1983 — the first evidence of planet-forming material around another star, which is why Sagan chose it.",
      },
    ],
  },
  {
    id: "interstellar",
    name: "Interstellar",
    source: "Christopher Nolan · film",
    desc: "Through the wormhole at Saturn to Gargantua's clockwork worlds.",
    stops: [
      {
        star: "Sol",
        title: "Earth — the blight",
        story: "Crops fail one species at a time and the dust never stops. Cooper, a farmer who used to fly for NASA, follows gravity's whisper to a secret launch site. 'We used to look up at the sky and wonder at our place in the stars.'",
        science: "The film's science advisor was physicist <b>Kip Thorne</b>, who required every visual to obey general relativity. His simulations of the black hole Gargantua were accurate enough to publish in research papers.",
      },
      {
        star: "Sol",
        openSystem: true,
        title: "Saturn — the wormhole",
        story: "'They' placed it near Saturn: a sphere of warped starlight, a shortcut sewn through spacetime to another galaxy and twelve candidate worlds around the black hole Gargantua.",
        science: "Wormholes are valid solutions of Einstein's equations but need 'exotic matter' to stay open — none has ever been observed. Gargantua itself is fiction, though its physics (time dilation on Miller's planet: 1 hour = 7 years) is real GR at 99.99999998% of the speed of light... err, of maximal spin.",
      },
    ],
  },
  {
    id: "dune",
    name: "Dune",
    source: "Frank Herbert · novels & films",
    desc: "Arrakis, Caladan, Giedi Prime — Herbert set his feudal galaxy around real, named stars.",
    stops: [
      {
        star: "Canopus",
        title: "Canopus — Arrakis, Dune, desert planet",
        story: "The third planet of Canopus is the only source of the spice melange, the most precious substance in the universe. He who controls the spice controls the universe.",
        science: "<b>Canopus</b> is the second-brightest star in Earth's night sky — an F-type bright giant ~310 ly away, ~10,000× the Sun's luminosity. Real spacecraft have used it as a navigation reference star for decades.",
      },
      {
        star: "Delta Pavonis",
        title: "Delta Pavonis — Caladan",
        story: "The ocean world of House Atreides, where Paul was raised on rain and rule of law before the desert claimed him.",
        science: "<b>Delta Pavonis</b> (19.9 ly) is a G8 subgiant just beginning to evolve off the main sequence — one of the most Sun-like nearby stars and a prime SETI target.",
      },
      {
        star: "36 Ophiuchi",
        title: "36 Ophiuchi — Giedi Prime",
        story: "The oil-dark industrial homeworld of House Harkonnen orbits 36 Ophiuchi B: a planet of arena spectacle and cruelty under a low, mean sun.",
        science: "<b>36 Ophiuchi</b> is a real triple system of orange K dwarfs 19.5 ly away. The A–B pair swings between 7 and 169 AU on a 570-year orbit — sunsets on any planet there would be spectacular.",
      },
    ],
  },
  {
    id: "avatar",
    name: "Avatar",
    source: "James Cameron · films",
    desc: "Pandora — a moon of a gas giant in the real Alpha Centauri system.",
    stops: [
      {
        star: "Rigil Kentaurus",
        title: "Alpha Centauri A — Pandora",
        story: "Pandora is a moon of the gas giant Polyphemus, orbiting Alpha Centauri A. The RDA's ships take 5.9 years to make the crossing for unobtanium; the Na'vi were there first.",
        science: "<b>Alpha Centauri A</b> is a G2V twin of the Sun, 4.37 ly away. No planet is confirmed around A yet, but its companion Proxima hosts Proxima b — a real, roughly Earth-mass world in the habitable zone of the nearest star to the Sun.",
      },
    ],
  },
  {
    id: "threebody",
    name: "The Three-Body Problem",
    source: "Liu Cixin · novels & TV",
    desc: "Trisolaris and the chaotic dance of three suns — the real Alpha Centauri triple.",
    stops: [
      {
        star: "Rigil Kentaurus",
        title: "Alpha Centauri — Trisolaris",
        story: "A civilization evolves under three suns whose motion no one can predict: stable eras, chaotic eras, worlds that freeze and burn. The Trisolarans hear Earth's broadcast — and set sail.",
        science: "The real system is far kinder than the novel's: <b>A and B</b> orbit each other every 79.9 years while <b>Proxima</b> circles both at ~13,000 AU. The true three-body problem is still real — no general closed-form solution exists.",
      },
      {
        star: "Proxima Centauri",
        title: "Proxima Centauri — the flare in the dark",
        story: "The nearest star to the Sun — in the story, the destination that turns physics into a weapon and the sky into a listening post.",
        science: "<b>Proxima b</b> (discovered 2016) is a real ~1.1 Earth-mass planet in the habitable zone, 4.24 ly away. Its star is a flare star, so any life would need a thick skin — or a deep ocean.",
      },
    ],
  },
  {
    id: "babylon5",
    name: "Babylon 5",
    source: "J. Michael Straczynski · TV",
    desc: "The last, best hope for peace — a five-mile station at Epsilon Eridani.",
    stops: [
      {
        star: "Ran",
        title: "Epsilon Eridani — Babylon 5",
        story: "'It was the dawn of the third age of mankind…' The Babylon station spins in orbit of Epsilon III, neutral ground for a quarter million humans and aliens, ten years after the Earth–Minbari war.",
        science: "<b>Epsilon Eridani</b> is one of the youngest nearby Sun-like stars (~500–800 Myr), with two asteroid belts, a dust disk, and the confirmed gas giant AEgir — a real planetary construction site 10.5 ly away.",
      },
    ],
  },
];

// Fictional appearances shown on the info panel when a star is selected.
export const FICTION_NOTES = {
  "Sol": [
    { source: "everything ever written", text: "Home. Also: dimmed by astrophage (Project Hail Mary), blighted (Interstellar), invaded (countless)." },
  ],
  "tau Ceti": [
    { source: "Project Hail Mary", text: "Origin of the astrophage; home of the planet Adrian and destination of the Hail Mary." },
    { source: "widely used in SF", text: "A favorite setting from Heinlein to Le Guin — the nearest single Sun-like star." },
  ],
  "Keid": [
    { source: "Star Trek", text: "40 Eridani A is the sun of Vulcan, homeworld of Spock." },
    { source: "Project Hail Mary", text: "'Erid' — home system of Rocky and the Eridians." },
  ],
  "Wolf 359": [
    { source: "Star Trek", text: "Site of the Battle of Wolf 359 against the Borg (39 starships lost)." },
    { source: "Project Hail Mary", text: "One of the stars infected by astrophage." },
    { source: "Wolf 359 (podcast)", text: "An abandoned listening station orbits here." },
  ],
  "Vega": [
    { source: "Contact", text: "Source of the Message; first stop of the Machine." },
  ],
  "Canopus": [
    { source: "Dune", text: "Arrakis — Dune, desert planet — is the third planet of Canopus." },
  ],
  "Delta Pavonis": [
    { source: "Dune", text: "Caladan, ocean homeworld of House Atreides, orbits Delta Pavonis." },
  ],
  "36 Ophiuchi": [
    { source: "Dune", text: "Giedi Prime, seat of House Harkonnen, orbits 36 Ophiuchi B." },
  ],
  "Rigil Kentaurus": [
    { source: "Avatar", text: "Pandora is a moon of the gas giant Polyphemus around Alpha Centauri A." },
    { source: "The Three-Body Problem", text: "The Trisolaran home system." },
    { source: "Star Trek", text: "Zefram Cochrane, inventor of warp drive, settled here." },
  ],
  "Toliman": [
    { source: "The Three-Body Problem", text: "One of the three chaotic suns of Trisolaris." },
  ],
  "Proxima Centauri": [
    { source: "The Three-Body Problem", text: "Part of the Trisolaran triple system." },
    { source: "The Expanse", text: "Among the first systems reached through the ring gates." },
  ],
  "Ran": [
    { source: "Babylon 5", text: "The Babylon station orbits Epsilon III in this system." },
    { source: "Project Hail Mary", text: "First star infected by astrophage after Tau Ceti." },
  ],
  "Sirius": [
    { source: "Project Hail Mary", text: "Infected by astrophage on its path toward Sol." },
    { source: "The Little Prince / Doctor Who / many", text: "The brightest star in our sky shows up everywhere." },
  ],
  "Ross 128": [
    { source: "Project Hail Mary", text: "One of the astrophage-infected stars." },
  ],
  "Lalande 21185": [
    { source: "Project Hail Mary", text: "One of the astrophage-infected stars." },
  ],
  "WISE 0855-0714": [
    { source: "Project Hail Mary", text: "The cold brown-dwarf waypoint the astrophage used to reach Sol." },
  ],
  "Rigel": [
    { source: "Star Trek", text: "Rigel II–XII: colonies, cabarets and Orion traders across every era." },
  ],
  "Deneb": [
    { source: "Star Trek", text: "Deneb IV — 'Encounter at Farpoint', the first TNG episode." },
  ],
  "TRAPPIST-1": [
    { source: "real-world fame", text: "Seven Earth-sized planets; the most Earth-like system known — SF writers are still catching up." },
  ],
  "Helvetios": [
    { source: "history, not fiction", text: "51 Pegasi b (1995): the first planet ever found around a Sun-like star. The 2019 Nobel Prize in Physics." },
  ],
  "Polaris": [
    { source: "every sailor's story", text: "The North Star — navigation beacon of the age of sail, and a Cepheid variable." },
  ],
  "Betelgeuse": [
    { source: "Hitchhiker's Guide to the Galaxy", text: "Ford Prefect is 'from a small planet somewhere in the vicinity of Betelgeuse'." },
  ],
  "Altair": [
    { source: "Forbidden Planet", text: "Altair IV — the Krell homeworld and the id monster (1956)." },
  ],
  "Fomalhaut": [
    { source: "widely used in SF", text: "A staple of Asimov, Herbert and Banks; in reality it hosts a spectacular debris ring." },
  ],
  "Barnard's Star": [
    { source: "The Hitchhiker's Guide / many", text: "Classic waystation of golden-age SF; a real super-Earth candidate was reported in 2018." },
  ],
};
