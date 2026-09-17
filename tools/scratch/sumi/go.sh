#!/bin/bash
cd /Users/tom.larkworthy/dev/lopecode-dev
bun tools/channel/sync-module.ts --module @tomlarkworthy/suminagashi --source modules/@tomlarkworthy/suminagashi.js --target lopebooks/notebooks/@tomlarkworthy_suminagashi.html 2>&1 | grep -iE "error|refus|fail" >&2
bun tools/scratch/sumi/probe.ts --gpu "$@" 2>&1 | grep -v @import
