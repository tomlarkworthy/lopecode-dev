// Port of @tomlarkworthy/glpk-canonicalization: the checked cells. See MAP.md for the mapping.
// Section order follows the original; tests are at the end, generated from the original bodies.

type Term = { readonly coef: ConstValue; readonly name: string };
type Bounds = { readonly upper?: ConstValue; readonly lower?: ConstValue };
type Extracted = {
  readonly vars: readonly { readonly coef: number; readonly name: string }[];
  readonly bounds: { readonly [k: string]: ConstValue };
};
type Expected = {
  readonly vars: readonly { readonly coef: number; readonly name: string }[];
  readonly bounds?: { readonly [k: string]: number };
};

// viewof DEBUG: the value; the toggle is the shell cell DEBUG_view.
let DEBUG = (): StateCell<boolean> => state(false);

// ---- Preparation: identify operator and replace with < ----------------------------------

// The original clones and assigns op/fn on the clone. The port builds the node instead, with
// the same (shallow-copied) args and flags clone() carries. A non-operator node is returned as
// is: the original's clone of it carries op/fn as stray properties that nothing reads back.
let withOperator = (OperatorNode) => (ast: MathNode, { op, fn }: { readonly op: string; readonly fn: string }): MathNode =>
  ast.isOperatorNode ? OperatorNode(op, fn, [...ast.args], ast.implicit, ast.isPercentage) : ast;

// ---- Ordering ----------------------------------------------------------------------------

// Annotated: the inferred element union gives each context `multiply?: undefined`, not a RuleContext.
let ordering = (): readonly RuleObject[] => [
  { l: 'c+v', r: 'v+c', context: { add: { commutative: false } } },
  { l: 'v*c', r: 'c*v', context: { multiply: { commutative: false } } }
];

// ---- Expand brackets ---------------------------------------------------------------------

let expandBrackets = () => [
  { l: "0 * n", r: "0" },
  { l: "-(-n)", r: "n" },
  { l: "-(c*n)", r: "-c * n" },
  { l: "-(n1 + n2)", r: "-n1 - n2" },
  { l: "-(n1 - n2)", r: "-n1 + n2" },
  { l: "n - (n1 + n2)", r: "n - n1 - n2" },
  { l: "n - (n1 - n2)", r: "n - n1 + n2" },
  { l: "c * (n1 + n2)", r: "c * n1 + c * n2" },
  { l: "c * (n1 - n2)", r: "c * n1 - c * n2" },
  { l: "-c * (n1 + n2)", r: "-c * n1 - c * n2" },
  { l: "-c * (-n1 - n2)", r: "c * n1 + c * n2" },
  { l: "-c * (n1 - n2)", r: "-c * n1 + c * n2" }
];

// ---- Multiply out constants --------------------------------------------------------------

let multiplyOut = (math) =>
  [
    // mathjs >= 10 moved simplifyCore to the top level and added simplifyConstant (which folds 2*2)
    math.simplifyCore ?? math.simplify.simplifyCore,
    math.simplifyConstant
  ].filter(Boolean);

// ---- Constants to RHS --------------------------------------------------------------------

let constantsToRHS = (constantsToRHSFn) => [constantsToRHSFn];

