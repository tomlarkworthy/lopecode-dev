# CPU Profile

| Duration | Samples | Interval | Functions |
|----------|---------|----------|----------|
| 3.22s | 2160 | 1.0ms | 218 |

**Top 10:** `show` 32.2%, `map` 10.9%, `(anonymous)` 10.8%, `performIteration` 10.6%, `sub` 9.2%, `s` 5.8%, `decl` 5.7%, `stringify` 3.7%, `holds` 3.2%, `entries` 1.2%

## Hot Functions (Self Time)

| Self% | Self | Total% | Total | Function | Location |
|------:|-----:|-------:|------:|----------|----------|
| 32.2% | 1.04s | 83.5% | 2.69s | `show` | `[native code]` |
| 10.9% | 353.7ms | 38.6% | 1.24s | `map` | `[native code]` |
| 10.8% | 347.9ms | 100.0% | 3.60s | `(anonymous)` | `[native code]` |
| 10.6% | 343.5ms | 12.0% | 388.6ms | `performIteration` | `[native code]` |
| 9.2% | 299.2ms | 100.0% | 3.64s | `sub` | `[native code]` |
| 5.8% | 187.1ms | 22.1% | 712.5ms | `s` | `[native code]` |
| 5.7% | 185.2ms | 5.7% | 185.2ms | `decl` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/registry.ts:105` |
| 3.7% | 119.3ms | 3.7% | 119.3ms | `stringify` | `[native code]` |
| 3.2% | 104.2ms | 100.0% | 5.34s | `holds` | `[native code]` |
| 1.2% | 41.5ms | 1.2% | 41.5ms | `entries` | `[native code]` |
| 1.2% | 41.1ms | 85.3% | 2.75s | `filter` | `[native code]` |
| 0.8% | 26.5ms | 0.8% | 26.5ms | `expand` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/registry.ts` |
| 0.7% | 24.5ms | 1.0% | 33.4ms | `member` | `[native code]` |
| 0.4% | 14.9ms | 0.4% | 14.9ms | `flatMap` | `[native code]` |
| 0.2% | 8.8ms | 0.2% | 8.8ms | `expand` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/registry.ts:234` |
| 0.2% | 7.5ms | 2.7% | 88.3ms | `expand` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/registry.ts:232` |
| 0.1% | 6.0ms | 0.1% | 6.0ms | `hidden` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts:488` |
| 0.1% | 5.1ms | 0.1% | 5.1ms | `sub` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/registry.ts:288` |
| 0.1% | 4.5ms | 0.1% | 4.5ms | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs` |
| 0.1% | 4.2ms | 0.1% | 5.7ms | `expand` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/registry.ts:242` |
| 0.1% | 3.5ms | 0.1% | 3.5ms | `[Symbol.iterator]` | `[native code]` |
| 0.0% | 3.0ms | 85.3% | 2.74s | `forEach` | `[native code]` |
| 0.0% | 2.9ms | 100.0% | 5.43s | `hidden` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts:499` |
| 0.0% | 2.0ms | 0.0% | 2.0ms | `captureParserCheckpoint` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:1220` |
| 0.0% | 1.7ms | 1.0% | 35.1ms | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:2774` |
| 0.0% | 1.7ms | 0.0% | 1.7ms | `parseMaybeConditional` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js` |
| 0.0% | 1.7ms | 0.0% | 1.7ms | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:2775` |
| 0.0% | 1.7ms | 0.0% | 1.7ms | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:2235` |
| 0.0% | 1.7ms | 0.0% | 1.7ms | `isIdentifierChar` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:74` |
| 0.0% | 1.7ms | 0.0% | 1.7ms | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts` |
| 0.0% | 1.6ms | 1.5% | 49.1ms | `expand` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/registry.ts:233` |
| 0.0% | 1.5ms | 0.0% | 1.5ms | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:2457` |
| 0.0% | 1.5ms | 0.0% | 1.5ms | `isIdentifierChar` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs` |
| 0.0% | 1.5ms | 0.0% | 1.5ms | `checkSources` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/core.ts` |
| 0.0% | 1.5ms | 0.0% | 1.5ms | `tsParseNonArrayType` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2862` |
| 0.0% | 1.5ms | 0.0% | 1.5ms | `some` | `[native code]` |
| 0.0% | 1.5ms | 0.0% | 1.5ms | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:624` |
| 0.0% | 1.4ms | 0.0% | 1.4ms | `literal` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/registry.ts:208` |
| 0.0% | 1.4ms | 0.1% | 4.9ms | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts:499` |
| 0.0% | 1.4ms | 0.0% | 1.4ms | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:3977` |
| 0.0% | 1.4ms | 0.0% | 1.4ms | `filter` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts:120` |
| 0.0% | 1.3ms | 0.0% | 2.7ms | `readFileSync` | `[native code]` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js` |
| 0.0% | 1.3ms | 84.2% | 2.71s | `hidden` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts:514` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:2287` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `join` | `[native code]` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `tsParseModifiers` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:3081` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `parseSubscript` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:5031` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `isAbstractConstructorSignature` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `tokenIsIdentifier` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `readWord` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:1933` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `tsParseTypeMemberSemicolon` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:3263` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `readToken` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:1624` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:5617` |

## Call Tree (Total Time)

| Total% | Total | Self% | Self | Function | Location |
|-------:|------:|------:|-----:|----------|----------|
| 100.0% | 10.98s | 0.0% | 0us | `check` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts:424` |
| 100.0% | 5.79s | 0.0% | 0us | `hidden` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts:494` |
| 100.0% | 5.49s | 0.0% | 0us | `returned` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts:1111` |
| 100.0% | 5.43s | 0.0% | 2.9ms | `hidden` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts:499` |
| 100.0% | 5.34s | 3.2% | 104.2ms | `holds` | `[native code]` |
| 100.0% | 3.64s | 9.2% | 299.2ms | `sub` | `[native code]` |
| 100.0% | 3.60s | 10.8% | 347.9ms | `(anonymous)` | `[native code]` |
| 99.1% | 3.19s | 0.0% | 0us | `(module)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/profile-call.ts:16` |
| 85.4% | 2.75s | 0.0% | 0us | `infer` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts:578` |
| 85.4% | 2.75s | 0.0% | 0us | `fnExpr` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts:1089` |
| 85.3% | 2.75s | 1.2% | 41.1ms | `filter` | `[native code]` |
| 85.3% | 2.74s | 0.0% | 3.0ms | `forEach` | `[native code]` |
| 85.3% | 2.74s | 0.0% | 0us | `checkSources` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/core.ts:320` |
| 85.2% | 2.74s | 0.0% | 0us | `stmt` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts:1465` |
| 85.2% | 2.74s | 0.0% | 0us | `fnExpr` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts:1087` |
| 85.2% | 2.74s | 0.0% | 0us | `stmts` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts:1428` |
| 85.2% | 2.74s | 0.0% | 0us | `check1` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts:434` |
| 85.2% | 2.74s | 0.0% | 0us | `conditional` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts:692` |
| 85.2% | 2.74s | 0.0% | 0us | `check1` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts:447` |
| 85.2% | 2.74s | 0.0% | 0us | `apply` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts:1296` |
| 85.2% | 2.74s | 0.0% | 0us | `check1` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts:443` |
| 85.2% | 2.74s | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts:1314` |
| 85.2% | 2.74s | 0.0% | 0us | `call` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts:1232` |
| 84.8% | 2.73s | 0.0% | 0us | `peek` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/registry.ts:99` |
| 84.2% | 2.71s | 0.0% | 1.3ms | `hidden` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts:514` |
| 83.5% | 2.69s | 32.2% | 1.04s | `show` | `[native code]` |
| 46.9% | 1.51s | 0.0% | 0us | `hides` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts:463` |
| 38.6% | 1.24s | 10.9% | 353.7ms | `map` | `[native code]` |
| 37.9% | 1.22s | 0.0% | 0us | `hides` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts:465` |
| 22.1% | 712.5ms | 5.8% | 187.1ms | `s` | `[native code]` |
| 12.9% | 417.8ms | 0.0% | 0us | `checkSources` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/core.ts:347` |
| 12.0% | 388.6ms | 10.6% | 343.5ms | `performIteration` | `[native code]` |
| 5.7% | 185.2ms | 5.7% | 185.2ms | `decl` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/registry.ts:105` |
| 3.7% | 119.3ms | 3.7% | 119.3ms | `stringify` | `[native code]` |
| 3.6% | 118.9ms | 0.0% | 0us | `isAlias` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/registry.ts:282` |
| 2.7% | 88.3ms | 0.2% | 7.5ms | `expand` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/registry.ts:232` |
| 1.5% | 49.1ms | 0.0% | 1.6ms | `expand` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/registry.ts:233` |
| 1.2% | 41.5ms | 1.2% | 41.5ms | `entries` | `[native code]` |
| 1.1% | 38.3ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:775` |
| 1.1% | 37.8ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:2825` |
| 1.1% | 37.8ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:2897` |
| 1.1% | 36.5ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:2945` |
| 1.0% | 35.3ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:3126` |
| 1.0% | 35.1ms | 0.0% | 1.7ms | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:2774` |
| 1.0% | 33.4ms | 0.7% | 24.5ms | `member` | `[native code]` |
| 1.0% | 33.4ms | 0.0% | 0us | `member` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/registry.ts:282` |
| 1.0% | 33.4ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:2808` |
| 0.8% | 26.5ms | 0.8% | 26.5ms | `expand` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/registry.ts` |
| 0.6% | 22.2ms | 0.0% | 0us | `parse` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/parse.ts:30` |
| 0.6% | 22.2ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:890` |
| 0.6% | 22.1ms | 0.0% | 0us | `link` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/link.ts:37` |
| 0.6% | 20.4ms | 0.0% | 0us | `tsParseUnionOrIntersectionType` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2607` |
| 0.6% | 19.6ms | 0.0% | 0us | `tsInType` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2960` |
| 0.5% | 19.1ms | 0.0% | 0us | `checkSources` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/core.ts:64` |
| 0.5% | 17.9ms | 0.0% | 0us | `Registry` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/registry.ts:49` |
| 0.5% | 17.0ms | 0.0% | 0us | `(module)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/runtime-ss.ts:15` |
| 0.5% | 16.1ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:3611` |
| 0.5% | 16.1ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:2736` |
| 0.4% | 15.3ms | 0.0% | 0us | `anonymous` | `[native code]` |
| 0.4% | 14.9ms | 0.4% | 14.9ms | `flatMap` | `[native code]` |
| 0.4% | 14.2ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:3297` |
| 0.4% | 13.5ms | 0.0% | 0us | `tsParseType` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2928` |
| 0.4% | 13.0ms | 0.0% | 0us | `value` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/link.ts:26` |
| 0.4% | 13.0ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/link.ts:37` |
| 0.3% | 12.2ms | 0.0% | 0us | `tsInAllowConditionalTypesContext` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2437` |
| 0.3% | 11.9ms | 0.0% | 0us | `tsParseTypeAnnotation` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2473` |
| 0.3% | 11.7ms | 0.0% | 0us | `expect` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts:452` |
| 0.3% | 11.5ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:1418` |
| 0.3% | 11.3ms | 0.0% | 0us | `tsParseList` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:3380` |
| 0.3% | 11.3ms | 0.0% | 0us | `bound tsParseTypeMember` | `[native code]` |
| 0.3% | 11.1ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:3626` |
| 0.3% | 10.8ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2475` |
| 0.3% | 10.2ms | 0.0% | 0us | `tsParseArrayTypeOrHigher` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2875` |
| 0.3% | 10.2ms | 0.0% | 0us | `bound tsParseTypeOperatorOrHigher` | `[native code]` |
| 0.3% | 10.2ms | 0.0% | 0us | `bound tsParseIntersectionTypeOrHigher` | `[native code]` |
| 0.2% | 8.8ms | 0.2% | 8.8ms | `expand` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/registry.ts:234` |
| 0.2% | 8.6ms | 0.0% | 0us | `tsParseTypeOperatorOrHigher` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2894` |
| 0.2% | 8.5ms | 0.0% | 0us | `parseExpressionStatement` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:4175` |
| 0.2% | 8.4ms | 0.0% | 0us | `value` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/link.ts:27` |
| 0.2% | 8.3ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:5503` |
| 0.2% | 8.2ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:3650` |
| 0.2% | 7.6ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:1483` |
| 0.2% | 7.5ms | 0.0% | 0us | `parseVarStatement` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:4121` |
| 0.2% | 7.2ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:5542` |
| 0.2% | 7.1ms | 0.0% | 0us | `tsInAmbientContext` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:3509` |
| 0.2% | 7.1ms | 0.0% | 0us | `tsParseExpressionStatement` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:3444` |
| 0.1% | 6.3ms | 0.0% | 0us | `parseStatement` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:4151` |
| 0.1% | 6.2ms | 0.0% | 0us | `tsParsePropertyOrMethodSignature` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:3293` |
| 0.1% | 6.2ms | 0.0% | 0us | `tsParseTypeLiteral` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2733` |
| 0.1% | 6.2ms | 0.0% | 0us | `tsParseObjectTypeMembers` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:3386` |
| 0.1% | 6.2ms | 0.0% | 0us | `parseMaybeAssignOrigin` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:4567` |
| 0.1% | 6.0ms | 0.0% | 0us | `tsFillSignature` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2571` |
| 0.1% | 6.0ms | 0.0% | 0us | `tsParseBindingListForSignature` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2443` |
| 0.1% | 6.0ms | 0.1% | 6.0ms | `hidden` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts:488` |
| 0.1% | 5.9ms | 0.0% | 0us | `parseVarId` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:4503` |
| 0.1% | 5.7ms | 0.1% | 4.2ms | `expand` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/registry.ts:242` |
| 0.1% | 5.6ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:752` |
| 0.1% | 5.1ms | 0.1% | 5.1ms | `sub` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/registry.ts:288` |
| 0.1% | 5.1ms | 0.0% | 0us | `tsParseInterfaceBody` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:3420` |
| 0.1% | 5.1ms | 0.0% | 0us | `tsParseInterfaceDeclaration` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:3408` |
| 0.1% | 5.0ms | 0.0% | 0us | `(module)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/types.ts:16` |
| 0.1% | 4.9ms | 0.0% | 1.4ms | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts:499` |
| 0.1% | 4.5ms | 0.1% | 4.5ms | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs` |
| 0.1% | 4.4ms | 0.0% | 0us | `parseMaybeConditional` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:4198` |
| 0.1% | 4.3ms | 0.0% | 0us | `checkSources` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/core.ts:71` |
| 0.1% | 4.3ms | 0.0% | 0us | `distinctNames` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/core.ts:393` |
| 0.1% | 4.3ms | 0.0% | 0us | `parseExportDeclaration` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:4241` |
| 0.1% | 4.3ms | 0.0% | 0us | `parseExport` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:3962` |
| 0.1% | 4.0ms | 0.0% | 0us | `tsParseTypeAliasDeclaration` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:3555` |
| 0.1% | 3.5ms | 0.1% | 3.5ms | `[Symbol.iterator]` | `[native code]` |
| 0.1% | 3.3ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:6243` |
| 0.1% | 3.3ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:6269` |
| 0.1% | 3.2ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:1241` |
| 0.1% | 3.2ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:1349` |
| 0.0% | 3.2ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:2302` |
| 0.0% | 3.2ms | 0.0% | 0us | `parseAssignableListItem` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:4678` |
| 0.0% | 3.2ms | 0.0% | 0us | `parseBindingListItem` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:4716` |
| 0.0% | 3.1ms | 0.0% | 0us | `parseFunctionBody` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:3732` |
| 0.0% | 3.1ms | 0.0% | 0us | `parseArrowExpression` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:4525` |
| 0.0% | 3.0ms | 0.0% | 0us | `internal:shared` | `internal:shared:2` |
| 0.0% | 3.0ms | 0.0% | 0us | `internal:validators` | `internal:validators:2` |
| 0.0% | 3.0ms | 0.0% | 0us | `node:events` | `node:events:10` |
| 0.0% | 3.0ms | 0.0% | 0us | `bound call` | `[native code]` |
| 0.0% | 3.0ms | 0.0% | 0us | `node:fs` | `node:fs:2` |
| 0.0% | 3.0ms | 0.0% | 0us | `node:fs/promises` | `node:fs/promises:2` |
| 0.0% | 3.0ms | 0.0% | 0us | `internal:primordials` | `internal:primordials:80` |
| 0.0% | 3.0ms | 0.0% | 0us | `makeSafe` | `internal:primordials:31` |
| 0.0% | 3.0ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:1099` |
| 0.0% | 2.8ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:827` |
| 0.0% | 2.7ms | 0.0% | 1.3ms | `readFileSync` | `[native code]` |
| 0.0% | 2.3ms | 0.0% | 0us | `tsParseNonArrayType` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2850` |
| 0.0% | 2.0ms | 0.0% | 0us | `tsFillSignature` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2573` |
| 0.0% | 2.0ms | 0.0% | 0us | `tsParseFunctionOrConstructorType` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2599` |
| 0.0% | 2.0ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2522` |
| 0.0% | 2.0ms | 0.0% | 0us | `begin` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:980` |
| 0.0% | 2.0ms | 0.0% | 2.0ms | `captureParserCheckpoint` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:1220` |
| 0.0% | 2.0ms | 0.0% | 0us | `tsParseTypeOrTypePredicateAnnotation` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2506` |
| 0.0% | 2.0ms | 0.0% | 0us | `tsTryParse` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:3028` |
| 0.0% | 1.7ms | 0.0% | 1.7ms | `parseMaybeConditional` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js` |
| 0.0% | 1.7ms | 0.0% | 1.7ms | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:2775` |
| 0.0% | 1.7ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:3610` |
| 0.0% | 1.7ms | 0.0% | 1.7ms | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:2235` |
| 0.0% | 1.7ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:1470` |
| 0.0% | 1.7ms | 0.0% | 1.7ms | `isIdentifierChar` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:74` |
| 0.0% | 1.7ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:1239` |
| 0.0% | 1.7ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:3260` |
| 0.0% | 1.7ms | 0.0% | 1.7ms | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts` |
| 0.0% | 1.7ms | 0.0% | 0us | `fnExpr` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts:1047` |
| 0.0% | 1.6ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:1545` |
| 0.0% | 1.6ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:1249` |
| 0.0% | 1.6ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:6041` |
| 0.0% | 1.6ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:1504` |
| 0.0% | 1.5ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:3647` |
| 0.0% | 1.5ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:1485` |
| 0.0% | 1.5ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:3677` |
| 0.0% | 1.5ms | 0.0% | 0us | `checkLValInnerPattern` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:4703` |
| 0.0% | 1.5ms | 0.0% | 1.5ms | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:2457` |
| 0.0% | 1.5ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:1484` |
| 0.0% | 1.5ms | 0.0% | 1.5ms | `isIdentifierChar` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs` |
| 0.0% | 1.5ms | 0.0% | 1.5ms | `checkSources` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/core.ts` |
| 0.0% | 1.5ms | 0.0% | 1.5ms | `tsParseNonArrayType` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2862` |
| 0.0% | 1.5ms | 0.0% | 0us | `tsFillSignature` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2575` |
| 0.0% | 1.5ms | 0.0% | 0us | `checkSources` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/core.ts:375` |
| 0.0% | 1.5ms | 0.0% | 1.5ms | `some` | `[native code]` |
| 0.0% | 1.5ms | 0.0% | 0us | `freeUses` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/facts.ts:38` |
| 0.0% | 1.5ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/core.ts:376` |
| 0.0% | 1.5ms | 0.0% | 0us | `factsOf` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/facts.ts:43` |
| 0.0% | 1.5ms | 0.0% | 0us | `walk` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/facts.ts:30` |
| 0.0% | 1.5ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:2295` |
| 0.0% | 1.5ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:3715` |
| 0.0% | 1.5ms | 0.0% | 1.5ms | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:624` |
| 0.0% | 1.5ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:3744` |
| 0.0% | 1.5ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:2262` |
| 0.0% | 1.4ms | 0.0% | 0us | `um` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts:111` |
| 0.0% | 1.4ms | 0.0% | 0us | `member` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts:754` |
| 0.0% | 1.4ms | 0.0% | 0us | `flatIntoArrayWithCallback` | `[native code]` |
| 0.0% | 1.4ms | 0.0% | 1.4ms | `literal` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/registry.ts:208` |
| 0.0% | 1.4ms | 0.0% | 0us | `check1` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts:444` |
| 0.0% | 1.4ms | 0.0% | 0us | `collapseArrays` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts:795` |
| 0.0% | 1.4ms | 0.0% | 1.4ms | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:3977` |
| 0.0% | 1.4ms | 0.0% | 1.4ms | `filter` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts:120` |
| 0.0% | 1.4ms | 0.0% | 0us | `narrow` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts:279` |
| 0.0% | 1.4ms | 0.0% | 0us | `cond` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts:297` |
| 0.0% | 1.4ms | 0.0% | 0us | `conditional` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts:691` |
| 0.0% | 1.3ms | 0.0% | 0us | `(module)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/profile-call.ts:7` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js` |
| 0.0% | 1.3ms | 0.0% | 0us | `tsParseSignatureMember` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:3278` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:2287` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `join` | `[native code]` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `tsParseModifiers` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:3081` |
| 0.0% | 1.3ms | 0.0% | 0us | `tsParseTypeMember` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:3353` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `parseSubscript` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:5031` |
| 0.0% | 1.2ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:2948` |
| 0.0% | 1.2ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:2969` |
| 0.0% | 1.2ms | 0.0% | 0us | `load` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/registry.ts:83` |
| 0.0% | 1.2ms | 0.0% | 0us | `Registry` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/registry.ts:50` |
| 0.0% | 1.2ms | 0.0% | 0us | `convert` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/registry.ts:187` |
| 0.0% | 1.2ms | 0.0% | 0us | `sig` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/registry.ts:123` |
| 0.0% | 1.2ms | 0.0% | 0us | `literal` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/registry.ts:212` |
| 0.0% | 1.2ms | 0.0% | 0us | `tsParseNonConditionalType` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2916` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `isAbstractConstructorSignature` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js` |
| 0.0% | 1.2ms | 0.0% | 0us | `tsParsePropertyOrMethodSignature` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:3332` |
| 0.0% | 1.2ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:3445` |
| 0.0% | 1.2ms | 0.0% | 0us | `tsParseInterfaceDeclaration` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:3394` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `tokenIsIdentifier` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js` |
| 0.0% | 1.1ms | 0.0% | 0us | `parseVarStatement` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:4122` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `readWord` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:1933` |
| 0.0% | 1.1ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:810` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `tsParseTypeMemberSemicolon` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:3263` |
| 0.0% | 1.1ms | 0.0% | 0us | `tsParsePropertyOrMethodSignature` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:3294` |
| 0.0% | 1.1ms | 0.0% | 0us | `hidden` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts:492` |
| 0.0% | 1.1ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2474` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `readToken` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:1624` |
| 0.0% | 1.0ms | 0.0% | 0us | `tsIsStartOfMappedType` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2072` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:5617` |
| 0.0% | 1.0ms | 0.0% | 0us | `tsLookAhead` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:1897` |
| 0.0% | 1.0ms | 0.0% | 0us | `bound tsIsStartOfMappedType` | `[native code]` |
| 0.0% | 1.0ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:5535` |

