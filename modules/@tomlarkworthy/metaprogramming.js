const _r9fkse = function _1(md){return(
md`# Metaprogramming with _Peek_ [Not recommended for production user]

<center style="height:320px"><span style="font-size:800px; line-height: 730px">*</span></center>

_Peek_ will dynamically evaluate another notebook cell as a [generator](https://observablehq.com/@observablehq/introduction-to-generators?collection=@observablehq/generators). _PeekFirst_ will read a cell as a promise.

This will help build notebooks (metabooks?) that apply a common functions to other notebooks, e.g. [SVG to GIF converter](https://observablehq.com/@tomlarkworthy/svg-to-gif).

`
)};
const _vclzhh = function _2(signature,peek){return(
signature(peek, {
  description: "Reads 'cell' in another notebook and returns the stream of values as a [generator](https://observablehq.com/@observablehq/introduction-to-generators?collection=@observablehq/generators)"
})
)};
const _wuh02b = function _peek(Generators, Library, require, Runtime) {
    return function peek({notebook = '@tomlarkworthy/metaprogramming', cell = undefined, filter = value => true} = {}) {
        notebook = notebook.replace('https://observablehq.com/', '');
        const safeFilter = value => {
            try {
                return filter(value);
            } catch (err) {
                console.error(err);
                return false;
            }
        };
        return Generators.observe(next => {
            const library = Object.assign(new Library(), { require: () => require });
            const runtime = new Runtime(library);
            import(`https://api.observablehq.com/${ notebook }.js?v=3`).then(({default: define} = {}) => {
                const imported = runtime.module(define, name => {
                    if (cell && name !== cell)
                        return null;
                    console.log('name', name);
                    return {
                        fulfilled(value) {
                            if (safeFilter(value))
                                next(value);
                        },
                        rejected(err) {
                            if (safeFilter(err))
                                next(Promise.reject(err));
                        }
                    };
                });
            }).catch(err => next(Promise.reject(err)));
            return () => runtime.dispose();
        });
    };
};
const _gx43jw = function _4(signature,peekFirst){return(
signature(peekFirst, {
  description: "Same as peek but returns a promise, useful for reading static values"
})
)};
const _1v70dpu = function _peekFirst(peek){return(
function peekFirst(args) {
  const generator = peek(args)
  const value = generator.next().value;
  value.then(() => generator.return()); // Afgter we resolve a vlaue then we can dispose of the generator
  return value;
}
)};
const _iztxwe = function _6(signature,peekMany){return(
signature(peekMany, {
  description:
    "Same as peek but returns an array of generators running off the same runtime. Useful for aggregating data across a dataflow graph."
})
)};
const _1c9a7oz = function _peekMany(Generators, Library, require, Runtime) {
    return function peekMany({notebook = '@tomlarkworthy/metaprogramming', cells = []} = {}) {
        notebook = notebook.replace('https://observablehq.com/', '');
        const generators = [];
        const nexts = cells.reduce((acc, cell) => {
            generators.push(Generators.observe(next => acc[cell] = next));
            return acc;
        }, {});
        const library = Object.assign(new Library(), { require: () => require });
        const runtime = new Runtime(library);
        import(`https://api.observablehq.com/${ notebook }.js?v=3`).then(({default: define} = {}) => {
            const imported = runtime.module(define, name => {
                if (!nexts[name])
                    return null;
                return {
                    fulfilled(value) {
                        nexts[name](value);
                    },
                    rejected(err) {
                        nexts[name](Promise.reject(err));
                    }
                };
            });
        });
        return generators;
    };
};
const _1ip6vyt = function _9(md){return(
md`## Examples`
)};
const _zl7xcs = function _peek_value(peek){return(
peek({
  notebook: "@tomlarkworthy/metaprogramming",
  cell: 'constant_string'
})
)};
const _op3i5z = function _peek_promise(peek){return(
peek({
  notebook: "@tomlarkworthy/metaprogramming",
  cell: 'promise'
})
)};
const _v5d71r = function _peek_promise_err(peek){return(
peek({
  notebook: "@tomlarkworthy/metaprogramming",
  cell: 'promise_err'
})
)};
const _a0tvmn = function _peek_generator(peek){return(
peek({
  notebook: "@tomlarkworthy/metaprogramming",
  cell: 'generator'
})
)};
const _1p16ils = function _Runtime(observablehq){return(
observablehq.Runtime
)};
const _19yw4ur = function _Library(observablehq){return(
observablehq.Library
)};
const _1qr47t6 = function _peekTests(createSuite){return(
createSuite({
  name: "Peak Tests"
})
)};
const _iycqca = (G, _) => G.input(_);
const _154smvu = function _18(peekTests,expect,peek_value){return(
peekTests.test("peek_value", async () => {
  expect(peek_value).toMatch("https://observablehq.com/@tomlarkworthy/metaprogramming#constant_string")
})
)};
const _opg3nk = function _20(peekTests,expect,peek_promise){return(
peekTests.test("peak_promise", async () => {
  expect(peek_promise).toMatch("promised")
})
)};
const _1q88unc = function _21(peekTests,peek,expect){return(
peekTests.test("peak_promise_err", async () => {
  const value = peek({
      notebook: "@tomlarkworthy/metaprogramming",
      cell: 'promise_err'
    }).next().value
  return await expect(value).rejects.toBe("rejected")
})
)};
const _1xivlji = function _22(peekTests,peek,expect){return(
peekTests.test("peak_generator", async () => {
  const generator = peek({
    notebook: "@tomlarkworthy/metaprogramming",
    cell: 'generator'
  });
  await expect(generator.next().value).resolves.toBe(1);
  await expect(generator.next().value).resolves.toBe(2);
  await expect(generator.next().value).resolves.toBe(3);
})
)};
const _1fwhpol = function _23(peekTests,peek,expect){return(
peekTests.test("peak_dependent_generator", async () => {
  const dependentGenerator = peek({
    notebook: "@tomlarkworthy/metaprogramming",
    cell: 'dependentGenerator'
  });
  await expect(dependentGenerator.next().value).resolves.toBe(2);
  await expect(dependentGenerator.next().value).resolves.toBe(3);
  await expect(dependentGenerator.next().value).resolves.toBe(4);
})
)};
const _1bk0f5d = function _24(peekTests,peekFirst,expect){return(
peekTests.test("peakFirst_generator", async () => {
  const value = peekFirst({
      notebook: "@tomlarkworthy/metaprogramming",
      cell: 'generator'
    });
  await expect(value).resolves.toBe(1)
})
)};
const _1c5jzpy = function _25(peekTests,peek,expect){return(
peekTests.test("bad import throws", async () => {
  const value = peek({
      notebook: "@tomlarkworthy/no_such_notebook",
      cell: 'promise_err'
    }).next().value
  return await expect(value).rejects.toThrow()
})
)};
const _7qpsct = function _26(peekTests,peekMany,expect){return(
peekTests.test("peak_many_intertwined_generator", async () => {
  const generators = peekMany({
    notebook: "@tomlarkworthy/metaprogramming",
    cells: ['generator', 'dependentGenerator']
  });
  await expect(generators[0].next().value).resolves.toBe(1);
  await expect(generators[0].next().value).resolves.toBe(2);
  await expect(generators[0].next().value).resolves.toBe(3);
  await expect(generators[1].next().value).resolves.toBe(2);
  await expect(generators[1].next().value).resolves.toBe(3);
  await expect(generators[1].next().value).resolves.toBe(4);
})
)};
const _165iew = function _27(md){return(
md`## Test Data`
)};
const _19rob3s = function _constant_string(){return(
"https://observablehq.com/@tomlarkworthy/metaprogramming#constant_string"
)};
const _1fk8m1a = function _promise(){return(
new Promise((resolve) => resolve("promised"))
)};
const _192vpcn = function _promise_err(){return(
new Promise((resolve, reject) => reject("rejected"))
)};
const _opfk4u = function* _generator(){return(
yield* new Set([1, 2, 3])
)};
const _1sbux0o = function _dependentGenerator(generator){return(
generator + 1
)};
const _j8qa6w = function _33(md){return(
md`### Imports`
)};
const _nwa3zc = function _observablehq(require){return(
require("@observablehq/runtime@4")
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  main.define("module @tomlarkworthy/testing", async () => runtime.module((await import("/@tomlarkworthy/testing.js?v=4")).default));  
  main.define("module @mootari/signature", async () => runtime.module((await import("/@mootari/signature.js?v=4")).default));  
  $def("_r9fkse", null, ["md"], _r9fkse);  
  $def("_vclzhh", null, ["signature","peek"], _vclzhh);  
  $def("_wuh02b", "peek", ["Generators","Library","require","Runtime"], _wuh02b);  
  $def("_gx43jw", null, ["signature","peekFirst"], _gx43jw);  
  $def("_1v70dpu", "peekFirst", ["peek"], _1v70dpu);  
  $def("_iztxwe", null, ["signature","peekMany"], _iztxwe);  
  $def("_1c9a7oz", "peekMany", ["Generators","Library","require","Runtime"], _1c9a7oz);  
  $def("_1ip6vyt", null, ["md"], _1ip6vyt);  
  $def("_zl7xcs", "peek_value", ["peek"], _zl7xcs);  
  $def("_op3i5z", "peek_promise", ["peek"], _op3i5z);  
  $def("_v5d71r", "peek_promise_err", ["peek"], _v5d71r);  
  $def("_a0tvmn", "peek_generator", ["peek"], _a0tvmn);  
  $def("_1p16ils", "Runtime", ["observablehq"], _1p16ils);  
  $def("_19yw4ur", "Library", ["observablehq"], _19yw4ur);  
  $def("_1qr47t6", "viewof peekTests", ["createSuite"], _1qr47t6);  
  $def("_iycqca", "peekTests", ["Generators","viewof peekTests"], _iycqca);  
  $def("_154smvu", null, ["peekTests","expect","peek_value"], _154smvu);  
  $def("_opg3nk", null, ["peekTests","expect","peek_promise"], _opg3nk);  
  $def("_1q88unc", null, ["peekTests","peek","expect"], _1q88unc);  
  $def("_1xivlji", null, ["peekTests","peek","expect"], _1xivlji);  
  $def("_1fwhpol", null, ["peekTests","peek","expect"], _1fwhpol);  
  $def("_1bk0f5d", null, ["peekTests","peekFirst","expect"], _1bk0f5d);  
  $def("_1c5jzpy", null, ["peekTests","peek","expect"], _1c5jzpy);  
  $def("_7qpsct", null, ["peekTests","peekMany","expect"], _7qpsct);  
  $def("_165iew", null, ["md"], _165iew);  
  $def("_19rob3s", "constant_string", [], _19rob3s);  
  $def("_1fk8m1a", "promise", [], _1fk8m1a);  
  $def("_192vpcn", "promise_err", [], _192vpcn);  
  $def("_opfk4u", "generator", [], _opfk4u);  
  $def("_1sbux0o", "dependentGenerator", ["generator"], _1sbux0o);  
  $def("_j8qa6w", null, ["md"], _j8qa6w);  
  main.define("createSuite", ["module @tomlarkworthy/testing", "@variable"], (_, v) => v.import("createSuite", _));  
  main.define("expect", ["module @tomlarkworthy/testing", "@variable"], (_, v) => v.import("expect", _));  
  main.define("signature", ["module @mootari/signature", "@variable"], (_, v) => v.import("signature", _));  
  $def("_nwa3zc", "observablehq", ["require"], _nwa3zc);
  return main;
}