let constantsToRHSFn = (OperatorNode, ConstantNode) => {
  // `-v` on a ConstantNode value: Number() is what unary minus applies to a non-bigint primitive.
  const neg = (v: ConstValue): number => -Number(v);
  // The constant a constant or negated-constant node prunes to, or null if it is neither.
  // (Original: isConstantNode(n) || isNegativeConstantNode(n), then pruneNode(n).)
  const prunable = (node: MathNode): MConstantNode | null => {
    if (node.isConstantNode) return node;
    if (node.isOperatorNode && node.fn == "unaryMinus") {
      const a = node.args[0];
      if (a.isConstantNode) return ConstantNode(neg(a.value));
    }
    return null;
  };

  // `pruned` was an out-parameter array; here it is a Mut passed down the recursion.
  const prunedLHS = (node: MathNode, pruned: Mut<MConstantNode[]>): MathNode => {
    const self = prunable(node);
    if (self !== null) {
      // the original reads node.value, which is undefined on a negated constant
      if (!node.isConstantNode || node.value !== 0) {
        pruned.push(self);
      }
      return ConstantNode(0);
    } else if (node.isParenthesisNode) {
      return node;
    } else if (node.isOperatorNode && node.isBinary()) {
      const [a0, a1] = node.args;
      if (node.fn == "add") {
        const p0 = prunable(a0);
        if (p0 !== null) {
          pruned.push(p0);
          return prunedLHS(a1, pruned);
        }
        const p1 = prunable(a1);
        if (p1 !== null) {
          pruned.push(p1);
          return prunedLHS(a0, pruned);
        }
        return OperatorNode(node.op, node.fn, [prunedLHS(a0, pruned), prunedLHS(a1, pruned)]);
      } else if (node.fn == "subtract") {
        const p0 = prunable(a0);
        if (p0 !== null) {
          pruned.push(p0);
          return OperatorNode("-", "unaryMinus", [prunedLHS(a1, pruned)]);
        }
        const p1 = prunable(a1);
        if (p1 !== null) {
          pruned.push(ConstantNode(neg(p1.value)));
          return prunedLHS(a0, pruned);
        }
        return OperatorNode(node.op, node.fn, [prunedLHS(a0, pruned), prunedLHS(a1, pruned)]);
      }

      return node;
    } else if (node.isOperatorNode && node.isUnary()) {
      return OperatorNode(node.op, node.fn, [node.args[0]]);
    } else if (node.isSymbolNode) {
      return node;
    }
    throw new Error(`Should not happen: ${node}`);
  };
  // The original reassigned its parameter from inside a forEach callback.
  const appendRHS = (node: MathNode, pruned: readonly MConstantNode[]): MathNode => {
    let out = node;
    for (const term of pruned) {
      if (Number(term.value) > 0) {
        out = OperatorNode("-", "subtract", [out, term]);
      } else {
        out = OperatorNode("+", "add", [out, ConstantNode(neg(term.value))]);
      }
    }
    return out;
  };

  const splitConditional = (node: MathNode): MathNode => {
    if (node.isOperatorNode && node.op === "<") {
      const terms: Mut<MConstantNode[]> = [];
      const a0 = prunedLHS(node.args[0], terms);
      const a1 = appendRHS(node.args[1], terms);
      return OperatorNode(node.op, node.fn, [a0, a1]);
    } else {
      throw new Error(`Only works with < as top node ${node.isOperatorNode || node.isFunctionNode ? node.fn : undefined}`);
    }
  };
  return splitConditional;
};

// ---- Variables to LHS --------------------------------------------------------------------

let complexityToLHS = () => [
  { l: 'n1 < n2 + v', r: '-v + n1 < n2' },
  { l: 'n1 < n2 - v', r: 'v + n1 < n2' },
  { l: '-n1 < v - n2', r: '-v - n1 < -n2' },
  { l: 'n1 < v - n2', r: '-v + n1 < -n2' }
  //{ l: 'v1 < v2', r: 'v1 - v2 < 0' }
];

// ---- Add zero to RHS ---------------------------------------------------------------------

let addZeroToRHS = (math, OperatorNode, ConstantNode) => (input: string | MathNode): MathNode => {
  const exp = typeof input === "string" ? math.parse(input) : input;
  // The original compares node.fn == "unaryMinus" on nodes of any class. A FunctionNode's fn is a
  // node, and == compares its printed form, so `unaryMinus(y)` matches too; kept.
  const looseFn = (n: MathNode): string | undefined =>
    n.isOperatorNode ? n.fn : n.isFunctionNode ? n.fn.toString() : undefined;
  const argsOf = (n: MathNode): readonly MathNode[] => {
    if (n.isOperatorNode || n.isFunctionNode) return n.args;
    throw new TypeError(`${n.type} has no args`);
  };
  const opOf = (n: MathNode): string | undefined => (n.isOperatorNode ? n.op : undefined);

  if (!exp.isOperatorNode || exp.op !== "<") return exp;
  const LHS = exp.args[0];
  const RHS = exp.args[1];
  const negSymbol = looseFn(RHS) == "unaryMinus" && argsOf(RHS)[0].isSymbolNode;
  if (
    RHS.isSymbolNode ||
    negSymbol ||
    (opOf(RHS) == "*" && argsOf(RHS)[0].isConstantNode && argsOf(RHS)[1].isSymbolNode) ||
    (opOf(RHS) == "*" &&
      looseFn(argsOf(RHS)[0]) == "unaryMinus" &&
      argsOf(argsOf(RHS)[0])[0].isConstantNode &&
      argsOf(RHS)[1].isSymbolNode)
  ) {
    const newRHS = ConstantNode(0);
    const newLHS = negSymbol
      ? OperatorNode("+", "add", [LHS, argsOf(RHS)[0]])
      : OperatorNode("-", "minus", [LHS, RHS]);
    const result = OperatorNode("<", "smaller", [newLHS, newRHS]);
    return math.parse(result.toString()); // There is something we don't get about mutating expression trees
  } else {
    return exp;
  }
};

let _70 = (math) => math.parse("1 + 2 ");

// ---- Simplify base rules -----------------------------------------------------------------

let simplify2 = (math) => {
  // Rule shape differs by mathjs version: {l, r} in 9.x, a "lhs -> rhs" string in >= 10.
  const ruleText = (r: Rule): string | null =>
    typeof r === "string" ? r : typeof r === "function" ? null : r.s ?? (r.l === undefined ? null : `${r.l} -> ${r.r}`);
  // Default simplify factors sums back into brackets, which works against canonicalization.
  const FACTORING = ["n1*n3 + n2*n3", "n3*n1 + n3*n2"];
  const rules = math.simplify.rules.filter(
    (r) => !FACTORING.some((f) => ruleText(r)?.startsWith(f))
  );
  if (rules.length === math.simplify.rules.length)
    throw new Error(`simplify.rules (mathjs ${math.version}) has no factoring rule to remove`);
  return rules;
};

