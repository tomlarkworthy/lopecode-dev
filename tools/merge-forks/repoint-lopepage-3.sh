#!/bin/sh
# Merge E step 2: builds a copy of the lopepage-3 demo on the merged originals (editor-5, visualizer, cell-map)
# into tools/merge-forks/.out/E2-lp3.html; the demo itself is not changed. Run from the worktree root.
# gate: bun tools/lopepage-3/boot-check.ts <copy>; bun tools/lopepage-3/save-reload-check.ts <copy>
set -eu
O=tools/merge-forks/.out
LC=lopecode/notebooks; LB=lopebooks/notebooks
cp $LB/@tomlarkworthy_lopepage-3.html $O/E2-lp3-HEAD.html
cp $O/E2-lp3-HEAD.html $O/E2-lp3.html
# present but old: replace in place
bun tools/merge-forks/swap-block.ts $O/E2-lp3.html $LC/@tomlarkworthy_cell-map.html @tomlarkworthy/cell-map $O/E2-lp3.html
# absent: inserted before bootconf.json, attachment before its module
bun tools/merge-forks/embed-suite.ts --base $O/E2-lp3.html --out $O/E2-lp3.html \
  --carry @tomlarkworthy/ui-testing=$LB/@tomlarkworthy_ui-testing.html \
  --carry @tomlarkworthy/visualizer=$LC/@tomlarkworthy_visualizer.html \
  --carry @tomlarkworthy/editor-5/cell_options.json=$LB/@tomlarkworthy_editor-5.html \
  --carry @tomlarkworthy/editor-5=$LB/@tomlarkworthy_editor-5.html
bun tools/merge-forks/merge-cells.ts tools/merge-forks/plans/E2-lopepage-3.json
bun tools/merge-forks/rm-blocks.ts $O/E2-lp3.html @tomlarkworthy/editor-6/cell_options.json @tomlarkworthy/editor-6 @tomlarkworthy/visualizer-2 @tomlarkworthy/cell-map-2
bun tools/lope-preflight.ts $O/E2-lp3-HEAD.html > $O/E2-preflight-HEAD.log 2>&1 || true
bun tools/lope-preflight.ts $O/E2-lp3.html > $O/E2-preflight.log 2>&1 || true
cat $O/E2-preflight-HEAD.log $O/E2-preflight.log
