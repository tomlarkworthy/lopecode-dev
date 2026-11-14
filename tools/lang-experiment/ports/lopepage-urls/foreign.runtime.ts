// tests, runtime and variables are not supplied, as in the baseline (baseline/lopepage-urls.forward.json "blocked").
export default {
  // The baseline supplied happy-dom's window.location for this URL; isOnObservableCom reads only href.
  location: { href: "file:///lopecode/notebooks/lopepage-urls.html" },
  parseUrl: (href: string) => {
    const u = new URL(href);
    return { hash: u.hash, href: u.toString() };
  },
};
