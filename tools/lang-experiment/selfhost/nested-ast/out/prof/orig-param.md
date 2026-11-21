# CPU Profile

| Duration | Samples | Interval | Functions |
|----------|---------|----------|----------|
| 1.06s | 706 | 1.0ms | 219 |

**Top 10:** `(anonymous)` 21.5%, `performIteration` 14.5%, `holds` 13.9%, `map` 12.1%, `decl` 12.0%, `flatMap` 6.1%, `show` 6.0%, `sub` 1.9%, `generateJsxParser` 1.3%, `hidden` 1.2%

## Hot Functions (Self Time)

| Self% | Self | Total% | Total | Function | Location |
|------:|-----:|-------:|------:|----------|----------|
| 21.5% | 230.1ms | 77.8% | 830.1ms | `(anonymous)` | `[native code]` |
| 14.5% | 155.5ms | 14.8% | 158.5ms | `performIteration` | `[native code]` |
| 13.9% | 148.2ms | 100.0% | 10.94s | `holds` | `[native code]` |
| 12.1% | 129.3ms | 18.6% | 198.4ms | `map` | `[native code]` |
| 12.0% | 128.1ms | 12.0% | 128.1ms | `decl` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/registry.ts:105` |
| 6.1% | 65.7ms | 6.1% | 65.7ms | `flatMap` | `[native code]` |
| 6.0% | 64.3ms | 11.7% | 125.1ms | `show` | `[native code]` |
| 1.9% | 20.4ms | 12.6% | 135.0ms | `sub` | `[native code]` |
| 1.3% | 14.3ms | 1.3% | 14.3ms | `generateJsxParser` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:603` |
| 1.2% | 13.3ms | 1.2% | 13.3ms | `hidden` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts:488` |
| 0.8% | 9.3ms | 2.5% | 27.0ms | `s` | `[native code]` |
| 0.7% | 7.7ms | 0.7% | 7.7ms | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs` |
| 0.6% | 7.4ms | 1.2% | 13.4ms | `anonymous` | `[native code]` |
| 0.6% | 7.2ms | 0.6% | 7.2ms | `expand` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/registry.ts:234` |
| 0.5% | 6.3ms | 0.5% | 6.3ms | `expand` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/registry.ts:242` |
| 0.4% | 4.4ms | 5.5% | 59.0ms | `expand` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/registry.ts:232` |
| 0.3% | 4.0ms | 0.3% | 4.0ms | `isServerConfig` | `bun:main` |
| 0.3% | 3.5ms | 0.3% | 3.5ms | `captureParserCheckpoint` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:1220` |
| 0.2% | 3.0ms | 0.2% | 3.0ms | `updateContext` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:1371` |
| 0.2% | 3.0ms | 0.2% | 3.0ms | `[Symbol.iterator]` | `[native code]` |
| 0.2% | 2.4ms | 0.2% | 2.4ms | `Function` | `[native code]` |
| 0.1% | 1.8ms | 0.1% | 1.8ms | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:1556` |
| 0.1% | 1.7ms | 0.1% | 1.7ms | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:2587` |
| 0.1% | 1.6ms | 0.1% | 1.6ms | `stringify` | `[native code]` |
| 0.1% | 1.6ms | 0.1% | 1.6ms | `sub` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/registry.ts:288` |
| 0.1% | 1.6ms | 0.1% | 1.6ms | `um` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts:109` |
| 0.1% | 1.6ms | 0.1% | 1.6ms | `tsParseBracketedList` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2353` |
| 0.1% | 1.5ms | 0.1% | 1.5ms | `tsParseBracketedList` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2351` |
| 0.1% | 1.5ms | 0.1% | 1.5ms | `/\r\n?\|\n\|\u2028\|\u2029/` | `[native code]` |
| 0.1% | 1.5ms | 0.1% | 1.5ms | `tsParseTypeMember` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:3375` |
| 0.1% | 1.5ms | 0.1% | 1.5ms | `parseExport` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:3912` |
| 0.1% | 1.5ms | 0.1% | 1.5ms | `returned` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts` |
| 0.1% | 1.5ms | 0.1% | 1.5ms | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:6040` |
| 0.1% | 1.4ms | 0.1% | 1.4ms | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:2866` |
| 0.1% | 1.4ms | 0.1% | 1.4ms | `cloneObject` | `[native code]` |
| 0.1% | 1.4ms | 0.1% | 1.4ms | `tsParseTypeAnnotation` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2472` |
| 0.1% | 1.3ms | 1.7% | 18.3ms | `bound tsParseTypeMember` | `[native code]` |
| 0.1% | 1.3ms | 0.1% | 1.3ms | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:3632` |
| 0.1% | 1.3ms | 0.1% | 1.3ms | `parseIdentNode` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js` |
| 0.1% | 1.3ms | 0.2% | 2.6ms | `readFileSync` | `[native code]` |
| 0.1% | 1.3ms | 0.1% | 1.3ms | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:5548` |
| 0.1% | 1.2ms | 0.1% | 1.2ms | `literal` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/registry.ts:204` |
| 0.1% | 1.2ms | 0.9% | 10.3ms | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:5503` |
| 0.1% | 1.2ms | 0.1% | 1.2ms | `restoreParserCheckpoint` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js` |
| 0.1% | 1.2ms | 0.1% | 1.2ms | `Parser` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:604` |
| 0.1% | 1.2ms | 2.3% | 25.0ms | `hidden` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts:514` |
| 0.1% | 1.1ms | 0.1% | 1.1ms | `paramAt` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts` |

## Call Tree (Total Time)

