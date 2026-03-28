// Observable source cells for @tomlarkworthy/lopebook-gallery
// Each cell is separated by "// ---CELL---" markers
// These are in Observable notebook syntax (not standard JS)

// ---CELL--- _title (pinned)
md`# Lopebook Gallery

Browse, discover, and download [lopecode](https://observablehq.com/@tomlarkworthy/lopecode-vision) notebooks — self-contained, portable HTML files powered by the Observable runtime.

*${content.entries.length} notebooks available*`

// ---CELL--- content
content = fetch("./content.json").then(r => r.json())

// ---CELL--- viewof search (pinned)
viewof search = Inputs.search(content.entries, {
  placeholder: "Search notebooks...",
  columns: ["title", "description", "slug", "tags"],
  label: ""
})

// ---CELL--- viewof selected_category (pinned)
viewof selected_category = Inputs.select(
  ["all", ...new Set(content.entries.map(e => e.category).filter(c => c !== "all"))],
  { label: "Category", value: "all" }
)

// ---CELL--- viewof sort_by (pinned)
viewof sort_by = Inputs.select(
  new Map([
    ["Name (A→Z)", "name_asc"],
    ["Name (Z→A)", "name_desc"],
    ["Size (small first)", "size_asc"],
    ["Size (large first)", "size_desc"]
  ]),
  { label: "Sort" }
)

// ---CELL--- filtered_entries
filtered_entries = {
  let entries = search;

  if (selected_category !== "all") {
    entries = entries.filter(e => e.category === selected_category);
  }

  const sorted = [...entries];
  switch (sort_by) {
    case "name_asc": sorted.sort((a, b) => a.title.localeCompare(b.title)); break;
    case "name_desc": sorted.sort((a, b) => b.title.localeCompare(a.title)); break;
    case "size_asc": sorted.sort((a, b) => (a.sizeMb || 0) - (b.sizeMb || 0)); break;
    case "size_desc": sorted.sort((a, b) => (b.sizeMb || 0) - (a.sizeMb || 0)); break;
  }
  return sorted;
}

// ---CELL--- gallery_grid (pinned)
gallery_grid = htl.html`<div class="gallery-grid">
  ${filtered_entries.map(entry => card(entry))}
  ${filtered_entries.length === 0 ? htl.html`<p style="grid-column: 1/-1; text-align: center; color: var(--theme-foreground-muted);">No notebooks match your search.</p>` : ""}
</div>`

// ---CELL--- card
card = (entry) => {
  const categoryDef = content.categories.find(c => c.id === entry.category) || content.categories[0];
  const sizeLabel = entry.sizeMb ? `${entry.sizeMb.toFixed(1)} MB` : "";

  return htl.html`<div class="gallery-card">
    <div class="card-header" style="background: linear-gradient(135deg, var(--theme-foreground-focus), var(--theme-foreground-muted));">
      <span class="card-initial">${entry.title.charAt(0)}</span>
    </div>
    <div class="card-body">
      <h3 class="card-title">${entry.title}</h3>
      <p class="card-description">${entry.description === "todo" ? "" : entry.description}</p>
      <div class="card-tags">
        ${entry.tags.filter(t => t !== "all").map(tag =>
          htl.html`<span class="card-tag">${tag}</span>`
        )}
      </div>
    </div>
    <div class="card-footer">
      ${sizeLabel ? htl.html`<span class="card-size">${sizeLabel}</span>` : ""}
      <div class="card-actions">
        <a href="${entry.url}" target="_blank" rel="noopener" class="card-action">Open</a>
        ${entry.url.endsWith(".html") ? htl.html`<a href="${entry.url}" download class="card-action">Download</a>` : ""}
        ${entry.sourceUrl ? htl.html`<a href="${entry.sourceUrl}" target="_blank" rel="noopener" class="card-action card-action-source">Source</a>` : ""}
      </div>
    </div>
  </div>`;
}

// ---CELL--- gallery_css (pinned)
gallery_css = htl.html`<style>
.gallery-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
  padding: 0.5rem 0;
}

.gallery-card {
  border: 1px solid var(--theme-foreground-faintest);
  border-radius: 8px;
  overflow: hidden;
  background: var(--theme-background);
  transition: box-shadow 0.2s, transform 0.2s;
  display: flex;
  flex-direction: column;
}
.gallery-card:hover {
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  transform: translateY(-2px);
}

.card-header {
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.card-initial {
  font-size: 2rem;
  font-weight: bold;
  color: var(--theme-background);
  opacity: 0.8;
}

.card-body {
  padding: 0.75rem 1rem;
  flex: 1;
}
.card-title {
  margin: 0 0 0.4rem 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--theme-foreground);
  line-height: 1.3;
}
.card-description {
  margin: 0;
  font-size: 0.85rem;
  color: var(--theme-foreground-muted);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
  margin-top: 0.5rem;
}
.card-tag {
  font-size: 0.7rem;
  padding: 0.15rem 0.5rem;
  border-radius: 99px;
  background: var(--theme-foreground-faintest);
  color: var(--theme-foreground-muted);
}

.card-footer {
  padding: 0.5rem 1rem;
  border-top: 1px solid var(--theme-foreground-faintest);
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.8rem;
}
.card-size {
  color: var(--theme-foreground-muted);
}
.card-actions {
  display: flex;
  gap: 0.75rem;
}
.card-action {
  color: var(--theme-foreground-focus);
  text-decoration: none;
  font-weight: 500;
}
.card-action:hover {
  text-decoration: underline;
}
.card-action-source {
  color: var(--theme-foreground-muted);
}
</style>`

// ---CELL--- _footer (pinned)
md`---
*[Lopecode](https://observablehq.com/@tomlarkworthy/lopecode-vision) — portable, reactive, self-serializing notebooks.*`