## Function Details

### `show`
`[native code]` | Self: 32.2% (1.04s) | Total: 83.5% (2.69s) | Samples: 700

**Called by:**
- `(anonymous)` (1451)
- `s` (353)
- `sub` (1)

**Calls:**
- `map` (777)
- `performIteration` (207)
- `stringify` (81)
- `s` (21)
- `filter` (18)
- `join` (1)

### `map`
`[native code]` | Self: 10.9% (353.7ms) | Total: 38.6% (1.24s) | Samples: 235

**Called by:**
- `show` (777)
- `(anonymous)` (36)
- `link` (9)
- `value` (5)
- `checkSources` (1)

**Calls:**
- `(anonymous)` (566)
- `s` (13)
- `(anonymous)` (8)
- `value` (3)
- `value` (2)
- `(anonymous)` (1)

### `(anonymous)`
`[native code]` | Self: 10.8% (347.9ms) | Total: 100.0% (3.60s) | Samples: 230

**Called by:**
- `sub` (1542)
- `map` (566)
- `holds` (142)
- `isAlias` (82)
- `expand` (54)
- `expand` (31)
- `convert` (1)

**Calls:**
- `show` (1451)
- `s` (444)
- `decl` (126)
- `performIteration` (52)
- `sub` (41)
- `map` (36)
- `member` (23)
- `flatMap` (10)
- `expand` (3)
- `expand` (2)

