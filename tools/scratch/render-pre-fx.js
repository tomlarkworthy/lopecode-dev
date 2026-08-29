// Draws corepox-engine state with the recovered vector art.
//
// Units: the engine works in TILES. The art is authored at 56 units per tile
// (armour/energy-store are exactly 56x56), so the SVG works in art units and
// every engine coordinate is multiplied by TILE. +Y is DOWN in both.

const _teamFilter = function _teamFilter(){return(
{a: "none", b: "hue-rotate(190deg) saturate(1.3)"}
)};

// Where the barrel meets the panel, in symbol units relative to the anchor.
// Redrawn 2026-08-21 with the art: the design doc draws the pivot ring centred on
// (228, 352) in doc units, which is art (112, 174), and the anchor -- the centre
// of cell [0,0] -- is art (84, 196). It is no longer a measurement off a trace,
// it is where the drawing says the hinge is.
const _TURRET_PIVOT = function _TURRET_PIVOT(){return(
[28, -22]
)};

// The barrel is authored pointing +x -- straight out to the right of the pivot,
// muzzle tip at art (207, 174) against a hinge at (112, 174). Turret angles are
// degrees clockwise from forward, and right is 90, so subtracting 90 makes a
// turret angle of 0 point where the component points.
//
// It was 68.82, which was the angle the RECOVERED trace happened to be drawn at
// (hinge (144.95, 93.56) to tip (264.05, 47.41)). Authoring the barrel on an axis
// instead means the constant is a fact about the drawing rather than a
// measurement of it.
const _ART_TURRET_DEG = function _ART_TURRET_DEG(){return(
90
)};


// A rock, drawn from its footprint. Two reasons it is procedural rather than two
// more sprites: the shapes came from Tom on 2026-08-21 and may still move, and a
// belt of identical stamps reads as a tiling rather than as rubble -- the jitter is
// seeded off the component's own cell so a given rock looks the same every frame
// but no two look alike.
//
// Ore is deliberately loud. Tom, 2026-08-21: "I could not find any ore in the
// asteroids". It sits under url(#cp-bloom) with the hull, so the amber blooms and
// a broken-open seam is visible across the field.
const _mineralNode = function _mineralNode(TYPES, TILE){return(
(type, seed = 0) => {
  const ns = "http://www.w3.org/2000/svg";
  const T = TYPES[type];
  const tiles = T?.tiles ?? [[0, 0]];
  const xs = tiles.map(t => t[0]), ys = tiles.map(t => t[1]);
  // Engine +Y is DOWN and so is the art's, but shipNode places components with
  // `-(py - cy) * TILE`, so the drawing's own y runs the other way to the tiles'.
  const x0 = (Math.min(...xs) - 0.5) * TILE, x1 = (Math.max(...xs) + 0.5) * TILE;
  const y0 = (-Math.max(...ys) - 0.5) * TILE, y1 = (-Math.min(...ys) + 0.5) * TILE;
  // abs, because JS `%` keeps the sign of the dividend: a rock at px<0 seeded a
  // negative `a`, rnd() went negative, and the pit radius came out as r="-0.5",
  // which SVG rejects (five console errors per campaign run, found by lopecode-dev-66).
  let a = Math.abs((seed | 0) * 2654435761 % 2147483647) || 7;
  const rnd = () => (Math.abs(a = (a * 48271) % 2147483647) / 2147483647);
  const j = (v, k) => v + (rnd() - 0.5) * k;
  const mk = (tag, attrs) => { const n = document.createElementNS(ns, tag);
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v); return n; };
  const ore = T?.ore != null;
  const k = ore ? TILE * 0.18 : TILE * 0.3;          // ore keeps a crystal's edges
  const pts = [[j(x0, k), j(y0, k)], [j((x0 + x1) / 2, k * 0.6), y0 + rnd() * k * 0.4],
               [j(x1, k), j(y0, k)], [x1 - rnd() * k * 0.4, j((y0 + y1) / 2, k * 0.6)],
               [j(x1, k), j(y1, k)], [j((x0 + x1) / 2, k * 0.6), y1 - rnd() * k * 0.4],
               [j(x0, k), j(y1, k)], [x0 + rnd() * k * 0.4, j((y0 + y1) / 2, k * 0.6)]];
  const path = "M" + pts.map(p => p.map(v => v.toFixed(1)).join(" ")).join("L") + "Z";
  const out = [];
  if (ore) {
    out.push(mk("path", {d: path, fill: "#3a2a06", stroke: "#ffc42e", "stroke-width": 4,
                         "stroke-linejoin": "round"}));
    // the crystal itself: a diamond per tile, so a 1x2 vein reads as two facets
    for (const [tx, ty] of tiles) {
      const cx = tx * TILE, cy = -ty * TILE, r = TILE * 0.24;
      out.push(mk("path", {d: `M${cx} ${cy - r}L${cx + r} ${cy}L${cx} ${cy + r}L${cx - r} ${cy}Z`,
                           fill: "#ffd76a", stroke: "#fff3c4", "stroke-width": 2}));
    }
  } else {
    out.push(mk("path", {d: path, fill: "#2b2823", stroke: "#7a736a", "stroke-width": 3.5,
                         "stroke-linejoin": "round"}));
    // one facet catching the light, and pits, so the mass has a surface
    const fx = x0 + (x1 - x0) * 0.18, fy = y0 + (y1 - y0) * 0.18;
    const fw = (x1 - x0) * 0.42, fh = (y1 - y0) * 0.42;
    out.push(mk("path", {d: `M${fx.toFixed(1)} ${(fy + fh).toFixed(1)}` +
                            `L${(fx + fw * 0.4).toFixed(1)} ${fy.toFixed(1)}` +
                            `L${(fx + fw).toFixed(1)} ${(fy + fh * 0.7).toFixed(1)}Z`,
                         fill: "#403a33", stroke: "none"}));
    for (const [tx, ty] of tiles)
      out.push(mk("circle", {cx: (tx * TILE + (rnd() - 0.5) * TILE * 0.4).toFixed(1),
                             cy: (-ty * TILE + (rnd() - 0.5) * TILE * 0.4).toFixed(1),
                             r: (TILE * (0.06 + rnd() * 0.07)).toFixed(1),
                             fill: "#1c1a17", stroke: "none"}));
  }
  return out;
}
)};

