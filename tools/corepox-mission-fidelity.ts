// Diff the ported MISSIONS against the original scenes and mission scripts.
//
// Three sources, and they are authoritative in this order:
//   * the scene            -- where each ship sits (data/corepox/scene-transforms.json)
//   * MissionController    -- inventory/envelope/spoils, when the mission has NO
//                             subclass: SideShooter, TwinTurrets, Follow*
//                             (data/corepox/mission-settings.json)
//   * the mission subclass -- when it has one, it OVERRIDES the scene's components,
//                             so those numbers are transcribed from the C# below
//                             and cited line by line.
// InitialSettingsOverride.apply runs AFTER MissionController.applySettings
// (MissionController.cs:38-41), so a scene override wins over the subclass on UI.
import {importNotebookModule} from "./notebook-import.ts";
import {readFileSync} from "fs";
const m = await importNotebookModule("modules/@tomlarkworthy/corepox-missions.js");
const MISSIONS: any[] = await m.value("MISSIONS");
const trans = JSON.parse(readFileSync("data/corepox/scene-transforms.json", "utf8"));

// From the mission subclasses under Assets/scripts/scenes/missions/. Coord.grid(3,3)
// and BuildOverrideSquare both centre the box, so a 3x3 is -1..1 on both axes.
const grid = (w: number, h: number) => {
  const out: number[][] = [];
  for (let i = 0; i < w; i++) for (let j = 0; j < h; j++) out.push([i - (w >> 1), j - (h >> 1)]);
  return out;
};
const SUBCLASS: Record<string, any> = {
  // PlaceBrainMission.cs:45-61
  PlaceBrain:     {inventory: {Brain: 1}, envelope: [[0, 0]], spoils: {Armour: 2}},
  // CocoonMission.cs:20-37
  Cocoon:         {inventory: {Armour: 2}, envelope: [[0, -1], [0, 1]], spoils: {Explosive: 1}},
  // ConnectionMission.cs:65-81, used by BOTH connection scenes
  ConnectionLite: {inventory: {Brain: 1, Engine: 1}, envelope: [[0, 0], [0, -1]],
                   spoils: {Constant: 1, Engine: 1}},
  Connection:     {inventory: {Brain: 1, Engine: 1}, envelope: [[0, 0], [0, -1]],
                   spoils: {Constant: 1, Engine: 1}},
  // AimMission.cs:19-32 plus the CircleSpawn on Aim.unity. The second spoil is a
  // relic composite, carried separately in the mission's `composites`.
  Aim:            {inventory: {}, envelope: [], spoils: {Radar: 1},
                   spawn: {every: 5, radius: 18, arc: [-2, 10]}},
  // AvoidMission.cs:34-50. The inventory is unreachable in play -- the scene's
  // InitialSettingsOverride hides Build, Modify and Connect -- so it is not
  // compared; what the mission gives you is one live constant.
  Avoid:          {envelope: grid(3, 3), spoils: {Explosive: 2}},
  // ManualAim has no subclass; its SpoilsOverride carries LaserTurret2
  ManualAim:      {spoils: {LaserTurret2: 1}},
  // Base MissionController + the scene's own overrides
  SideShooter:    {inventory: {Lazer: 1, Armour: 1}, envelope: grid(3, 3), spoils: {Lazer: 1}},
  // The three Follow scenes, straight out of data/corepox/mission-settings.json.
  // Their InventoryOverride items are PPtr<GameObject> into the component prefabs;
  // tools/corepox-prefab-ids.py resolves each m_PathID by finding the prefab that
  // declares it.
  //
  // These are the OFFERED quantities, not the override's. UIState.buildOptions
  // subtracts what the player ship already carries and drops an item that is fully
  // accounted for -- composites by model.id, components only when
  // `candidate.composite == null`. tools/corepox-inventory-offered.py applies the
  // rule to all twelve scenes; it also settles what the two m_FileID 0 items are.
  // They are NOT relics: each is a second copy of the mission's own hull, and each
  // mission's ship is already that hull as a CompositeFn, so neither is offered.
  //
  //   FollowCourse          composite UnfinishedOrbDrone 1/1, Brain 1/1  -> nothing
  //   FollowCourseAdvanced  Brain 1/1, composite UnwiredOrbDrone 1/1, Constant 2/2
  //                                                                     -> nothing
  //   FollowBoss            Brain 1/1 cancelled, the other eight offered in full
  //
  // Both live Follow missions therefore have an empty BUILD menu, which is what
  // liveMode 1 and a brief that only talks about wires already said.
  FollowCourse:   {inventory: {}, envelope: grid(5, 7)},
  FollowCourseAdvanced: {inventory: {}, envelope: grid(5, 7),
                   spoils: {Orb: 1, Binary: 1}},
  FollowBoss:     {inventory: {Engine: 10, Binary: 4, Constant: 4, Radar: 2, Lazer: 2,
                               LaserTurret2: 2, Orb: 2, Armour: 2},
                   envelope: grid(5, 7), spoils: {Orb: 1, Binary: 1}},
  TwinTurrets:    {inventory: {Explosive: 3, Engine: 3, Constant: 3, Lazer: 2, Armour: 4},
                   envelope: grid(5, 5)},
};
// InitialSettingsOverride flags -> the actions left standing, in our `allow` terms.
const ALLOW: Record<string, any> = {
  ManualAim: {modify: true},
  Avoid: {modify: true},
};