### `performIteration`
`[native code]` | Self: 10.6% (343.5ms) | Total: 12.0% (388.6ms) | Samples: 230

**Called by:**
- `show` (207)
- `(anonymous)` (52)

**Calls:**
- `entries` (27)
- `[Symbol.iterator]` (2)

### `sub`
`[native code]` | Self: 9.2% (299.2ms) | Total: 100.0% (3.64s) | Samples: 202

**Called by:**
- `filter` (1817)
- `sub` (583)
- `(anonymous)` (41)
- `expect` (8)

**Calls:**
- `(anonymous)` (1542)
- `sub` (583)
- `isAlias` (57)
- `expand` (36)
- `expand` (18)
- `expand` (9)
- `expand` (1)
- `show` (1)

### `s`
`[native code]` | Self: 5.8% (187.1ms) | Total: 22.1% (712.5ms) | Samples: 125

**Called by:**
- `(anonymous)` (444)
- `show` (21)
- `map` (13)

**Calls:**
- `show` (353)

### `decl`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/registry.ts:105` | Self: 5.7% (185.2ms) | Total: 5.7% (185.2ms) | Samples: 126

**Called by:**
- `(anonymous)` (126)

### `stringify`
`[native code]` | Self: 3.7% (119.3ms) | Total: 3.7% (119.3ms) | Samples: 81

**Called by:**
- `show` (81)

### `holds`
`[native code]` | Self: 3.2% (104.2ms) | Total: 100.0% (5.34s) | Samples: 71