const _componentNode = function _componentNode(SYMBOL_FOR, SYMBOLS, TILE, TURRET_PIVOT, TYPES, mineralNode){return(
(c) => {
  const ns = "http://www.w3.org/2000/svg";
  const g = document.createElementNS(ns, "g");
  const spec = SYMBOL_FOR[c.type];
  // A turret aims. Drawing it as one stamp froze every barrel at the angle the
  // art happened to be authored at, and drew the sheet's unattached second barrel
  // next to it. Base and barrel are separate uses in the same frame, and the
  // barrel turns about the component origin, which is where the gear is.
  if (c.type === "LaserTurret2" && spec) {
    const [w, h] = SYMBOLS[spec[0]];
    const [, ax, ay] = spec;
    const put = (name, into, dx = 0, dy = 0) => {
      const u = document.createElementNS(ns, "use");
      u.setAttribute("href", "#cp-" + name);
      u.setAttribute("x", -ax - dx); u.setAttribute("y", -ay - dy);
      u.setAttribute("width", w); u.setAttribute("height", h);
      into.appendChild(u);
    };
    put("turret2-base", g);
    // The barrel hinges at the DOME, not at the gear. It turned about the anchor
    // (111,124), which is the gear ring at the centre of the angle-port cell, and
    // that is 0.6 x 0.54 tiles from where the art actually joins the two -- so the
    // barrel hung off the panel with a visible gap. Tom, 2026-08-20: "the turret is
    // still not based on the right part".
    //
    // Measured off art_LaserTurret2, not guessed. The barrel's butt quad is
    // (137.5,76.1) (129.4,96.8) (149.0,107.5) (163.9,94.0), centroid (144.95,93.56);
    // the panel's peak sits on the top edge between (111,91.73) and (172.43,91.73),
    // midpoint (141.7,91.73). The two agree to 3 units, which is what says the butt
    // IS the hinge. Offset from the anchor: (+33.95, -30.44).
    const barrel = document.createElementNS(ns, "g");
    const hinge = document.createElementNS(ns, "g");
    hinge.setAttribute("transform", `translate(${TURRET_PIVOT[0]} ${TURRET_PIVOT[1]})`);
    put("turret2-barrel", barrel, TURRET_PIVOT[0], TURRET_PIVOT[1]);
    hinge.appendChild(barrel);
    g.appendChild(hinge);
    g.barrel = barrel;
    return g;
  }
  if (spec) {
    const [name, ax, ay] = spec;
    const [w, h] = SYMBOLS[name];
    const u = document.createElementNS(ns, "use");
    u.setAttribute("href", "#cp-" + name);
    u.setAttribute("x", -ax);
    u.setAttribute("y", -ay);
    // REQUIRED: a <use> of a <symbol> with no width/height fills the viewport
    u.setAttribute("width", w);
    u.setAttribute("height", h);
    g.appendChild(u);
  } else if (TYPES[c.type]?.mineral) {
    // Rock has no recovered art because it is not in the shipped game: the asteroid
    // types were added for the mining node. Drawn from the type's own footprint
    // rather than stamped, so a 3x1 spar and a 2x2 slab are different objects on
    // screen without two more sprites. All four mineral shapes are rectangles, so
    // the bounding box IS the outline.
    for (const n of mineralNode(c.type, c.px * 7 + c.py * 13)) g.appendChild(n);
  } else {                                   // no art recovered for this type
    const r = document.createElementNS(ns, "rect");
    r.setAttribute("x", -TILE / 2); r.setAttribute("y", -TILE / 2);
    r.setAttribute("width", TILE); r.setAttribute("height", TILE);
    r.setAttribute("fill", "none"); r.setAttribute("stroke", "#7fd8ff");
    r.setAttribute("stroke-width", 3);
    g.appendChild(r);
  }
  return g;
}
)};

// The live numbers on every connector. ConnectorCommon.LateUpdate drew these in
// the original, and they are most of why a screenshot reads as a program running
// rather than as ships drifting.
// A port is a DISC with the value written in it, not a bare number. Ours were
// bare text over the hull, which is why a ship read as parts-with-numbers rather
// than as a program: the shipped game gives every port a face
// (data/corepox/shipped-ui/63-ports.avif), and the face is what says which way
// the value is going.
//
//   output          white disc, green numerals
//   input, fed      dark disc, pink ring, orange numerals
//   input, starved  the same, numerals red -- nothing is driving it
//   angle-typed     the ring is a COG instead of a circle
//
// The cog is a type marker, not decoration: it appears on Radar.bearing and
// LaserTurret2.angle and on nothing else, in the game and here.
const _PORT_TYPE = function _PORT_TYPE(){return(
{Radar: {bearing: "angle"}, LaserTurret2: {angle: "angle"}}
)};

// Teeth as a star polygon. The shipped cog has rounded teeth; at 0.6 tiles across
// on a bloomed layer the difference does not survive the glow.
const _cogPath = function _cogPath(){return(
(r, teeth = 12, depth = 0.24) => {
  const n = teeth * 2;
  let d = "";
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2, rr = r * (i % 2 ? 1 - depth : 1);
    d += (i ? "L" : "M") + (Math.cos(a) * rr).toFixed(2) + "," + (Math.sin(a) * rr).toFixed(2);
  }
  return d + "Z";
}
)};

// Integers print as integers. The engine carries floats, so a Constant of 1 was
// drawn "1.0" and a bearing of 12.4375 as "12.4" -- the first is noise and the
// second is the useful case, so the rule is per-value rather than a fixed dp.
const _fmtPort = function _fmtPort(){return(
(v) => v == null || Number.isNaN(v) ? "\u2013"
     : !Number.isFinite(v) ? (v > 0 ? "\u221e" : "-\u221e")
     : Number.isInteger(v) ? String(v)
     : Math.abs(v) >= 10 ? v.toFixed(0) : v.toFixed(1)
)};

// Two nodes, deliberately: the halo goes in a bloomed group and the face does
// not. One filter over the lot makes the numerals unreadable, and a filter per
// port is a filter region per port.
const _portNode = function _portNode(cogPath, fmtPort, connColour, TILE){return(
(kind, typed) => {
  const ns = "http://www.w3.org/2000/svg";
  const mk = (n, at) => { const e = document.createElementNS(ns, n);
    for (const k in at) e.setAttribute(k, at[k]); return e; };
  const R_DISC = TILE * 0.165, R_RING = TILE * 0.205, R_COG = TILE * 0.30;
  const ring = (w) => typed === "angle"
    ? mk("path", {d: cogPath(R_COG), fill: "none", "stroke-width": w, "stroke-linejoin": "round"})
    : mk("circle", {cx: 0, cy: 0, r: R_RING, fill: "none", "stroke-width": w});

  const glow = mk("g", {});                       // lives under url(#cp-bloom)
  const halo = ring(typed === "angle" ? 5 : 6);
  glow.appendChild(halo);

  const face = mk("g", {});
  const disc = mk("circle", {cx: 0, cy: 0, r: R_DISC});
  const edge = ring(typed === "angle" ? 2.2 : 2.6);
  const text = mk("text", {"text-anchor": "middle", y: TILE * 0.10,
    "font-size": TILE * 0.27, "font-weight": 700,
    "font-family": "ui-monospace, SFMono-Regular, Menlo, monospace"});
  face.appendChild(disc); face.appendChild(edge); face.appendChild(text);

  return {glow, face, set(v, fed) {
    const col = connColour(v);
    halo.setAttribute("stroke", col.glow);
    edge.setAttribute("stroke", kind === "out" ? col.shape : "#ff9ab0");
    disc.setAttribute("fill", kind === "out" ? "#eafff3" : "#160c14");
    text.setAttribute("fill", kind === "out" ? "#0b3a22" : fed ? "#ffab74" : "#ff5a4a");
    text.textContent = fmtPort(v);
  }};
}
)};

