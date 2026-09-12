async (rt) => {
  const names = ["nkTestBump", "nkTestMutable", "nkTestMutableRead", "nkTestView", "nkTestViewRead", "nkTestFile"];
  const home = [...rt._variables].find((v) => v._name === "nkTestView")?._module;
  if (!home) return { error: "nkTestView not in runtime" };
  const out = {};
  for (const n of names) {
    try {
      out[n] = await Promise.race([home.value(n), new Promise((_, r) => setTimeout(() => r(new Error("timeout")), 5000))]);
    } catch (e) { out[n] = `ERR ${e?.message ?? e}`; }
  }
  out.shapes = [...rt._variables].filter((v) => v._module === home && /nkTest|cell \d+$/.test(String(v._name)) && !/^cell \d+$/.test(String(v._name)) || (v._module === home && /^cell \d+$/.test(String(v._name)) && v._inputs.some((i) => /nkTest/.test(i._name))))
    .map((v) => `${v._name} <- [${v._inputs.map((i) => i._name).join(",")}]`);
  return out;
}