// Known, deliberate divergences. Each one is a decision, so each one carries its
// reason; anything not in here that the gate reports is a defect.
const DIVERGENT: Record<string, Record<string, string>> = {
  ConnectionLite: {inventory:
    "the scene lets you rebuild the core and engine mid-tutorial; ours arrive built"},
  Connection: {inventory:
    "the scene lets you rebuild the core and engine mid-tutorial; ours arrive built",
    // Divergence FROM THE SCENE, TOWARD THE SHIPPED GAME, which is the direction
    // this gate cannot see: Connection.unity has no other ships, but the retail
    // build flies two rivals alongside, each running the finished program with its
    // Constant at 100 (data/corepox/shipped-ui/51-s.avif, 2026-08-20). Neither
    // carries a weapon, so they cannot change the outcome -- they change what the
    // mission is ABOUT, from a wiring exercise to a race.
    enemies: "the shipped build races you against two rivals; the scene has none"},
  // Avoid.unity's InitialSettingsOverride hides Build/Modify/Connect, which leaves
  // the level unfinishable: with the scene's own wiring one engine fires at a time
  // and the ship loops 3.6 tiles across (tools/corepox-drifter-arc.ts), while the
  // scene's jump zone is 4.69 tiles astern. AvoidMission.cs hands out engines and
  // constants and a 3x3 box, so the override is taken as the stale half.
  Avoid: {envelope: "AvoidMission's 3x3 box is unreachable (Build hidden) and unusable " +
                    "anyway -- Engine is two cells and every free cell's second cell is taken",
          // Same direction: the scene has one mine, the shipped arena hangs three
          // across the top. The flankers sit at +-6.4 tiles, outside the drifter's
          // measured 3.6-tile loop, so the reference solution still wins in 4.7s
          // (tools/corepox-play-missions.ts).
          enemies: "the shipped arena hangs three mines across the top; the scene has one"},
  // The scene's arc is centred on +4 degrees and this hull cannot hit off the
  // boresight -- the radar is 3 tiles behind the turret, which throws a shot at 18
  // tiles by 9.5 degrees. Every centred arc wins and every off-centre one loses
  // (tools/corepox-aim-spawn.ts). Period and radius are the scene's.
  Aim: {"spawn.arc": "off-centre arc: our turret misses off the boresight"},
  // These two are the only missions balanced around an inventory the PORT DOES NOT
  // HAVE. Prizes accumulate: SpoilsOverride names what a mission pays out,
  // SpoilsLoader awards it, PlayerRecord.setMissionGains(mission_id, ...) banks it
  // once per mission and PlayerRecord.getInventory() reads the running total back
  // out of the player's Firebase record (FirebaseLoader.cs:548). So what you can
  // build in a late mission is what you won in the early ones, and the scene's own
  // InventoryOverride is a top-up on top of that -- Tom, and the account inventory
  // is his, not an inference from the scenes. Here every mission's inventory is
  // fixed and nothing carries between them, which is why these two ship with the
  // roles swapped: you fly the armed ship. That is a playable completion of a
  // level whose real starting kit is an account balance, not a port of it.
  //
  // Corrected 2026-08-19: the earlier note here said neither was winnable as
  // authored, on the grounds that a bare Brain plus a Lazer has nothing to trigger
  // the gun with (LaserFn.cs:18 fires only on trigger.value > 0, and no component
  // prefab carries a value override). That reasoning assumed the InventoryOverride
  // was everything the player had. It is not.
  // FollowCourseAdvanced and FollowBoss each report one ship more than we place,
  // and it is the same row in both.
  // A second UnwiredOrbDrone is parked at (1.93, 6.06) in both scenes with no core
  // and no wires. FollowCourse parks its spare hull at (648.79, -512.56) instead,
  // which the 200-tile filter already drops; these two are close enough to read as
  // a ship and are not one. FollowCourseAdvanced's composite inventory item points
  // at this object -- which is how it was identified -- and it is never offered
  // (tools/corepox-inventory-offered.py). FollowBoss has the same parked copy and
  // no item pointing at it at all.
  FollowCourseAdvanced: {enemies: "an inert parked copy of the Orb Drone Chassis at (1.93, 6.06), no core and no wires -- the scene template, not a fourth ship"},
  FollowBoss: {enemies: "an inert parked copy of the Orb Drone Chassis at (1.93, 6.06), no core and no wires -- the scene template, not a fourth ship"},
  SideShooter: {inventory: "balanced around the carried account inventory; roles swapped",
                enemies: "balanced around the carried account inventory; roles swapped"},
  // TwinTurrets keeps the scene's post placement -- the two laserposts are the
  // enemies in both readings -- so only the build side is waived here.
  TwinTurrets: {inventory: "balanced around the carried account inventory; roles swapped",
                envelope: "balanced around the carried account inventory; roles swapped"},
};