// The operator, drawn in the Binary's purple circle. Without it a Binary is a
// green panel with a hole in it and the ship shows no computation at all -- which
// is the single largest gap direct observation found
// (knowledge/corepox-shipped-ui-observed.md).
const _OP_GLYPH = function _OP_GLYPH(){return(
{PLUS: "+", MINUS: "\u2212", TIMES: "\u00d7", DIVIDE: "\u00f7", LT: "<", GT: ">"}
)};

const _opNode = function _opNode(OP_GLYPH, TILE){return(
(op) => {
  const ns = "http://www.w3.org/2000/svg";
  // A GROUP, so the caller can counter-rotate it. The glyph is a character, and a
  // rotated character is a different character: SEEKER's GT rendered as a caret
  // at ship.a = 60 (tools/screenshots/wires-crop.png, 2026-08-20). Same reason
  // the port numerals are counter-rotated.
  const g = document.createElementNS(ns, "g");
  const t = document.createElementNS(ns, "text");
  t.setAttribute("text-anchor", "middle");
  t.setAttribute("y", TILE * 0.22);
  t.setAttribute("font-size", TILE * 0.62);
  t.setAttribute("font-weight", 700);
  t.setAttribute("font-family", "ui-monospace, SFMono-Regular, Menlo, monospace");
  t.setAttribute("fill", "#c060ff");
  t.textContent = OP_GLYPH[op ?? "PLUS"] ?? "?";
  g.appendChild(t);
  return g;
}
)};

// ConnectionView.cs, verbatim. A connector is tinted from the value flowing
// through it: white-gold at rest, green as it goes positive, violet as it goes
// negative, saturating at MAX_SATURATION_VALUE. Misc.Parse reads RRGGBBAA, and
// Color.Lerp interpolates alpha with the rest, which is why a zero connector is
// nearly transparent and a live one is not.
const _CONN_COLOURS = function _CONN_COLOURS(){return(
{
  MAX: 100,
  ZERO_GLOW:  [255, 244, 200, 0x27], NEG_GLOW:  [232,  91, 255, 0xFF],
  POS_GLOW:   [144, 255,  69, 0xE3],
  ZERO_SHAPE: [255, 255, 255, 0x6F], NEG_SHAPE: [193, 160, 255, 0xFF],
  POS_SHAPE:  [186, 255, 140, 0xFF]
}
)};

const _connColour = function _connColour(CONN_COLOURS){return(
(value) => {
  const C = CONN_COLOURS;
  const v = Number.isFinite(value) ? value : 0;
  const t = Math.min(1, Math.abs(v) / C.MAX);
  const mix = (a, b) => `rgba(${a.slice(0, 3).map((x, i) => Math.round(x + (b[i] - x) * t)).join(",")},` +
                        `${((a[3] + (b[3] - a[3]) * t) / 255).toFixed(3)})`;
  return {glow:  mix(C.ZERO_GLOW,  v > 0 ? C.POS_GLOW  : C.NEG_GLOW),
          shape: mix(C.ZERO_SHAPE, v > 0 ? C.POS_SHAPE : C.NEG_SHAPE)};
}
)};

// Which CELL a named port sits on. A connection addresses component ANCHORS, but
// the connector itself belongs to a cell -- Connection.transform.localPosition is
// `input.toWp()`, the source connector's own coordinate.
const _portCell = function _portCell(PORTS, rotTile){return(
(ship, at, port, kind) => {
  const c = ship.at(at[0], at[1]);
  if (!c || c.hp <= 0) return null;
  const o = (PORTS[c.type] ?? {})[kind === "out" ? "outs" : "ins"]?.[port];
  if (!o) return null;
  const [rx, ry] = rotTile(o, c.dir);
  return [c.px + rx, c.py + ry];
}
)};

// The wire. NOT the recovered sprite, and that is a decision made against direct
// observation on 2026-08-20.
//
// The atlas is real: `connection-N-0` is 64N + 18 wide with two 9-unit end rings,
// ConnectionAtlas.findNearest picks the closest authored length and ConnectionView
// scales it uniformly. It was drawn that way here until this cell was rewritten,
// and it produced a wire that was INVISIBLE on the mission it is introduced in --
// the sprite bows about 4% of its length, so a Constant-to-Engine wire ran straight
// through the Brain sitting between them and was covered by the hull.
//
// data/corepox/shipped-ui/40-wire.avif is the same two components in the shipped
// game and shows something else entirely: a thick green curve that leaves the
// output disc heading sideways, runs down the OUTSIDE of the hull clear of the
// Brain, and comes back into the input disc. Measured on that frame (tile ~160 px
// in a 358 px crop): source disc (135,120), destination (122,505), so a 2.4-tile
// run; the curve's outermost point is x~22 at y~310, which is 106 px -- 0.66 tiles,
// 0.27 of the length -- off the chord. A cubic whose two controls sit at the
// quarter points, offset perpendicular by 0.36 L, deviates by 0.75 * 0.36 = 0.27 L,
// which is that measurement. Stroke there is ~13 px on a 160 px tile = 0.08 tiles.
//
// UNRESOLVED: which side it bulges to. The one frame bows to the port side of a
// wire running aft, and this bows to that side always. A rule that routed around the actual hull would need the ship's occupancy
// and no observation demands it yet.
const _wireNode = function _wireNode(connColour, TILE){return(
() => {
  const ns = "http://www.w3.org/2000/svg";
  const g = document.createElementNS(ns, "g");
  const mk = (w, into) => { const q = document.createElementNS(ns, "path");
    q.setAttribute("fill", "none"); q.setAttribute("stroke-width", w);
    q.setAttribute("stroke-linecap", "round"); into.appendChild(q); return q; };
  const halo = document.createElementNS(ns, "g");
  halo.setAttribute("filter", "url(#cp-bloom)");
  g.appendChild(halo);
  const glow = mk(TILE * 0.16, halo);
  const shape = mk(TILE * 0.08, g);

  g.place = (ax, ay, bx, by, value) => {
    const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy);
    if (!(L > 0)) { g.style.display = "none"; return; }
    g.style.display = "";
    const ux = dx / L, uy = dy / L, nx = -uy, ny = ux;     // the side 40-wire.avif bows to
    // Adjacent and aligned degenerates to a straight beam through the joint
    // (data/corepox/shipped-ui/46-barrel31.avif); anything longer has to get out
    // of the hull's way.
    const k = L < TILE * 1.2 ? 0 : L * 0.36;
    const c = (t) => `${(ax + ux * L * t + nx * k).toFixed(1)},${(ay + uy * L * t + ny * k).toFixed(1)}`;
    const d = `M${ax.toFixed(1)},${ay.toFixed(1)}C${c(0.25)} ${c(0.75)} ${bx.toFixed(1)},${by.toFixed(1)}`;
    glow.setAttribute("d", d); shape.setAttribute("d", d);
    const col = connColour(value);
    glow.setAttribute("stroke", col.glow);
    shape.setAttribute("stroke", col.shape);
  };
  return g;
}
)};