| Total% | Total | Self% | Self | Function | Location |
|-------:|------:|------:|-----:|----------|----------|
| 100.0% | 10.94s | 13.9% | 148.2ms | `holds` | `[native code]` |
| 95.6% | 1.01s | 0.0% | 0us | `(module)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/profile-call.ts:13` |
| 80.2% | 855.9ms | 0.0% | 0us | `checkSources` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/core.ts:347` |
| 77.8% | 830.1ms | 21.5% | 230.1ms | `(anonymous)` | `[native code]` |
| 56.1% | 598.1ms | 0.0% | 0us | `infer` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts:578` |
| 38.3% | 408.7ms | 0.0% | 0us | `check` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts:424` |
| 30.3% | 323.7ms | 0.0% | 0us | `binary` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts:868` |
| 25.8% | 275.8ms | 0.0% | 0us | `fnExpr` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts:1089` |
| 25.7% | 274.3ms | 0.0% | 0us | `returned` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts:1111` |
| 18.6% | 198.4ms | 12.1% | 129.3ms | `map` | `[native code]` |
| 15.0% | 160.7ms | 0.0% | 0us | `hidden` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts:494` |
| 14.8% | 158.5ms | 14.5% | 155.5ms | `performIteration` | `[native code]` |
| 13.2% | 141.3ms | 0.0% | 0us | `hidden` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts:499` |
| 13.0% | 138.6ms | 0.0% | 0us | `checkSources` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/core.ts:320` |
| 12.8% | 137.1ms | 0.0% | 0us | `check1` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts:444` |
| 12.7% | 135.5ms | 0.0% | 0us | `apply` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts:1296` |
| 12.7% | 135.5ms | 0.0% | 0us | `call` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts:1232` |
| 12.7% | 135.5ms | 0.0% | 0us | `forEach` | `[native code]` |
| 12.6% | 135.0ms | 1.9% | 20.4ms | `sub` | `[native code]` |
| 12.6% | 134.3ms | 0.0% | 0us | `peek` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/registry.ts:99` |
| 12.6% | 134.3ms | 0.0% | 0us | `check1` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts:447` |
| 12.6% | 134.3ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts:1314` |
| 12.0% | 128.1ms | 12.0% | 128.1ms | `decl` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/registry.ts:105` |
| 11.7% | 125.1ms | 6.0% | 64.3ms | `show` | `[native code]` |
| 10.9% | 116.4ms | 0.0% | 0us | `filter` | `[native code]` |
| 7.5% | 80.9ms | 0.0% | 0us | `isAlias` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/registry.ts:282` |
| 7.0% | 75.1ms | 0.0% | 0us | `hides` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts:463` |
| 6.1% | 65.7ms | 6.1% | 65.7ms | `flatMap` | `[native code]` |
| 5.5% | 59.2ms | 0.0% | 0us | `hides` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts:465` |
| 5.5% | 59.0ms | 0.4% | 4.4ms | `expand` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/registry.ts:232` |
| 5.2% | 55.6ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:2774` |
| 5.2% | 55.6ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:2808` |
| 5.1% | 55.4ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:2825` |
| 5.1% | 55.4ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:2897` |
| 4.9% | 52.4ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:2945` |
| 4.6% | 49.1ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:3126` |
| 4.4% | 47.3ms | 0.0% | 0us | `expand` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/registry.ts:233` |
| 3.8% | 41.1ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:775` |
| 2.6% | 28.0ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:3611` |
| 2.5% | 27.0ms | 0.8% | 9.3ms | `s` | `[native code]` |
| 2.3% | 25.0ms | 0.1% | 1.2ms | `hidden` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts:514` |
| 2.2% | 23.8ms | 0.0% | 0us | `parse` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/parse.ts:30` |
| 2.1% | 22.5ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:890` |
| 2.0% | 21.6ms | 0.0% | 0us | `tsInType` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2960` |
| 1.9% | 20.9ms | 0.0% | 0us | `tsParseUnionOrIntersectionType` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2607` |
| 1.9% | 20.4ms | 0.0% | 0us | `checkSources` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/core.ts:64` |
| 1.8% | 19.2ms | 0.0% | 0us | `link` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/link.ts:37` |
| 1.8% | 19.2ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/link.ts:37` |
| 1.8% | 19.1ms | 0.0% | 0us | `Registry` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/registry.ts:49` |
| 1.7% | 18.5ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:2736` |
| 1.7% | 18.3ms | 0.1% | 1.3ms | `bound tsParseTypeMember` | `[native code]` |
| 1.7% | 18.3ms | 0.0% | 0us | `tsParseList` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:3380` |
| 1.6% | 17.2ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:3626` |
| 1.5% | 16.7ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:3297` |
| 1.5% | 16.5ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:1418` |
| 1.4% | 15.3ms | 0.0% | 0us | `value` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/link.ts:26` |
| 1.4% | 15.2ms | 0.0% | 0us | `tsParseType` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2928` |
| 1.3% | 14.3ms | 0.0% | 0us | `extend` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:681` |
| 1.3% | 14.3ms | 0.0% | 0us | `(module)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/parse.ts:11` |
| 1.3% | 14.3ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:1562` |
| 1.3% | 14.3ms | 1.3% | 14.3ms | `generateJsxParser` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:603` |
| 1.3% | 13.9ms | 0.0% | 0us | `tsInAllowConditionalTypesContext` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2437` |
| 1.2% | 13.6ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:3650` |
| 1.2% | 13.4ms | 0.6% | 7.4ms | `anonymous` | `[native code]` |
| 1.2% | 13.3ms | 1.2% | 13.3ms | `hidden` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts:488` |
| 1.2% | 12.9ms | 0.0% | 0us | `(module)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/runtime-ss.ts:15` |
| 1.1% | 12.4ms | 0.0% | 0us | `tsParsePropertyOrMethodSignature` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:3293` |
| 1.1% | 12.3ms | 0.0% | 0us | `tsParseInterfaceDeclaration` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:3408` |
| 1.1% | 12.3ms | 0.0% | 0us | `parseStatement` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:4151` |
| 1.1% | 11.8ms | 0.0% | 0us | `tsParseTypeAnnotation` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2473` |
| 1.1% | 11.8ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2475` |
| 1.0% | 11.0ms | 0.0% | 0us | `tsParseInterfaceBody` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:3420` |
| 0.9% | 10.4ms | 0.0% | 0us | `tsParseArrayTypeOrHigher` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2875` |
| 0.9% | 10.4ms | 0.0% | 0us | `bound tsParseIntersectionTypeOrHigher` | `[native code]` |
| 0.9% | 10.4ms | 0.0% | 0us | `bound tsParseTypeOperatorOrHigher` | `[native code]` |
| 0.9% | 10.3ms | 0.1% | 1.2ms | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:5503` |
| 0.9% | 9.9ms | 0.0% | 0us | `value` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/link.ts:27` |
| 0.8% | 9.3ms | 0.0% | 0us | `tsParseBindingListForSignature` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2443` |
| 0.8% | 9.3ms | 0.0% | 0us | `tsFillSignature` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2571` |
| 0.8% | 9.0ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:5542` |
| 0.8% | 8.6ms | 0.0% | 0us | `tsParseTypeOperatorOrHigher` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2894` |
| 0.7% | 7.7ms | 0.7% | 7.7ms | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs` |
| 0.7% | 7.7ms | 0.0% | 0us | `(module)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/types.ts:16` |
| 0.6% | 7.2ms | 0.6% | 7.2ms | `expand` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/registry.ts:234` |
| 0.6% | 7.2ms | 0.0% | 0us | `tsParseTypeLiteral` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2733` |
| 0.6% | 7.2ms | 0.0% | 0us | `tsParseObjectTypeMembers` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:3386` |
| 0.6% | 6.9ms | 0.0% | 0us | `parseVarStatement` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:4121` |
| 0.5% | 6.3ms | 0.5% | 6.3ms | `expand` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/registry.ts:242` |
| 0.5% | 6.1ms | 0.0% | 0us | `parseAssignableListItem` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:4678` |
| 0.5% | 6.1ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:2302` |
| 0.5% | 6.1ms | 0.0% | 0us | `parseBindingListItem` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:4716` |
| 0.5% | 6.0ms | 0.0% | 0us | `node:fs` | `node:fs:2` |
| 0.5% | 6.0ms | 0.0% | 0us | `node:fs/promises` | `node:fs/promises:2` |
| 0.5% | 5.6ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:752` |
| 0.5% | 5.5ms | 0.0% | 0us | `tsInAmbientContext` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:3509` |
| 0.5% | 5.5ms | 0.0% | 0us | `tsParseExpressionStatement` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:3444` |
| 0.5% | 5.5ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:1483` |
| 0.5% | 5.5ms | 0.0% | 0us | `parseVarId` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:4503` |
| 0.5% | 5.5ms | 0.0% | 0us | `parseExpressionStatement` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:4175` |
| 0.4% | 5.1ms | 0.0% | 0us | `tsParseTypeOrTypePredicateAnnotation` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2506` |
| 0.4% | 5.1ms | 0.0% | 0us | `hidden` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts:492` |
| 0.4% | 4.6ms | 0.0% | 0us | `distinctNames` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/core.ts:393` |
| 0.4% | 4.6ms | 0.0% | 0us | `checkSources` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/core.ts:71` |
| 0.3% | 4.0ms | 0.0% | 0us | `(module)` | `bun:main:14` |
| 0.3% | 4.0ms | 0.3% | 4.0ms | `isServerConfig` | `bun:main` |
| 0.3% | 3.8ms | 0.0% | 0us | `value` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/link.ts:31` |
| 0.3% | 3.5ms | 0.0% | 0us | `begin` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:980` |
| 0.3% | 3.5ms | 0.0% | 0us | `tsTryParse` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:3028` |
| 0.3% | 3.5ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2522` |
| 0.3% | 3.5ms | 0.3% | 3.5ms | `captureParserCheckpoint` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:1220` |
| 0.3% | 3.4ms | 0.0% | 0us | `tsParseFunctionOrConstructorType` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2599` |
| 0.2% | 3.1ms | 0.0% | 0us | `parseExport` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:3962` |
| 0.2% | 3.1ms | 0.0% | 0us | `parseExportDeclaration` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:4241` |
| 0.2% | 3.0ms | 0.2% | 3.0ms | `updateContext` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:1371` |
| 0.2% | 3.0ms | 0.0% | 0us | `finishToken` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:1990` |
| 0.2% | 3.0ms | 0.2% | 3.0ms | `[Symbol.iterator]` | `[native code]` |
| 0.2% | 2.9ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:2948` |
| 0.2% | 2.9ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:1078` |
| 0.2% | 2.9ms | 0.0% | 0us | `tsFillSignature` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2575` |
| 0.2% | 2.8ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:1545` |
| 0.2% | 2.8ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:1241` |
| 0.2% | 2.8ms | 0.0% | 0us | `parseMaybeConditional` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:4198` |
| 0.2% | 2.8ms | 0.0% | 0us | `parseMaybeAssignOrigin` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:4567` |
| 0.2% | 2.7ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:1485` |
| 0.2% | 2.6ms | 0.1% | 1.3ms | `readFileSync` | `[native code]` |
| 0.2% | 2.5ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:827` |
| 0.2% | 2.4ms | 0.2% | 2.4ms | `Function` | `[native code]` |
| 0.2% | 2.1ms | 0.0% | 0us | `tsFillSignature` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2573` |
| 0.1% | 1.8ms | 0.1% | 1.8ms | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:1556` |
| 0.1% | 1.8ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:1544` |
| 0.1% | 1.8ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:2295` |
| 0.1% | 1.7ms | 0.0% | 0us | `member` | `[native code]` |
| 0.1% | 1.7ms | 0.0% | 0us | `tsParseTypeAliasDeclaration` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:3555` |
| 0.1% | 1.7ms | 0.0% | 0us | `tsParseTypeMemberSemicolon` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:3263` |
| 0.1% | 1.7ms | 0.0% | 0us | `isLineTerminator` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:1999` |
| 0.1% | 1.7ms | 0.0% | 0us | `tsParsePropertyOrMethodSignature` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:3334` |
| 0.1% | 1.7ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:5648` |
| 0.1% | 1.7ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:2549` |
| 0.1% | 1.7ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:3091` |
| 0.1% | 1.7ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:1290` |
| 0.1% | 1.7ms | 0.1% | 1.7ms | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:2587` |
| 0.1% | 1.7ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:1256` |
| 0.1% | 1.7ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:3741` |
| 0.1% | 1.6ms | 0.1% | 1.6ms | `stringify` | `[native code]` |
| 0.1% | 1.6ms | 0.0% | 0us | `hidden` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts:506` |
| 0.1% | 1.6ms | 0.1% | 1.6ms | `sub` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/registry.ts:288` |
| 0.1% | 1.6ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts:499` |
| 0.1% | 1.6ms | 0.0% | 0us | `member` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts:770` |
| 0.1% | 1.6ms | 0.1% | 1.6ms | `um` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts:109` |
| 0.1% | 1.6ms | 0.0% | 0us | `flatIntoArrayWithCallback` | `[native code]` |
| 0.1% | 1.6ms | 0.0% | 0us | `tsParseDelimitedListWorker` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2317` |
| 0.1% | 1.6ms | 0.0% | 0us | `tsParseTypeReference` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2806` |
| 0.1% | 1.6ms | 0.0% | 0us | `tsParseTypeArguments` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:3222` |
| 0.1% | 1.6ms | 0.1% | 1.6ms | `tsParseBracketedList` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2353` |
| 0.1% | 1.6ms | 0.0% | 0us | `tsInNoContext` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:1805` |
| 0.1% | 1.6ms | 0.0% | 0us | `bound tsParseType` | `[native code]` |
| 0.1% | 1.6ms | 0.0% | 0us | `tsParseDelimitedList` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2341` |
| 0.1% | 1.6ms | 0.0% | 0us | `tsParseTupleType` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2776` |
| 0.1% | 1.5ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:2969` |
| 0.1% | 1.5ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:3021` |
| 0.1% | 1.5ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:5989` |
| 0.1% | 1.5ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:3516` |
| 0.1% | 1.5ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:3444` |
| 0.1% | 1.5ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:3489` |
| 0.1% | 1.5ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:3703` |
| 0.1% | 1.5ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:2848` |
| 0.1% | 1.5ms | 0.0% | 0us | `tsParseTypeParameters` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:3005` |
| 0.1% | 1.5ms | 0.1% | 1.5ms | `tsParseBracketedList` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2351` |
| 0.1% | 1.5ms | 0.0% | 0us | `tsFillSignature` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2569` |
| 0.1% | 1.5ms | 0.1% | 1.5ms | `/\r\n?\|\n\|\u2028\|\u2029/` | `[native code]` |
| 0.1% | 1.5ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:795` |
| 0.1% | 1.5ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:3267` |
| 0.1% | 1.5ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:3303` |
| 0.1% | 1.5ms | 0.1% | 1.5ms | `tsParseTypeMember` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:3375` |
| 0.1% | 1.5ms | 0.1% | 1.5ms | `parseExport` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:3912` |
| 0.1% | 1.5ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:1249` |
| 0.1% | 1.5ms | 0.1% | 1.5ms | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:6040` |
| 0.1% | 1.5ms | 0.1% | 1.5ms | `returned` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts` |
| 0.1% | 1.4ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:3261` |
| 0.1% | 1.4ms | 0.1% | 1.4ms | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:2866` |
| 0.1% | 1.4ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:2851` |
| 0.1% | 1.4ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:1470` |
| 0.1% | 1.4ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:1239` |
| 0.1% | 1.4ms | 0.1% | 1.4ms | `cloneObject` | `[native code]` |
| 0.1% | 1.4ms | 0.1% | 1.4ms | `tsParseTypeAnnotation` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2472` |
| 0.1% | 1.4ms | 0.0% | 0us | `parseParenAndDistinguishExpression` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:4904` |
| 0.1% | 1.4ms | 0.0% | 0us | `parseFunctionBody` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:3732` |
| 0.1% | 1.4ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:4845` |
| 0.1% | 1.4ms | 0.0% | 0us | `tryParse` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:1679` |
| 0.1% | 1.4ms | 0.0% | 0us | `shouldParseArrow` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:4844` |
| 0.1% | 1.4ms | 0.0% | 0us | `parseArrowExpression` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:4525` |
| 0.1% | 1.3ms | 0.0% | 0us | `expand` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/registry.ts:240` |
| 0.1% | 1.3ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:1349` |
| 0.1% | 1.3ms | 0.1% | 1.3ms | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:3632` |
| 0.1% | 1.3ms | 0.0% | 0us | `tsParseTypeMember` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:3370` |
| 0.1% | 1.3ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:3740` |
| 0.1% | 1.3ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:3559` |
| 0.1% | 1.3ms | 0.1% | 1.3ms | `parseIdentNode` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js` |
| 0.1% | 1.3ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:2287` |
| 0.1% | 1.3ms | 0.0% | 0us | `(module)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/profile-call.ts:7` |
| 0.1% | 1.3ms | 0.1% | 1.3ms | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:5548` |
| 0.1% | 1.3ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2508` |
| 0.1% | 1.2ms | 0.0% | 0us | `Registry` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/registry.ts:50` |
| 0.1% | 1.2ms | 0.0% | 0us | `load` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/registry.ts:83` |
| 0.1% | 1.2ms | 0.1% | 1.2ms | `literal` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/registry.ts:204` |
| 0.1% | 1.2ms | 0.0% | 0us | `tsParseInterfaceBody` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:3422` |
| 0.1% | 1.2ms | 0.0% | 0us | `tsLookAhead` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:1899` |
| 0.1% | 1.2ms | 0.0% | 0us | `rollback` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:1005` |
| 0.1% | 1.2ms | 0.1% | 1.2ms | `restoreParserCheckpoint` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js` |
| 0.1% | 1.2ms | 0.0% | 0us | `restore` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:1175` |
| 0.1% | 1.2ms | 0.0% | 0us | `tsParseNonConditionalType` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2911` |
| 0.1% | 1.2ms | 0.0% | 0us | `ImportAttributes` | `[native code]` |
| 0.1% | 1.2ms | 0.0% | 0us | `parse` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:5373` |
| 0.1% | 1.2ms | 0.0% | 0us | `EffectAdapter` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:1304` |
| 0.1% | 1.2ms | 0.0% | 0us | `ParseDecorators` | `[native code]` |
| 0.1% | 1.2ms | 0.1% | 1.2ms | `Parser` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:604` |
| 0.1% | 1.2ms | 0.0% | 0us | `TypeScriptParser` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:1577` |
| 0.1% | 1.1ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts:1297` |
| 0.1% | 1.1ms | 0.1% | 1.1ms | `paramAt` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts` |

## Function Details

### `(anonymous)`
`[native code]` | Self: 21.5% (230.1ms) | Total: 77.8% (830.1ms) | Samples: 158

**Called by:**
- `holds` (346)
- `sub` (62)
- `isAlias` (54)
- `expand` (35)
- `expand` (33)
- `map` (26)
- `hidden` (2)
- `filter` (1)

**Calls:**
- `performIteration` (101)
- `decl` (83)
- `map` (79)
- `show` (73)
- `flatMap` (45)
- `s` (17)
- `sub` (2)
- `member` (1)

### `performIteration`
`[native code]` | Self: 14.5% (155.5ms) | Total: 14.8% (158.5ms) | Samples: 104

**Called by:**
- `(anonymous)` (101)
- `show` (5)

**Calls:**
- `[Symbol.iterator]` (2)

### `holds`
`[native code]` | Self: 13.9% (148.2ms) | Total: 100.0% (10.94s) | Samples: 101

**Called by:**
- `holds` (6802)
- `checkSources` (577)

**Calls:**
- `holds` (6802)
- `(anonymous)` (346)
- `isAlias` (53)
- `expand` (35)
- `expand` (32)
- `expand` (5)
- `expand` (4)
- `expand` (1)

### `map`
`[native code]` | Self: 12.1% (129.3ms) | Total: 18.6% (198.4ms) | Samples: 87

**Called by:**
- `(anonymous)` (79)
- `show` (34)
- `link` (12)
- `value` (7)
- `expand` (1)

**Calls:**
- `(anonymous)` (26)
- `(anonymous)` (12)
- `value` (3)
- `value` (2)
- `value` (2)
- `s` (1)

### `decl`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/registry.ts:105` | Self: 12.0% (128.1ms) | Total: 12.0% (128.1ms) | Samples: 83

