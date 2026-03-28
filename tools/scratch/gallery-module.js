// Compiled Observable module for @tomlarkworthy/lopebook-gallery
// Intended for embedding in <script type="text/plain" data-mime="application/javascript">

// === Title ===
const _title = function _title(md, content){return(
  (() => {
    const starred = content.entries.filter(e => e.featured).length;
    return md`# Lopebook Gallery

Browse, discover, and download [lopecode](https://observablehq.com/@tomlarkworthy/lopecode-vision) notebooks — self-contained, portable HTML files powered by the Observable runtime.

*${starred} featured of ${content.entries.length} notebooks*`;
  })()
)};

// === Config ===
const _initial_config = function _initial_config(){return(
  ({
    contentUrl: "https://raw.githubusercontent.com/tomlarkworthy/lopebooks/main/content.json",
    owner: "tomlarkworthy",
    repo: "lopebooks",
    branch: "main",
    contentPath: "content.json",
    assetsBase: "https://tomlarkworthy.github.io/lopebooks/assets/"
  })
)};

// === Fetched content ===
const _fetched_content = function _fetched_content(initial_config){return(
  fetch(initial_config.contentUrl).then(r => r.json())
)};

// === localStorage helper ===
const _persist = function _persist(){return(
  (() => {
    const storage = (() => { try { return window.localStorage; } catch { return null; } })();
    const PREFIX = "lopebook-gallery:";
    return {
      get(key, fallback) {
        if (!storage) return fallback;
        const v = storage.getItem(PREFIX + key);
        return v !== null ? v : fallback;
      },
      set(key, value) {
        if (storage) storage.setItem(PREFIX + key, value);
      }
    };
  })()
)};