const _shipNode = function _shipNode(componentNode, portNode, opNode, PORT_TYPE, TYPES, TILE, teamFilter, ART_TURRET_DEG, wireNode, portCell, PORTS, rotTile){return(
(ship) => {
  const ns = "http://www.w3.org/2000/svg";
  const root = document.createElementNS(ns, "g");
  const wires = document.createElementNS(ns, "g");
  // The team tint is on the HULL only. It used to sit on `root`, and
  // hue-rotate(190deg) turned a positive connector's green into the same magenta a
  // negative one paints -- so on every team-b ship the value colouring said the
  // opposite of the truth. Caught by tools/corepox-wire-probe.ts, which found the
  // paths correctly stroked rgb(190,255,119) under a filter that then moved them.
  const hull = document.createElementNS(ns, "g");
  hull.style.filter = teamFilter[ship.team] ?? "none";
  const body = document.createElementNS(ns, "g");
  body.setAttribute("filter", "url(#cp-bloom)");
  hull.appendChild(body);
  // Port haloes ride with the hull's bloom; the faces sit above it unfiltered,
  // because a bloomed numeral is not a readable numeral.
  const halos = document.createElementNS(ns, "g");
  halos.setAttribute("filter", "url(#cp-bloom)");
  const faces = document.createElementNS(ns, "g");
  // Wires OVER the hull. They were under it, which is where the sprite version
  // wanted them, and it is why a two-tile wire past a Brain could not be seen at
  // all. In 40-wire.avif the curve crosses the Constant's own box.
  root.appendChild(hull); root.appendChild(wires);
  root.appendChild(halos); root.appendChild(faces);

  // One node per connection, built once: reconcile() makes a new shipNode whenever
  // the Ship object is replaced, and the editor replaces it on every edit.
  const links = (ship.conns ?? []).map(k => {
    const n = wireNode();
    wires.appendChild(n);
    return {k, n};
  });
  // An input with nothing wired to it is not the same as an input reading zero,
  // and the game says so in the numerals' colour. Keyed by destination cell and
  // port, which is what a connection addresses.
  const fed = new Set((ship.conns ?? []).map(k => `${k.to[0]},${k.to[1]},${k.toPort}`));

  const parts = [];
  for (const c of ship.comps) {
    const holder = document.createElementNS(ns, "g");
    const art = componentNode(c);
    holder.appendChild(art);
    const op = c.type === "Binary" ? opNode(c.param) : null;
    if (op) holder.appendChild(op);
    body.appendChild(holder);
    const T = TYPES[c.type];
    const ports = [...T.outs.map(p => ["out", p]), ...T.ins.map(p => ["in", p])];
    const texts = ports.map(([kind, port]) => {
      const n = portNode(kind, (PORT_TYPE[c.type] ?? {})[port]);
      halos.appendChild(n.glow); faces.appendChild(n.face);
      // A value belongs to its CONNECTOR, which is where ConnectorCommon.LateUpdate
      // drew it. Stacking every port over the component anchor 22 units apart put
      // ProximityMine's 13 components under a pile of twenty numbers, which read
      // as overlapping parts.
      const o = (PORTS[c.type] ?? {})[kind === "out" ? "outs" : "ins"]?.[port];
      const [rx, ry] = o ? rotTile(o, c.dir) : [0, 0];
      const cell = [c.px + rx, c.py + ry];
      return {kind, port, n, cell,
              fed: kind === "out" || fed.has(`${cell[0]},${cell[1]},${port}`)};
    });
    parts.push({c, holder, texts, op, barrel: art.barrel,
                hp: c.hp, maxHp: c.maxHp ?? T.hp, lit: false, until: 0, faded: -1});
  }

  const at = (px, py) => [(px - ship.cx) * TILE, -(py - ship.cy) * TILE];
  // What a hit looks like. ShipComponent.damage() ends with
  // StartCoroutine("displayDamage"), and displayDamage is six lines:
  //
  //     material.shader = Shaders.highlight;
  //     yield return new WaitForSeconds(.1f);
  //     material.shader = Shaders.normal;
  //     spriteRenderer.color = new Color(1, 1, 1, (float) this.hp / stats.maxHp);
  //
  // so a hit does TWO things and the port had neither: a tenth of a second of flat
  // highlight, and a permanent alpha of hp/maxHp. Tom, 2026-08-21: "a component
  // should flash when damaged, so it's clear it is happening."
  //
  // `Sprites/Highlight` is a Unity built-in and is not in the decompile, so the
  // flat white is inferred from the name, not read. FLASH_MS is read: 0.1s.
  // brightness(0) invert(1) is the SVG equivalent -- every opaque pixel goes white
  // and alpha is untouched, which is what a flat highlight colour does to a sprite.
  const FLASH_MS = 100;
  const update = () => {
    const now = performance.now();
    for (const {k, n} of links) {
      const a = portCell(ship, k.from, k.fromPort, "out");
      const b = portCell(ship, k.to, k.toPort, "in");
      if (!a || !b) { n.style.display = "none"; continue; }
      const src = ship.at(k.from[0], k.from[1]);
      const [ax, ay] = at(a[0], a[1]), [bx, by] = at(b[0], b[1]);
      n.place(ax, ay, bx, by, src?.out?.[k.fromPort]);
    }
    root.setAttribute("transform",
      `translate(${(ship.x * TILE).toFixed(1)} ${(ship.y * TILE).toFixed(1)}) ` +
      `rotate(${ship.a.toFixed(2)})`);
    for (const p of parts) {
      const {c, holder, texts, op, barrel} = p;
      const lx = (c.px - ship.cx) * TILE, ly = -(c.py - ship.cy) * TILE;
      holder.setAttribute("transform", `translate(${lx.toFixed(1)} ${ly.toFixed(1)}) rotate(${c.dir})`);
      holder.style.display = c.hp > 0 ? "" : "none";
      if (c.hp < p.hp) p.until = c.hp > 0 ? now + FLASH_MS : 0;   // dead parts do not glow
      p.hp = c.hp;
      // Written only when it CHANGES: a filter is a repaint, and this runs for
      // every component of every ship every frame.
      const lit = p.until > now;
      if (lit !== p.lit) {
        p.lit = lit;
        holder.style.filter = lit ? "brightness(0) invert(1)" : "";
      }
      // Damage is cumulative and it shows. Floored at 0.35 rather than the
      // original's bare hp/maxHp: these drawings are neon line art on black, where
      // the sprites were filled, and below about a third a part stops reading as
      // damaged and starts reading as gone.
      const fade = Math.max(0.35, c.hp / p.maxHp);
      if (fade !== p.faded) { p.faded = fade; holder.style.opacity = fade.toFixed(3); }
      if (op) op.setAttribute("transform", `rotate(${(-(ship.a + c.dir)).toFixed(2)})`);
      if (barrel) barrel.setAttribute("transform",
        `rotate(${((c.turret ?? 0) - ART_TURRET_DEG).toFixed(1)})`);
      texts.forEach(({kind, port, n, cell, fed}) => {
        const v = kind === "out" ? c.out[port] : c.in[port];
        // A port is a SOCKET and it is drawn whether or not anything is in it. It
        // used to vanish on a null or NaN, which meant a Radar with no target had
        // no visible outputs at all -- Tom, 2026-08-20: "The radar has no clear
        // output connectors" -- and connect mode chequered a ring around nothing.
        // 63-ports.avif has a disc on every port of the aiming ship.
        const hide = c.hp <= 0;
        n.glow.style.display = n.face.style.display = hide ? "none" : "";
        if (hide) return;
        n.set(v, fed);
        const [cx, cy] = at(cell[0], cell[1]);
        // counter-rotate so numbers stay upright, as they did in screen space
        const t = `translate(${cx.toFixed(1)} ${cy.toFixed(1)}) rotate(${(-ship.a).toFixed(2)})`;
        n.glow.setAttribute("transform", t); n.face.setAttribute("transform", t);
      });
    }
  };
  update();
  return {node: root, update};
}
)};

