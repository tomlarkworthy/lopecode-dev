#!/usr/bin/env node
/**
 * lope-push-files.js - Upload a lopecode module's file attachments to ObservableHQ.
 *
 * Observable has no public write API, but the notebook editor uploads attachments
 * with a multipart POST to /document/{id}/file (streamed NDJSON progress response)
 * and soft-deletes with POST /document/{id}/file/delete?name=. Both are used here.
 * File records live outside the node/version stream, so this never touches cells —
 * run it alongside lope-push-ws.js.
 *
 * ATTACHMENT NAMES ARE ONE-SHOT PER DOCUMENT. A name that has ever been uploaded
 * 409s forever, even after deletion — deleted records keep the name reserved.
 * Observable's own UI never overwrites: replacing a file mints `name@1.ext` and
 * rewrites the cells that referenced it. So this tool never deletes to replace;
 * differing content is reported as a conflict, and --replace-as-new opts into the
 * @N rename (leaving the cell edits to you).
 *
 * Usage:
 *   node tools/lope-push-files.js <notebook.html> --module @tomlarkworthy/daw \
 *     --target https://observablehq.com/@tomlarkworthy/daw \
 *     --cookies-file tools/.observable-cookies.json
 *
 * Options:
 *   --module <name>        Module whose attachments to upload (default: all attachments)
 *   --target <url>         Observable notebook URL or /d/{id} (default: spec upstreams)
 *   --files <a,b>          Only these attachment names
 *   --replace-as-new       On content conflict, upload as `name@N.ext` (cells that
 *                          reference the old name need updating by hand)
 *   --prune                Delete remote files not present locally. Destructive and
 *                          irreversible: the name can never be uploaded again.
 *   --size-only            Compare by size alone (default also byte-compares equal-size
 *                          files by downloading them)
 *   --dry-run              Show the plan, upload nothing
 *   --cookies-file <path>  T/I cookie JSON (default: tools/.observable-cookies.json)
 *   --verbose              Per-file server events
 *
 * Exit Codes: 0 success, 1 failure (including unresolved conflicts)
 */

import fs from 'fs';
import path from 'path';
import * as cheerio from 'cheerio';
import {
  API,
  cookieHeader,
  loadCookiesFromFile,
  extractNotebookSlug,
  fetchNotebook,
} from './observable-auth.js';

function log(msg) {
  process.stderr.write(`[lope-push-files] ${msg}\n`);
}

// --- Arg parsing ---

function parseArgs(argv) {
  const args = argv.slice(2);
  const options = {
    notebook: null,
    module: null,
    target: null,
    files: null,
    prune: false,
    replaceAsNew: false,
    sizeOnly: false,
    dryRun: false,
    verbose: false,
    cookiesFile: 'tools/.observable-cookies.json',
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--module' && args[i + 1]) options.module = args[++i];
    else if (arg === '--target' && args[i + 1]) options.target = args[++i];
    else if (arg === '--files' && args[i + 1])
      options.files = args[++i].split(',').map(s => s.trim()).filter(Boolean);
    else if (arg === '--cookies-file' && args[i + 1]) options.cookiesFile = args[++i];
    else if (arg === '--prune') options.prune = true;
    else if (arg === '--replace-as-new') options.replaceAsNew = true;
    else if (arg === '--size-only') options.sizeOnly = true;
    else if (arg === '--dry-run') options.dryRun = true;
    else if (arg === '--verbose') options.verbose = true;
    else if (arg === '--help' || arg === '-h') {
      console.log(fs.readFileSync(new URL(import.meta.url), 'utf8')
        .split('\n').slice(1, 28).map(l => l.replace(/^ ?\*\/?/, '')).join('\n'));
      process.exit(0);
    } else if (!arg.startsWith('--') && !options.notebook) options.notebook = arg;
  }
  if (options.prune && options.files) {
    console.error('Error: --prune with --files would delete every attachment outside --files. Drop one.');
    process.exit(1);
  }
  return options;
}

// --- Local attachment extraction ---

/**
 * Attachments are <script type="text/plain" id="@user/mod/name.ext"> blocks
 * (legacy: id="file://name"), base64 when data-encoding says so.
 * Returns [{ name, module, mime, bytes }].
 */