// === Curator panel ===
const _curator = function _curator(htl, Inputs, edits, content, $edits, $content, initial_config, persist, pushToGitHub){return(
  (() => {
    const config = initial_config;
    function persistedInput(type, key, fallback) {
      const el = document.createElement("input");
      el.type = type;
      el.value = persist.get(key, fallback);
      el.addEventListener("input", () => persist.set(key, el.value));
      return el;
    }
    const token = persistedInput("password", "token", "");
    token.placeholder = "GitHub token (PAT)";
    token.style.width = "100%";
    const owner = persistedInput("text", "owner", config.owner);
    const repo = persistedInput("text", "repo", config.repo);
    const branch = persistedInput("text", "branch", config.branch);
    const contentPath = persistedInput("text", "contentPath", config.contentPath);
    const contentUrl = persistedInput("text", "contentUrl", config.contentUrl);
    contentUrl.style.width = "100%";
    const commitMsg = htl.html`<input type="text" placeholder="Update gallery content" value="Update gallery content">`;
    const pushBtn = htl.html`<button disabled>Push</button>`;
    const status = htl.html`<div class="push-status"></div>`;

    const pendingCount = edits.size;
    const assetCount = [...edits.values()].filter(e => e.thumbnailData).length;

    pushBtn.disabled = !token.value;
    token.addEventListener("input", () => { pushBtn.disabled = !token.value; });

    pushBtn.addEventListener("click", async () => {
      pushBtn.disabled = true;
      status.className = "push-status";
      status.textContent = "Pushing...";

      try {
        // Build updated content.json
        const updated = JSON.parse(JSON.stringify(content));
        for (const [slug, edit] of edits) {
          const entry = updated.entries.find(e => e.slug === slug);
          if (!entry) continue;
          if ("featured" in edit) entry.featured = edit.featured;
          if ("description" in edit) entry.description = edit.description;
          if ("tags" in edit) entry.tags = edit.tags;
          if ("category" in edit) entry.category = edit.category;
          if (edit.thumbnailUrl) entry.thumbnail = edit.thumbnailUrl;
        }

        const files = [{
          path: contentPath.value,
          content: JSON.stringify(updated, null, 2) + "\n",
          encoding: "utf-8"
        }];

        // Add asset files
        for (const [slug, edit] of edits) {
          if (edit.thumbnailData) {
            files.push({
              path: "assets/" + edit.thumbnailFilename,
              content: edit.thumbnailData,
              encoding: "base64"
            });
          }
        }

        await pushToGitHub(
          token.value, owner.value, repo.value, branch.value,
          files, commitMsg.value
        );

        status.textContent = "Pushed " + files.length + " file(s) successfully.";
        $edits.value = new Map();
      } catch (err) {
        status.className = "push-status error";
        status.textContent = "Error: " + err.message;
        pushBtn.disabled = false;
      }
    });

    // Add notebook
    const addUrl = htl.html`<input type="text" placeholder="URL (e.g. https://tomlarkworthy.github.io/lopebooks/notebooks/...)" style="flex:1">`;
    const addTitle = htl.html`<input type="text" placeholder="Title" style="width:150px">`;
    const addBtn = htl.html`<button>Add</button>`;

    addBtn.addEventListener("click", () => {
      const url = addUrl.value.trim();
      if (!url) return;
      const title = addTitle.value.trim() || url.split("/").pop().replace(/\.html$/, "").replace(/[@_]/g, " ");
      const slug = url.split("/").pop().replace(/\.html$/, "").replace("_", "/");
      const sourceUrl = slug.includes("/") ? "https://observablehq.com/" + slug : null;

      const updated = JSON.parse(JSON.stringify($content.value));
      if (updated.entries.some(e => e.url === url)) return; // already exists
      updated.entries.push({
        slug,
        url,
        title,
        description: "todo",
        tags: ["all"],
        category: "all",
        thumbnail: null,
        featured: true,
        sourceUrl,
        sizeMb: null
      });
      $content.value = updated;

      addUrl.value = "";
      addTitle.value = "";
    });

    return htl.html`<details class="curator-panel">
      <summary>Curator Mode ${pendingCount > 0 ? htl.html`<span style="color:var(--theme-foreground-focus)"> (${pendingCount} pending${assetCount ? ", " + assetCount + " assets" : ""})</span>` : ""}</summary>
      <div class="curator-fields">
        <label>Token</label>${token}
        <label>Content URL</label>${contentUrl}
        <label>Owner</label>${owner}
        <label>Repo</label>${repo}
        <label>Branch</label>${branch}
        <label>Content path</label>${contentPath}
      </div>
      <div class="push-bar" style="border-top:none; padding-top:0.5rem;">
        ${addUrl}${addTitle}${addBtn}
      </div>
      <div class="push-bar">
        ${commitMsg}
        ${pushBtn}
      </div>
      ${status}
    </details>`;
  })()
)};


// === Show all toggle ===
const _show_all = function _show_all(Inputs){return(
  Inputs.toggle({ label: "Show all (including WIP)", value: false })
)};

// === Search ===
const _search = function _search(Inputs, content, show_all){return(
  (() => {
    const base = show_all ? content.entries : content.entries.filter(e => e.featured);
    return Inputs.search(base, {
      placeholder: "Search notebooks...",
      columns: ["title", "description", "slug", "tags"]
    });
  })()
)};

// === Category filter ===
const _selected_category = function _selected_category(Inputs, content){return(
  Inputs.select(
    ["all", ...new Set(content.entries.map(e => e.category).filter(c => c !== "all"))],
    { label: "Category", value: "all" }
  )
)};

// === Sort ===
const _sort_by = function _sort_by(Inputs){return(
  Inputs.select(
    new Map([
      ["Name (A\u2192Z)", "name_asc"],
      ["Name (Z\u2192A)", "name_desc"],
      ["Size (small first)", "size_asc"],
      ["Size (large first)", "size_desc"]
    ]),
    { label: "Sort" }
  )
)};

