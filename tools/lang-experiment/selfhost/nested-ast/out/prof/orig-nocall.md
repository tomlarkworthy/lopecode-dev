# CPU Profile

| Duration | Samples | Interval | Functions |
|----------|---------|----------|----------|
| 920.5ms | 599 | 1.0ms | 176 |

**Top 10:** `(anonymous)` 22.8%, `holds` 17.2%, `performIteration` 16.3%, `map` 13.8%, `decl` 12.8%, `flatMap` 5.7%, `show` 2.6%, `toString` 1.2%, `expand` 1.0%, `expand` 1.0%

## Hot Functions (Self Time)

| Self% | Self | Total% | Total | Function | Location |
|------:|-----:|-------:|------:|----------|----------|
| 22.8% | 210.4ms | 75.1% | 691.7ms | `(anonymous)` | `[native code]` |
| 17.2% | 158.3ms | 100.0% | 11.03s | `holds` | `[native code]` |
| 16.3% | 150.5ms | 16.9% | 156.4ms | `performIteration` | `[native code]` |
| 13.8% | 127.4ms | 17.5% | 161.9ms | `map` | `[native code]` |
| 12.8% | 118.5ms | 12.8% | 118.5ms | `decl` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/registry.ts:105` |
| 5.7% | 53.2ms | 5.7% | 53.2ms | `flatMap` | `[native code]` |
| 2.6% | 24.0ms | 2.7% | 25.5ms | `show` | `[native code]` |
| 1.2% | 11.2ms | 1.2% | 11.2ms | `toString` | `[native code]` |
| 1.0% | 9.5ms | 1.0% | 9.5ms | `expand` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/registry.ts:234` |
| 1.0% | 9.4ms | 1.0% | 9.4ms | `expand` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/registry.ts:242` |
| 0.8% | 7.4ms | 1.4% | 13.3ms | `anonymous` | `[native code]` |
| 0.6% | 5.8ms | 0.6% | 5.8ms | `[Symbol.iterator]` | `[native code]` |
| 0.3% | 2.8ms | 0.3% | 2.8ms | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:5794` |
| 0.1% | 1.8ms | 0.1% | 1.8ms | `SourceLocation` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:304` |
| 0.1% | 1.7ms | 0.1% | 1.7ms | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:1414` |
| 0.1% | 1.7ms | 0.1% | 1.7ms | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs` |
| 0.1% | 1.7ms | 0.1% | 1.7ms | `test` | `[native code]` |
| 0.1% | 1.6ms | 0.1% | 1.6ms | `fnExpr` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts` |
| 0.1% | 1.6ms | 0.3% | 3.4ms | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:3957` |
| 0.1% | 1.5ms | 0.1% | 1.5ms | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:2824` |
| 0.1% | 1.5ms | 0.1% | 1.5ms | `tsIsAccessModifier` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js` |
| 0.1% | 1.5ms | 0.1% | 1.5ms | `tsParseIntersectionTypeOrHigher` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2897` |
| 0.1% | 1.5ms | 0.1% | 1.5ms | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:3977` |
| 0.1% | 1.5ms | 0.1% | 1.5ms | `tsInAmbientContext` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:3511` |
| 0.1% | 1.4ms | 0.1% | 1.4ms | `stringToNumber` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:5961` |
| 0.1% | 1.4ms | 6.1% | 56.2ms | `expand` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/registry.ts:232` |
| 0.1% | 1.4ms | 0.1% | 1.4ms | `deactivateCallbacks` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:1110` |
| 0.1% | 1.4ms | 0.1% | 1.4ms | `checkSources` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/core.ts` |
| 0.1% | 1.3ms | 0.1% | 1.3ms | `captureParserCheckpoint` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:1220` |
| 0.1% | 1.3ms | 0.1% | 1.3ms | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:3435` |
| 0.1% | 1.2ms | 0.1% | 1.2ms | `bind` | `[native code]` |
| 0.1% | 1.2ms | 0.1% | 1.2ms | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:891` |
| 0.1% | 1.2ms | 0.1% | 1.2ms | `finishNodeAt` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:3969` |
| 0.1% | 977us | 0.1% | 977us | `log` | `[native code]` |

## Call Tree (Total Time)