// ---- Simplify step -----------------------------------------------------------------------

let simplifyStep = (math, expandBrackets, multiplyOut) => (exp: MathNode): MathNode => {
  // Simplify gets confused by comparitor, better to run it on each child sperately
  const customSimplify = (exp: MathNode) =>
    math.simplify(
      math.simplify(exp, math.simplify.rules, {}, { exactFractions: false }),
      [...expandBrackets, ...multiplyOut],
      {},
      { exactFractions: false }
    );

  if (exp.isOperatorNode && exp.op === "<") {
    return exp.map(customSimplify);
  } else {
    return customSimplify(exp);
  }
};

// ---- Step 2 ------------------------------------------------------------------------------

// console.log became the log capability.
let step2 = (math, expandBrackets, constantsToRHS, simplifyStep, complexityToLHS, addZeroToRHS, DEBUG, log) =>
  (initial: string | MathNode): MathNode => {
    // Terminate on a repeated expression. Comparing the printed form is cheaper than a deep
    // equality over the AST, and is what @jwolondon's fork uses.
    const seen = new Set<string>();
    let exp: string | MathNode = initial;
    while (!seen.has(exp.toString())) {
      seen.add(exp.toString());
      const updateRHS = math.simplify(exp, [
        ...expandBrackets,
        ...constantsToRHS
      ]);
      const rhs = simplifyStep(updateRHS);
      const updateLHS = math.simplify(rhs, [...complexityToLHS]);
      exp = addZeroToRHS(updateLHS);
      if (DEBUG) {
        log("updateRHS", updateRHS.toString());
        log("rhs", rhs.toString());
        log("updateLHS", updateLHS.toString());
        log("addZeroToRHS", exp.toString());
      }
    }

    return math.simplify(exp, [...expandBrackets]);
  };

// ---- Canonicalize ------------------------------------------------------------------------

let canonicalize = (math, withOperator, isCanonical, step2) => (expression: string): MathNode => {
  const ast = math.parse(expression);
  const leq = withOperator(ast, { op: "<", fn: "smaller" });
  const simplified = isCanonical(leq) ? leq : step2(leq);

  if (ast.isOperatorNode) return withOperator(simplified, { op: ast.op, fn: ast.fn });
  // The original copies an undefined op/fn onto the result, which prints as "a undefined b";
  // an OperatorNode cannot be built with an undefined op.
  if (simplified.isOperatorNode)
    throw new TypeError(`canonicalize('${expression}'): not a comparison at the top level`);
  return simplified;
};

// ---- isCanonical (special case short circuit) --------------------------------------------

let isCanonical = (extractRHS, extractLHS) => (exp: MathNode): boolean => {
  if (!exp.isOperatorNode) return false;

  try {
    // canonicalize temporarily represents every comparison using "<", so only the RHS
    // being a numeric constant needs checking here.
    extractRHS("<=", exp.args[1]);
    extractLHS([], exp.args[0]);
    return true;
  } catch (err) {
    return false;
  }
};

// ---- Extract -----------------------------------------------------------------------------

let extract = (canonicalize, extractLHS, extractRHS) => (expression: string): Extracted => {
  const canonical = canonicalize(expression);
  if (!canonical.isOperatorNode)
    throw new Error(`Expected a comparison: ${expression}`);

  const zero = <T,>(v: T) => (Object.is(v, -0) ? 0 : v);
  // simplify may leave a variable in several terms (-2y - 2x - y); the solver wants one
  // coefficient per name, so sum them here rather than relying on a normal form.
  const merged = new Map<string, number>();
  for (const { coef, name } of extractLHS([], canonical.args[0])) {
    // the original adds whatever the ConstantNode held; a non-number would concatenate or coerce
    if (typeof coef !== "number") throw new TypeError(`Coefficient of ${name} is not a number: ${coef}`);
    merged.set(name, (merged.get(name) ?? 0) + coef);
  }

  const bounds = extractRHS(canonical.op, canonical.args[1]);
  return {
    vars: [...merged]
      .filter(([, coef]) => coef !== 0)
      .map(([name, coef]) => ({ coef: zero(coef), name })),
    bounds: Object.fromEntries(
      Object.entries(bounds).map(([k, v]) => [k, zero(v)])
    )
  };
};

let extractRHS = () => (op: string, rhs: MathNode): Bounds => {
  let value: ConstValue = undefined;
  if (rhs.isConstantNode) {
    value = rhs.value;
  } else if (rhs.isOperatorNode && rhs.fn === "unaryMinus" && rhs.args[0].isConstantNode) {
    value = -Number(rhs.args[0].value);
  } else {
    throw new Error(`Must be constant: ${rhs.toString()}`);
  }
  if (op === "<=") {
    return {
      upper: value
    };
  } else if (op === ">=") {
    return {
      lower: value
    };
  } else if (op === "==") {
    return {
      lower: value,
      upper: value
    };
  } else {
    throw new Error(`Unsupported op ${op}`);
  }
};