const bag = (a: any[] = []) => Object.fromEntries(a.map((i: any) => [i.type, i.n]));
const cells = (a: number[][] = []) => new Set(a.map(c => `${c[0]},${c[1]}`));
const near = (a: number, b: number) => Math.abs(a - b) < 0.02;

let issues = 0;
for (const ms of MISSIONS) {
  const lines: string[] = [];
  const want = SUBCLASS[ms.id] ?? {};
  if (want.inventory) {
    const got = bag(ms.inventory);
    if (JSON.stringify(got) !== JSON.stringify(want.inventory))
      lines.push(`  inventory ${JSON.stringify(got)} != ${JSON.stringify(want.inventory)}`);
  }
  if (want.spoils) {
    const got = bag(ms.spoils);
    if (JSON.stringify(got) !== JSON.stringify(want.spoils))
      lines.push(`  spoils ${JSON.stringify(got)} != ${JSON.stringify(want.spoils)}`);
  }
  if (want.envelope) {
    const g = cells(ms.envelope), w = cells(want.envelope);
    // the envelope is where you MAY build; cells the starting ship fills are not
    // offered, so ours is allowed to be a subset
    const extra = [...g].filter(c => !w.has(c));
    if (extra.length) lines.push(`  envelope offers ${extra.join(" ")} outside the mission's box`);
    if (g.size < w.size - ms.ship?.components?.length)
      lines.push(`  envelope ${g.size} cells, mission box has ${w.size}`);
  }
  if (want.spawn) {
    const g = ms.spawn ?? {};
    for (const k of ["every", "radius"] as const)
      if (g[k] !== want.spawn[k]) lines.push(`  spawn.${k} ${g[k]} != ${want.spawn[k]}`);
    if (JSON.stringify(g.arc) !== JSON.stringify(want.spawn.arc))
      lines.push(`  spawn.arc ${JSON.stringify(g.arc)} != ${JSON.stringify(want.spawn.arc)}`);
  }
  if (ALLOW[ms.id] && JSON.stringify(ms.allow) !== JSON.stringify(ALLOW[ms.id]))
    lines.push(`  allow ${JSON.stringify(ms.allow)} != ${JSON.stringify(ALLOW[ms.id])}`);

  const rows: any[] = trans[ms.id] ?? [];
  if (rows.length) {
    // `player` is set from MissionController.initialShip, not guessed from names --
    // in SideShooter and TwinTurrets the player is a lone Brain and the armed ship
    // is the enemy, which is the opposite of how they are shipped here.
    // Positions in the file are absolute; ours are relative to the player, because
    // newSession always starts you at the origin. And a scene keeps inactive
    // template copies parked hundreds of tiles out -- FollowCourse has two at
    // (648.79, -512.56) -- so anything past the arena is not an enemy.
    const me = rows.find(r => r.player) ?? {tx: 0, ty: 0};
    const foes = rows.filter(r => !r.player && Math.hypot(r.tx, r.ty) < 200)
                     .map(r => ({...r, tx: r.tx - me.tx, ty: r.ty - me.ty}));
    const got = (ms.enemies ?? []).map((e: any) => e);
    if (foes.length !== got.length)
      lines.push(`  enemies: ${got.length}, scene has ${foes.length} (${foes.map(f => f.go).join(", ")})`);
    else for (const f of foes) {
      const hit = got.find((g: any) => near(g.x, f.tx) && near(g.y, f.ty) && near(((g.a % 360) + 360) % 360, ((f.a % 360) + 360) % 360));
      if (!hit) lines.push(`  enemies: none at scene ${f.go} (${f.tx}, ${f.ty}) a=${f.a}`);
    }
  }
  const known = DIVERGENT[ms.id] ?? {};
  const kept = lines.filter(l => !Object.keys(known).some(k => l.trim().startsWith(k)));
  const waived = lines.length - kept.length;
  if (kept.length) { console.log(ms.id); kept.forEach(l => console.log(l)); issues++; }
  else if (waived) console.log(`${ms.id}: ${waived} known divergence(s) -- ` +
    [...new Set(Object.values(known))].join("; "));
}
console.log(issues ? `\n${issues} of ${MISSIONS.length} missions differ from the original`
                   : `\nall ${MISSIONS.length} missions match the original`);