// Stars are at infinity: they do not move when the camera moves and they do not
// change size when it zooms. Reported as "the star map resizes but I think that
// wouldn't if the stars were infinity away" -- the field used to be a plain <g> in
// user space, so it scaled and slid with every viewBox write, and every reframe
// during a match visibly breathed.
//
// So it is laid out in the 0..w x 0..h box the view was CONSTRUCTED with, and the
// caller maps that box onto the current viewBox on every draw. Fixed on screen,
// no edges to reach, and the cost is that a moving ship gets no parallax from the
// background -- the camera follows it, so there was little to begin with.
const _starfield = function _starfield(){return(
(w, h, n = 260, seed = 7) => {
  const ns = "http://www.w3.org/2000/svg";
  const g = document.createElementNS(ns, "g");
  let s = seed;
  const rnd = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
  for (let i = 0; i < n; i++) {
    const c = document.createElementNS(ns, "circle");
    c.setAttribute("cx", rnd() * w); c.setAttribute("cy", rnd() * h);
    c.setAttribute("r", rnd() * 1.6 + 0.3);
    c.setAttribute("fill", "#cfe6ff");
    c.setAttribute("opacity", (rnd() * 0.5 + 0.08).toFixed(2));
    g.appendChild(c);
  }
  return g;
}
)};