// The original pushes into its `acc` argument and returns it. A Mut cannot be returned, so the
// port copies `acc` into a local Mut and returns the frozen copy; every caller passes a fresh [].
let extractLHS = () =>
  function extractLHS(acc: readonly Term[], rootLhs: MathNode): readonly Term[] {
    const out = [...acc];
    const stack = [rootLhs];

    while (stack.length) {
      const lhs = stack.pop();
      if (lhs === undefined) break;

      if (lhs.isParenthesisNode) {
        // parentheses do not change the expression's meaning
        stack.push(lhs.content);
      } else if (
        lhs.isOperatorNode &&
        lhs.op === "-" &&
        lhs.fn === "unaryMinus" &&
        lhs.args[0].isConstantNode &&
        lhs.args[0].value === 0
      ) {
        // neg
      } else if (lhs.isConstantNode && lhs.value === 0) {
        // nothing to do
      } else if (lhs.isOperatorNode && lhs.op === "+") {
        stack.push(lhs.args[0]);
        stack.push(lhs.args[1]);
      } else if (
        lhs.isOperatorNode &&
        lhs.op === "-" &&
        lhs.fn !== "unaryMinus"
      ) {
        stack.push(lhs.args[0]);
        const rhs = extractLHS([], lhs.args[1]);
        if (rhs.length !== 1)
          throw new Error("Unexpected complexity for negated op");
        out.push({
          coef: -Number(rhs[0].coef),
          name: rhs[0].name
        });
      } else if (lhs.isSymbolNode) {
        out.push({
          coef: 1,
          name: lhs.name
        });
      } else if (
        lhs.isOperatorNode &&
        lhs.op === "-" &&
        lhs.fn === "unaryMinus" &&
        lhs.args[0].isSymbolNode
      ) {
        out.push({
          coef: -1,
          name: lhs.args[0].name
        });
      } else if (lhs.isOperatorNode && lhs.op === "*") {
        const a0 = lhs.args[0];
        const a1 = lhs.args[1];
        if (a1.isSymbolNode) {
          let value: ConstValue = undefined;
          if (a0.isConstantNode) {
            value = a0.value;
          } else if (
            a0.isOperatorNode &&
            a0.fn === "unaryMinus" &&
            a0.args[0].isConstantNode
          ) {
            value = -Number(a0.args[0].value);
          } else {
            throw new Error(`Must be constant: ${a0.toString()}`);
          }
          out.push({
            coef: value,
            name: a1.name
          });
        } else {
          throw new Error(`Cannot term from ${lhs.toString()}`);
        }
      } else {
        throw new Error(`Cannot extract coeffecients from ${lhs.toString()}`);
      }
    }

    return out;
  };

// ---- Test helpers ------------------------------------------------------------------------

let checkExtract = (extract) => (expression: string, expected: Expected) => {
  // term order is not part of the contract — the solver keys on name
  const norm = (r: Extracted | Expected) =>
    JSON.stringify({
      vars: r.vars
        .toSorted((a, b) => a.name.localeCompare(b.name))
        .map(({ coef, name }) => [name, coef]),
      bounds: Object.entries(r.bounds ?? {}).toSorted(([a], [b]) =>
        a.localeCompare(b)
      )
    });
  const actual = extract(expression);
  if (norm(actual) !== norm(expected))
    throw new Error(
      `extract('${expression}') === ${norm(actual)}, expected ${norm(expected)}`
    );
  return actual;
};

let canonicalExample = (canonicalize) => (expression: string, expected: string) => {
  const actual = canonicalize(expression).toString();
  if (actual !== expected)
    throw new Error(`canonicalize('${expression}') === '${actual}', expected '${expected}'`);
  return actual;
};

let step2Example = (step2) => (expression: string, expected: string) => {
  const actual = step2(expression).toString();
  if (actual !== expected)
    throw new Error(`step2('${expression}') === '${actual}', expected '${expected}'`);
  return actual;
};

let simplifyStepExample = (simplifyStep, math) => (expression: string, expected: string) => {
  const actual = simplifyStep(math.parse(expression)).toString();
  if (actual !== expected)
    throw new Error(`simplifyStep('${expression}') === '${actual}', expected '${expected}'`);
  return actual;
};

let check = (math) => (rules: readonly Rule[], expression: string, expected: string) => {
  const actual = math
    .simplify(expression, rules, {}, { exactFractions: false })
    .toString();
  if (actual !== expected)
    throw new Error(`simplify('${expression}') === '${actual}', expected '${expected}'`);
  return actual;
};