// === Filtered entries ===
const _filtered_entries = function _filtered_entries(search, selected_category, sort_by, edits){return(
  (() => {
    let entries = search;
    if (selected_category !== "all") {
      entries = entries.filter(e => e.category === selected_category);
    }
    // Apply local edits for display
    entries = entries.map(e => {
      const edit = edits.get(e.slug);
      return edit ? { ...e, ...edit } : e;
    });
    const sorted = [...entries];
    switch (sort_by) {
      case "name_asc": sorted.sort((a, b) => a.title.localeCompare(b.title)); break;
      case "name_desc": sorted.sort((a, b) => b.title.localeCompare(a.title)); break;
      case "size_asc": sorted.sort((a, b) => (a.sizeMb || 0) - (b.sizeMb || 0)); break;
      case "size_desc": sorted.sort((a, b) => (b.sizeMb || 0) - (a.sizeMb || 0)); break;
    }
    return sorted;
  })()
)};

// === Gallery grid ===
const _gallery_grid = function _gallery_grid(htl, filtered_entries, card){return(
  htl.html`<div class="gallery-grid">
    ${filtered_entries.map(entry => card(entry))}
    ${filtered_entries.length === 0 ? htl.html`<p style="grid-column: 1/-1; text-align: center; color: var(--theme-foreground-muted);">No notebooks match your filters.</p>` : ""}
  </div>`
)};

// === Download helper ===
const _download = function _download(){return(
  async (url, filename) => {
    const r = await fetch(url);
    const blob = await r.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }
)};

// === Curator open viewof ===
const _is_curator = function _is_curator(Generators){return(
  Generators.observe((notify) => {
    notify(false);
    const observer = new MutationObserver(() => {
      const details = document.querySelector('.curator-panel');
      if (details) notify(details.open);
    });
    // Start observing once the DOM is ready
    requestAnimationFrame(() => {
      observer.observe(document.body, { attributes: true, subtree: true, attributeFilter: ["open"] });
    });
    return () => observer.disconnect();
  })
)};