const _battlefield = function _battlefield(shipNode, starfield, symbolSheet, TILE, UNITS){return(
(world, {width = 900, height = 560, span = 60, follow = true, focus = []} = {}) => {
  symbolSheet;
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  const W = span * TILE, H = W * height / width;
  svg.setAttribute("viewBox", `${-W/2} ${-H/2} ${W} ${H}`);
  svg.setAttribute("width", "100%");
  svg.style.cssText = `display:block;background:#05070a;border-radius:6px;aspect-ratio:${width}/${height}`;
  const stars = starfield(W, H);
  svg.appendChild(stars);

  const hulls = document.createElementNS(ns, "g");
  const locks = document.createElementNS(ns, "g");     // radar -> what it is looking at
  const fx = document.createElementNS(ns, "g");
  fx.setAttribute("filter", "url(#cp-bloom)");
  svg.appendChild(locks); svg.appendChild(hulls); svg.appendChild(fx);

  // Particles are drawn as ONE PATH PER COLOUR, never one node per particle.
  // Measured 2026-08-20 (tools/bench/svg-particles.ts, 6x CPU throttle, n=2000):
  // a node per particle rebuilt each frame -- which is what this did -- ran 13fps,
  // pooled nodes 40fps, lanes 120fps at 2.3ms of script. Node COUNT is the cost;
  // the shape drawn into the path is nearly free, and cp-bloom is free outright
  // (it prices per filter-region area, not per particle).
  //
  // A dot is a zero-length segment under a round linecap: `M x y h0` paints a
  // disc of diameter stroke-width. The fade is the lane the particle is filed
  // into, so it costs no per-node opacity -- which was itself the second most
  // expensive thing in the sheet.
  // Dimmest first. The floor is not black-adjacent on purpose: the old draw was a
  // flat #8fd0ff at opacity 0.5, which sits about here over black, so the tail of
  // the plume stays as visible as the whole plume used to be.
  const EXHAUST_RAMP = ["#3f6fb0", "#4f86c9", "#5fa0e4", "#77b6ef", "#93cbf8",
                        "#b3ddfd", "#d6eeff", "#ffffff"];
  const FRAG_RAMP    = ["#5a2b0c", "#8f4410", "#c26a17", "#e79433", "#ffce6b"];
  const lane = (stroke, width) => {
    const e = document.createElementNS(ns, "path");
    e.setAttribute("stroke", stroke); e.setAttribute("stroke-width", width);
    e.setAttribute("stroke-linecap", "round"); e.setAttribute("fill", "none");
    fx.appendChild(e); return e;
  };
  const fragLanes    = FRAG_RAMP.map(c => lane(c, 14));
  const exhaustLanes = EXHAUST_RAMP.map(c => lane(c, 8));
  const beamLane     = lane("#ff5a4a", 7);

  // splitDetached() pushes new bodies into world.ships mid-match, so the node set
  // has to be reconciled every frame. Building it once left every severed piece
  // invisible -- the ship appeared to shed parts into nothing.
  const nodes = new Map();
  const reconcile = () => {
    for (const s of world.ships) {
      if (nodes.has(s)) continue;
      const n = shipNode(s);
      hulls.appendChild(n.node);
      nodes.set(s, n);
    }
    for (const [s, n] of nodes) {
      if (world.ships.includes(s)) continue;
      n.node.remove(); nodes.delete(s);
    }
  };

  // The view used to be a fixed box on the origin, so Avoid's player left the top
  // of the frame at y=-38 and Aim's rockets spawned 22 tiles outside it. Frame
  // everything that matters instead -- every live body plus any fixed points the
  // caller cares about (a jump zone) -- never tighter than the mission's own span,
  // and eased so the box does not snap when a ship dies.
  // `focus` and `minSpan` are mutable on the returned view: the editor wants a
  // close frame on the ship, the match wants everything that matters in shot, and
  // it is the same view object either way.
  // `framed` narrows what the camera has to contain. In the editor that is the
  // player alone: Twin turrets puts two enemy posts 20 tiles up, and framing them
  // too shrank the ship being edited to 21px slots at the bottom of the frame.
  // `zoom` divides whatever width the auto-frame arrives at, so the wheel changes
  // how close you are without taking the camera off what it is following -- the
  // alternative, a free viewBox, fights frame() and is erased on the next draw.
  // It multiplies AFTER the minSpan clamp, so zooming in can go closer than the
  // mission's own span.
  // `follow` is mutable, not the closure constant it was: freezing the camera used
  // to be done by handing it nothing to frame, and that only worked because
  // frame() then returned without writing a viewBox. It writes one now (see
  // below), so a freeze has to say so.
  // `pad` is the margin the camera keeps around whatever it is framing, in tiles,
  // and it is the knob that actually sets the zoom on a small ship: 6 tiles a side
  // plus the aspect correction floors the board at ~19 tiles across, so minSpan
  // below that does nothing. The editor drops it to get near the shipped board
  // zoom, where a tile is ~12% of the screen width.
  // `pan` offsets the camera centre from whatever the auto-frame chose, in view
  // units. Without it the wheel could only zoom about the centre of the framed
  // content, so there was no way to look at a corner. Tom, 2026-08-20: "Zoom is
  // always centered, so I can't use it to pan."
  // `free` DETACHES the camera. `pan` is an offset from whatever the auto-frame
  // chose, and the auto-frame recomputes the bounding box of every framed ship and
  // focus point on every draw -- so a panned camera still slides whenever a part is
  // placed, a ship moves, or the ghosts under a picked chip change the box. Tom,
  // 2026-08-22: "Its quite hard using the camera controls. After panning I think
  // the camera should dettach from the scene instead of trying to follow all the
  // components." Once set to {cx, cy, w} the camera holds that absolute centre and
  // width and stops asking what is on the board; pan and zoom move THAT instead.
  // Cleared by resetView, which is the recentre pad, and by a board loading a new
  // session.
  const api = {focus, minSpan: span, pad: 6, framed: null, zoom: 1, pan: [0, 0],
               follow, dragging: false, panLock: false, free: null};
  let cam = {cx: 0, cy: 0, w: W, h: H};
  const frame = (k = 0.12) => {
    const pts = [];
    // The ORIGIN CELL, not ship.x/y. ship.x/y is the world position of the centre
    // of mass, and the centre of mass moves every time a part is placed or lost, so
    // a camera on it pans on every edit -- the second half of "when i place a
    // component the center of the ship shifts". worldOf is pure arithmetic on
    // px/py, so a bare {px, py} is a legal argument. In a match the two differ by
    // less than a tile and this changes nothing.
    for (const s of api.framed ?? world.ships) if (s.live.length) {
      const [ox, oy] = s.worldOf({px: 0, py: 0});
      pts.push([ox * TILE, oy * TILE]);
    }
    for (const f of api.focus) pts.push([f[0] * TILE, f[1] * TILE]);
    const write = () => {
      const x = cam.cx - cam.w / 2, y = cam.cy - cam.h / 2;
      svg.setAttribute("viewBox",
        `${x.toFixed(0)} ${y.toFixed(0)} ${cam.w.toFixed(0)} ${cam.h.toFixed(0)}`);
      stars.setAttribute("transform",
        `translate(${x.toFixed(1)} ${y.toFixed(1)}) ` +
        `scale(${(cam.w / W).toFixed(4)} ${(cam.h / H).toFixed(4)})`);
    };
    if (api.free) {
      const w = api.free.w / api.zoom, h = w * height / width;
      const cx = api.free.cx + api.pan[0], cy = api.free.cy + api.pan[1];
      cam = {cx: cam.cx + (cx - cam.cx) * k, cy: cam.cy + (cy - cam.cy) * k,
             w: cam.w + (w - cam.w) * k, h: cam.h + (h - cam.h) * k};
      write();
      return;
    }
    if (!pts.length) {
      // Nothing to frame: the first mission starts you with an EMPTY ship, so
      // there is no live component anywhere and the board would otherwise ignore
      // the wheel entirely -- which is how "we need to zoom" read as "zoom is
      // broken" on two of the three boards. Hold the centre, honour the zoom.
      cam = {cx: cam.cx + (api.pan[0] - cam.cx) * k, cy: cam.cy + (api.pan[1] - cam.cy) * k,
             w: cam.w + (W / api.zoom - cam.w) * k, h: cam.h + (H / api.zoom - cam.h) * k};
      write();
      return;
    }
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const [x, y] of pts) {
      if (x < x0) x0 = x; if (x > x1) x1 = x;
      if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
    const pad = api.pad * TILE;
    const minW = api.minSpan * TILE;
    let w = Math.max(x1 - x0 + 2 * pad, minW, (y1 - y0 + 2 * pad) * width / height) / api.zoom;
    const h = w * height / width;
    const cx = (x0 + x1) / 2 + api.pan[0], cy = (y0 + y1) / 2 + api.pan[1];
    cam = {cx: cam.cx + (cx - cam.cx) * k, cy: cam.cy + (cy - cam.cy) * k,
           w: cam.w + (w - cam.w) * k, h: cam.h + (h - cam.h) * k};
    write();
  };

  // snap=true jumps the camera to its target instead of easing. The editor needs
  // it: a click is aimed at a connector the player can SEE, and a viewBox that
  // moves between the paint and the click puts the hit a tile out.
  const draw = (snap = false) => {
    reconcile();
    if (api.follow) frame(snap ? 1 : 0.12);
    for (const n of nodes.values()) n.update();
    // A Radar's two numbers are the only evidence it has found anything, and they
    // sit on the hull, tiles away from what they describe. Draw the sightline the
    // engine actually used -- `c.lock` is set where bearing and dist are computed,
    // so this cannot disagree with the values printed on the component.
    //
    // The shipped trace is a drawn object, not a debug overlay, and these numbers are
    // its numbers. Radar.prefab's `radar_trace` is a SpriteRenderer with m_DrawMode 2
    // (Tiled), m_Size (0.19, 10), parented to the `arrow` that rotates onto the target
    // at local (0, 0.64); RadarFn sets size.y = nearest.distance - 0.64. So it starts
    // ONE TILE out from the sensor and ends on the target. The sprite itself
    // (data/corepox/sprites/radar_trace.png, 57x60 at 300ppu = 0.19 x 0.2 world units)
    // is opaque on rows 15..44 -- a 50% duty cycle -- with core ink across 38 of its 57
    // columns at (230,230,104) and a faint halo (peak alpha 28/255) either side.
    // In tiles: dash period 0.3125, core width 0.198, halo width 0.297.
    locks.textContent = "";
    const dash = (0.15625 * TILE).toFixed(2);
    for (const s of world.ships) for (const c of s.live) {
      if (c.type !== "Radar" || !c.lock) continue;
      const [ax, ay, bx, by] = c.lock;
      const d = Math.hypot(bx - ax, by - ay);
      if (d <= 1) continue;                          // target is inside the stand-off
      const x1 = ((ax + (bx - ax) / d) * TILE).toFixed(1);
      const y1 = ((ay + (by - ay) / d) * TILE).toFixed(1);
      const x2 = (bx * TILE).toFixed(1), y2 = (by * TILE).toFixed(1);
      for (const [w, op] of [[0.297, 0.18], [0.198, 0.85]]) {
        const l = document.createElementNS(ns, "line");
        l.setAttribute("x1", x1); l.setAttribute("y1", y1);
        l.setAttribute("x2", x2); l.setAttribute("y2", y2);
        l.setAttribute("stroke", "#e6e668");
        l.setAttribute("stroke-width", (w * TILE).toFixed(1));
        l.setAttribute("stroke-dasharray", `${dash} ${dash}`);
        l.setAttribute("opacity", op);
        locks.appendChild(l);
      }
    }
    // One string per lane, one setAttribute per lane, whatever the particle count.
    // See the lane comment where these were built for the measurement.
    const eBuf = ["", "", "", "", "", "", "", ""], fBuf = ["", "", "", "", ""];
    let bBuf = "";
    for (const p of world.particles ?? []) {
      const x = (p.x * TILE).toFixed(1), y = (p.y * TILE).toFixed(1);
      if (p.kind === "beam") {
        const sp = Math.hypot(p.vx, p.vy) || 1;
        bBuf += `M${((p.x - p.vx / sp * UNITS.BEAM_LEN) * TILE).toFixed(1)} `
              + `${((p.y - p.vy / sp * UNITS.BEAM_LEN) * TILE).toFixed(1)}L${x} ${y}`;
      } else if (p.kind === "frag") {
        const i = Math.min(fBuf.length - 1, (p.ttl / (p.ttl0 || UNITS.FRAG_TTL) * fBuf.length) | 0);
        fBuf[i < 0 ? 0 : i] += `M${x} ${y}h0`;
      } else {
        // Brightness is how far through its OWN life the particle is, which needs
        // the life it was born with. Bucketing on raw ttl looks like it works --
        // exhaust ttl is World.rng(), already 0..1 -- and does not: a population
        // born uniform on [0,1) and dying at 0 has remaining-life density 2(1-x),
        // so 23% of the plume lands in the dimmest lane and 1.6% in the brightest.
        // The plume came out invisible. Measured 2026-08-20, and the reason the
        // engine now records ttl0 at all.
        const life = p.ttl0 || 1;
        const i = Math.min(eBuf.length - 1, ((p.ttl / life) * eBuf.length) | 0);
        eBuf[i < 0 ? 0 : i] += `M${x} ${y}h0`;
      }
    }
    for (let i = 0; i < eBuf.length; i++) exhaustLanes[i].setAttribute("d", eBuf[i]);
    for (let i = 0; i < fBuf.length; i++) fragLanes[i].setAttribute("d", fBuf[i]);
    beamLane.setAttribute("d", bBuf);
  };
  // Wheel zoom. deltaY is in pixels, lines or pages depending on the device, and
  // Firefox reports lines -- normalising first is the difference between a
  // trackpad nudge and a jump to the clamp. A pinch on a trackpad arrives here as
  // a wheel with ctrlKey, so it needs no separate handling.
  //
  // preventDefault, so the page does not scroll under the pointer at the same
  // time; snap rather than ease, because a viewBox that is still moving when the
  // click lands puts the hit a tile out in every editor built on this.
  // A wheel arrives many times per frame and each event used to draw, which is
  // where "super janky" came from: a mouse notch is deltaY 100, so several
  // events between two frames compounded into one visible jump, and every one of
  // them reconciled and redrew every ship. The events accumulate into a target
  // instead, and one rAF eases toward it -- the frame still SNAPS to whatever
  // zoom the ease is at, so the click map an editor reads is always the viewBox
  // on screen, never one it is on the way to.
  //
  // The zoom is anchored on the POINTER, not on the centre. The auto-frame width is
  // base/zoom with base independent of zoom, so the next width is predictable --
  // w' = w * zoomOld / zoomNew -- and holding the world point under the cursor
  // still needs the centre to move by (f - 0.5)(w - w'), where f is the cursor's
  // fraction across the box. Predicting it means one draw per frame rather than a
  // draw, a measure and a correcting draw.
  let zoomTo = 1, zoomRaf = null, at = [0.5, 0.5];
  const settle = () => {
    const z0 = api.zoom;
    api.zoom += (zoomTo - api.zoom) * 0.3;
    const done = Math.abs(zoomTo - api.zoom) < 1e-3;
    if (done) api.zoom = zoomTo;
    if (api.zoom !== z0) {
      const w1 = cam.w * z0 / api.zoom, h1 = cam.h * z0 / api.zoom;
      api.pan[0] += (at[0] - 0.5) * (cam.w - w1);
      api.pan[1] += (at[1] - 0.5) * (cam.h - h1);
    }
    draw(true);
    zoomRaf = done ? null : requestAnimationFrame(settle);
  };
  svg.addEventListener("wheel", (ev) => {
    ev.preventDefault();
    const r = svg.getBoundingClientRect();
    at = [(ev.clientX - r.left) / r.width, (ev.clientY - r.top) / r.height];
    const dy = ev.deltaMode === 1 ? ev.deltaY * 16
             : ev.deltaMode === 2 ? ev.deltaY * (svg.clientHeight || 400)
             : ev.deltaY;
    zoomTo = Math.min(8, Math.max(0.15, zoomTo * Math.exp(-dy * 0.0008)));
    if (!zoomRaf) zoomRaf = requestAnimationFrame(settle);
  }, {passive: false});

  // Drag to pan. `panLock` is for an editor whose own drag starts on the board --
  // the connect gesture sets it in its pointerdown, which runs after this one, so
  // the lock is read on the first MOVE and not on the down. `dragging` stays true
  // through the click that follows a real drag, so the editor can ignore it: a pan
  // that ends over a component must not also select it.
  let down = null;
  svg.addEventListener("pointerdown", (ev) => {
    if (ev.button !== 0) return;
    down = {x: ev.clientX, y: ev.clientY, pan: [api.pan[0], api.pan[1]], moved: false};
  });
  svg.addEventListener("pointermove", (ev) => {
    if (!down || api.panLock) return;
    const dx = ev.clientX - down.x, dy = ev.clientY - down.y;
    if (!down.moved && Math.hypot(dx, dy) < 5) return;
    down.moved = true; api.dragging = true;
    // Detach on the first real drag, not on the pointerdown: a 4px wobble on a
    // click must not take the camera off the fight. The anchor is the auto-frame's
    // own answer with pan and zoom taken back out -- base centre is `cam - pan` and
    // base width is `cam.w * zoom` -- so the camera does not jump at the moment it
    // detaches, and `down.pan` stays a valid origin for the drag in progress.
    if (!api.free)
      api.free = {cx: cam.cx - api.pan[0], cy: cam.cy - api.pan[1], w: cam.w * api.zoom};
    const r = svg.getBoundingClientRect();
    api.pan[0] = down.pan[0] - dx / r.width * cam.w;
    api.pan[1] = down.pan[1] - dy / r.height * cam.h;
    draw(true);
  });
  const release = () => {
    const wasDrag = down?.moved;
    down = null;
    if (wasDrag) setTimeout(() => { api.dragging = false; }, 0);
  };
  svg.addEventListener("pointerup", release);
  svg.addEventListener("pointercancel", release);
  api.resetView = () => { api.free = null; api.pan[0] = api.pan[1] = 0;
                          zoomTo = api.zoom = 1; draw(true); };
  // `free` counts as moved even at pan 0 zoom 1, so the recentre pad is offered
  // for as long as the camera is detached -- it is the only way back.
  api.moved = () => !!api.free || api.pan[0] !== 0 || api.pan[1] !== 0 || api.zoom !== 1;

  draw();
  // The screen -> tile map, from this view's own viewBox. Exposed because every
  // caller that takes a pointer needs it and re-deriving it is a copy that drifts
  // from `frame()` the moment zoom or follow moves the box.
  const tileAt = (ev) => {
    const r = svg.getBoundingClientRect(), vb = svg.viewBox.baseVal;
    return [(vb.x + (ev.clientX - r.left) / r.width * vb.width) / TILE,
            (vb.y + (ev.clientY - r.top) / r.height * vb.height) / TILE];
  };
  return Object.assign(api, {svg, draw, tileAt});
}
)};

