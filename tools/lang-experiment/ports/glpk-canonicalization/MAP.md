# glpk-canonicalization: original variable → port

Source: `modules/@tomlarkworthy/glpk-canonicalization.js` (1170 lines, 162 variables: 160 `$def` + 2
`main.define`). Ported 2026-11-14. The tier of each checked cell is the one
`bun check.ts ports/glpk-canonicalization --json` reports. Test rows are grouped by section (all are
`default`); every other row is one original variable.

| original variable | tier | port cell(s) | note |
|---|---|---|---|
| `module @tomlarkworthy/mathjs` | import | none | module variable |
| `math` | import | foreign `math` (pure) | `import {math} from "@tomlarkworthy/mathjs"`; mathjs 15.2.0. Used subset typed in `foreign.d.ts`; node constructors became the foreigns `OperatorNode`, `ConstantNode` (GAPS §1) |
| `_1` (md title, uses `tex`) | prose | shell `_1` | `md`, `tex` |
| `_3` (md rule syntax) | prose | shell `_3` | `md` |
| `viewof DEBUG` | shell | shell `DEBUG_view` | `Inputs.toggle`; writes the `DEBUG` ref inside an `action` |
| `DEBUG` | ref | `DEBUG` | `ref(false)`, the toggle's default |
| `_5` (md) | prose | shell `_5` | `md` |
| `withOperator` | default | `withOperator` | clone-then-assign `op`/`fn` became a rebuilt `OperatorNode` (GAPS §2); a non-operator node is returned unchanged, which differs from the original on a `FunctionNode` root (GAPS §4) |
| `_7` (md) | prose | shell `_7` | `md` |
| `ordering` | default | `ordering` | return type annotated `readonly RuleObject[]` (GAPS §5) |
| `_11` (md) | prose | shell `_11` | `md` |
| `expandBrackets` | default | `expandBrackets` | unchanged |
| `_33` (md) | prose | shell `_33` | `md` |
| `multiplyOut` | default | `multiplyOut` | unchanged |
| `_36` (md) | prose | shell `_36` | `md` |
| `constantsToRHS` | default | `constantsToRHS` | unchanged |
| `constantsToRHSFn` | mut-local | `constantsToRHSFn` | `pruned` out-parameter is a `Mut<MConstantNode[]>`; `appendRHS` loop instead of a `forEach` that reassigned a parameter; `new` → factory foreigns; two `debugger;` dropped |
| `_55` (md) | prose | shell `_55` | `md` |
| `complexityToLHS` | default | `complexityToLHS` | unchanged (the commented-out rule kept as a comment) |
| `_68` (md) | prose | shell `_68` | `md` |
| `addZeroToRHS` | default | `addZeroToRHS` | reassigned parameter `exp` → `const exp`; the unguarded `node.fn ==`/`node.args[i]` reads became `looseFn`/`argsOf`/`opOf` helpers (GAPS §3) |
| `_70` (`math.parse("1 + 2 ")`) | default | `_70` | unchanged |
| `_81` (md) | prose | shell `_81` | `md` |
| `simplify2` | default | `simplify2` | `ruleText` gains a `typeof r === "function"` branch (the original reached `null` through `r?.s`/`r?.l` on a function) |
| `_89` (md) | prose | shell `_89` | `md` |
| `simplifyStep` | default | `simplifyStep` | unchanged apart from types |
| `_97` (md) | prose | shell `_97` | `md` |
| `step2` | mut-local | `step2` | `seen` is a `Mut<Set>`; `console.log` → `log` capability |
| `_119` (md) | prose | shell `_119` | `md` |
| `canonicalize` | default | `canonicalize` | throws where the original built an `OperatorNode` with `op` undefined (GAPS §4) |
| `_133` (md) | prose | shell `_133` | `md` |
| `isCanonical` | default | `isCanonical` | unchanged |
| `_139` (md) | prose | shell `_139` | `md` |
| `extract` | mut-local | `extract` | `merged` is a `Mut<Map>`; throws if a coefficient is not a number (GAPS §3) |
| `extractRHS` | default | `extractRHS` | `-value` → `-Number(value)` |
| `extractLHS` | mut-local | `extractLHS` | pushes into a local `Mut` copy of `acc` and returns it frozen, instead of pushing into the caller's `acc` (GAPS §2) |
| `checkExtract` | default | `checkExtract` | `.sort` on fresh arrays → `.toSorted` |
| `canonicalExample` | default | `canonicalExample` | unchanged |
| `step2Example` | default | `step2Example` | unchanged |
| `simplifyStepExample` | default | `simplifyStepExample` | unchanged |
| `check` | default | `check` | unchanged |
| `checkStep` | default | `checkStep` | unchanged |
| `test_ordering_1..2` (2) | default | same names | bodies copied by script |
| `test_expandBrackets_1..20` (20) | default | same names | bodies copied by script |
| `test_multiplyOut_1` (1) | default | same name | body copied by script |
| `test_constantsToRHS_1..16` (16) | default | same names | bodies copied by script |
| `test_complexityToLHS_1..11` (11) | default | same names | bodies copied by script |
| `test_addZeroToRHS_1..9`, `test_addZeroToRHS_then_constantsToRHS` (10) | default | same names | bodies copied by script |
| `test_simplify2_1..6` (6) | default | same names | bodies copied by script |
| `test_simplifyStep_1..7` (7) | default | same names | bodies copied by script |
| `test_step2_1..20` (20) | default | same names | bodies copied by script |
| `test_canonicalize_1..11`, `test_canonicalize_scale_10k` (12) | default | same names | bodies copied by script; `scale_10k` narrows on `canonical.isOperatorNode` as written |
| `test_isCanonical_1..4` (4) | default | same names | bodies copied by script |
| `test_extract_1..11` (11) | default | same names | bodies copied by script |

Counts over the 162 variables: default 139 (120 tests + 19), mut-local 4, ref 1, shell 1, prose 15,
import 2. Checked share of the tier denominator (default + mut-local + owner + ref + shell = 145):
144/145. Port: 144 checked cells in `cells.ts`, 16 shell-file cells (15 prose + `DEBUG_view`).
