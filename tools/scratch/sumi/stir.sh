#!/bin/bash
# many rings then a hard stir; $1 = output prefix
cd /Users/tom.larkworthy/dev/lopecode-dev
C=""; for i in 1 2 3 4 5 6 7 8 9 10 11 12; do C="$C;480,285,220,250"; done
bun tools/scratch/sumi/probe.ts --gpu --nodemo --w 1300 --clicks "${C:1}" --prewait 300 --wait 5000 --shots 1 --dpr 3 --zoom "620,60,300,200" --out "$1" --blow "250,420,700,150;750,430,300,200;480,80,480,500;300,285,660,285" 2>&1 | grep errs
