// `location` is also a lib.dom global; the foreign.d.ts signature must win.
export let href = (location) => location.myHref;
export let test_href = (href) => {
  if (href !== "https://example.com/x") throw new Error(href);
  return "ok";
};
