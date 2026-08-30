# Berlin Whimsy Map — wall-hung 3D puzzle

Laser-cut from 3mm plywood, two 400×300mm sheets. **RED = cut, BLUE = score.**
Cut with scored faces up; keep scored faces toward the viewer when assembling.
Slots are exactly 3.0mm (no kerf compensation, per 0.05mm beam). The tiny red
45° nicks at internal corners are corner-relief cuts — they remove the 0.15mm
corner rounding so square tabs seat fully. Cut them; they are part of the file.

Every joint works the same way: push straight in, then **slide down**. Gravity
is the lock. To disassemble, lift straight up, then pull out.

## Parts

| ID | Part | Qty |
|----|------|-----|
| — | Map plate (Berlin blob, sheet 1) | 1 |
| R1, R2 | Ribs (vertical spines behind the plate) | 2 |
| — | Hanger bar (`BERLIN WHIMSY MAP`, keyholes) | 1 |
| F1–F9 | Fins (standoff brackets; IDs scored on each fin and next to its plate slots) | 9 |
| — | Silhouettes: Fernsehturm, Brandenburger Tor, Siegessäule, Oberbaumbrücke, Buddy Bear, Ampelmännchen, Currywurst | 7 |

## Wall preparation

Drive two screws into the wall, **96mm apart, level**, heads left **~7mm
proud** of the wall. Hang the finished sculpture by the hanger-bar keyholes:
big hole over the screw head, then let it slide down.

## Assembly order

1. **Ribs → plate.** Lay the plate face down. From the back, push R1 and R2's
   two front hook tabs through their labeled slots, then slide each rib
   **down** 4mm — the hooks catch the plate front. The rib rear ears (with the
   downward notch) point up/away from the plate.
2. **Fins → plate.** For each fin F1–F9: from the front, insert its hooked tab
   and plain tab through the matching labeled slot pair, slide **down** 4mm.
   The hook catches behind the plate; the plain tab below stops pitch.
3. **Silhouettes → fins.** Lower each silhouette onto its fin mast(s) so the
   mast slot and silhouette notch cross-lap (Tor and Oberbaumbrücke take two
   fins; their arches drop over the masts). Slide down until seated.
4. **Hang it.** Offer the whole sculpture up to the wall so the two hanger-bar
   keyhole circles pass over the screw heads, then lower — the screw shafts
   ride up the keyhole slots. The hanger bar sits in the rib ears' notches:
   the ribs' notch ceilings rest on the bar's top-edge notches, locking
   left-right; the ears trap the bar against the wall.

The plate stands 16mm off the wall; landmarks float 14–36mm in front of the
map, each above its true location. Currywurst (from Curry 36) floats
front-most. The whole piece lifts off the wall in one motion for dusting.

## Verification

`bun verify.js` — 63 automated checks: full assembly sweep simulation (every
part swept along its insertion path against all previously placed parts),
gravity-lock tests (declared escape directions must collide), slot/tab
dimension audit, minimum cut-web integrity, hidden-hardware projection, and
hang physics (center of gravity between the keyholes). All pass.