**Called by:**
- `(anonymous)` (83)

### `flatMap`
`[native code]` | Self: 6.1% (65.7ms) | Total: 6.1% (65.7ms) | Samples: 45

**Called by:**
- `(anonymous)` (45)

### `show`
`[native code]` | Self: 6.0% (64.3ms) | Total: 11.7% (125.1ms) | Samples: 43

**Called by:**
- `(anonymous)` (73)
- `s` (11)

**Calls:**
- `map` (34)
- `performIteration` (5)
- `stringify` (1)
- `filter` (1)

### `sub`
`[native code]` | Self: 1.9% (20.4ms) | Total: 12.6% (135.0ms) | Samples: 14

**Called by:**
- `filter` (77)
- `sub` (14)
- `(anonymous)` (2)

**Calls:**
- `(anonymous)` (62)
- `sub` (14)
- `expand` (1)
- `expand` (1)
- `isAlias` (1)

### `generateJsxParser`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:603` | Self: 1.3% (14.3ms) | Total: 1.3% (14.3ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `hidden`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts:488` | Self: 1.2% (13.3ms) | Total: 1.2% (13.3ms) | Samples: 9

**Called by:**
- `hidden` (7)
- `hidden` (1)
- `hidden` (1)

### `s`
`[native code]` | Self: 0.8% (9.3ms) | Total: 2.5% (27.0ms) | Samples: 7

