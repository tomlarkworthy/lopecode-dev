// A nested function may use a Mut only if it is a local helper that is only ever called directly,
// and a call of such a helper is a use of the Mut at the call site.
let bad_returned_closure = () => { const out = mut([0]); const f = () => { out[0] = 1; }; return f; };
let bad_callback = () => { const out = mut([0]); [1, 2].forEach((x) => { out[0] += x; }); return freeze(out); };
let bad_stored = () => { const out = mut([0]); const f = () => out[0]; return [f, freeze(out)]; };
let bad_via_helper = () => {
  const out = mut([0]);
  const write = () => { out[0] = 1; };
  const later = () => write();
  return [later, freeze(out)];
};
let bad_helper_after_freeze = () => {
  const out = mut([0]);
  const write = () => { out[0] = 1; };
  const r = freeze(out);
  write();
  return r;
};
let bad_helper_freezes = () => {
  const out = mut([0]);
  const done = () => freeze(out);
  return done();
};
let ok_helper = () => {
  const out = mut([0, 0]);
  const put = (i: number, v: number) => { out[i] = v; };
  function both(v: number) { put(0, v); put(1, v); }
  both(3);
  put(0, 1);
  return freeze(out);
};
