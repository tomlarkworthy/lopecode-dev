#!/usr/bin/env node
// Deterministic assembly of lopebooks/notebooks/@tomlarkworthy_robocoop-4.html.
// Stage 1 (this script): copy the justbash base, take OWNERSHIP of the bash library (rename the
//   vendored just-bash bundle attachment + strip the original justbash-family module blocks), and
//   patch bootconf (title/mains/hash).
// Stage 2 (run after): sync-module --insert-ok the 9 rc4-owned modules (incl the renamed bash trio
//   and -core, which holds ALL agent logic).
// Notebook-canonical: there is NO inlined JS bundle — the agent core lives in the -core module's
// cells, exactly like every other lopecode module. robocoop-4 is the sole user of just-bash, so the
// bash modules are republished under the robocoop-4-bash* namespace. Re-runnable from the base.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const BASE = join(ROOT, 'lopebooks', 'notebooks', '@tomlarkworthy_justbash.html');
const TARGET = join(ROOT, 'lopebooks', 'notebooks', '@tomlarkworthy_robocoop-4.html');

let html = readFileSync(BASE, 'utf8');

const reEsc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// 1. Take ownership of the vendored just-bash bundle: rename the attachment id in place (single copy;
//    the renamed @tomlarkworthy/robocoop-4-bash module's loader map looks it up under the new id).
const ATT_OLD = 'id="@tomlarkworthy/just-bash/just-bash.browser.js.gz"';
const ATT_NEW = 'id="@tomlarkworthy/robocoop-4-bash/just-bash.browser.js.gz"';
if (!html.includes(ATT_OLD)) throw new Error('just-bash bundle attachment block not found');
html = html.replace(ATT_OLD, ATT_NEW);

// 2. Strip the original justbash-family module blocks — they are superseded by the robocoop-4-bash*
//    modules (synced in stage 2) and nothing booted imports them. Keeps the artifact unambiguous.
const STRIP = [
  '@tomlarkworthy/just-bash',
  '@tomlarkworthy/justbash-session',
  '@tomlarkworthy/justbash-terminal',
  '@tomlarkworthy/justbash-filesync',
  '@tomlarkworthy/justbash',
];
for (const id of STRIP) {
  // Block format is `<script id="ID" type="text/plain" ...>`. Anchor the id with its closing quote
  // so @tomlarkworthy/just-bash does NOT match the (already renamed) attachment id or longer ids.
  const re = new RegExp('<script id="' + reEsc(id) + '"[^>]*>[\\s\\S]*?</script>\\n?');
  if (re.test(html)) { html = html.replace(re, ''); console.log('  - stripped module block ' + id); }
  else console.log('  ! module block not found (skipped) ' + id);
}

// 3. Patch the live bootconf.json block (title / mains / hash). robocoop-4 is self-contained — it owns
//    its own just-bash workspace via the engine — so we boot only lopepage + the rc4 modules. The bash
//    trio and -core/-tools are imported (not laid out), so they don't go in mains.
const RC4_MAINS = [
  '@tomlarkworthy/robocoop-4-engine',
  '@tomlarkworthy/robocoop-4-hostbridge',
  '@tomlarkworthy/robocoop-4',
  '@tomlarkworthy/robocoop-4-tests', // booted (not in the view) so test_rc4_* cells exist for node CI
  '@tomlarkworthy/inputs-reference', // booted (not in the view) so host_sync projects it → the agent
                                     // can look up Inputs API docs (e.g. Inputs.toggle options) by grep
];
// Flat layout only — lopepage parses the view once at boot and rejects nested S(S(),S()) groups.
const HASH =
  '#view=R100(S75(@tomlarkworthy/robocoop-4),S25(@tomlarkworthy/robocoop-4-hostbridge))';

// Anchor on the bootloader marker so we patch the REAL bootconf, not the templated one inside
// the exporter's source (which contains ${...} and isn't valid JSON).
const bootRe = /(<!-- Bootloader -->\n<script id="bootconf\.json"[^>]*>\n)([\s\S]*?)(\n<\/script>)/;
const m = html.match(bootRe);
if (!m) throw new Error('bootconf.json block not found');
const conf = JSON.parse(m[2]);
conf.title = 'robocoop-4';
conf.mains = ['@tomlarkworthy/lopepage', ...RC4_MAINS];
conf.hash = HASH;
html = html.replace(bootRe, m[1] + JSON.stringify(conf, null, 2) + m[3]);

writeFileSync(TARGET, html);
console.log('Wrote ' + TARGET);
console.log('  + bundle attachment renamed to @tomlarkworthy/robocoop-4-bash/…');
console.log('  + bootconf title=robocoop-4, mains=lopepage+' + RC4_MAINS.length + ', hash set');
console.log('Next: sync-module --insert-ok the 9 rc4 modules (bash trio + core/tools/engine/hostbridge/app/tests).');