export function extractAttachments(html, moduleName = null) {
  const $ = cheerio.load(html);
  const out = [];
  const seen = new Set();

  $('script[id]').each((_, el) => {
    const $el = $(el);
    const id = $el.attr('id');
    const dataMime = $el.attr('data-mime');
    const dataEncoding = $el.attr('data-encoding');
    const type = $el.attr('type');
    const content = $el.text().trim();
    if (!content) return;

    const isJsModule = dataMime === 'application/javascript' || type === 'lope-module';
    const isAttachment =
      type === 'lope-file' || (dataEncoding === 'base64' && !isJsModule) ||
      (id.startsWith('file://') && !isJsModule) ||
      (!!dataMime && !isJsModule && /^@[^/]+\/[^/]+\//.test(id));
    if (!isAttachment) return;

    const owner = $el.attr('module') || id.match(/^(@[^/]+\/[^/]+)\//)?.[1] || null;
    const name = $el.attr('file') ||
      (owner ? id.slice(owner.length + 1) : id.replace(/^file:\/\//, ''));

    if (moduleName && owner !== moduleName) return;
    if (seen.has(name)) return; // first block wins, like the runtime's content map
    seen.add(name);

    const bytes = dataEncoding === 'base64'
      ? Buffer.from(content, 'base64')
      : Buffer.from(content, 'utf8');

    out.push({ name, module: owner, mime: dataMime || 'application/octet-stream', bytes });
  });

  return out;
}

// --- Observable file API ---

/** Files the document currently exposes (soft-deleted ones are filtered out). */
function liveFiles(doc) {
  return (doc.files || []).filter(f => f.status !== 'deleted');
}

/** Every name the document has ever used — deleted records still reserve theirs. */
function reservedNames(doc) {
  return new Set((doc.files || []).map(f => f.name));
}

/** Observable's replacement-name rule: foo.wav -> foo@1.wav -> foo@2.wav. */
function nextFreeName(name, reserved) {
  let candidate = name;
  while (reserved.has(candidate)) {
    candidate = candidate.replace(/(?:@(\d+))?(?=\.|$)/, (_, n = '') => `@${+n + 1}`);
  }
  return candidate;
}

async function downloadFile(file) {
  const resp = await fetch(file.url);
  if (!resp.ok) throw new Error(`download ${file.name}: HTTP ${resp.status}`);
  return Buffer.from(await resp.arrayBuffer());
}

/**
 * POST the file as multipart/form-data. The response is a stream of NDJSON
 * events: start / progress / finish, or an error event (FILE_QUOTA_EXCEEDED,
 * FILE_EMPTY, ...) with HTTP 200, so the body must be inspected.
 */
async function uploadFile(docId, cookies, { name, mime, bytes }, options) {
  const form = new FormData();
  form.append('token', cookies.T);
  form.append('client_name', name);
  form.append('file', new Blob([bytes], { type: mime }), name);

  const resp = await fetch(`${API}/document/${docId}/file`, {
    method: 'POST',
    headers: { 'Cookie': cookieHeader(cookies), 'Origin': 'https://observablehq.com' },
    body: form,
  });
  const text = await resp.text();
  if (!resp.ok) throw new Error(`upload ${name}: HTTP ${resp.status} ${text.slice(0, 300)}`);

  const events = text.split('\n').filter(l => l.trim()).map(l => {
    try { return JSON.parse(l); } catch { return null; }
  }).filter(Boolean);
  if (options.verbose) events.forEach(e => log(`  ${name}: ${JSON.stringify(e)}`));

  const error = events.find(e => e.type === 'error');
  if (error) throw new Error(`upload ${name}: ${error.message || JSON.stringify(error)}`);
  const finish = events.find(e => e.type === 'finish');
  if (!finish) throw new Error(`upload ${name}: no finish event (${text.slice(0, 300)})`);
  return finish.file;
}

async function deleteFile(docId, cookies, name) {
  const resp = await fetch(
    `${API}/document/${docId}/file/delete?name=${encodeURIComponent(name)}`,
    {
      method: 'POST',
      headers: {
        'Cookie': cookieHeader(cookies),
        'Origin': 'https://observablehq.com',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token: cookies.T }),
    }
  );
  if (!resp.ok) throw new Error(`delete ${name}: HTTP ${resp.status} ${await resp.text()}`);
}

// --- Target resolution ---

/** Spec sidecar written by the jumpgate: upstreams["observablehq.com"][module]. */
function targetFromSpec(notebookPath, moduleName) {
  const specPath = notebookPath.replace(/\.html$/, '.json');
  if (!fs.existsSync(specPath)) return null;
  try {
    const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
    const upstreams = spec?.upstreams?.['observablehq.com'];
    return (moduleName && upstreams?.[moduleName]) ||
      (typeof spec?.['observablehq.com'] === 'string' ? spec['observablehq.com'] : null);
  } catch {
    return null;
  }
}

// --- Main ---

async function main() {
  const options = parseArgs(process.argv);

  if (!options.notebook) {
    console.error('Error: notebook HTML path required. See --help.');
    process.exit(1);
  }
  if (!fs.existsSync(options.notebook)) {
    console.error(`Error: notebook not found: ${options.notebook}`);
    process.exit(1);
  }

  const html = fs.readFileSync(options.notebook, 'utf8');
  let attachments = extractAttachments(html, options.module);
  if (options.files) {
    const want = new Set(options.files);
    attachments = attachments.filter(a => want.has(a.name));
    const missing = options.files.filter(n => !attachments.some(a => a.name === n));
    if (missing.length) {
      console.error(`Error: not in ${path.basename(options.notebook)}: ${missing.join(', ')}`);
      process.exit(1);
    }
  }

  if (!attachments.length) {
    log(`No attachments found${options.module ? ` for ${options.module}` : ''}.`);
    process.exit(0);
  }
  log(`Local attachments: ${attachments.map(a => `${a.name} (${a.bytes.length}B)`).join(', ')}`);

  const target = options.target || targetFromSpec(options.notebook, options.module);
  if (!target) {
    console.error(
      'Error: --target is required (no upstreams entry in the spec sidecar).\n' +
      'Example: --target https://observablehq.com/@tomlarkworthy/daw'
    );
    process.exit(1);
  }

  const cookies = await loadCookiesFromFile(options.cookiesFile, log);
  const slug = extractNotebookSlug(
    target.startsWith('http') ? target : `https://observablehq.com/${target.replace(/^\//, '')}`
  );
  const doc = await fetchNotebook(slug, cookies);
  log(`Target: ${doc.title || slug} (${doc.id}), ${liveFiles(doc).length} remote file(s)`);

  const remote = new Map(liveFiles(doc).map(f => [f.name, f]));
  const reserved = reservedNames(doc);
  const plan = [];
  for (const a of attachments) {
    const r = remote.get(a.name);
    if (!r) {
      // A burned name (uploaded then deleted) is gone for good; only @N can land.
      const uploadAs = reserved.has(a.name) ? nextFreeName(a.name, reserved) : a.name;
      reserved.add(uploadAs);
      plan.push({ ...a, action: 'upload', uploadAs, burned: uploadAs !== a.name });
      continue;
    }
    let same = r.size === a.bytes.length;
    if (same && !options.sizeOnly) same = (await downloadFile(r)).equals(a.bytes);
    if (same) {
      plan.push({ ...a, action: 'skip', remote: r, uploadAs: a.name });
    } else {
      const uploadAs = nextFreeName(a.name, reserved);
      reserved.add(uploadAs);
      plan.push({ ...a, action: 'conflict', remote: r, uploadAs });
    }
  }

  const prunable = options.prune
    ? liveFiles(doc).filter(f => !attachments.some(a => a.name === f.name))
    : [];

  for (const p of plan) {
    const detail = p.action === 'skip' ? ' — identical remotely'
      : p.action === 'conflict' ? ` — differs from remote (${p.remote.size}B)`
      : p.burned ? ` — "${p.name}" was deleted on this document, so its name is burned`
      : '';
    log(`${p.action.padEnd(8)} ${p.name}${p.uploadAs && p.uploadAs !== p.name ? ` -> ${p.uploadAs}` : ''} ` +
      `(${p.bytes.length}B, ${p.mime})${detail}`);
  }
  prunable.forEach(f => log(`delete   ${f.name} (${f.size}B) — not local`));

  const conflicts = plan.filter(p => p.action === 'conflict');
  if (conflicts.length && !options.replaceAsNew) {
    console.error(
      `Error: ${conflicts.length} file(s) differ from the remote copy: ${conflicts.map(c => c.name).join(', ')}\n` +
      'Observable cannot overwrite an attachment — the name is reserved for the life of the document.\n' +
      'Re-run with --replace-as-new to upload as ' +
      conflicts.map(c => c.uploadAs).join(', ') +
      ', then update the cells that reference the old name(s).'
    );
    process.exit(1);
  }

  if (options.dryRun) {
    log('Dry run: nothing uploaded.');
    process.exit(0);
  }

  let uploaded = 0;
  const renamed = [];
  for (const p of plan) {
    if (p.action === 'skip') continue;
    const file = await uploadFile(doc.id, cookies, { ...p, name: p.uploadAs }, options);
    uploaded++;
    if (p.uploadAs !== p.name) renamed.push(p);
    log(`✓ ${p.uploadAs} -> ${file.size}B`);
  }
  for (const f of prunable) {
    await deleteFile(doc.id, cookies, f.name);
    log(`✓ deleted ${f.name} (name now permanently reserved)`);
  }

  // Re-read so the report reflects what Observable actually stored.
  const after = liveFiles(await fetchNotebook(slug, cookies));
  log(`Done: ${uploaded} uploaded, ${plan.length - uploaded} skipped, ${prunable.length} deleted.`);
  log(`Remote files now: ${after.map(f => `${f.name} (${f.size}B)`).join(', ') || 'none'}`);
  if (renamed.length) {
    log('Renamed on upload — update the cells that call FileAttachment():');
    renamed.forEach(p => log(`  "${p.name}" -> "${p.uploadAs}"`));
  }

  const bad = plan.filter(p => {
    const f = after.find(x => x.name === p.uploadAs);
    return !f || f.size !== p.bytes.length;
  });
  if (bad.length) {
    console.error(`Error: not stored at the expected size: ${bad.map(b => b.uploadAs).join(', ')}`);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(err => {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  });
}
