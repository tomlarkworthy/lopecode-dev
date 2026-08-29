// @tomlarkworthy/corepox-board — the board, and the only one.
//
// Extracted from @tomlarkworthy/corepox-game on 2026-08-21 because the design
// says there is one screen: "Refit is not a mode with its own furniture -- it is
// this board with the clock in HARD and the hold full" ("Shipyard Concepts",
// Claude Design project f9a1c3c2, turn 9, which explicitly retires turns 6a and
// 7a). Before this the mission board and the encounter refit bench were two
// separate implementations of the same idea -- corepox-game's press table here,
// and corepox-shipyard's `shipEditor` with its mode rail, click-only wiring and
// no scrub. Tom, 2026-08-21: "The UX on the main game has been upgraded a lot but
// other encounters like dual-encounter don't seem to be using it."
//
// The board takes a SESSION and paints it. A session is the shape corepox-game's
// `newSession` returns, and nothing here knows what a mission is:
//
//   {player, world, mission, inventory, state, paused, hasPlayed, initialParams,
//    cmd, home}
//
// `mission` is read for `allow`, `envelope`, `buildOnce`, `span`, `zone` and
// `objectives` -- an editor session supplies `{allow: {...}}` and nothing else,
// and every piece of mission furniture then draws nothing. `boardSession` builds
// exactly that for a caller that only wants a ship editor.

const _title = function _title(md){return(
md`# Corepox — the board

One board, and the same one in every state. It is handed a session and paints it;
the clock is the only mode axis. See \`shipBoard\` below, and
\`plan/corepox-ux.md\` §12 for what each gesture replaced.`
)};

const _INFO = function _INFO(){return(
{
  Brain:        "The core. Everything bolts to it and the ship dies with it.",
  Armour:       "Soaks damage. Nothing else.",
  Constant:     "One number you set by hand. Feeds anything that takes an input.",
  Binary:       "Two inputs, one operator, one output. This is where a ship computes.",
  Radar:        "Finds the nearest enemy. Outputs its bearing and its distance.",
  Engine:       "Thrust, in proportion to its input. Fires along its own axis.",
  Lazer:        "Fires straight ahead while its input is non-zero.",
  LaserTurret2: "Turns to the angle on its input and fires along it.",
  Explosive:    "Detonates when its input goes positive. Takes the ship with it.",
  Orb:          "Massive damage to whatever it touches, and it blocks incoming lazer fire.",
  Hyperdrive:   "Jumps the ship when its input goes positive."
}
)};

// The six actions on a placed component, in the shipped 3x2 order and colours
// (data/corepox/shipped-ui/37-select.avif). Kept as data because the enablement
// rule is per action and per mission, and a run of six `if`s hid which was which.
const _MENU_ACTIONS = function _MENU_ACTIONS(){return(
[{id: "info",    glyph: "i",  label: "info",    hue: "#ffd23f"},
 {id: "connect", glyph: "⚭", label: "connect", hue: "#8fd0ff"},
 {id: "cut",     glyph: "✂", label: "cut",     hue: "#8fd0ff"},
 {id: "move",    glyph: "✛", label: "move",    hue: "#5ef2a0"},
 {id: "rotate",  glyph: "⟳", label: "rotate",  hue: "#5ef2a0"},
 {id: "delete",  glyph: "✕", label: "delete",  hue: "#ff6b5a"}]
)};

// The design's palette, read off "Shipyard Concepts" turns 7a/8a/9a. It is not the
// old HUD's: the ground goes darker and flatter, and every hue now MEANS one
// thing, which is what makes the press table legible without a legend --
// lime is a port, orange is a value you can scrub, warm orange is your own hull,
// green is a thing you may commit, cyan is the camera, red is theirs.
//
// A cell rather than a constant inside the board, because the host paints into the
// board's corners and a second copy of these hex values is a second thing to keep
// in step.
const _PALETTE = function _PALETTE(){return(
{
  C: {ink: "#e8ecf5", dim: "rgba(232,236,245,.42)", faint: "rgba(232,236,245,.28)",
      cyan: "#4fd8e8", green: "#56e39f", lime: "#8fe64a", amber: "#ffc42e",
      orange: "#ff9a3c", hull: "#ffb066", red: "#ff5c72", purple: "#c46bff",
      panel: "rgba(6,8,14,.94)", line: "rgba(255,255,255,.1)"},
  // No webfont: JetBrains Mono is the design's face and is named first, but a
  // lopecode notebook is a single file with no network, so the stack has to land
  // on something the machine already has.
  MONO: "'JetBrains Mono',ui-monospace,SFMono-Regular,Menlo,monospace"
}
)};

// A session for a caller that wants a ship editor and nothing else -- the refit
// bench, the level editor. Same shape corepox-game's `newSession` answers, with
// the mission reduced to the two things the board actually reads off it: what is
// allowed, and -- through `freeBuild` -- that a part may go anywhere touching the
// hull rather than only on a mission's recorded envelope.
const _boardSession = function _boardSession(Ship, World, loadShipSpec){return(
(spec, {parts = {}, allow = {build: 1, connect: 1, rotate: 1, modify: 1},
        name = "hull", team = "player"} = {}) => {
  // Through the loader, never straight to `new Ship`: corpus designs NAME relics
  // rather than carrying them and address wires by CELL, so an unloaded design
  // arrives with parts missing and wires silently dropped. Idempotent, so an
  // already-anchored spec is unaffected.
  const player = new Ship(loadShipSpec(structuredClone(
    spec ?? {name, components: [], connections: []})).spec, {team, x: 0, y: 0, a: 0});
  const S = {
    player, world: new World([player]),
    mission: {allow, title: spec?.name ?? name},
    // `parts` is a hold, `{type: n}`. An ARRAY instead is an explicit rail: ordered
    // rows that may carry `price` (a market's goods) and `group` (a shelf heading),
    // which is what turn 10a's station needs and a hold cannot express -- an object
    // has no order and no room for a second number per key.
    inventory: Array.isArray(parts) ? parts.map(i => ({...i}))
                                    : Object.entries(parts).map(([type, n]) => ({type, n})),
    state: "build", paused: false, hasPlayed: false,
    freeBuild: true, initialParams: new Map(), cmd: null, home: null
  };
  for (const c of player.comps) S.initialParams.set(c, c.param);
  return S;
}
)};

// The tempo chip, shared by the campaign and by every refit bench, because turn 9's
// claim is that they are the same screen: "Refit is not a mode with its own
// furniture -- it is this board with the clock in HARD and the hold full." A bench
// that drew no chip, or drew its own, would be making the claim false in the one
// place a player can see it.
//
// Hues are turn 9's and are not a traffic light. LIVE is RED and HARD is ink:
// green said "fine" about the only state where damage lands, and amber said
// "warning" about the state that cannot hurt you. `rgb` rides along because the
// chip tints its own border (.5) and ground (.08) from the same colour.
const _CLOCK = function _CLOCK(PALETTE){const {C} = PALETTE; return(
{
  build:     {word: "HARD",      hue: C.ink,     rgb: "232,236,245", sub: "clock stopped · build freely"},
  kinematic: {word: "KINEMATIC", hue: C.cyan,    rgb: "79,216,232",  sub: "program runs · ships frozen · no damage"},
  live:      {word: "LIVE",      hue: C.red,     rgb: "255,92,114",  sub: "clock runs · damage lands"},
  win:       {word: "VICTORY",   hue: C.amber,   rgb: "255,196,46",  sub: "objectives resolved"},
  loss:      {word: "DEFEAT",    hue: "#ff8f6d", rgb: "255,143,109", sub: "restart to try again"}
}
)};

// `t` null draws no clock column -- a refit has no elapsed time to report, and a
// chip reading 0.0s beside HARD says the match has started when it has not. The
// returned node carries `.time`, the span the caller rewrites each frame; the chip
// itself is only repainted on a state change.
const _tempoChip = function _tempoChip(CLOCK, PALETTE, htl){const {C, MONO} = PALETTE; return(
(mode, {t = null, mob = false} = {}) => {
  const md = CLOCK[mode] ?? CLOCK.build;
  const time = t == null ? null
    : htl.html`<span style="font:400 ${mob ? 8 : 11}px ${MONO};color:${C.dim};
        font-variant-numeric:tabular-nums">${t.toFixed(1)}s</span>`;
  const node = mob
    ? htl.html`<div style="display:flex;flex-direction:column;align-items:flex-end">
        <span style="font:700 8.5px ${MONO};letter-spacing:.1em;color:${md.hue}">${md.word}</span>
        ${time ?? ""}</div>`
    : htl.html`<div style="display:flex;align-items:center;gap:10px;padding:7px 13px;
        border-radius:8px;background:rgba(${md.rgb},.08);border:1px solid rgba(${md.rgb},.5)">
        <div style="display:flex;flex-direction:column;gap:2px">
          <span style="font:700 11px ${MONO};letter-spacing:.16em;color:${md.hue}">${md.word}</span>
          <span style="font:400 8.5px ${MONO};color:${C.dim}">${md.sub}</span></div>
        ${time ? htl.html`<span style="width:1px;height:24px;
          background:rgba(255,255,255,.14)"></span>` : ""}${time ?? ""}</div>`;
  node.time = time;
  return node;
})};