let checkStep = (math) => (step: (exp: MathNode) => MathNode, expression: string, expected: string) => {
  const actual = step(math.parse(expression)).toString();
  if (actual !== expected)
    throw new Error(`step('${expression}') === '${actual}', expected '${expected}'`);
  return actual;
};

// ---- Tests (bodies copied from the original by a script; see GAPS.md §8) -----------------

let test_ordering_1 = (check, ordering) =>
  check(ordering, 'x + 1', 'x + 1');

let test_ordering_2 = (check, ordering) =>
  check(ordering, '1 + x', 'x + 1');

let test_expandBrackets_1 = (check, expandBrackets) =>
  check(expandBrackets, "-6 * (2 - x) < 0", "-6 * 2 + 6 * x < 0");

let test_expandBrackets_2 = (check, expandBrackets) =>
  check(
    expandBrackets,
    "-2 * (-16 - 4 * x) - 2 * y < 16",
    "2 * 16 + 2 * 4 * x - 2 * y < 16"
  );

let test_expandBrackets_3 = (check, expandBrackets) =>
  check(expandBrackets, "-2 * (x + 1)", "-2 * x - 2 * 1");

let test_expandBrackets_4 = (check, expandBrackets) =>
  check(expandBrackets, '1 - (x2 - 5) ', '1 - x2 + 5');

let test_expandBrackets_5 = (check, expandBrackets) =>
  check(expandBrackets, 'x1 - (x2 - 5) ', 'x1 - x2 + 5');

let test_expandBrackets_6 = (check, expandBrackets) =>
  check(expandBrackets, '4 - (x1 + x2 + 5)', '4 - x1 - x2 - 5');

let test_expandBrackets_7 = (check, expandBrackets) =>
  check(expandBrackets, '1 - (x2 + 5) ', '1 - x2 - 5');

let test_expandBrackets_8 = (check, expandBrackets) =>
  check(expandBrackets, '- (x1 + x2)', '-x1 - x2');

let test_expandBrackets_9 = (check, expandBrackets) =>
  check(expandBrackets, '- (x1 - x2)', '-x1 + x2');

let test_expandBrackets_10 = (check, expandBrackets) =>
  check(expandBrackets, '-(x + 1)', '-x - 1');

let test_expandBrackets_11 = (check, expandBrackets) =>
  check(expandBrackets, '-(1 + x)', '-1 - x');

let test_expandBrackets_12 = (check, expandBrackets) =>
  check(expandBrackets, '-(1 - x)', '-1 + x');

let test_expandBrackets_13 = (check, expandBrackets) =>
  check(expandBrackets, '-(-1 - x)', '1 + x');

let test_expandBrackets_14 = (check, expandBrackets) =>
  check(expandBrackets, '-(-1 + x)', '1 - x');

let test_expandBrackets_15 = (check, expandBrackets) =>
  check(expandBrackets, '-(-1)', '1');

let test_expandBrackets_16 = (check, expandBrackets) =>
  check(expandBrackets, '-(-x)', 'x');

let test_expandBrackets_17 = (check, expandBrackets) =>
  check(expandBrackets, '0 * (x + 1)', '0');

let test_expandBrackets_18 = (check, expandBrackets) =>
  check(expandBrackets, '4 * (x + 1)', '4 * x + 4 * 1');

let test_expandBrackets_19 = (check, expandBrackets) =>
  check(expandBrackets, '4 * (x - 1)', '4 * x - 4 * 1');

let test_expandBrackets_20 = (check, expandBrackets) =>
  check(expandBrackets, '-(x1 + x2)', '-x1 - x2');

let test_multiplyOut_1 = (check, multiplyOut) =>
  check(multiplyOut, "2 * 1", "2");

let test_constantsToRHS_1 = (check, constantsToRHS) =>
  check(constantsToRHS, "1 < 0", "0 < 0 - 1");

let test_constantsToRHS_2 = (check, constantsToRHS) =>
  check(constantsToRHS, "-1 < 0", "0 < 0 + 1");

let test_constantsToRHS_3 = (check, constantsToRHS) =>
  check(
    constantsToRHS,
    "-2 * y - 2 - 2 * x - y < 0",
    "-2 * y - 2 * x - y < 0 + 2"
  );

let test_constantsToRHS_4 = (check, constantsToRHS) =>
  check(constantsToRHS, "-2 - x + y < 0", "-x + y < 0 + 2");

let test_constantsToRHS_5 = (check, constantsToRHS) =>
  check(constantsToRHS, "-2 - x - y < 0", "-x - y < 0 + 2");

let test_constantsToRHS_6 = (check, constantsToRHS) =>
  check(constantsToRHS, "-(2 * x) + 2 - y < 0", "-(2 * x) - y < 0 - 2");

let test_constantsToRHS_7 = (check, constantsToRHS) =>
  check(constantsToRHS, "0 < 1", "0 < 1");

let test_constantsToRHS_8 = (check, constantsToRHS) =>
  check(constantsToRHS, "x - 1 +  y < 0", "x + y < 0 + 1");

