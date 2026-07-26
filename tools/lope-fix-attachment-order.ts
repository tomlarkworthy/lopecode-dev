#!/usr/bin/env bun
/**
 * lope-fix-attachment-order.ts — move a module's content blocks so they precede the
 * module block, which is where a module's own attachments must appear.
 *
 * `<script type="text/plain">` blocks are inert data, so relocating one cannot change
 * execution; the only observable effect is DOM order, and modules that read their own
 * blocks by `querySelectorAll` (markdown-wiki) see the group's relative order kept.
 *
 * The same placement rule applies when injecting a module during a resync sweep, so
 * `placeBefore` is exported rather than inlined.
 *
 *   bun tools/lope-fix-attachment-order.ts                    # report, whole corpus
 *   bun tools/lope-fix-attachment-order.ts --write            # rewrite in place
 *   bun tools/lope-fix-attachment-order.ts --write <f.html> …
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from "fs";
import { join, resolve, relative } from "path";

const ROOT = resolve(import.meta.dir, "..");
const REPOS = ["lopecode", "lopebooks"];

type Span = { id: string; attrs: string; start: number; end: number };

/** Script blocks with an id, in document order, with their byte spans. */
export function spans(html: string): Span[] {
  const out: Span[] = [];
  const re = /<script\s+id="([^"]+)"([^>]*)>[\s\S]*?<\/script>\n?/g;
  for (let m = re.exec(html); m; m = re.exec(html))
    out.push({ id: m[1], attrs: m[2], start: m.index, end: m.index + m[0].length });
  return out;
}

const isModuleBlock = (s: Span) =>
  /data-mime="application\/javascript"/.test(s.attrs) &&
  !/data-encoding=/.test(s.attrs) &&
  s.id.split("/").length <= 2;

/**
 * Relocate every `<owner>/…` block that sits after its owner to just before it.
 * Returns the rewritten html and what moved.
 */
export function placeBefore(html: string): { html: string; moved: string[] } {
  const ss = spans(html);
  const owners = new Set(ss.filter(isModuleBlock).map((s) => s.id));
  const ownerAt = new Map<string, number>();
  ss.forEach((s, i) => { if (owners.has(s.id) && !ownerAt.has(s.id)) ownerAt.set(s.id, i); });

  // group the strays by owner, keeping their relative order
  const strays = new Map<string, Span[]>();
  const moved: string[] = [];
  ss.forEach((s, i) => {
    const slash = s.id.lastIndexOf("/");
    if (slash < 0) return;
    const owner = s.id.slice(0, slash);
    const oi = ownerAt.get(owner);
    if (oi === undefined || i < oi) return;
    (strays.get(owner) ?? strays.set(owner, []).get(owner)!).push(s);
    moved.push(s.id);
  });
  if (!moved.length) return { html, moved };

  // Rebuild once, left to right: drop stray spans where they are, and emit each
  // owner's group immediately before the owner. Splicing one at a time would
  // invalidate every later offset.
  const drop = new Set(moved.map((id) => id));
  let out = "", cursor = 0;
  for (const s of ss) {
    const slash = s.id.lastIndexOf("/");
    const isStray = slash >= 0 && drop.has(s.id) && strays.get(s.id.slice(0, slash))?.some((x) => x.start === s.start);
    const group = owners.has(s.id) ? strays.get(s.id) : undefined;
    if (!isStray && !group) continue;
    out += html.slice(cursor, s.start);
    if (group) {
      for (const g of group) out += html.slice(g.start, g.end);
      out += html.slice(s.start, s.end);
    }
    cursor = s.end;
  }
  out += html.slice(cursor);
  return { html: out, moved };
}

if (import.meta.main) {

const argv = process.argv.slice(2);
const write = argv.includes("--write");
const explicit = argv.filter((a) => a.endsWith(".html"));
const targets = explicit.length
  ? explicit.map((p) => relative(ROOT, resolve(p)))
  : REPOS.flatMap((repo) => {
      const dir = join(ROOT, repo, "notebooks");
      if (!existsSync(dir)) return [];
      return readdirSync(dir).filter((f) => f.endsWith(".html")).sort().map((f) => relative(ROOT, join(dir, f)));
    });

let touched = 0;
for (const rel of targets) {
  const before = readFileSync(join(ROOT, rel), "utf8");
  const { html, moved } = placeBefore(before);
  if (!moved.length) continue;
  touched++;
  console.log(`${write ? "fixed" : "would fix"}  ${rel}  (${moved.length} block(s))`);
  for (const id of moved.slice(0, 4)) console.log(`    ${id}`);
  if (moved.length > 4) console.log(`    … ${moved.length - 4} more`);
  if (html.length !== before.length)
    throw new Error(`${rel}: byte count changed ${before.length} -> ${html.length}; refusing to write`);
  if (write) writeFileSync(join(ROOT, rel), html);
}
console.log(`\n${touched} notebook(s) ${write ? "rewritten" : "need fixing"} of ${targets.length}`);

}