const _shipBoard = function _shipBoard(
    battlefield, componentNode, INFO, MENU_ACTIONS, PALETTE, partIcon, TYPES, PORTS, TILE, DT, htl, invalidation){return(
(S0, opts = {}) => {
  let S = S0;
  // The cells the session's own ship arrived on. A mission ENVELOPE is a fixed
  // recorded list of anchors and it does not contain them -- 8 of the 12 missions
  // ship parts outside their own envelope (tools/scratch/env-gap.ts, 2026-08-22:
  // SideShooter has all three outside a 6-cell envelope, FollowCourse one, Cocoon
  // one). So moving such a part off its cell left a hole nothing could fill, which
  // is Tom's "after moving a component to leave a space, I cannot place a component
  // back into that space". A cell the designer put a component on is a legal anchor
  // by construction, so it joins the envelope.
  const seedStart = () => { S.startCells = S.player.comps.map(c => [c.px, c.py]); };
  seedStart();
  // same convention as geom.bearing: 0 is up, clockwise positive
  const geomBearing = (dx, dy) => Math.atan2(dx, -dy) * 180 / Math.PI;
  // The shipped board has no modes. It has a SELECTION, and the selection's menu
  // says what can be done to it. `act` is whichever menu action is mid-gesture --
  // "connect" waiting for a target, "move" waiting for a cell -- and it is null
  // the rest of the time.
  let picked = null;          // rail chip armed; STICKY -- survives a placement
  let pickedRow = null;       // ...and WHICH row it came from, when a tap named one
  let sel = null;             // {px, py} of the selected component's anchor
  let act = null;             // null | "connect" | "move" | "cut" | "info"
  let wire = null;            // {from:{px,py,cell,port}, to:{...}|null}
  let panel = "none";         // "none" | "cut" | "info"
  let layout = opts.layout ?? "desktop";
  const isM = () => layout === "mobile";
  // The one live board gesture, whatever started it. `space` is the pan modifier:
  // while it is held nothing claims the pointer and the camera's own drag-to-pan
  // gets it, which is the design's "two fingers - middle - space" row.
  let drag = null, hoverCell = null, space = false;
  // Click-the-field-to-fly, OFF until asked for. Turn 7b's press table gives sky
  // drag one meaning in both states -- "go there, facing the drag" -- and in
  // practice it takes every drag the player meant as a look-around: Tom,
  // 2026-08-23, "I don't like auto-pilot being on by default, it gets triggered
  // easily by panning, so can we make that mode opt-in and off by default".
  // While it is off a press on empty sky arms nothing and the camera's own
  // drag-to-pan gets the pointer, which is what a bare drag does in BUILD already.
  // WASD and space are unaffected -- they are direct commands, not a waypoint.
  let autopilot = false;
  // WASD drives; F fires. Keys were on `window` and unguarded, which in a lopepage
  // layout meant typing "f" in another pane's editor fired the guns -- so anything
  // with a caret in it swallows the key first.
  const held = new Set();
  const typing = () => {
    const e = document.activeElement;
    return !!e && (e.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(e.tagName) ||
                   !!e.closest?.(".cm-editor"));
  };
  const DRIVE = {w: [1, 0], s: [-1, 0], a: [0, -1], d: [0, 1]};
  const applyDrive = () => {
    if (!S.cmd) return;
    let thrust = 0, yaw = 0;
    for (const k of held) { const v = DRIVE[k]; if (v) { thrust += v[0]; yaw += v[1]; } }
    // a key press is a direct command and overrides where you last clicked,
    // otherwise the two demands fight for the same nozzles
    if (thrust || yaw) { S.cmd.drive = {thrust, yaw}; S.cmd.target = null; }
    else S.cmd.drive = null;
  };
  const gameKey = (down) => (ev) => {
    if (ev.metaKey || ev.ctrlKey || ev.altKey) return;
    // Space is the pan modifier from the design's press table, and Escape drops
    // whatever the board is holding. Both are board-wide, so they run before the
    // playing-only flight keys.
    if (ev.key === " " || ev.code === "Space") {
      if (down && typing()) return;
      if (down) ev.preventDefault();
      // While the clock runs, space SHOOTS. The board's own briefing says so --
      // "WASD to fly - space to shoot" in @tomlarkworthy/corepox-duel-encounter --
      // and the key did nothing but latch the pan, reported by Tom 2026-08-22:
      // "on missions the auto player does not shoot weapons when space is
      // pressed". Panning during a match is still reachable, by the nub, the
      // wheel and the middle button; F stays a synonym for fire.
      if (S.state === "playing" && S.cmd) { S.cmd.fire = down; space = false; return; }
      space = down;
      return;
    }
    if (down && ev.key === "Escape" && !typing()) {
      picked = null; act = null; wire = null; sel = null; panel = "none";
      render(); return;
    }
    if (S.state !== "playing" || !S.cmd) return;
    const k = ev.key.toLowerCase();
    if (k !== "f" && !DRIVE[k]) return;
    if (down && typing()) return;
    if (down) held.add(k); else held.delete(k);
    if (k === "f") S.cmd.fire = down;
    else { applyDrive(); ev.preventDefault(); }
  };
  const kd = gameKey(true), ku = gameKey(false);
  // a key held while the window loses focus never sees its keyup
  const blur = () => { held.clear(); space = false; if (S.cmd) { S.cmd.drive = null; S.cmd.fire = false; } };
  window.addEventListener("blur", blur);
  window.addEventListener("keydown", kd);
  window.addEventListener("keyup", ku);
  // Whoever built the board owns its lifetime -- the cell `invalidation` here
  // belongs to this module, so it only fires when the board itself is redefined
  // and never when a caller's cell re-runs. Callers call destroy().
  const destroy = () => {
    window.removeEventListener("keydown", kd);
    window.removeEventListener("keyup", ku);
    window.removeEventListener("blur", blur);
    window.removeEventListener("pointermove", gestureMove);
    window.removeEventListener("pointerup", gestureUp);
    window.removeEventListener("pointercancel", gestureUp);
  };
  invalidation.then(destroy);

  const root = htl.html`<div style="display:flex;flex-direction:column;gap:8px;
    font:13px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;color:#dbe6f2"></div>`;
  const stage = htl.html`<div style="position:relative"></div>`;
  root.append(stage);
  // ---- chrome ---------------------------------------------------------------
  const {C, MONO} = PALETTE;
  const YEL = C.amber;
  const round = (extra) => `border-radius:999px;${extra ?? ""}`;
  // The board's own buttons are circular pads pinned to the corners, which is
  // where the shipped game keeps play, restart and the wrench.
  const pad = (glyph, click, hue, title, size = 42) => htl.html`<button title=${title}
    onclick=${click} style="width:${size}px;height:${size}px;${round()}
    border:1px solid ${hue}8c;background:rgba(6,8,14,.9);color:${hue};cursor:pointer;
    font:${Math.round(size * 0.42)}px/1 ${MONO};display:flex;pointer-events:auto;
    align-items:center;justify-content:center">${glyph}</button>`;
  // The pan handle, drawn rather than typed. A glyph in a round pad was
  // indistinguishable from the recentre pad beside it; the design's arrows are
  // four strokes on a square, and the square is the affordance.
  const panPad = (size) => htl.html`<button
    title=${space ? "pan latched — click to release" : "pan the camera"}
    onclick=${() => { space = !space; render(); }} style="width:${size}px;height:${size}px;
    border-radius:${size > 44 ? 12 : 10}px;pointer-events:auto;display:flex;
    border:1px solid ${space ? C.amber : "rgba(255,255,255,.18)"};
    background:${space ? "rgba(255,196,46,.12)" : "rgba(6,8,14,.9)"};cursor:grab;
    align-items:center;justify-content:center;color:${space ? C.amber : C.dim}">${
    htl.svg`<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor"
      stroke-width="1.5"><path d="M10 3v14M3 10h14M10 3l-2.5 3M10 3l2.5 3M10 17l-2.5-3M10 17l2.5-3M3 10l3-2.5M3 10l3 2.5M17 10l-3-2.5M17 10l-3 2.5"/></svg>`}</button>`;
  const chip = (text, hue = YEL) => htl.html`<div style="${round()}padding:5px 13px;
    border:1px solid ${hue}66;background:rgba(6,8,14,.9);color:${hue};
    font:600 10px ${MONO};letter-spacing:.1em;white-space:nowrap">${text}</div>`;

  // ---- geometry: click -> the player's local tile ---------------------------
  // Ship.worldOf/tileOf are the pair, and they are the ENGINE's, not a copy: the
  // shipyard needs the same map and two copies of it is one sign error away from
  // a click that lands a cell out.
  let view = null;
  const localTile = (ev) => {
    const svg = view.svg, r = svg.getBoundingClientRect();
    const vb = svg.viewBox.baseVal;
    const wx = (vb.x + (ev.clientX - r.left) / r.width * vb.width) / TILE;
    const wy = (vb.y + (ev.clientY - r.top) / r.height * vb.height) / TILE;
    return S.player.tileOf(wx, wy);
  };
  // localTile answers "which cell of MY ship", which is the editor's question. A
  // waypoint is a point in the world, so it stops before tileOf.
  const worldTile = (ev) => {
    const svg = view.svg, r = svg.getBoundingClientRect();
    const vb = svg.viewBox.baseVal;
    return [(vb.x + (ev.clientX - r.left) / r.width * vb.width) / TILE,
            (vb.y + (ev.clientY - r.top) / r.height * vb.height) / TILE];
  };
  const tileToView = (px, py) => {
    const [wx, wy] = S.player.worldOf({px, py});
    return [wx * TILE, wy * TILE];
  };

  // ---- pause ----------------------------------------------------------------
  // Pause is a game mechanic here, not a convenience, and it is recovered rather
  // than invented: Unity's Controller.pause() branches on uiSettings.kinematicPauses
  // into a HARD pause (Time.timeScale = 0) or a KINEMATIC one (every body
  // isKinematic, the clock still running), and either way ShipComponent.damage()
  // no-ops for the duration. Tom, 2026-08-21: "There is no pause, and there was
  // one, I think in some modes building should pause". Written up in
  // plan/corepox-ux.md S4 and knowledge/corepox-extracted-design.md.
  //
  // World.step() already separates the two halves the mechanic needs -- propagate +
  // evaluate is the PROGRAM, integrate/particles/collide/split is the BODIES -- so
  // the kinematic step is those first two calls and nothing else, and no engine
  // change was required to get it.
  const kinematicStep = () => {
    const w = S.world, np = w.particles.length;
    for (const ship of w.ships) {
      if (!ship.live.length) continue;
      // isKinematic has to freeze VELOCITY, not just position. Ship.force writes
      // straight to vx/vy/w rather than into an accumulator that integrate()
      // drains, so skipping integrate alone leaves an engine building speed for
      // the whole pause and firing the ship across the board the instant it
      // resumes. Measured 2026-08-21: Avoid lost at t=10.5s off a correct 5-part
      // 3-wire build that the same gate had won before the pause existed
      // (tools/corepox-qa-campaign.ts).
      const v = [ship.vx, ship.vy, ship.w];
      ship.propagate();
      for (const i of ship.order) {
        const c = ship.comps[i];
        // ShipComponent.damage() no-ops under a pause, and detonate() is the only
        // damage an evaluate can do on its own. Skipping Explosive IS that no-op;
        // without it a charged bomb kills your ship while you are invulnerable.
        if (c.hp > 0 && c.type !== "Explosive") w.evaluate(ship, c);
      }
      [ship.vx, ship.vy, ship.w] = v;
    }
    // evaluate() is also where a weapon emits, and nothing consumes those while
    // frozen, so a Lazer holding its input through a long pause would grow the
    // array without bound. Truncate to what was there before the program ran.
    w.particles.length = np;
    w.beams = w.particles.filter(b => b.kind === "beam");
    w.t += DT;                                   // the clock keeps running
  };
  // Entering a pause is a SIDE EFFECT of an edit and never a button pressed first
  // -- that is the shipped flow, and it is why the design shows the clock as a
  // chip that reports rather than a control that is reached for.
  const editPause = () => { if (S.state === "playing") S.paused = true; };

  // ---- editing --------------------------------------------------------------
  const occupied = (px, py) => S.player.comps.some(c =>
    c.tiles.some(t => t[0] === px && t[1] === py));
  // Ship.at() is anchor-only because connections address anchors. Picking a
  // component to rotate or edit is a different question -- any of its cells will
  // do, and a Binary's anchor is its bar centre, so clicking the stem missed.
  const compAt = (px, py) => S.player.live.find(c =>
    c.tiles.some(t => t[0] === px && t[1] === py));
  const specOf = (ship) => ({
    // The name travels with the spec. A mission's ship is always "player", but an
    // editor round-trips its spec back to a caller that named it, and dropping the
    // name there renames every hull on the bench.
    name: opts.name ?? "player",
    components: ship.comps.map(c => ({type: c.type, pos: [c.px, c.py],
      dir: ["up","right","down","left"][(Math.round((c.dir ?? 0)/90)%4+4)%4],
      // `hp` declares the part's MAXIMUM (a mining field builds rock at rockHp per
      // tile) and `dmg` is the wound. Writing `hp: c.hp` wrote the CURRENT value
      // into the max, which was invisible while campaign hulls were never damaged
      // and became a compounding bug the moment they were (2026-08-21): a hull
      // refitted at 43/50 came back as 43/43, and every later refit ratcheted the
      // ceiling down again. This writer must agree with `specOfShip` in
      // @tomlarkworthy/corepox-shipyard -- they are two copies of one rule, and
      // corepox-board is below corepox-shipyard in the import graph, so it cannot
      // simply call it.
      hp: c.maxHp ?? c.hp,
      ...(c.maxHp != null && c.hp < c.maxHp ? {dmg: +(c.maxHp - c.hp).toFixed(3)} : {}),
      ...(c.param != null ? {param: c.param} : {}),
      // ManualAim's turret arrives with fire_input latched at 1. Dropping the
      // overrides here disarmed it the moment the player typed an angle -- which
      // is the entire mission -- and the headless gate could not see it, because
      // it is handed the solution spec and never rebuilds.
      ...(c.overrides ? {overrides: c.overrides} : {})})),
    connections: ship.conns.map(k => ({...k}))
  });
  // Rebuilding rather than mutating keeps mass, centre of mass, inertia and the
  // topological order consistent -- all of them are computed in the constructor.
  const rebuild = (components, connections) => {
    const p = S.player;
    const next = new (p.constructor)({name: "player", components, connections},
                                     {team: "player", x: p.x, y: p.y, a: p.a});
    // A ship's x,y is the world position of its CENTRE OF MASS, and worldOf places
    // every tile relative to that -- so carrying x,y across a rebuild teleports the
    // whole ship by however far the centre of mass moved. Reported as "when i place
    // a component the center of the ship shifts": measured at 0.443 tiles, 27.6px
    // on screen with the viewBox unchanged, for one part on Twin turrets
    // (tools/corepox-build-shift.ts). Move the origin by the same shift, rotated
    // into the ship's frame, and the parts already on the board stay put.
    const dcx = next.cx - p.cx, dcy = next.cy - p.cy;
    const rad = p.a * Math.PI / 180, sn = Math.sin(rad), cs = Math.cos(rad);
    next.x = p.x + dcx * cs + dcy * sn;
    next.y = p.y + dcx * sn - dcy * cs;
    next.vx = p.vx; next.vy = p.vy; next.w = p.w;
    const i = S.world.ships.indexOf(p);
    if (i >= 0) S.world.ships[i] = next; else S.world.ships.unshift(next);
    for (const c of next.comps) {
      const old = p.comps.find(o => o.px === c.px && o.py === c.py && o.type === c.type);
      if (old && S.initialParams.has(old)) S.initialParams.set(c, S.initialParams.get(old));
      else if (!S.initialParams.has(c)) S.initialParams.set(c, c.param);
    }
    // The assignment lives HERE, not at the twelve call sites. Every one of them
    // wrote `S.player = rebuild(...)`, so a host listening for changes could only
    // be told from inside rebuild -- and telling it before the assignment would
    // hand it the ship it just replaced.
    S.player = next;
    opts.onChange?.(specOf(next));
    return next;
  };

  // Every anchor a piece of `type` could legally take. The shipped game ghosts all
  // of them at once and the player taps one (data/corepox/shipped-ui/19-armour-place.avif),
  // so the legality test has to produce a LIST, not answer one cell at a time.
  // Every free cell touching the hull, plus the origin when the board is empty and
  // the part's own anchor so a move can decline to move. The affordance and the
  // press test the SAME set -- painting one set and accepting another is how you
  // get a detached part the physics immediately splits off, from a press the board
  // never invited.
  const freeAnchors = (ignore = null) => {
    const seen = new Set(), out = [];
    const free = (x, y) => !S.player.comps.some(c =>
      c !== ignore && c.tiles.some(t => t[0] === x && t[1] === y));
    const offer = (x, y) => {
      const k = x + "," + y;
      if (seen.has(k) || !free(x, y)) return;
      seen.add(k); out.push([x, y]);
    };
    if (!S.player.comps.length) offer(0, 0);
    for (const c of S.player.comps) {
      if (c === ignore) continue;
      for (const [tx, ty] of c.tiles)
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) offer(tx + dx, ty + dy);
    }
    if (ignore) offer(ignore.px, ignore.py);
    return out;
  };
  const legalCells = (type, ignore = null) => {
    const env = S.mission.envelope ?? [];
    // The footprint of the piece being placed, anchor-relative. TYPES carries the
    // UNROTATED one, and a part already on the board may be turned -- so a move
    // has to test the shape the part actually has. Reported by Tom 2026-08-22:
    // "a rotated component does not compute its footprint rotated". A live
    // component's own `tiles` are already rotated by the constructor, which is
    // why this reads them off the part rather than re-deriving with rotTile.
    // A part coming off the rail has no rotation yet (commitBuild writes
    // dir: "up"), so TYPES is right for that case and only that case.
    const tiles = ignore ? ignore.tiles.map(t => [t[0] - ignore.px, t[1] - ignore.py])
                         : (TYPES[type]?.tiles ?? [[0, 0]]);
    const taken = (x, y) => S.player.comps.some(c =>
      c !== ignore && c.tiles.some(t => t[0] === x && t[1] === y));
    // The envelope constrains the ANCHOR, not the footprint. SideShooter's
    // envelope has [0,-1] and its own recovered solution puts an Engine there --
    // an Engine is [[0,0],[0,-1]], so its nozzle lands on [0,-2], outside. Testing
    // the whole footprint against the envelope made both engine missions
    // unbuildable while the headless gate, which is handed the finished ship,
    // still read 9/9.
    // A mission records the exact set of anchors it will accept, and outside a
    // mission there is no such list -- a refit bench or a level editor offers
    // every free cell touching the hull. `freeBuild` is a property of the SESSION
    // and not of the envelope, deliberately: keying off `envelope === undefined`
    // would silently turn a mission that ships an empty envelope (build nothing)
    // into one that builds anywhere.
    // Only when the mission offers an envelope at all: `envelope: []` is a mission
    // that forbids building (Connection, Aim, Avoid teach wiring), and unioning the
    // start cells there would quietly turn it into one that allows it.
    const anchors = S.freeBuild ? freeAnchors(ignore)
      : env.length ? [...env, ...(S.startCells ?? [])]
      : ignore ? [[ignore.px, ignore.py]] : [];
    const seen = new Set();
    return anchors.filter(([x, y]) => {
      const k = x + "," + y;
      if (seen.has(k)) return false;            // env and startCells overlap
      seen.add(k);
      return !tiles.some(t => taken(x + t[0], y + t[1]));
    });
  };
  const commitBuild = (px, py) => {
    const item = spendRow(picked);
    if (!item) return;
    // A priced item is bought AT THE MOMENT IT LANDS -- turn 10b: "the cost commits
    // on release... There is no cart, no confirm, and no owned-but-unplaced state
    // to explain." The host owns the money, so it gets the veto: `onBuy` returning
    // false leaves the board exactly as it was.
    if (priced(item) && opts.onBuy?.(item.type, item.price) === false) return;
    if (Number.isFinite(item.n)) item.n--;
    editPause();
    S.player = rebuild([...specOf(S.player).components,
                        {type: picked, pos: [px, py], dir: "up"}],
                       specOf(S.player).connections);
    // The chip STAYS armed. Turn 7c's PLACE claim is "3 taps / part -> 1", and
    // clearing the pick here is exactly what made it three: open the panel, choose
    // the part, tap the ghost, then do all three again for the next one. It
    // disarms when the stack runs out, and on Escape.
    if (!spendRow(picked)) { picked = null; pickedRow = null; }
    panel = "none";
  };
  const commitMove = (px, py) => {
    const c = S.player.at(sel.px, sel.py);
    if (!c) return;
    editPause();
    const comps = specOf(S.player).components;
    const t = comps.find(x => x.pos[0] === c.px && x.pos[1] === c.py);
    if (!t) return;
    const from = [t.pos[0], t.pos[1]];
    t.pos = [px, py];
    // Connections address CELLS, so moving a component moves every wire that ends
    // on it. Dropping them instead -- which is what a naive delete-and-replace
    // does -- silently unwires the ship the player just spent the mission wiring.
    const d = [px - from[0], py - from[1]];
    const conns = specOf(S.player).connections.map(k => ({...k,
      from: k.from[0] === from[0] && k.from[1] === from[1]
        ? [k.from[0] + d[0], k.from[1] + d[1]] : k.from,
      to:   k.to[0]   === from[0] && k.to[1]   === from[1]
        ? [k.to[0] + d[0], k.to[1] + d[1]] : k.to}));
    S.player = rebuild(comps, conns);
    sel = {px, py}; act = null; panel = "none";
  };
  const doRotate = () => {
    const c = S.player.at(sel.px, sel.py);
    if (!c) return;
    editPause();
    const comps = specOf(S.player).components;
    const t = comps.find(x => x.pos[0] === c.px && x.pos[1] === c.py);
    const o = ["up","right","down","left"];
    if (t) t.dir = o[(o.indexOf(t.dir ?? "up") + 1) % 4];
    S.player = rebuild(comps, specOf(S.player).connections);
  };
  const doDelete = () => {
    const c = S.player.at(sel.px, sel.py);
    if (!c) return;
    editPause();
    const comps = specOf(S.player).components
      .filter(x => !(x.pos[0] === c.px && x.pos[1] === c.py));
    const cells = c.tiles.map(t => `${t[0]},${t[1]}`);
    const conns = specOf(S.player).connections.filter(k =>
      !cells.includes(`${k.from[0]},${k.from[1]}`) &&
      !cells.includes(`${k.to[0]},${k.to[1]}`));
    const item = S.inventory.find(i => i.type === c.type);
    if (item) item.n++; else S.inventory.push({type: c.type, n: 1});
    S.player = rebuild(comps, conns);
    sel = null; act = null; panel = "none";
  };
  // The same removal `doDelete` performs, except the part does NOT come back to the
  // hold -- the host is told and decides what it is worth. Split out rather than
  // flagged inside doDelete because "put it back in the hold" and "sell it out of
  // the run" are different events that happen to share their geometry.
  const sellSel = () => {
    const c = sel && S.player.at(sel.px, sel.py);
    if (!c || opts.onSell?.(c.type, c) === false) return;
    editPause();
    const cells = c.tiles.map(t => `${t[0]},${t[1]}`);
    S.player = rebuild(
      specOf(S.player).components.filter(x => !(x.pos[0] === c.px && x.pos[1] === c.py)),
      specOf(S.player).connections.filter(k =>
        !cells.includes(`${k.from[0]},${k.from[1]}`) &&
        !cells.includes(`${k.to[0]},${k.to[1]}`)));
    sel = null; act = null; panel = "none";
  };
  const connsOf = (c) => {
    const cells = c.tiles.map(t => `${t[0]},${t[1]}`);
    return specOf(S.player).connections.filter(k =>
      cells.includes(`${k.from[0]},${k.from[1]}`) ||
      cells.includes(`${k.to[0]},${k.to[1]}`));
  };
  const cutConn = (k) => {
    editPause();
    const conns = specOf(S.player).connections.filter(x =>
      !(x.from[0] === k.from[0] && x.from[1] === k.from[1] && x.fromPort === k.fromPort &&
        x.to[0] === k.to[0] && x.to[1] === k.to[1] && x.toPort === k.toPort));
    S.player = rebuild(specOf(S.player).components, conns);
    if (!connsOf(S.player.at(sel.px, sel.py) ?? {tiles: []}).length) { act = null; panel = "none"; }
  };

  // Which components carry a value disc on the board, and what the disc does when
  // you touch it. Constant is the only thing in the game a player puts a NUMBER
  // into and it cost 12 taps to reach 100 (tools/corepox-tap-count.ts); a Binary's
  // operator is an enum of six, which is a tap and not a scrub.
  const DISCS = {Constant: "num", Binary: "enum"};
  const BINOPS = ["PLUS","MINUS","TIMES","DIVIDE","LT","GT"];
  const OPGLYPH = {PLUS: "+", MINUS: "\u2212", TIMES: "\u00d7", DIVIDE: "\u00f7",
                   LT: "<", GT: ">"};

  // A connector belongs to a CELL, not to a component. Resolving by anchor and
  // taking ports[0] meant a Binary's `b`, a Radar's `dist` and a turret's `fire`
  // could never be wired at all -- which is most of what the corpus does.
  const unrot = {0: (x, y) => [x, y], 90: (x, y) => [y, -x],
                 180: (x, y) => [-x, -y], 270: (x, y) => [-y, x]};
  const portsAt = (px, py) => {
    for (const c of S.player.live) {
      const d = ((Math.round((c.dir ?? 0) / 90) % 4 + 4) % 4) * 90;
      const [lx, ly] = unrot[d](px - c.px, py - c.py);
      const P = PORTS[c.type] ?? {};
      const outs = Object.entries(P.outs ?? {})
        .filter(([, o]) => o[0] === lx && o[1] === ly).map(([n]) => n);
      const ins = Object.entries(P.ins ?? {})
        .filter(([, o]) => o[0] === lx && o[1] === ly).map(([n]) => n);
      if (outs.length || ins.length) return {c, outs, ins, px: c.px, py: c.py};
    }
    return null;
  };
  // every connector cell on the ship, for painting the affordance
  const allPorts = () => {
    const out = [];
    for (const c of S.player.live) {
      const d = ((Math.round((c.dir ?? 0) / 90) % 4 + 4) % 4) * 90;
      const rot = {0: (x, y) => [x, y], 90: (x, y) => [-y, x],
                   180: (x, y) => [-x, -y], 270: (x, y) => [y, -x]}[d];
      const P = PORTS[c.type] ?? {};
      for (const [kind, tbl] of [["out", P.outs ?? {}], ["in", P.ins ?? {}]])
        for (const [name, o] of Object.entries(tbl)) {
          const [rx, ry] = rot(o[0], o[1]);
          out.push({c, kind, name, px: c.px + rx, py: c.py + ry});
        }
    }
    return out;
  };
  // Which ports the current gesture would accept. The shipped game chequers these
  // and greys everything else the moment `connect` is tapped
  // (data/corepox/shipped-ui/38-s.avif), which is what tells the player that
  // `dist` and `bearing` are different holes on the same radar.
  const legalPorts = () => {
    if (act !== "connect") return [];
    const c = S.player.at(sel.px, sel.py);
    if (!c) return [];
    const mine = allPorts().filter(q => q.c === c);
    if (!wire) return mine;                       // start anywhere on this part
    return wire.from.kind === "out"
      ? allPorts().filter(q => q.kind === "in")
      : allPorts().filter(q => q.kind === "out");
  };
  // Tapping `connect` on a component that has exactly ONE port asked a question
  // with one answer, and made the player answer it: tap connect, then tap the same
  // component again to pick the only port it has. Tom, 2026-08-20: "I click the
  // 'connect' from a component and then I have to click that component *again* to
  // connect it." Constant, Engine, Explosive and Lazer are all single-port, which
  // is every wire in `run` and `connection` -- the two missions that teach wiring.
  // A multi-port part (Radar has dist and bearing, Binary has a and b) still
  // chequers and still asks, because there the question is real.
  const armConnect = () => {
    act = "connect"; wire = null; panel = "none";
    const c = sel && S.player.at(sel.px, sel.py);
    const mine = c ? allPorts().filter(q => q.c === c) : [];
    if (mine.length !== 1) return;
    const q = mine[0];
    wire = {auto: true, from: {px: q.c.px, py: q.c.py, cell: [q.px, q.py],
                               port: q.name, kind: q.kind}, to: null};
  };
  const commitWire = () => {
    if (!wire?.to) return;
    editPause();
    const a = wire.from.kind === "out" ? wire.from : wire.to;
    const b = wire.from.kind === "out" ? wire.to : wire.from;
    // one wire per input: a second source would just be overwritten each tick
    const conns = specOf(S.player).connections
      .filter(k => !(k.to[0] === b.px && k.to[1] === b.py && k.toPort === b.port));
    conns.push({from: [a.px, a.py], fromPort: a.port, to: [b.px, b.py], toPort: b.port});
    S.player = rebuild(specOf(S.player).components, conns);
    wire = null; act = null; sel = null; panel = "none";
  };

  // ---- the press table (design turn 7b) -------------------------------------
  // What a press MEANS is decided once, by what is under it at pointerdown:
  //
  //   a port          drag -> wire to wherever you release    tap -> select
  //   a value disc    drag -> scrub, fine near / coarse far   tap -> cycle the enum
  //   your own hull   drag -> move that part to a legal cell  tap -> select
  //   a shelf chip    drag -> carry it out and place          tap -> stick it
  //   empty / enemy   drag -> fly there facing the drag       tap -> fly there
  //                   ...only with AUTOPILOT armed; off, both pan
  //   space held      pan, always
  //
  // There is no verb to choose first, and that is the whole redesign: the board
  // this replaces made the player pick a target, read a menu, pick a verb and then
  // act, and every count in plan/corepox-ux.md S6 is paid at that step.
  const portRef = (q) => ({px: q.c.px, py: q.c.py, cell: [q.px, q.py],
                           port: q.name, kind: q.kind});
  // ---- where a port actually IS, on screen -----------------------------------
  // PORTS addresses CELLS, and two different things both break the assumption that
  // a cell is one target:
  //
  //   1. A Constant is one cell, and its value disc wants the middle of it. Routing
  //      at tile resolution gave the whole tile to the port and the disc could
  //      never be pressed at all -- one full scrub drag moved the value 100 -> 100
  //      (tools/corepox-board-shots.ts, 2026-08-21).
  //   2. Two ports can land on the SAME cell. FollowCourse has one: the Binary at
  //      (-1,-1) is turned 90 degrees, which puts its `out` on (0,-1) -- and (0,-1)
  //      is also where the Radar's `dist` is. The old modal flow hid this, because
  //      tapping `connect` on a component scoped the legal set to that component.
  //      A modeless board has no such scope, so it wired the wrong one silently:
  //      six attempts at `-1,-1.out -> 3,-2.in` all built `0,-1.dist -> 3,-2.in`.
  //
  // So a port is drawn at a POINT, not at a cell, and the press resolves to the
  // nearest point rather than to a tile. Ports that would collide fan apart toward
  // their own component's anchor; one that has no direction to fan along (its cell
  // IS the anchor) falls back to the way the component faces.
  const DISC_R = 0.32, PORT_R = 0.42;
  const facingOffset = (q) => {
    const d = ((Math.round((q.c.dir ?? 0) / 90) % 4 + 4) % 4) * 90;
    const th = (S.player.a + d + (q.kind === "out" ? 0 : 180)) * Math.PI / 180;
    return [Math.sin(th) * TILE * 0.36, -Math.cos(th) * TILE * 0.36];
  };
  const drawnPorts = () => {
    const all = allPorts();
    const byCell = new Map();
    for (const q of all) {
      const k = `${q.px},${q.py}`;
      if (!byCell.has(k)) byCell.set(k, []);
      byCell.get(k).push(q);
    }
    const out = [];
    for (const q of all) {
      const [vx, vy] = tileToView(q.px, q.py);
      const shared = byCell.get(`${q.px},${q.py}`).length > 1;
      const onDisc = DISCS[q.c.type] && q.px === q.c.px && q.py === q.c.py;
      let ox = 0, oy = 0;
      if (shared || onDisc) {
        const [ax, ay] = tileToView(q.c.px, q.c.py);
        const dx = ax - vx, dy = ay - vy, L = Math.hypot(dx, dy);
        [ox, oy] = L > 1 ? [dx / L * TILE * 0.32, dy / L * TILE * 0.32] : facingOffset(q);
      }
      out.push({...q, vx: vx + ox, vy: vy + oy});
    }
    return out;
  };
  const discNear = (ev) => {
    if (!allow().modify) return null;
    const [wx, wy] = worldTile(ev);
    for (const c of S.player.live) {
      if (!DISCS[c.type]) continue;
      const [ax, ay] = S.player.worldOf({px: c.px, py: c.py});
      if (Math.hypot(wx - ax, wy - ay) < DISC_R) return c;
    }
    return null;
  };
  const portNear = (ev) => {
    const [wx, wy] = worldTile(ev);
    let best = null, bd = PORT_R;
    for (const q of drawnPorts()) {
      const d = Math.hypot(wx - q.vx / TILE, wy - q.vy / TILE);
      if (d < bd) { bd = d; best = q; }
    }
    return best;
  };
  // A wire endpoint names a COMPONENT and a PORT, never a cell, so it resolves
  // even when two ports share the cell it was drawn on.
  const refPos = (ref) => {
    const q = drawnPorts().find(x => x.c.px === ref.px && x.c.py === ref.py &&
                                     x.name === ref.port && x.kind === ref.kind);
    return q ? [q.vx, q.vy] : tileToView(ref.cell[0], ref.cell[1]);
  };
  const armGesture = (g, ev, lock) => {
    drag = {...g, x0: ev.clientX, y0: ev.clientY, moved: false};
    if (lock) { view.panLock = true; try { view.svg.setPointerCapture(ev.pointerId); } catch {} }
    window.addEventListener("pointermove", gestureMove);
    window.addEventListener("pointerup", gestureUp);
    window.addEventListener("pointercancel", gestureUp);
  };
  const startGesture = (ev) => {
    // `blocked` is the host's veto -- corepox-game raises it while a cutscene
    // covers the board. The board has no modal of its own.
    if (ev.button !== 0 || opts.blocked?.() || drag) return;
    if (typing()) document.activeElement.blur();
    if (space) return;                        // space+drag belongs to the camera
    const [px, py] = localTile(ev);
    const A = allow(), edit = editable();
    // An armed chip outranks everything: while a part is held, a tap on a ghost
    // places it and a tap anywhere else puts it back.
    if (edit && picked) {
      const legal = legalCells(picked);
      if (legal.some(([x, y]) => x === px && y === py))
        return armGesture({kind: "place", type: picked, legal}, ev, true);
      // Off a ghost: the player is reaching past the chip, so put it back. Only
      // the ghost half of that rule was implemented -- the chip stayed armed
      // through a hull tap, which selected the part and then hid its verb bar
      // (Tom, 2026-08-22). The press then continues and means what it would have
      // meant with nothing held.
      picked = null; pickedRow = null;
    }
    const d = edit ? discNear(ev) : null;
    if (d) {
      const start = DISCS[d.type] === "num" ? (Number(d.param) || 0) : 0;
      const [wx, wy] = worldTile(ev);
      return armGesture({kind: "scrub", px: d.px, py: d.py, mode: DISCS[d.type], val: start,
                         lastx: wx, lasty: wy, rate: 1}, ev, true);
    }
    const q = edit && A.connect ? portNear(ev) : null;
    if (q) {
      // Only the OTHER polarity, and never on the same part: a wire from an out to
      // an in on its own component is the one thing a drag cannot mean.
      const sinks = drawnPorts().filter(x => x.kind !== q.kind && x.c !== q.c);
      act = "connect"; wire = {from: portRef(q), to: null};
      return armGesture({kind: "wire", px: q.c.px, py: q.c.py, from: portRef(q), sinks,
                         at: worldTile(ev), hit: null}, ev, true);
    }
    const c = compAt(px, py);
    if (c) {
      // A hull press only takes the pointer when a MOVE is actually on offer;
      // otherwise a drag across your own ship still pans, which is what a player
      // who is only looking around expects.
      const legal = edit && A.build ? legalCells(c.type, c) : [];
      return armGesture({kind: "hull", px: c.px, py: c.py, legal}, ev, legal.length > 1);
    }
    if (S.state === "playing" && autopilot) {
      const at = worldTile(ev);
      S.cmd = {...(S.cmd ?? {}), target: at, face: null, drive: null};
      held.clear();
      return armGesture({kind: "fly", at}, ev, true);
    }
    armGesture({kind: "empty"}, ev, false);
  };
  const gestureMove = (ev) => {
    if (!drag) return;
    if (!drag.moved && Math.hypot(ev.clientX - drag.x0, ev.clientY - drag.y0) < 5) return;
    drag.moved = true;
    if (drag.kind === "place" || drag.kind === "hull") {
      const [px, py] = localTile(ev);
      hoverCell = drag.legal.some(([x, y]) => x === px && y === py) ? [px, py] : null;
      // Only a HULL drag can be sold: a part still in the rail is not yours to sell
      // back, and dragging stock onto the rail it came from has to mean nothing.
      const hot = drag.kind === "hull" && overRail(ev);
      if (hot !== sellHot) { sellHot = hot; render(); return; }
    } else if (drag.kind === "wire") {
      drag.at = worldTile(ev);
      const [wx, wy] = drag.at;
      let best = null, bd = PORT_R;
      for (const q of drag.sinks) {
        const d = Math.hypot(wx - q.vx / TILE, wy - q.vy / TILE);
        if (d < bd) { bd = d; best = q; }
      }
      drag.hit = best;
    } else if (drag.kind === "scrub") {
      if (drag.mode !== "num") return;
      const c = S.player.at(drag.px, drag.py);
      if (!c) return;
      const [wx, wy] = worldTile(ev);
      const [ax, ay] = S.player.worldOf({px: drag.px, py: drag.py});
      // Fine near, coarse far, and the value INTEGRATES the movement: pull out to
      // a coarse rate, run up, come back in to fine, and both passes are kept. A
      // rate read off the current offset instead would snap the value back to the
      // fine reading the instant the finger returned, which is the obvious
      // implementation and the wrong one.
      // Calibrated against the EDITING camera, not the battle one. The board is
      // framed at minSpan 10 while you are building (see `camera`), and the first
      // ramp was written for a 34-tile board: a full-height drag out and up moved
      // a Constant 0 -> 4, because nothing on a 10-tile board is ever 3 tiles from
      // anything (tools/scratch/scrub-probe.ts, 14 samples). The dead zone keeps
      // the disc's own neighbourhood at one unit per tile so a nudge is still a
      // nudge.
      const rate = Math.pow(10, Math.max(0,
        Math.min(2, (Math.hypot(wx - ax, wy - ay) - 0.6) / 1.7)));
      drag.val -= (wy - drag.lasty) * rate;
      drag.lastx = wx; drag.lasty = wy; drag.rate = rate;
      setParam(Math.round(drag.val), c);
      return;                                   // setParam renders
    } else if (drag.kind === "fly") {
      const [x, y] = worldTile(ev);
      const dx = x - drag.at[0], dy = y - drag.at[1];
      if (S.cmd) S.cmd.face = Math.hypot(dx, dy) > 1.5 ? geomBearing(dx, dy) : null;
      return;
    }
    render();
  };
  const gestureUp = (ev) => {
    const g = drag;
    drag = null; hoverCell = null; sellHot = false; view.panLock = false;
    window.removeEventListener("pointermove", gestureMove);
    window.removeEventListener("pointerup", gestureUp);
    window.removeEventListener("pointercancel", gestureUp);
    if (!g) return;
    const [px, py] = localTile(ev);
    if (g.kind === "place") {
      if (g.legal.some(([x, y]) => x === px && y === py)) { picked = g.type; commitBuild(px, py); }
      else if (g.fromChip && !g.moved) picked = g.was === g.type ? null : g.type;
      else if (!g.fromChip) picked = null;
    } else if (g.kind === "hull") {
      if (g.moved && overRail(ev)) {
        sel = {px: g.px, py: g.py}; sellSel(); act = null;
      } else if (g.moved && g.legal.some(([x, y]) => x === px && y === py)) {
        sel = {px: g.px, py: g.py}; commitMove(px, py); act = null;
      } else if (!g.moved) { sel = {px: g.px, py: g.py}; act = null; panel = "none"; }
    } else if (g.kind === "wire") {
      finishWire(g, ev, px, py);
    } else if (g.kind === "scrub") {
      if (!g.moved && g.mode === "enum") {
        const c = S.player.at(g.px, g.py);
        if (c) setParam(BINOPS[(BINOPS.indexOf(c.param) + 1) % BINOPS.length], c);
      }
      if (!g.moved && g.mode === "num") { sel = {px: g.px, py: g.py}; panel = "none"; }
    } else if (g.kind === "empty" && !g.moved) {
      sel = null; act = null; wire = null; panel = "none";
    }
    render();
  };
  // Release commits, which is turn 7c's "5 taps / wire -> 1". The confirm tick is
  // not deleted, it is narrowed to the case that earned it: a release that missed
  // every port but sits within one cell of exactly one legal sink. An exact hit
  // was never ambiguous and now never asks.
  const finishWire = (g, ev, px, py) => {
    const [wx, wy] = worldTile(ev);
    const dist = (q) => Math.hypot(wx - q.vx / TILE, wy - q.vy / TILE);
    const ranked = [...g.sinks].sort((a, z) => dist(a) - dist(z));
    const exact = ranked[0] && dist(ranked[0]) < PORT_R ? ranked[0] : null;
    if (exact) { wire = {from: g.from, to: portRef(exact)}; commitWire(); return; }
    if (!g.moved) {                             // a tap on a port selects its part
      const c = compAt(g.px, g.py);
      wire = null; act = null;
      if (c) { sel = {px: c.px, py: c.py}; panel = "none"; }
      return;
    }
    // Not on a port, but within a cell of exactly one: the ambiguous release the
    // confirm tick still exists for.
    const near = ranked.filter(q => dist(q) < 1.2);
    if (near.length === 1) { wire = {from: g.from, to: portRef(near[0])}; act = "connect"; }
    else { wire = null; act = null; }
  };

  // ---- what the mission allows ----------------------------------------------
  // Editing is allowed while the match runs: eleven of the twelve scenes leave
  // buildOnce 0, and the four live ones never have a build phase at all.
  const editable = () => S.state === "build" || S.state === "playing";
  const allow = () => S.mission.allow ?? {};
  const canDo = (id, c) => {
    if (!editable() || !c) return false;
    const A = allow();
    const ports = allPorts().filter(q => q.c === c);
    if (id === "info") return true;
    if (id === "connect") return !!A.connect && ports.length > 0;
    if (id === "cut") return !!A.connect && connsOf(c).length > 0;
    if (id === "move") return !!A.build && legalCells(c.type, c).length > 1;
    if (id === "rotate") return !!A.rotate;
    if (id === "delete") return !!A.build;
    return false;
  };
  // buildOnce (FollowBoss, and only FollowBoss) hides the BUILD button once you
  // have pressed play, and nothing else: UIState.hasBuildBuildOptions is
  // `settings.buildOnce && settings.hasPlayed` and its one caller is
  // `setBottomRight(... ? UIAction.Build : null)`. Move, rotate, delete and wire
  // are options on the Selected menu and stay available -- the scene's settings
  // leave no_building/no_removing/no_connection_creation all 0.
  const stock = () =>
    S.mission.buildOnce && S.hasPlayed ? [] : S.inventory.filter(i => i.n > 0);

  // ---- input ----------------------------------------------------------------
  const clickTile = (px, py) => {
    if (!editable()) return;
    if (picked) {                                  // placing: only ghosts respond
      if (legalCells(picked).some(([x, y]) => x === px && y === py)) commitBuild(px, py);
      else { picked = null; }
      render(); return;
    }
    if (act === "move") {
      const c = S.player.at(sel.px, sel.py);
      if (c && legalCells(c.type, c).some(([x, y]) => x === px && y === py)) commitMove(px, py);
      else { act = null; panel = "none"; }
      render(); return;
    }
    if (act === "connect") {
      // tapping the port you are already wired FROM is a no-op, not a cancel --
      // with the arm now automatic it is the cell most likely to be tapped first
      if (wire && !wire.to && wire.from.cell[0] === px && wire.from.cell[1] === py) return;
      const hit = legalPorts().find(q => q.px === px && q.py === py);
      if (!hit) { if (wire && !wire.auto) wire = null;
                  else { wire = null; act = null; panel = "none"; } }
      else if (!wire) wire = {from: {px: hit.c.px, py: hit.c.py, cell: [px, py],
                                     port: hit.name, kind: hit.kind}, to: null};
      else wire = {...wire, to: {px: hit.c.px, py: hit.c.py, cell: [px, py],
                                 port: hit.name, kind: hit.kind}};
      render(); return;
    }
    const c = compAt(px, py);
    if (c) { sel = {px: c.px, py: c.py}; act = null; panel = "none"; }
    else { sel = null; act = null; panel = "none"; }
    render();
  };

  // `rebuild` replaces every component object, so a scrub that runs across many
  // frames cannot hold a reference to one -- it holds the anchor and re-resolves.
  //
  // NO editPause() here, and that is a deliberate divergence from the original
  // (plan/corepox-ux.md S4.1: in Unity every edit verb paused, modify included).
  // Tom, 2026-08-21: "I think its better if the game is not paused on adjusting
  // values like constant. You need the feedback". A Constant is the one edit whose
  // effect you can only judge by watching -- turn the turret's angle and you want
  // to see where it points, raise the thrust and you want to see the ship move.
  // Pausing hides exactly the thing being tuned. The structural edits (place,
  // move, rotate, delete, wire, cut) still pause, because there the pause is what
  // buys you the time to make them.
  const setParam = (v, c = sel && S.player.at(sel.px, sel.py)) => {
    if (!c) return;
    const comps = specOf(S.player).components;
    const t = comps.find(x => x.pos[0] === c.px && x.pos[1] === c.py);
    if (t) t.param = String(v);
    S.player = rebuild(comps, specOf(S.player).connections);
    render();
  };

  // The camera rule, called from render AND from every animation frame. It used
  // to live inside render only, which was fine while it depended on UI state --
  // a menu opening is a render. It now depends on where the ship IS, and a ship
  // that moves without a click would never have been noticed.
  const camera = () => {
      const m = S.mission;   // the board never sees the mission LIST
      // The zoom depends on the SHIP and never on the UI. It used to depend on a
      // `busy` flag -- is a menu open, a part picked, a component selected -- so
      // opening the info panel zoomed the board in and closing it zoomed back out,
      // under the player's fingers. Tom, 2026-08-20: "I don't think accessing menu
      // items should change zoom levels."
      //
      // What replaces it is whether the ship has left the mark. A live wiring mission
      // (`run`, `connection`, `avoiding`) opens with the hull filling the board,
      // because that is where the work is; once the Engine fires and the ship is more
      // than 2 tiles out, the mission's own span opens up and the jump zone comes into
      // frame. `gunner` never moves and so stays close, which is right -- it is a
      // stepper mission fought from a standstill. A fight (`cocoon`, `aiming`) is
      // wide from its first frame, as before.
      if (S.home == null) S.home = [S.player.x, S.player.y];
      const moved = Math.hypot(S.player.x - S.home[0], S.player.y - S.home[1]) > 2;
      const close = S.state === "build" || (m.live && !moved);
      // The ghosts have to be IN FRAME, and on `birthing` they are the only thing on
      // the board -- the ship is empty, so the camera has nothing to frame and falls
      // back to the constructed span. Feeding the legal cells in as focus points
      // keeps the first mission at the same zoom as every other.
      const ghostCells = picked ? legalCells(picked) : [];
      // Frame the HULL, not the origin. battlefield's frame() collects one point
      // per ship -- its origin cell -- so with nothing else to see the whole board
      // span comes from `pad`, and a 3-part hull rendered so large on the refit
      // bench that it ran off the top and bottom of the board
      // (tools/screenshots/bench-corepox-duel-encounter.png, 2026-08-21). Feeding
      // every occupied tile through `focus`, which frame() already honours, makes
      // the margin a margin again. minSpan still sets the floor, so a small
      // mission hull frames exactly as it did.
      view.focus = ghostCells.length
        ? ghostCells.map(([x, y]) => S.player.worldOf({px: x, py: y}))
        : close ? S.player.comps.flatMap(c =>
            c.tiles.map(t => S.player.worldOf({px: t[0], py: t[1]})))
        : S.state === "playing" && m.zone ? [[m.zone.x, m.zone.y]] : [];
      // ALWAYS your ship. `framed = null` means the camera has to contain every ship
      // in the world, so `connection`'s two rivals and `avoiding`'s three mines pulled
      // it open until the hull was a few pixels across. Tom, annotating this cell on
      // 2026-08-20: "the zoom follows the oppents so I can't use the UI after a few
      // seconds". The enemies stay visible because minSpan is per-mission and already
      // sized to the fight -- Aim's spawn ring is 18 tiles and its span is 56.
      view.framed = [S.player];
      view.minSpan = close ? (opts.minSpan ?? 10) : S.state === "playing" ? (m.span ?? 40) : 16;
      view.pad = close ? (opts.pad ?? 2.2) : 6;
  };
  // ---- painting the board ---------------------------------------------------
  const ns = "http://www.w3.org/2000/svg";
  const add = (into, n, at) => { const e = document.createElementNS(ns, n);
    for (const [k, v] of Object.entries(at)) e.setAttribute(k, v);
    into.appendChild(e); return e; };
  // A yellow chip on a leader line, pointing at a thing on the board. This is the
  // shipped game's ENTIRE tutorial mechanism -- there is no overlay, no modal, no
  // text panel; SELECT, DRAG, KILL and CLAIM VICTORY are all this one widget
  // (knowledge/corepox-shipped-ui-observed.md, "The board").
  const boardChip = (into, text, vx, vy, dx = 0, dy = -TILE * 2.2, hue = "#ffd23f") => {
    const g = add(into, "g", {});
    add(g, "line", {x1: vx, y1: vy, x2: vx + dx, y2: vy + dy,
                    stroke: hue, "stroke-width": 2, opacity: 0.8});
    const w = text.length * 15 + 26, h = 34;
    add(g, "rect", {x: vx + dx - w / 2, y: vy + dy - h, width: w, height: h, rx: h / 2,
                    fill: "#0b1119ee", stroke: hue, "stroke-width": 2});
    const t = add(g, "text", {x: vx + dx, y: vy + dy - h / 2 + 8, fill: hue,
      "font-size": 22, "font-family": "ui-monospace, monospace",
      "text-anchor": "middle", "letter-spacing": 1.5});
    t.textContent = text;
    return g;
  };
  const paintOverlay = () => {
    if (!overlay) return;
    overlay.textContent = "";
    // Where you told it to go, and -- if you dragged -- which way to be pointing
    // when it gets there. Drawn from S.cmd, so it shows the INTENT; whether the
    // hull can honour it is the allocator's business and the ship's fault.
    if (S.state === "playing" && S.cmd?.target) {
      const [tx, ty] = S.cmd.target, vx = tx * TILE, vy = ty * TILE;
      const g = add(overlay, "g", {opacity: 0.9});
      add(g, "circle", {cx: vx, cy: vy, r: TILE * 1.1, fill: "none",
        stroke: "#4fd8e8", "stroke-width": 3, "stroke-dasharray": "9 8"});
      add(g, "circle", {cx: vx, cy: vy, r: 4, fill: "#4fd8e8"});
      if (S.cmd.face != null) {
        const a = S.cmd.face * Math.PI / 180, r = TILE * 2.6;
        add(g, "line", {x1: vx, y1: vy, x2: vx + Math.sin(a) * r, y2: vy - Math.cos(a) * r,
          stroke: "#ffc42e", "stroke-width": 3});
      }
    }
    // Jump zone: nested ellipses in perspective, not a dashed circle. The shipped
    // funnel is the most recognisable piece of furniture on the board
    // (data/corepox/shipped-ui/36-run-board.avif) and a ring read as a target
    // reticle instead of a hole to fly into.
    const z = S.mission.zone;
    if (z) {
      const g = add(overlay, "g", {});
      for (let i = 0; i < 7; i++) {
        const k = 1 - i * 0.12;
        add(g, "ellipse", {cx: z.x * TILE, cy: (z.y + i * z.r * 0.30) * TILE,
          rx: z.r * TILE * 1.35 * k, ry: z.r * TILE * 0.42 * k,
          fill: "none", stroke: "#ffd23f", "stroke-width": 2.2,
          opacity: (0.85 - i * 0.09).toFixed(2)});
      }
      boardChip(overlay, (z.label ?? "jump").toUpperCase() + " ZONE",
                z.x * TILE, (z.y - z.r * 0.5) * TILE, 0, -TILE * 1.6);
    }
    // KILL, on whatever the mission says to destroy. The shipped gunner mission
    // marks its one target this way and it is how the player knows which drifting
    // hull is the mission (data/corepox/shipped-ui, "gunner").
    const kill = (S.mission.objectives ?? []).find(o => o.kind === "destroy");
    if (kill && S.state !== "win") {
      for (const s of S.world.ships) {
        if (s.team === "player" || !s.live.length) continue;
        if (!s.live.some(c => c.type === kill.type)) continue;
        boardChip(overlay, "KILL", s.x * TILE, s.y * TILE, 0, -TILE * 1.8, "#ff6b5a");
      }
    }
    // Joints, drawn as the design doc has them ("Shipyard Concepts" 5c, imported
    // 2026-08-21): a joint belongs to the PAIR, so it is drawn once, straddling
    // the cell edge with half in each cell, and only where two parts agree. A part
    // on its own shows none.
    //
    // The rule this makes visible is the one that decides whether a ship is one
    // body or several, and nothing on the board said anything about it before --
    // a player could bolt a Radar to the side of a core, see them touching, and
    // watch the ship come apart on the first hit (JOINTS.Radar is the skirt only).
    //
    // Every ship, and in battle as well as in build, on Tom's report: "I can't see
    // the new joints being drawn during battle". Off `s.live`, so a joint vanishes
    // the moment either part it binds is destroyed -- which is the ship coming
    // apart, shown a frame before the split does it.
    for (const s of S.world.ships) {
      if (!s.live.length) continue;
      const meet = new Map();
      for (const c of s.live)
        for (const j of s.jointList(c)) {
          const k = (j.x * 4) + ":" + (j.y * 4);
          if (!meet.has(k)) meet.set(k, []);
          meet.get(k).push(j);
        }
      for (const grp of meet.values()) {
        if (grp.length < 2 || new Set(grp.map(j => j.c)).size < 2) continue;
        const j = grp[0];
        const [wx, wy] = s.worldOf({px: j.mx, py: j.my});
        const g = add(overlay, "g", {transform:
          `translate(${(wx * TILE).toFixed(1)} ${(wy * TILE).toFixed(1)}) rotate(${s.a.toFixed(2)})`});
        // A SEAM MARK, and the orientation is the correction: this ran long ACROSS
        // the seam, which drew a rung between two cells rather than a weld along
        // the edge they share. "Shipyard Concepts" 5c: "one symmetric capsule
        // straddling the grid edge, half in each cell", and 9a labels it "joint =
        // one 3px seam mark". Long ALONG the seam, thin across it.
        //
        // 5c draws it 3 x 13 with rx 1.5 at an 84-unit cell pitch, so 0.036 and
        // 0.155 of a tile. It was 0.16 x 0.24 with a 2.4 stroke and a filled
        // centre disc, roughly four times the ink -- on a 5x5 armour wall the
        // marks read as the subject and the plating as the background
        // (tools/screenshots/armour-before.png).
        //
        // Flat fill, no stroke, no centre dot: the capsule belongs to the PAIR,
        // so anything that gives it a rim or a hub makes it look like a part.
        const along = TILE * 0.155, across = TILE * 0.036;
        const w = j.edge === "h" ? along : across;
        const h = j.edge === "h" ? across : along;
        add(g, "rect", {x: -w / 2, y: -h / 2, width: w, height: h,
          rx: across / 2, fill: "#56e39f", opacity: 0.45});
      }
    }

    if (!editable()) return;

    // Ghosts: the real component drawn faint at every legal anchor, with the cell
    // under the finger picked out solid. A place drag and a move drag paint the
    // same thing because they ask the same question -- which cells will take this.
    const moveDrag = drag?.kind === "hull" && drag.legal.length > 1 ? drag : null;
    const ghostType = drag?.kind === "place" ? drag.type
                    : moveDrag ? S.player.at(moveDrag.px, moveDrag.py)?.type
                    : picked ?? (act === "move" ? S.player.at(sel.px, sel.py)?.type : null);
    const ghostIgnore = moveDrag ? S.player.at(moveDrag.px, moveDrag.py)
                      : act === "move" ? S.player.at(sel.px, sel.py) : null;
    if (ghostType) {
      for (const [gx, gy] of legalCells(ghostType, ghostIgnore)) {
        if (ghostIgnore && gx === ghostIgnore.px && gy === ghostIgnore.py) continue;
        const on = hoverCell && hoverCell[0] === gx && hoverCell[1] === gy;
        const [vx, vy] = tileToView(gx, gy);
        const holder = add(overlay, "g", {
          transform: `translate(${vx.toFixed(1)} ${vy.toFixed(1)}) rotate(${S.player.a.toFixed(2)})`,
          opacity: on ? 0.95 : 0.42});
        holder.appendChild(componentNode({type: ghostType}));
        for (const t of TYPES[ghostType]?.tiles ?? [[0, 0]]) {
          const [tx, ty] = [t[0] * TILE, -t[1] * TILE];
          add(holder, "rect", {x: tx - TILE / 2, y: ty - TILE / 2, width: TILE,
            height: TILE, rx: 5, fill: on ? C.green + "2e" : C.green + "14",
            stroke: C.green, "stroke-width": on ? 3 : 2,
            ...(on ? {} : {"stroke-dasharray": "7 6"})});
        }
      }
    }

    // Ports are permanent furniture now, not something a mode reveals: a lime dot
    // on every connector cell, all the time. That is what makes "press a port and
    // drag" discoverable without a connect button to press first.
    const wiring = drag?.kind === "wire" ? drag : null;
    if (allow().connect) {
      const sinks = wiring ? new Set(wiring.sinks.map(q => `${q.c.px},${q.c.py}/${q.name}`)) : null;
      for (const q of drawnPorts()) {
        const [vx, vy] = [q.vx, q.vy];
        if (!wiring) {
          add(overlay, "circle", {cx: vx, cy: vy, r: TILE * 0.13, fill: C.lime,
                                  opacity: 0.85});
          add(overlay, "circle", {cx: vx, cy: vy, r: TILE * 0.26, fill: "none",
            stroke: C.lime, "stroke-width": 2, opacity: 0.35});
          continue;
        }
        // Mid-drag the board answers one question only -- where may this land --
        // so the legal sinks chequer, as shipped, and everything else goes flat.
        if (!sinks.has(`${q.c.px},${q.c.py}/${q.name}`)) {
          add(overlay, "circle", {cx: vx, cy: vy, r: TILE * 0.26, fill: "none",
            stroke: "#5b6b7d", "stroke-width": 4, opacity: 0.45});
          continue;
        }
        const r = TILE * 0.30, seg = Math.PI / 4;
        for (let i = 0; i < 8; i++) {
          const a0 = i * seg, a1 = a0 + seg;
          add(overlay, "path", {d: `M${(vx + Math.cos(a0) * r).toFixed(1)},${(vy + Math.sin(a0) * r).toFixed(1)}` +
            `A${r},${r} 0 0 1 ${(vx + Math.cos(a1) * r).toFixed(1)},${(vy + Math.sin(a1) * r).toFixed(1)}`,
            fill: "none", stroke: i % 2 ? "#ffffff" : "#101820", "stroke-width": 5});
        }
      }
    }

    // The wire under the finger. It follows the POINTER rather than snapping to a
    // cell, so the arc is the answer to "where is this going" at every moment of
    // the drag; it only turns green once a legal sink is actually under it.
    const arc = (ax, ay, bx, by, stroke, w, op) => {
      const mx = (ax + bx) / 2, my = (ay + by) / 2;
      const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1;
      add(overlay, "path", {d: `M${ax.toFixed(1)},${ay.toFixed(1)}Q${(mx - dy * 0.30).toFixed(1)},${(my + dx * 0.30).toFixed(1)} ${bx.toFixed(1)},${by.toFixed(1)}`,
        fill: "none", stroke, "stroke-width": w, opacity: op, "stroke-linecap": "round"});
    };
    if (wiring) {
      const [ax, ay] = refPos(wiring.from);
      const [bx, by] = wiring.hit ? [wiring.hit.vx, wiring.hit.vy]
                                  : [wiring.at[0] * TILE, wiring.at[1] * TILE];
      add(overlay, "circle", {cx: ax, cy: ay, r: TILE * 0.40, fill: "none",
                              stroke: C.lime, "stroke-width": 3});
      arc(ax, ay, bx, by, wiring.hit ? C.green : "#c8d2dc", 5, wiring.hit ? 0.95 : 0.7);
      if (wiring.hit)
        add(overlay, "circle", {cx: bx, cy: by, r: TILE * 0.40, fill: "none",
                                stroke: C.green, "stroke-width": 3});
    } else if (act === "connect" && wire?.to) {
      // The narrowed confirm: the release was near one sink and not on it, so the
      // proposal sits there in pale grey until the tick is pressed.
      const [ax, ay] = refPos(wire.from);
      const [bx, by] = refPos(wire.to);
      arc(ax, ay, bx, by, "#c8d2dc", 5, 0.8);
      for (const [x, y] of [[ax, ay], [bx, by]])
        add(overlay, "circle", {cx: x, cy: y, r: TILE * 0.40, fill: "none",
                                stroke: "#c8d2dc", "stroke-width": 3});
    }

    // Value discs. The disc IS the control -- there is no panel behind it and no
    // menu to reach it through, which is turn 7c's "12 taps for 100 -> 1".
    if (allow().modify) {
      for (const c of S.player.live) {
        const mode = DISCS[c.type];
        if (!mode) continue;
        const [vx, vy] = tileToView(c.px, c.py);
        const live = drag?.kind === "scrub" && drag.px === c.px && drag.py === c.py;
        const r = TILE * (live ? 0.42 : 0.34);
        add(overlay, "circle", {cx: vx, cy: vy, r, fill: "#120a04e8",
          stroke: C.orange, "stroke-width": live ? 3.5 : 2.5});
        const txt = mode === "num" ? String(Number(c.param) || 0)
                                   : (OPGLYPH[c.param] ?? "?");
        const t = add(overlay, "text", {x: vx, y: vy + r * 0.36, fill: C.orange,
          "text-anchor": "middle", "font-family": MONO,
          "font-size": (r * (txt.length > 3 ? 0.78 : 1.05)).toFixed(1),
          "font-weight": 700});
        t.textContent = txt;
        if (live) {
          // The step the finger is currently buying. Without it a coarse drag
          // looks like the value has run away on its own.
          const lab = add(overlay, "text", {x: vx, y: vy - r - 8, fill: C.orange,
            "text-anchor": "middle", "font-family": MONO, "font-size": TILE * 0.26,
            opacity: 0.9});
          lab.textContent = "\u00b1" + Math.max(1, Math.round(drag.rate));
        }
      }
    }

    placeVerbBar();
    if (sel && !picked && !drag) {
      const c = S.player.at(sel.px, sel.py);
      for (const t of c?.tiles ?? []) {
        const [vx, vy] = tileToView(t[0], t[1]);
        add(overlay, "rect", {x: vx - TILE / 2, y: vy - TILE / 2, width: TILE,
          height: TILE, rx: 5, fill: "none", stroke: C.hull, "stroke-width": 3});
      }
    }
  };

  // ---- panels ---------------------------------------------------------------
  const panelBox = (title, kids, onCancel) => htl.html`<div style="
    position:absolute;left:50%;top:44%;transform:translate(-50%,-50%);min-width:280px;
    max-width:min(520px,88%);max-height:80%;overflow:auto;background:rgba(6,8,14,.97);
    border:1px solid ${C.line};border-radius:14px;padding:14px 16px;pointer-events:auto;
    font:12px ${MONO};box-shadow:0 10px 40px #000b">
    <div style="color:${C.amber};font-size:11px;letter-spacing:.18em;margin-bottom:10px">${title}</div>
    ${kids}
    ${onCancel ? htl.html`<div style="display:flex;justify-content:flex-end;margin-top:12px">
      <button onclick=${onCancel} style="font:600 10px ${MONO};padding:6px 16px;
        border-radius:999px;border:1px solid ${C.red}88;background:transparent;color:${C.red};
        cursor:pointer;letter-spacing:.12em">CLOSE</button></div>` : ""}
  </div>`;
  // An icon of the component itself, for the build rows and the menu header. The
  // shipped panel leads every row with the drawing, which is the only thing that
  // tells ARMOUR from ORB before you have learned the names.
  // `partIcon` so the spoils popup draws a part exactly as the rail does.
  const icon = (type, size = 40) => partIcon(type, size);
  let infoType = null;
  const infoPanel = () => panelBox(infoType.toUpperCase(), htl.html`<div>
    <div style="display:flex;gap:14px;align-items:center">${icon(infoType, 64)}
      <div style="color:${C.ink}">${INFO[infoType] ?? "No notes."}</div></div>
    <div style="margin-top:10px;color:${C.dim}">hp ${TYPES[infoType]?.hp} ·
      in ${(TYPES[infoType]?.ins ?? []).join(", ") || "—"} ·
      out ${(TYPES[infoType]?.outs ?? []).join(", ") || "—"}</div></div>`,
    () => { panel = "none"; act = null; render(); });
  const cutPanel = () => {
    const c = sel && S.player.at(sel.px, sel.py);
    if (!c) { panel = "none"; return htl.html`<span></span>`; }
    return panelBox(`CUT — ${c.type.toUpperCase()}`,
      connsOf(c).map(k => htl.html`<div onclick=${() => { cutConn(k); render(); }}
        style="display:flex;gap:10px;padding:7px 10px;margin-bottom:6px;border-radius:8px;
        background:rgba(255,255,255,.03);border:1px solid ${C.line};cursor:pointer;color:${C.ink}">
        <span style="color:${C.red}">✂</span>
        <span>${k.from.join(",")} ${k.fromPort} → ${k.to.join(",")} ${k.toPort}</span>
      </div>`),
      () => { act = null; panel = "none"; render(); });
  };

  // ---- the hold -------------------------------------------------------------
  // What replaces CHOOSE BUILD OPTION. On the desktop it is a RAIL down the left
  // edge -- "the left rail is the hold, not a toolbar" ("Shipyard Concepts" turn
  // 9a) -- and it is the same rail in a mission and in a refit, which is the whole
  // consolidation: one screen, and the clock is the only thing that differs.
  //
  // It was a band along the bottom until 2026-08-21 (turn 7a). The rail is better
  // in two ways the band could not be: a hold of twelve types scrolls vertically
  // without the row going off the side, and it stops competing with the board's
  // own bottom edge, which is where a hull that has drifted low ends up.
  //
  // The phone keeps the band, because turn 8a keeps it: 390px has no room for a
  // 160px rail and a board.
  let railOpen = true;
  // The rail node itself, kept so a drag can be hit-tested against it. Selling is
  // "drag a component off your hull into the rail" ("Shipyard Concepts" turn 10b:
  // "The gesture that moves a part on the board is the gesture that removes it
  // from the run -- one direction of travel, one meaning"), and a drop target has
  // to be a rectangle somebody can measure.
  let railBox = null, sellHot = false;
  // Every render REBUILDS the rail, so its scroller is a new element and starts at
  // 0. With a market rail long enough to scroll, that threw you back to the top on
  // every placement -- and the chip stays armed precisely so you can place several,
  // which is the case that got punished. Remembered here rather than on the node,
  // because the node it belongs to no longer exists by the time it is needed.
  let railScroll = {top: 0, left: 0}, railScroller = null;
  const overRail = (ev) => {
    if (!opts.onSell || !railBox) return false;
    const r = railBox.getBoundingClientRect();
    return ev.clientX >= r.left && ev.clientX <= r.right &&
           ev.clientY >= r.top && ev.clientY <= r.bottom;
  };
  // `picked` is a TYPE, and a station rail carries the same type TWICE -- the
  // market's Engine at a price, and the Engine already in your hold. A bare
  // `find(i => i.type === picked)` took whichever came first, and the market is
  // listed first: holding three Engines still charged 95 apiece, and the third
  // placement was refused outright once the balance fell under 95 (reported
  // 2026-08-22 -- "I was unable to place another engine even though I had it in
  // the hold"). A part you already own is always spent before a part you buy.
  const liveRow = (type) => {
    const rows = S.inventory.filter(i => i.type === type && !dead(i));
    return rows.find(i => !priced(i)) ?? rows[0] ?? null;
  };
  // The ROW the player tapped, when it is still theirs to spend -- tapping the
  // market's Engine has to mean buy even while the hold has Engines in it, and
  // tapping the hold's has to mean spend. It falls back to `liveRow` when that row
  // is gone or spent, so a rail that runs out slides to the other shelf instead of
  // going quietly dead under the finger. The rail highlight reads the same
  // function, so the shelf that is about to be charged is the one that is lit.
  const spendRow = (type) => (pickedRow && pickedRow.type === type &&
    !dead(pickedRow) && S.inventory.includes(pickedRow)) ? pickedRow : liveRow(type);
  const RAIL_W = () => railOpen ? 160 : 44;
  const railItems = () =>
    S.mission.buildOnce && S.hasPlayed ? [] : S.inventory;
  // A rail item is `{type, n}` in a hold and `{type, price}` in a market. Turn 10b:
  // "Goods sit in the rail with a price instead of a count." Everything else about
  // the row is the same, which is the point -- a shop that is the board.
  const priced = (i) => i.price != null;
  const afford = (i) => !priced(i) || i.price <= (opts.balance?.() ?? Infinity);
  // Out of stock and out of money grey the row the same way, because to the player
  // they are the same fact: this one is not available to you now.
  const dead = (i) => priced(i) ? !afford(i) : i.n <= 0;
  const badge = (i) => priced(i) ? "\u25c6" + i.price
                                 : (i.n === Infinity ? "\u221e" : i.n);
  const chipNode = (i, w) => {
    const on = picked === i.type &&
               i === spendRow(i.type);
    const out = dead(i);
    const el = htl.html`<div title=${INFO[i.type] ?? i.type} data-part=${i.type}
      style="flex:none;width:${w}px;
      padding:${w > 80 ? 9 : 7}px 4px 6px;border-radius:10px;position:relative;
      cursor:${out ? "default" : "grab"};opacity:${out ? 0.32 : 1};
      border:1px solid ${on ? "rgba(86,227,159,.65)" : C.line};
      background:${on ? "rgba(86,227,159,.1)" : "rgba(255,255,255,.02)"};
      display:flex;flex-direction:column;align-items:center;gap:4px;touch-action:none">
      ${on ? htl.html`<div style="position:absolute;left:5px;top:5px;width:5px;height:5px;
        border-radius:50%;background:${C.green};box-shadow:0 0 6px ${C.green}"></div>` : ""}
      <div style="position:absolute;top:4px;right:6px;font:700 ${w > 80 ? 9 : 8}px ${MONO};
        color:${priced(i) ? (out ? "rgba(255,138,138,.75)" : C.amber) : C.ink}"
        >${priced(i) ? badge(i) : (i.n === Infinity ? "∞" : "×" + i.n)}</div>
      ${icon(i.type, w > 80 ? 38 : 30)}
      <div style="font:${on ? 700 : 500} ${w > 80 ? 9 : 8}px ${MONO};
        color:${on ? C.green : C.dim}">${i.type}</div></div>`;
    armChip(el, i);
    return el;
  };
  // One rail row: the drawing, the name, the count. Turn 9a keeps a row that is out
  // of stock in the list at .32 rather than removing it, because a hold you can
  // read the shape of is a hold you can plan against -- a list that reflows every
  // time a part runs out is not.
  const railRow = (i) => {
    const on = picked === i.type &&
               i === spendRow(i.type);
    const out = dead(i);
    const el = htl.html`<div title=${INFO[i.type] ?? i.type} data-part=${i.type}
      style="display:flex;align-items:center;gap:9px;padding:7px 8px;border-radius:9px;
      position:relative;touch-action:none;opacity:${out ? 0.32 : 1};
      cursor:${out ? "default" : "grab"};
      border:1px solid ${on ? "rgba(86,227,159,.6)" : "transparent"};
      background:${on ? "rgba(86,227,159,.1)" : "transparent"}">
      ${on ? htl.html`<div style="position:absolute;left:2px;top:50%;width:4px;height:16px;
        margin-top:-8px;border-radius:2px;background:${C.green};
        box-shadow:0 0 6px ${C.green}"></div>` : ""}
      ${icon(i.type, 30)}
      <div style="flex:1;min-width:0;font:${on ? 700 : 500} 9.5px ${MONO};
        color:${on ? C.green : "rgba(232,236,245,.68)"};white-space:nowrap;
        overflow:hidden;text-overflow:ellipsis">${i.type}</div>
      <div style="font:700 9px ${MONO};color:${out ? "rgba(255,138,138,.6)"
        : priced(i) ? C.amber : C.ink}">${badge(i)}</div></div>`;
    armChip(el, i);
    return el;
  };
  // Collapsed: the drawing and the count, no name. 44px is the design's number and
  // it is also the smallest thing a thumb reliably hits.
  const railIcon = (i) => {
    const on = picked === i.type &&
               i === spendRow(i.type);
    const el = htl.html`<div title=${`${i.type} — ${badge(i)}`} data-part=${i.type}
      style="position:relative;display:flex;align-items:center;justify-content:center;
      height:34px;border-radius:7px;touch-action:none;opacity:${dead(i) ? 0.32 : 1};
      cursor:${dead(i) ? "default" : "grab"};
      border:1px solid ${on ? "rgba(86,227,159,.6)" : "transparent"};
      background:${on ? "rgba(86,227,159,.1)" : "transparent"}">${icon(i.type, 26)}
      <span style="position:absolute;right:1px;bottom:0;font:700 7.5px ${MONO};
        color:${priced(i) ? C.amber : C.dim}">${badge(i)}</span></div>`;
    armChip(el, i);
    return el;
  };
  // The chip's press is the same gesture as a press on a ghost -- it just starts
  // somewhere the board cannot see. The window listeners in armGesture are what let
  // it cross the boundary.
  const armChip = (el, i) => el.addEventListener("pointerdown", (ev) => {
    if (ev.button !== 0 || !editable() || dead(i)) return;
    ev.preventDefault();
    // `was` is read BEFORE the press arms the chip. Arming first and then toggling
    // against `picked` made every tap a no-op: the chip stuck and un-stuck inside
    // the same click.
    armGesture({kind: "place", type: i.type, legal: legalCells(i.type),
                fromChip: true, was: picked}, ev, false);
    picked = i.type; pickedRow = i;
    render();
  });
  // The scroller is claimed as the shelf is built and restored once it is mounted
  // -- scrollTop on a detached node is a no-op, so it cannot be done here.
  const keepScroll = (el) => {
    railScroller = el;
    el.addEventListener("scroll", () => {
      railScroll = {top: el.scrollTop, left: el.scrollLeft};
    });
  };
  const shelfNode = () => {
    const items = railItems();
    if (!items.length) return null;
    if (isM()) {
      const box = htl.html`<div style="position:absolute;left:0;right:0;bottom:88px;
        height:110px;border-top:1px solid ${C.line};background:${C.panel};
        padding:9px 12px;display:flex;flex-direction:column;gap:7px;z-index:6"></div>`;
      const head2 = htl.html`<div style="display:flex;align-items:center;justify-content:space-between">
        <span style="font:700 8.5px ${MONO};letter-spacing:.16em;color:${C.dim}">
          HOLD ${picked ? "· " + picked.toUpperCase() : ""}</span>
        <span style="font:400 8px ${MONO};color:${C.faint}">tap to stick · drag to place</span></div>`;
      const row = htl.html`<div style="display:flex;gap:7px;overflow-x:auto;align-items:stretch"></div>`;
      keepScroll(row);
      for (const i of items) row.append(chipNode(i, 66));
      box.append(head2, row);
      return box;
    }
    const box = htl.html`<div style="position:absolute;left:0;top:0;bottom:0;
      width:${RAIL_W()}px;border-right:1px solid ${sellHot ? C.green : "rgba(255,255,255,.09)"};
      background:${sellHot ? "rgba(86,227,159,.14)" : "rgba(6,8,14,.86)"};
      box-shadow:${sellHot ? "inset 0 0 0 1px " + C.green : "none"};
      display:flex;flex-direction:column;z-index:6"></div>`;
    railBox = box;
    const body = htl.html`<div style="flex:1;padding:8px 6px;display:flex;
      flex-direction:column;gap:2px;overflow-y:auto"></div>`;
    keepScroll(body);
    // A rail can carry more than one shelf. Turn 10a stacks the market's priced
    // goods over YOUR HOLD in one column, because they are the same list to the
    // hand -- both are things you drag onto the board -- and only the badge differs.
    let seen = null;
    for (const i of items) {
      if (i.group && i.group !== seen) {
        seen = i.group;
        body.append(htl.html`<div style="padding:${body.childNodes.length ? "10px" : "2px"} 4px 4px;
          font:700 8px ${MONO};letter-spacing:.16em;color:rgba(232,236,245,.38)"
          >${railOpen ? i.group : "\u00b7"}</div>`);
      }
      body.append(railOpen ? railRow(i) : railIcon(i));
    }
    const chevron = htl.html`<span onclick=${() => { railOpen = !railOpen; render(); }}
      title=${railOpen ? "collapse the hold" : "expand the hold"}
      style="font:700 10px ${MONO};color:rgba(86,227,159,.65);cursor:pointer;
      user-select:none">${railOpen ? "‹ collapse" : "›"}</span>`;
    if (railOpen) {
      box.append(htl.html`<div style="padding:12px 10px 9px;
        border-bottom:1px solid rgba(255,255,255,.07);display:flex;
        flex-direction:column;gap:3px">
        <span style="font:700 8.5px ${MONO};letter-spacing:.16em;
          color:rgba(232,236,245,.38)">HOLD</span>
        ${opts.holdNote ? htl.html`<span style="font:700 12px ${MONO};color:${C.amber}"
          >${opts.holdNote()}</span>` : ""}</div>`, body,
        htl.html`<div style="padding:9px 10px;border-top:1px solid rgba(255,255,255,.07);
          display:flex;flex-direction:column;gap:4px">
          <span style="font:400 8px ${MONO};color:${sellHot ? C.green : "rgba(232,236,245,.3)"}"
            >${items.some(priced) ? "drag out to buy + place" : "drag out to place"}</span>
          <span style="font:400 8px ${MONO};color:${sellHot ? C.green : "rgba(232,236,245,.3)"}"
            >${opts.onSell ? (opts.sellNote?.() ?? "drag in to sell at half") : "tap to keep armed"}</span>
          ${chevron}</div>`);
    } else {
      box.append(body, htl.html`<div style="padding:9px 0;text-align:center;
        border-top:1px solid rgba(255,255,255,.07)">${chevron}</div>`);
    }
    return box;
  };
  // ---- verbs, anchored to what they act on ----------------------------------
  // Where a tile lands in the STAGE's pixel box. The board is an svg with its own
  // viewBox and the chrome is absolutely positioned HTML, so the two spaces have
  // to be reconciled at every paint rather than once.
  const tileToStage = (px, py) => {
    const [vx, vy] = tileToView(px, py);
    const r = view.svg.getBoundingClientRect(), sr = stage.getBoundingClientRect();
    const vb = view.svg.viewBox.baseVal;
    return [(vx - vb.x) / vb.width * r.width + r.left - sr.left,
            (vy - vb.y) / vb.height * r.height + r.top - sr.top];
  };
  // connect and move are gone from this list on purpose: both are now drags off
  // the thing itself, so offering them as buttons would be offering a second way
  // to do what the board already does, and the count in plan/corepox-ux.md S6 is
  // paid at exactly that second way.
  const VERBS = MENU_ACTIONS.filter(a => a.id !== "connect" && a.id !== "move");
  // Placed on every frame, not once when it is built: `view.draw` eases the
  // viewBox while a match runs, so a bar positioned at render time slides off the
  // component it is anchored to over the next second.
  const placeVerbBar = () => {
    const bar = verbNode;
    if (!bar || !bar.isConnected || !bar.dataset.px) return;
    const [x, y] = tileToStage(+bar.dataset.px, +bar.dataset.py);
    const w = bar.offsetWidth, h = bar.offsetHeight;
    const sr = stage.getBoundingClientRect();
    // The bar has to stay off the two bands the board reserves: the phone's shelf
    // and thumb bar below, and the desktop's hold rail to the left. On the desktop
    // there is no bottom band any more -- the rail took the hold -- so the floor is
    // the board's own edge.
    const left = isM() || !railItems().length ? 0 : RAIL_W();
    const floor = sr.height - (isM() ? (railItems().length ? 206 : 96) : 8);
    let top = y - h - 34;
    if (top < 6) top = Math.min(y + 34, floor - h);
    bar.style.left = Math.max(left + 6, Math.min(x - w / 2, sr.width - w - 6)) + "px";
    bar.style.top = Math.max(6, Math.min(top, floor - h)) + "px";
  };
  const verbBar = () => {
    const c = sel && S.player.at(sel.px, sel.py);
    // Not gated on `picked` any more. Selecting a part now disarms the chip
    // (see startGesture), so the two cannot both be live off a tap -- and while
    // they could, the bar simply vanished: Tom, 2026-08-22, "if a component is
    // selected for placement, you cannot access the rotation menu for anything,
    // this feels off".
    if (!c || drag) return null;
    const on = VERBS.filter(a => canDo(a.id, c));
    const bits = [];
    for (const a of on) {
      const hue = a.id === "delete" ? C.red : a.id === "info" ? C.amber : C.green;
      bits.push(htl.html`<button title=${a.label} data-verb=${a.id} onclick=${() => {
          if (a.id === "info") { infoType = c.type; panel = "info"; }
          else if (a.id === "rotate") doRotate();
          else if (a.id === "delete") doDelete();
          else if (a.id === "cut") { act = "cut"; panel = "cut"; }
          render();
        }} style="display:flex;align-items:center;gap:6px;padding:6px 11px;border-radius:999px;
        border:1px solid ${hue}88;background:rgba(6,8,14,.9);color:${hue};cursor:pointer;
        font:600 10px ${MONO};letter-spacing:.08em">
        <span style="font-size:14px;line-height:1">${a.glyph}</span>${a.label.toUpperCase()}</button>`);
    }
    // The last digit. The disc does 0 -> 137 in one drag; these are for the one
    // that drag left you a unit short of, which is the case turn 7c keeps them for.
    if (allow().modify && c.type === "Constant") {
      const step = (d) => setParam((Number(c.param) || 0) + d, c);
      bits.push(htl.html`<div style="display:flex;align-items:center;gap:4px">
        ${[-1, 1].map(d => htl.html`<button onclick=${() => step(d)} style="width:26px;height:26px;
          border-radius:50%;border:1px solid ${C.orange}88;background:rgba(6,8,14,.9);
          color:${C.orange};cursor:pointer;font:13px ${MONO}">${d < 0 ? "−" : "+"}</button>`)}</div>`);
    }
    if (allow().modify && c.type === "Binary")
      bits.push(htl.html`<div style="display:flex;gap:3px">
        ${BINOPS.map(op => htl.html`<button onclick=${() => setParam(op, c)}
          style="padding:4px 6px;border-radius:6px;cursor:pointer;font:600 10px ${MONO};
          border:1px solid ${c.param === op ? C.purple : C.line};
          background:${c.param === op ? "rgba(196,107,255,.15)" : "transparent"};
          color:${c.param === op ? C.purple : C.dim}">${OPGLYPH[op]}</button>`)}</div>`);
    if (!bits.length) return null;
    const bar = htl.html`<div style="position:absolute;display:flex;gap:6px;align-items:center;
      padding:5px;border-radius:999px;background:rgba(6,8,14,.86);border:1px solid ${C.line};
      white-space:nowrap;z-index:7;pointer-events:auto">${bits}</div>`;
    bar.dataset.px = c.px; bar.dataset.py = c.py;
    verbNode = bar;
    // Its own width decides whether it has to be pushed back inside the board, and
    // it has no width until it is in the DOM.
    queueMicrotask(placeVerbBar);
    return bar;
  };

  // ---- render ---------------------------------------------------------------
  // The board paints itself and then hands the chrome slots to whoever owns the
  // screen. Order matters and is the shipped one: the host's chrome goes into the
  // corners first (clock, restart, launch, banner), the board's own furniture
  // after (rail, camera nub, the confirm chip, the anchored verbs, the panels) --
  // so a verb bar always sits above a victory banner rather than under it.
  let overlay = null, hud = null, corners = {}, shelf = null, verbNode = null;
  let phoneHead = null, phoneSlot = null;   // `view` is declared with the geometry
  const render = () => {
    const m = S.mission, mob = isM();

    // Keyed on the SESSION and on the LAYOUT. `battlefield` closes over the world
    // it was handed, so retrying a mission built a fresh world and kept drawing
    // the old one; and the phone board is portrait, which is an aspect ratio the
    // svg fixes at construction.
    if (!view || view.sess !== S || view.lay !== layout) {
      stage.textContent = "";
      // 390 x 546 puts the board's bottom edge exactly on the shelf's top edge
      // (844 - 88 - 110 = 646, and the board starts at 100). The design's own mock
      // leaves 46px of dead ground between them; on a real phone that band reads
      // as a rendering fault rather than as space.
      view = battlefield(S.world, mob ? {span: m.span ?? opts.span ?? 40, width: 390, height: 546}
        : {span: m.span ?? opts.span ?? 40,
           ...(opts.width ? {width: opts.width} : {}), ...(opts.height ? {height: opts.height} : {})});
      view.sess = S; view.lay = layout;
      overlay = document.createElementNS(ns, "g");
      view.svg.appendChild(overlay);
      // One entry point. Everything the board can be asked to do is decided in
      // startGesture from what is under the press, and the gesture then runs on
      // WINDOW listeners so it survives the finger leaving the svg -- a place drag
      // that starts on a rail chip is the same code path as one that starts on a
      // ghost.
      view.svg.addEventListener("pointerdown", startGesture);
      // A pan is the one camera change nothing else repaints: it moves the viewBox
      // but no UI state, and the nub is only drawn while `view.moved()`. So on the
      // build screen -- which has no animation frame running -- the recentre pad
      // never appeared at all, however far the board was dragged, until some
      // unrelated click happened to re-render. Measured 2026-08-21 with
      // tools/scratch/nub-shot.ts: a full space-drag left "nub in dom false".
      let wasMoved = false;
      const nubCheck = () => {
        if (view.moved() === wasMoved) return;
        wasMoved = view.moved(); render();
      };
      view.svg.addEventListener("pointerup", nubCheck);
      view.svg.addEventListener("wheel", () => queueMicrotask(nubCheck), {passive: true});
      view.svg.style.cursor = "crosshair";
      view.svg.style.touchAction = "none";
      stage.append(view.svg);
      hud = htl.html`<div style="position:absolute;pointer-events:none"></div>`;
      corners = {
        tr: htl.html`<div style="position:absolute;display:flex;gap:8px;align-items:center"></div>`,
        bl: htl.html`<div style="position:absolute;display:flex;gap:10px;align-items:center"></div>`,
        br: htl.html`<div style="position:absolute;display:flex;gap:10px;align-items:center"></div>`,
        mid: htl.html`<div style="position:absolute;inset:0;pointer-events:none"></div>`
      };
      stage.append(hud, corners.tr, corners.bl, corners.br, corners.mid);
      root.corners = corners; root.hud = hud; root.view = view;
    }
    // The phone is drawn as a phone: a 390x844 device box with the board inset
    // below a 56px header, because a layout meant for a thumb cannot be judged in
    // a 900px column.
    //
    // The shelf gets its OWN band, it does not float over the board. An absolutely
    // positioned child is placed against the padding box, so a bottom padding of
    // the shelf's height puts the shelf exactly in it and leaves the svg the
    // content box above. It overlaid the board first, which is how the design's
    // mock reads, and on a mission whose ship sits low in frame the overlay ate
    // the ship: FollowBoss's last wire could not be started because the Binary's
    // out port was drawn at page y=687 and the shelf covered 584-700
    // (tools/scratch/followboss-wire.ts, 2026-08-21 -- the press resolved to no
    // port, no component and no selection).
    // The rail gets its OWN band, it does not float over the board. An absolutely
    // positioned child is placed against the PADDING box, so a left padding of the
    // rail's width puts the rail exactly in it and leaves the svg the content box
    // beside it. The band matters: the bottom shelf this replaces overlaid the
    // board, and on a mission whose ship sits low in frame it ate the ship --
    // FollowBoss's last wire could not be started because the Binary's out port was
    // drawn at page y=687 and the shelf covered 584-700
    // (tools/scratch/followboss-wire.ts, 2026-08-21).
    const inset = mob || !railItems().length ? 0 : RAIL_W();
    stage.style.cssText = mob
      ? `position:relative;width:390px;height:844px;margin:0 auto;border-radius:34px;
         background:#04050a;border:1px solid rgba(255,255,255,.14);overflow:hidden;
         box-shadow:0 0 40px rgba(0,0,0,.6)`
      : `position:relative${inset ? `;padding-left:${inset}px` : ""}`;
    view.svg.style.position = mob ? "absolute" : "static";
    if (mob) { view.svg.style.left = "0"; view.svg.style.top = "100px";
               view.svg.style.width = "390px"; }
    else { view.svg.style.left = view.svg.style.top = ""; view.svg.style.width = "100%"; }
    phoneHead?.remove(); phoneHead = null; phoneSlot = null; root.phoneSlot = null;
    if (mob) {
      // One node for both bands so a re-render replaces them rather than stacking
      // a new pair on top of the last. The status strip is not decoration: without
      // it the objective pill sits against the device bezel and the board reads as
      // starting at the very top of the screen.
      phoneSlot = htl.html`<div style="display:flex;align-items:center;padding:0 14px;height:56px"></div>`;
      phoneHead = htl.html`<div style="position:absolute;left:0;right:0;top:0;height:100px;
        pointer-events:none">
        <div style="position:absolute;left:0;right:0;top:0;height:44px;display:flex;
          align-items:center;justify-content:space-between;padding:0 22px;
          font:500 10px ${MONO};color:${C.faint}"><span>corepox</span><span>▮▮▮</span></div>
        <div style="position:absolute;left:0;right:0;top:44px;height:56px;
          border-bottom:1px solid ${C.line}">${phoneSlot}</div></div>`;
      stage.append(phoneHead);
      root.phoneSlot = phoneSlot;
    }
    hud.style.cssText = mob
      ? "position:absolute;left:100px;right:76px;top:44px;height:56px;display:flex;" +
        "align-items:center;pointer-events:none;overflow:hidden"
      : `position:absolute;left:${inset + 20}px;top:18px;display:flex;
         flex-direction:column;gap:6px;pointer-events:none;max-width:46%;z-index:5`;
    corners.tr.style.cssText = mob
      ? "position:absolute;right:14px;top:44px;height:56px;display:flex;gap:8px;align-items:center"
      : "position:absolute;right:20px;top:18px;display:flex;gap:10px;align-items:center;z-index:5";
    // Bottom-left is where turn 9b puts LAUNCH and revert, just clear of the rail.
    // Bottom-right is the camera cluster, and nothing else goes there -- a control
    // that ends the phase and a control that moves the camera must not be adjacent.
    corners.bl.style.cssText = mob
      ? "position:absolute;left:16px;bottom:26px;height:62px;display:flex;gap:9px;align-items:center"
      : `position:absolute;left:${inset + 20}px;bottom:20px;display:flex;
         gap:10px;align-items:center;z-index:5`;
    corners.br.style.cssText = mob
      ? "position:absolute;right:16px;bottom:26px;height:62px;display:flex;gap:9px;align-items:center"
      : `position:absolute;right:20px;bottom:24px;display:flex;flex-direction:column;
         gap:8px;align-items:center;z-index:5`;

    camera();
    // snap, not ease: in the editor a click has to hit the connector the player
    // can see, so the viewBox must not move between paint and click
    view.draw(S.state !== "playing"); paintOverlay();

    for (const k of ["tr", "bl", "br"]) corners[k].textContent = "";
    corners.mid.textContent = "";
    hud.textContent = "";
    opts.chrome?.(ctx());

    shelf?.remove(); railScroller = null; shelf = shelfNode();
    if (shelf) stage.append(shelf);
    if (railScroller) {
      railScroller.scrollTop = railScroll.top;
      railScroller.scrollLeft = railScroll.left;
      // A shorter list clamps the assignment, so the remembered offset has to be
      // re-read rather than trusted -- otherwise removing the last rows leaves a
      // stale offset that snaps back the next time the list grows.
      railScroll = {top: railScroller.scrollTop, left: railScroller.scrollLeft};
    }

    // ---- the camera nub -----------------------------------------------------
    // Two pads, and neither exists until it is needed: the recentre only once the
    // camera has actually been moved, and the pan latch only where there is no
    // second finger and no space bar to hold. On the phone they belong in the
    // thumb bar, where the design puts them; on the desktop they float clear of
    // the shelf as a nub.
    //
    // The two are told apart by SHAPE, which is what the design does and what the
    // first version of this did not: turn 9a draws the recentre as a 40px cyan
    // CIRCLE carrying the reticle, and the pan handle as a 40px rounded SQUARE
    // with the four-way arrows drawn as strokes and `cursor:grab`. Tom,
    // 2026-08-21: "The mode icons here are very hard to understand and do not
    // follow the brief" -- they were two identical cyan circles carrying a glyph
    // each, so the only thing the pair said was that there were two of something.
    const camPads = [];
    const centrePad = () => pad("⌖", () => { view.resetView(); render(); },
                                C.cyan, "recentre", mob ? 46 : 40);
    // Turn 9a's cluster is three things stacked: a +/- stepper, the pan handle, the
    // recentre. There is no programmatic zoom on `battlefield` -- its only entry
    // point is the wheel listener, which is already anchored on the pointer, which
    // is the behaviour the design asks for. So the stepper dispatches a wheel event
    // at the board's centre rather than reaching into the view's closure; a second
    // zoom path would be a second easing curve to keep in step.
    const zoomStep = (dir) => {
      const r = view.svg.getBoundingClientRect();
      view.svg.dispatchEvent(new WheelEvent("wheel", {deltaY: dir * -200,
        clientX: r.left + r.width / 2, clientY: r.top + r.height / 2,
        bubbles: true, cancelable: true}));
      queueMicrotask(render);
    };
    const zoomPad = () => htl.html`<div style="display:flex;flex-direction:column;
      border:1px solid rgba(255,255,255,.14);border-radius:9px;overflow:hidden;
      pointer-events:auto">
      ${[["+", 1, "zoom in"], ["−", -1, "zoom out"]].map(([g, d, t], k) => htl.html`
        <div title=${t} onclick=${() => zoomStep(d)} style="width:40px;height:34px;
          display:flex;align-items:center;justify-content:center;font:400 15px ${MONO};
          color:${C.dim};cursor:pointer;user-select:none;
          ${k ? "" : `border-bottom:1px solid ${C.line}`}">${g}</div>`)}</div>`;
    // Arming it is a decision, so it looks like one: lit amber while it holds the
    // sky, and turning it off drops the standing waypoint as well -- leaving the
    // ship flying to a target the player can no longer see or clear is worse than
    // the gesture it replaces.
    const autoPad = (size) => htl.html`<button
      title=${autopilot ? "autopilot ARMED — press the field to fly there"
                        : "autopilot off — the field pans; arm it to fly by pressing"}
      onclick=${() => { autopilot = !autopilot;
                        if (!autopilot && S.cmd) { S.cmd.target = null; S.cmd.face = null; }
                        render(); }}
      style="width:${size}px;height:${size}px;border-radius:${size > 44 ? 12 : 10}px;
      pointer-events:auto;display:flex;align-items:center;justify-content:center;
      border:1px solid ${autopilot ? C.amber : "rgba(255,255,255,.18)"};
      background:${autopilot ? "rgba(255,196,46,.12)" : "rgba(6,8,14,.9)"};
      color:${autopilot ? C.amber : C.dim};cursor:pointer;
      font:${Math.round(size * 0.44)}px/1 ${MONO}">➤</button>`;
    if (mob) {
      camPads.push(panPad(46));
      if (S.state === "playing" && S.cmd) camPads.push(autoPad(46));
      if (view.moved()) camPads.push(centrePad());
    } else {
      camPads.push(zoomPad(), panPad(40));
      if (S.state === "playing" && S.cmd) camPads.push(autoPad(40));
      if (view.moved()) camPads.push(centrePad());
    }
    // Left of the thumb bar on the phone, which is where turn 8a has them -- the
    // right of that bar belongs to LAUNCH. On the desktop the cluster is the whole
    // of bottom-right (turn 9a).
    (mob ? corners.bl : corners.br).append(...camPads);

    // ---- what the current gesture is asking for -----------------------------
    if (act === "connect" && wire?.to) {
      corners.bl.append(pad("✓", () => { commitWire(); render(); }, C.green, "finish connecting", 46),
                        chip("RELEASE WAS NEAR TWO — CONFIRM", C.green));
      corners.bl.append(pad("✕", () => { act = null; wire = null; render(); }, C.red, "cancel", 36));
    } else if (picked && !mob) {
      corners.bl.append(chip(`HOLDING ${picked.toUpperCase()} — DROP ON A GHOST`, C.green));
    }

    verbNode = null;
    const bar = verbBar();
    if (bar) corners.mid.append(bar);
    if (panel === "info" && infoType) corners.mid.append(infoPanel());
    else if (panel === "cut" && sel) corners.mid.append(cutPanel());
    // `mid` spans the whole board, so it must NEVER take the pointer itself --
    // each child opts in. Making the container auto because a panel is open put an
    // invisible sheet over every gesture on the board behind it.
    corners.mid.style.pointerEvents = "none";

    root.value = specOf(S.player);
  };

  // What the host is handed to decorate with. Deliberately not the closure: a host
  // that reached into `sel` or `picked` would be a second place the board's state
  // is written, and the press table is the only one.
  const ctx = () => ({S, mob: isM(), stage, root, corners, hud, phoneSlot, view,
                      C, MONO, pad, chip, icon, stock: stock(), editable: editable(),
                      paused: !!S.paused, selected: sel && S.player.at(sel.px, sel.py)});

  // QA seam: the only input this board takes is a press on an SVG, so a test that
  // drives it needs the same tile->pixel map the overlay paints with. Re-deriving
  // it in the test would be a copy that drifts, so hand the real one out.
  const qa = {tileToView, localTile, session: () => S, svg: () => view.svg,
             sel: () => sel, act: () => act, picked: () => picked,
             panel: () => panel, wire: () => wire,
             pick: (t) => { picked = t; pickedRow = null; panel = "none"; render(); },
             open: (px, py) => { clickTile(px, py); },
             menu: (id) => { const c = S.player.at(sel.px, sel.py);
               if (!canDo(id, c)) return false;
               if (id === "connect") { armConnect(); }
               else if (id === "rotate") doRotate();
               else if (id === "delete") doDelete();
               else if (id === "move") { act = "move"; panel = "none"; }
               else if (id === "cut") { act = "cut"; panel = "cut"; }
               render(); return true; },
             confirm: () => { commitWire(); render(); },
             // The ghost set, as the press test sees it -- `legal(type)` for a
             // part coming off the rail, `legalFor(px,py)` for moving the part
             // already there. Both call legalCells, so a test asserting on them
             // is asserting on what a tap will accept and not on a second copy
             // of the rule.
             legal: (type) => legalCells(type).map((a) => a.slice()),
             legalFor: (px, py) => { const c = compAt(px, py);
               return c ? legalCells(c.type, c).map((a) => a.slice()) : null; },
             stock: () => stock().map(i => ({...i})),
             // The redesign's own seams: the layout toggle, the pause, and the two
             // gestures that replaced menus. A test that drives the board has to be
             // able to reach all four or it is only testing the old flow.
             layout: (l) => { if (l) { layout = l; sel = null; picked = null; render(); }
                              return layout; },
             paused: (p) => { if (p != null) { S.paused = !!p; render(); } return !!S.paused; },
             autopilot: (v) => { if (v != null) { autopilot = !!v;
               if (!autopilot && S.cmd) { S.cmd.target = null; S.cmd.face = null; }
               render(); } return autopilot; },
             setParam: (v, px, py) => setParam(v, S.player.at(px, py)),
             // Where a port is DRAWN. Named by COMPONENT and PORT, never by cell:
             // on a Constant the cell centre belongs to the value disc, and on
             // FollowCourse two different components' ports share cell (0,-1).
             portPoint: (anchor, name, kind) => {
               const q = drawnPorts().find(x => x.c.px === anchor[0] && x.c.py === anchor[1] &&
                                                x.name === name && x.kind === kind);
               return q ? [q.vx, q.vy] : null;
             },
             wireDrag: (from, to) => {
               const q0 = allPorts().find(q => q.px === from[0] && q.py === from[1]);
               if (!q0) return false;
               const sinks = allPorts().filter(x => x.kind !== q0.kind && x.c !== q0.c);
               finishWire({kind: "wire", px: from[0], py: from[1], from: portRef(q0),
                           sinks, moved: true}, to[0], to[1]);
               render();
               return !!S.player.conns.length;
             }};

  // NOT rendered here. The first render calls back into `opts.chrome`, and a host
  // whose chrome closes over anything declared after its `shipBoard(...)` call --
  // which is every host, because the chrome needs the board it is decorating --
  // would hit that closure's temporal dead zone during construction. Observed as
  // `viewof game = ReferenceError: Cannot access 'chrome' before initialization`.
  // The caller renders, which it has to do anyway to show the thing.
  return Object.assign(root, {
    qa, render, destroy, stage,
    // The board owns the pause, because the pause is a property of the clock and
    // the clock is the only mode axis (design turn 9: "ONE GESTURE TABLE, BOTH
    // STATES"). A host that runs a match calls `kinematicStep` on the frames it
    // decides not to integrate.
    kinematicStep, editPause,
    // One animation frame's worth of board: where the camera should be, the draw,
    // and the overlay on top of it. A host running a match calls this instead of
    // a full render, because a render rebuilds the chrome and the chrome does not
    // change 60 times a second.
    frame: () => { camera(); view.draw(); paintOverlay(); },
    // Everything a press could be holding, dropped. A match starting must not
    // begin with a part armed or half a wire drawn.
    clearGesture: () => { picked = null; wire = null; act = null; drag = null;
                          hoverCell = null; held.clear(); autopilot = false; },
    session: () => S,
    // A host that swaps the session -- a retry, the next mission, a different
    // hull on the bench -- hands the board the new one rather than rebuilding it,
    // so the camera, the layout and the window listeners survive the change.
    load: (next) => { S = next; seedStart(); autopilot = false;
                      picked = null; wire = null; sel = null; act = null;
                      panel = "none"; drag = null; hoverCell = null;
                      view?.resetView?.(); render(); },
    layout: (l) => qa.layout(l),
    spec: () => specOf(S.player)
  });
}
)};