**Called by:**
- `(anonymous)` (17)
- `map` (1)

**Calls:**
- `show` (11)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs` | Self: 0.7% (7.7ms) | Total: 0.7% (7.7ms) | Samples: 4

**Called by:**
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)

### `anonymous`
`[native code]` | Self: 0.6% (7.4ms) | Total: 1.2% (13.4ms) | Samples: 3

**Called by:**
- `node:fs/promises` (2)
- `node:fs` (2)
- `value` (1)

**Calls:**
- `node:fs/promises` (2)

### `expand`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/registry.ts:234` | Self: 0.6% (7.2ms) | Total: 0.6% (7.2ms) | Samples: 5

**Called by:**
- `holds` (5)

### `expand`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/registry.ts:242` | Self: 0.5% (6.3ms) | Total: 0.5% (6.3ms) | Samples: 4

**Called by:**
- `holds` (4)

### `expand`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/registry.ts:232` | Self: 0.4% (4.4ms) | Total: 5.5% (59.0ms) | Samples: 3

**Called by:**
- `holds` (35)
- `hidden` (1)
- `sub` (1)
- `member` (1)

**Calls:**
- `(anonymous)` (35)

### `isServerConfig`
`bun:main` | Self: 0.3% (4.0ms) | Total: 0.3% (4.0ms) | Samples: 1

**Called by:**
- `(module)` (1)

### `captureParserCheckpoint`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:1220` | Self: 0.3% (3.5ms) | Total: 0.3% (3.5ms) | Samples: 2

**Called by:**
- `begin` (2)

### `updateContext`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:1371` | Self: 0.2% (3.0ms) | Total: 0.2% (3.0ms) | Samples: 2

**Called by:**
- `finishToken` (2)

### `[Symbol.iterator]`
`[native code]` | Self: 0.2% (3.0ms) | Total: 0.2% (3.0ms) | Samples: 2

**Called by:**
- `performIteration` (2)

### `Function`
`[native code]` | Self: 0.2% (2.4ms) | Total: 0.2% (2.4ms) | Samples: 2

