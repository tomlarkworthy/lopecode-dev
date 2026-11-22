#!/bin/sh
# controls (c0) and every batch through the live checker (rules on) and runCells; full log in all.out.txt
cd "$(dirname "$0")" && bun run.ts c0.ts b1.ts b2.ts b3.ts b4.ts b5.ts b6.ts b7.ts b8.ts b9.ts b10.ts b11.ts > all.out.txt 2>&1; bun nb-island.ts >> all.out.txt 2>&1; grep -E "^--|^SILENT|^notebook" all.out.txt