// === Card renderer ===
const _card = function _card(htl, download, $edits, edits, is_curator){return(
  (() => {
    const isCurator = is_curator;

    return (entry) => {
      const edit = edits.get(entry.slug) || {};
      const featured = "featured" in edit ? edit.featured : entry.featured;
      const thumb = edit.thumbnailPreview || entry.thumbnail;
      const sizeLabel = entry.sizeMb ? `${entry.sizeMb.toFixed(1)} MB` : "";
      const filename = entry.url.split("/").pop();
      const isEdited = edits.has(entry.slug);

      // Header content
      let headerContent;
      if (thumb) {
        const isVideo = edit.thumbnailIsVideo || /\.(mov|mp4|webm|mp4)$/i.test(thumb);
        if (isVideo) {
          const video = htl.html`<video src="${thumb}" loop muted playsinline preload="auto"></video>`;
          // Play on hover, pause when not
          const tryPlay = () => { video.play().catch(() => {}); };
          video.addEventListener("canplay", tryPlay, { once: true });
          video.addEventListener("mouseenter", tryPlay);
          // Fallback: if video can't play (e.g. .mov in Chrome), show first frame
          video.addEventListener("error", () => {
            video.style.display = "none";
            const fallback = htl.html`<span class="card-initial" style="position:absolute">${entry.title.charAt(0)}</span>`;
            video.parentElement.appendChild(fallback);
          });
          headerContent = video;
        } else {
          headerContent = htl.html`<img src="${thumb}" alt="${entry.title}">`;
        }
      } else {
        headerContent = htl.html`<span class="card-initial">${entry.title.charAt(0)}</span>`;
      }

      // Star button (curator only)
      const starBtn = isCurator ? htl.html`<button class="card-star" title="${featured ? "Unstar" : "Star"}" onclick=${(e) => {
        e.stopPropagation();
        const current = new Map($edits.value);
        const existing = current.get(entry.slug) || {};
        current.set(entry.slug, { ...existing, featured: !featured });
        $edits.value = current;
      }}>${featured ? "\u2605" : "\u2606"}</button>` : "";

      // Handle image from File (shared by upload + paste)
      function handleImageFile(file) {
        const ext = file.name ? file.name.split(".").pop() : (file.type.split("/")[1] || "png");
        const slugFile = entry.slug.replace("/", "_") + "." + ext;
        const isVideoFile = /^(mov|mp4|webm|quicktime)$/i.test(ext);
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = reader.result.split(",")[1];
          const previewUrl = URL.createObjectURL(file);
          const current = new Map($edits.value);
          const existing = current.get(entry.slug) || {};
          current.set(entry.slug, {
            ...existing,
            thumbnailData: base64,
            thumbnailFilename: slugFile,
            thumbnailPreview: previewUrl,
            thumbnailIsVideo: isVideoFile,
            thumbnailUrl: "https://tomlarkworthy.github.io/lopebooks/assets/" + slugFile
          });
          $edits.value = current;
        };
        reader.readAsDataURL(file);
      }

      // Upload button (curator only)
      const uploadBtn = isCurator ? htl.html`<button class="card-upload-btn" onclick=${(e) => {
        e.stopPropagation();
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/*,video/quicktime,video/mp4,video/webm";
        input.onchange = () => {
          const file = input.files[0];
          if (file) handleImageFile(file);
        };
        input.click();
      }}>Upload</button>` : "";

      // Description (editable in curator mode)
      const descText = entry.description === "todo" ? "" : entry.description;
      const descEl = isCurator
        ? htl.html`<p class="card-description" contenteditable="true" onblur=${(e) => {
            const val = e.target.textContent.trim();
            if (val !== descText) {
              const current = new Map($edits.value);
              const existing = current.get(entry.slug) || {};
              current.set(entry.slug, { ...existing, description: val || "todo" });
              $edits.value = current;
            }
          }}>${descText}</p>`
        : htl.html`<p class="card-description">${descText}</p>`;

      const dlLink = entry.url.endsWith(".html")
        ? htl.html`<a href="#" class="card-action" onclick=${(e) => { e.preventDefault(); download(entry.url, filename); }}>Download</a>`
        : "";

      const cardEl = htl.html`<div class="gallery-card ${isEdited ? "card-edited" : ""}" tabindex="-1">
        <div class="card-header">
          ${starBtn}
          ${headerContent}
          ${uploadBtn}
        </div>
        <div class="card-body">
          <h3 class="card-title">${entry.title}</h3>
          ${descEl}
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
            ${dlLink}
            ${entry.sourceUrl ? htl.html`<a href="${entry.sourceUrl}" target="_blank" rel="noopener" class="card-action card-action-source">Source</a>` : ""}
          </div>
        </div>
      </div>`;

      if (isCurator) {
        cardEl.addEventListener("paste", (e) => {
          const items = e.clipboardData?.items;
          if (!items) return;
          for (const item of items) {
            if (item.type.startsWith("image/")) {
              e.preventDefault();
              handleImageFile(item.getAsFile());
              return;
            }
          }
        });
      }

      return cardEl;
    };
  })()
)};