const _SEEKER = function _SEEKER(){return(
{
  name: "seeker",
  components: [
    {type: "Brain",    pos: [0, 0]},
    {type: "Radar",    pos: [0, 1]},
    {type: "Constant", pos: [2, 1], param: "100"},
    {type: "Binary",   pos: [1, 1],  param: "GT"},
    {type: "Binary",   pos: [-1, 1], param: "LT"},
    {type: "Binary",   pos: [1, 0],  param: "TIMES"},
    {type: "Binary",   pos: [-1, 0], param: "TIMES"},
    {type: "Engine",   pos: [-1, -1]},
    {type: "Engine",   pos: [1, -1]},
    {type: "Engine",   pos: [0, -1]},
    {type: "Lazer",    pos: [0, 2]},
    {type: "Armour",   pos: [0, -2]}
  ],
  connections: [
    {from: [0, 1], fromPort: "bearing", to: [1, 1],  toPort: "a"},
    {from: [0, 1], fromPort: "bearing", to: [-1, 1], toPort: "a"},
    {from: [1, 1],  fromPort: "out", to: [1, 0],  toPort: "a"},
    {from: [2, 1],  fromPort: "out", to: [1, 0],  toPort: "b"},
    {from: [-1, 1], fromPort: "out", to: [-1, 0], toPort: "a"},
    {from: [2, 1],  fromPort: "out", to: [-1, 0], toPort: "b"},
    {from: [1, 0],  fromPort: "out", to: [-1, -1], toPort: "in"},
    {from: [-1, 0], fromPort: "out", to: [1, -1],  toPort: "in"},
    {from: [2, 1],  fromPort: "out", to: [0, -1],  toPort: "in"},
    {from: [2, 1],  fromPort: "out", to: [0, 2],   toPort: "in"}
  ]
}
)};