**Called by:**
- `holds` (3303)
- `checkSources` (280)

**Calls:**
- `holds` (3303)
- `(anonymous)` (142)
- `isAlias` (25)
- `expand` (21)
- `expand` (14)
- `expand` (4)
- `expand` (3)

### `entries`
`[native code]` | Self: 1.2% (41.5ms) | Total: 1.2% (41.5ms) | Samples: 27

**Called by:**
- `performIteration` (27)

### `filter`
`[native code]` | Self: 1.2% (41.1ms) | Total: 85.3% (2.75s) | Samples: 27

**Called by:**
- `hidden` (1831)
- `show` (18)

**Calls:**
- `sub` (1817)
- `(anonymous)` (4)
- `sub` (1)

### `expand`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/registry.ts` | Self: 0.8% (26.5ms) | Total: 0.8% (26.5ms) | Samples: 18

**Called by:**
- `sub` (9)
- `member` (6)
- `(anonymous)` (3)

### `member`
`[native code]` | Self: 0.7% (24.5ms) | Total: 1.0% (33.4ms) | Samples: 17

**Called by:**
- `member` (23)

**Calls:**
- `expand` (6)

### `flatMap`
`[native code]` | Self: 0.4% (14.9ms) | Total: 0.4% (14.9ms) | Samples: 10

**Called by:**
- `(anonymous)` (10)

### `expand`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/registry.ts:234` | Self: 0.2% (8.8ms) | Total: 0.2% (8.8ms) | Samples: 6

**Called by:**
- `holds` (4)
- `hidden` (1)
- `sub` (1)

### `expand`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/registry.ts:232` | Self: 0.2% (7.5ms) | Total: 2.7% (88.3ms) | Samples: 5

**Called by:**
- `sub` (36)
- `holds` (21)
- `(anonymous)` (2)

**Calls:**
- `(anonymous)` (54)

### `hidden`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts:488` | Self: 0.1% (6.0ms) | Total: 0.1% (6.0ms) | Samples: 4

**Called by:**
- `hidden` (3)
- `hidden` (1)

### `sub`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/registry.ts:288` | Self: 0.1% (5.1ms) | Total: 0.1% (5.1ms) | Samples: 4

**Called by:**
- `(anonymous)` (3)
- `filter` (1)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs` | Self: 0.1% (4.5ms) | Total: 0.1% (4.5ms) | Samples: 3

**Called by:**
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)

### `expand`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/registry.ts:242` | Self: 0.1% (4.2ms) | Total: 0.1% (5.7ms) | Samples: 3

**Called by:**
- `holds` (3)
- `um` (1)

**Calls:**
- `literal` (1)

### `[Symbol.iterator]`
`[native code]` | Self: 0.1% (3.5ms) | Total: 0.1% (3.5ms) | Samples: 2

**Called by:**
- `performIteration` (2)

### `forEach`
`[native code]` | Self: 0.0% (3.0ms) | Total: 85.3% (2.74s) | Samples: 1

**Called by:**
- `apply` (1847)
- `fnExpr` (1)
- `bound call` (1)

**Calls:**
- `(anonymous)` (1847)
- `(anonymous)` (1)

### `hidden`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts:499` | Self: 0.0% (2.9ms) | Total: 100.0% (5.43s) | Samples: 2

**Called by:**
- `hidden` (3659)

**Calls:**
- `filter` (1831)
- `hidden` (1825)
- `hidden` (1)

### `captureParserCheckpoint`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:1220` | Self: 0.0% (2.0ms) | Total: 0.0% (2.0ms) | Samples: 1

**Called by:**
- `begin` (1)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:2774` | Self: 0.0% (1.7ms) | Total: 1.0% (35.1ms) | Samples: 1

**Called by:**
- `(anonymous)` (8)
- `(anonymous)` (8)
- `(anonymous)` (6)

**Calls:**
- `(anonymous)` (21)

### `parseMaybeConditional`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js` | Self: 0.0% (1.7ms) | Total: 0.0% (1.7ms) | Samples: 1