// === GitHub Git Data API push ===
const _pushToGitHub = function _pushToGitHub(){return(
  async (token, owner, repo, branch, files, message) => {
    const api = async (path, opts = {}) => {
      const r = await fetch(`https://api.github.com/repos/${owner}/${repo}/${path}`, {
        ...opts,
        headers: {
          Authorization: `token ${token}`,
          "Content-Type": "application/json",
          Accept: "application/vnd.github.v3+json",
          ...opts.headers
        }
      });
      if (!r.ok) throw new Error(`GitHub API ${r.status}: ${await r.text()}`);
      return r.json();
    };

    // 1. Get current HEAD
    const ref = await api(`git/refs/heads/${branch}`);
    const parentSha = ref.object.sha;

    // 2. Get current tree
    const commit = await api(`git/commits/${parentSha}`);
    const baseTreeSha = commit.tree.sha;

    // 3. Create blobs
    const treeEntries = [];
    for (const file of files) {
      const blob = await api("git/blobs", {
        method: "POST",
        body: JSON.stringify({ content: file.content, encoding: file.encoding })
      });
      treeEntries.push({ path: file.path, mode: "100644", type: "blob", sha: blob.sha });
    }

    // 4. Create tree
    const tree = await api("git/trees", {
      method: "POST",
      body: JSON.stringify({ base_tree: baseTreeSha, tree: treeEntries })
    });

    // 5. Create commit
    const newCommit = await api("git/commits", {
      method: "POST",
      body: JSON.stringify({ message, tree: tree.sha, parents: [parentSha] })
    });

    // 6. Update ref
    await api(`git/refs/heads/${branch}`, {
      method: "PATCH",
      body: JSON.stringify({ sha: newCommit.sha })
    });

    return newCommit;
  }
)};

// === Footer ===
const _footer = function _footer(md){return(
  md`---
*[Lopecode](https://observablehq.com/@tomlarkworthy/lopecode-vision) — portable, reactive, self-serializing notebooks.*`
)};

// === Gallery CSS ===
const _gallery_css = function _gallery_css(htl){return(
  htl.html`<style>
/* === Gallery structural CSS === */
.gallery-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
  padding: 0.5rem 0;
}
.gallery-card {
  border: 1px solid var(--theme-foreground-fainter);
  border-radius: 8px;
  overflow: hidden;
  background: var(--theme-background);
  transition: box-shadow 0.2s, transform 0.2s;
  display: flex;
  flex-direction: column;
  position: relative;
}
.gallery-card:hover {
  box-shadow: 0 4px 12px color-mix(in srgb, var(--theme-foreground) 15%, transparent);
  transform: translateY(-2px);
}
.gallery-card.card-edited {
  border-color: var(--theme-foreground-focus);
  border-width: 2px;
}
.gallery-card:focus {
  outline: 2px solid var(--theme-foreground-focus);
  outline-offset: 2px;
}
.card-header {
  min-height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--theme-foreground-focus), var(--theme-foreground-muted));
  position: relative;
  overflow: hidden;
}
.card-header img, .card-header video {
  display: block;
  width: 100%;
  height: auto;
}
.card-initial {
  font-size: 2rem;
  font-weight: bold;
  color: var(--theme-background);
  opacity: 0.85;
}
.card-star {
  position: absolute;
  top: 6px;
  right: 6px;
  background: none;
  border: none;
  font-size: 1.4rem;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
  line-height: 1;
  opacity: 0.9;
  z-index: 1;
}
.card-star:hover { opacity: 1; }
.card-upload-btn {
  position: absolute;
  bottom: 6px;
  right: 6px;
  background: color-mix(in srgb, var(--theme-background) 80%, transparent);
  border: 1px solid var(--theme-foreground-fainter);
  border-radius: 4px;
  font-size: 0.75rem;
  cursor: pointer;
  padding: 2px 8px;
  color: var(--theme-foreground);
  z-index: 1;
}
.card-upload-btn:hover { background: var(--theme-background); }
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
.card-description[contenteditable] {
  border: 1px dashed var(--theme-foreground-fainter);
  border-radius: 4px;
  padding: 2px 4px;
  display: block;
  -webkit-line-clamp: unset;
  min-height: 2.4em;
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
  color: var(--theme-foreground-alt);
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

/* Curator panel */
.curator-panel {
  background: var(--theme-background-alt);
  border: 1px solid var(--theme-foreground-fainter);
  border-radius: 8px;
  padding: 1rem;
  margin: 0.5rem 0;
}
.curator-panel summary {
  cursor: pointer;
  font-weight: 600;
  color: var(--theme-foreground-alt);
}
.curator-fields {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.4rem 0.75rem;
  align-items: center;
  margin-top: 0.75rem;
  font-size: 0.9rem;
}
.curator-fields label {
  color: var(--theme-foreground-muted);
  text-align: right;
}
.curator-fields input[type="text"], .curator-fields input[type="password"] {
  padding: 4px 8px;
  border: 1px solid var(--theme-foreground-fainter);
  border-radius: 4px;
  background: var(--theme-background);
  color: var(--theme-foreground);
  font: inherit;
  font-size: 0.85rem;
}
.push-bar {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--theme-foreground-faintest);
}
.push-bar input[type="text"] {
  flex: 1;
  padding: 6px 10px;
  border: 1px solid var(--theme-foreground-fainter);
  border-radius: 4px;
  background: var(--theme-background);
  color: var(--theme-foreground);
  font: inherit;
  font-size: 0.85rem;
}
.push-bar button {
  padding: 6px 16px;
  border: none;
  border-radius: 4px;
  background: var(--theme-foreground-focus);
  color: var(--theme-background);
  font: inherit;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
}
.push-bar button:hover { opacity: 0.9; }
.push-bar button:disabled { opacity: 0.5; cursor: default; }
.push-status {
  font-size: 0.85rem;
  color: var(--theme-foreground-muted);
  margin-top: 0.5rem;
}
.push-status.error { color: var(--theme-error); }

/* Hide Observable inspector chrome */
.observablehq--inspect { display: none; }
</style>`
)};

