const _1gxy9l9 = function _1(md,tex){return(
md`# Canonicalization with Math.js

I want to get expressions like ${tex`(x_2 - x_1) * 4 \gt x_1 + 1`}, into _a) into a specialized canonical form for linear programming:-

${tex`-5 x_1 + 4 x_2 \geq 1`}

in general

${tex`c_1x_1 + ... + c_nx_n \geq c_0`}

Math.js has the power, but does not ship with enough rewrite rules by default. So this notebook is about adding the require rules to create a canonicalization routine.

There is a fuzzer to help stress test these routines https://observablehq.com/@tomlarkworthy/expression-fuzzer
`
)};
const _1sdslff = function _math(require){return(
require('mathjs@9.4.4')
)};
const _1gsqjb0 = function _3(md){return(
md`### Simplify Rule Syntax: Custom simplification rules
- ‘n’ - matches any Node
- ‘c’ - matches any ConstantNode
- ‘v’ - matches any Node that is not a ConstantNode
`
)};
const _j95424 = function _DEBUG(html){return(
html`<a href="#">`.href.split("?")[0].split("#")[0] ===
  "https://observablehq.com/@tomlarkworthy/glpk-canonicalization"
)};
const _i6jrsq = function _5(md){return(
md`## Preparation: identify operator and replace with <`
)};
const _1wp0ka = function _toLeq(){return(
ast => {
  const op = { op: ast.op, fn: ast.fn };
  ast.op = '<';
  ast.fn = 'smaller';
  return {
    op,
    ast
  };
}
)};
const _11imk1u = function _fromLeq(){return(
(ast, op) => {
  ast.op = op.op;
  ast.fn = op.fn;
  return ast;
}
)};
const _1ctadrm = function _8(md){return(
md`### Ordering`
)};
const _wkuwg1 = function _ordering(){return(
[
  { l: 'c+v', r: 'v+c', context: { add: { commutative: false } } },
  { l: 'v*c', r: 'c*v', context: { multiply: { commutative: false } } }
]
)};
const _1tau5c1 = function _10(check,ordering){return(
check(ordering, 'x + 1', 'x + 1')
)};
const _1342r6s = function _11(check,ordering){return(
check(ordering, '1 + x', 'x + 1')
)};
const _1b2uy4k = function _12(md){return(
md`### Expand brackets`
)};
const _8orysw = function _expandBrackets(){return(
[
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
]
)};
const _19we9kk = function _14(check,expandBrackets){return(
check(expandBrackets, "-6 * (2 - x) < 0", "-6 * 2 + 6 * x < 0")
)};
const _k3jzqh = function _15(check,expandBrackets){return(
check(
  expandBrackets,
  "-2 * (-16 - 4 * x) - 2 * y < 16",
  "2 * 16 + 2 * 4 * x - 2 * y < 16"
)
)};
const _107s9go = function _16(check,expandBrackets){return(
check(expandBrackets, "-2 * (x + 1)", "-2 * x - 2 * 1")
)};
const _1pqy7tv = function _17(check,expandBrackets){return(
check(expandBrackets, '1 - (x2 - 5) ', '1 - x2 + 5')
)};
const _frjunw = function _18(check,expandBrackets){return(
check(expandBrackets, 'x1 - (x2 - 5) ', 'x1 - x2 + 5')
)};
const _10o66x = function _19(check,expandBrackets){return(
check(expandBrackets, '4 - (x1 + x2 + 5)', '4 - x1 - x2 - 5')
)};
const _1cf366d = function _20(check,expandBrackets){return(
check(expandBrackets, '1 - (x2 + 5) ', '1 - x2 - 5')
)};
const _17n6nq2 = function _21(check,expandBrackets){return(
check(expandBrackets, '- (x1 + x2)', '-x1 - x2')
)};
const _ever1j = function _22(check,expandBrackets){return(
check(expandBrackets, '- (x1 - x2)', '-x1 + x2')
)};
const _x8mr48 = function _23(check,expandBrackets){return(
check(expandBrackets, '-(x + 1)', '-x - 1')
)};
const _pvx8z = function _24(check,expandBrackets){return(
check(expandBrackets, '-(1 + x)', '-1 - x')
)};
const _1k5dlu2 = function _25(check,expandBrackets){return(
check(expandBrackets, '-(1 - x)', '-1 + x')
)};
const _1p7cchj = function _26(check,expandBrackets){return(
check(expandBrackets, '-(-1 - x)', '1 + x')
)};
const _1fqiicq = function _27(check,expandBrackets){return(
check(expandBrackets, '-(-1 + x)', '1 - x')
)};
const _8co3gf = function _28(check,expandBrackets){return(
check(expandBrackets, '-(-1)', '1')
)};
const _1293pke = function _29(check,expandBrackets){return(
check(expandBrackets, '-(-x)', 'x')
)};
const _3yu4p0 = function _30(check,expandBrackets){return(
check(expandBrackets, '0 * (x + 1)', '0')
)};
const _nu3ns3 = function _31(check,expandBrackets){return(
check(expandBrackets, '4 * (x + 1)', '4 * x + 4 * 1')
)};
const _tvv76c = function _32(check,expandBrackets){return(
check(expandBrackets, '4 * (x - 1)', '4 * x - 4 * 1')
)};
const _1tupagr = function _33(check,expandBrackets){return(
check(expandBrackets, '-(x1 + x2)', '-x1 - x2')
)};
const _10w4meu = function _34(md){return(
md`### Multiple out constants`
)};
const _1lb6qv3 = function _multiplyOut(math){return(
[math.simplify.simplifyCore]
)};
const _1bc0d2w = function _36(check,multiplyOut){return(
check(multiplyOut, "2 * 1", "2")
)};
const _tib38m = function _37(md){return(
md`### ⚠️ Constants to RHS
`
)};
const _db61um = function _useConstantsToRHSFn(Inputs){return(
Inputs.toggle({
  label: "Use new implementation?",
  value: true
})
)};
const _1wqi2ee = (G, _) => G.input(_);
const _cch9ct = function _constantsToRHS(useConstantsToRHSFn,constantsToRHSFn,constantsToRHSOld){return(
useConstantsToRHSFn
  ? [constantsToRHSFn]
  : [...constantsToRHSOld]
)};
const _skx6ee = function _constantsToRHSOld(){return(
[
  { l: "c1 + n1 < n2", r: "n1 < n2 - c1" },
  { l: "n1 - c1 + n3 < n2", r: "n1 + n3 < n2 + c1" }, // Hmmm, bit complex
  { l: "n1 - c1 - n3 < n2", r: "n1 - n3 < n2 + c1" }, // Hmmm, bit complex
  { l: "n1 + c1 - n3 < n2", r: "n1 - n3 < n2 - c1" }, // Hmmm, bit complex
  { l: "c1 - n1 < n2", r: "- n1 < n2 - c1" },
  { l: "-c1 - n1 + n3 < n2", r: "- n1 + n3 < n2 + c1" }, // Hmm, bit complex
  { l: "-c1 - n1 - n3 < n2", r: "- n1 - n3 < n2 + c1" }, // Hmm, bit complex
  { l: "- c1 - n1 < n2", r: "- n1 < n2 + c1" },
  { l: "- c1 + n1 < n2", r: "n1 < n2 + c1" },
  { l: "n1 - c1 < n2", r: "n1 < n2 + c1" },
  { l: "c < n", r: "-n < -c" },
  { l: "c < 0", r: "0 < -c" },
  { l: "c <-0", r: "0 < -c" },
  { l: "-c < -0", r: "0 < c" },
  { l: "-c <  0", r: "0 < c" }
]
)};
const _qz9rhq = function _constantsToRHSFn(math)
{
  const isOperatorNode = math.isOperatorNode;
  const isConstantNode = math.isConstantNode;
  const isNegativeConstantNode = (node) =>
    isOperatorNode(node) &&
    node.fn == "unaryMinus" &&
    isConstantNode(node.args[0]);
  const isSymbolNode = math.isSymbolNode;
  const isParenthesisNode = math.isParenthesisNode;
  const isZero = math.isZero;
  const OperatorNode = math.OperatorNode;
  const ConstantNode = math.ConstantNode;
  const ParenthesisNode = math.ParenthesisNode;
  const SymbolNode = math.SymbolNode;

  let prunedLHS = (node, pruned) => {
    const pruneNode = (node) =>
      isConstantNode(node) ? node : new ConstantNode(-node.args[0].value);

    if (isConstantNode(node) || isNegativeConstantNode(node)) {
      if (node.value !== 0) {
        pruned.push(pruneNode(node));
      }
      return new ConstantNode(0);
    } else if (isParenthesisNode(node)) {
      return node;
    } else if (isOperatorNode(node) && node.isBinary()) {
      if (node.fn == "add") {
        if (
          isConstantNode(node.args[0]) ||
          isNegativeConstantNode(node.args[0])
        ) {
          pruned.push(pruneNode(node.args[0]));
          return prunedLHS(node.args[1], pruned);
        } else if (
          isConstantNode(node.args[1]) ||
          isNegativeConstantNode(node.args[1])
        ) {
          pruned.push(pruneNode(node.args[1]));
          return prunedLHS(node.args[0], pruned);
        }
        return new OperatorNode(node.op, node.fn, [
          prunedLHS(node.args[0], pruned),
          prunedLHS(node.args[1], pruned)
        ]);
      } else if (node.fn == "subtract") {
        if (
          isConstantNode(node.args[0]) ||
          isNegativeConstantNode(node.args[0])
        ) {
          pruned.push(pruneNode(node.args[0]));
          return new OperatorNode("-", "unaryMinus", [
            prunedLHS(node.args[1], pruned)
          ]);
        } else if (
          isConstantNode(node.args[1]) ||
          isNegativeConstantNode(node.args[1])
        ) {
          pruned.push(new ConstantNode(-pruneNode(node.args[1]).value));
          return prunedLHS(node.args[0], pruned);
        }
        return new OperatorNode(node.op, node.fn, [
          prunedLHS(node.args[0], pruned),
          prunedLHS(node.args[1], pruned)
        ]);
      }

      return node;
    } else if (isOperatorNode(node) && node.isUnary()) {
      return new OperatorNode(node.op, node.fn, [node.args[0]]);
    } else if (isSymbolNode(node)) {
      return node;
    }
    debugger;
    throw new Error(`Should not happen: ${node}`);
  };
  let appendRHS = (node, pruned) => {
    pruned.forEach((term) => {
      if (term.value > 0) {
        node = new OperatorNode("-", "subtract", [node, term]);
      } else {
        node = new OperatorNode("+", "add", [
          node,
          new ConstantNode(-term.value)
        ]);
      }
    });
    return node;
  };

  let splitConditional = (node) => {
    if (isOperatorNode(node) && node.op === "<") {
      const terms = [];
      const a0 = prunedLHS(node.args[0], terms);
      const a1 = appendRHS(node.args[1], terms);
      return new OperatorNode(node.op, node.fn, [a0, a1]);
    } else {
      debugger;
      throw new Error(`Only works with < as top node ${node.fn}`);
    }
  };
  return splitConditional;
};
const _17tfov7 = function _42(check,constantsToRHS){return(
check(constantsToRHS, "1 < 0", "0 < 0 - 1")
)};
const _1m5b8xl = function _43(check,constantsToRHS){return(
check(constantsToRHS, "-1 < 0", "0 < 0 + 1")
)};
const _rb687e = function _44(check,constantsToRHS){return(
check(
  constantsToRHS,
  "-2 * y - 2 - 2 * x - y < 0",
  "-2 * y - 2 * x - y < 0 + 2"
)
)};
const _t2uja9 = function _45(check,constantsToRHS){return(
check(constantsToRHS, "-2 - x + y < 0", "-x + y < 0 + 2")
)};
const _7s323q = function _46(check,constantsToRHS){return(
check(constantsToRHS, "-2 - x - y < 0", "-x - y < 0 + 2")
)};
const _39rdsz = function _47(check,constantsToRHS){return(
check(constantsToRHS, "-(2 * x) + 2 - y < 0", "-(2 * x) - y < 0 - 2")
)};
const _ln7u8k = function _48(check,constantsToRHS){return(
check(constantsToRHS, "0 < 1", "0 < 1")
)};
const _1uq13af = function _49(check,constantsToRHS){return(
check(constantsToRHS, "x - 1 +  y < 0", "x + y < 0 + 1")
)};
const _cko6tb = function _50(check,constantsToRHS){return(
check(constantsToRHS, '4 + x1 < x2', 'x1 < x2 - 4')
)};
const _mw705z = function _51(check,constantsToRHS){return(
check(constantsToRHS, '4 - x1 < x2', '-x1 < x2 - 4')
)};
const _1h7berl = function _52(check,constantsToRHS){return(
check(constantsToRHS, '-4 - x1 < x2', '-x1 < x2 + 4')
)};
const _16509pr = function _53(check,constantsToRHS){return(
check(constantsToRHS, '-4 + x1 < x2', 'x1 < x2 + 4')
)};
const _z030t1 = function _54(check,constantsToRHS){return(
check(constantsToRHS, 'x1 + 4 < x2', 'x1 < x2 - 4')
)};
const _1qfnong = function _55(check,constantsToRHS){return(
check(constantsToRHS, 'x1 - 4 < x2', 'x1 < x2 + 4')
)};
const _1ona763 = function _56(check,constantsToRHS){return(
check(constantsToRHS, '-x1 + 4 < x2', '-x1 < x2 - 4')
)};
const _1pa82t7 = function _57(check,constantsToRHS){return(
check(constantsToRHS, "5 - x1 < 0", '-x1 < 0 - 5')
)};
const _1sebc96 = function _58(md){return(
md`### Variables to LHS`
)};
const _13a9vm7 = function _complexityToLHS(){return(
[
  { l: 'n1 < n2 + v', r: '-v + n1 < n2' },
  { l: 'n1 < n2 - v', r: 'v + n1 < n2' },
  { l: '-n1 < v - n2', r: '-v - n1 < -n2' },
  { l: 'n1 < v - n2', r: '-v + n1 < -n2' }
  //{ l: 'v1 < v2', r: 'v1 - v2 < 0' }
]
)};
const _16fu6ws = function _60(check,complexityToLHS){return(
check(complexityToLHS, 'x < 1 + 1 + 1', '-(1 + 1) + x < 1')
)};
const _i2xiz7 = function _61(check,complexityToLHS){return(
check(complexityToLHS, "x1 < x2 - 5", '-x2 + x1 < -5')
)};
const _a6mtdw = function _62(check,complexityToLHS){return(
check(complexityToLHS, '1 < 2 - x', 'x + 1 < 2')
)};
const _1e46rki = function _63(check,complexityToLHS){return(
check(complexityToLHS, '1 < 2 + x', '-x + 1 < 2')
)};
const _w85odt = function _64(check,complexityToLHS){return(
check(complexityToLHS, '1 < -2 + x', '-x + 1 < -2')
)};
const _196rg19 = function _65(check,complexityToLHS){return(
check(complexityToLHS, '1 < -2 - x', 'x + 1 < -2')
)};
const _1ab454w = function _66(check,complexityToLHS){return(
check(complexityToLHS, '-1 < -2 - x', 'x + -1 < -2')
)};
const _9flei6 = function _67(check,complexityToLHS){return(
check(complexityToLHS, '-1 < x - 2', '-x - 1 < -2')
)};
const _178v9cw = function _68(check,complexityToLHS){return(
check(complexityToLHS, '-1 < -x - 2', '-(-x) - 1 < -2')
)};
const _1ihbgep = function _69(check,complexityToLHS){return(
check(complexityToLHS, '-1 < -x + 2', '-(-x) + -1 < 2')
)};
const _1joo3hz = function _70(check,complexityToLHS){return(
check(complexityToLHS, '-4 * y < 0', '-4 * y < 0')
)};
const _14hecnc = function _71(md){return(
md`### Add zero to RHS

Its quite dangerous introducing terms as it often causes loop, so we do this once other optimizations are exhausted.
`
)};
const _17unv12 = function _addZeroToRHS(math){return(
(exp) => {
  exp = typeof exp === "string" ? math.parse(exp) : exp;

  if (
    exp.op === "<" &&
    (exp.args[1].isSymbolNode ||
      (exp.args[1].fn == "unaryMinus" && exp.args[1].args[0].isSymbolNode) ||
      (exp.args[1].op == "*" &&
        exp.args[1].args[0].isConstantNode &&
        exp.args[1].args[1].isSymbolNode) ||
      (exp.args[1].op == "*" &&
        exp.args[1].args[0].fn == "unaryMinus" &&
        exp.args[1].args[0].args[0].isConstantNode &&
        exp.args[1].args[1].isSymbolNode))
  ) {
    const RHS = exp.args[1];
    const LHS = exp.args[0];
    const newRHS = new math.ConstantNode(0);
    const newLHS =
      exp.args[1].fn == "unaryMinus" && exp.args[1].args[0].isSymbolNode
        ? new math.OperatorNode("+", "add", [LHS, RHS.args[0]])
        : new math.OperatorNode("-", "minus", [LHS, RHS]);
    const result = new math.OperatorNode("<", "smaller", [newLHS, newRHS]);
    return math.parse(result.toString()); // There is something we don't get about mutating expression trees
  } else {
    return exp;
  }
}
)};
const _32a935 = function _73(math){return(
math.parse("1 + 2 ")
)};
const _s8xroc = function _74(checkStep,addZeroToRHS){return(
checkStep(addZeroToRHS, "x < -3 * x", "x - -3 * x < 0")
)};
const _19pv1ik = function _75(checkStep,addZeroToRHS){return(
checkStep(addZeroToRHS, '0 < -1', "0 < -1")
)};
const _2vfnf = function _76(checkStep,addZeroToRHS){return(
checkStep(addZeroToRHS, "x < -x", "x + x < 0")
)};
const _u46tlv = function _77(checkStep,addZeroToRHS){return(
checkStep(addZeroToRHS, 'y < 5*y', "y - 5 * y < 0")
)};
const _k909ts = function _78(checkStep,addZeroToRHS){return(
checkStep(addZeroToRHS, 'x < y', 'x - y < 0')
)};
const _9lbd38 = function _79(checkStep,addZeroToRHS){return(
checkStep(addZeroToRHS, 'x < 3', 'x < 3')
)};
const _1h0te6e = function _80(checkStep,addZeroToRHS){return(
checkStep(addZeroToRHS, 'x < -3', 'x < -3')
)};
const _13d55pm = function _81(checkStep,addZeroToRHS){return(
checkStep(addZeroToRHS, '5 < x1', "5 - x1 < 0")
)};
const _oz8830 = function _82(checkStep,math,addZeroToRHS,constantsToRHS){return(
checkStep(
  exp => math.simplify(addZeroToRHS(exp), constantsToRHS),
  '5 < x1',
  '-x1 < 0 - 5'
)
)};
const _3r4b8t = function _83(checkStep,addZeroToRHS){return(
checkStep(addZeroToRHS, '-4 * y < 0', '-4 * y < 0')
)};
const _114eisd = function _84(md){return(
md`### Simplify Base Rules

The default simplify sometimes works against us by introducing brackets. So we trim the rules down a bit, however it is not enough
`
)};
const _to9xlg = function _simplify2(math)
{
  const baseRules = [...math.simplify.rules];

  baseRules.splice(
    baseRules.findIndex((r) => r.l === "n1*n3 + n2*n3"),
    1
  );
  /*
  baseRules.splice(
    baseRules.findIndex((r) => r.l === "n1*n2 + n2") + 1,
    0,
    { l: "c1 * (n + c2)", r: "c1 * n + c1 * c2" },
    { l: "-c1 * (n + c2)", r: "-c1 * n - c1 * c2" },
    { l: "- (n1 + n2)", r: "-n1 - n2" }
  );*/

  // Performance issues so we remove some irrelavant ones
  /*
  baseRules.splice(baseRules.findIndex(r => r.l === 'n+n'), 1);
  baseRules.splice(baseRules.findIndex(r => r.l === 'log(e)'), 1);
  baseRules.splice(baseRules.findIndex(r => r.l === 'n-n1'), 1);
  baseRules.splice(baseRules.findIndex(r => r.l === 'n+-n'), 1);
  baseRules.splice(baseRules.findIndex(r => r.l === 'n*n'), 1);
  */
  return [...baseRules];
};
const _1cm0eru = function _86(simplifyStepExample){return(
simplifyStepExample("-2 * y - 4 * y < 0", "-6 * y < 0")
)};
const _xg0n37 = function _87(check,simplify2){return(
check(simplify2, '-x1 - x2 < 5', '-x1 - x2 < 5')
)};
const _1tt5wav = function _88(check,simplify2){return(
check(simplify2, '-4 * y < 0', '-(4 * y) < 0')
)};
const _189d8fp = function _89(check,simplify2){return(
check(simplify2, '1.1', '1.1')
)};
const _1hsr0j0 = function _90(check,simplify2){return(
check(simplify2, "x - 1 - 2", "x - 3")
)};
const _wla5wk = function _91(check,simplify2){return(
check(simplify2, "x - 1 + 1 + y", "x + y")
)};
const _zqh4fg = function _92(md){return(
md`### Simplify Step

Note that < causes problems with zeros, so we have to simplify on each AST branch seperately
`
)};
const _etsade = function _93(check,simplify2){return(
check(simplify2, "- 1 + 1 + y < 0", "y + 0 < 0")
)};
const _3bjeh4 = function _simplifyStep(math,expandBrackets,multiplyOut){return(
(exp) => {
  // Simplify gets confused by comparitor, better to run it on each child sperately
  const customSimplify = (exp) =>
    math.simplify(
      math.simplify(exp, math.simplify.rules, {}, { exactFractions: false }),
      [...expandBrackets, ...multiplyOut]
    );

  if (exp.isOperatorNode && exp.op === "<") {
    return exp.map(customSimplify);
  } else {
    return customSimplify(exp);
  }
}
)};
const _1uq7qvt = function _95(simplifyStepExample){return(
simplifyStepExample("- 1 + 1 + y < 0", "y < 0")
)};
const _ukqcuo = function _96(simplifyStepExample){return(
simplifyStepExample("-2 * x + -2 < 0", "-2 * x - 2 < 0")
)};
const _1pq5d7z = function _97(simplifyStepExample){return(
simplifyStepExample("2 * (x + 2) < 0", "2 * x + 4 < 0")
)};
const _3mp8ax = function _98(simplifyStepExample){return(
simplifyStepExample("2 + 2 * x", "2 * x + 2")
)};
const _14wnf19 = function _99(simplifyStepExample){return(
simplifyStepExample("1 * 2 < 0", "2 < 0")
)};
const _1etsj4q = function _100(md){return(
md`### Step 2

Aim of step 2 is to pull constants to RHS, simplify them, and push complex expression to LHS, and repeat.
`
)};
const _1h09d2c = function _step2(_,math,expandBrackets,constantsToRHS,simplifyStep,complexityToLHS,addZeroToRHS,DEBUG){return(
(exp) => {
  const history = [];
  do {
    history.push(exp);
    const updateRHS = math.simplify(exp, [
      ...expandBrackets,
      ...constantsToRHS
    ]);
    const rhs = simplifyStep(updateRHS);
    const updateLHS = math.simplify(rhs, [...complexityToLHS]);
    exp = addZeroToRHS(updateLHS);
    if (DEBUG) {
      console.log("updateRHS", updateRHS.toString());
      console.log("rhs", rhs.toString());
      console.log("updateLHS", updateLHS.toString());
      console.log("addZeroToRHS", exp.toString());
    }
  } while (history.find((prev) => _.isEqual(exp, prev)) === undefined);

  return math.simplify(exp, [...expandBrackets]);
}
)};
const _17fjjrf = function _equalsIsSlow(math,_)
{
  const n = 20;
  const termsA = Array.from({ length: n })
    .map((_, i) => `x${i}`)
    .join(" + ");

  const termsB = Array.from({ length: n })
    .map((_, i) => `x${i}`)
    .join(" + ");

  const a = math.parse(termsA);
  const b = math.parse(termsB);

  //return a.equals(b) // Very slow, uses home rolled deep equals https://github.com/josdejong/mathjs/blob/c6cbf5538915c8964b70a1af086f47c2c0be33df/src/expression/node/Node.js#L221
  return _.isEqual(a, b); // much faster
};
const _1ahyqds = function _103(step2Example){return(
step2Example(
  "-2*-2*2*(1*2+x+2)+(-2+0)*(y+(0+(-2+-2*0*-1*((-2*2+1)*(0+-1)*-1+2))*(2+0*-2))*-2) < 0*1",
  "8 * x - 2 * y < -16"
)
)};
const _1e0txzl = function _104(step2Example){return(
step2Example("-2 - x + y < 0", "y - x < 2")
)};
const _1mecg5s = function _105(step2Example){return(
step2Example("((-1*2+-2+0)*0*-1+x+-1+1)*1 < (1+-2)*x", "2 * x < 0")
)};
const _1dghp0c = function _106(step2Example){return(
step2Example("-(2 * x) + -2 - y < 0", "-2 * x - y < 2")
)};
const _1cvbgp2 = function _107(step2Example){return(
step2Example("0*0*x < 1", "0 < 1")
)};
const _1qgrhyg = function _108(step2Example){return(
step2Example('4 + x1 + x2 + 1 < x2 + 4', "x1 < -1")
)};
const _dqmych = function _109(step2Example){return(
step2Example('4 + x1 + 1 < 4', "x1 < -1")
)};
const _1l31534 = function _110(step2Example){return(
step2Example('(x + 1) < (3 + x) * (6 - 7)', "2 * x < -4")
)};
const _143miut = function _111(step2Example){return(
step2Example('(x + 1) * 4 < (3 + x) * (6 - 7)', "5 * x < -7")
)};
const _1e202yt = function _112(step2Example){return(
step2Example('-(x1 + x2) < 0', '-x1 - x2 < 0')
)};
const _3q4idi = function _113(step2Example){return(
step2Example('x < y', 'x - y < 0')
)};
const _f4az06 = function _114(step2Example){return(
step2Example('5 < x1', "-x1 < -5")
)};
const _fgy652 = function _115(step2Example){return(
step2Example('-(4 * y) < 0', "-4 * y < 0")
)};
const _rtdvig = function _116(step2Example){return(
step2Example("4x < 0", "4 x < 0")
)};
const _egm6t9 = function _117(step2Example){return(
step2Example("x < 1.1", "x < 1.1")
)};
const _vn9npu = function _118(step2Example){return(
step2Example("x - 1 + 1 + y < 0", "x + y < 0")
)};
const _1yvvtza = function _119(step2Example){return(
step2Example("0 < -2 * x", "2 * x < 0")
)};
const _8n4vdb = function _120(step2Example){return(
step2Example("1 + y < y", "0 < -1")
)};
const _48hl56 = function _121(step2Example){return(
step2Example("x < -3 * x", "4 * x < 0")
)};
const _19q70mv = function _122(step2Example){return(
step2Example("x < -1*(0+-1)*(1+0)*(-2+(0+1+1*0*-1)*0)*2*y", "x + 4 * y < 0")
)};
const _1u95o8m = function _123(md){return(
md`### Canonicalize`
)};
const _cjqbhv = function _canonicalize(math,toLeq,isCanonical,step2,fromLeq){return(
exp => {
  const ast = math.parse(exp);
  const leq = toLeq(ast);
  const simplified = isCanonical(leq.ast) ? leq.ast : step2(leq.ast);
  return fromLeq(simplified, leq.op);
}
)};
const _1yko5hv = function _125(canonicalExample){return(
canonicalExample('4 + x1 + 1 < 4', "x1 < -1")
)};
const _1g2w05o = function _126(canonicalExample){return(
canonicalExample('4 > 4 + x1 + 1', "-x1 > 1")
)};
const _1mxmhgl = function _127(canonicalExample){return(
canonicalExample('4 + x1 + x2 + 2 < x2 + 4', "x1 < -2")
)};
const _1k2tqfs = function _128(canonicalExample){return(
canonicalExample('4 + x1 + x2 + 2 <= x2 + 4', "x1 <= -2")
)};
const _17zyzn6 = function _129(canonicalExample){return(
canonicalExample("5 > x1 + x2", "-x1 - x2 > -5")
)};
const _dsmm4e = function _130(canonicalExample){return(
canonicalExample('- -x + y > 5*y + 2x', "-4 * y - x > 0")
)};
const _1bsy4q = function _131(canonicalExample){return(
canonicalExample("-(4 * y) + -(4 * x) > 0", "-4 * y - 4 * x > 0")
)};
const _1gwk7os = function _132(canonicalExample){return(
canonicalExample('x > 1.1', "x > 1.1")
)};
const _jgjg9x = function _133(canonicalExample){return(
canonicalExample("1 == x1 + x2 + x3", "-x3 - x1 - x2 == -1")
)};
const _1hvyuq4 = function _134(canonicalExample){return(
canonicalExample("x - 1 + 1 + y <= 0", "x + y <= 0")
)};
const _1m0gx8g = function _135(canonicalExample){return(
canonicalExample("(-1+1*(2+y+x))*-2 <= y", "-3 * y - 2 * x <= 2")
)};
const _1vxk1h9 = function _136(tests,canonicalize){return(
tests.test(`scale 10k'`, () => {
  const n = 10000;
  const terms = Array.from({ length: n })
    .map((_, i) => `x${i}`)
    .join(" + ");
  canonicalize(terms + " > 0");
})
)};
const _l8o0q2 = function _137(md){return(
md`### isCanonical (special case short circuit)`
)};
const _o42udc = function _isCanonical(extractRHS,extractLHS){return(
exp => {
  if (exp.op) {
    try {
      const bounds = extractRHS('<=', exp.args[1]);
      const vars = extractLHS([], exp.args[0]);
    } catch (err) {
      return false;
    }
    return true;
  }

  return false;
}
)};
const _1xk13sv = function _139(tests,expect,isCanonical,math){return(
tests.test("x0 + x1 + x2 > 0 is canonical", () => {
  expect(isCanonical(math.parse("x0 + x1 + x2 < 0"))).toBe(true);
})
)};
const _1pahf7j = function _140(tests,expect,isCanonical,math){return(
tests.test("x0 + x1 - x2 > 0 is canonical", () => {
  expect(isCanonical(math.parse("x0 + x1 - x2 < 0"))).toBe(true);
})
)};
const _160lzuk = function _141(tests,expect,isCanonical,math){return(
tests.test("x0 + x1 * x2 > 0 is NOT canonical", () => {
  expect(isCanonical(math.parse("x0 + x1 * x2 < 0"))).toBe(false);
})
)};
const _1mwser7 = function _142(tests,expect,isCanonical,math){return(
tests.test("-x < -1 is canonical", () => {
  expect(isCanonical(math.parse("-x < -1"))).toBe(true);
})
)};
const _1nt0dnq = function _143(md){return(
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
`
)};
const _1ag99zn = function _extract(canonicalize,extractRHS,extractLHS){return(
exp => {
  const c = canonicalize(exp);
  if (c.isOperatorNode) {
    const bounds = extractRHS(c.op, c.args[1]);
    const vars = extractLHS([], c.args[0]);

    return {
      vars,
      bounds
    };
  } else {
    throw new Error("cannot deal");
  }
}
)};
const _1y5dx8v = function _extractRHS(){return(
(op, rhs) => {
  let value = undefined;
  if (rhs.isConstantNode) {
    value = rhs.value;
  } else if (rhs.fn === "unaryMinus" && rhs.args[0].isConstantNode) {
    value = -rhs.args[0].value;
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
}
)};
const _1cy9gz8 = function _extractLHS(){return(
function extractLHS(acc, rootLhs) {
  const stack = [];
  stack.push(rootLhs);

  // while not empty
  while (stack.length) {
    // Pop off end of stack.
    let lhs = stack.pop();

    if (
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
      acc.push({
        coef: -rhs[0].coef,
        name: rhs[0].name
      });
    } else if (lhs.isSymbolNode) {
      acc.push({
        coef: 1,
        name: lhs.name
      });
    } else if (
      lhs.isOperatorNode &&
      lhs.op === "-" &&
      lhs.fn === "unaryMinus" &&
      lhs.args[0].isSymbolNode
    ) {
      acc.push({
        coef: -1,
        name: lhs.args[0].name
      });
    } else if (lhs.isOperatorNode && lhs.op === "*") {
      if (lhs.args[1].isSymbolNode) {
        let value = undefined;
        if (lhs.args[0].isConstantNode) {
          value = lhs.args[0].value;
        } else if (
          lhs.args[0].fn === "unaryMinus" &&
          lhs.args[0].args[0].isConstantNode
        ) {
          value = -lhs.args[0].args[0].value;
        } else {
          throw new Error(`Must be constant: ${lhs.args[0].toString()}`);
        }
        acc.push({
          coef: value,
          name: lhs.args[1].name
        });
      } else {
        throw new Error(`Cannot term from ${lhs.toString()}`);
      }
    } else {
      throw new Error(`Cannot extract coeffecients from ${lhs.toString()}`);
    }
  }

  return acc;
}
)};
const _7zoxwa = function _checkExtract(tests,expect,extract){return(
(expression, expected) => {
  return tests.test(
    `extract('${expression}') === '${JSON.stringify(expected)}'`,
    () => {
      expect(extract(expression)).toEqual(expected);
    }
  );
}
)};
const _tu5j0z = function _148(checkExtract){return(
checkExtract('4x <= 6', {
  vars: [{ coef: 4, name: "x" }],
  bounds: { upper: 6 }
})
)};
const _4a1ezr = function _149(checkExtract){return(
checkExtract("x <= 0", {
  vars: [{ coef: 1, name: "x" }],
  bounds: { upper: 0 }
})
)};
const _17htj6v = function _150(checkExtract){return(
checkExtract('4x  + 6 (y + 4) 5 >= -6', {
  vars: [{ coef: 30, name: "y" }, { coef: 4, name: "x" }],
  bounds: { lower: -126 }
})
)};
const _m72h7f = function _151(checkExtract){return(
checkExtract('4x - 2(y) >= 0', {
  bounds: { lower: 0 },
  vars: [{ coef: -2, name: "y" }, { coef: 4, name: "x" }]
})
)};
const _47e3wt = function _152(checkExtract){return(
checkExtract('x + y == 0', {
  vars: [{ coef: 1, name: "y" }, { coef: 1, name: "x" }],
  bounds: { upper: 0, lower: 0 }
})
)};
const _ua8hcy = function _153(checkExtract){return(
checkExtract('4x - 2(y) -z >= 0', {
  bounds: { lower: 0 },
  vars: [
    { coef: -1, name: "z" },
    { coef: -2, name: "y" },
    { coef: 4, name: "x" }
  ]
})
)};
const _pjyxfo = function _154(checkExtract){return(
checkExtract("0<=-2*x", {
  bounds: { upper: -0 },
  vars: [{ coef: 2, name: "x" }]
})
)};
const _y9js9z = function _155(checkExtract){return(
checkExtract("0 == 0", {
  vars: [],
  bounds: { upper: 0, lower: 0 }
})
)};
const _1tg7b75 = function _156(checkExtract){return(
checkExtract("0*0*x>=1", {
  vars: [],
  bounds: { lower: 1 }
})
)};
const _hiv4i6 = function _157(checkExtract){return(
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
})
)};
const _l1syow = function _tests(createSuite){return(
createSuite({
  name: "Canonicalization"
})
)};
const _nspk7b = (G, _) => G.input(_);
const _1e4knk3 = function _canonicalExample(tests,expect,canonicalize){return(
(expression, expected) => {
  return tests.test(
    `canonicalize('${expression.substring(30)}') === '${expected.substring(
      30
    )}'`,
    () => {
      expect(canonicalize(expression).toString()).toBe(expected);
    }
  );
}
)};
const _wu8pap = function _step2Example(tests,expect,step2){return(
(expression, expected) => {
  return tests.test(`step2('${expression}') === '${expected}'`, () => {
    expect(step2(expression).toString()).toBe(expected);
  });
}
)};
const _5n5tx8 = function _simplifyStepExample(tests,expect,simplifyStep,math){return(
(expression, expected) => {
  return tests.test(`simplifyStep('${expression}') === '${expected}'`, () => {
    expect(simplifyStep(math.parse(expression)).toString()).toBe(expected);
  });
}
)};
const _oy6ss9 = function _162(simplifyStepExample){return(
simplifyStepExample('0*0*x < 1', '0 < 1')
)};
const _1xigxvp = function _check(tests,expect,math){return(
(rules, expression, expected) => {
  return tests.test(`check('${expression}') === '${expected}'`, () => {
    expect(
      math.simplify(expression, rules, {}, { exactFractions: false }).toString()
    ).toBe(expected);
  });
}
)};
const _z5ful9 = function _checkStep(tests,expect,math){return(
(step, expression, expected) => {
  return tests.test(`check('${expression}') === '${expected}'`, () => {
    expect(step(math.parse(expression)).toString()).toBe(expected);
  });
}
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  main.define("module @tomlarkworthy/testing", async () => runtime.module((await import("/@tomlarkworthy/testing.js?v=4")).default));  
  $def("_1gxy9l9", null, ["md","tex"], _1gxy9l9);  
  $def("_1sdslff", "math", ["require"], _1sdslff);  
  $def("_1gsqjb0", null, ["md"], _1gsqjb0);  
  $def("_j95424", "DEBUG", ["html"], _j95424);  
  $def("_i6jrsq", null, ["md"], _i6jrsq);  
  $def("_1wp0ka", "toLeq", [], _1wp0ka);  
  $def("_11imk1u", "fromLeq", [], _11imk1u);  
  $def("_1ctadrm", null, ["md"], _1ctadrm);  
  $def("_wkuwg1", "ordering", [], _wkuwg1);  
  $def("_1tau5c1", null, ["check","ordering"], _1tau5c1);  
  $def("_1342r6s", null, ["check","ordering"], _1342r6s);  
  $def("_1b2uy4k", null, ["md"], _1b2uy4k);  
  $def("_8orysw", "expandBrackets", [], _8orysw);  
  $def("_19we9kk", null, ["check","expandBrackets"], _19we9kk);  
  $def("_k3jzqh", null, ["check","expandBrackets"], _k3jzqh);  
  $def("_107s9go", null, ["check","expandBrackets"], _107s9go);  
  $def("_1pqy7tv", null, ["check","expandBrackets"], _1pqy7tv);  
  $def("_frjunw", null, ["check","expandBrackets"], _frjunw);  
  $def("_10o66x", null, ["check","expandBrackets"], _10o66x);  
  $def("_1cf366d", null, ["check","expandBrackets"], _1cf366d);  
  $def("_17n6nq2", null, ["check","expandBrackets"], _17n6nq2);  
  $def("_ever1j", null, ["check","expandBrackets"], _ever1j);  
  $def("_x8mr48", null, ["check","expandBrackets"], _x8mr48);  
  $def("_pvx8z", null, ["check","expandBrackets"], _pvx8z);  
  $def("_1k5dlu2", null, ["check","expandBrackets"], _1k5dlu2);  
  $def("_1p7cchj", null, ["check","expandBrackets"], _1p7cchj);  
  $def("_1fqiicq", null, ["check","expandBrackets"], _1fqiicq);  
  $def("_8co3gf", null, ["check","expandBrackets"], _8co3gf);  
  $def("_1293pke", null, ["check","expandBrackets"], _1293pke);  
  $def("_3yu4p0", null, ["check","expandBrackets"], _3yu4p0);  
  $def("_nu3ns3", null, ["check","expandBrackets"], _nu3ns3);  
  $def("_tvv76c", null, ["check","expandBrackets"], _tvv76c);  
  $def("_1tupagr", null, ["check","expandBrackets"], _1tupagr);  
  $def("_10w4meu", null, ["md"], _10w4meu);  
  $def("_1lb6qv3", "multiplyOut", ["math"], _1lb6qv3);  
  $def("_1bc0d2w", null, ["check","multiplyOut"], _1bc0d2w);  
  $def("_tib38m", null, ["md"], _tib38m);  
  $def("_db61um", "viewof useConstantsToRHSFn", ["Inputs"], _db61um);  
  $def("_1wqi2ee", "useConstantsToRHSFn", ["Generators","viewof useConstantsToRHSFn"], _1wqi2ee);  
  $def("_cch9ct", "constantsToRHS", ["useConstantsToRHSFn","constantsToRHSFn","constantsToRHSOld"], _cch9ct);  
  $def("_skx6ee", "constantsToRHSOld", [], _skx6ee);  
  $def("_qz9rhq", "constantsToRHSFn", ["math"], _qz9rhq);  
  $def("_17tfov7", null, ["check","constantsToRHS"], _17tfov7);  
  $def("_1m5b8xl", null, ["check","constantsToRHS"], _1m5b8xl);  
  $def("_rb687e", null, ["check","constantsToRHS"], _rb687e);  
  $def("_t2uja9", null, ["check","constantsToRHS"], _t2uja9);  
  $def("_7s323q", null, ["check","constantsToRHS"], _7s323q);  
  $def("_39rdsz", null, ["check","constantsToRHS"], _39rdsz);  
  $def("_ln7u8k", null, ["check","constantsToRHS"], _ln7u8k);  
  $def("_1uq13af", null, ["check","constantsToRHS"], _1uq13af);  
  $def("_cko6tb", null, ["check","constantsToRHS"], _cko6tb);  
  $def("_mw705z", null, ["check","constantsToRHS"], _mw705z);  
  $def("_1h7berl", null, ["check","constantsToRHS"], _1h7berl);  
  $def("_16509pr", null, ["check","constantsToRHS"], _16509pr);  
  $def("_z030t1", null, ["check","constantsToRHS"], _z030t1);  
  $def("_1qfnong", null, ["check","constantsToRHS"], _1qfnong);  
  $def("_1ona763", null, ["check","constantsToRHS"], _1ona763);  
  $def("_1pa82t7", null, ["check","constantsToRHS"], _1pa82t7);  
  $def("_1sebc96", null, ["md"], _1sebc96);  
  $def("_13a9vm7", "complexityToLHS", [], _13a9vm7);  
  $def("_16fu6ws", null, ["check","complexityToLHS"], _16fu6ws);  
  $def("_i2xiz7", null, ["check","complexityToLHS"], _i2xiz7);  
  $def("_a6mtdw", null, ["check","complexityToLHS"], _a6mtdw);  
  $def("_1e46rki", null, ["check","complexityToLHS"], _1e46rki);  
  $def("_w85odt", null, ["check","complexityToLHS"], _w85odt);  
  $def("_196rg19", null, ["check","complexityToLHS"], _196rg19);  
  $def("_1ab454w", null, ["check","complexityToLHS"], _1ab454w);  
  $def("_9flei6", null, ["check","complexityToLHS"], _9flei6);  
  $def("_178v9cw", null, ["check","complexityToLHS"], _178v9cw);  
  $def("_1ihbgep", null, ["check","complexityToLHS"], _1ihbgep);  
  $def("_1joo3hz", null, ["check","complexityToLHS"], _1joo3hz);  
  $def("_14hecnc", null, ["md"], _14hecnc);  
  $def("_17unv12", "addZeroToRHS", ["math"], _17unv12);  
  $def("_32a935", null, ["math"], _32a935);  
  $def("_s8xroc", null, ["checkStep","addZeroToRHS"], _s8xroc);  
  $def("_19pv1ik", null, ["checkStep","addZeroToRHS"], _19pv1ik);  
  $def("_2vfnf", null, ["checkStep","addZeroToRHS"], _2vfnf);  
  $def("_u46tlv", null, ["checkStep","addZeroToRHS"], _u46tlv);  
  $def("_k909ts", null, ["checkStep","addZeroToRHS"], _k909ts);  
  $def("_9lbd38", null, ["checkStep","addZeroToRHS"], _9lbd38);  
  $def("_1h0te6e", null, ["checkStep","addZeroToRHS"], _1h0te6e);  
  $def("_13d55pm", null, ["checkStep","addZeroToRHS"], _13d55pm);  
  $def("_oz8830", null, ["checkStep","math","addZeroToRHS","constantsToRHS"], _oz8830);  
  $def("_3r4b8t", null, ["checkStep","addZeroToRHS"], _3r4b8t);  
  $def("_114eisd", null, ["md"], _114eisd);  
  $def("_to9xlg", "simplify2", ["math"], _to9xlg);  
  $def("_1cm0eru", null, ["simplifyStepExample"], _1cm0eru);  
  $def("_xg0n37", null, ["check","simplify2"], _xg0n37);  
  $def("_1tt5wav", null, ["check","simplify2"], _1tt5wav);  
  $def("_189d8fp", null, ["check","simplify2"], _189d8fp);  
  $def("_1hsr0j0", null, ["check","simplify2"], _1hsr0j0);  
  $def("_wla5wk", null, ["check","simplify2"], _wla5wk);  
  $def("_zqh4fg", null, ["md"], _zqh4fg);  
  $def("_etsade", null, ["check","simplify2"], _etsade);  
  $def("_3bjeh4", "simplifyStep", ["math","expandBrackets","multiplyOut"], _3bjeh4);  
  $def("_1uq7qvt", null, ["simplifyStepExample"], _1uq7qvt);  
  $def("_ukqcuo", null, ["simplifyStepExample"], _ukqcuo);  
  $def("_1pq5d7z", null, ["simplifyStepExample"], _1pq5d7z);  
  $def("_3mp8ax", null, ["simplifyStepExample"], _3mp8ax);  
  $def("_14wnf19", null, ["simplifyStepExample"], _14wnf19);  
  $def("_1etsj4q", null, ["md"], _1etsj4q);  
  $def("_1h09d2c", "step2", ["_","math","expandBrackets","constantsToRHS","simplifyStep","complexityToLHS","addZeroToRHS","DEBUG"], _1h09d2c);  
  $def("_17fjjrf", "equalsIsSlow", ["math","_"], _17fjjrf);  
  $def("_1ahyqds", null, ["step2Example"], _1ahyqds);  
  $def("_1e0txzl", null, ["step2Example"], _1e0txzl);  
  $def("_1mecg5s", null, ["step2Example"], _1mecg5s);  
  $def("_1dghp0c", null, ["step2Example"], _1dghp0c);  
  $def("_1cvbgp2", null, ["step2Example"], _1cvbgp2);  
  $def("_1qgrhyg", null, ["step2Example"], _1qgrhyg);  
  $def("_dqmych", null, ["step2Example"], _dqmych);  
  $def("_1l31534", null, ["step2Example"], _1l31534);  
  $def("_143miut", null, ["step2Example"], _143miut);  
  $def("_1e202yt", null, ["step2Example"], _1e202yt);  
  $def("_3q4idi", null, ["step2Example"], _3q4idi);  
  $def("_f4az06", null, ["step2Example"], _f4az06);  
  $def("_fgy652", null, ["step2Example"], _fgy652);  
  $def("_rtdvig", null, ["step2Example"], _rtdvig);  
  $def("_egm6t9", null, ["step2Example"], _egm6t9);  
  $def("_vn9npu", null, ["step2Example"], _vn9npu);  
  $def("_1yvvtza", null, ["step2Example"], _1yvvtza);  
  $def("_8n4vdb", null, ["step2Example"], _8n4vdb);  
  $def("_48hl56", null, ["step2Example"], _48hl56);  
  $def("_19q70mv", null, ["step2Example"], _19q70mv);  
  $def("_1u95o8m", null, ["md"], _1u95o8m);  
  $def("_cjqbhv", "canonicalize", ["math","toLeq","isCanonical","step2","fromLeq"], _cjqbhv);  
  $def("_1yko5hv", null, ["canonicalExample"], _1yko5hv);  
  $def("_1g2w05o", null, ["canonicalExample"], _1g2w05o);  
  $def("_1mxmhgl", null, ["canonicalExample"], _1mxmhgl);  
  $def("_1k2tqfs", null, ["canonicalExample"], _1k2tqfs);  
  $def("_17zyzn6", null, ["canonicalExample"], _17zyzn6);  
  $def("_dsmm4e", null, ["canonicalExample"], _dsmm4e);  
  $def("_1bsy4q", null, ["canonicalExample"], _1bsy4q);  
  $def("_1gwk7os", null, ["canonicalExample"], _1gwk7os);  
  $def("_jgjg9x", null, ["canonicalExample"], _jgjg9x);  
  $def("_1hvyuq4", null, ["canonicalExample"], _1hvyuq4);  
  $def("_1m0gx8g", null, ["canonicalExample"], _1m0gx8g);  
  $def("_1vxk1h9", null, ["tests","canonicalize"], _1vxk1h9);  
  $def("_l8o0q2", null, ["md"], _l8o0q2);  
  $def("_o42udc", "isCanonical", ["extractRHS","extractLHS"], _o42udc);  
  $def("_1xk13sv", null, ["tests","expect","isCanonical","math"], _1xk13sv);  
  $def("_1pahf7j", null, ["tests","expect","isCanonical","math"], _1pahf7j);  
  $def("_160lzuk", null, ["tests","expect","isCanonical","math"], _160lzuk);  
  $def("_1mwser7", null, ["tests","expect","isCanonical","math"], _1mwser7);  
  $def("_1nt0dnq", null, ["md"], _1nt0dnq);  
  $def("_1ag99zn", "extract", ["canonicalize","extractRHS","extractLHS"], _1ag99zn);  
  $def("_1y5dx8v", "extractRHS", [], _1y5dx8v);  
  $def("_1cy9gz8", "extractLHS", [], _1cy9gz8);  
  $def("_7zoxwa", "checkExtract", ["tests","expect","extract"], _7zoxwa);  
  $def("_tu5j0z", null, ["checkExtract"], _tu5j0z);  
  $def("_4a1ezr", null, ["checkExtract"], _4a1ezr);  
  $def("_17htj6v", null, ["checkExtract"], _17htj6v);  
  $def("_m72h7f", null, ["checkExtract"], _m72h7f);  
  $def("_47e3wt", null, ["checkExtract"], _47e3wt);  
  $def("_ua8hcy", null, ["checkExtract"], _ua8hcy);  
  $def("_pjyxfo", null, ["checkExtract"], _pjyxfo);  
  $def("_y9js9z", null, ["checkExtract"], _y9js9z);  
  $def("_1tg7b75", null, ["checkExtract"], _1tg7b75);  
  $def("_hiv4i6", null, ["checkExtract"], _hiv4i6);  
  $def("_l1syow", "viewof tests", ["createSuite"], _l1syow);  
  $def("_nspk7b", "tests", ["Generators","viewof tests"], _nspk7b);  
  $def("_1e4knk3", "canonicalExample", ["tests","expect","canonicalize"], _1e4knk3);  
  $def("_wu8pap", "step2Example", ["tests","expect","step2"], _wu8pap);  
  $def("_5n5tx8", "simplifyStepExample", ["tests","expect","simplifyStep","math"], _5n5tx8);  
  $def("_oy6ss9", null, ["simplifyStepExample"], _oy6ss9);  
  $def("_1xigxvp", "check", ["tests","expect","math"], _1xigxvp);  
  $def("_z5ful9", "checkStep", ["tests","expect","math"], _z5ful9);  
  main.define("createSuite", ["module @tomlarkworthy/testing", "@variable"], (_, v) => v.import("createSuite", _));  
  main.define("expect", ["module @tomlarkworthy/testing", "@variable"], (_, v) => v.import("expect", _));
  return main;
}