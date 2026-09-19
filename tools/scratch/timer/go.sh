#!/bin/bash
cd /Users/tom.larkworthy/dev/lopecode-dev
bun tools/channel/sync-module.ts --module @tomlarkworthy/liquid-timer --source modules/@tomlarkworthy/liquid-timer.js --target lopebooks/notebooks/@tomlarkworthy_liquid-timer.html 2>&1 | grep -iE "error|refus|fail" >&2
bun tools/scratch/timer/probe.ts "$@" 2>&1 | grep -v '^\s*$'
