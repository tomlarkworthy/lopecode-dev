// the patch the notebook will apply to webstrates.js (kept identical to the cell)
export function patchWebstratesClient(src) {
  const rep = (a, b) => {
    if (!src.includes(a)) throw new Error("webstrates.js has changed; cannot find " + a);
    src = src.split(a).join(b);
  };
  rep("window.location.pathname", "window.__webstrateLocation.pathname");
  rep("window.location.search", "window.__webstrateLocation.search");
  rep("location.protocol === 'http:'", "window.__webstrateLocation.protocol === 'http:'");
  rep(".concat(location.host,", ".concat(window.__webstrateLocation.host,");
  rep(".concat(location.search))", ".concat(window.__webstrateLocation.search))");
  rep("return DOMNode.matches('transient');", "return DOMNode.matches('transient, [transient], [transient-element]');");
  rep("return attributeName.startsWith('transient-');", "return attributeName === 'transient' || attributeName.startsWith('transient-');");
  return src;
}