const _DRONE = function _DRONE(){return(
{
  name: "drone",
  components: [
    {type: "Brain",  pos: [0, 0]},
    {type: "Armour", pos: [0, 1]},  {type: "Armour", pos: [1, 0]},
    {type: "Armour", pos: [-1, 0]}, {type: "Armour", pos: [0, -1]},
    {type: "Orb",    pos: [0, 2]}
  ],
  connections: []
}
)};

const _demo = function _demo(Ship, World, battlefield, SEEKER, DRONE, invalidation){
  const a = new Ship(SEEKER, {team: "a", x: -8, y: 3, a: 60});
  const b = new Ship(DRONE,  {team: "b", x: 7, y: -3, a: 200});
  const world = new World([a, b]);
  const view = battlefield(world, {span: 26});
  let stop = false;
  invalidation.then(() => stop = true);
  const loop = () => {
    if (stop) return;
    for (let i = 0; i < 2; i++) world.step();   // 2 sim ticks per frame
    view.draw();
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  return view.svg;
};

const _title = function _title(md){return(
md`# Corepox render

The engine's state drawn with the recovered vector art. The neon is \`cp-bloom\` from
\`corepox-assets\`, applied at draw time — in Unity that was a 2DxFX shader, so it was never in the
art files.`
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };
  main.define("module @tomlarkworthy/corepox-assets",
    async () => runtime.module((await import("/@tomlarkworthy/corepox-assets.js?v=4")).default));
  main.define("module @tomlarkworthy/corepox-engine",
    async () => runtime.module((await import("/@tomlarkworthy/corepox-engine.js?v=4")).default));
  for (const n of ["SYMBOLS", "SYMBOL_FOR", "TILE", "symbolSheet", "sprite", "use"])
    main.define(n, ["module @tomlarkworthy/corepox-assets", "@variable"], (_, v) => v.import(n, _));
  for (const n of ["Ship", "World", "TYPES", "PORTS", "rotTile", "geom", "DT", "UNITS", "simulate"])
    main.define(n, ["module @tomlarkworthy/corepox-engine", "@variable"], (_, v) => v.import(n, _));

  $def("_title", "title", ["md"], _title);
  $def("_teamFilter", "teamFilter", [], _teamFilter);
  $def("_TURRET_PIVOT", "TURRET_PIVOT", [], _TURRET_PIVOT);
  $def("_mineralNode", "mineralNode", ["TYPES", "TILE"], _mineralNode);
  $def("_componentNode", "componentNode", ["SYMBOL_FOR", "SYMBOLS", "TILE", "TURRET_PIVOT", "TYPES", "mineralNode"], _componentNode);
  $def("_ART_TURRET_DEG", "ART_TURRET_DEG", [], _ART_TURRET_DEG);
  $def("_CONN_COLOURS", "CONN_COLOURS", [], _CONN_COLOURS);
  $def("_connColour", "connColour", ["CONN_COLOURS"], _connColour);
  $def("_portCell", "portCell", ["PORTS","rotTile"], _portCell);
  $def("_PORT_TYPE", "PORT_TYPE", [], _PORT_TYPE);
  $def("_cogPath", "cogPath", [], _cogPath);
  $def("_fmtPort", "fmtPort", [], _fmtPort);
  $def("_portNode", "portNode", ["cogPath","fmtPort","connColour","TILE"], _portNode);
  $def("_OP_GLYPH", "OP_GLYPH", [], _OP_GLYPH);
  $def("_opNode", "opNode", ["OP_GLYPH","TILE"], _opNode);
  $def("_wireNode", "wireNode", ["connColour","TILE"], _wireNode);
  $def("_shipNode", "shipNode", ["componentNode","portNode","opNode","PORT_TYPE","TYPES","TILE","teamFilter","ART_TURRET_DEG","wireNode","portCell","PORTS","rotTile"], _shipNode);
  $def("_starfield", "starfield", [], _starfield);
  $def("_battlefield", "battlefield", ["shipNode","starfield","symbolSheet","TILE","UNITS"], _battlefield);
  $def("_SEEKER", "SEEKER", [], _SEEKER);
  $def("_DRONE", "DRONE", [], _DRONE);
  $def("_demo", "demo", ["Ship","World","battlefield","SEEKER","DRONE","invalidation"], _demo);
  return main;
}