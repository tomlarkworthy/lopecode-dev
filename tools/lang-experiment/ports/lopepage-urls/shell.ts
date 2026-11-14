// Port of @tomlarkworthy/lopepage-urls: prose and shell cells. See MAP.md.

export let _1 = (md) => md`# lopepage urls`;

export let _2 = (md) => md`## Tests`;

// tests() walks the runtime reflectively (import from @tomlarkworthy/tests).
export let _3 = (tests) => tests();

export let _12 = (md) => md`## Serialization`;

export let _16 = (md) => md`## Flat listModules`;

export let _20 = (md) => md`## Get cell`;

export let _22 = (md) => md`## navHref`;

export let _23 = (navHref, htl) => htl.html`<a href="${navHref("foo$ref")}">nav</a>`;

export let _26 = (md) => md`## navigate

Follow a link built by \`linkTo\`/\`navHref\`. Assigning to \`location.hash\` looks equivalent and is,
until the page is a fork: a notebook opened from exporter-3's **Fork** lives on \`blob:null\`, an
opaque origin where fragment navigation is silently dropped, so the intent is lost and nothing
happens. The History API works there, but fires no \`hashchange\` of its own, so this announces the
change itself. Write hash intents through here rather than through \`location\`.`;

export let navigate = () =>
  function navigate(href: unknown) {
    const target = String(href ?? "");
    // Not a fragment (an Observable path, an absolute URL): a real navigation, which works anywhere.
    if (!target.startsWith("#")) {
      window.location.href = target || "#";
      return false;
    }
    try {
      window.history.pushState(null, "", target);
    } catch (e) {
      // Opaque origin (the srcdoc fork an IIFE injection creates): a URL argument resolves against
      // the HOST page's URL, which is cross-origin to this null-origin document, so pushState
      // rejects it. Assigning the hash is permitted, and fires hashchange by itself when it changes.
      const before = window.location.hash;
      window.location.hash = target;
      if (window.location.hash !== before) return true;
    }
    window.dispatchEvent(new window.HashChangeEvent("hashchange"));
    return true;
  };

export let _25 = (md) => md`## Add linkTo`;

export let isOnObservableCom = (location) => () =>
  location.href.includes("observableusercontent.com") && !location.href.includes("blob:");

type NavTarget = Parameters<import("./cells").__V_linkToWith>[0];

// The original linkTo, with its two defaults read from the world at call time. The body is the
// checked cell linkToWith.
export let linkTo = (isOnObservableCom, linkToWith) =>
  function linkTo(
    target: NavTarget,
    {
      baseURI = document.baseURI,
      onObservable = isOnObservableCom(),
      source = null,
      op = "open", // "open" | "close" | "focus"
    }: { baseURI?: string; onObservable?: boolean; source?: string | null; op?: string } = {},
  ) {
    return linkToWith(target, { baseURI, onObservable, source, op });
  };

// viewof vars: a view over the live runtime._variables set (runtime-sdk), and its value.
export let vars_view = (variables, runtime) => variables(runtime);

export let vars = (Generators, vars_view) => Generators.input(vars_view);

export let _32 = (md) => md`## Auto switch to url structure

Watch the runtime for imports and swap them for our structure`;

export let updateNotebookImports = (vars, extractNotebookAndCell, linkTo) => {
  for (const variable of vars as Iterable<any>) {
    let import_dom;
    if (
      (import_dom = variable?._observer?._node?.firstChild) &&
      import_dom?.classList?.contains("observablehq--import")
    ) {
      import_dom.querySelectorAll("[href]").forEach((link: HTMLAnchorElement) => {
        const extracted = extractNotebookAndCell(link.href);
        if (extracted) {
          link.href = linkTo(extracted.notebook);
        }
      });
    }
  }
};
