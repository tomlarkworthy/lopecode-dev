async (rt) => {
  const home = [...rt._variables].find((v) => v._name === "nkTestView")?._module;
  const get = (n) => Promise.race([home.value(n), new Promise((_, r) => setTimeout(() => r(new Error("timeout")), 8000))]);
  const r = {};
  const main = await get("main").catch((e) => (r.mainErr = String(e), null));
  r.mainIsHome = main === home;
  r.mainBuiltins = main ? [...main._builtins.keys()] : null;
  const gfa = await get("getFileAttachments");
  for (const [k, m] of [["gfaMain", main], ["gfaHome", home]]) {
    try { const x = gfa(m); r[k] = x ? [...x.entries()].map(([n, v]) => [n, v?.url ?? String(v).slice(0, 60)]) : String(x); }
    catch (e) { r[k] = `ERR ${e}`; }
  }
  r.builtinFAVar = !!rt._builtin._scope.get("FileAttachment");
  try { const FA = await rt._builtin.value("FileAttachment"); r.FA = `${typeof FA} ${FA?.name}`; } catch (e) { r.FA = `ERR ${e}`; }
  try { const x = await (await get("nkRegisteredFiles"))(rt); r.nrf = x ? [...x.entries()] : String(x); } catch (e) { r.nrf = `ERR ${e}`; }
  return r;
}