| Total% | Total | Self% | Self | Function | Location |
|-------:|------:|------:|-----:|----------|----------|
| 100.0% | 11.03s | 17.2% | 158.3ms | `holds` | `[native code]` |
| 96.5% | 888.3ms | 0.0% | 0us | `(module)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/profile-call.ts:16` |
| 93.9% | 864.2ms | 0.0% | 0us | `checkSources` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/core.ts:347` |
| 75.1% | 691.7ms | 22.8% | 210.4ms | `(anonymous)` | `[native code]` |
| 17.5% | 161.9ms | 13.8% | 127.4ms | `map` | `[native code]` |
| 16.9% | 156.4ms | 16.3% | 150.5ms | `performIteration` | `[native code]` |
| 12.8% | 118.5ms | 12.8% | 118.5ms | `decl` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/registry.ts:105` |
| 8.8% | 81.7ms | 0.0% | 0us | `isAlias` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/registry.ts:282` |
| 6.1% | 56.2ms | 0.1% | 1.4ms | `expand` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/registry.ts:232` |
| 5.7% | 53.2ms | 5.7% | 53.2ms | `flatMap` | `[native code]` |
| 5.3% | 49.6ms | 0.0% | 0us | `expand` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/registry.ts:233` |
| 4.6% | 42.7ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:2774` |
| 4.6% | 42.7ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:2808` |
| 4.3% | 39.7ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:2897` |
| 4.3% | 39.7ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:2825` |
| 4.1% | 38.1ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:2945` |
| 3.5% | 32.9ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:775` |
| 3.4% | 31.5ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:3126` |
| 2.8% | 25.8ms | 0.0% | 0us | `tsParseUnionOrIntersectionType` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2607` |
| 2.7% | 25.5ms | 2.6% | 24.0ms | `show` | `[native code]` |
| 2.7% | 25.0ms | 0.0% | 0us | `link` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/link.ts:37` |
| 2.7% | 25.0ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/link.ts:37` |
| 2.4% | 22.2ms | 0.0% | 0us | `tsInType` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2960` |
| 2.2% | 20.5ms | 0.0% | 0us | `(module)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/runtime-ss.ts:15` |
| 2.0% | 18.4ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:3611` |
| 1.9% | 18.1ms | 0.0% | 0us | `tsParseType` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2928` |
| 1.7% | 16.5ms | 0.0% | 0us | `tsInAllowConditionalTypesContext` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2437` |
| 1.7% | 16.5ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:2736` |
| 1.7% | 16.4ms | 0.0% | 0us | `parse` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/parse.ts:30` |
| 1.6% | 15.1ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:890` |
| 1.5% | 14.1ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:1418` |
| 1.4% | 13.7ms | 0.0% | 0us | `bound tsParseIntersectionTypeOrHigher` | `[native code]` |
| 1.4% | 13.6ms | 0.0% | 0us | `tsParseList` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:3380` |
| 1.4% | 13.6ms | 0.0% | 0us | `bound tsParseTypeMember` | `[native code]` |
| 1.4% | 13.3ms | 0.8% | 7.4ms | `anonymous` | `[native code]` |
| 1.4% | 13.1ms | 0.0% | 0us | `checkSources` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/core.ts:64` |
| 1.4% | 13.1ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2475` |
| 1.4% | 13.1ms | 0.0% | 0us | `tsParseTypeAnnotation` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2473` |
| 1.4% | 13.0ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:3297` |
| 1.3% | 12.4ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:3650` |
| 1.3% | 12.1ms | 0.0% | 0us | `tsParseTypeOperatorOrHigher` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2894` |
| 1.3% | 12.1ms | 0.0% | 0us | `bound tsParseTypeOperatorOrHigher` | `[native code]` |
| 1.3% | 12.1ms | 0.0% | 0us | `tsParseArrayTypeOrHigher` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2875` |
| 1.2% | 11.4ms | 0.0% | 0us | `Registry` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/registry.ts:49` |
| 1.2% | 11.2ms | 0.0% | 0us | `String` | `[native code]` |
| 1.2% | 11.2ms | 0.0% | 0us | `value` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/link.ts:25` |
| 1.2% | 11.2ms | 1.2% | 11.2ms | `toString` | `[native code]` |
| 1.1% | 10.5ms | 0.0% | 0us | `value` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/link.ts:26` |
| 1.0% | 9.5ms | 1.0% | 9.5ms | `expand` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/registry.ts:234` |
| 1.0% | 9.4ms | 1.0% | 9.4ms | `expand` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/registry.ts:242` |
| 0.9% | 9.1ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:3626` |
| 0.9% | 9.0ms | 0.0% | 0us | `tsParseObjectTypeMembers` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:3386` |
| 0.9% | 9.0ms | 0.0% | 0us | `tsParseTypeLiteral` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2733` |
| 0.9% | 8.6ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:2302` |
| 0.8% | 7.8ms | 0.0% | 0us | `value` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/link.ts:27` |
| 0.7% | 7.2ms | 0.0% | 0us | `parseAssignableListItem` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:4678` |
| 0.7% | 7.2ms | 0.0% | 0us | `tsFillSignature` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2571` |
| 0.7% | 7.2ms | 0.0% | 0us | `parseBindingListItem` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:4716` |
| 0.7% | 7.2ms | 0.0% | 0us | `tsParseBindingListForSignature` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2443` |
| 0.6% | 5.8ms | 0.0% | 0us | `node:fs/promises` | `node:fs/promises:2` |
| 0.6% | 5.8ms | 0.0% | 0us | `node:fs` | `node:fs:2` |
| 0.6% | 5.8ms | 0.6% | 5.8ms | `[Symbol.iterator]` | `[native code]` |
| 0.6% | 5.6ms | 0.0% | 0us | `tsParsePropertyOrMethodSignature` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:3293` |
| 0.6% | 5.6ms | 0.0% | 0us | `parseExpressionStatement` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:4175` |
| 0.6% | 5.6ms | 0.0% | 0us | `tsParseExpressionStatement` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:3444` |
| 0.5% | 4.9ms | 0.0% | 0us | `checkSources` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/core.ts:71` |
| 0.5% | 4.9ms | 0.0% | 0us | `parseExport` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:3962` |
| 0.5% | 4.9ms | 0.0% | 0us | `distinctNames` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/core.ts:393` |
| 0.5% | 4.9ms | 0.0% | 0us | `parseExportDeclaration` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:4241` |
| 0.5% | 4.9ms | 0.0% | 0us | `tsParseTypeAliasDeclaration` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:3555` |
| 0.4% | 4.5ms | 0.0% | 0us | `tsParseInterfaceDeclaration` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:3408` |
| 0.4% | 4.5ms | 0.0% | 0us | `parseStatement` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:4151` |
| 0.4% | 4.5ms | 0.0% | 0us | `tsParseInterfaceBody` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:3420` |
| 0.4% | 4.5ms | 0.0% | 0us | `(module)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/types.ts:16` |
| 0.4% | 4.3ms | 0.0% | 0us | `tsParseFunctionOrConstructorType` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2599` |
| 0.4% | 4.3ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:5542` |
| 0.4% | 4.3ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:5503` |
| 0.4% | 4.1ms | 0.0% | 0us | `parseVarStatement` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:4121` |
| 0.4% | 4.1ms | 0.0% | 0us | `tsInAmbientContext` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:3509` |
| 0.4% | 4.1ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:1483` |
| 0.4% | 4.1ms | 0.0% | 0us | `parseVarId` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:4503` |
| 0.3% | 3.4ms | 0.0% | 0us | `tsParsePropertyOrMethodSignature` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:3332` |
| 0.3% | 3.4ms | 0.1% | 1.6ms | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:3957` |
| 0.3% | 3.3ms | 0.0% | 0us | `value` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/link.ts:31` |
| 0.3% | 3.1ms | 0.0% | 0us | `checkSources` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/core.ts:320` |
| 0.3% | 3.1ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:1290` |
| 0.3% | 3.1ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:1545` |
| 0.3% | 2.9ms | 0.0% | 0us | `infer` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts:578` |
| 0.3% | 2.9ms | 0.0% | 0us | `returned` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts:1111` |
| 0.3% | 2.9ms | 0.0% | 0us | `fnExpr` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts:1089` |
| 0.3% | 2.9ms | 0.0% | 0us | `check` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts:424` |
| 0.3% | 2.8ms | 0.3% | 2.8ms | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:5794` |
| 0.3% | 2.8ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:1256` |
| 0.3% | 2.8ms | 0.0% | 0us | `tsParseTypeOrTypePredicateAnnotation` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2506` |
| 0.3% | 2.8ms | 0.0% | 0us | `tsFillSignature` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2573` |
| 0.3% | 2.8ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:3703` |
| 0.2% | 2.7ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:3742` |
| 0.1% | 1.8ms | 0.0% | 0us | `parseIdentNode` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:4109` |
| 0.1% | 1.8ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:3740` |
| 0.1% | 1.8ms | 0.0% | 0us | `tsParseEntityName` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2171` |
| 0.1% | 1.8ms | 0.1% | 1.8ms | `SourceLocation` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:304` |
| 0.1% | 1.8ms | 0.0% | 0us | `Node` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:3945` |
| 0.1% | 1.8ms | 0.0% | 0us | `tsParseTypeReference` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2804` |
| 0.1% | 1.7ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:1470` |
| 0.1% | 1.7ms | 0.1% | 1.7ms | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:1414` |
| 0.1% | 1.7ms | 0.1% | 1.7ms | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs` |
| 0.1% | 1.7ms | 0.0% | 0us | `Registry` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/registry.ts:50` |
| 0.1% | 1.7ms | 0.1% | 1.7ms | `test` | `[native code]` |
| 0.1% | 1.7ms | 0.0% | 0us | `load` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/registry.ts:83` |
| 0.1% | 1.7ms | 0.0% | 0us | `sig` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/registry.ts:126` |
| 0.1% | 1.7ms | 0.0% | 0us | `convert` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/registry.ts:149` |
| 0.1% | 1.7ms | 0.0% | 0us | `convert` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/registry.ts:153` |
| 0.1% | 1.7ms | 0.0% | 0us | `literal` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/registry.ts:212` |
| 0.1% | 1.6ms | 0.1% | 1.6ms | `fnExpr` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts` |
| 0.1% | 1.6ms | 0.0% | 0us | `tsParseTypeAnnotation` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2472` |
| 0.1% | 1.5ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:2969` |
| 0.1% | 1.5ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:1304` |
| 0.1% | 1.5ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:2948` |
| 0.1% | 1.5ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:3418` |
| 0.1% | 1.5ms | 0.1% | 1.5ms | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:2824` |
| 0.1% | 1.5ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:1241` |
| 0.1% | 1.5ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:3021` |
| 0.1% | 1.5ms | 0.1% | 1.5ms | `tsIsAccessModifier` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js` |
| 0.1% | 1.5ms | 0.0% | 0us | `tsParseTypeMember` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:3353` |
| 0.1% | 1.5ms | 0.0% | 0us | `tsParseModifiers` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:3107` |
| 0.1% | 1.5ms | 0.1% | 1.5ms | `tsParseIntersectionTypeOrHigher` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2897` |
| 0.1% | 1.5ms | 0.0% | 0us | `checkSources` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/core.ts:350` |
| 0.1% | 1.5ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:3559` |
| 0.1% | 1.5ms | 0.0% | 0us | `tsParseNonArrayType` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2850` |
| 0.1% | 1.5ms | 0.0% | 0us | `tsParseTypeMember` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:3370` |
| 0.1% | 1.5ms | 0.1% | 1.5ms | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:3977` |
| 0.1% | 1.5ms | 0.1% | 1.5ms | `tsInAmbientContext` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:3511` |
| 0.1% | 1.4ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:6012` |
| 0.1% | 1.4ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:2881` |
| 0.1% | 1.4ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:2850` |
| 0.1% | 1.4ms | 0.1% | 1.4ms | `stringToNumber` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:5961` |
| 0.1% | 1.4ms | 0.0% | 0us | `um` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts:111` |
| 0.1% | 1.4ms | 0.0% | 0us | `flatIntoArrayWithCallback` | `[native code]` |
| 0.1% | 1.4ms | 0.0% | 0us | `member` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts:770` |
| 0.1% | 1.4ms | 0.0% | 0us | `check1` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts:444` |
| 0.1% | 1.4ms | 0.0% | 0us | `tsParseSignatureMember` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:3278` |
| 0.1% | 1.4ms | 0.0% | 0us | `tsFillSignature` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2569` |
| 0.1% | 1.4ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:827` |
| 0.1% | 1.4ms | 0.0% | 0us | `tsParseTypeParameters` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:3005` |
| 0.1% | 1.4ms | 0.0% | 0us | `tsParseBracketedList` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2362` |
| 0.1% | 1.4ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:752` |
| 0.1% | 1.4ms | 0.1% | 1.4ms | `deactivateCallbacks` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:1110` |
| 0.1% | 1.4ms | 0.0% | 0us | `tsTryParse` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:3040` |
| 0.1% | 1.4ms | 0.0% | 0us | `close` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:1170` |
| 0.1% | 1.4ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2510` |
| 0.1% | 1.4ms | 0.0% | 0us | `rollback` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:1003` |
| 0.1% | 1.4ms | 0.1% | 1.4ms | `checkSources` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/core.ts` |
| 0.1% | 1.3ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:1544` |
| 0.1% | 1.3ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:2309` |
| 0.1% | 1.3ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:1555` |
| 0.1% | 1.3ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:2321` |
| 0.1% | 1.3ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:3741` |
| 0.1% | 1.3ms | 0.1% | 1.3ms | `captureParserCheckpoint` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:1220` |
| 0.1% | 1.3ms | 0.0% | 0us | `begin` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:980` |
| 0.1% | 1.3ms | 0.0% | 0us | `tsTryParse` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:3028` |
| 0.1% | 1.3ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2522` |
| 0.1% | 1.3ms | 0.1% | 1.3ms | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:3435` |
| 0.1% | 1.2ms | 0.0% | 0us | `tsInNoContext` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:1805` |
| 0.1% | 1.2ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:3229` |
| 0.1% | 1.2ms | 0.0% | 0us | `tsParseTypeArguments` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:3222` |
| 0.1% | 1.2ms | 0.1% | 1.2ms | `bind` | `[native code]` |
| 0.1% | 1.2ms | 0.0% | 0us | `tsParseTypeReference` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2806` |
| 0.1% | 1.2ms | 0.1% | 1.2ms | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:891` |
| 0.1% | 1.2ms | 0.1% | 1.2ms | `finishNodeAt` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:3969` |
| 0.1% | 1.2ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:3516` |
| 0.1% | 1.2ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:3091` |
| 0.1% | 1.2ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:3489` |
| 0.1% | 1.2ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:3138` |
| 0.1% | 1.2ms | 0.0% | 0us | `(anonymous)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:3444` |
| 0.1% | 977us | 0.0% | 0us | `(module)` | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/profile-call.ts:17` |
| 0.1% | 977us | 0.1% | 977us | `log` | `[native code]` |

## Function Details

### `(anonymous)`
`[native code]` | Self: 22.8% (210.4ms) | Total: 75.1% (691.7ms) | Samples: 138

**Called by:**
- `holds` (326)
- `isAlias` (57)
- `expand` (34)
- `expand` (33)
- `value` (1)
- `map` (1)
- `checkSources` (1)

**Calls:**
- `performIteration` (104)
- `map` (80)
- `decl` (79)
- `flatMap` (35)
- `show` (17)

### `holds`
`[native code]` | Self: 17.2% (158.3ms) | Total: 100.0% (11.03s) | Samples: 106

**Called by:**
- `holds` (6703)
- `checkSources` (569)

**Calls:**
- `holds` (6703)
- `(anonymous)` (326)
- `isAlias` (57)
- `expand` (34)
- `expand` (33)
- `expand` (7)
- `expand` (6)

### `performIteration`
`[native code]` | Self: 16.3% (150.5ms) | Total: 16.9% (156.4ms) | Samples: 100

**Called by:**
- `(anonymous)` (104)

**Calls:**
- `[Symbol.iterator]` (4)

### `map`
`[native code]` | Self: 13.8% (127.4ms) | Total: 17.5% (161.9ms) | Samples: 80

**Called by:**
- `(anonymous)` (80)
- `link` (10)
- `value` (5)
- `show` (1)

**Calls:**
- `(anonymous)` (10)
- `value` (2)
- `value` (2)
- `(anonymous)` (1)
- `value` (1)

### `decl`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/registry.ts:105` | Self: 12.8% (118.5ms) | Total: 12.8% (118.5ms) | Samples: 79