// A part, drawn on its own, sized to its footprint. The rail leads every build row
// with this and the spoils popup leads every card with it; a second copy of the
// rule would let the two disagree about what an Orb looks like.
const _partIcon = function _partIcon(componentNode, TYPES, TILE){return(
(type, size = 40) => {
  const s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  const tiles = TYPES[type]?.tiles ?? [[0, 0]];
  const xs = tiles.map(t => t[0]), ys = tiles.map(t => t[1]);
  const w = (Math.max(...xs) - Math.min(...xs) + 1.3) * TILE;
  const h = (Math.max(...ys) - Math.min(...ys) + 1.3) * TILE;
  const cx = (Math.max(...xs) + Math.min(...xs)) / 2 * TILE;
  const cy = -(Math.max(...ys) + Math.min(...ys)) / 2 * TILE;
  const m = Math.max(w, h);
  s.setAttribute("viewBox", `${cx - m / 2} ${cy - m / 2} ${m} ${m}`);
  s.setAttribute("width", size); s.setAttribute("height", size);
  s.style.flex = "none";
  s.appendChild(componentNode({type}));
  return s;
}
)};

// What the fight cost, drawn on the hull rather than listed ("Shipyard Concepts"
// turn 11: "Damage is drawn, not listed"). It is the same footprint the repair will
// happen on, so a destroyed cell is in the place the player will have to fill.
//
// It cannot reuse shipNode: that hides a destroyed component (`display:none`, see
// corepox-render's frame loop), and the destroyed ones are the subject here.
const _damagePlate = function _damagePlate(componentNode, TILE, PALETTE){return(
(ship, {size = 150} = {}) => {
  const {C} = PALETTE;
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  const comps = ship?.comps ?? [];
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const c of comps) for (const [tx, ty] of c.tiles) {
    x0 = Math.min(x0, tx); x1 = Math.max(x1, tx);
    y0 = Math.min(y0, ty); y1 = Math.max(y1, ty);
  }
  if (!comps.length) { x0 = y0 = 0; x1 = y1 = 1; }
  const pad = 0.7;
  const L = (x0 - ship.cx - pad) * TILE, R = (x1 - ship.cx + pad) * TILE;
  const T = -(y1 - ship.cy + pad) * TILE, B = -(y0 - ship.cy - pad) * TILE;
  const m = Math.max(R - L, B - T);
  svg.setAttribute("viewBox", `${(L + R) / 2 - m / 2} ${(T + B) / 2 - m / 2} ${m} ${m}`);
  svg.setAttribute("width", size); svg.setAttribute("height", size);
  svg.style.flex = "none";
  const at = (tx, ty) => [(tx - ship.cx) * TILE, -(ty - ship.cy) * TILE];
  const el = (n, attrs, into = svg) => {
    const e = document.createElementNS(ns, n);
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
    into.appendChild(e); return e;
  };
  // the grid it will be rebuilt on
  for (let tx = x0; tx <= x1 + 1; tx++) {
    const [gx] = at(tx - 0.5, 0), [, ya] = at(0, y0 - 0.5), [, yb] = at(0, y1 + 0.5);
    el("path", {d: `M${gx} ${ya}V${yb}`, stroke: "#0d141c", "stroke-width": 1, fill: "none"});
  }
  for (let ty = y0; ty <= y1 + 1; ty++) {
    const [, gy] = at(0, ty - 0.5), [xa] = at(x0 - 0.5, 0), [xb] = at(x1 + 0.5, 0);
    el("path", {d: `M${xa} ${gy}H${xb}`, stroke: "#0d141c", "stroke-width": 1, fill: "none"});
  }
  for (const c of comps) {
    if (c.hp > 0) {
      const [lx, ly] = at(c.px, c.py);
      const g = el("g", {transform: `translate(${lx.toFixed(1)} ${ly.toFixed(1)}) rotate(${c.dir})`});
      g.appendChild(componentNode(c));
      // hurt but standing: the cell dims towards the colour a destroyed one wears
      if (c.maxHp && c.hp < c.maxHp) g.setAttribute("opacity", (0.45 + 0.5 * c.hp / c.maxHp).toFixed(2));
      continue;
    }
    for (const [tx, ty] of c.tiles) {
      const [lx, ly] = at(tx, ty);
      el("rect", {x: (lx - TILE / 2).toFixed(1), y: (ly - TILE / 2).toFixed(1),
                  width: TILE, height: TILE, rx: 2, fill: "rgba(255,92,114,.1)",
                  stroke: C.red, "stroke-width": 1.6, "stroke-dasharray": "4 3"});
      const q = TILE * 0.26;
      el("path", {d: `M${(lx - q).toFixed(1)} ${(ly - q).toFixed(1)}l${2 * q} ${2 * q}` +
                     `M${(lx + q).toFixed(1)} ${(ly - q).toFixed(1)}l${-2 * q} ${2 * q}`,
                  stroke: C.red, "stroke-width": 1.4, opacity: .7, fill: "none"});
    }
  }
  return svg;
}
)};

