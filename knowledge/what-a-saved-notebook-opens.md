---
scope: [local-development, in-notebook]
write-triggers:
  - "[mM]ains\\.(set|delete)\\("
  - "headless\\s*:\\s*(false|true)"
---

# What a saved notebook opens with (mains and the layout)

A saved file opens two things from its `bootconf.json` block (read it at `/content/bootconf.json`):

- `mains` — the modules the bootloader boots. A module block the file carries but that is not in
  `mains` and that no booted module imports never runs.
- `hash` — the lopepage layout, `#view=R100(S70(@a/doc),S30(@a/other))`. Only modules named in it
  get a pane. In a stack `S(a,b)` the reopened page shows the FIRST tab; which tab was active is not
  saved.

Saving (the save button, `@tomlarkworthy/save-in-place`) writes `runtime.mains` of the live page as
`mains` and the live `location.hash` (minus `open=`, `cc=` and other one-shot params) as `hash`. The
exporter serializes only modules the runtime has booted, so an unbooted block is dropped by the next
save.

When the user's work "is not there" after reopening, the save code is not the fault. The work is
either not booted or not in the layout. Fix the page, then the next save carries it:

1. Not booted (the environment lists it as saved but NOT booted; its text is at `/content/<id>`):
   `read_file /content/<id>` and `write_file /src/<id>.js` with that text unchanged. The write boots
   it and adds it to `runtime.mains`; a module with `md`, `html` or `viewof` cells is opened as a tab.
2. Not visible: give it its own stack in the layout, keeping the other panes, with `eval_js`:
   ```js
   location.hash = "#view=R100(S50(@user/mine),S35(@tomlarkworthy/robocoop-5),S15(@tomlarkworthy/robocoop-5-srctools))";
   ```
   lopepage-2 applies a `view=` hash on `hashchange` and keeps it in the URL; the next save stores it.
3. Check what a save would write, without saving:
   ```js
   const r = await exportToHTML({ mains: new Map(runtime.mains), runtime, options: { hash: location.hash } });
   const conf = JSON.parse(new DOMParser().parseFromString(r.source ?? r, "text/html").getElementById("bootconf.json").textContent);
   return conf;   // mains must list the module; hash must name it outside another module's stack
   ```
   (`eval_js` in module `@tomlarkworthy/save-in-place`, which has both names.) Then tell the user to save.

Do not edit `@tomlarkworthy/exporter-3` or `save-in-place` for this, and do not change `headless`:
`"headless": true` is what a lopepage notebook needs; with `false` every cell also renders
underneath the layout.