**Called by:**
- `(anonymous)` (79)

### `flatMap`
`[native code]` | Self: 5.7% (53.2ms) | Total: 5.7% (53.2ms) | Samples: 35

**Called by:**
- `(anonymous)` (35)

### `show`
`[native code]` | Self: 2.6% (24.0ms) | Total: 2.7% (25.5ms) | Samples: 16

**Called by:**
- `(anonymous)` (17)

**Calls:**
- `map` (1)

### `toString`
`[native code]` | Self: 1.2% (11.2ms) | Total: 1.2% (11.2ms) | Samples: 1

**Called by:**
- `String` (1)

### `expand`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/registry.ts:234` | Self: 1.0% (9.5ms) | Total: 1.0% (9.5ms) | Samples: 7

**Called by:**
- `holds` (7)

### `expand`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/registry.ts:242` | Self: 1.0% (9.4ms) | Total: 1.0% (9.4ms) | Samples: 6

**Called by:**
- `holds` (6)

### `anonymous`
`[native code]` | Self: 0.8% (7.4ms) | Total: 1.4% (13.3ms) | Samples: 4

**Called by:**
- `node:fs/promises` (3)
- `node:fs` (3)
- `value` (1)

**Calls:**
- `node:fs/promises` (3)

### `[Symbol.iterator]`
`[native code]` | Self: 0.6% (5.8ms) | Total: 0.6% (5.8ms) | Samples: 4