// The end-of-encounter frame, from "Shipyard Concepts" turn 11. One layout does
// every outcome: a coloured hairline, a verb in the title, a ledger column that
// always occupies the same width, and a right column that is either a CHOICE or a
// summary. The player learns one screen and reads the difference from the colour
// and the noun.
//
// The choice is the reason it is a popup at all. Turn 11: "Three cards, one pick,
// the rest burn -- a decision you can regret ... Rewards you cannot refuse should
// just land in the hold with a number." So `cards: []` is a legitimate call and
// draws the summary form, without a decision to make.
//
// `onDone(card)` is called with the taken card, or null for "take nothing". It is
// the ONLY exit: the popup does not close itself, because what happens next --
// next mission, jump, end of run -- belongs to the caller.
const _spoilsPopup = function _spoilsPopup(partIcon, damagePlate, INFO, TYPES, PALETTE, htl){return(
({verb = "CLEARED", tone = null, meta = "", note = "", summary = null, objectives = [], ship = null,
  lost = [], hold = [], ledger = [], cards = [], hint = "", takeLabel = "TAKE & JUMP",
  passLabel = "take nothing", onDone = null} = {}) => {
  const {C, MONO} = PALETTE;
  const hue = tone ?? C.green;
  const RARITY = {common: C.dim, uncommon: C.purple, rare: C.amber};
  let picked = cards.length ? 0 : null;

  const label = (t) => htl.html`<span style="font:700 9.5px ${MONO};letter-spacing:.18em;
    color:${C.dim}">${t}</span>`;
  const row = (k, v, colour = C.amber, strong = false) => htl.html`<div style="display:flex;
    align-items:baseline;justify-content:space-between;gap:12px">
    <span style="font:${strong ? 700 : 400} 11px ${MONO};color:${strong ? C.ink : C.dim}">${k}</span>
    <span style="font:700 ${strong ? 15 : 13}px ${MONO};color:${colour}">${v}</span></div>`;

  const cardEls = cards.map((card, i) => {
    const first = card.items?.[0];
    const art = first ? partIcon(first.type, first.n > 1 ? 58 : 72) : null;
    const el = htl.html`<div onclick=${() => pick(i)} style="min-width:0;
      padding:14px 12px 12px;border-radius:11px;cursor:pointer;display:flex;
      flex-direction:column;align-items:center;gap:9px;position:relative"></div>`;
    const name = card.items?.length
      ? card.items.map(it => it.type + (it.n > 1 ? " ×" + it.n : "")).join(" + ")
      : card.name ?? "—";
    const stats = first && TYPES[first.type]
      ? `${TYPES[first.type].tiles.length} cell${TYPES[first.type].tiles.length > 1 ? "s" : ""} · hp ${TYPES[first.type].hp}`
      : card.stats ?? "";
    el.append(
      htl.html`<div style="height:74px;display:flex;align-items:center;gap:4px">${
        art ?? htl.html`<span style="font:700 26px ${MONO};color:${C.purple}">◈</span>`}</div>`,
      htl.html`<div style="display:flex;flex-direction:column;align-items:center;gap:3px;text-align:center">
        <span style="font:700 12.5px ${MONO};color:${card.colour ?? C.ink}">${name}</span>
        <span style="font:400 9.5px ${MONO};color:${C.dim}">${stats}</span></div>`,
      htl.html`<div style="font:400 10px/1.5 ${MONO};color:rgba(232,236,245,.55);
        text-align:center">${card.why ?? INFO[first?.type] ?? ""}</div>`,
      htl.html`<div style="margin-top:auto;padding-top:8px;width:100%;
        border-top:1px solid ${C.line};display:flex;justify-content:space-between;gap:8px">
        <span style="font:${card.rarity && card.rarity !== "common" ? 700 : 400} 9px ${MONO};
          color:${RARITY[card.rarity] ?? C.faint}">${card.rarity ?? ""}</span>
        <span class="cpx-take" style="font:400 9px ${MONO};color:${C.faint}">tap to take</span></div>`);
    return el;
  });

  const paint = () => {
    cardEls.forEach((el, i) => {
      const on = i === picked;
      el.style.border = `${on ? 1.5 : 1}px solid ${on ? C.green : C.line}`;
      el.style.background = on ? "rgba(86,227,159,.07)" : "rgba(255,255,255,.02)";
      el.style.boxShadow = on ? "0 0 24px rgba(86,227,159,.14) inset" : "none";
      const tag = el.querySelector(".cpx-take");
      tag.textContent = on ? "selected" : "tap to take";
      tag.style.color = on ? C.green : C.faint;
      tag.style.fontWeight = on ? 700 : 400;
    });
  };
  const pick = (i) => { picked = i; paint(); };

  const btn = (text, colour, strong, click) => htl.html`<button onclick=${click} style="
    flex:none;white-space:nowrap;padding:${strong ? "12px 22px" : "11px 16px"};
    border-radius:9px;cursor:pointer;pointer-events:auto;
    border:${strong ? 1.5 : 1}px solid ${strong ? colour : C.line};
    background:${strong ? colour + "1f" : "transparent"};color:${strong ? colour : C.dim};
    font:${strong ? 700 : 500} ${strong ? 12 : 11}px ${MONO};
    letter-spacing:${strong ? ".14em" : "0"}">${text}</button>`;

  const objBlock = objectives.length ? htl.html`<div style="display:flex;
    flex-direction:column;gap:8px">${[label("OBJECTIVES"), ...objectives.map(o => {
      const colour = o.failed ? C.red : o.done ? C.green : C.dim;
      return htl.html`<div style="display:flex;align-items:center;gap:9px">
        <span style="width:14px;flex:none;text-align:center;font:700 11px ${MONO};
          color:${colour}">${o.failed ? "✕" : o.done ? "✓" : "·"}</span>
        <span style="flex:1;min-width:0;font:400 11.5px ${MONO};
          color:${o.done ? C.ink : C.dim}">${o.node ?? o.text ?? ""}</span>
        ${o.bonus ? htl.html`<span style="font:700 10px ${MONO};color:${C.amber}">${o.bonus}</span>` : ""}
      </div>`;
    })]}</div>` : null;

  const dmgBlock = ship ? htl.html`<div style="display:flex;flex-direction:column;gap:9px">
    ${label("DAMAGE")}
    <div style="display:flex;gap:16px;align-items:flex-start">
      ${damagePlate(ship, {size: 140})}
      <div style="display:flex;flex-direction:column;gap:8px;padding-top:2px;min-width:0">
        ${lost.length
          ? htl.html`<div style="display:flex;flex-direction:column;gap:2px">
              <span style="font:700 11px ${MONO};color:${C.red}">${
                lost.reduce((a, b) => a + b.n, 0)} destroyed</span>
              <span style="font:400 10px ${MONO};color:${C.dim}">${
                lost.map(l => l.type + (l.n > 1 ? " ×" + l.n : "")).join(" · ")}</span></div>`
          : htl.html`<span style="font:700 11px ${MONO};color:${C.green}">hull intact</span>`}
        <div style="font:400 9.5px/1.5 ${MONO};color:${C.faint}">${
          lost.length ? "rebuild it from the hold, or fly it as it is" : "nothing to rebuild"}</div>
      </div></div></div>` : null;

  // With neither objectives nor a hull to draw -- a RACE, a stop, a station -- the
  // ledger is the whole left column, and pushing it to the bottom of a column sized
  // for a damage plate leaves a hand's width of nothing above it.
  const solo = !objBlock && !dmgBlock;
  const ledgerBlock = ledger.length || hold.length
    ? htl.html`<div style="${solo ? "" : "margin-top:auto;"}display:flex;flex-direction:column;gap:7px;
        ${solo ? "" : "padding-top:14px;border-top:1px solid " + C.line}">
        ${ledger.map(([k, v, c]) => row(k, v, c ?? C.amber))}
        ${hold.length ? htl.html`<div style="display:flex;flex-wrap:wrap;gap:6px;padding-top:7px;
          border-top:1px dashed ${C.line}">${hold.map(h => htl.html`<span style="font:400 10px ${MONO};
          color:${C.dim};border:1px solid ${C.line};border-radius:999px;padding:2px 8px">${
          h.type} ×${h.n}</span>`)}</div>` : ""}</div>`
    : null;

  const right = cards.length
    ? htl.html`<div style="flex:1 1 380px;min-width:0;padding:20px 24px 22px;display:flex;
        flex-direction:column;gap:13px">
        <div style="display:flex;align-items:baseline;gap:12px;flex-wrap:wrap">
          ${label("SALVAGE — TAKE ONE")}
          <span style="font:400 10px ${MONO};color:${C.faint}">the rest burns with the wreck</span>
        </div>
        <div style="display:grid;gap:12px;align-items:stretch;
          grid-template-columns:repeat(auto-fit,minmax(148px,1fr))">${cardEls}</div>
        <div style="margin-top:auto;display:flex;flex-direction:column;gap:12px;padding-top:14px;
          border-top:1px solid ${C.line}">
          ${hint ? htl.html`<div style="display:flex;align-items:center;gap:9px;padding:8px 12px;
            border:1px solid rgba(255,196,46,.35);border-radius:8px;background:rgba(255,196,46,.05);
            font:400 10.5px ${MONO};color:rgba(232,236,245,.6)">
            <span style="color:${C.amber}">▲</span><span style="flex:1;min-width:0">${hint}</span></div>` : ""}
          <div style="display:flex;align-items:center;justify-content:flex-end;gap:11px;flex-wrap:wrap">
            ${btn(passLabel, C.dim, false, () => onDone?.(null))}
            ${btn(takeLabel + " →", C.green, true, () => onDone?.(picked == null ? null : cards[picked]))}
          </div></div></div>`
    : htl.html`<div style="flex:1 1 320px;min-width:0;padding:20px 24px 22px;display:flex;
        flex-direction:column;gap:12px">
        ${label("SUMMARY")}
        <div style="font:400 11.5px/1.7 ${MONO};color:rgba(232,236,245,.55)">${summary ?? note}</div>
        <div style="margin-top:auto;display:flex;justify-content:flex-end;padding-top:14px;
          border-top:1px solid ${C.line}">${btn(takeLabel + " →", hue, true, () => onDone?.(null))}</div>
      </div>`;

  const panel = htl.html`<div style="width:min(1060px,100%);max-height:100%;overflow:auto;
    border:1px solid rgba(255,255,255,.14);border-radius:14px;background:#080a10;
    box-shadow:0 24px 80px rgba(0,0,0,.7)">
    <div style="height:3px;background:linear-gradient(90deg,${hue},${hue}00)"></div>
    <div style="display:flex;align-items:baseline;gap:14px;flex-wrap:wrap;padding:18px 24px 15px">
      <span style="font:700 20px ${MONO};letter-spacing:.18em;color:${C.ink}">${verb}</span>
      <span style="font:400 11.5px ${MONO};color:${C.dim}">${meta}</span>
      <div style="flex:1"></div>
      <span style="font:400 11px ${MONO};color:${C.faint}">${note}</span>
    </div>
    <div style="display:flex;flex-wrap:wrap;border-top:1px solid ${C.line}">
      <div style="flex:${solo ? "0 1 280px" : "1 1 340px"};min-width:0;max-width:420px;
        padding:18px 22px 22px;
        border-right:1px solid ${C.line};display:flex;flex-direction:column;gap:18px">
        ${[objBlock, dmgBlock, ledgerBlock].filter(Boolean)}
      </div>
      ${right}
    </div></div>`;

  const root = htl.html`<div class="cpx-spoils" style="position:absolute;inset:0;z-index:24;
    display:flex;align-items:center;justify-content:center;padding:20px;
    background:rgba(4,5,10,.72);pointer-events:auto">${panel}</div>`;
  paint();
  // The QA seam is the cards and the two exits, so a test takes a card the way a
  // finger does rather than by reaching into the campaign.
  root.qa = {cards, pick, take: () => onDone?.(picked == null ? null : cards[picked]),
             pass: () => onDone?.(null), picked: () => picked};
  return root;
}
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };
  main.define("module @tomlarkworthy/corepox-engine",
    async () => runtime.module((await import("/@tomlarkworthy/corepox-engine.js?v=4")).default));
  main.define("module @tomlarkworthy/corepox-render",
    async () => runtime.module((await import("/@tomlarkworthy/corepox-render.js?v=4")).default));
  main.define("module @tomlarkworthy/corepox-assets",
    async () => runtime.module((await import("/@tomlarkworthy/corepox-assets.js?v=4")).default));
  for (const n of ["Ship", "World", "TYPES", "PORTS", "DT", "loadShipSpec"])
    main.define(n, ["module @tomlarkworthy/corepox-engine", "@variable"], (_, v) => v.import(n, _));
  for (const n of ["battlefield", "componentNode"])
    main.define(n, ["module @tomlarkworthy/corepox-render", "@variable"], (_, v) => v.import(n, _));
  main.define("TILE", ["module @tomlarkworthy/corepox-assets", "@variable"],
    (_, v) => v.import("TILE", _));

  $def("_title", "title", ["md"], _title);
  $def("_INFO", "INFO", [], _INFO);
  $def("_MENU_ACTIONS", "MENU_ACTIONS", [], _MENU_ACTIONS);
  $def("_PALETTE", "PALETTE", [], _PALETTE);
  $def("_boardSession", "boardSession", ["Ship","World","loadShipSpec"], _boardSession);
  $def("_CLOCK", "CLOCK", ["PALETTE"], _CLOCK);
  $def("_tempoChip", "tempoChip", ["CLOCK","PALETTE","htl"], _tempoChip);
  $def("_partIcon", "partIcon", ["componentNode","TYPES","TILE"], _partIcon);
  $def("_damagePlate", "damagePlate", ["componentNode","TILE","PALETTE"], _damagePlate);
  $def("_spoilsPopup", "spoilsPopup",
       ["partIcon","damagePlate","INFO","TYPES","PALETTE","htl"], _spoilsPopup);
  $def("_shipBoard", "shipBoard",
       ["battlefield","componentNode","INFO","MENU_ACTIONS","PALETTE","partIcon","TYPES","PORTS","TILE","DT","htl","invalidation"],
       _shipBoard);
  return main;
}