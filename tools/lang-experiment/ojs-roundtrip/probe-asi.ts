// Does a multi-line JSX element directly after `return` survive lowering (ASI after a block comment holding a newline)?
const T = await import("../lite/toolchain/ss-toolchain.ts");
const ss = await import("../lite/stdlib/runtime.ts");
const src = "const v = () => {\n  return <div>\n    <b>x</b>\n  </div>;\n};";
const [d] = T.compileCell(src, true);
console.log(d.definition);
console.log("value:", JSON.stringify((0, eval)(`(${d.definition})`)(ss)));
