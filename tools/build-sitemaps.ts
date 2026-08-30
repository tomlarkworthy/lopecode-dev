#!/usr/bin/env bun
// Generates the sitemaps for tomlarkworthy.github.io.
//
// Google resolves a sitemap's scope from its location: a sitemap only covers descendants of its
// own directory. So each content repo carries a sitemap of its own subtree, and the root repo
// carries a sitemap INDEX plus robots.txt (the only file whose location is not negotiable —
// crawlers read it at the domain root and nowhere else).
//
//   tomlarkworthy.github.io/robots.txt    Sitemap: line, points at the index
//   tomlarkworthy.github.io/sitemap.xml   <sitemapindex> -> the two below
//   lopebooks/sitemap.xml                 /lopebooks/**
//   lopecode/sitemap.xml                  /lopecode/**
//
//   bun tools/build-sitemaps.ts                        rewrite all four
//   bun tools/build-sitemaps.ts --check                exit 1 if any URL set is wrong
//   bun tools/build-sitemaps.ts --check --only lopebooks   just that repo (the prek hook)

import { readdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";

const ORIGIN = "https://tomlarkworthy.github.io";
const ROOT = new URL("..", import.meta.url).pathname;
const ROOT_REPO = "tomlarkworthy.github.io";

const argv = process.argv.slice(2);
const CHECK = argv.includes("--check");
const ONLY = argv[argv.indexOf("--only") + 1] && argv.includes("--only")
  ? argv[argv.indexOf("--only") + 1]
  : null;

const ALL_REPOS = [
  { dir: "lopebooks", base: "/lopebooks" },
  { dir: "lopecode", base: "/lopecode" },
];
const REPOS = ONLY ? ALL_REPOS.filter((r) => r.dir === ONLY) : ALL_REPOS;

const xmlEscape = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Last commit date for a path, YYYY-MM-DD. Falls back to today for uncommitted files. */
function lastmod(repoDir: string, relPath: string): string {
  try {
    const out = execFileSync(
      "git",
      ["-C", join(ROOT, repoDir), "log", "-1", "--format=%cI", "--", relPath],
      { encoding: "utf8" },
    ).trim();
    if (out) return out.slice(0, 10);
  } catch {}
  return new Date().toISOString().slice(0, 10);
}

function urlsFor({ dir, base }: { dir: string; base: string }) {
  const nbDir = join(ROOT, dir, "notebooks");
  return [
    // The repo landing page: GitHub Pages renders README.md here, and it is the crawl path that
    // got the first four notebooks indexed.
    { loc: `${ORIGIN}${base}/`, lastmod: lastmod(dir, "README.md") },
    ...readdirSync(nbDir)
      .filter((f) => f.endsWith(".html"))
      .sort()
      .map((f) => ({
        // encodeURI, not encodeURIComponent: the live URLs carry a literal `@`, and %40 would be
        // a distinct URL to Google, splitting signal off the copies that already rank.
        loc: `${ORIGIN}${base}/notebooks/${encodeURI(f)}`,
        lastmod: lastmod(dir, `notebooks/${f}`),
      })),
  ];
}

const urlset = (entries: { loc: string; lastmod: string }[]) =>
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  entries
    .map(
      (e) =>
        `  <url>\n    <loc>${xmlEscape(e.loc)}</loc>\n    <lastmod>${e.lastmod}</lastmod>\n  </url>`,
    )
    .join("\n") +
  `\n</urlset>\n`;

const locsIn = (xml: string) => new Set([...xml.matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => m[1]));

const problems: string[] = [];
const written: string[] = [];

/** Compare URL SETS, not whole files: `lastmod` is a git commit date, so at pre-commit time it
 *  still reads the previous commit and would flag every fresh notebook as stale forever. */
function checkUrls(path: string, expected: { loc: string }[]) {
  const full = join(ROOT, path);
  if (!existsSync(full)) return problems.push(`${path}: missing`);
  const have = locsIn(readFileSync(full, "utf8"));
  const want = new Set(expected.map((e) => e.loc));
  const missing = [...want].filter((l) => !have.has(l));
  const extra = [...have].filter((l) => !want.has(l));
  if (missing.length || extra.length) {
    problems.push(
      `${path}: ${missing.length} missing, ${extra.length} stale\n` +
        [...missing.map((l) => `      + ${l}`), ...extra.map((l) => `      - ${l}`)]
          .slice(0, 8)
          .join("\n"),
    );
  }
}

function checkExact(path: string, body: string) {
  const full = join(ROOT, path);
  if (!existsSync(full)) return problems.push(`${path}: missing`);
  if (readFileSync(full, "utf8") !== body) problems.push(`${path}: out of date`);
}

function write(path: string, body: string) {
  const full = join(ROOT, path);
  if (!existsSync(dirname(full))) return; // submodule not initialised
  if (existsSync(full) && readFileSync(full, "utf8") === body) return;
  writeFileSync(full, body);
  written.push(path);
}

const children: string[] = [];
for (const repo of REPOS) {
  if (!existsSync(join(ROOT, repo.dir, "notebooks"))) {
    console.error(`skip ${repo.dir}: no notebooks/ (submodule not initialised?)`);
    continue;
  }
  const entries = urlsFor(repo);
  const path = `${repo.dir}/sitemap.xml`;
  if (CHECK) checkUrls(path, entries);
  else write(path, urlset(entries));
  children.push(`${ORIGIN}${repo.base}/sitemap.xml`);
  console.log(`${path}: ${entries.length} urls`);
}

// The root index and robots.txt are static — only a new content repo changes them — so `--only`
// (the per-repo prek hook) leaves them alone rather than reporting a half-built index as broken.
if (!ONLY) {
  const index =
    `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    children.map((loc) => `  <sitemap>\n    <loc>${xmlEscape(loc)}</loc>\n  </sitemap>`).join("\n") +
    `\n</sitemapindex>\n`;
  const robots = `User-agent: *\nAllow: /\n\nSitemap: ${ORIGIN}/sitemap.xml\n`;
  if (existsSync(join(ROOT, ROOT_REPO))) {
    if (CHECK) {
      checkExact(`${ROOT_REPO}/sitemap.xml`, index);
      checkExact(`${ROOT_REPO}/robots.txt`, robots);
    } else {
      write(`${ROOT_REPO}/sitemap.xml`, index);
      write(`${ROOT_REPO}/robots.txt`, robots);
    }
  } else {
    console.error(`skip ${ROOT_REPO}: submodule not initialised`);
  }
}

if (CHECK) {
  if (problems.length) {
    console.error(`\nsitemap out of date:\n  ${problems.join("\n  ")}`);
    console.error(`\nfix with: bun tools/build-sitemaps.ts`);
    process.exit(1);
  }
  console.log("sitemaps up to date");
} else {
  console.log(written.length ? `wrote:\n${written.map((s) => `  ${s}`).join("\n")}` : "no changes");
}
