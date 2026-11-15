// verify.ts --focus-trace injects this: every focus change, key, click and DOM move of the focused node, with stacks, to the console
(() => {
  const w = window;
  w.__ft = [];
  const t = () => Math.round(performance.now());
  const d = (e) => {
    if (!e || !e.tagName) return String(e);
    const cell = e.closest?.("[data-verify]")?.getAttribute("data-verify") ?? "";
    const box = e.closest?.(".lite-box") ? " in .lite-box" : "";
    const ed = e.closest?.(".cm-editor") ? " in .cm-editor" : "";
    return `${e.tagName}#${e.id}.${String(e.className).slice(0, 40)}${box}${ed}${cell ? " [" + cell + "]" : ""}${e.isConnected ? "" : "(detached)"}`;
  };
  const stack = () => (new Error().stack ?? "").split("\n").slice(2, 12).map((s) => s.trim().replace(/file:\/\/\/[^ )]*soundscript\.html/, "nb")).join(" | ");
  const dbg = console.debug.bind(console);
  const log = (s) => { w.__ft.push(`${t()} ${s}`); if (w.__ft.length > 400) w.__ft.splice(0, 100); dbg(`FT ${t()} ${s}`); };
  const focus = HTMLElement.prototype.focus, blur = HTMLElement.prototype.blur;
  HTMLElement.prototype.focus = function (...a) { log(`focus() ${d(this)} :: ${stack()}`); return focus.apply(this, a); };
  HTMLElement.prototype.blur = function (...a) { log(`blur() ${d(this)} :: ${stack()}`); return blur.apply(this, a); };
  document.addEventListener("focusin", (e) => log(`in ${d(e.target)}`), true);
  document.addEventListener("focusout", (e) => log(`out ${d(e.target)} -> ${d(e.relatedTarget)} :: ${stack()}`), true);
  for (const ev of ["keydown", "click", "submit", "input"]) document.addEventListener(ev, (e) => log(`${ev} ${e.key ?? ""} ${d(e.target)} ${e.target?.href ?? ""}`), true);
  w.addEventListener("beforeunload", () => log(`beforeunload active=${d(document.activeElement)}`));
  w.addEventListener("pagehide", () => log(`pagehide`));
  for (const ev of ["pointerdown", "mousedown"]) document.addEventListener(ev, (e) => log(`${ev} ${d(e.target)} at ${e.clientX},${e.clientY} prevented=${e.defaultPrevented}`), true);
  // moves of a subtree that holds the focused element
  const holds = (n) => { const a = document.activeElement; return a && a !== document.body && n && n.nodeType === 1 && n.contains(a); };
  const wrap = (proto, name, pick) => {
    const f = proto[name];
    proto[name] = function (...a) {
      for (const n of pick(this, a)) if (holds(n)) log(`${name} moves focused ${d(document.activeElement)} via ${d(n)} :: ${stack()}`);
      return f.apply(this, a);
    };
  };
  wrap(Node.prototype, "removeChild", (s, a) => [a[0]]);
  wrap(Node.prototype, "replaceChild", (s, a) => [a[1]]);
  wrap(Node.prototype, "insertBefore", (s, a) => [a[0]]);
  wrap(Node.prototype, "appendChild", (s, a) => [a[0]]);
  wrap(Element.prototype, "remove", (s) => [s]);
  wrap(Element.prototype, "replaceWith", (s) => [s]);
  for (const name of ["after", "before", "append", "prepend", "replaceChildren"]) wrap(Element.prototype, name, (s, a) => name === "replaceChildren" ? [...s.children] : a);
})();