**Called by:**
- `value` (2)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:1556` | Self: 0.1% (1.8ms) | Total: 0.1% (1.8ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:2587` | Self: 0.1% (1.7ms) | Total: 0.1% (1.7ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `stringify`
`[native code]` | Self: 0.1% (1.6ms) | Total: 0.1% (1.6ms) | Samples: 1

**Called by:**
- `show` (1)

### `sub`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/registry.ts:288` | Self: 0.1% (1.6ms) | Total: 0.1% (1.6ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `um`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts:109` | Self: 0.1% (1.6ms) | Total: 0.1% (1.6ms) | Samples: 1

**Called by:**
- `flatIntoArrayWithCallback` (1)

### `tsParseBracketedList`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2353` | Self: 0.1% (1.6ms) | Total: 0.1% (1.6ms) | Samples: 1

**Called by:**
- `tsParseTupleType` (1)

### `tsParseBracketedList`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2351` | Self: 0.1% (1.5ms) | Total: 0.1% (1.5ms) | Samples: 1

**Called by:**
- `tsParseTypeParameters` (1)

### `/\r\n?\|\n\|\u2028\|\u2029/`
`[native code]` | Self: 0.1% (1.5ms) | Total: 0.1% (1.5ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `tsParseTypeMember`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:3375` | Self: 0.1% (1.5ms) | Total: 0.1% (1.5ms) | Samples: 1

**Called by:**
- `bound tsParseTypeMember` (1)

### `parseExport`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:3912` | Self: 0.1% (1.5ms) | Total: 0.1% (1.5ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `returned`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts` | Self: 0.1% (1.5ms) | Total: 0.1% (1.5ms) | Samples: 1

**Called by:**
- `fnExpr` (1)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:6040` | Self: 0.1% (1.5ms) | Total: 0.1% (1.5ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:2866` | Self: 0.1% (1.4ms) | Total: 0.1% (1.4ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `cloneObject`
`[native code]` | Self: 0.1% (1.4ms) | Total: 0.1% (1.4ms) | Samples: 1

**Called by:**
- `(module)` (1)

### `tsParseTypeAnnotation`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2472` | Self: 0.1% (1.4ms) | Total: 0.1% (1.4ms) | Samples: 1

**Called by:**
- `parseBindingListItem` (1)

### `bound tsParseTypeMember`
`[native code]` | Self: 0.1% (1.3ms) | Total: 1.7% (18.3ms) | Samples: 1

**Called by:**
- `tsParseList` (12)

**Calls:**
- `tsParsePropertyOrMethodSignature` (8)
- `tsParsePropertyOrMethodSignature` (1)
- `tsParseTypeMember` (1)
- `tsParseTypeMember` (1)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:3632` | Self: 0.1% (1.3ms) | Total: 0.1% (1.3ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `parseIdentNode`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js` | Self: 0.1% (1.3ms) | Total: 0.1% (1.3ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `readFileSync`
`[native code]` | Self: 0.1% (1.3ms) | Total: 0.2% (2.6ms) | Samples: 1

**Called by:**
- `(module)` (1)
- `readFileSync` (1)

**Calls:**
- `readFileSync` (1)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:5548` | Self: 0.1% (1.3ms) | Total: 0.1% (1.3ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `literal`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/registry.ts:204` | Self: 0.1% (1.2ms) | Total: 0.1% (1.2ms) | Samples: 1

**Called by:**
- `load` (1)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:5503` | Self: 0.1% (1.2ms) | Total: 0.9% (10.3ms) | Samples: 1

**Called by:**
- `(anonymous)` (4)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)

**Calls:**
- `(anonymous)` (6)

### `restoreParserCheckpoint`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js` | Self: 0.1% (1.2ms) | Total: 0.1% (1.2ms) | Samples: 1

**Called by:**
- `restore` (1)

### `Parser`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:604` | Self: 0.1% (1.2ms) | Total: 0.1% (1.2ms) | Samples: 1

**Called by:**
- `ParseDecorators` (1)

### `hidden`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts:514` | Self: 0.1% (1.2ms) | Total: 2.3% (25.0ms) | Samples: 1

**Called by:**
- `hidden` (17)

**Calls:**
- `hidden` (14)
- `hidden` (1)
- `hidden` (1)

### `paramAt`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts` | Self: 0.1% (1.1ms) | Total: 0.1% (1.1ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:5542` | Self: 0.0% (0us) | Total: 0.8% (9.0ms) | Samples: 0

**Called by:**
- `(anonymous)` (6)

**Calls:**
- `finishToken` (2)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:5648` | Self: 0.0% (0us) | Total: 0.1% (1.7ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `(anonymous)` (1)

### `parseExportDeclaration`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:4241` | Self: 0.0% (0us) | Total: 0.2% (3.1ms) | Samples: 0

**Called by:**
- `parseExport` (2)

**Calls:**
- `tsParseTypeAliasDeclaration` (1)
- `parseVarStatement` (1)

### `value`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/link.ts:31` | Self: 0.0% (0us) | Total: 0.3% (3.8ms) | Samples: 0

**Called by:**
- `map` (3)

**Calls:**
- `Function` (2)
- `anonymous` (1)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:3740` | Self: 0.0% (0us) | Total: 0.1% (1.3ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `parseIdentNode` (1)

### `parseExpressionStatement`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:4175` | Self: 0.0% (0us) | Total: 0.5% (5.5ms) | Samples: 0

**Called by:**
- `(anonymous)` (3)

**Calls:**
- `tsParseExpressionStatement` (3)

### `checkSources`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/core.ts:71` | Self: 0.0% (0us) | Total: 0.4% (4.6ms) | Samples: 0

**Called by:**
- `(module)` (3)

**Calls:**
- `distinctNames` (3)

### `parseParenAndDistinguishExpression`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:4904` | Self: 0.0% (0us) | Total: 0.1% (1.4ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `shouldParseArrow` (1)

### `Registry`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/registry.ts:50` | Self: 0.0% (0us) | Total: 0.1% (1.2ms) | Samples: 0

**Called by:**
- `checkSources` (1)

**Calls:**
- `load` (1)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:3703` | Self: 0.0% (0us) | Total: 0.1% (1.5ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `(anonymous)` (1)

### `tsParseNonConditionalType`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2911` | Self: 0.0% (0us) | Total: 0.1% (1.2ms) | Samples: 0

**Called by:**
- `tsParseType` (1)

**Calls:**
- `tsLookAhead` (1)

### `tsParseTupleType`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2776` | Self: 0.0% (0us) | Total: 0.1% (1.6ms) | Samples: 0

**Called by:**
- `tsParseArrayTypeOrHigher` (1)

**Calls:**
- `tsParseBracketedList` (1)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:1256` | Self: 0.0% (0us) | Total: 0.1% (1.7ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `(anonymous)` (1)

### `parseVarId`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:4503` | Self: 0.0% (0us) | Total: 0.5% (5.5ms) | Samples: 0

**Called by:**
- `(anonymous)` (3)

**Calls:**
- `tsParseTypeAnnotation` (3)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:3021` | Self: 0.0% (0us) | Total: 0.1% (1.5ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `(anonymous)` (1)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:1249` | Self: 0.0% (0us) | Total: 0.1% (1.5ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `(anonymous)` (1)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:1545` | Self: 0.0% (0us) | Total: 0.2% (2.8ms) | Samples: 0

**Called by:**
- `(anonymous)` (2)

**Calls:**
- `(anonymous)` (2)

### `hidden`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts:492` | Self: 0.0% (0us) | Total: 0.4% (5.1ms) | Samples: 0

**Called by:**
- `hidden` (3)

**Calls:**
- `(anonymous)` (2)
- `expand` (1)

### `tsFillSignature`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2569` | Self: 0.0% (0us) | Total: 0.1% (1.5ms) | Samples: 0

**Called by:**
- `tsParsePropertyOrMethodSignature` (1)

**Calls:**
- `tsParseTypeParameters` (1)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:2736` | Self: 0.0% (0us) | Total: 1.7% (18.5ms) | Samples: 0

**Called by:**
- `(anonymous)` (11)

**Calls:**
- `(anonymous)` (11)

### `tsParseList`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:3380` | Self: 0.0% (0us) | Total: 1.7% (18.3ms) | Samples: 0

**Called by:**
- `tsParseInterfaceBody` (8)
- `tsParseObjectTypeMembers` (4)

**Calls:**
- `bound tsParseTypeMember` (12)

### `parseVarStatement`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:4121` | Self: 0.0% (0us) | Total: 0.6% (6.9ms) | Samples: 0

**Called by:**
- `tsInAmbientContext` (3)
- `parseExportDeclaration` (1)

**Calls:**
- `(anonymous)` (3)
- `(anonymous)` (1)

### `tsFillSignature`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2571` | Self: 0.0% (0us) | Total: 0.8% (9.3ms) | Samples: 0

**Called by:**
- `tsParsePropertyOrMethodSignature` (5)
- `tsInAllowConditionalTypesContext` (1)

**Calls:**
- `tsParseBindingListForSignature` (6)

### `peek`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/registry.ts:99` | Self: 0.0% (0us) | Total: 12.6% (134.3ms) | Samples: 0

**Called by:**
- `hides` (51)
- `hides` (40)

**Calls:**
- `hidden` (91)

### `parseExport`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:3962` | Self: 0.0% (0us) | Total: 0.2% (3.1ms) | Samples: 0

**Called by:**
- `(anonymous)` (2)

**Calls:**
- `parseExportDeclaration` (2)

### `value`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/link.ts:27` | Self: 0.0% (0us) | Total: 0.9% (9.9ms) | Samples: 0

**Called by:**
- `(anonymous)` (5)
- `map` (2)

**Calls:**
- `map` (7)

### `checkSources`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/core.ts:64` | Self: 0.0% (0us) | Total: 1.9% (20.4ms) | Samples: 0

**Called by:**
- `(module)` (14)

**Calls:**
- `Registry` (13)
- `Registry` (1)

### `member`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts:770` | Self: 0.0% (0us) | Total: 0.1% (1.6ms) | Samples: 0

**Called by:**
- `infer` (1)

**Calls:**
- `flatIntoArrayWithCallback` (1)

### `fnExpr`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts:1089` | Self: 0.0% (0us) | Total: 25.8% (275.8ms) | Samples: 0

**Called by:**
- `checkSources` (94)
- `infer` (93)

**Calls:**
- `returned` (186)
- `returned` (1)

### `load`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/registry.ts:83` | Self: 0.0% (0us) | Total: 0.1% (1.2ms) | Samples: 0

**Called by:**
- `Registry` (1)

**Calls:**
- `literal` (1)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/link.ts:37` | Self: 0.0% (0us) | Total: 1.8% (19.2ms) | Samples: 0

**Called by:**
- `map` (12)

**Calls:**
- `value` (7)
- `value` (5)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:3261` | Self: 0.0% (0us) | Total: 0.1% (1.4ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `(anonymous)` (1)

### `bound tsParseIntersectionTypeOrHigher`
`[native code]` | Self: 0.0% (0us) | Total: 0.9% (10.4ms) | Samples: 0

**Called by:**
- `tsParseUnionOrIntersectionType` (6)

**Calls:**
- `tsParseUnionOrIntersectionType` (6)

### `(module)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/types.ts:16` | Self: 0.0% (0us) | Total: 0.7% (7.7ms) | Samples: 0

**Calls:**
- `link` (4)
- `cloneObject` (1)

### `flatIntoArrayWithCallback`
`[native code]` | Self: 0.0% (0us) | Total: 0.1% (1.6ms) | Samples: 0

**Called by:**
- `member` (1)

**Calls:**
- `um` (1)

### `tsParseTypeMemberSemicolon`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:3263` | Self: 0.0% (0us) | Total: 0.1% (1.7ms) | Samples: 0

**Called by:**
- `tsParsePropertyOrMethodSignature` (1)

**Calls:**
- `isLineTerminator` (1)

### `hidden`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts:494` | Self: 0.0% (0us) | Total: 15.0% (160.7ms) | Samples: 0

**Called by:**
- `peek` (91)
- `hidden` (14)
- `hidden` (3)
- `hidden` (1)

**Calls:**
- `hidden` (96)
- `hidden` (7)
- `hidden` (3)
- `hidden` (3)

### `tsParseTypeOperatorOrHigher`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2894` | Self: 0.0% (0us) | Total: 0.8% (8.6ms) | Samples: 0

**Called by:**
- `bound tsParseTypeOperatorOrHigher` (5)

**Calls:**
- `tsInAllowConditionalTypesContext` (5)

### `ImportAttributes`
`[native code]` | Self: 0.0% (0us) | Total: 0.1% (1.2ms) | Samples: 0

**Called by:**
- `EffectAdapter` (1)

**Calls:**
- `ParseDecorators` (1)

### `tsParseInterfaceBody`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:3420` | Self: 0.0% (0us) | Total: 1.0% (11.0ms) | Samples: 0

**Called by:**
- `tsParseInterfaceDeclaration` (8)

**Calls:**
- `tsParseList` (8)

### `bound tsParseType`
`[native code]` | Self: 0.0% (0us) | Total: 0.1% (1.6ms) | Samples: 0

**Called by:**
- `tsParseDelimitedListWorker` (1)

**Calls:**
- `tsParseType` (1)

### `finishToken`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:1990` | Self: 0.0% (0us) | Total: 0.2% (3.0ms) | Samples: 0

**Called by:**
- `(anonymous)` (2)

**Calls:**
- `updateContext` (2)

### `(module)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/parse.ts:11` | Self: 0.0% (0us) | Total: 1.3% (14.3ms) | Samples: 0

**Calls:**
- `extend` (1)

### `call`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts:1232` | Self: 0.0% (0us) | Total: 12.7% (135.5ms) | Samples: 0

**Called by:**
- `infer` (92)

**Calls:**
- `apply` (92)

### `tsParseDelimitedListWorker`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2317` | Self: 0.0% (0us) | Total: 0.1% (1.6ms) | Samples: 0

**Called by:**
- `tsParseDelimitedList` (1)

**Calls:**
- `bound tsParseType` (1)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:3267` | Self: 0.0% (0us) | Total: 0.1% (1.5ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `(anonymous)` (1)

### `TypeScriptParser`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:1577` | Self: 0.0% (0us) | Total: 0.1% (1.2ms) | Samples: 0

**Called by:**
- `parse` (1)

**Calls:**
- `EffectAdapter` (1)

### `shouldParseArrow`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:4844` | Self: 0.0% (0us) | Total: 0.1% (1.4ms) | Samples: 0

**Called by:**
- `parseParenAndDistinguishExpression` (1)

**Calls:**
- `tryParse` (1)

### `(module)`
`bun:main:14` | Self: 0.0% (0us) | Total: 0.3% (4.0ms) | Samples: 0

**Calls:**
- `isServerConfig` (1)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:1544` | Self: 0.0% (0us) | Total: 0.1% (1.8ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `(anonymous)` (1)

### `parseArrowExpression`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:4525` | Self: 0.0% (0us) | Total: 0.1% (1.4ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `parseFunctionBody` (1)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:2549` | Self: 0.0% (0us) | Total: 0.1% (1.7ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `(anonymous)` (1)

### `tsParseInterfaceBody`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:3422` | Self: 0.0% (0us) | Total: 0.1% (1.2ms) | Samples: 0

**Called by:**
- `tsParseInterfaceDeclaration` (1)

**Calls:**
- `(anonymous)` (1)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:3489` | Self: 0.0% (0us) | Total: 0.1% (1.5ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `(anonymous)` (1)

### `Registry`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/registry.ts:49` | Self: 0.0% (0us) | Total: 1.8% (19.1ms) | Samples: 0

**Called by:**
- `checkSources` (13)

**Calls:**
- `parse` (13)

### `tsParsePropertyOrMethodSignature`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:3293` | Self: 0.0% (0us) | Total: 1.1% (12.4ms) | Samples: 0

**Called by:**
- `bound tsParseTypeMember` (8)

**Calls:**
- `tsFillSignature` (5)
- `tsFillSignature` (2)
- `tsFillSignature` (1)

### `tsParsePropertyOrMethodSignature`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:3334` | Self: 0.0% (0us) | Total: 0.1% (1.7ms) | Samples: 0

**Called by:**
- `bound tsParseTypeMember` (1)

**Calls:**
- `tsParseTypeMemberSemicolon` (1)

### `extend`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:681` | Self: 0.0% (0us) | Total: 1.3% (14.3ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `(anonymous)` (1)

### `link`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/link.ts:37` | Self: 0.0% (0us) | Total: 1.8% (19.2ms) | Samples: 0

**Called by:**
- `(module)` (8)
- `(module)` (4)

**Calls:**
- `map` (12)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:2774` | Self: 0.0% (0us) | Total: 5.2% (55.6ms) | Samples: 0

**Called by:**
- `(anonymous)` (11)
- `(anonymous)` (10)
- `(anonymous)` (9)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)

**Calls:**
- `(anonymous)` (33)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:2295` | Self: 0.0% (0us) | Total: 0.1% (1.8ms) | Samples: 0

**Called by:**
- `tsParseBindingListForSignature` (1)

**Calls:**
- `(anonymous)` (1)

### `tsParseTypeAliasDeclaration`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:3555` | Self: 0.0% (0us) | Total: 0.1% (1.7ms) | Samples: 0

**Called by:**
- `parseExportDeclaration` (1)

**Calls:**
- `tsInType` (1)

### `tsInAllowConditionalTypesContext`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2437` | Self: 0.0% (0us) | Total: 1.3% (13.9ms) | Samples: 0

**Called by:**
- `tsParseTypeOperatorOrHigher` (5)
- `tsParseFunctionOrConstructorType` (2)
- `bound tsParseTypeOperatorOrHigher` (1)

**Calls:**
- `tsParseArrayTypeOrHigher` (6)
- `tsFillSignature` (1)
- `tsFillSignature` (1)

### `hidden`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts:499` | Self: 0.0% (0us) | Total: 13.2% (141.3ms) | Samples: 0

**Called by:**
- `hidden` (96)

**Calls:**
- `filter` (78)
- `hidden` (17)
- `hidden` (1)

### `tsTryParse`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:3028` | Self: 0.0% (0us) | Total: 0.3% (3.5ms) | Samples: 0

**Called by:**
- `(anonymous)` (2)

**Calls:**
- `begin` (2)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:3091` | Self: 0.0% (0us) | Total: 0.1% (1.7ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `(anonymous)` (1)

### `filter`
`[native code]` | Self: 0.0% (0us) | Total: 10.9% (116.4ms) | Samples: 0

**Called by:**
- `hidden` (78)
- `show` (1)

**Calls:**
- `sub` (77)
- `(anonymous)` (1)
- `(anonymous)` (1)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:795` | Self: 0.0% (0us) | Total: 0.1% (1.5ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `/\r\n?\|\n\|\u2028\|\u2029/` (1)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:5989` | Self: 0.0% (0us) | Total: 0.1% (1.5ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `(anonymous)` (1)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:3126` | Self: 0.0% (0us) | Total: 4.6% (49.1ms) | Samples: 0

**Called by:**
- `(anonymous)` (29)

**Calls:**
- `(anonymous)` (16)
- `(anonymous)` (10)
- `(anonymous)` (1)
- `parseArrowExpression` (1)
- `parseParenAndDistinguishExpression` (1)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:827` | Self: 0.0% (0us) | Total: 0.2% (2.5ms) | Samples: 0

**Called by:**
- `tsParseInterfaceBody` (1)
- `(anonymous)` (1)

**Calls:**
- `(anonymous)` (2)

### `tsInType`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2960` | Self: 0.0% (0us) | Total: 2.0% (21.6ms) | Samples: 0

**Called by:**
- `tsParseTypeAnnotation` (7)
- `tsParseTypeOrTypePredicateAnnotation` (3)
- `tsFillSignature` (1)
- `tsParseTypeArguments` (1)
- `tsParseTypeAliasDeclaration` (1)

**Calls:**
- `(anonymous)` (7)
- `(anonymous)` (2)
- `tsParseType` (1)
- `(anonymous)` (1)
- `tsParseTypeAnnotation` (1)
- `tsInNoContext` (1)

### `expand`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/registry.ts:240` | Self: 0.0% (0us) | Total: 0.1% (1.3ms) | Samples: 0

**Called by:**
- `holds` (1)

**Calls:**
- `map` (1)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:2969` | Self: 0.0% (0us) | Total: 0.1% (1.5ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `(anonymous)` (1)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:2851` | Self: 0.0% (0us) | Total: 0.1% (1.4ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `(anonymous)` (1)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:3297` | Self: 0.0% (0us) | Total: 1.5% (16.7ms) | Samples: 0

**Called by:**
- `(anonymous)` (10)

**Calls:**
- `(anonymous)` (10)

### `check`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts:424` | Self: 0.0% (0us) | Total: 38.3% (408.7ms) | Samples: 0

**Called by:**
- `returned` (186)
- `(anonymous)` (91)

**Calls:**
- `check1` (93)
- `infer` (93)
- `check1` (91)

### `(module)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/profile-call.ts:7` | Self: 0.0% (0us) | Total: 0.1% (1.3ms) | Samples: 0

**Calls:**
- `readFileSync` (1)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts:1297` | Self: 0.0% (0us) | Total: 0.1% (1.1ms) | Samples: 0

**Called by:**
- `forEach` (1)

**Calls:**
- `paramAt` (1)

### `tsLookAhead`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:1899` | Self: 0.0% (0us) | Total: 0.1% (1.2ms) | Samples: 0

**Called by:**
- `tsParseNonConditionalType` (1)

**Calls:**
- `rollback` (1)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:890` | Self: 0.0% (0us) | Total: 2.1% (22.5ms) | Samples: 0

**Called by:**
- `(anonymous)` (15)

**Calls:**
- `parseStatement` (9)
- `parseExpressionStatement` (3)
- `parseExport` (2)
- `parseExport` (1)

### `value`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/link.ts:26` | Self: 0.0% (0us) | Total: 1.4% (15.3ms) | Samples: 0

**Called by:**
- `(anonymous)` (7)
- `map` (2)

**Calls:**
- `(anonymous)` (9)

### `parse`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:5373` | Self: 0.0% (0us) | Total: 0.1% (1.2ms) | Samples: 0

**Called by:**
- `parse` (1)

**Calls:**
- `TypeScriptParser` (1)

### `apply`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts:1296` | Self: 0.0% (0us) | Total: 12.7% (135.5ms) | Samples: 0

**Called by:**
- `call` (92)

**Calls:**
- `forEach` (92)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:2948` | Self: 0.0% (0us) | Total: 0.2% (2.9ms) | Samples: 0

**Called by:**
- `(anonymous)` (2)

**Calls:**
- `(anonymous)` (1)
- `(anonymous)` (1)

### `ParseDecorators`
`[native code]` | Self: 0.0% (0us) | Total: 0.1% (1.2ms) | Samples: 0

**Called by:**
- `ImportAttributes` (1)

**Calls:**
- `Parser` (1)

### `tsInNoContext`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:1805` | Self: 0.0% (0us) | Total: 0.1% (1.6ms) | Samples: 0

**Called by:**
- `tsInType` (1)

**Calls:**
- `tsParseDelimitedList` (1)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:1483` | Self: 0.0% (0us) | Total: 0.5% (5.5ms) | Samples: 0

**Called by:**
- `parseVarStatement` (3)

**Calls:**
- `parseVarId` (3)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:3650` | Self: 0.0% (0us) | Total: 1.2% (13.6ms) | Samples: 0

**Called by:**
- `(anonymous)` (6)
- `(anonymous)` (2)

**Calls:**
- `(anonymous)` (8)

### `parseMaybeConditional`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:4198` | Self: 0.0% (0us) | Total: 0.2% (2.8ms) | Samples: 0

**Called by:**
- `parseMaybeAssignOrigin` (2)

**Calls:**
- `(anonymous)` (2)

### `tsParseInterfaceDeclaration`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:3408` | Self: 0.0% (0us) | Total: 1.1% (12.3ms) | Samples: 0

**Called by:**
- `parseStatement` (9)

**Calls:**
- `tsParseInterfaceBody` (8)
- `tsParseInterfaceBody` (1)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:1239` | Self: 0.0% (0us) | Total: 0.1% (1.4ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `(anonymous)` (1)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:752` | Self: 0.0% (0us) | Total: 0.5% (5.6ms) | Samples: 0

**Called by:**
- `(anonymous)` (2)
- `(anonymous)` (1)
- `isLineTerminator` (1)

**Calls:**
- `(anonymous)` (4)

### `parse`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/parse.ts:30` | Self: 0.0% (0us) | Total: 2.2% (23.8ms) | Samples: 0

**Called by:**
- `Registry` (13)
- `distinctNames` (3)

**Calls:**
- `(anonymous)` (15)
- `parse` (1)

### `tsParseBindingListForSignature`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2443` | Self: 0.0% (0us) | Total: 0.8% (9.3ms) | Samples: 0

**Called by:**
- `tsFillSignature` (6)

**Calls:**
- `(anonymous)` (4)
- `(anonymous)` (1)
- `(anonymous)` (1)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:2287` | Self: 0.0% (0us) | Total: 0.1% (1.3ms) | Samples: 0

**Called by:**
- `tsParseBindingListForSignature` (1)

**Calls:**
- `(anonymous)` (1)

### `parseFunctionBody`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:3732` | Self: 0.0% (0us) | Total: 0.1% (1.4ms) | Samples: 0

**Called by:**
- `parseArrowExpression` (1)

**Calls:**
- `(anonymous)` (1)

### `expand`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/registry.ts:233` | Self: 0.0% (0us) | Total: 4.4% (47.3ms) | Samples: 0

**Called by:**
- `holds` (32)
- `sub` (1)

**Calls:**
- `(anonymous)` (33)

### `hides`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts:463` | Self: 0.0% (0us) | Total: 7.0% (75.1ms) | Samples: 0

**Called by:**
- `check1` (51)

**Calls:**
- `peek` (51)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:2848` | Self: 0.0% (0us) | Total: 0.1% (1.5ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `(anonymous)` (1)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2475` | Self: 0.0% (0us) | Total: 1.1% (11.8ms) | Samples: 0

**Called by:**
- `tsInType` (7)

**Calls:**
- `tsParseType` (7)

### `tsParseArrayTypeOrHigher`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2875` | Self: 0.0% (0us) | Total: 0.9% (10.4ms) | Samples: 0

**Called by:**
- `tsInAllowConditionalTypesContext` (6)

**Calls:**
- `tsParseTypeLiteral` (4)
- `tsParseTypeReference` (1)
- `tsParseTupleType` (1)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:1241` | Self: 0.0% (0us) | Total: 0.2% (2.8ms) | Samples: 0

**Called by:**
- `(anonymous)` (2)

**Calls:**
- `(anonymous)` (1)
- `(anonymous)` (1)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:3626` | Self: 0.0% (0us) | Total: 1.6% (17.2ms) | Samples: 0

**Called by:**
- `(anonymous)` (9)
- `parseFunctionBody` (1)

**Calls:**
- `(anonymous)` (9)
- `parseMaybeAssignOrigin` (1)

### `tsFillSignature`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2573` | Self: 0.0% (0us) | Total: 0.2% (2.1ms) | Samples: 0

**Called by:**
- `tsInAllowConditionalTypesContext` (1)

**Calls:**
- `tsParseTypeOrTypePredicateAnnotation` (1)

### `binary`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts:868` | Self: 0.0% (0us) | Total: 30.3% (323.7ms) | Samples: 0

**Called by:**
- `infer` (219)

**Calls:**
- `infer` (219)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:1562` | Self: 0.0% (0us) | Total: 1.3% (14.3ms) | Samples: 0

**Called by:**
- `extend` (1)

**Calls:**
- `generateJsxParser` (1)

### `parseAssignableListItem`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:4678` | Self: 0.0% (0us) | Total: 0.5% (6.1ms) | Samples: 0

**Called by:**
- `(anonymous)` (4)

**Calls:**
- `parseBindingListItem` (4)

### `returned`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts:1111` | Self: 0.0% (0us) | Total: 25.7% (274.3ms) | Samples: 0

**Called by:**
- `fnExpr` (186)

**Calls:**
- `check` (186)

### `parseBindingListItem`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:4716` | Self: 0.0% (0us) | Total: 0.5% (6.1ms) | Samples: 0

**Called by:**
- `parseAssignableListItem` (4)

**Calls:**
- `tsParseTypeAnnotation` (3)
- `tsParseTypeAnnotation` (1)

### `check1`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts:447` | Self: 0.0% (0us) | Total: 12.6% (134.3ms) | Samples: 0

**Called by:**
- `check` (91)

**Calls:**
- `hides` (51)
- `hides` (40)

### `tsParseTypeLiteral`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2733` | Self: 0.0% (0us) | Total: 0.6% (7.2ms) | Samples: 0

**Called by:**
- `tsParseArrayTypeOrHigher` (4)

**Calls:**
- `tsParseObjectTypeMembers` (4)

### `tsInAmbientContext`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:3509` | Self: 0.0% (0us) | Total: 0.5% (5.5ms) | Samples: 0

**Called by:**
- `tsParseExpressionStatement` (3)

**Calls:**
- `parseVarStatement` (3)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:2825` | Self: 0.0% (0us) | Total: 5.1% (55.4ms) | Samples: 0

**Called by:**
- `(anonymous)` (31)
- `parseMaybeConditional` (2)

**Calls:**
- `(anonymous)` (33)

### `isLineTerminator`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:1999` | Self: 0.0% (0us) | Total: 0.1% (1.7ms) | Samples: 0

**Called by:**
- `tsParseTypeMemberSemicolon` (1)

**Calls:**
- `(anonymous)` (1)

### `hidden`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts:506` | Self: 0.0% (0us) | Total: 0.1% (1.6ms) | Samples: 0

**Called by:**
- `hidden` (1)

**Calls:**
- `hidden` (1)

### `tsParseTypeOrTypePredicateAnnotation`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2506` | Self: 0.0% (0us) | Total: 0.4% (5.1ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)
- `tsFillSignature` (1)
- `tsFillSignature` (1)

**Calls:**
- `tsInType` (3)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:2302` | Self: 0.0% (0us) | Total: 0.5% (6.1ms) | Samples: 0

**Called by:**
- `tsParseBindingListForSignature` (4)

**Calls:**
- `parseAssignableListItem` (4)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:1078` | Self: 0.0% (0us) | Total: 0.2% (2.9ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `(anonymous)` (1)

### `parseStatement`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:4151` | Self: 0.0% (0us) | Total: 1.1% (12.3ms) | Samples: 0

**Called by:**
- `(anonymous)` (9)

**Calls:**
- `tsParseInterfaceDeclaration` (9)

### `(module)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/profile-call.ts:13` | Self: 0.0% (0us) | Total: 95.6% (1.01s) | Samples: 0

**Calls:**
- `checkSources` (577)
- `checkSources` (94)
- `checkSources` (14)
- `checkSources` (3)

### `forEach`
`[native code]` | Self: 0.0% (0us) | Total: 12.7% (135.5ms) | Samples: 0

**Called by:**
- `apply` (92)

**Calls:**
- `(anonymous)` (91)
- `(anonymous)` (1)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:775` | Self: 0.0% (0us) | Total: 3.8% (41.1ms) | Samples: 0

**Called by:**
- `parse` (15)
- `value` (9)
- `(anonymous)` (1)
- `(anonymous)` (1)

**Calls:**
- `(anonymous)` (15)
- `(anonymous)` (11)

### `checkSources`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/core.ts:347` | Self: 0.0% (0us) | Total: 80.2% (855.9ms) | Samples: 0

**Called by:**
- `(module)` (577)

**Calls:**
- `holds` (577)

### `node:fs`
`node:fs:2` | Self: 0.0% (0us) | Total: 0.5% (6.0ms) | Samples: 0

**Calls:**
- `anonymous` (2)

### `tsParseTypeMember`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:3370` | Self: 0.0% (0us) | Total: 0.1% (1.3ms) | Samples: 0

**Called by:**
- `bound tsParseTypeMember` (1)

**Calls:**
- `(anonymous)` (1)

### `EffectAdapter`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:1304` | Self: 0.0% (0us) | Total: 0.1% (1.2ms) | Samples: 0

**Called by:**
- `TypeScriptParser` (1)

**Calls:**
- `ImportAttributes` (1)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts:499` | Self: 0.0% (0us) | Total: 0.1% (1.6ms) | Samples: 0

**Called by:**
- `filter` (1)

**Calls:**
- `sub` (1)

### `checkSources`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/core.ts:320` | Self: 0.0% (0us) | Total: 13.0% (138.6ms) | Samples: 0

**Called by:**
- `(module)` (94)

**Calls:**
- `fnExpr` (94)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2508` | Self: 0.0% (0us) | Total: 0.1% (1.3ms) | Samples: 0

**Called by:**
- `tsInType` (1)

**Calls:**
- `(anonymous)` (1)

### `tsParseDelimitedList`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2341` | Self: 0.0% (0us) | Total: 0.1% (1.6ms) | Samples: 0

**Called by:**
- `tsInNoContext` (1)

**Calls:**
- `tsParseDelimitedListWorker` (1)

### `parseMaybeAssignOrigin`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:4567` | Self: 0.0% (0us) | Total: 0.2% (2.8ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)
- `(anonymous)` (1)

**Calls:**
- `parseMaybeConditional` (2)

### `hides`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts:465` | Self: 0.0% (0us) | Total: 5.5% (59.2ms) | Samples: 0

**Called by:**
- `check1` (40)

**Calls:**
- `peek` (40)

### `rollback`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:1005` | Self: 0.0% (0us) | Total: 0.1% (1.2ms) | Samples: 0

**Called by:**
- `tsLookAhead` (1)

**Calls:**
- `restore` (1)

### `infer`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts:578` | Self: 0.0% (0us) | Total: 56.1% (598.1ms) | Samples: 0

**Called by:**
- `binary` (219)
- `check` (93)
- `check1` (93)

**Calls:**
- `binary` (219)
- `fnExpr` (93)
- `call` (92)
- `member` (1)

### `tsParseObjectTypeMembers`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:3386` | Self: 0.0% (0us) | Total: 0.6% (7.2ms) | Samples: 0

**Called by:**
- `tsParseTypeLiteral` (4)

**Calls:**
- `tsParseList` (4)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:3741` | Self: 0.0% (0us) | Total: 0.1% (1.7ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `(anonymous)` (1)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:3444` | Self: 0.0% (0us) | Total: 0.1% (1.5ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `(anonymous)` (1)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:3303` | Self: 0.0% (0us) | Total: 0.1% (1.5ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `(anonymous)` (1)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:2897` | Self: 0.0% (0us) | Total: 5.1% (55.4ms) | Samples: 0

**Called by:**
- `(anonymous)` (33)

**Calls:**
- `(anonymous)` (31)
- `(anonymous)` (2)

### `tsParseTypeReference`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2806` | Self: 0.0% (0us) | Total: 0.1% (1.6ms) | Samples: 0

**Called by:**
- `tsParseArrayTypeOrHigher` (1)

**Calls:**
- `tsParseTypeArguments` (1)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2522` | Self: 0.0% (0us) | Total: 0.3% (3.5ms) | Samples: 0

**Called by:**
- `tsInType` (2)

**Calls:**
- `tsTryParse` (2)

### `begin`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:980` | Self: 0.0% (0us) | Total: 0.3% (3.5ms) | Samples: 0

**Called by:**
- `tsTryParse` (2)

**Calls:**
- `captureParserCheckpoint` (2)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:2808` | Self: 0.0% (0us) | Total: 5.2% (55.6ms) | Samples: 0

**Called by:**
- `(anonymous)` (33)

**Calls:**
- `(anonymous)` (31)
- `(anonymous)` (1)
- `(anonymous)` (1)

### `distinctNames`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/core.ts:393` | Self: 0.0% (0us) | Total: 0.4% (4.6ms) | Samples: 0

**Called by:**
- `checkSources` (3)

**Calls:**
- `parse` (3)

### `tsParseUnionOrIntersectionType`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2607` | Self: 0.0% (0us) | Total: 1.9% (20.9ms) | Samples: 0

**Called by:**
- `bound tsParseIntersectionTypeOrHigher` (6)
- `tsParseType` (6)

**Calls:**
- `bound tsParseIntersectionTypeOrHigher` (6)
- `bound tsParseTypeOperatorOrHigher` (6)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:1349` | Self: 0.0% (0us) | Total: 0.1% (1.3ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `(anonymous)` (1)

### `tsParseTypeParameters`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:3005` | Self: 0.0% (0us) | Total: 0.1% (1.5ms) | Samples: 0

**Called by:**
- `tsFillSignature` (1)

**Calls:**
- `tsParseBracketedList` (1)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts:1314` | Self: 0.0% (0us) | Total: 12.6% (134.3ms) | Samples: 0

**Called by:**
- `forEach` (91)

**Calls:**
- `check` (91)

### `bound tsParseTypeOperatorOrHigher`
`[native code]` | Self: 0.0% (0us) | Total: 0.9% (10.4ms) | Samples: 0

**Called by:**
- `tsParseUnionOrIntersectionType` (6)

**Calls:**
- `tsParseTypeOperatorOrHigher` (5)
- `tsInAllowConditionalTypesContext` (1)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:1418` | Self: 0.0% (0us) | Total: 1.5% (16.5ms) | Samples: 0

**Called by:**
- `(anonymous)` (8)
- `(anonymous)` (1)
- `(anonymous)` (1)

**Calls:**
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)

### `check1`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts:444` | Self: 0.0% (0us) | Total: 12.8% (137.1ms) | Samples: 0

**Called by:**
- `check` (93)

**Calls:**
- `infer` (93)

### `isAlias`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/registry.ts:282` | Self: 0.0% (0us) | Total: 7.5% (80.9ms) | Samples: 0

**Called by:**
- `holds` (53)
- `sub` (1)

**Calls:**
- `(anonymous)` (54)

### `tsParseFunctionOrConstructorType`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2599` | Self: 0.0% (0us) | Total: 0.3% (3.4ms) | Samples: 0

**Called by:**
- `tsParseType` (2)

**Calls:**
- `tsInAllowConditionalTypesContext` (2)

### `member`
`[native code]` | Self: 0.0% (0us) | Total: 0.1% (1.7ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `expand` (1)

### `tsParseTypeArguments`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:3222` | Self: 0.0% (0us) | Total: 0.1% (1.6ms) | Samples: 0

**Called by:**
- `tsParseTypeReference` (1)

**Calls:**
- `tsInType` (1)

### `tsParseType`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2928` | Self: 0.0% (0us) | Total: 1.4% (15.2ms) | Samples: 0

**Called by:**
- `(anonymous)` (7)
- `tsInType` (1)
- `bound tsParseType` (1)

**Calls:**
- `tsParseUnionOrIntersectionType` (6)
- `tsParseFunctionOrConstructorType` (2)
- `tsParseNonConditionalType` (1)

### `node:fs/promises`
`node:fs/promises:2` | Self: 0.0% (0us) | Total: 0.5% (6.0ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `anonymous` (2)

### `tsParseTypeAnnotation`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2473` | Self: 0.0% (0us) | Total: 1.1% (11.8ms) | Samples: 0

**Called by:**
- `parseVarId` (3)
- `parseBindingListItem` (3)
- `tsInType` (1)

**Calls:**
- `tsInType` (7)

### `(module)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/runtime-ss.ts:15` | Self: 0.0% (0us) | Total: 1.2% (12.9ms) | Samples: 0

**Calls:**
- `link` (8)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:2945` | Self: 0.0% (0us) | Total: 4.9% (52.4ms) | Samples: 0

**Called by:**
- `(anonymous)` (31)

**Calls:**
- `(anonymous)` (29)
- `(anonymous)` (1)
- `(anonymous)` (1)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:1290` | Self: 0.0% (0us) | Total: 0.1% (1.7ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `(anonymous)` (1)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:4845` | Self: 0.0% (0us) | Total: 0.1% (1.4ms) | Samples: 0

**Called by:**
- `tryParse` (1)

**Calls:**
- `tsParseTypeOrTypePredicateAnnotation` (1)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:1470` | Self: 0.0% (0us) | Total: 0.1% (1.4ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `(anonymous)` (1)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:3611` | Self: 0.0% (0us) | Total: 2.6% (28.0ms) | Samples: 0

**Called by:**
- `(anonymous)` (16)

**Calls:**
- `(anonymous)` (9)
- `(anonymous)` (6)
- `(anonymous)` (1)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:3559` | Self: 0.0% (0us) | Total: 0.1% (1.3ms) | Samples: 0

**Called by:**
- `tsParseTypeMember` (1)

**Calls:**
- `(anonymous)` (1)

### `tsParseExpressionStatement`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:3444` | Self: 0.0% (0us) | Total: 0.5% (5.5ms) | Samples: 0

**Called by:**
- `parseExpressionStatement` (3)

**Calls:**
- `tsInAmbientContext` (3)

### `tryParse`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:1679` | Self: 0.0% (0us) | Total: 0.1% (1.4ms) | Samples: 0

**Called by:**
- `shouldParseArrow` (1)

**Calls:**
- `(anonymous)` (1)

### `tsFillSignature`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2575` | Self: 0.0% (0us) | Total: 0.2% (2.9ms) | Samples: 0

**Called by:**
- `tsParsePropertyOrMethodSignature` (2)

**Calls:**
- `tsInType` (1)
- `tsParseTypeOrTypePredicateAnnotation` (1)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:3516` | Self: 0.0% (0us) | Total: 0.1% (1.5ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `(anonymous)` (1)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:1485` | Self: 0.0% (0us) | Total: 0.2% (2.7ms) | Samples: 0

**Called by:**
- `parseVarStatement` (1)
- `(anonymous)` (1)

**Calls:**
- `parseMaybeAssignOrigin` (1)
- `(anonymous)` (1)

### `restore`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:1175` | Self: 0.0% (0us) | Total: 0.1% (1.2ms) | Samples: 0

**Called by:**
- `rollback` (1)

**Calls:**
- `restoreParserCheckpoint` (1)

## Files

| Self% | Self | File |
|------:|-----:|------|
| 79.1% | 843.4ms | `[native code]` |
| 13.9% | 149.1ms | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/registry.ts` |
| 2.9% | 31.1ms | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js` |
| 1.8% | 19.4ms | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs` |
| 1.7% | 18.8ms | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts` |
| 0.3% | 4.0ms | `bun:main` |