**Called by:**
- `parseMaybeAssignOrigin` (1)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:2775` | Self: 0.0% (1.7ms) | Total: 0.0% (1.7ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:2235` | Self: 0.0% (1.7ms) | Total: 0.0% (1.7ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `isIdentifierChar`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:74` | Self: 0.0% (1.7ms) | Total: 0.0% (1.7ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts` | Self: 0.0% (1.7ms) | Total: 0.0% (1.7ms) | Samples: 1

**Called by:**
- `forEach` (1)

### `expand`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/registry.ts:233` | Self: 0.0% (1.6ms) | Total: 1.5% (49.1ms) | Samples: 1

**Called by:**
- `sub` (18)
- `holds` (14)

**Calls:**
- `(anonymous)` (31)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:2457` | Self: 0.0% (1.5ms) | Total: 0.0% (1.5ms) | Samples: 1

**Called by:**
- `checkLValInnerPattern` (1)

### `isIdentifierChar`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs` | Self: 0.0% (1.5ms) | Total: 0.0% (1.5ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `checkSources`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/core.ts` | Self: 0.0% (1.5ms) | Total: 0.0% (1.5ms) | Samples: 1

**Called by:**
- `(module)` (1)

### `tsParseNonArrayType`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2862` | Self: 0.0% (1.5ms) | Total: 0.0% (1.5ms) | Samples: 1

**Called by:**
- `tsParseArrayTypeOrHigher` (1)

### `some`
`[native code]` | Self: 0.0% (1.5ms) | Total: 0.0% (1.5ms) | Samples: 1

**Called by:**
- `walk` (1)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:624` | Self: 0.0% (1.5ms) | Total: 0.0% (1.5ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `literal`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/registry.ts:208` | Self: 0.0% (1.4ms) | Total: 0.0% (1.4ms) | Samples: 1

**Called by:**
- `expand` (1)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts:499` | Self: 0.0% (1.4ms) | Total: 0.1% (4.9ms) | Samples: 1

**Called by:**
- `filter` (4)

**Calls:**
- `sub` (3)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:3977` | Self: 0.0% (1.4ms) | Total: 0.0% (1.4ms) | Samples: 1

**Called by:**
- `tsParseArrayTypeOrHigher` (1)

### `filter`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts:120` | Self: 0.0% (1.4ms) | Total: 0.0% (1.4ms) | Samples: 1

**Called by:**
- `narrow` (1)

### `readFileSync`
`[native code]` | Self: 0.0% (1.3ms) | Total: 0.0% (2.7ms) | Samples: 1

**Called by:**
- `(module)` (1)
- `readFileSync` (1)

**Calls:**
- `readFileSync` (1)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js` | Self: 0.0% (1.3ms) | Total: 0.0% (1.3ms) | Samples: 1

**Called by:**
- `tsInType` (1)

### `hidden`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts:514` | Self: 0.0% (1.3ms) | Total: 84.2% (2.71s) | Samples: 1

**Called by:**
- `hidden` (1825)

**Calls:**
- `hidden` (1824)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:2287` | Self: 0.0% (1.3ms) | Total: 0.0% (1.3ms) | Samples: 1

**Called by:**
- `tsParseBindingListForSignature` (1)

### `join`
`[native code]` | Self: 0.0% (1.3ms) | Total: 0.0% (1.3ms) | Samples: 1

**Called by:**
- `show` (1)

### `tsParseModifiers`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:3081` | Self: 0.0% (1.3ms) | Total: 0.0% (1.3ms) | Samples: 1

**Called by:**
- `tsParseTypeMember` (1)

### `parseSubscript`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:5031` | Self: 0.0% (1.2ms) | Total: 0.0% (1.2ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `isAbstractConstructorSignature`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js` | Self: 0.0% (1.2ms) | Total: 0.0% (1.2ms) | Samples: 1

**Called by:**
- `tsParseNonConditionalType` (1)

### `tokenIsIdentifier`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js` | Self: 0.0% (1.2ms) | Total: 0.0% (1.2ms) | Samples: 1

**Called by:**
- `tsParseInterfaceDeclaration` (1)

### `readWord`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:1933` | Self: 0.0% (1.1ms) | Total: 0.0% (1.1ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `tsParseTypeMemberSemicolon`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:3263` | Self: 0.0% (1.1ms) | Total: 0.0% (1.1ms) | Samples: 1

**Called by:**
- `tsParsePropertyOrMethodSignature` (1)

### `readToken`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:1624` | Self: 0.0% (1.1ms) | Total: 0.0% (1.1ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:5617` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `(module)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/profile-call.ts:7` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Calls:**
- `readFileSync` (1)

### `freeUses`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/facts.ts:38` | Self: 0.0% (0us) | Total: 0.0% (1.5ms) | Samples: 0

**Called by:**
- `factsOf` (1)

**Calls:**
- `walk` (1)

### `checkSources`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/core.ts:71` | Self: 0.0% (0us) | Total: 0.1% (4.3ms) | Samples: 0

**Called by:**
- `(module)` (3)

**Calls:**
- `distinctNames` (3)

### `parseVarId`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:4503` | Self: 0.0% (0us) | Total: 0.1% (5.9ms) | Samples: 0

**Called by:**
- `(anonymous)` (4)

**Calls:**
- `tsParseTypeAnnotation` (4)

### `tsInAllowConditionalTypesContext`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2437` | Self: 0.0% (0us) | Total: 0.3% (12.2ms) | Samples: 0

**Called by:**
- `tsParseTypeOperatorOrHigher` (6)
- `tsParseFunctionOrConstructorType` (1)
- `bound tsParseTypeOperatorOrHigher` (1)

**Calls:**
- `tsParseArrayTypeOrHigher` (7)
- `tsFillSignature` (1)

### `conditional`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts:692` | Self: 0.0% (0us) | Total: 85.2% (2.74s) | Samples: 0

**Called by:**
- `check1` (1847)

**Calls:**
- `check` (1847)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:1249` | Self: 0.0% (0us) | Total: 0.0% (1.6ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `(anonymous)` (1)

### `factsOf`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/facts.ts:43` | Self: 0.0% (0us) | Total: 0.0% (1.5ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `freeUses` (1)

### `hidden`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts:492` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `hidden` (1)

**Calls:**
- `expand` (1)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2474` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `tsInType` (1)

**Calls:**
- `(anonymous)` (1)

### `parseVarStatement`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:4121` | Self: 0.0% (0us) | Total: 0.2% (7.5ms) | Samples: 0

**Called by:**
- `tsInAmbientContext` (4)
- `parseExportDeclaration` (1)

**Calls:**
- `(anonymous)` (4)
- `(anonymous)` (1)

### `tsParseInterfaceDeclaration`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:3394` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `parseStatement` (1)

**Calls:**
- `tokenIsIdentifier` (1)

### `tsParseList`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:3380` | Self: 0.0% (0us) | Total: 0.3% (11.3ms) | Samples: 0

**Called by:**
- `tsParseObjectTypeMembers` (4)
- `tsParseInterfaceBody` (4)

**Calls:**
- `bound tsParseTypeMember` (8)

### `parseExport`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:3962` | Self: 0.0% (0us) | Total: 0.1% (4.3ms) | Samples: 0

**Called by:**
- `(anonymous)` (3)

**Calls:**
- `parseExportDeclaration` (3)

### `tsFillSignature`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2571` | Self: 0.0% (0us) | Total: 0.1% (6.0ms) | Samples: 0

**Called by:**
- `tsParsePropertyOrMethodSignature` (3)
- `tsParseSignatureMember` (1)

**Calls:**
- `tsParseBindingListForSignature` (4)

### `peek`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/registry.ts:99` | Self: 0.0% (0us) | Total: 84.8% (2.73s) | Samples: 0

**Called by:**
- `hides` (1023)
- `hides` (816)

**Calls:**
- `hidden` (1839)

### `tsParseNonConditionalType`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2916` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `tsParseType` (1)

**Calls:**
- `isAbstractConstructorSignature` (1)

### `value`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/link.ts:27` | Self: 0.0% (0us) | Total: 0.2% (8.4ms) | Samples: 0

**Called by:**
- `(anonymous)` (3)
- `map` (2)

**Calls:**
- `map` (5)

### `checkSources`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/core.ts:64` | Self: 0.0% (0us) | Total: 0.5% (19.1ms) | Samples: 0

**Called by:**
- `(module)` (14)

**Calls:**
- `Registry` (13)
- `Registry` (1)

### `cond`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts:297` | Self: 0.0% (0us) | Total: 0.0% (1.4ms) | Samples: 0

**Called by:**
- `conditional` (1)

**Calls:**
- `narrow` (1)

### `fnExpr`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts:1089` | Self: 0.0% (0us) | Total: 85.4% (2.75s) | Samples: 0

**Called by:**
- `checkSources` (1850)
- `infer` (1)

**Calls:**
- `returned` (1851)

### `load`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/registry.ts:83` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `Registry` (1)

**Calls:**
- `literal` (1)

### `check1`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts:443` | Self: 0.0% (0us) | Total: 85.2% (2.74s) | Samples: 0

**Called by:**
- `check` (1847)

**Calls:**
- `call` (1847)

### `tsParseNonArrayType`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2850` | Self: 0.0% (0us) | Total: 0.0% (2.3ms) | Samples: 0

**Called by:**
- `tsParseArrayTypeOrHigher` (2)

**Calls:**
- `tsParseTypeLiteral` (1)
- `tsLookAhead` (1)

### `tsInType`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2960` | Self: 0.0% (0us) | Total: 0.6% (19.6ms) | Samples: 0

**Called by:**
- `tsParseTypeAnnotation` (8)
- `tsParseTypeAliasDeclaration` (3)
- `tsFillSignature` (1)
- `tsParseTypeOrTypePredicateAnnotation` (1)

**Calls:**
- `(anonymous)` (7)
- `tsParseType` (2)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `tsParseTypeAnnotation` (1)

### `conditional`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts:691` | Self: 0.0% (0us) | Total: 0.0% (1.4ms) | Samples: 0

**Called by:**
- `check1` (1)

**Calls:**
- `cond` (1)

### `member`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/registry.ts:282` | Self: 0.0% (0us) | Total: 1.0% (33.4ms) | Samples: 0

**Called by:**
- `(anonymous)` (23)

**Calls:**
- `member` (23)

### `bound tsParseIntersectionTypeOrHigher`
`[native code]` | Self: 0.0% (0us) | Total: 0.3% (10.2ms) | Samples: 0

**Called by:**
- `tsParseUnionOrIntersectionType` (7)

**Calls:**
- `tsParseUnionOrIntersectionType` (7)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:6041` | Self: 0.0% (0us) | Total: 0.0% (1.6ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `(anonymous)` (1)

### `(module)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/types.ts:16` | Self: 0.0% (0us) | Total: 0.1% (5.0ms) | Samples: 0

**Calls:**
- `link` (3)

### `flatIntoArrayWithCallback`
`[native code]` | Self: 0.0% (0us) | Total: 0.0% (1.4ms) | Samples: 0

**Called by:**
- `collapseArrays` (1)

**Calls:**
- `um` (1)

### `value`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/link.ts:26` | Self: 0.0% (0us) | Total: 0.4% (13.0ms) | Samples: 0

**Called by:**
- `(anonymous)` (5)
- `map` (3)

**Calls:**
- `(anonymous)` (8)

### `tsParsePropertyOrMethodSignature`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:3294` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `bound tsParseTypeMember` (1)

**Calls:**
- `tsParseTypeMemberSemicolon` (1)

### `hidden`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts:494` | Self: 0.0% (0us) | Total: 100.0% (5.79s) | Samples: 0

**Called by:**
- `peek` (1839)
- `hidden` (1824)
- `hidden` (234)

**Calls:**
- `hidden` (3659)
- `hidden` (234)
- `hidden` (3)
- `hidden` (1)

### `tsParseTypeOperatorOrHigher`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2894` | Self: 0.0% (0us) | Total: 0.2% (8.6ms) | Samples: 0

**Called by:**
- `bound tsParseTypeOperatorOrHigher` (6)

**Calls:**
- `tsInAllowConditionalTypesContext` (6)

### `internal:shared`
`internal:shared:2` | Self: 0.0% (0us) | Total: 0.0% (3.0ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `bound tsParseTypeMember`
`[native code]` | Self: 0.0% (0us) | Total: 0.3% (11.3ms) | Samples: 0

**Called by:**
- `tsParseList` (8)

**Calls:**
- `tsParsePropertyOrMethodSignature` (4)
- `tsParseTypeMember` (1)
- `tsParseSignatureMember` (1)
- `tsParsePropertyOrMethodSignature` (1)
- `tsParsePropertyOrMethodSignature` (1)

### `tsParseInterfaceBody`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:3420` | Self: 0.0% (0us) | Total: 0.1% (5.1ms) | Samples: 0

**Called by:**
- `tsParseInterfaceDeclaration` (4)

**Calls:**
- `tsParseList` (4)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:3650` | Self: 0.0% (0us) | Total: 0.2% (8.2ms) | Samples: 0

**Called by:**
- `(anonymous)` (4)
- `(anonymous)` (1)

**Calls:**
- `(anonymous)` (5)

### `call`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts:1232` | Self: 0.0% (0us) | Total: 85.2% (2.74s) | Samples: 0

**Called by:**
- `check1` (1847)

**Calls:**
- `apply` (1847)

### `node:events`
`node:events:10` | Self: 0.0% (0us) | Total: 0.0% (3.0ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `parseExportDeclaration`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:4241` | Self: 0.0% (0us) | Total: 0.1% (4.3ms) | Samples: 0

**Called by:**
- `parseExport` (3)

**Calls:**
- `tsParseTypeAliasDeclaration` (2)
- `parseVarStatement` (1)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:1504` | Self: 0.0% (0us) | Total: 0.0% (1.6ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `(anonymous)` (1)

### `parseArrowExpression`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:4525` | Self: 0.0% (0us) | Total: 0.0% (3.1ms) | Samples: 0

**Called by:**
- `(anonymous)` (2)

**Calls:**
- `parseFunctionBody` (2)

### `check1`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts:434` | Self: 0.0% (0us) | Total: 85.2% (2.74s) | Samples: 0

**Called by:**
- `check` (1848)

**Calls:**
- `conditional` (1847)
- `conditional` (1)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:3260` | Self: 0.0% (0us) | Total: 0.0% (1.7ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `(anonymous)` (1)

### `Registry`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/registry.ts:49` | Self: 0.0% (0us) | Total: 0.5% (17.9ms) | Samples: 0

**Called by:**
- `checkSources` (13)

**Calls:**
- `parse` (13)

### `bound tsIsStartOfMappedType`
`[native code]` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `tsLookAhead` (1)

**Calls:**
- `tsIsStartOfMappedType` (1)

### `tsParseInterfaceDeclaration`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:3408` | Self: 0.0% (0us) | Total: 0.1% (5.1ms) | Samples: 0

**Called by:**
- `parseStatement` (4)

**Calls:**
- `tsParseInterfaceBody` (4)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:2295` | Self: 0.0% (0us) | Total: 0.0% (1.5ms) | Samples: 0

**Called by:**
- `tsParseBindingListForSignature` (1)

**Calls:**
- `(anonymous)` (1)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:1239` | Self: 0.0% (0us) | Total: 0.0% (1.7ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `(anonymous)` (1)

### `walk`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/facts.ts:30` | Self: 0.0% (0us) | Total: 0.0% (1.5ms) | Samples: 0

**Called by:**
- `freeUses` (1)

**Calls:**
- `some` (1)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:5542` | Self: 0.0% (0us) | Total: 0.2% (7.2ms) | Samples: 0

**Called by:**
- `(anonymous)` (5)

**Calls:**
- `(anonymous)` (2)
- `readToken` (1)
- `(anonymous)` (1)
- `readWord` (1)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:752` | Self: 0.0% (0us) | Total: 0.1% (5.6ms) | Samples: 0

**Called by:**
- `(anonymous)` (2)
- `(anonymous)` (1)
- `(anonymous)` (1)

**Calls:**
- `(anonymous)` (4)

### `tsLookAhead`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:1897` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `tsParseNonArrayType` (1)

**Calls:**
- `bound tsIsStartOfMappedType` (1)

### `parseFunctionBody`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:3732` | Self: 0.0% (0us) | Total: 0.0% (3.1ms) | Samples: 0

**Called by:**
- `parseArrowExpression` (2)

**Calls:**
- `(anonymous)` (1)
- `(anonymous)` (1)

### `tsTryParse`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:3028` | Self: 0.0% (0us) | Total: 0.0% (2.0ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `begin` (1)

### `stmt`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts:1465` | Self: 0.0% (0us) | Total: 85.2% (2.74s) | Samples: 0

**Called by:**
- `stmts` (1848)

**Calls:**
- `returned` (1848)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:3126` | Self: 0.0% (0us) | Total: 1.0% (35.3ms) | Samples: 0

**Called by:**
- `(anonymous)` (22)

**Calls:**
- `(anonymous)` (10)
- `(anonymous)` (9)
- `parseArrowExpression` (2)
- `(anonymous)` (1)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:827` | Self: 0.0% (0us) | Total: 0.0% (2.8ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)
- `(anonymous)` (1)

**Calls:**
- `(anonymous)` (2)

### `internal:validators`
`internal:validators:2` | Self: 0.0% (0us) | Total: 0.0% (3.0ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `(module)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/profile-call.ts:16` | Self: 0.0% (0us) | Total: 99.1% (3.19s) | Samples: 0

**Calls:**
- `checkSources` (1850)
- `checkSources` (280)
- `checkSources` (14)
- `checkSources` (3)
- `checkSources` (1)
- `checkSources` (1)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:2969` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `parseSubscript` (1)

### `narrow`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts:279` | Self: 0.0% (0us) | Total: 0.0% (1.4ms) | Samples: 0

**Called by:**
- `cond` (1)

**Calls:**
- `filter` (1)

### `parseExpressionStatement`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:4175` | Self: 0.0% (0us) | Total: 0.2% (8.5ms) | Samples: 0

**Called by:**
- `(anonymous)` (6)

**Calls:**
- `tsParseExpressionStatement` (5)
- `tsParseTypeAliasDeclaration` (1)

### `fnExpr`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts:1047` | Self: 0.0% (0us) | Total: 0.0% (1.7ms) | Samples: 0

**Called by:**
- `infer` (1)

**Calls:**
- `forEach` (1)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:3715` | Self: 0.0% (0us) | Total: 0.0% (1.5ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `(anonymous)` (1)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:1484` | Self: 0.0% (0us) | Total: 0.0% (1.5ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `(anonymous)` (1)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:5535` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `(anonymous)` (1)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:3297` | Self: 0.0% (0us) | Total: 0.4% (14.2ms) | Samples: 0

**Called by:**
- `(anonymous)` (9)

**Calls:**
- `(anonymous)` (8)
- `(anonymous)` (1)

### `checkLValInnerPattern`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:4703` | Self: 0.0% (0us) | Total: 0.0% (1.5ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `(anonymous)` (1)

### `check`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts:424` | Self: 0.0% (0us) | Total: 100.0% (10.98s) | Samples: 0

**Called by:**
- `returned` (3699)
- `conditional` (1847)
- `(anonymous)` (1847)

**Calls:**
- `infer` (1850)
- `check1` (1848)
- `check1` (1847)
- `check1` (1847)
- `check1` (1)

### `link`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/link.ts:37` | Self: 0.0% (0us) | Total: 0.6% (22.1ms) | Samples: 0

**Called by:**
- `(module)` (6)
- `(module)` (3)

**Calls:**
- `map` (9)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2475` | Self: 0.0% (0us) | Total: 0.3% (10.8ms) | Samples: 0

**Called by:**
- `tsInType` (7)

**Calls:**
- `tsParseType` (7)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:890` | Self: 0.0% (0us) | Total: 0.6% (22.2ms) | Samples: 0

**Called by:**
- `(anonymous)` (16)

**Calls:**
- `parseExpressionStatement` (6)
- `parseStatement` (5)
- `parseExport` (3)
- `(anonymous)` (2)

### `convert`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/registry.ts:187` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `sig` (1)

**Calls:**
- `(anonymous)` (1)

### `apply`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts:1296` | Self: 0.0% (0us) | Total: 85.2% (2.74s) | Samples: 0

**Called by:**
- `call` (1847)

**Calls:**
- `forEach` (1847)

### `tsParseSignatureMember`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:3278` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `bound tsParseTypeMember` (1)

**Calls:**
- `tsFillSignature` (1)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:2948` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `(anonymous)` (1)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/core.ts:376` | Self: 0.0% (0us) | Total: 0.0% (1.5ms) | Samples: 0

**Called by:**
- `map` (1)

**Calls:**
- `factsOf` (1)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:3445` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `(anonymous)` (1)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:1483` | Self: 0.0% (0us) | Total: 0.2% (7.6ms) | Samples: 0

**Called by:**
- `parseVarStatement` (4)
- `(anonymous)` (1)

**Calls:**
- `parseVarId` (4)
- `(anonymous)` (1)

### `Registry`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/registry.ts:50` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `checkSources` (1)

**Calls:**
- `load` (1)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:1545` | Self: 0.0% (0us) | Total: 0.0% (1.6ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `(anonymous)` (1)

### `parseMaybeConditional`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:4198` | Self: 0.0% (0us) | Total: 0.1% (4.4ms) | Samples: 0

**Called by:**
- `parseMaybeAssignOrigin` (3)

**Calls:**
- `(anonymous)` (3)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:5503` | Self: 0.0% (0us) | Total: 0.2% (8.3ms) | Samples: 0

**Called by:**
- `(anonymous)` (4)
- `tsIsStartOfMappedType` (1)
- `(anonymous)` (1)

**Calls:**
- `(anonymous)` (5)
- `(anonymous)` (1)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:3677` | Self: 0.0% (0us) | Total: 0.0% (1.5ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `checkLValInnerPattern` (1)

### `parse`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/parse.ts:30` | Self: 0.0% (0us) | Total: 0.6% (22.2ms) | Samples: 0

**Called by:**
- `Registry` (13)
- `distinctNames` (3)

**Calls:**
- `(anonymous)` (16)

### `literal`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/registry.ts:212` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `load` (1)

**Calls:**
- `sig` (1)

### `tsParseBindingListForSignature`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2443` | Self: 0.0% (0us) | Total: 0.1% (6.0ms) | Samples: 0

**Called by:**
- `tsFillSignature` (4)

**Calls:**
- `(anonymous)` (2)
- `(anonymous)` (1)
- `(anonymous)` (1)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:810` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `parseVarStatement` (1)

**Calls:**
- `(anonymous)` (1)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:2736` | Self: 0.0% (0us) | Total: 0.5% (16.1ms) | Samples: 0

**Called by:**
- `(anonymous)` (10)

**Calls:**
- `(anonymous)` (8)
- `parseMaybeAssignOrigin` (2)

### `stmts`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts:1428` | Self: 0.0% (0us) | Total: 85.2% (2.74s) | Samples: 0

**Called by:**
- `fnExpr` (1848)

**Calls:**
- `stmt` (1848)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:2262` | Self: 0.0% (0us) | Total: 0.0% (1.5ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `(anonymous)` (1)

### `hides`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts:463` | Self: 0.0% (0us) | Total: 46.9% (1.51s) | Samples: 0

**Called by:**
- `check1` (1023)

**Calls:**
- `peek` (1023)

### `parseAssignableListItem`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:4678` | Self: 0.0% (0us) | Total: 0.0% (3.2ms) | Samples: 0

**Called by:**
- `(anonymous)` (2)

**Calls:**
- `parseBindingListItem` (2)

### `node:fs`
`node:fs:2` | Self: 0.0% (0us) | Total: 0.0% (3.0ms) | Samples: 0

**Calls:**
- `anonymous` (1)

### `tsParseArrayTypeOrHigher`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2875` | Self: 0.0% (0us) | Total: 0.3% (10.2ms) | Samples: 0

**Called by:**
- `tsInAllowConditionalTypesContext` (7)

**Calls:**
- `tsParseTypeLiteral` (3)
- `tsParseNonArrayType` (2)
- `tsParseNonArrayType` (1)
- `(anonymous)` (1)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:1241` | Self: 0.0% (0us) | Total: 0.1% (3.2ms) | Samples: 0

**Called by:**
- `(anonymous)` (2)

**Calls:**
- `(anonymous)` (1)
- `(anonymous)` (1)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:3626` | Self: 0.0% (0us) | Total: 0.3% (11.1ms) | Samples: 0

**Called by:**
- `(anonymous)` (6)
- `parseFunctionBody` (1)

**Calls:**
- `(anonymous)` (6)
- `parseMaybeAssignOrigin` (1)

### `tsFillSignature`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2573` | Self: 0.0% (0us) | Total: 0.0% (2.0ms) | Samples: 0

**Called by:**
- `tsInAllowConditionalTypesContext` (1)

**Calls:**
- `tsParseTypeOrTypePredicateAnnotation` (1)

### `checkSources`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/core.ts:375` | Self: 0.0% (0us) | Total: 0.0% (1.5ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `map` (1)

### `hides`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts:465` | Self: 0.0% (0us) | Total: 37.9% (1.22s) | Samples: 0

**Called by:**
- `check1` (816)

**Calls:**
- `peek` (816)

### `expect`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts:452` | Self: 0.0% (0us) | Total: 0.3% (11.7ms) | Samples: 0

**Called by:**
- `check1` (8)

**Calls:**
- `sub` (8)

### `returned`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts:1111` | Self: 0.0% (0us) | Total: 100.0% (5.49s) | Samples: 0

**Called by:**
- `fnExpr` (1851)
- `stmt` (1848)

**Calls:**
- `check` (3699)

### `parseBindingListItem`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:4716` | Self: 0.0% (0us) | Total: 0.0% (3.2ms) | Samples: 0

**Called by:**
- `parseAssignableListItem` (2)

**Calls:**
- `tsParseTypeAnnotation` (2)

### `check1`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts:447` | Self: 0.0% (0us) | Total: 85.2% (2.74s) | Samples: 0

**Called by:**
- `check` (1847)

**Calls:**
- `hides` (1023)
- `hides` (816)
- `expect` (8)

### `tsParseTypeLiteral`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2733` | Self: 0.0% (0us) | Total: 0.1% (6.2ms) | Samples: 0

**Called by:**
- `tsParseArrayTypeOrHigher` (3)
- `tsParseNonArrayType` (1)

**Calls:**
- `tsParseObjectTypeMembers` (4)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/link.ts:37` | Self: 0.0% (0us) | Total: 0.4% (13.0ms) | Samples: 0

**Called by:**
- `map` (8)

**Calls:**
- `value` (5)
- `value` (3)

### `tsInAmbientContext`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:3509` | Self: 0.0% (0us) | Total: 0.2% (7.1ms) | Samples: 0

**Called by:**
- `tsParseExpressionStatement` (5)

**Calls:**
- `parseVarStatement` (4)
- `parseVarStatement` (1)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:2825` | Self: 0.0% (0us) | Total: 1.1% (37.8ms) | Samples: 0

**Called by:**
- `(anonymous)` (21)
- `parseMaybeConditional` (3)

**Calls:**
- `(anonymous)` (24)

### `tsParseTypeOrTypePredicateAnnotation`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2506` | Self: 0.0% (0us) | Total: 0.0% (2.0ms) | Samples: 0

**Called by:**
- `tsFillSignature` (1)

**Calls:**
- `tsInType` (1)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:2302` | Self: 0.0% (0us) | Total: 0.0% (3.2ms) | Samples: 0

**Called by:**
- `tsParseBindingListForSignature` (2)

**Calls:**
- `parseAssignableListItem` (2)

### `parseStatement`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:4151` | Self: 0.0% (0us) | Total: 0.1% (6.3ms) | Samples: 0

**Called by:**
- `(anonymous)` (5)

**Calls:**
- `tsParseInterfaceDeclaration` (4)
- `tsParseInterfaceDeclaration` (1)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2522` | Self: 0.0% (0us) | Total: 0.0% (2.0ms) | Samples: 0

**Called by:**
- `tsInType` (1)

**Calls:**
- `tsTryParse` (1)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:775` | Self: 0.0% (0us) | Total: 1.1% (38.3ms) | Samples: 0

**Called by:**
- `parse` (16)
- `value` (8)
- `(anonymous)` (2)

**Calls:**
- `(anonymous)` (16)
- `(anonymous)` (10)

### `um`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts:111` | Self: 0.0% (0us) | Total: 0.0% (1.4ms) | Samples: 0

**Called by:**
- `flatIntoArrayWithCallback` (1)

**Calls:**
- `expand` (1)

### `checkSources`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/core.ts:347` | Self: 0.0% (0us) | Total: 12.9% (417.8ms) | Samples: 0

**Called by:**
- `(module)` (280)

**Calls:**
- `holds` (280)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:1349` | Self: 0.0% (0us) | Total: 0.1% (3.2ms) | Samples: 0

**Called by:**
- `(anonymous)` (2)

**Calls:**
- `(anonymous)` (1)
- `(anonymous)` (1)

### `tsParseTypeAliasDeclaration`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:3555` | Self: 0.0% (0us) | Total: 0.1% (4.0ms) | Samples: 0

**Called by:**
- `parseExportDeclaration` (2)
- `parseExpressionStatement` (1)

**Calls:**
- `tsInType` (3)

### `checkSources`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/core.ts:320` | Self: 0.0% (0us) | Total: 85.3% (2.74s) | Samples: 0

**Called by:**
- `(module)` (1850)

**Calls:**
- `fnExpr` (1850)

### `collapseArrays`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts:795` | Self: 0.0% (0us) | Total: 0.0% (1.4ms) | Samples: 0

**Called by:**
- `member` (1)

**Calls:**
- `flatIntoArrayWithCallback` (1)

### `fnExpr`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts:1087` | Self: 0.0% (0us) | Total: 85.2% (2.74s) | Samples: 0

**Called by:**
- `infer` (1848)

**Calls:**
- `stmts` (1848)

### `parseMaybeAssignOrigin`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:4567` | Self: 0.0% (0us) | Total: 0.1% (6.2ms) | Samples: 0

**Called by:**
- `(anonymous)` (2)
- `(anonymous)` (1)
- `(anonymous)` (1)

**Calls:**
- `parseMaybeConditional` (3)
- `parseMaybeConditional` (1)

### `member`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts:754` | Self: 0.0% (0us) | Total: 0.0% (1.4ms) | Samples: 0

**Called by:**
- `infer` (1)

**Calls:**
- `collapseArrays` (1)

### `infer`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts:578` | Self: 0.0% (0us) | Total: 85.4% (2.75s) | Samples: 0

**Called by:**
- `check` (1850)
- `check1` (1)

**Calls:**
- `fnExpr` (1848)
- `fnExpr` (1)
- `fnExpr` (1)
- `member` (1)

### `tsParseObjectTypeMembers`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:3386` | Self: 0.0% (0us) | Total: 0.1% (6.2ms) | Samples: 0

**Called by:**
- `tsParseTypeLiteral` (4)

**Calls:**
- `tsParseList` (4)

### `tsIsStartOfMappedType`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2072` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `bound tsIsStartOfMappedType` (1)

**Calls:**
- `(anonymous)` (1)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:1099` | Self: 0.0% (0us) | Total: 0.0% (3.0ms) | Samples: 0

**Called by:**
- `(anonymous)` (2)

**Calls:**
- `(anonymous)` (2)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:2897` | Self: 0.0% (0us) | Total: 1.1% (37.8ms) | Samples: 0

**Called by:**
- `(anonymous)` (24)

**Calls:**
- `(anonymous)` (23)
- `(anonymous)` (1)

### `internal:primordials`
`internal:primordials:80` | Self: 0.0% (0us) | Total: 0.0% (3.0ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `makeSafe` (1)

### `begin`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:980` | Self: 0.0% (0us) | Total: 0.0% (2.0ms) | Samples: 0

**Called by:**
- `tsTryParse` (1)

**Calls:**
- `captureParserCheckpoint` (1)

### `tsParseTypeMember`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:3353` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `bound tsParseTypeMember` (1)

**Calls:**
- `tsParseModifiers` (1)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:2808` | Self: 0.0% (0us) | Total: 1.0% (33.4ms) | Samples: 0

**Called by:**
- `(anonymous)` (21)

**Calls:**
- `(anonymous)` (21)

### `distinctNames`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/core.ts:393` | Self: 0.0% (0us) | Total: 0.1% (4.3ms) | Samples: 0

**Called by:**
- `checkSources` (3)

**Calls:**
- `parse` (3)

### `tsParseUnionOrIntersectionType`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2607` | Self: 0.0% (0us) | Total: 0.6% (20.4ms) | Samples: 0

**Called by:**
- `bound tsParseIntersectionTypeOrHigher` (7)
- `tsParseType` (7)

**Calls:**
- `bound tsParseIntersectionTypeOrHigher` (7)
- `bound tsParseTypeOperatorOrHigher` (7)

### `sig`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/registry.ts:123` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `literal` (1)

**Calls:**
- `convert` (1)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts:1314` | Self: 0.0% (0us) | Total: 85.2% (2.74s) | Samples: 0

**Called by:**
- `forEach` (1847)

**Calls:**
- `check` (1847)

### `bound tsParseTypeOperatorOrHigher`
`[native code]` | Self: 0.0% (0us) | Total: 0.3% (10.2ms) | Samples: 0

**Called by:**
- `tsParseUnionOrIntersectionType` (7)

**Calls:**
- `tsParseTypeOperatorOrHigher` (6)
- `tsInAllowConditionalTypesContext` (1)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:1418` | Self: 0.0% (0us) | Total: 0.3% (11.5ms) | Samples: 0

**Called by:**
- `(anonymous)` (5)
- `(anonymous)` (1)
- `(anonymous)` (1)

**Calls:**
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)

### `check1`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts:444` | Self: 0.0% (0us) | Total: 0.0% (1.4ms) | Samples: 0

**Called by:**
- `check` (1)

**Calls:**
- `infer` (1)

### `isAlias`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/registry.ts:282` | Self: 0.0% (0us) | Total: 3.6% (118.9ms) | Samples: 0

**Called by:**
- `sub` (57)
- `holds` (25)

**Calls:**
- `(anonymous)` (82)

### `tsParseFunctionOrConstructorType`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2599` | Self: 0.0% (0us) | Total: 0.0% (2.0ms) | Samples: 0

**Called by:**
- `tsParseType` (1)

**Calls:**
- `tsInAllowConditionalTypesContext` (1)

### `bound call`
`[native code]` | Self: 0.0% (0us) | Total: 0.0% (3.0ms) | Samples: 0

**Called by:**
- `makeSafe` (1)

**Calls:**
- `forEach` (1)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:3610` | Self: 0.0% (0us) | Total: 0.0% (1.7ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `(anonymous)` (1)

### `parseVarStatement`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:4122` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `tsInAmbientContext` (1)

**Calls:**
- `(anonymous)` (1)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:6243` | Self: 0.0% (0us) | Total: 0.1% (3.3ms) | Samples: 0

**Called by:**
- `(anonymous)` (2)

**Calls:**
- `isIdentifierChar` (1)
- `isIdentifierChar` (1)

### `tsParseType`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2928` | Self: 0.0% (0us) | Total: 0.4% (13.5ms) | Samples: 0

**Called by:**
- `(anonymous)` (7)
- `tsInType` (2)

**Calls:**
- `tsParseUnionOrIntersectionType` (7)
- `tsParseFunctionOrConstructorType` (1)
- `tsParseNonConditionalType` (1)

### `node:fs/promises`
`node:fs/promises:2` | Self: 0.0% (0us) | Total: 0.0% (3.0ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:2945` | Self: 0.0% (0us) | Total: 1.1% (36.5ms) | Samples: 0

**Called by:**
- `(anonymous)` (23)

**Calls:**
- `(anonymous)` (22)
- `(anonymous)` (1)

### `tsParseTypeAnnotation`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2473` | Self: 0.0% (0us) | Total: 0.3% (11.9ms) | Samples: 0

**Called by:**
- `parseVarId` (4)
- `parseBindingListItem` (2)
- `tsInType` (1)
- `tsParsePropertyOrMethodSignature` (1)

**Calls:**
- `tsInType` (8)

### `(module)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/runtime-ss.ts:15` | Self: 0.0% (0us) | Total: 0.5% (17.0ms) | Samples: 0

**Calls:**
- `link` (6)

### `tsParsePropertyOrMethodSignature`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:3293` | Self: 0.0% (0us) | Total: 0.1% (6.2ms) | Samples: 0

**Called by:**
- `bound tsParseTypeMember` (4)

**Calls:**
- `tsFillSignature` (3)
- `tsFillSignature` (1)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:3647` | Self: 0.0% (0us) | Total: 0.0% (1.5ms) | Samples: 0

**Called by:**
- `parseFunctionBody` (1)

**Calls:**
- `(anonymous)` (1)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:3611` | Self: 0.0% (0us) | Total: 0.5% (16.1ms) | Samples: 0

**Called by:**
- `(anonymous)` (10)

**Calls:**
- `(anonymous)` (6)
- `(anonymous)` (4)

### `tsParseExpressionStatement`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:3444` | Self: 0.0% (0us) | Total: 0.2% (7.1ms) | Samples: 0

**Called by:**
- `parseExpressionStatement` (5)

**Calls:**
- `tsInAmbientContext` (5)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:1470` | Self: 0.0% (0us) | Total: 0.0% (1.7ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `(anonymous)` (1)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:6269` | Self: 0.0% (0us) | Total: 0.1% (3.3ms) | Samples: 0

**Called by:**
- `(anonymous)` (2)

**Calls:**
- `(anonymous)` (2)

### `tsFillSignature`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2575` | Self: 0.0% (0us) | Total: 0.0% (1.5ms) | Samples: 0

**Called by:**
- `tsParsePropertyOrMethodSignature` (1)

**Calls:**
- `tsInType` (1)

### `anonymous`
`[native code]` | Self: 0.0% (0us) | Total: 0.4% (15.3ms) | Samples: 0

**Called by:**
- `internal:shared` (1)
- `node:events` (1)
- `node:fs/promises` (1)
- `internal:validators` (1)
- `node:fs` (1)

**Calls:**
- `internal:shared` (1)
- `node:events` (1)
- `node:fs/promises` (1)
- `internal:validators` (1)
- `internal:primordials` (1)

### `makeSafe`
`internal:primordials:31` | Self: 0.0% (0us) | Total: 0.0% (3.0ms) | Samples: 0

**Called by:**
- `internal:primordials` (1)

**Calls:**
- `bound call` (1)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:3744` | Self: 0.0% (0us) | Total: 0.0% (1.5ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `(anonymous)` (1)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:1485` | Self: 0.0% (0us) | Total: 0.0% (1.5ms) | Samples: 0

**Called by:**
- `parseVarStatement` (1)

**Calls:**
- `parseMaybeAssignOrigin` (1)

### `tsParsePropertyOrMethodSignature`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:3332` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `bound tsParseTypeMember` (1)

**Calls:**
- `tsParseTypeAnnotation` (1)

## Files

| Self% | Self | File |
|------:|-----:|------|
| 90.9% | 2.92s | `[native code]` |
| 7.4% | 240.7ms | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/registry.ts` |
| 0.6% | 19.9ms | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs` |
| 0.4% | 15.3ms | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js` |
| 0.4% | 14.9ms | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts` |
| 0.0% | 1.5ms | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/core.ts` |
