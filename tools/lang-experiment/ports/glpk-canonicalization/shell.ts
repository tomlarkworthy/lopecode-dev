// Port of @tomlarkworthy/glpk-canonicalization: prose and shell cells. See MAP.md.

export let _1 = (md, tex) =>
  md`# Canonicalization with Math.js

I want to get expressions like ${tex`(x_2 - x_1) * 4 \gt x_1 + 1`}, into _a) into a specialized canonical form for linear programming:-

${tex`-5 x_1 + 4 x_2 \geq 1`}

in general

${tex`c_1x_1 + ... + c_nx_n \geq c_0`}

Math.js has the power, but does not ship with enough rewrite rules by default. So this notebook is about adding the require rules to create a canonicalization routine.

There is a fuzzer to help stress test these routines https://observablehq.com/@tomlarkworthy/expression-fuzzer

Updated 2026-09-08 for math.js 15. The library is vendored as [@tomlarkworthy/mathjs](https://observablehq.com/@tomlarkworthy/mathjs) rather than pulled in with \`require\`, which the 2026 Observable standard library no longer provides.

Improvements from [@jwoLondon's fork](https://observablehq.com/@jwolondon/canonicalization-with-math-js) are folded in: \`step2\` iterates to a fixpoint instead of a fixed number of passes, the operator swap clones rather than mutating the caller's AST, \`isCanonical\` decides by trial extraction, and \`extractLHS\` descends through parentheses.
`;

export let _3 = (md) =>
  md`### Simplify Rule Syntax: Custom simplification rules
- ‘n’ - matches any Node
- ‘c’ - matches any ConstantNode
- ‘v’ - matches any Node that is not a ConstantNode
`;

export let _5 = (md) =>
  md`## Preparation: identify operator and replace with <`;

export let _7 = (md) =>
  md`### Ordering`;

export let _11 = (md) =>
  md`### Expand brackets`;

export let _33 = (md) =>
  md`### Multiple out constants`;

export let _36 = (md) =>
  md`### ⚠️ Constants to RHS
`;

export let _55 = (md) =>
  md`### Variables to LHS`;

export let _68 = (md) =>
  md`### Add zero to RHS

Its quite dangerous introducing terms as it often causes loop, so we do this once other optimizations are exhausted.
`;

export let _81 = (md) =>
  md`### Simplify Base Rules

The default simplify sometimes works against us by introducing brackets. So we trim the rules down a bit, however it is not enough
`;

export let _89 = (md) =>
  md`### Simplify Step

Note that < causes problems with zeros, so we have to simplify on each AST branch seperately
`;

export let _97 = (md) =>
  md`### Step 2

Aim of step 2 is to pull constants to RHS, simplify them, and push complex expression to LHS, and repeat.
`;

export let _119 = (md) =>
  md`### Canonicalize`;

export let _133 = (md) =>
  md`### isCanonical (special case short circuit)`;

export let _139 = (md) =>
  md`### Extract

This applies our custom canonicalization and converts to a JSON:

~~~js
vars: [
          { name: 'x1', coef: 3.0 },
          { name: 'x2', coef: 1.0 }
        ],
        ub: 2.0
        lb: 0.0
~~~
`;

// viewof DEBUG: the toggle widget; its value is the ref cell DEBUG in cells.ts.
export let DEBUG_view = (DEBUG: State<boolean>, Inputs) => {
  const input = Inputs.toggle({ label: "log each simplification pass", value: false });
  input.addEventListener("input", action(() => DEBUG.set(input.value)));
  return input;
};
