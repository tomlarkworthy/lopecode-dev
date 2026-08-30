# MONDTRESOR — a layered puzzle box with two secrets

56 laser-cut parts, 3mm ply, four 400×300 sheets. **RED = cut, BLUE = score.**
No glue. External size ~136 × 100 × 63mm.

Cut all sheets **scored face up**. Every part keeps that face UP during
assembly, with ONE exception: **flip L01 (the plate with the reversed verse)
upside down** — the riddle must face the table.

Fits: slots drawn 2.85mm are press-fits for 3.0 tabs (tap home with a mallet
and a scrap block). Channels drawn 3.35mm slide. Rub a candle stub on the lid
runner's underside and edges, and on the drawer floor — wax is the only
lubricant the box needs.

## Parts

| Group | Parts |
|---|---|
| Stack | L00 foot ring, L01 base plate (flip!), L02–L05 plinth rings, L06 deck, L07–L15 wall rings, L16 ledge, L17 groove ring, L18 rim ring |
| Lid | RUNNER, LFRAME (mechanism frame), LTOP, 4 rivet keys |
| Dials | 2× knob / neck / cam / dial key; bolts A + B |
| Drawer | floor (GEHEIMFACH), facade, 2 sides, front, divider |
| Loose | 6 splines (S), dropper (D), 7 base keys |

Ring numbers are scored on each layer's top face (hidden once stacked), with a
small arrow that must always point to the BACK.

## Build the drawer

1. Press the two side walls, the front wall and the divider down into the
   floor slots.
2. Press the facade onto the floor's two back tabs (they enter the facade's
   bottom notches) and the side walls' back tabs. The facade is the box's
   secret back door — its edges are cut to continue the wall strata.

## Build the lid

1. Lay RUNNER flat, scored side up. Put LFRAME on it, then drop bolt A and
   bolt B into their channels, teeth pointing LEFT, noses touching the cam
   chambers.
2. Drop each cam into its chamber, notch anywhere.
3. Lay LTOP over everything; drop each neck disc into its bore, then the knob,
   then press the dial key down through knob + neck + cam — the key's end
   stays visible in the knob face and IS the pointer.
4. Press the four rivet keys through the corner slots (they show inside the
   scored diamonds — that is intentional joinery, not a defect).

## Stack the box

1. L00 foot ring flat on the bench. L01 on top, **riddle face down**, edges
   flush. Press the 7 base keys up from below through both layers.
2. Stack L02–L05 (numbers ascending, arrows to the back).
3. Slide the drawer in through the back mouth until the facade sits flush.
4. Add L06 (deck, moon medallion up), then L07–L14.
5. Drop the dropper **D** down the channel inside the back wall. It falls
   through the deck into the drawer — that is the drawer lock working.
6. Add L15 (this caps the dropper channel), then L16, L17, L18.
7. Drop the four SHORT splines into the front/back channels, the two LONG
   splines into the side channels. They tie the stack; the lid will cap them.
8. Turn both dial pointers to their marks (sun → the little waves glyph, moon
   → the little mountain glyph), slide the lid in from the front until it
   stops, then turn both dials away. The bolts click into the rim — the box
   is now one solid object.

## The secrets (spoilers)

- **Open the lid**: turn the sun pointer to the waves, the moon pointer to
  the mountain, then *lay the box on its left ear* — two soft clunks as the
  bolts fall inward — and slide the sky open toward the front.
- **The verse**: lift the box and look underneath (through the foot ring).
- **The second secret**: turn the box fully upside down — a deep clunk from
  the back wall (the dropper releasing) — then tip it toward its back: the
  GEHEIMFACH drawer glides out of the plinth. Its rear slot, behind the
  divider, hides the smallest treasures.
- Re-lock everything by reversing: drawer in, box upright (clunk), lid in,
  dials turned, box on its right ear (clunk-clunk).

## Verification

`bun verify.js` — 94 checks: the full 56-part assembly sequence simulated
along real insertion paths, lid locked/open state machine, cam behaviour
through a full dial revolution (retraction possible only at the marked
angle), drawer locked upright / free inverted, splines captive under the
closed lid, zero static penetrations, minimum cut webs, and fit audits.