let test_constantsToRHS_9 = (check, constantsToRHS) =>
  check(constantsToRHS, '4 + x1 < x2', 'x1 < x2 - 4');

let test_constantsToRHS_10 = (check, constantsToRHS) =>
  check(constantsToRHS, '4 - x1 < x2', '-x1 < x2 - 4');

let test_constantsToRHS_11 = (check, constantsToRHS) =>
  check(constantsToRHS, '-4 - x1 < x2', '-x1 < x2 + 4');

let test_constantsToRHS_12 = (check, constantsToRHS) =>
  check(constantsToRHS, '-4 + x1 < x2', 'x1 < x2 + 4');

let test_constantsToRHS_13 = (check, constantsToRHS) =>
  check(constantsToRHS, 'x1 + 4 < x2', 'x1 < x2 - 4');

let test_constantsToRHS_14 = (check, constantsToRHS) =>
  check(constantsToRHS, 'x1 - 4 < x2', 'x1 < x2 + 4');

let test_constantsToRHS_15 = (check, constantsToRHS) =>
  check(constantsToRHS, '-x1 + 4 < x2', '-x1 < x2 - 4');

let test_constantsToRHS_16 = (check, constantsToRHS) =>
  check(constantsToRHS, "5 - x1 < 0", '-x1 < 0 - 5');

let test_complexityToLHS_1 = (check, complexityToLHS) =>
  check(complexityToLHS, 'x < 1 + 1 + 1', '-(1 + 1) + x < 1');

let test_complexityToLHS_2 = (check, complexityToLHS) =>
  check(complexityToLHS, "x1 < x2 - 5", '-x2 + x1 < -5');

let test_complexityToLHS_3 = (check, complexityToLHS) =>
  check(complexityToLHS, '1 < 2 - x', 'x + 1 < 2');

let test_complexityToLHS_4 = (check, complexityToLHS) =>
  check(complexityToLHS, '1 < 2 + x', '-x + 1 < 2');

let test_complexityToLHS_5 = (check, complexityToLHS) =>
  check(complexityToLHS, '1 < -2 + x', '-x + 1 < -2');

let test_complexityToLHS_6 = (check, complexityToLHS) =>
  check(complexityToLHS, '1 < -2 - x', 'x + 1 < -2');

let test_complexityToLHS_7 = (check, complexityToLHS) =>
  check(complexityToLHS, '-1 < -2 - x', 'x + -1 < -2');

let test_complexityToLHS_8 = (check, complexityToLHS) =>
  check(complexityToLHS, '-1 < x - 2', '-x - 1 < -2');

let test_complexityToLHS_9 = (check, complexityToLHS) =>
  check(complexityToLHS, '-1 < -x - 2', '-(-x) - 1 < -2');

let test_complexityToLHS_10 = (check, complexityToLHS) =>
  check(complexityToLHS, '-1 < -x + 2', '-(-x) + -1 < 2');

let test_complexityToLHS_11 = (check, complexityToLHS) =>
  check(complexityToLHS, '-4 * y < 0', '-4 * y < 0');

let test_addZeroToRHS_1 = (checkStep, addZeroToRHS) =>
  checkStep(addZeroToRHS, "x < -3 * x", "x - -3 * x < 0");

let test_addZeroToRHS_2 = (checkStep, addZeroToRHS) =>
  checkStep(addZeroToRHS, '0 < -1', "0 < -1");

let test_addZeroToRHS_3 = (checkStep, addZeroToRHS) =>
  checkStep(addZeroToRHS, "x < -x", "x + x < 0");

let test_addZeroToRHS_4 = (checkStep, addZeroToRHS) =>
  checkStep(addZeroToRHS, 'y < 5*y', "y - 5 * y < 0");

let test_addZeroToRHS_5 = (checkStep, addZeroToRHS) =>
  checkStep(addZeroToRHS, 'x < y', 'x - y < 0');

let test_addZeroToRHS_6 = (checkStep, addZeroToRHS) =>
  checkStep(addZeroToRHS, 'x < 3', 'x < 3');

let test_addZeroToRHS_7 = (checkStep, addZeroToRHS) =>
  checkStep(addZeroToRHS, 'x < -3', 'x < -3');

let test_addZeroToRHS_8 = (checkStep, addZeroToRHS) =>
  checkStep(addZeroToRHS, '5 < x1', "5 - x1 < 0");

let test_addZeroToRHS_then_constantsToRHS = (checkStep, math, addZeroToRHS, constantsToRHS) =>
  checkStep(
    exp => math.simplify(addZeroToRHS(exp), constantsToRHS),
    '5 < x1',
    '-x1 < 0 - 5'
  );

let test_addZeroToRHS_9 = (checkStep, addZeroToRHS) =>
  checkStep(addZeroToRHS, '-4 * y < 0', '-4 * y < 0');

