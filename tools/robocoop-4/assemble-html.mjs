#!/usr/bin/env node
// Deterministic assembly of lopebooks/notebooks/@tomlarkworthy_robocoop-4.html.
// Stage 1 (this script): copy the justbash base, patch bootconf (title/mains/hash).
// Stage 2 (run after): sync-module --insert-ok the rc4 modules (incl -core, which holds ALL logic).
// Notebook-canonical: there is NO inlined JS bundle — the agent core lives in the -core module's
// cells, exactly like every other lopecode module. Re-runnable from the base.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const BASE = join(ROOT, 'lopebooks', 'notebooks', '@tomlarkworthy_justbash.html');
const TARGET = join(ROOT, 'lopebooks', 'notebooks', '@tomlarkworthy_robocoop-4.html');

let html = readFileSync(BASE, 'utf8');

// Patch the live bootconf.json block (title / mains / hash). -core and -tools are imported (not
// laid out), so they don't go in mains; the laid-out modules do.
const RC4_MAINS = [
  '@tomlarkworthy/robocoop-4-engine',
  '@tomlarkworthy/robocoop-4-hostbridge',
  '@tomlarkworthy/robocoop-4',
  '@tomlarkworthy/robocoop-4-tests', // booted (not in the view) so test_rc4_* cells exist for node CI
];
// Flat layout only — lopepage parses the view once at boot and rejects nested S(S(),S()) groups.
const HASH =
  '#view=R100(S40(@tomlarkworthy/justbash),S45(@tomlarkworthy/robocoop-4),S15(@tomlarkworthy/robocoop-4-hostbridge))';

// Anchor on the bootloader marker so we patch the REAL bootconf, not the templated one inside
// the exporter's source (which contains ${...} and isn't valid JSON).
const bootRe = /(<!-- Bootloader -->\n<script id="bootconf\.json"[^>]*>\n)([\s\S]*?)(\n<\/script>)/;
const m = html.match(bootRe);
if (!m) throw new Error('bootconf.json block not found');
const conf = JSON.parse(m[2]);
conf.title = 'robocoop-4';
conf.mains = [...new Set([...(conf.mains || []), ...RC4_MAINS])];
conf.hash = HASH;
html = html.replace(bootRe, m[1] + JSON.stringify(conf, null, 2) + m[3]);

writeFileSync(TARGET, html);
console.log('Wrote ' + TARGET);
console.log('  + bootconf title=robocoop-4, mains+=' + RC4_MAINS.length + ', hash set');
console.log('Next: sync-module --insert-ok the rc4 modules (incl -core) into the target.');