// === Module definition ===
export default function define(runtime, observer) {
  const main = runtime.module();

  // Observed cell (visible in UI)
  const $show = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };
  // Hidden cell (internal, no observer)
  const $hide = (name, deps, fn) => {
    main.variable().define(name, deps, fn);
  };

  // --- Visible cells (UI order) ---
  $show("_gallery_css", "gallery_css", ["htl"], _gallery_css);
  $show("_title", null, ["md","content"], _title);
  $show("_curator", "curator", ["htl","Inputs","edits","content","mutable edits","mutable content","initial_config","persist","pushToGitHub"], _curator);

  $show("_show_all", "viewof show_all", ["Inputs"], _show_all);
  main.variable().define("show_all", ["Generators", "viewof show_all"], (G, _) => G.input(_));

  $show("_search", "viewof search", ["Inputs","content","show_all"], _search);
  main.variable().define("search", ["Generators", "viewof search"], (G, _) => G.input(_));

  $show("_selected_category", "viewof selected_category", ["Inputs","content"], _selected_category);
  main.variable().define("selected_category", ["Generators", "viewof selected_category"], (G, _) => G.input(_));

  $show("_sort_by", "viewof sort_by", ["Inputs"], _sort_by);
  main.variable().define("sort_by", ["Generators", "viewof sort_by"], (G, _) => G.input(_));

  $show("_gallery_grid", "gallery_grid", ["htl","filtered_entries","card"], _gallery_grid);
  $show("_footer", null, ["md"], _footer);

  // --- Internal cells (hidden, after visible) ---
  $hide("initial_config", [], _initial_config);
  $hide("fetched_content", ["initial_config"], _fetched_content);
  main.define("initial content", ["fetched_content"], (fc) => JSON.parse(JSON.stringify(fc)));
  main.variable().define("mutable content", ["Mutable", "initial content"], (M, _) => new M(_));
  main.variable().define("content", ["mutable content"], _ => _.generator);
  main.define("initial edits", () => new Map());
  main.variable().define("mutable edits", ["Mutable", "initial edits"], (M, _) => new M(_));
  main.variable().define("edits", ["mutable edits"], _ => _.generator);
  $hide("persist", [], _persist);
  $hide("pushToGitHub", [], _pushToGitHub);
  $hide("download", [], _download);
  $hide("filtered_entries", ["search","selected_category","sort_by","edits"], _filtered_entries);
  $hide("card", ["htl","download","mutable edits","edits","is_curator"], _card);
  $hide("is_curator", ["Generators"], _is_curator);

  return main;
}
