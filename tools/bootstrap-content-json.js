#!/usr/bin/env node
// One-time script to bootstrap content.json from export_spec.json
// After this, the gallery notebook manages content.json directly.

import { readFileSync, writeFileSync, readdirSync, statSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");
const notebooksDir = join(rootDir, "lopebooks", "notebooks");

const BASE_URL = "https://tomlarkworthy.github.io/lopebooks/notebooks/";
const OBSERVABLE_BASE = "https://observablehq.com/";

const exportSpec = JSON.parse(
  readFileSync(join(rootDir, "lopebooks", "export_spec.json"), "utf-8")
);

function slugToFile(slug) {
  return slug.replace("/", "_") + ".html";
}

function fileToSlug(file) {
  // @tomlarkworthy_sign-a-pdf.html -> @tomlarkworthy/sign-a-pdf
  return file.replace(".html", "").replace("_", "/");
}

function slugToTitle(slug) {
  const name = slug.split("/")[1] || slug;
  return name
    .replace(/-/g, " ")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const entries = exportSpec.notebooks.map(({ name }) => {
  const file = slugToFile(name);
  const filePath = join(notebooksDir, file);
  let sizeMb = null;
  try {
    sizeMb = Math.round((statSync(filePath).size / 1048576) * 10) / 10;
  } catch {}
  return {
    slug: name,
    url: BASE_URL + file,
    title: slugToTitle(name),
    description: "todo",
    tags: ["all"],
    category: "all",
    thumbnail: null,
    featured: false,
    sourceUrl: OBSERVABLE_BASE + name,
    sizeMb,
  };
});

const content = {
  version: 1,
  categories: [
    { id: "all", label: "All", color: "var(--theme-foreground-muted)" },
  ],
  entries,
};

const outPath = join(rootDir, "content.json");
writeFileSync(outPath, JSON.stringify(content, null, 2) + "\n");
console.log(`Wrote ${entries.length} entries to ${outPath}`);