let test_simplifyStep_1 = (simplifyStepExample) =>
  simplifyStepExample("-2 * y - 4 * y < 0", "-6 * y < 0");

let test_simplify2_1 = (check, simplify2) =>
  check(simplify2, '-x1 - x2 < 5', '-x1 - x2 < 5');

let test_simplify2_2 = (check, simplify2) =>
  check(simplify2, '-4 * y < 0', '-(4 * y) < 0');

let test_simplify2_3 = (check, simplify2) =>
  check(simplify2, '1.1', '1.1');

let test_simplify2_4 = (check, simplify2) =>
  check(simplify2, "x - 1 - 2", "x - 3");

let test_simplify2_5 = (check, simplify2) =>
  check(simplify2, "x - 1 + 1 + y", "x + y");

let test_simplify2_6 = (check, simplify2) =>
  check(simplify2, "- 1 + 1 + y < 0", "y < 0");

let test_simplifyStep_2 = (simplifyStepExample) =>
  simplifyStepExample("- 1 + 1 + y < 0", "y < 0");

let test_simplifyStep_3 = (simplifyStepExample) =>
  simplifyStepExample("-2 * x + -2 < 0", "-2 * x - 2 < 0");

let test_simplifyStep_4 = (simplifyStepExample) =>
  simplifyStepExample("2 * (x + 2) < 0", "2 * x + 4 < 0");

let test_simplifyStep_5 = (simplifyStepExample) =>
  simplifyStepExample("2 + 2 * x", "2 * x + 2");

let test_simplifyStep_6 = (simplifyStepExample) =>
  simplifyStepExample("1 * 2 < 0", "2 < 0");

let test_step2_1 = (step2Example) =>
  step2Example(
    "-2*-2*2*(1*2+x+2)+(-2+0)*(y+(0+(-2+-2*0*-1*((-2*2+1)*(0+-1)*-1+2))*(2+0*-2))*-2) < 0*1",
    "8 * x - 2 * y < -16"
  );

let test_step2_2 = (step2Example) =>
  step2Example("-2 - x + y < 0", "y - x < 2");

let test_step2_3 = (step2Example) =>
  step2Example("((-1*2+-2+0)*0*-1+x+-1+1)*1 < (1+-2)*x", "2 * x < 0");

let test_step2_4 = (step2Example) =>
  step2Example("-(2 * x) + -2 - y < 0", "-2 * x - y < 2");

let test_step2_5 = (step2Example) =>
  step2Example("0*0*x < 1", "0 < 1");

let test_step2_6 = (step2Example) =>
  step2Example('4 + x1 + x2 + 1 < x2 + 4', "x1 < -1");

let test_step2_7 = (step2Example) =>
  step2Example('4 + x1 + 1 < 4', "x1 < -1");

let test_step2_8 = (step2Example) =>
  step2Example('(x + 1) < (3 + x) * (6 - 7)', "2 * x < -4");

let test_step2_9 = (step2Example) =>
  step2Example('(x + 1) * 4 < (3 + x) * (6 - 7)', "5 * x < -7");

let test_step2_10 = (step2Example) =>
  step2Example('-(x1 + x2) < 0', '-x1 - x2 < 0');

let test_step2_11 = (step2Example) =>
  step2Example('x < y', 'x - y < 0');

let test_step2_12 = (step2Example) =>
  step2Example('5 < x1', "-x1 < -5");

let test_step2_13 = (step2Example) =>
  step2Example('-(4 * y) < 0', "-4 * y < 0");

let test_step2_14 = (step2Example) =>
  step2Example("4x < 0", "4 x < 0");

let test_step2_15 = (step2Example) =>
  step2Example("x < 1.1", "x < 1.1");

let test_step2_16 = (step2Example) =>
  step2Example("x - 1 + 1 + y < 0", "x + y < 0");

let test_step2_17 = (step2Example) =>
  step2Example("0 < -2 * x", "2 * x < 0");

let test_step2_18 = (step2Example) =>
  step2Example("1 + y < y", "0 < -1");

let test_step2_19 = (step2Example) =>
  step2Example("x < -3 * x", "4 * x < 0");

let test_step2_20 = (step2Example) =>
  step2Example("x < -1*(0+-1)*(1+0)*(-2+(0+1+1*0*-1)*0)*2*y", "x + 4 * y < 0");

let test_canonicalize_1 = (canonicalExample) =>
  canonicalExample('4 + x1 + 1 < 4', "x1 < -1");

let test_canonicalize_2 = (canonicalExample) =>
  canonicalExample('4 > 4 + x1 + 1', "-x1 > 1");

let test_canonicalize_3 = (canonicalExample) =>
  canonicalExample('4 + x1 + x2 + 2 < x2 + 4', "x1 < -2");

let test_canonicalize_4 = (canonicalExample) =>
  canonicalExample('4 + x1 + x2 + 2 <= x2 + 4', "x1 <= -2");

let test_canonicalize_5 = (canonicalExample) =>
  canonicalExample("5 > x1 + x2", "-x1 - x2 > -5");