**Called by:**
- `performIteration` (4)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:5794` | Self: 0.3% (2.8ms) | Total: 0.3% (2.8ms) | Samples: 2

**Called by:**
- `(anonymous)` (2)

### `SourceLocation`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:304` | Self: 0.1% (1.8ms) | Total: 0.1% (1.8ms) | Samples: 1

**Called by:**
- `Node` (1)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:1414` | Self: 0.1% (1.7ms) | Total: 0.1% (1.7ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs` | Self: 0.1% (1.7ms) | Total: 0.1% (1.7ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `test`
`[native code]` | Self: 0.1% (1.7ms) | Total: 0.1% (1.7ms) | Samples: 1

**Called by:**
- `convert` (1)

### `fnExpr`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts` | Self: 0.1% (1.6ms) | Total: 0.1% (1.6ms) | Samples: 1

**Called by:**
- `checkSources` (1)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:3957` | Self: 0.1% (1.6ms) | Total: 0.3% (3.4ms) | Samples: 1

**Called by:**
- `parseIdentNode` (1)
- `tsParseTypeAnnotation` (1)

**Calls:**
- `Node` (1)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:2824` | Self: 0.1% (1.5ms) | Total: 0.1% (1.5ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `tsIsAccessModifier`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js` | Self: 0.1% (1.5ms) | Total: 0.1% (1.5ms) | Samples: 1

**Called by:**
- `tsParseModifiers` (1)

### `tsParseIntersectionTypeOrHigher`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2897` | Self: 0.1% (1.5ms) | Total: 0.1% (1.5ms) | Samples: 1

**Called by:**
- `bound tsParseIntersectionTypeOrHigher` (1)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:3977` | Self: 0.1% (1.5ms) | Total: 0.1% (1.5ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `tsInAmbientContext`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:3511` | Self: 0.1% (1.5ms) | Total: 0.1% (1.5ms) | Samples: 1

**Called by:**
- `tsParseExpressionStatement` (1)

### `stringToNumber`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:5961` | Self: 0.1% (1.4ms) | Total: 0.1% (1.4ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `expand`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/registry.ts:232` | Self: 0.1% (1.4ms) | Total: 6.1% (56.2ms) | Samples: 1

**Called by:**
- `holds` (34)
- `um` (1)

**Calls:**
- `(anonymous)` (34)

### `deactivateCallbacks`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:1110` | Self: 0.1% (1.4ms) | Total: 0.1% (1.4ms) | Samples: 1

**Called by:**
- `close` (1)

### `checkSources`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/core.ts` | Self: 0.1% (1.4ms) | Total: 0.1% (1.4ms) | Samples: 1

**Called by:**
- `(module)` (1)

### `captureParserCheckpoint`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:1220` | Self: 0.1% (1.3ms) | Total: 0.1% (1.3ms) | Samples: 1

**Called by:**
- `begin` (1)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:3435` | Self: 0.1% (1.3ms) | Total: 0.1% (1.3ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `bind`
`[native code]` | Self: 0.1% (1.2ms) | Total: 0.1% (1.2ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:891` | Self: 0.1% (1.2ms) | Total: 0.1% (1.2ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `finishNodeAt`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:3969` | Self: 0.1% (1.2ms) | Total: 0.1% (1.2ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `log`
`[native code]` | Self: 0.1% (977us) | Total: 0.1% (977us) | Samples: 1

**Called by:**
- `(module)` (1)

### `checkSources`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/core.ts:350` | Self: 0.0% (0us) | Total: 0.1% (1.5ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `(anonymous)` (1)

### `tsTryParse`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:3040` | Self: 0.0% (0us) | Total: 0.1% (1.4ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `rollback` (1)

### `tsParseInterfaceDeclaration`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:3408` | Self: 0.0% (0us) | Total: 0.4% (4.5ms) | Samples: 0

**Called by:**
- `parseStatement` (3)

**Calls:**
- `tsParseInterfaceBody` (3)

### `parse`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/parse.ts:30` | Self: 0.0% (0us) | Total: 1.7% (16.4ms) | Samples: 0

**Called by:**
- `Registry` (8)
- `distinctNames` (3)

**Calls:**
- `(anonymous)` (11)

### `tsParseBindingListForSignature`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2443` | Self: 0.0% (0us) | Total: 0.7% (7.2ms) | Samples: 0

**Called by:**
- `tsFillSignature` (5)

**Calls:**
- `(anonymous)` (5)

### `tsInAllowConditionalTypesContext`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2437` | Self: 0.0% (0us) | Total: 1.7% (16.5ms) | Samples: 0

**Called by:**
- `tsParseTypeOperatorOrHigher` (8)
- `tsParseFunctionOrConstructorType` (3)

**Calls:**
- `tsParseArrayTypeOrHigher` (8)
- `tsFillSignature` (2)
- `tsFillSignature` (1)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:3650` | Self: 0.0% (0us) | Total: 1.3% (12.4ms) | Samples: 0

**Called by:**
- `(anonymous)` (6)
- `(anonymous)` (2)

**Calls:**
- `(anonymous)` (8)

### `literal`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/registry.ts:212` | Self: 0.0% (0us) | Total: 0.1% (1.7ms) | Samples: 0

**Called by:**
- `load` (1)

**Calls:**
- `sig` (1)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2510` | Self: 0.0% (0us) | Total: 0.1% (1.4ms) | Samples: 0

**Called by:**
- `tsInType` (1)

**Calls:**
- `tsTryParse` (1)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:2774` | Self: 0.0% (0us) | Total: 4.6% (42.7ms) | Samples: 0

**Called by:**
- `(anonymous)` (11)
- `(anonymous)` (9)
- `(anonymous)` (6)
- `(anonymous)` (2)
- `(anonymous)` (1)

**Calls:**
- `(anonymous)` (29)

### `tsParseEntityName`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2171` | Self: 0.0% (0us) | Total: 0.1% (1.8ms) | Samples: 0

**Called by:**
- `tsParseTypeReference` (1)

**Calls:**
- `(anonymous)` (1)

### `tsParseTypeAliasDeclaration`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:3555` | Self: 0.0% (0us) | Total: 0.5% (4.9ms) | Samples: 0

**Called by:**
- `parseExportDeclaration` (3)

**Calls:**
- `tsInType` (3)

### `tsInType`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2960` | Self: 0.0% (0us) | Total: 2.4% (22.2ms) | Samples: 0

**Called by:**
- `tsParseTypeAnnotation` (9)
- `tsParseTypeAliasDeclaration` (3)
- `tsParseTypeOrTypePredicateAnnotation` (2)
- `tsParseTypeArguments` (1)

**Calls:**
- `(anonymous)` (9)
- `tsParseType` (3)
- `(anonymous)` (1)
- `tsInNoContext` (1)
- `(anonymous)` (1)

### `link`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/link.ts:37` | Self: 0.0% (0us) | Total: 2.7% (25.0ms) | Samples: 0

**Called by:**
- `(module)` (7)
- `(module)` (3)

**Calls:**
- `map` (10)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:5503` | Self: 0.0% (0us) | Total: 0.4% (4.3ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)

**Calls:**
- `(anonymous)` (3)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:752` | Self: 0.0% (0us) | Total: 0.1% (1.4ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `(anonymous)` (1)

### `tsParsePropertyOrMethodSignature`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:3293` | Self: 0.0% (0us) | Total: 0.6% (5.6ms) | Samples: 0

**Called by:**
- `bound tsParseTypeMember` (4)

**Calls:**
- `tsFillSignature` (4)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:3229` | Self: 0.0% (0us) | Total: 0.1% (1.2ms) | Samples: 0

**Called by:**
- `tsInNoContext` (1)

**Calls:**
- `bind` (1)

### `expand`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/registry.ts:233` | Self: 0.0% (0us) | Total: 5.3% (49.6ms) | Samples: 0

**Called by:**
- `holds` (33)

**Calls:**
- `(anonymous)` (33)

### `(module)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/profile-call.ts:17` | Self: 0.0% (0us) | Total: 0.1% (977us) | Samples: 0

**Calls:**
- `log` (1)

### `String`
`[native code]` | Self: 0.0% (0us) | Total: 1.2% (11.2ms) | Samples: 0

**Called by:**
- `value` (1)

**Calls:**
- `toString` (1)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:6012` | Self: 0.0% (0us) | Total: 0.1% (1.4ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `stringToNumber` (1)

### `close`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:1170` | Self: 0.0% (0us) | Total: 0.1% (1.4ms) | Samples: 0

**Called by:**
- `rollback` (1)

**Calls:**
- `deactivateCallbacks` (1)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/link.ts:37` | Self: 0.0% (0us) | Total: 2.7% (25.0ms) | Samples: 0

**Called by:**
- `map` (10)

**Calls:**
- `value` (5)
- `value` (4)
- `value` (1)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:2736` | Self: 0.0% (0us) | Total: 1.7% (16.5ms) | Samples: 0

**Called by:**
- `(anonymous)` (11)

**Calls:**
- `(anonymous)` (11)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:1545` | Self: 0.0% (0us) | Total: 0.3% (3.1ms) | Samples: 0

**Called by:**
- `(anonymous)` (2)

**Calls:**
- `(anonymous)` (2)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:3021` | Self: 0.0% (0us) | Total: 0.1% (1.5ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `(anonymous)` (1)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:1256` | Self: 0.0% (0us) | Total: 0.3% (2.8ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)
- `(anonymous)` (1)

**Calls:**
- `(anonymous)` (2)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:1241` | Self: 0.0% (0us) | Total: 0.1% (1.5ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `(anonymous)` (1)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:3626` | Self: 0.0% (0us) | Total: 0.9% (9.1ms) | Samples: 0

**Called by:**
- `(anonymous)` (6)

**Calls:**
- `(anonymous)` (6)

### `parseExpressionStatement`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:4175` | Self: 0.0% (0us) | Total: 0.6% (5.6ms) | Samples: 0

**Called by:**
- `(anonymous)` (4)

**Calls:**
- `tsParseExpressionStatement` (4)

### `tsInNoContext`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:1805` | Self: 0.0% (0us) | Total: 0.1% (1.2ms) | Samples: 0

**Called by:**
- `tsInType` (1)

**Calls:**
- `(anonymous)` (1)

### `tsParseArrayTypeOrHigher`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2875` | Self: 0.0% (0us) | Total: 1.3% (12.1ms) | Samples: 0

**Called by:**
- `tsInAllowConditionalTypesContext` (8)

**Calls:**
- `tsParseTypeLiteral` (5)
- `tsParseTypeReference` (1)
- `tsParseTypeReference` (1)
- `tsParseNonArrayType` (1)

### `value`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/link.ts:31` | Self: 0.0% (0us) | Total: 0.3% (3.3ms) | Samples: 0

**Called by:**
- `map` (2)

**Calls:**
- `anonymous` (1)
- `(anonymous)` (1)

### `parseExportDeclaration`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:4241` | Self: 0.0% (0us) | Total: 0.5% (4.9ms) | Samples: 0

**Called by:**
- `parseExport` (3)

**Calls:**
- `tsParseTypeAliasDeclaration` (3)

### `tsFillSignature`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2573` | Self: 0.0% (0us) | Total: 0.3% (2.8ms) | Samples: 0

**Called by:**
- `tsInAllowConditionalTypesContext` (2)

**Calls:**
- `tsParseTypeOrTypePredicateAnnotation` (2)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:3740` | Self: 0.0% (0us) | Total: 0.1% (1.8ms) | Samples: 0

**Called by:**
- `tsParseEntityName` (1)

**Calls:**
- `parseIdentNode` (1)

### `tsParsePropertyOrMethodSignature`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:3332` | Self: 0.0% (0us) | Total: 0.3% (3.4ms) | Samples: 0

**Called by:**
- `bound tsParseTypeMember` (2)

**Calls:**
- `tsParseTypeAnnotation` (1)
- `tsParseTypeAnnotation` (1)

### `tsParseModifiers`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:3107` | Self: 0.0% (0us) | Total: 0.1% (1.5ms) | Samples: 0

**Called by:**
- `tsParseTypeMember` (1)

**Calls:**
- `tsIsAccessModifier` (1)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:3418` | Self: 0.0% (0us) | Total: 0.1% (1.5ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `(anonymous)` (1)

### `parseBindingListItem`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:4716` | Self: 0.0% (0us) | Total: 0.7% (7.2ms) | Samples: 0

**Called by:**
- `parseAssignableListItem` (5)

**Calls:**
- `tsParseTypeAnnotation` (5)

### `tsParseTypeLiteral`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2733` | Self: 0.0% (0us) | Total: 0.9% (9.0ms) | Samples: 0

**Called by:**
- `tsParseArrayTypeOrHigher` (5)
- `tsParseNonArrayType` (1)

**Calls:**
- `tsParseObjectTypeMembers` (6)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:3703` | Self: 0.0% (0us) | Total: 0.3% (2.8ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)
- `(anonymous)` (1)

**Calls:**
- `(anonymous)` (2)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:2881` | Self: 0.0% (0us) | Total: 0.1% (1.4ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `(anonymous)` (1)

### `tsInAmbientContext`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:3509` | Self: 0.0% (0us) | Total: 0.4% (4.1ms) | Samples: 0

**Called by:**
- `tsParseExpressionStatement` (3)

**Calls:**
- `parseVarStatement` (3)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:2825` | Self: 0.0% (0us) | Total: 4.3% (39.7ms) | Samples: 0

**Called by:**
- `(anonymous)` (27)

**Calls:**
- `(anonymous)` (27)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:2850` | Self: 0.0% (0us) | Total: 0.1% (1.4ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `(anonymous)` (1)

### `checkSources`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/core.ts:71` | Self: 0.0% (0us) | Total: 0.5% (4.9ms) | Samples: 0

**Called by:**
- `(module)` (3)

**Calls:**
- `distinctNames` (3)

### `tsParseTypeOrTypePredicateAnnotation`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2506` | Self: 0.0% (0us) | Total: 0.3% (2.8ms) | Samples: 0

**Called by:**
- `tsFillSignature` (2)

**Calls:**
- `tsInType` (2)

### `Registry`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/registry.ts:50` | Self: 0.0% (0us) | Total: 0.1% (1.7ms) | Samples: 0

**Called by:**
- `checkSources` (1)

**Calls:**
- `load` (1)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:1483` | Self: 0.0% (0us) | Total: 0.4% (4.1ms) | Samples: 0

**Called by:**
- `parseVarStatement` (3)

**Calls:**
- `parseVarId` (3)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:2302` | Self: 0.0% (0us) | Total: 0.9% (8.6ms) | Samples: 0

**Called by:**
- `tsParseBindingListForSignature` (5)
- `(anonymous)` (1)

**Calls:**
- `parseAssignableListItem` (5)
- `(anonymous)` (1)

### `parseVarId`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:4503` | Self: 0.0% (0us) | Total: 0.4% (4.1ms) | Samples: 0

**Called by:**
- `(anonymous)` (3)

**Calls:**
- `tsParseTypeAnnotation` (3)

### `convert`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/registry.ts:149` | Self: 0.0% (0us) | Total: 0.1% (1.7ms) | Samples: 0

**Called by:**
- `sig` (1)

**Calls:**
- `convert` (1)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:2969` | Self: 0.0% (0us) | Total: 0.1% (1.5ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `(anonymous)` (1)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:2309` | Self: 0.0% (0us) | Total: 0.1% (1.3ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `(anonymous)` (1)

### `returned`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts:1111` | Self: 0.0% (0us) | Total: 0.3% (2.9ms) | Samples: 0

**Called by:**
- `fnExpr` (2)

**Calls:**
- `check` (2)

### `parseStatement`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:4151` | Self: 0.0% (0us) | Total: 0.4% (4.5ms) | Samples: 0

**Called by:**
- `(anonymous)` (3)

**Calls:**
- `tsParseInterfaceDeclaration` (3)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2475` | Self: 0.0% (0us) | Total: 1.4% (13.1ms) | Samples: 0

**Called by:**
- `tsInType` (9)

**Calls:**
- `tsParseType` (9)

### `parseAssignableListItem`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:4678` | Self: 0.0% (0us) | Total: 0.7% (7.2ms) | Samples: 0

**Called by:**
- `(anonymous)` (5)

**Calls:**
- `parseBindingListItem` (5)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:775` | Self: 0.0% (0us) | Total: 3.5% (32.9ms) | Samples: 0

**Called by:**
- `parse` (11)
- `value` (7)
- `(anonymous)` (2)
- `(anonymous)` (1)
- `(anonymous)` (1)

**Calls:**
- `(anonymous)` (11)
- `(anonymous)` (10)
- `(anonymous)` (1)

### `um`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts:111` | Self: 0.0% (0us) | Total: 0.1% (1.4ms) | Samples: 0

**Called by:**
- `flatIntoArrayWithCallback` (1)

**Calls:**
- `expand` (1)

### `tsFillSignature`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2569` | Self: 0.0% (0us) | Total: 0.1% (1.4ms) | Samples: 0

**Called by:**
- `tsParseSignatureMember` (1)

**Calls:**
- `tsParseTypeParameters` (1)

### `checkSources`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/core.ts:347` | Self: 0.0% (0us) | Total: 93.9% (864.2ms) | Samples: 0

**Called by:**
- `(module)` (569)

**Calls:**
- `holds` (569)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:3138` | Self: 0.0% (0us) | Total: 0.1% (1.2ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `(anonymous)` (1)

### `parseVarStatement`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:4121` | Self: 0.0% (0us) | Total: 0.4% (4.1ms) | Samples: 0

**Called by:**
- `tsInAmbientContext` (3)

**Calls:**
- `(anonymous)` (3)

### `tsParseList`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:3380` | Self: 0.0% (0us) | Total: 1.4% (13.6ms) | Samples: 0

**Called by:**
- `tsParseObjectTypeMembers` (6)
- `tsParseInterfaceBody` (3)

**Calls:**
- `bound tsParseTypeMember` (9)

### `tsParseTypeMember`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:3370` | Self: 0.0% (0us) | Total: 0.1% (1.5ms) | Samples: 0

**Called by:**
- `bound tsParseTypeMember` (1)

**Calls:**
- `(anonymous)` (1)

### `parseExport`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:3962` | Self: 0.0% (0us) | Total: 0.5% (4.9ms) | Samples: 0

**Called by:**
- `(anonymous)` (3)

**Calls:**
- `parseExportDeclaration` (3)

### `tsFillSignature`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2571` | Self: 0.0% (0us) | Total: 0.7% (7.2ms) | Samples: 0

**Called by:**
- `tsParsePropertyOrMethodSignature` (4)
- `tsInAllowConditionalTypesContext` (1)

**Calls:**
- `tsParseBindingListForSignature` (5)

### `rollback`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:1003` | Self: 0.0% (0us) | Total: 0.1% (1.4ms) | Samples: 0

**Called by:**
- `tsTryParse` (1)

**Calls:**
- `close` (1)

### `value`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/link.ts:26` | Self: 0.0% (0us) | Total: 1.1% (10.5ms) | Samples: 0

**Called by:**
- `(anonymous)` (5)
- `map` (2)

**Calls:**
- `(anonymous)` (7)

### `value`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/link.ts:27` | Self: 0.0% (0us) | Total: 0.8% (7.8ms) | Samples: 0

**Called by:**
- `(anonymous)` (4)
- `map` (1)

**Calls:**
- `map` (5)

### `checkSources`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/core.ts:64` | Self: 0.0% (0us) | Total: 1.4% (13.1ms) | Samples: 0

**Called by:**
- `(module)` (9)

**Calls:**
- `Registry` (8)
- `Registry` (1)

### `member`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts:770` | Self: 0.0% (0us) | Total: 0.1% (1.4ms) | Samples: 0

**Called by:**
- `infer` (1)

**Calls:**
- `flatIntoArrayWithCallback` (1)

### `fnExpr`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts:1089` | Self: 0.0% (0us) | Total: 0.3% (2.9ms) | Samples: 0

**Called by:**
- `checkSources` (1)
- `infer` (1)

**Calls:**
- `returned` (2)

### `load`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/registry.ts:83` | Self: 0.0% (0us) | Total: 0.1% (1.7ms) | Samples: 0

**Called by:**
- `Registry` (1)

**Calls:**
- `literal` (1)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:2948` | Self: 0.0% (0us) | Total: 0.1% (1.5ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `(anonymous)` (1)

### `infer`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts:578` | Self: 0.0% (0us) | Total: 0.3% (2.9ms) | Samples: 0

**Called by:**
- `check` (1)
- `check1` (1)

**Calls:**
- `fnExpr` (1)
- `member` (1)

### `tsParseNonArrayType`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2850` | Self: 0.0% (0us) | Total: 0.1% (1.5ms) | Samples: 0

**Called by:**
- `tsParseArrayTypeOrHigher` (1)

**Calls:**
- `tsParseTypeLiteral` (1)

### `tsParseObjectTypeMembers`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:3386` | Self: 0.0% (0us) | Total: 0.9% (9.0ms) | Samples: 0

**Called by:**
- `tsParseTypeLiteral` (6)

**Calls:**
- `tsParseList` (6)

### `node:fs`
`node:fs:2` | Self: 0.0% (0us) | Total: 0.6% (5.8ms) | Samples: 0

**Calls:**
- `anonymous` (3)

### `tsParseSignatureMember`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:3278` | Self: 0.0% (0us) | Total: 0.1% (1.4ms) | Samples: 0

**Called by:**
- `bound tsParseTypeMember` (1)

**Calls:**
- `tsFillSignature` (1)

### `parseIdentNode`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:4109` | Self: 0.0% (0us) | Total: 0.1% (1.8ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `(anonymous)` (1)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:3741` | Self: 0.0% (0us) | Total: 0.1% (1.3ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `(anonymous)` (1)

### `bound tsParseIntersectionTypeOrHigher`
`[native code]` | Self: 0.0% (0us) | Total: 1.4% (13.7ms) | Samples: 0

**Called by:**
- `tsParseUnionOrIntersectionType` (9)

**Calls:**
- `tsParseUnionOrIntersectionType` (8)
- `tsParseIntersectionTypeOrHigher` (1)

### `(module)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/types.ts:16` | Self: 0.0% (0us) | Total: 0.4% (4.5ms) | Samples: 0

**Calls:**
- `link` (3)

### `flatIntoArrayWithCallback`
`[native code]` | Self: 0.0% (0us) | Total: 0.1% (1.4ms) | Samples: 0

**Called by:**
- `member` (1)

**Calls:**
- `um` (1)

### `tsParseTypeAnnotation`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2472` | Self: 0.0% (0us) | Total: 0.1% (1.6ms) | Samples: 0

**Called by:**
- `tsParsePropertyOrMethodSignature` (1)

**Calls:**
- `(anonymous)` (1)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:3444` | Self: 0.0% (0us) | Total: 0.1% (1.2ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `(anonymous)` (1)

### `Node`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:3945` | Self: 0.0% (0us) | Total: 0.1% (1.8ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `SourceLocation` (1)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:2897` | Self: 0.0% (0us) | Total: 4.3% (39.7ms) | Samples: 0

**Called by:**
- `(anonymous)` (27)

**Calls:**
- `(anonymous)` (26)
- `(anonymous)` (1)

### `tsParseTypeOperatorOrHigher`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2894` | Self: 0.0% (0us) | Total: 1.3% (12.1ms) | Samples: 0

**Called by:**
- `bound tsParseTypeOperatorOrHigher` (8)

**Calls:**
- `tsInAllowConditionalTypesContext` (8)

### `bound tsParseTypeMember`
`[native code]` | Self: 0.0% (0us) | Total: 1.4% (13.6ms) | Samples: 0

**Called by:**
- `tsParseList` (9)

**Calls:**
- `tsParsePropertyOrMethodSignature` (4)
- `tsParsePropertyOrMethodSignature` (2)
- `tsParseTypeMember` (1)
- `tsParseSignatureMember` (1)
- `tsParseTypeMember` (1)

### `tsParseInterfaceBody`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:3420` | Self: 0.0% (0us) | Total: 0.4% (4.5ms) | Samples: 0

**Called by:**
- `tsParseInterfaceDeclaration` (3)

**Calls:**
- `tsParseList` (3)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2522` | Self: 0.0% (0us) | Total: 0.1% (1.3ms) | Samples: 0

**Called by:**
- `tsInType` (1)

**Calls:**
- `tsTryParse` (1)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:890` | Self: 0.0% (0us) | Total: 1.6% (15.1ms) | Samples: 0

**Called by:**
- `(anonymous)` (10)

**Calls:**
- `parseExpressionStatement` (4)
- `parseExport` (3)
- `parseStatement` (3)

### `tsParseTypeMember`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:3353` | Self: 0.0% (0us) | Total: 0.1% (1.5ms) | Samples: 0

**Called by:**
- `bound tsParseTypeMember` (1)

**Calls:**
- `tsParseModifiers` (1)

### `begin`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:980` | Self: 0.0% (0us) | Total: 0.1% (1.3ms) | Samples: 0

**Called by:**
- `tsTryParse` (1)

**Calls:**
- `captureParserCheckpoint` (1)

### `tsParseTypeReference`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2806` | Self: 0.0% (0us) | Total: 0.1% (1.2ms) | Samples: 0

**Called by:**
- `tsParseArrayTypeOrHigher` (1)

**Calls:**
- `tsParseTypeArguments` (1)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:2808` | Self: 0.0% (0us) | Total: 4.6% (42.7ms) | Samples: 0

**Called by:**
- `(anonymous)` (29)

**Calls:**
- `(anonymous)` (27)
- `(anonymous)` (1)
- `(anonymous)` (1)

### `distinctNames`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/core.ts:393` | Self: 0.0% (0us) | Total: 0.5% (4.9ms) | Samples: 0

**Called by:**
- `checkSources` (3)

**Calls:**
- `parse` (3)

### `tsParseUnionOrIntersectionType`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2607` | Self: 0.0% (0us) | Total: 2.8% (25.8ms) | Samples: 0

**Called by:**
- `tsParseType` (9)
- `bound tsParseIntersectionTypeOrHigher` (8)

**Calls:**
- `bound tsParseIntersectionTypeOrHigher` (9)
- `bound tsParseTypeOperatorOrHigher` (8)

### `value`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/link.ts:25` | Self: 0.0% (0us) | Total: 1.2% (11.2ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `String` (1)

### `check`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts:424` | Self: 0.0% (0us) | Total: 0.3% (2.9ms) | Samples: 0

**Called by:**
- `returned` (2)

**Calls:**
- `check1` (1)
- `infer` (1)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:3297` | Self: 0.0% (0us) | Total: 1.4% (13.0ms) | Samples: 0

**Called by:**
- `(anonymous)` (9)

**Calls:**
- `(anonymous)` (9)

### `tsParseBracketedList`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2362` | Self: 0.0% (0us) | Total: 0.1% (1.4ms) | Samples: 0

**Called by:**
- `tsParseTypeParameters` (1)

**Calls:**
- `(anonymous)` (1)

### `bound tsParseTypeOperatorOrHigher`
`[native code]` | Self: 0.0% (0us) | Total: 1.3% (12.1ms) | Samples: 0

**Called by:**
- `tsParseUnionOrIntersectionType` (8)

**Calls:**
- `tsParseTypeOperatorOrHigher` (8)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:1544` | Self: 0.0% (0us) | Total: 0.1% (1.3ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `(anonymous)` (1)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:1418` | Self: 0.0% (0us) | Total: 1.5% (14.1ms) | Samples: 0

**Called by:**
- `(anonymous)` (8)
- `(anonymous)` (1)

**Calls:**
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)

### `check1`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts:444` | Self: 0.0% (0us) | Total: 0.1% (1.4ms) | Samples: 0

**Called by:**
- `check` (1)

**Calls:**
- `infer` (1)

### `isAlias`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/registry.ts:282` | Self: 0.0% (0us) | Total: 8.8% (81.7ms) | Samples: 0

**Called by:**
- `holds` (57)

**Calls:**
- `(anonymous)` (57)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:1304` | Self: 0.0% (0us) | Total: 0.1% (1.5ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `(anonymous)` (1)

### `tsParseFunctionOrConstructorType`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2599` | Self: 0.0% (0us) | Total: 0.4% (4.3ms) | Samples: 0

**Called by:**
- `tsParseType` (3)

**Calls:**
- `tsInAllowConditionalTypesContext` (3)

### `tsParseTypeReference`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2804` | Self: 0.0% (0us) | Total: 0.1% (1.8ms) | Samples: 0

**Called by:**
- `tsParseArrayTypeOrHigher` (1)

**Calls:**
- `tsParseEntityName` (1)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:3489` | Self: 0.0% (0us) | Total: 0.1% (1.2ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `(anonymous)` (1)

### `tsParseTypeArguments`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:3222` | Self: 0.0% (0us) | Total: 0.1% (1.2ms) | Samples: 0

**Called by:**
- `tsParseTypeReference` (1)

**Calls:**
- `tsInType` (1)

### `tsParseType`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2928` | Self: 0.0% (0us) | Total: 1.9% (18.1ms) | Samples: 0

**Called by:**
- `(anonymous)` (9)
- `tsInType` (3)

**Calls:**
- `tsParseUnionOrIntersectionType` (9)
- `tsParseFunctionOrConstructorType` (3)

### `node:fs/promises`
`node:fs/promises:2` | Self: 0.0% (0us) | Total: 0.6% (5.8ms) | Samples: 0

**Called by:**
- `anonymous` (3)

**Calls:**
- `anonymous` (3)

### `Registry`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/registry.ts:49` | Self: 0.0% (0us) | Total: 1.2% (11.4ms) | Samples: 0

**Called by:**
- `checkSources` (8)

**Calls:**
- `parse` (8)

### `tsParseTypeAnnotation`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:2473` | Self: 0.0% (0us) | Total: 1.4% (13.1ms) | Samples: 0

**Called by:**
- `parseBindingListItem` (5)
- `parseVarId` (3)
- `tsParsePropertyOrMethodSignature` (1)

**Calls:**
- `tsInType` (9)

### `(module)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/runtime-ss.ts:15` | Self: 0.0% (0us) | Total: 2.2% (20.5ms) | Samples: 0

**Calls:**
- `link` (7)

### `convert`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/registry.ts:153` | Self: 0.0% (0us) | Total: 0.1% (1.7ms) | Samples: 0

**Called by:**
- `convert` (1)

**Calls:**
- `test` (1)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:1290` | Self: 0.0% (0us) | Total: 0.3% (3.1ms) | Samples: 0

**Called by:**
- `(anonymous)` (2)

**Calls:**
- `(anonymous)` (1)
- `(anonymous)` (1)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:3742` | Self: 0.0% (0us) | Total: 0.2% (2.7ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)
- `(anonymous)` (1)

**Calls:**
- `finishNodeAt` (1)
- `(anonymous)` (1)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:3559` | Self: 0.0% (0us) | Total: 0.1% (1.5ms) | Samples: 0

**Called by:**
- `tsParseTypeMember` (1)

**Calls:**
- `(anonymous)` (1)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:3611` | Self: 0.0% (0us) | Total: 2.0% (18.4ms) | Samples: 0

**Called by:**
- `(anonymous)` (12)

**Calls:**
- `(anonymous)` (6)
- `(anonymous)` (6)

### `tsParseTypeParameters`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:3005` | Self: 0.0% (0us) | Total: 0.1% (1.4ms) | Samples: 0

**Called by:**
- `tsFillSignature` (1)

**Calls:**
- `tsParseBracketedList` (1)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:5542` | Self: 0.0% (0us) | Total: 0.4% (4.3ms) | Samples: 0

**Called by:**
- `(anonymous)` (3)

**Calls:**
- `(anonymous)` (2)
- `(anonymous)` (1)

### `tsParseExpressionStatement`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:3444` | Self: 0.0% (0us) | Total: 0.6% (5.6ms) | Samples: 0

**Called by:**
- `parseExpressionStatement` (4)

**Calls:**
- `tsInAmbientContext` (3)
- `tsInAmbientContext` (1)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:2945` | Self: 0.0% (0us) | Total: 4.1% (38.1ms) | Samples: 0

**Called by:**
- `(anonymous)` (26)

**Calls:**
- `(anonymous)` (21)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:3516` | Self: 0.0% (0us) | Total: 0.1% (1.2ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `(anonymous)` (1)

### `tsTryParse`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js:3028` | Self: 0.0% (0us) | Total: 0.1% (1.3ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `begin` (1)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:3091` | Self: 0.0% (0us) | Total: 0.1% (1.2ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `(anonymous)` (1)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:2321` | Self: 0.0% (0us) | Total: 0.1% (1.3ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `(anonymous)` (1)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:3126` | Self: 0.0% (0us) | Total: 3.4% (31.5ms) | Samples: 0

**Called by:**
- `(anonymous)` (21)

**Calls:**
- `(anonymous)` (12)
- `(anonymous)` (9)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:827` | Self: 0.0% (0us) | Total: 0.1% (1.4ms) | Samples: 0

**Called by:**
- `tsParseBracketedList` (1)

**Calls:**
- `(anonymous)` (1)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:1470` | Self: 0.0% (0us) | Total: 0.1% (1.7ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `(anonymous)` (1)

### `(module)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/profile-call.ts:16` | Self: 0.0% (0us) | Total: 96.5% (888.3ms) | Samples: 0

**Calls:**
- `checkSources` (569)
- `checkSources` (9)
- `checkSources` (3)
- `checkSources` (2)
- `checkSources` (1)
- `checkSources` (1)

### `(anonymous)`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs:1555` | Self: 0.0% (0us) | Total: 0.1% (1.3ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `(anonymous)` (1)

### `sig`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/registry.ts:126` | Self: 0.0% (0us) | Total: 0.1% (1.7ms) | Samples: 0

**Called by:**
- `literal` (1)

**Calls:**
- `convert` (1)

### `checkSources`
`/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/core.ts:320` | Self: 0.0% (0us) | Total: 0.3% (3.1ms) | Samples: 0

**Called by:**
- `(module)` (2)

**Calls:**
- `fnExpr` (1)
- `fnExpr` (1)

## Files

| Self% | Self | File |
|------:|-----:|------|
| 81.7% | 752.6ms | `[native code]` |
| 15.0% | 138.9ms | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/registry.ts` |
| 1.9% | 18.2ms | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/acorn/dist/acorn.mjs` |
| 0.8% | 7.4ms | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite/node_modules/@sveltejs/acorn-typescript/index.js` |
| 0.1% | 1.6ms | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/infer.ts` |
| 0.1% | 1.4ms | `/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/orig/lite/core.ts` |