let test_canonicalize_6 = (canonicalExample) =>
  canonicalExample('- -x + y > 5*y + 2x', "-4 * y - x > 0");

let test_canonicalize_7 = (canonicalExample) =>
  canonicalExample("-(4 * y) + -(4 * x) > 0", "-4 * y - 4 * x > 0");

let test_canonicalize_8 = (canonicalExample) =>
  canonicalExample('x > 1.1', "x > 1.1");

let test_canonicalize_9 = (canonicalExample) =>
  canonicalExample("1 == x1 + x2 + x3", "-x1 - x2 - x3 == -1");

let test_canonicalize_10 = (canonicalExample) =>
  canonicalExample("x - 1 + 1 + y <= 0", "x + y <= 0");

let test_canonicalize_11 = (canonicalExample) =>
  canonicalExample("(-1+1*(2+y+x))*-2 <= y", "-2 * y - 2 * x - y <= 2");

let test_canonicalize_scale_10k = (canonicalize) => {
    const n = 10000;
    const terms = Array.from({ length: n })
      .map((_, i) => `x${i}`)
      .join(" + ");
    // toString() on this many terms overflows the call stack in Chromium, so
    // check the node shape rather than the printed form
    const canonical = canonicalize(terms + " > 0");
    if (!canonical.isOperatorNode) throw new Error("expected a comparison");
    return canonical.op;
};

let test_isCanonical_1 = (isCanonical, math) => {
    const actual = isCanonical(math.parse("x0 + x1 + x2 < 0"));
    if (actual !== true) throw new Error("x0 + x1 + x2 < 0 should be canonical");
    return actual;
};

let test_isCanonical_2 = (isCanonical, math) => {
    const actual = isCanonical(math.parse("x0 + x1 - x2 < 0"));
    if (actual !== true) throw new Error("x0 + x1 - x2 < 0 should be canonical");
    return actual;
};

let test_isCanonical_3 = (isCanonical, math) => {
    const actual = isCanonical(math.parse("x0 + x1 * x2 < 0"));
    if (actual !== false) throw new Error("x0 + x1 * x2 < 0 should NOT be canonical");
    return actual;
};

let test_isCanonical_4 = (isCanonical, math) => {
    const actual = isCanonical(math.parse("-x < -1"));
    if (actual !== true) throw new Error("-x < -1 should be canonical");
    return actual;
};

let test_extract_1 = (checkExtract) =>
  checkExtract('4x <= 6', {
    vars: [{ coef: 4, name: "x" }],
    bounds: { upper: 6 }
  });

let test_extract_2 = (checkExtract) =>
  checkExtract("x <= 0", {
    vars: [{ coef: 1, name: "x" }],
    bounds: { upper: 0 }
  });

let test_extract_3 = (checkExtract) =>
  checkExtract('4x  + 6 (y + 4) 5 >= -6', {
    vars: [{ coef: 30, name: "y" }, { coef: 4, name: "x" }],
    bounds: { lower: -126 }
  });

let test_extract_4 = (checkExtract) =>
  checkExtract('4x - 2(y) >= 0', {
    bounds: { lower: 0 },
    vars: [{ coef: -2, name: "y" }, { coef: 4, name: "x" }]
  });

let test_extract_5 = (checkExtract) =>
  checkExtract('x + y == 0', {
    vars: [{ coef: 1, name: "y" }, { coef: 1, name: "x" }],
    bounds: { upper: 0, lower: 0 }
  });

let test_extract_6 = (checkExtract) =>
  checkExtract('4x - 2(y) -z >= 0', {
    bounds: { lower: 0 },
    vars: [
      { coef: -1, name: "z" },
      { coef: -2, name: "y" },
      { coef: 4, name: "x" }
    ]
  });

let test_extract_7 = (checkExtract) =>
  checkExtract("0<=-2*x", {
    bounds: { upper: -0 },
    vars: [{ coef: 2, name: "x" }]
  });

let test_extract_8 = (checkExtract) =>
  checkExtract("0 == 0", {
    vars: [],
    bounds: { upper: 0, lower: 0 }
  });

let test_extract_9 = (checkExtract) =>
  checkExtract("0*0*x>=1", {
    vars: [],
    bounds: { lower: 1 }
  });

let test_extract_10 = (checkExtract) =>
  checkExtract("(-1+1*(2+y+x))*-2 <= y", {
    vars: [{ coef: -3, name: "y" }, { coef: -2, name: "x" }],
    bounds: { upper: 2 }
  });

let test_extract_11 = (checkExtract) =>
  checkExtract("-2<=y+2*x", {
    vars: [
      {
        coef: -2,
        name: "x"
      },
      {
        coef: -1,
        name: "y"
      }
    ],
    bounds: { upper: 2 }
  });

let test_simplifyStep_7 = (simplifyStepExample) =>
  simplifyStepExample('0*0*x < 1', '0 < 1');
