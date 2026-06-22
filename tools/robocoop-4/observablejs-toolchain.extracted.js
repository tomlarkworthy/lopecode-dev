
const _lp77pf = function _1(md){return(
md`# Bidirectional Observable JS <=> Runtime Toolchain

\`\`\`js
import {decompile, compile, cellMap} from "@tomlarkworthy/observablejs-toolchain"
\`\`\``
)};
const _n0sc6u = function _2(md){return(
md`### Compilation, source to runtime variable(s)

Compilation takes notebook source cells written in \`Observable Javascript\` and turns them into reactive variables for execution in the \`Observable Runtime\`. A cell is usually compiled to one runtime variable, however, mutable variables are more complicated and are represented as three runtime variables.

ObservableHQ does the compilation process as part of the hosted notebook experience but in this notebook we provide a way to do it in userspace.`
)};
const _sgo04r = function _3(md){return(
md`### Decompilation, Runtime variables(s) to source
The aim of decompilation is to go from the live runtime variable definitions, back to the source as best as possible. ObseervableHQ does not have this feature. In this notebook we implement it in userspace.
`
)};
const _aivd6y = function _4(md){return(
md`### Codeveloped with AI

This notebook is setup for was AI collaboration. Important runtime values, such as the test suite report, are highlighted to the LLM, which helps it decide how to fix test cases.`
)};
const _1q8w8vr = function _5(md){return(
md`### Prior work

_Alex Garcia_ pioneered the first third-party Observable **_compiler_** [[asg017/unofficial-observablehq-compiler](https://github.com/asg017/unofficial-observablehq-compiler)]. The compiler here differs by being entirely text/data based, _i.e._ the output is a string/JSON, not hydrated variables and functions.

This is the first **_decompiler_**.`
)};
const _d17a1w = function _6(md){return(
md`## TODO
- Tagged templates (decompilation works, but there is no source compile for them)
- notebook imports (WIP some decompilation works)
   - need to dedupe some of the implied imports, e.g. \`viewof foo\` also imports \`foo\` but we don't need to explicitly import \`foo\`, it's implied
- anonymous variables work, but the test cases fail due to naming mismatches
- Bug with unobserved module imports, moduleSource does not resolve, we just adjusted source to avoid that problem now 
- class body assignments can't be decompiled`
)};
const _1juriue = function _7(md){return(
md`## Continuous Integration Testing

We sniff the entire runtime to test that each cell is de-compilable`
)};
const _1k5oyj7 = function _9(tests){return(
tests()
)};
const _1jrpa13 = function _10(md){return(
md`### All cells are decompileable`
)};
const _1lc80et = function _cellMaps(cellMap){return(
cellMap()
)};
const _zki07o = function _allCells(cellMaps){return(
[...cellMaps.values()]
  .map((cells) =>
    [...cells.values()]
      .filter((c) => c.module !== "builtin")
      .map((c) => c.variables)
  )
  .flat()
)};
const _1nkhnnd = function _all_decompiled(allCells,decompile){return(
Promise.all(
  allCells.map(async (cell) => {
    try {
      return {
        cell,
        source: await decompile(cell)
      };
    } catch (error) {
      return {
        cell,
        error
      };
    }
  })
)
)};
const _1ip1war = function _test_all_cells_decompilable(all_decompiled)
{
  const errors = all_decompiled.filter((s) => s.error);
  if (errors.length > 0) throw errors;
  return `${all_decompiled.length} cells decompiled without error`;
};
const _1w70b75 = function _15(md){return(
md`### All decompiled cells can be recompiled`
)};
const _uscpdn = function _all_compiled(all_decompiled,compile){return(
all_decompiled
  .filter((source) => !source.error)
  .map((source) => {
    try {
      return {
        ...source,
        compiled: compile(source.source)
      };
    } catch (error) {
      return {
        ...source,
        error
      };
    }
  })
)};
const _x55zzr = function _test_decompiled_cells_recompilable(all_compiled)
{
  const errored = all_compiled.filter((cell) => cell.error);
  if (errored.length > 0) throw JSON.stringify(errored, null, 2);
  return `${all_compiled.length} cells recompiled without error`;
};
const _100n7xr = function _18(md){return(
md`### All cells roundtrip compile`
)};
const _1nm57o2 = function _roundtripped(all_compiled,decompile){return(
Promise.all(
  all_compiled
    .filter((c) => !c.error)
    .map(async (cell) => {
      try {
        const decompiled = await decompile(cell.compiled);
        return {
          ...cell,
          decompiled
        };
      } catch (error) {
        return {
          ...cell,
          error
        };
      }
    })
)
)};
const _18xo2td = function _test_all_cells_roundtrippable(roundtripped)
{
  const errored = roundtripped.filter((cell) => cell.error);
  if (errored.length > 0) throw JSON.stringify(errored, null, 2);
  return `${roundtripped} cells decompiled, recompiled and decompiled again without error`;
};
const _14nox99 = function _21(md){return(
md`## Reference Data`
)};
const _1d3zr3i = function _22(md){return(
md`### Source code
The source code of a [reference notebook](https://observablehq.com/@tomlarkworthy/notebook-semantics?collection=@tomlarkworthy/lopebook) is extracted directly from the \`https://api.observablehq.com/document/...\` endpoint
`
)};
const _12sqt9 = function _dependancy_document(){return(
{
  id: "1fb3132464653a8f",
  slug: "dependancy",
  trashed: false,
  description: "",
  likes: 0,
  publish_level: "live_unlisted",
  forks: 0,
  fork_of: null,
  has_importers: true,
  update_time: "2024-10-15T18:06:59.080Z",
  first_public_version: 16,
  paused_version: null,
  publish_time: "2024-10-15T18:07:25.850Z",
  publish_version: 16,
  latest_version: 16,
  thumbnail: "52bb3d5b2f48b727e0eea931c0093fe5778fb9b809bebb1edfb949d2f4b5590a",
  default_thumbnail:
    "52bb3d5b2f48b727e0eea931c0093fe5778fb9b809bebb1edfb949d2f4b5590a",
  roles: [],
  sharing: null,
  owner: {
    id: "7db5ed2b0697d645",
    avatar_url:
      "https://avatars.observableusercontent.com/avatar/47327a8bc1966f2186dcb3ebf4b7ee6e4e7ab9a5c2a07405aff57200ea778f71",
    login: "tomlarkworthy",
    name: "Tom Larkworthy",
    bio: "Tech Lead at Taktile.\nFormerly Firebase, Google",
    home_url: "https://taktile.com",
    type: "team",
    tier: "starter_2024"
  },
  creator: {
    id: "5215f6ec4a999d40",
    avatar_url:
      "https://avatars.observableusercontent.com/avatar/47327a8bc1966f2186dcb3ebf4b7ee6e4e7ab9a5c2a07405aff57200ea778f71",
    login: "tomlarkworthy",
    name: "Tom Larkworthy",
    bio: "Tech Lead at Taktile.\nFormerly Firebase, Google",
    home_url: "https://taktile.com",
    tier: "pro"
  },
  authors: [
    {
      id: "5215f6ec4a999d40",
      avatar_url:
        "https://avatars.observableusercontent.com/avatar/47327a8bc1966f2186dcb3ebf4b7ee6e4e7ab9a5c2a07405aff57200ea778f71",
      name: "Tom Larkworthy",
      login: "tomlarkworthy",
      bio: "Tech Lead at Taktile.\nFormerly Firebase, Google",
      home_url: "https://taktile.com",
      tier: "pro",
      approved: true,
      description: ""
    }
  ],
  collections: [
    {
      id: "cf72f19f55f3a048",
      type: "public",
      slug: "lopebook",
      title: "lopebook",
      description: "",
      update_time: "2024-10-11T18:10:59.078Z",
      pinned: false,
      ordered: false,
      custom_thumbnail: null,
      default_thumbnail: null,
      thumbnail: null,
      listing_count: 0,
      parent_collection_count: 0,
      owner: {
        id: "7db5ed2b0697d645",
        avatar_url:
          "https://avatars.observableusercontent.com/avatar/47327a8bc1966f2186dcb3ebf4b7ee6e4e7ab9a5c2a07405aff57200ea778f71",
        login: "tomlarkworthy",
        name: "Tom Larkworthy",
        bio: "Tech Lead at Taktile.\nFormerly Firebase, Google",
        home_url: "https://taktile.com",
        type: "team",
        tier: "starter_2024"
      }
    }
  ],
  files: [],
  comments: [],
  commenting_lock: null,
  suggestion_from: null,
  suggestions_to: [],
  version: 16,
  title: "Dependancy",
  license: null,
  copyright: "",
  nodes: [
    {
      id: 0,
      value: "# Dependancy",
      pinned: false,
      mode: "md",
      data: null,
      name: ""
    },
    {
      id: 7,
      value: 'dep = "a"',
      pinned: true,
      mode: "js",
      data: null,
      name: null
    },
    {
      id: 9,
      value: "viewof viewdep = Inputs.input()",
      pinned: true,
      mode: "js",
      data: null,
      name: null
    },
    {
      id: 11,
      value: "mutable mutabledep = ({})",
      pinned: false,
      mode: "js",
      data: null,
      name: null
    }
  ],
  resolutions: [],
  schedule: null,
  last_view_time: null
}
)};
const _13q8314 = function _dependancy_source(dependancy_document){return(
dependancy_document.nodes.map((s) => ({
  value: s.value,
  name: s.name
}))
)};
const _ook1nq = function _25(md){return(
md`
\`\`\`
curl https://api.observablehq.com/document/@tomlarkworthy/notebook-semantics
\`\`\``
)};
const _jmn84r = function _notebook_semantics_document(){return(
{
  id: "483a346021943f64",
  slug: "notebook-semantics",
  trashed: false,
  description: "",
  likes: 0,
  publish_level: "live_unlisted",
  forks: 0,
  fork_of: null,
  has_importers: false,
  update_time: "2025-03-17T18:36:45.520Z",
  first_public_version: 90,
  paused_version: null,
  publish_time: "2024-10-15T18:29:58.853Z",
  publish_version: 152,
  latest_version: 152,
  thumbnail: "10dc93e33f09bad8366c143415404f378b6bd94f1148589113ff5fb2d22573ee",
  default_thumbnail:
    "10dc93e33f09bad8366c143415404f378b6bd94f1148589113ff5fb2d22573ee",
  roles: [],
  sharing: null,
  edits: [
    { node_id: 48, value: 'file = FileAttachment("empty")' },
    { node_id: 55, value: "mutable_dep_2 = {\n  file;\n  return q + 1;\n}" },
    { node_id: 151, value: "thisReference = (this || 0) + 1" }
  ],
  owner: {
    id: "7db5ed2b0697d645",
    avatar_url:
      "https://avatars.observableusercontent.com/avatar/47327a8bc1966f2186dcb3ebf4b7ee6e4e7ab9a5c2a07405aff57200ea778f71",
    login: "tomlarkworthy",
    name: "Tom Larkworthy",
    bio: "Tech Lead at Taktile.\nFormerly Firebase, Google",
    home_url: "https://taktile.com",
    type: "team",
    tier: "starter_2024"
  },
  creator: {
    id: "5215f6ec4a999d40",
    avatar_url:
      "https://avatars.observableusercontent.com/avatar/47327a8bc1966f2186dcb3ebf4b7ee6e4e7ab9a5c2a07405aff57200ea778f71",
    login: "tomlarkworthy",
    name: "Tom Larkworthy",
    bio: "Tech Lead at Taktile. ex Firebase, Google.\n🦋 larkworthy.bsky.social",
    home_url: "https://bsky.app/profile/larkworthy.bsky.social",
    tier: "pro"
  },
  authors: [
    {
      id: "5215f6ec4a999d40",
      avatar_url:
        "https://avatars.observableusercontent.com/avatar/47327a8bc1966f2186dcb3ebf4b7ee6e4e7ab9a5c2a07405aff57200ea778f71",
      name: "Tom Larkworthy",
      login: "tomlarkworthy",
      bio: "Tech Lead at Taktile. ex Firebase, Google.\n🦋 larkworthy.bsky.social",
      home_url: "https://bsky.app/profile/larkworthy.bsky.social",
      tier: "pro",
      approved: true,
      description: ""
    }
  ],
  collections: [
    {
      id: "cf72f19f55f3a048",
      type: "public",
      slug: "lopebook",
      title: "lopecode",
      description: "",
      update_time: "2024-11-17T07:27:34.529Z",
      pinned: false,
      ordered: true,
      custom_thumbnail: null,
      default_thumbnail:
        "dab1604ccf4a760060379630da0876da27b79509b738f8d5c300c9a9a320e38a",
      thumbnail:
        "dab1604ccf4a760060379630da0876da27b79509b738f8d5c300c9a9a320e38a",
      listing_count: 9,
      parent_collection_count: 0,
      owner: {
        id: "7db5ed2b0697d645",
        avatar_url:
          "https://avatars.observableusercontent.com/avatar/47327a8bc1966f2186dcb3ebf4b7ee6e4e7ab9a5c2a07405aff57200ea778f71",
        login: "tomlarkworthy",
        name: "Tom Larkworthy",
        bio: "Tech Lead at Taktile.\nFormerly Firebase, Google",
        home_url: "https://taktile.com",
        type: "team",
        tier: "starter_2024"
      }
    }
  ],
  files: [
    {
      id: "50cad75d56578d08f50d560a50a6f4a66919f1f0b9c189221c6768a04dc958323335dac14ca3526e6527019d02e9e00d21d247eb5c2646b38ec7720e0ddcaa7e",
      url: "https://static.observableusercontent.com/files/50cad75d56578d08f50d560a50a6f4a66919f1f0b9c189221c6768a04dc958323335dac14ca3526e6527019d02e9e00d21d247eb5c2646b38ec7720e0ddcaa7e",
      download_url:
        "https://static.observableusercontent.com/files/50cad75d56578d08f50d560a50a6f4a66919f1f0b9c189221c6768a04dc958323335dac14ca3526e6527019d02e9e00d21d247eb5c2646b38ec7720e0ddcaa7e?response-content-disposition=attachment%3Bfilename*%3DUTF-8%27%27empty",
      name: "empty",
      create_time: "2024-10-15T18:03:32.575Z",
      mime_type: "application/octet-stream",
      status: "public",
      size: 2,
      content_encoding: null,
      private_bucket_id: null
    }
  ],
  comments: [],
  commenting_lock: null,
  suggestion_from: null,
  suggestions_to: [],
  version: 152,
  title: "Test Notebook of Semantics",
  license: "mit",
  copyright: "Copyright 2024 Tom Larkworthy",
  nodes: [
    {
      id: 0,
      value: "# Test Notebook of Semantics",
      pinned: false,
      mode: "md",
      data: null,
      name: ""
    },
    { id: 9, value: "1", pinned: true, mode: "js", data: null, name: null },
    {
      id: 31,
      value: '{\n  ("");\n}',
      pinned: true,
      mode: "js",
      data: null,
      name: null
    },
    {
      id: 100,
      value: "<div>",
      pinned: false,
      mode: "html",
      data: null,
      name: "html"
    },
    {
      id: 115,
      value: "obj_literal = ({})",
      pinned: false,
      mode: "js",
      data: null,
      name: null
    },
    {
      id: 11,
      value: 'x = ""',
      pinned: true,
      mode: "js",
      data: null,
      name: null
    },
    {
      id: 13,
      value: "y = x",
      pinned: true,
      mode: "js",
      data: null,
      name: null
    },
    {
      id: 15,
      value: 'z = {\n  ("");\n  return x + y;\n}',
      pinned: true,
      mode: "js",
      data: null,
      name: null
    },
    {
      id: 145,
      value: 'comments = {\n  // a comment\n  return "";\n}',
      pinned: false,
      mode: "js",
      data: null,
      name: null
    },
    {
      id: 17,
      value: "generator = {\n  yield x + y;\n}",
      pinned: true,
      mode: "js",
      data: null,
      name: null
    },
    {
      id: 20,
      value: "_function = function () {}",
      pinned: true,
      mode: "js",
      data: null,
      name: null
    },
    {
      id: 71,
      value: "asyncfunction = async function () {}",
      pinned: true,
      mode: "js",
      data: null,
      name: null
    },
    {
      id: 25,
      value: "named_function = function foo() {}",
      pinned: true,
      mode: "js",
      data: null,
      name: null
    },
    {
      id: 151,
      value: "thisReference = (this || 0) + 1",
      pinned: true,
      mode: "js",
      data: null,
      name: null
    },
    {
      id: 22,
      value: "lambda = () => {}",
      pinned: true,
      mode: "js",
      data: null,
      name: null
    },
    {
      id: 33,
      value: "error = {\n  throw new Error();\n}",
      pinned: true,
      mode: "js",
      data: null,
      name: null
    },
    {
      id: 39,
      value: "viewof view = Inputs.input()",
      pinned: true,
      mode: "js",
      data: null,
      name: null
    },
    {
      id: 42,
      value: "mutable q = 6",
      pinned: true,
      mode: "js",
      data: null,
      name: null
    },
    {
      id: 45,
      value: "inbuilt = _",
      pinned: true,
      mode: "js",
      data: null,
      name: null
    },
    {
      id: 48,
      value: 'file = FileAttachment("empty")',
      pinned: true,
      mode: "js",
      data: null,
      name: null
    },
    {
      id: 52,
      value:
        "mutable_dep = {\n  viewof view;\n  lambda;\n  mutable q;\n  return mutable q;\n}",
      pinned: true,
      mode: "js",
      data: null,
      name: null
    },
    {
      id: 55,
      value: "mutable_dep_2 = {\n  file;\n  return q + 1;\n}",
      pinned: true,
      mode: "js",
      data: null,
      name: null
    },
    {
      id: 57,
      value: "viewofdep_inline = viewof view",
      pinned: true,
      mode: "js",
      data: null,
      name: null
    },
    {
      id: 61,
      value: "viewofdatadep = view",
      pinned: true,
      mode: "js",
      data: null,
      name: null
    },
    { id: 93, value: "dep", pinned: true, mode: "js", data: null, name: null },
    {
      id: 64,
      value:
        'import {\n  dep,\n  mutable mutabledep,\n  viewof viewdep,\n  dep as dep_alias,\n  mutable mutabledep as aslias_mutabledep,\n  viewof viewdep as aslias_viewdep,\n  mutabledep as aslias_mutabledep_data,\n  viewdep as aslias_viewdep_data\n} from "@tomlarkworthy/dependancy";',
      pinned: true,
      mode: "js",
      data: null,
      name: null
    }
  ],
  resolutions: [],
  schedule: null,
  last_view_time: null
}
)};
const _1juj7i6 = function _notebook_semantics_source(notebook_semantics_document,parser){return(
notebook_semantics_document.nodes.map((s) => ({
  value: s.value,
  name: s.mode == "js" ? parser.parseCell(s.value)?.id?.name : null,
  mode: s.mode
}))
)};
const _1oevsow = function _28(md){return(
md`### Runtime Representation (v4)`
)};
const _11lfflk = function _notebook_semantics_module() {
    return import('https://api.observablehq.com/@tomlarkworthy/notebook-semantics.js?v=4');
};
const _gjten6 = function _31(md){return(
md`### Imports`
)};
const _n9rco8 = function _32(md){return(
md`observed modules are variables in the parent notebook, so their module is the main, however, their dependency is something else. -- this holds even for live notebook. They can only have one dependancy (inputs.length = 1)`
)};
const _eog966 = function _33(md){return(
md`### runtime in observable`
)};
const _n4ntwp = function _34(md){return(
md`## Test cases`
)};
const _1lg9nnl = function _importFake(Runtime){return(
async function (variable, module_name) {
  const runtime = new Runtime({}, () => {});
  const importer = runtime.module();
  let _import_definition;
  eval(`_import_definition = async () => "${module_name}" && runtime.module()`);
  const importVariable = importer.define(
    `module ${module_name}`,
    _import_definition
  );
  const importee = (importVariable._value = await importVariable._definition());
  importee.define(variable._inputs[0], [], () => null);
  return importer.import([variable._inputs[0]], variable._name, importee);
}
)};
const _25tjxa = async function _test_decompile_syntax_error_roundtrip(compile,decompile,expect)
{
  const compiled = await compile(`foo = () => return ""`);
  const decompiled = await decompile(compiled);
  expect(decompiled).toEqual(`foo = () => return ""`);
  return "ok";
};
const _1jyrnzq = async function _test_decompile_$variable(decompile,expect)
{
  const decompiled = await decompile([
    {
      _name: "v",
      _definition: "function _x($variable) {return ($variable);}",
      _inputs: [
        {
          _name: "@variable"
        }
      ]
    }
  ]);
  expect(decompiled).toEqual("v = $variable");
  return "@variable support: ok";
};
const _1v1d8m3 = async function _test_decompile_import_variable(decompile,importFake,expect)
{
  const decompiled = await decompile([
    await importFake(
      {
        _name: "dep",
        _definition: "function Yn(e){return e}",
        _inputs: ["dep"]
      },
      "@tomlarkworthy/dependancy"
    )
  ]);
  expect(decompiled).toEqual(`import {dep} from "@tomlarkworthy/dependancy"`);
  return "ok";
};
const _fiyb80 = async function _test_decompile_dollar_in_string_literal(decompile,expect)
{
  // Regression: $N inside a string/regex/template literal must NOT be substituted
  // with `viewof X` / `mutable X`. This is the cc_ws bug — regex backref $1
  // collided with `viewof cc_watches` (input #1) and got rewritten blindly.
  const decompiled = await decompile([
    {
      _name: "demo",
      _definition: `function _demo($0,$1){return(
"x".replace(/x/, '$1y')
)}`,
      _inputs: ["viewof a", "viewof b"]
    }
  ]);
  expect(decompiled).toEqual(`demo = 'x'.replace(/x/, '$1y')`);
  return "ok";
};
const _wgfrtq = async function _test_decompile_import_variable_alias(decompile,importFake,expect)
{
  const decompiled = await decompile([
    await importFake(
      {
        _name: "alias",
        _definition: "function Yn(e){return e}",
        _inputs: ["dep"]
      },
      "@tomlarkworthy/dependancy"
    )
  ]);
  expect(decompiled).toEqual(
    `import {dep as alias} from "@tomlarkworthy/dependancy"`
  );
  return "ok";
};
const _1a8gnrc = async function _test_decompile_import_many(decompile,importFake,expect)
{
  const decompiled = await decompile([
    await importFake(
      {
        _name: "dep",
        _definition: "function Yn(e){return e}",
        _inputs: ["dep"]
      },
      "@tomlarkworthy/dependancy"
    ),
    {
      _name: "mutable mutabledep",
      _definition: '(_, v) => v.import("mutable mutabledep", _)',
      _inputs: ["module 1", "@variable"]
    },
    {
      _name: "mutabledep",
      _definition: '(_, v) => v.import("mutabledep", _)',
      _inputs: ["module 1", "@variable"]
    },
    {
      _name: "viewof viewdep",
      _definition: '(_, v) => v.import("viewof viewdep", _)',
      _inputs: ["module 1", "@variable"]
    },
    {
      _name: "viewdep",
      _definition: '(_, v) => v.import("viewdep", _)',
      _inputs: ["module 1", "@variable"]
    },
    {
      _name: "dep_alias",
      _definition: '(_, v) => v.import("dep", "dep_alias", _)',
      _inputs: ["module 1", "@variable"]
    },
    {
      _name: "error_dep",
      _definition: "function Yn(e){return e}",
      _inputs: ["module 1", "error_dep"]
    },
    {
      _name: "mutable aslias_mutabledep",
      _definition:
        '(_, v) => v.import("mutable mutabledep", "mutable aslias_mutabledep", _)',
      _inputs: ["module 1", "@variable"]
    },
    {
      _name: "aslias_mutabledep",
      _definition: '(_, v) => v.import("mutabledep", "aslias_mutabledep", _)',
      _inputs: ["module 1", "@variable"]
    },
    {
      _name: "viewof aslias_viewdep",
      _definition:
        '(_, v) => v.import("viewof viewdep", "viewof aslias_viewdep", _)',
      _inputs: ["module 1", "@variable"]
    },
    {
      _name: "aslias_viewdep",
      _definition: '(_, v) => v.import("viewdep", "aslias_viewdep", _)',
      _inputs: ["module 1", "@variable"]
    },
    {
      _name: "aslias_mutabledep_data",
      _definition:
        '(_, v) => v.import("mutabledep", "aslias_mutabledep_data", _)',
      _inputs: ["module 1", "@variable"]
    },
    {
      _name: "aslias_viewdep_data",
      _definition: '(_, v) => v.import("viewdep", "aslias_viewdep_data", _)',
      _inputs: ["module 1", "@variable"]
    }
  ]);
  expect(decompiled).toEqual(
    `import {dep, mutable mutabledep, mutabledep, viewof viewdep, viewdep, dep as dep_alias, error_dep, mutable mutabledep as mutable aslias_mutabledep, mutabledep as aslias_mutabledep, viewof viewdep as viewof aslias_viewdep, viewdep as aslias_viewdep, mutabledep as aslias_mutabledep_data, viewdep as aslias_viewdep_data} from "@tomlarkworthy/dependancy"`
  );
  return "ok";
};
const _7stpu3 = async function _test_decompile_markdown_cell(decompile,expect)
{
  const decompiled = await decompile([
    {
      _name: "v",
      _definition: `function _1(md){return(\nmd\`# Test Notebook of Semantics\`\n)}`,
      _inputs: [
        {
          _name: "md"
        }
      ]
    }
  ]);
  expect(decompiled).toEqual(`v = md\`# Test Notebook of Semantics\``);
  return "ok";
};
const _v4p1js = async function _test_decompile_constant(decompile,expect)
{
  const decompiled = await decompile([
    {
      _name: "v",
      _definition: `function _2(){return(
1
)}`,
      _inputs: []
    }
  ]);
  expect(decompiled).toEqual(`v = 1`);
  return "ok";
};
const _pcs4h = async function _test_decompile_string_literal(decompile,expect)
{
  const decompiled = await decompile([
    {
      _name: "v",
      _definition: function _3() {
        ("");
      },
      _inputs: []
    }
  ]);
  expect(decompiled).toEqual(`v = {
  '';
}`);
  return "ok";
};
const _a2zh99 = async function _test_decompile_html_cell(decompile,expect)
{
  const decompiled = await decompile([
    {
      _name: "html",
      _definition: `function _html(htl){return(\nhtl.html\`<div>\`\n)}`,
      _inputs: []
    }
  ]);
  expect(decompiled).toEqual(`html = htl.html\`<div>\``);
  return "ok";
};
const _pyp280 = async function _test_decompile_class(decompile,expect)
{
  const decompiled = await decompile([
    {
      _name: "myclass",
      _definition: `function _myclass(){return(
class myclass {}
)}`,
      _inputs: []
    }
  ]);
  expect(decompiled).toEqual(`myclass = class myclass {
}`);
  return "ok";
};
const _kf8c3f = function _test_decompile_class_with_property(decompile){return(
decompile([
  {
    _inputs: [],
    _definition: `function _Cls(){return(
        class Cls {
          d;
        }
    )}`
  }
])
)};
const _4vunhm = async function _test_decompile_object_literal(decompile,expect)
{
  const decompiled = await decompile([
    {
      _name: "obj_literal",
      _definition: "function _obj_literal(){return(\n{}\n)}",
      _inputs: []
    }
  ]);
  expect(decompiled).toEqual(`obj_literal = ({})`);
  return "ok";
};
const _s14e29 = async function _test_decompile_reference(decompile,expect)
{
  const decompiled = await decompile([
    {
      _name: "v",
      _definition: `function _y(x){return(
x
)}`,
      _inputs: []
    }
  ]);
  expect(decompiled).toEqual(`v = x`);
  return "ok";
};
const _4rsshj = async function _test_decompile_block(decompile,expect)
{
  const decompiled = await decompile([
    {
      _name: "v",
      _definition: `function _z(x,y)
{
  ("");
  return x + y;
}`,
      _inputs: []
    }
  ]);
  expect(decompiled).toEqual(`v = {
  '';
  return x + y;
}`);
  return "ok";
};
const _o7o1wl = async function _test_decompile_comments(decompile,expect)
{
  const decompiled = await decompile([
    {
      _name: "comments",
      _definition: `function _comments()
{
  // a comment
  return "";
}`,
      _inputs: []
    }
  ]);
  expect(decompiled).toEqual(`comments = {
  // a comment
  return '';
}`);
  return "ok";
};
const _1yn35e3 = async function _test_decompile_generator(decompile,expect)
{
  const decompiled = await decompile([
    {
      _name: "generator",
      _definition: `function* _generator(x,y)
{
  yield x + y;
}`,
      _inputs: []
    }
  ]);
  expect(decompiled).toEqual(`generator = {
  yield x + y;
}`);
  return "ok";
};
const _135eswd = async function _test_decompile_function(decompile,expect)
{
  const decompiled = await decompile([
    {
      _name: "_function",
      _definition: `function __function(){return(
function () {}
)}`,
      _inputs: []
    }
  ]);
  expect(decompiled).toEqual(`_function = function () {
}`);
  return "ok";
};
const _1pitq2 = async function _test_decompile_async_function(decompile,expect)
{
  const decompiled = await decompile([
    {
      _name: "asyncfunction",
      _definition: `function _asyncfunction(){return(
async function () {}
)}`,
      _inputs: []
    }
  ]);
  expect(decompiled).toEqual(`asyncfunction = async function () {
}`);
  return "ok";
};
const _1kxe1b2 = async function _test_decompile_named_function(decompile,expect)
{
  const decompiled = await decompile([
    {
      _name: "named_function",
      _definition: `function _named_function(){return(
function foo() {}
)}`,
      _inputs: []
    }
  ]);
  expect(decompiled).toEqual(`named_function = function foo() {
}`);
  return "ok";
};
const _1pghf4f = async function _test_decompile_this_reference(decompile,expect)
{
  const decompiled = await decompile([
    {
      _name: "thisReference",
      _definition: `function _thisReference(){return(
(this || 0) + 1
)}`,
      _inputs: []
    }
  ]);
  expect(decompiled).toEqual(`thisReference = (this || 0) + 1`);
  return "ok";
};
const _4aeghn = async function _test_decompile_lambda(decompile,expect)
{
  const decompiled = await decompile([
    {
      _name: "lambda",
      _definition: `function _lambda(){return(
() => {}
)}`,
      _inputs: []
    }
  ]);
  expect(decompiled).toEqual(`lambda = () => {
}`);
  return "ok";
};
const _12ec5zd = async function _test_decompile_error(decompile,expect)
{
  const decompiled = await decompile([
    {
      _name: "error",
      _definition: `function _error()
{
  throw new Error();
}`,
      _inputs: []
    }
  ]);
  expect(decompiled).toEqual(`error = {
  throw new Error();
}`);
  return "ok";
};
const _3bj09h = async function _test_decompile_error_object(decompile,expect)
{
  const decompiled = await decompile([
    {
      _name: "error_obj",
      _definition: `function _error_obj()
{
  throw { foo: "bar" };
}`,
      _inputs: []
    }
  ]);
  expect(decompiled).toEqual(`error_obj = {
  throw { foo: 'bar' };
}`);
  return "ok";
};
const _6iufw4 = function _60(md){return(
md`⚠️ This cells have not been grouped correctly, should be a single import being decompiled`
)};
const _15idqib = async function _test_decompile_anon_error_dep(decompile,expect)
{
  const decompiled = await decompile([
    {
      _definition: `function _19(error_dep){return(
error_dep
)}`,
      _inputs: ["error_dep"]
    }
  ]);
  expect(decompiled).toEqual(`error_dep`);
  return "ok";
};
const _mhm98c = async function _test_decompile_viewof(decompile,expect)
{
  const decompiled = await decompile([
    {
      _name: "viewof view",
      _definition: `function _view(Inputs){return(
Inputs.input()
)}`,
      _inputs: []
    }
  ]);
  expect(decompiled).toEqual(`viewof view = Inputs.input()`);
  return "ok";
};
const _15kgqrr = async function _test_decompile_mutable(decompile,expect)
{
  const decompiled = await decompile([
    {
      _name: "initial q",
      _definition: `function _q(){return(
6
)}`,
      _inputs: []
    }
  ]);
  expect(decompiled).toEqual(`mutable q = 6`);
  return "ok";
};
const _1onyv5c = async function _test_decompile_builtin(decompile,expect)
{
  const decompiled = await decompile([
    {
      _name: "inbuilt",
      _definition: `function _inbuilt(_){return(
_
)}`,
      _inputs: []
    }
  ]);
  expect(decompiled).toEqual(`inbuilt = _`);
  return "ok";
};
const _1uv76xx = async function _test_decompile_fileattachment(decompile,expect)
{
  const decompiled = await decompile([
    {
      _name: "file",
      _definition: `function _file(FileAttachment){return(
FileAttachment("empty")
)}`,
      _inputs: []
    }
  ]);
  expect(decompiled).toEqual(`file = FileAttachment('empty')`);
  return "ok";
};
const _g4z6de = async function _test_decompile_mutable_dependancy(decompile,expect)
{
  const decompiled = await decompile([
    {
      _name: "mutable_dep",
      _definition: `function _mutable_dep($0,lambda,$1)
{
  $0;
  lambda;
  $1.value;
  return $1.value;
}`,
      _inputs: ["viewof view", "mutable q"]
    }
  ]);
  expect(decompiled).toEqual(`mutable_dep = {
  viewof view;
  lambda;
  mutable q;
  return mutable q;
}`);
  return "ok";
};
const _qo8sdl = async function _test_decompile_mutable_dependancy_2(decompile,expect)
{
  const decompiled = await decompile([
    {
      _name: "mutable_dep_2",
      _definition: `function _mutable_dep_2(file,q)
{
  file;
  return q + 1;
}`,
      _inputs: []
    }
  ]);
  expect(decompiled).toEqual(`mutable_dep_2 = {
  file;
  return q + 1;
}`);
  return "ok";
};
const _15kwaz1 = async function _test_decompile_viewof_dep(decompile,expect)
{
  const decompiled = await decompile([
    {
      _name: "viewofdep_inline",
      _definition: `function _viewofdep_inline($0){return(
$0
)}`,
      _inputs: ["viewof view"]
    }
  ]);
  expect(decompiled).toEqual(`viewofdep_inline = viewof view`);
  return "ok";
};
const _1qjzk2s = async function _test_decompile_viewof_data_dep(decompile,expect)
{
  const decompiled = await decompile([
    {
      _name: "viewofdatadep",
      _definition: `function _viewofdatadep(view){return(
view
)}`,
      _inputs: []
    }
  ]);
  expect(decompiled).toEqual(`viewofdatadep = view`);
  return "ok";
};
const _ehz2xk = async function _test_decompile_viewof_param(decompile,expect)
{
  // Lopecode compiled form uses viewof_X as parameter name instead of $N
  const decompiled = await decompile([
    {
      _name: "foo",
      _definition: `function _foo(viewof_bar, x)
{
  viewof_bar.value = x;
  viewof_bar.dispatchEvent(new Event("input"));
}`,
      _inputs: ["viewof bar"]
    }
  ]);
  expect(decompiled).toEqual(`foo = {
  viewof bar.value = x;
  viewof bar.dispatchEvent(new Event('input'));
}`);
  return "ok";
};
const _oilkc0 = async function _test_decompile_anon_dep(decompile,expect)
{
  const decompiled = await decompile([
    {
      _definition: `function _28(dep){return(
dep
)}`,
      _inputs: []
    }
  ]);
  expect(decompiled).toEqual(`dep`);
  return "ok";
};
const _1jggajo = async function _test_decompile_import_mutable(decompile,expect)
{
  const decompiled = await decompile([
    {
      _name: "mutable mutabledep",
      _definition: `(_, v) => v.import("mutable mutabledep", _)`,
      _inputs: []
    }
  ]);
  expect(decompiled).toEqual(
    `mutable mutabledep = v.import('mutable mutabledep', _)`
  );
  return "ok";
};
const _di0abi = async function _test_decompile_import_viewof(decompile,expect)
{
  const decompiled = await decompile([
    {
      _name: "viewof viewdep",
      _definition: `(_, v) => v.import("viewof viewdep", _)`,
      _inputs: []
    }
  ]);
  expect(decompiled).toEqual(`viewof viewdep = v.import('viewof viewdep', _)`);
  return "ok";
};
const _14o5oio = async function _test_decompile_viewof_data(decompile,expect)
{
  const decompiled = await decompile([
    {
      _name: "viewdep",
      _definition: `(_, v) => v.import("viewdep", _)`,
      _inputs: []
    }
  ]);
  expect(decompiled).toEqual(`viewdep = v.import('viewdep', _)`);
  return "ok";
};
const _1lv4syw = async function _test_decompile_import_alias(decompile,expect)
{
  const decompiled = await decompile([
    {
      _name: "dep_alias",
      _definition: `(_, v) => v.import("dep", "dep_alias", _)`,
      _inputs: []
    }
  ]);
  expect(decompiled).toEqual(`dep_alias = v.import('dep', 'dep_alias', _)`);
  return "ok";
};
const _l8b8hu = async function _test_decompile_import_mutable_alias(decompile,expect)
{
  const decompiled = await decompile([
    {
      _name: "mutable aslias_mutabledep",
      _definition: `(_, v) => v.import("mutable mutabledep", "mutable aslias_mutabledep", _)`,
      _inputs: []
    }
  ]);
  expect(decompiled).toEqual(
    `mutable aslias_mutabledep = v.import('mutable mutabledep', 'mutable aslias_mutabledep', _)`
  );
  return "ok";
};
const _1g5n3sa = async function _test_decompile_import_mutable_data_alias(decompile,expect)
{
  const decompiled = await decompile([
    {
      _name: "aslias_mutabledep",
      _definition: `(_, v) => v.import("mutabledep", "aslias_mutabledep", _)`,
      _inputs: []
    }
  ]);
  expect(decompiled).toEqual(
    `aslias_mutabledep = v.import('mutabledep', 'aslias_mutabledep', _)`
  );
  return "ok";
};
const _1lnngk6 = async function _test_decompile_import_viewof_alias(decompile,expect)
{
  const decompiled = await decompile([
    {
      _name: "viewof aslias_viewdep",
      _definition: `(_, v) => v.import("viewof viewdep", "viewof aslias_viewdep", _)`,
      _inputs: []
    }
  ]);
  expect(decompiled).toEqual(
    `viewof aslias_viewdep = v.import('viewof viewdep', 'viewof aslias_viewdep', _)`
  );
  return "ok";
};
const _1na1e5i = async function _test_decompile_import_viewof_data_alias(decompile,expect)
{
  const decompiled = await decompile([
    {
      _name: "aslias_viewdep",
      _definition: `(_, v) => v.import("viewdep", "aslias_viewdep", _)`,
      _inputs: []
    }
  ]);
  expect(decompiled).toEqual(
    `aslias_viewdep = v.import('viewdep', 'aslias_viewdep', _)`
  );
  return "ok";
};
const _17dwb6r = function _80(md){return(
md`### The Decompiler`
)};
const _1vs6mei = function _82(md){return(
md`### \`decompile\``
)};
const _1g89k6a = function _escodegenOptions(escodegen){return(
{
  comment: true,
  format: {
    ...escodegen.FORMAT_DEFAULTS,
    indent: {
      ...escodegen.FORMAT_DEFAULTS.indent,
      style: "  "
    }
  }
}
)};
const _llvq9s = function _decompile(decompileImport,formatImportDeclaration,acorn,escodegen,escodegenOptions)
{
  return async function decompile(variables) {
    if (!variables || variables.length === 0)
      throw new Error("no variables to decompile");
    const importInfo = await decompileImport(variables);
    if (importInfo) return formatImportDeclaration(importInfo);
    const variable = variables[0];
    const name = variable._name;
    const compiled =
      typeof variable._definition === "string"
        ? variable._definition
        : variable._definition.toString();
    // Check for syntax-error cells that carry the original source
    const sourceExprMatch = compiled.match(
      /_sourceExpression:\s*("(?:[^"\\]|\\.)*")/
    );
    if (sourceExprMatch) {
      try {
        return JSON.parse(sourceExprMatch[1]);
      } catch {}
    }
    const inputs = (variable._inputs || []).map((i) =>
      typeof i === "string" ? i : i._name
    );
    const wrappedCode = "(" + compiled + ")";
    const comments = [],
      tokens = [];
    let parsed = acorn.parse(wrappedCode, {
      ecmaVersion: 2022,
      sourceType: "module",
      ranges: true,
      onComment: comments,
      onToken: tokens
    });
    parsed = escodegen.attachComments(parsed, comments, tokens);
    const functionExpression = parsed.body[0].expression;
    const body = functionExpression.body;
    // Extract parameter names from AST for underscore-encoded name fixup
    const params = (functionExpression.params || []).map((p) => p.name);
    let varName = name;
    let prefix = "";
    if (name) {
      if (name.startsWith("initial ")) {
        prefix = "mutable ";
        varName = name.replace(/^initial /, "");
      } else if (name.startsWith("mutable ")) {
        prefix = "mutable ";
        varName = name.replace(/^mutable /, "");
      } else if (name.startsWith("viewof ")) {
        prefix = "viewof ";
        varName = name.replace(/^viewof /, "");
      }
    }
    // Build $N → placeholder map. Walking the AST and renaming Identifier nodes
    // BEFORE escodegen.generate keeps us out of string literals, regex literals,
    // and template element cooked text — which is where naive replaceAll on $N
    // used to corrupt regex backreferences (e.g. '$1cc=' + token).
    const placeholders = [];
    {
      let id = 0;
      inputs.forEach((input) => {
        if (input && input.startsWith("mutable ")) {
          placeholders.push({
            key: `$${id++}`,
            ph: `__OJS_DOLLAR_${placeholders.length}__`,
            value: input,
            mutable: true
          });
        } else if (
          input &&
          (input.startsWith("viewof ") || input === "@variable")
        ) {
          placeholders.push({
            key: `$${id++}`,
            ph: `__OJS_DOLLAR_${placeholders.length}__`,
            value: input,
            mutable: false
          });
        }
      });
    }
    const byKey = new Map(placeholders.map((p) => [p.key, p]));
    const renameDollarIdentifiers = (node) => {
      if (!node || typeof node !== "object") return;
      if (node.type === "Identifier") {
        const p = byKey.get(node.name);
        if (p) node.name = p.ph;
        return;
      }
      for (const k in node) {
        if (k === "loc" || k === "range") continue;
        const c = node[k];
        if (Array.isArray(c)) c.forEach(renameDollarIdentifiers);
        else if (c && typeof c === "object" && c.type)
          renameDollarIdentifiers(c);
      }
    };
    renameDollarIdentifiers(body);
    let expression = "";
    if (
      body.type === "BlockStatement" &&
      body.body.length === 1 &&
      body.body[0].type === "ReturnStatement" &&
      comments.length === 0
    ) {
      if (wrappedCode[body.body[0].argument.start] === "{") {
        expression = `(${escodegen.generate(
          body.body[0].argument,
          escodegenOptions
        )})`;
      } else {
        expression = escodegen.generate(
          body.body[0].argument,
          escodegenOptions
        );
      }
    } else {
      expression = escodegen.generate(body, escodegenOptions);
    }
    let source = `${varName ? `${prefix}${varName} = ` : ""}${expression}`;
    // Substitute placeholders back to Observable-flavored names. Placeholders are
    // unique tokens we just inserted, so this string-level substitution is safe.
    for (const p of placeholders) {
      if (p.mutable) {
        source = source.replaceAll(`${p.ph}.value`, p.value);
      } else {
        source = source.replaceAll(p.ph, p.value);
      }
    }
    // Restore any unconsumed placeholders (bare $N reference to a mutable input).
    for (const p of placeholders) {
      if (p.mutable) source = source.replaceAll(p.ph, p.key);
    }
    // Fix underscore-encoded viewof/mutable parameter names (lopecode compiled form)
    inputs.forEach((input, i) => {
      if (
        input &&
        (input.startsWith("viewof ") || input.startsWith("mutable "))
      ) {
        const underscoreForm = input.replace(" ", "_");
        if (params[i] === underscoreForm) {
          source = source.replaceAll(underscoreForm, input);
        }
      }
    });
    return source;
  };
};
const _1pvis67 = function _85(md){return(
md`### \`extractModuleInfo\` 
static analysis of module imports`
)};
const _183j58u = function _extractModuleInfo(){return(
function extractModuleInfo(str) {
  const named = /@([^/]+)\/([^.]+)\.js\?v=\d+(?:&resolutions=[^@]+@(\d+))?/;
  const matchNamed = str.match(named);

  if (matchNamed) {
    const namespace = matchNamed[1];
    const notebook = matchNamed[2];
    const version = matchNamed[3];
    return { namespace, notebook, version };
  }
  const id = /\/?d\/([^@]+)@?(\d+)/;
  const matchId = str.match(id);

  if (matchId) {
    const notebook = matchId[1];
    const version = matchId[2];
    return { id: notebook, version };
  }

  const lopebook = /"@([^/]+)\/([^"]+)"/;
  const lopebookId = str.match(lopebook);

  if (lopebookId) {
    const namespace = lopebookId[1];
    const notebook = lopebookId[2];
    return { namespace, notebook };
  }

  return {};
}
)};
const _w445v0 = function _test_extractModuleInfo_notebook_resolution(expect,extractModuleInfo)
{
  expect(
    extractModuleInfo(
      'async () => runtime.module((await import("/@tomlarkworthy/whisper-input.js?v=4&resolutions=03dda470c56b93ff@4883")).default)'
    )
  ).toEqual({
    namespace: "tomlarkworthy",
    notebook: "whisper-input",
    version: "4883"
  });
  return "ok";
};
const _uzqj4w = function _test_extractModuleInfo_id_version_resolution(expect,extractModuleInfo)
{
  expect(
    extractModuleInfo(
      'async () => runtime.module((await import("/d/c2dae147641e012a@46.js?v=4&resolutions=03dda470c56b93ff@4883")).default)'
    )
  ).toEqual({ id: "c2dae147641e012a", version: "46" });
  return "ok";
};
const _1sruec2 = function _test_extractModuleInfo_id_version(expect,extractModuleInfo)
{
  expect(
    extractModuleInfo(
      'async () => runtime.module((await import("d/58f3eb7334551ae6@215")).default)'
    )
  ).toEqual({ id: "58f3eb7334551ae6", version: "215" });
  return "ok";
};
const _ipn8zp = function _test_extractModuleInfo_test_4(expect,extractModuleInfo)
{
  expect(
    extractModuleInfo(
      'await import("https://api.observablehq.com/@tomlarkworthy/observable-notes.js?v=4"'
    )
  ).toEqual({
    namespace: "tomlarkworthy",
    notebook: "observable-notes"
  });
  return "ok";
};
const _iigmyv = function _test_extractModuleInfo_alias_hack(expect,extractModuleInfo)
{
  expect(
    extractModuleInfo(
      'async () => "@tom/blank" && runtime.module((await import("blob:https://tomlarkworthy.static.observableusercontent.com/4cdeb9db-e473-436b-b343-95abd7e4c16f")).default)'
    )
  ).toEqual({
    namespace: "tom",
    notebook: "blank"
  });
  return "ok";
};
const _1tggbee = function _92(md){return(
md`### \`findModuleName\` and \`findImportedName\``
)};
const _kiaw33 = function _import_ast_example(parser){return(
parser.parseCell(
  'import {runtime, viewof main as foo} from "@mootari/access-runtime"'
)
)};
const _1n7gw17 = function _findModuleName(extractModuleInfo) {
    return (scope, module, {
        unknown_id = Math.random()
    } = {}) => {
        try {
            const scopedVariables = [...scope.values()];
            const candidates = scopedVariables.filter(v => v && v._value === module && typeof v._name === 'string' && v._name.startsWith('module ') && !v._name.startsWith('module <unknown'));
            const pickBestInfo = dfn => {
                const s = String(dfn ?? '');
                const m = s.match(/\bimport(?:Shim)?\(\s*(["'`])((?:\\.|(?!\1)[\s\S])*)\1/);
                const firstArg = m?.[2];
                const info1 = firstArg ? extractModuleInfo(firstArg) : {};
                if (info1?.id || info1?.notebook)
                    return info1;
                return extractModuleInfo(s);
            };
            for (const v of candidates) {
                const info = pickBestInfo(v._definition?.toString?.());
                if (info?.namespace)
                    return `@${ info.namespace }/${ info.notebook }`;
                if (info?.id)
                    return `d/${ info.id }@${ info.version }`;
            }
            const any = scopedVariables.find(v => v && v._value === module);
            if (any) {
                const info = pickBestInfo(any._definition?.toString?.());
                if (info?.namespace)
                    return `@${ info.namespace }/${ info.notebook }`;
                if (info?.id)
                    return `d/${ info.id }@${ info.version }`;
            }
            return `<unknown ${ unknown_id }>`;
        } catch (e) {
            debugger;
            return 'error';
        }
    };
};
const _i47chb = function _findImportedName(){return(
async (v) => {
  if (v._inputs.length == 1 && v._inputs[0]._name === "@variable") {
    // import in a live-notebook hides the alias in a closure
    let capture;
    await v._definition({ import: (...args) => (capture = args) });
    return capture[0];
  }
  if (v._inputs.length == 1) {
    return v._inputs[0]._name;
  }
  const regex = /v\.import\("([^"]+)",\s*"([^"]+)"/;
  const match = v._definition.toString().match(regex);
  if (match) {
    // Handle two cases (two arguments)
    return match[1];
  }
  return v._name;
}
)};
const _1effqg = function _96(md){return(
md`### \`decompileImport\``
)};
const _b7vai6 = function _decompileImport(findModuleName,findImportedName)
{
  return async function decompileImport(variables, options = {}) {
    if (!variables || variables.length === 0)
      throw new Error('no variables');
    // An import-cell group is `[module @X stitch, ...aliases]`. Each alias goes
    // through three lifecycle stages (documented in observable-runtime-v6's
    // `importedModule` helper, lines ~1992-2049 of @tomlarkworthy/observable-runtime-v6):
    //
    //   Stage A — post-observation:
    //     `_inputs = [Variable in source module]` (length 1, cross-module).
    //     The Observable runtime rewrites _inputs after the alias is observed
    //     and resolved against the source module.
    //
    //   Stage B — pre-observation, API-loaded (canonical compiled-bundle shape):
    //     `_inputs = [Variable("module @X"), Variable("@variable")]` (length 2,
    //     both in the importer module). What `runtime.define("name",
    //     ["module @X", "@variable"], (_, v) => v.import("name", _))` produces.
    //     Also what `compile_and_update` outputs for freshly-defined user-typed
    //     imports until they're observed.
    //
    //   Stage C — pre-observation, inline live-notebook:
    //     `_inputs = [Variable("@variable")]` (length 1) AND the definition
    //     calls `import(...)` inside. We extract the imported module reference
    //     by invoking the definition with a stub `import` capture.
    //
    // Detection order is post→pre because Stage A is unambiguous when present.
    const isStageA = v => {
      const inputs = v?._inputs;
      if (!Array.isArray(inputs) || inputs.length !== 1)
        return false;
      const i0 = inputs[0];
      return !!(i0 && typeof i0 === 'object' && v._module && i0._module && v._module !== i0._module);
    };
    const isStageB = v => {
      const inputs = v?._inputs;
      if (!Array.isArray(inputs) || inputs.length !== 2)
        return false;
      const [i0, i1] = inputs;
      return !!(i0 && typeof i0 === 'object' && typeof i0._name === 'string' && i0._name.startsWith('module @') && i1 && typeof i1 === 'object' && i1._name === '@variable');
    };
    const isStageC = v => {
      const inputs = v?._inputs;
      if (!Array.isArray(inputs) || inputs.length !== 1)
        return false;
      const i0 = inputs[0];
      return !!(i0 && typeof i0 === 'object' && i0._name === '@variable' && typeof v._definition !== 'undefined' && String(v._definition).includes('import('));
    };
    let v0, module_name, stage;
    if (v0 = variables.find(isStageA)) {
      stage = 'A';
      module_name = findModuleName(v0._module._scope, v0._inputs[0]._module);
    } else if (v0 = variables.find(isStageB)) {
      stage = 'B';
      module_name = v0._inputs[0]._name.replace(/^module /, '');
    } else if (v0 = variables.find(isStageC)) {
      stage = 'C';
      let capturedModule;
      try {
        await v0._definition({
          import: (...args) => {
            capturedModule = args[args.length - 1];
          }
        });
      } catch (e) {
      }
      if (capturedModule && v0._module?._scope) {
        module_name = findModuleName(v0._module._scope, capturedModule);
      }
    } else {
      return null;
    }
    if (module_name == null)
      throw new Error('module name could not be resolved');
    // Skip runtime-internal `module @foo` stitch variables — they belong to
    // the import group but are not user-facing specifiers. Without this filter, an
    // import group renders as `import {Range, module @foo} from "@foo"`.
    const specifiers = await Promise.all(variables.filter(v => typeof v?._name !== 'string' || !v._name.startsWith('module ')).map(async (v, index) => {
      const imported = await findImportedName(v);
      const local = v._name;
      return {
        imported,
        local,
        alias: imported !== local,
        meta: { index }
      };
    }));
    return {
      type: 'import',
      from: module_name,
      specifiers,
      meta: {
        detection: { stage },
        variables: variables.map(v => v?._name ?? null)
      }
    };
  };
};
const _1sylz7j = function _formatImportDeclaration(){return(
function formatImportDeclaration(importInfo) {
  if (!importInfo || importInfo.type !== "import")
    throw new Error("not an importInfo object");
  const specifiers = (importInfo.specifiers || []).map((s) =>
    s.imported === s.local ? s.local : `${s.imported} as ${s.local}`
  );
  return `import {${specifiers.join(", ")}} from "${importInfo.from}"`;
}
)};
const _13dctdn = async function _test_decompileImport_basic(importFake,decompileImport,expect)
{
  const v = await importFake(
    { _name: "dep", _definition: "function Yn(e){return e}", _inputs: ["dep"] },
    "@tomlarkworthy/dependancy"
  );
  const info = await decompileImport([v]);

  const simplified = {
    type: info.type,
    from: info.from,
    specifiers: info.specifiers.map((s) => ({
      imported: s.imported,
      local: s.local,
      alias: s.alias,
      meta: { index: s.meta.index }
    }))
  };

  expect(simplified).toEqual({
    type: "import",
    from: "@tomlarkworthy/dependancy",
    specifiers: [
      { imported: "dep", local: "dep", alias: false, meta: { index: 0 } }
    ]
  });

  return "ok";
};
const _ujr0xn = async function _test_formatImportDeclaration_roundtrip(importFake,decompileImport,expect,formatImportDeclaration,decompile)
{
  const vars = [
    await importFake(
      {
        _name: "dep",
        _definition: "function Yn(e){return e}",
        _inputs: ["dep"]
      },
      "@tomlarkworthy/dependancy"
    )
  ];
  const info = await decompileImport(vars);
  expect(formatImportDeclaration(info)).toEqual(await decompile(vars));
  return "ok";
};
const _1u6sfri = async function _test_decompileImport_alias(importFake,decompileImport,expect,formatImportDeclaration)
{
  const v = await importFake(
    {
      _name: "alias",
      _definition: "function Yn(e){return e}",
      _inputs: ["dep"]
    },
    "@tomlarkworthy/dependancy"
  );
  const info = await decompileImport([v]);

  expect(info.specifiers[0].alias).toEqual(true);
  expect(formatImportDeclaration(info)).toEqual(
    `import {dep as alias} from "@tomlarkworthy/dependancy"`
  );

  return "ok";
};
const _1lqhutp = function _102(md){return(
md`## Javascript Source Normalization`
)};
const _ikzxev = function _normalizeJavascriptSource(acorn,escodegen){return(
(source) => {
  var comments = [];
  var tokens = [];

  var ast = acorn.parse(source, {
    ranges: true,
    onComment: comments,
    onToken: tokens
  });

  escodegen.attachComments(ast, comments, tokens);
  return escodegen.generate(ast, {
    comment: true
  });
}
)};
const _az8lo6 = function _normalizeVariables(variableToObject,normalizeJavascriptSource){return(
(variables) =>
  variables.map(variableToObject).map((v) => ({
    ...v,
    _definition: normalizeJavascriptSource(v._definition)
  }))
)};
const _3knb9v = function _variableToObject(){return(
(v) => ({
  _name: v._name,
  _definition: v._definition.toString(),
  _inputs: v._inputs.map((v) => v._name || v)
})
)};
const _263fcv = function _106(md){return(
md`## Observable Source Normalization`
)};
const _7zpsl9 = function _normalizeObservableSourceSelector(Inputs,notebook_semantics_source){return(
Inputs.select(
  notebook_semantics_source.map((s) => s.value),
  { label: "test case", value: "1" }
)
)};
const _1ex8kus = (G, _) => G.input(_);
const _17petbz = function _108(normalizeObservableSource,normalizeObservableSourceSelector){return(
normalizeObservableSource(normalizeObservableSourceSelector)
)};
const _b2d0zc = function _parsed(parser,normalizeObservableSourceSelector){return(
parser.parseCell(normalizeObservableSourceSelector)
)};
const _qtgjo9 = function _generate(escodegen){return(
function generate(node, source) {
  if (node.type == "Cell") {
    if (
      node.body.type != "BlockStatement" &&
      source &&
      source[node.body.start] == "{"
    ) {
      return `${node.id ? `${generate(node.id)} = ` : ""}(${escodegen.generate(
        node.body
      )})`;
    } else {
      return `${node.id ? `${generate(node.id)} = ` : ""}${escodegen.generate(
        node.body
      )}`;
    }
  } else if (node.type == "Identifier") {
    return escodegen.generate(node);
  } else if (node.type == "ViewExpression") {
  } else {
    throw node.type;
  }
}
)};
const _104j23i = function _normalizeObservableSource(parser,generate){return(
{
  prompt:
    'I see some of the test are failing because the AST generator uses a different set of quotes than the original source and various formatting quirks. This should not count as failure. I would suggest normalizing. Its not super easy because source code is not vanilla JS, we need to normalize just the bit after the block expression, and replace the "viewof XX" and "mutable XXX" macros with a placeholder whic we can normalize and then undo. Write the normalizeObservableSource.',
  time: 1729097489369
} &&
  function normalizeObservableSource(source) {
    // Replace viewof and mutable with placeholders
    const viewofRegex = /viewof\s+([a-zA-Z_][a-zA-Z0-9_]*)/g;
    const mutableRegex = /mutable\s+([a-zA-Z_][a-zA-Z0-9_]*)/g;

    // Temporary placeholders
    const VIEWOF_PLACEHOLDER = "__VIEWOF_PLACEHOLDER__";
    const MUTABLE_PLACEHOLDER = "__MUTABLE_PLACEHOLDER__";

    // Maps to store original names
    const viewOfMap = new Map();
    const mutableMap = new Map();

    // Replace viewof XX with placeholder and store mapping
    source = source.replace(viewofRegex, (match, p1) => {
      const placeholder = `${VIEWOF_PLACEHOLDER}_${p1}`;
      viewOfMap.set(placeholder, p1);
      return placeholder;
    });

    // Replace mutable XXX with placeholder and store mapping
    source = source.replace(mutableRegex, (match, p1) => {
      const placeholder = `${MUTABLE_PLACEHOLDER}_${p1}`;
      mutableMap.set(placeholder, p1);
      return placeholder;
    });

    // Normalize quotes: convert all to single quotes
    const comments = [],
      tokens = [];
    const cell = parser.parseCell(source, {
      ranges: true,
      onComment: comments,
      onToken: tokens
    });
    

    source = generate(cell, source);

    // Restore original viewof and mutable identifiers
    viewOfMap.forEach((original, placeholder) => {
      source = source.replaceAll(placeholder, `viewof ${original}`);
    });

    mutableMap.forEach((original, placeholder) => {
      source = source.replaceAll(placeholder, `mutable ${original}`);
    });

    return source;
  }
)};
const _vle3wv = function _112(md){return(
md`## The Compiler

`
)};
const _10ofthe = function _test_async_interpolation(compile){return(
eval(
  "let _fn = " +
    compile("md`${await FileAttachment('image@1.png').url() }`")[0]._definition
)
)};
const _1gb7c3c = async function _test_compile_syntax_error_viewof(compile,expect)
{
  const compiled = await compile(`viewof bar = () => return ""`);
  expect(compiled.length).toEqual(1);
  expect(compiled[0]._name).toEqual("viewof bar");
  return "ok";
};
const _69vyub = async function _test_compile_syntax_error_anonymous(compile,expect)
{
  const compiled = await compile(`() => return ""`);
  expect(compiled.length).toEqual(1);
  expect(compiled[0]._name).toEqual(null);
  expect(compiled[0]._inputs).toEqual([]);
  let fn;
  eval("fn = " + compiled[0]._definition);
  let threw = false;
  try {
    fn();
  } catch (e) {
    threw = true;
    expect(e instanceof SyntaxError).toEqual(true);
    expect(e._sourceExpression).toEqual(`() => return ""`);
  }
  expect(threw).toEqual(true);
  return "ok";
};
const _1c9p3om = async function _test_compile_syntax_error_named(compile,expect)
{
  const compiled = await compile(`foo = () => return ""`);
  expect(compiled.length).toEqual(1);
  expect(compiled[0]._name).toEqual("foo");
  expect(compiled[0]._inputs).toEqual([]);
  expect(compiled[0]._definition).toMatch(/function _foo\(\)/);
  let fn;
  eval("fn = " + compiled[0]._definition);
  let threw = false;
  try {
    fn();
  } catch (e) {
    threw = true;
    expect(e._sourceExpression).toEqual(`foo = () => return ""`);
  }
  expect(threw).toEqual(true);
  return "ok";
};
const _x7zc8w = async function _test_compile_integer(compile,expect)
{
  const compiled = await compile("1");
  expect(compiled).toEqual([
    {
      _definition: "function _anonymous() {return (1);}",
      _inputs: [],
      _name: null
    }
  ]);
  return "ok";
};
const _1u7hlem = async function _test_compile_string(compile,expect)
{
  const compiled = await compile(`""`);
  expect(compiled).toEqual([
    {
      _name: null,
      _inputs: [],
      _definition: "function _anonymous() {return ('');}"
    }
  ]);
  return "ok";
};
const _151bijp = async function _test_compile_obj_literal(compile,expect)
{
  const compiled = await compile(`obj_literal = ({})`);
  expect(compiled).toEqual([
    {
      _name: "obj_literal",
      _inputs: [],
      _definition: "function _obj_literal() {return ({});}"
    }
  ]);
  return "ok";
};
const _ti9okn = async function _test_compile_assignment(compile,expect)
{
  const compiled = await compile(`x = ""`);
  expect(compiled).toEqual([
    {
      _name: "x",
      _inputs: [],
      _definition: "function _x() {return ('');}"
    }
  ]);
  return "ok";
};
const _1eb8vq = async function _test_compile_dependancy(compile,expect)
{
  const compiled = await compile(`y = x`);
  expect(compiled).toEqual([
    {
      _name: "y",
      _inputs: ["x"],
      _definition: "function _y(x) {return (x);}"
    }
  ]);
  return "ok";
};
const _acs4l0 = async function _test_compile_block_dependancy(compile,expect)
{
  const compiled = await compile(`z = {
  ("");
  return x + y;
}`);
  expect(compiled).toEqual([
    {
      _name: "z",
      _inputs: ["x", "y"],
      _definition: "function _z(x,y) {\n    '';\n    return x + y;\n}"
    }
  ]);
  return "ok";
};
const _125ljg9 = async function _test_compile_comments(compile,expect)
{
  const compiled = await compile(`comments = {
  // a comment
  return "";
}`);
  expect(compiled).toEqual([
    {
      _name: "comments",
      _inputs: [],
      _definition: "function _comments() {\n    // a comment\n    return '';\n}"
    }
  ]);
  return "ok";
};
const _li37je = async function _test_compile_generator(compile,expect)
{
  const compiled = await compile(`generator = {
  yield x + y;
}`);
  expect(compiled).toEqual([
    {
      _name: "generator",
      _inputs: ["x", "y"],
      _definition: "function* _generator(x,y) {\n    yield x + y;\n}"
    }
  ]);
  return "ok";
};
const _em4em6 = async function _test_compile_function(compile,expect)
{
  const compiled = await compile(`_function = function () {}`);
  expect(compiled).toEqual([
    {
      _name: "_function",
      _inputs: [],
      _definition: "function __function() {return (function () {\n});}"
    }
  ]);
  return "ok";
};
const _w3atfb = async function _test_compile_async_function(compile,expect)
{
  const compiled = await compile(`asyncfunction = async function () {}`);
  expect(compiled).toEqual([
    {
      _name: "asyncfunction",
      _inputs: [],
      _definition:
        "function _asyncfunction() {return (async function () {\n});}"
    }
  ]);
  return "ok";
};
const _14gl6yr = async function _test_compile_named_function(compile,expect)
{
  const compiled = await compile(`named_function = function foo() {}`);
  expect(compiled).toEqual([
    {
      _name: "named_function",
      _inputs: [],
      _definition: "function _named_function() {return (function foo() {\n});}"
    }
  ]);
  return "ok";
};
const _z3bqb8 = async function _test_compile_this_reference(compile,expect)
{
  const compiled = await compile(`thisReference = (this || 0) + 1`);
  expect(compiled).toEqual([
    {
      _name: "thisReference",
      _inputs: [],
      _definition: "function _thisReference() {return ((this || 0) + 1);}"
    }
  ]);
  return "ok";
};
const _1sou7t0 = async function _test_compile_lambda(compile,expect)
{
  const compiled = await compile(`lambda = () => {}`);
  expect(compiled).toEqual([
    {
      _name: "lambda",
      _inputs: [],
      _definition: "function _lambda() {return (() => {\n});}"
    }
  ]);
  return "ok";
};
const _1o1u737 = async function _test_compile_error(compile,expect)
{
  const compiled = await compile(`error = {
  throw new Error();
}`);
  expect(compiled).toEqual([
    {
      _name: "error",
      _inputs: [],
      _definition: "function _error() {\n    throw new Error();\n}"
    }
  ]);
  return "ok";
};
const _y271kb = async function _test_compile_viewof(compile,expect)
{
    const compiled = await compile(`viewof view = Inputs.input()`);
    expect(compiled).toEqual([
        {
            _name: 'viewof view',
            _inputs: ['Inputs'],
            _definition: 'function _view(Inputs) {return (Inputs.input());}'
        },
        {
            _name: 'view',
            _inputs: [
                'Generators',
                'viewof view'
            ],
            _definition: '(G, _) => G.input(_)'
        }
    ]);
    return 'ok';
};
const _1q4asyp = function _test_compile_viewof_and_value_coexist(compile,expect)
{
  const compiled = compile(`({
    treeView: viewof growParameters,
    tree: growParameters
})`);
  expect(compiled).toEqual([
    {
      _name: null,
      _inputs: ["viewof growParameters", "growParameters"],
      _definition:
        "function _anonymous($0,growParameters) {return ({\n    treeView: $0,\n    tree: growParameters\n});}"
    }
  ]);
  return "ok";
};
const _189jvkd = async function _test_compile_mutable(compile,expect)
{
    const compiled = await compile(`mutable q = 6`);
    expect(compiled).toEqual([
        {
            _name: 'initial q',
            _inputs: [],
            _definition: 'function _q() {return (6);}'
        },
        {
            _name: 'mutable q',
            _inputs: [
                'Mutable',
                'initial q'
            ],
            _definition: '(M, _) => new M(_)'
        },
        {
            _name: 'q',
            _inputs: ['mutable q'],
            _definition: '_ => _.generator'
        }
    ]);
    return 'ok';
};
const _78egw8 = async function _test_compile_builtin(compile,expect)
{
  const compiled = await compile(`inbuilt = _`);
  expect(compiled).toEqual([
    {
      _name: "inbuilt",
      _inputs: ["_"],
      _definition: "function _inbuilt(_) {return (_);}"
    }
  ]);
  return "ok";
};
const _lflzev = async function _test_compile_fileattachment(compile,expect)
{
  const compiled = await compile(`file = FileAttachment("empty")`);
  expect(compiled).toEqual([
    {
      _name: "file",
      _inputs: ["FileAttachment"],
      _definition:
        "function _file(FileAttachment) {return (FileAttachment('empty'));}"
    }
  ]);
  return "ok";
};
const _1e555b1 = async function _test_compile_mutable_dep(compile,expect)
{
  const compiled = await compile(`mutable_dep = {
  viewof view;
  lambda;
  mutable q;
  return mutable q;
}`);
  expect(compiled).toEqual([
    {
      _name: "mutable_dep",
      _inputs: ["viewof view", "lambda", "mutable q"],
      _definition:
        "function _mutable_dep($0,lambda,$1) {\n    $0;\n    lambda;\n    $1.value;\n    return $1.value;\n}"
    }
  ]);
  return "ok";
};
const _1a2af6 = async function _test_compile_mutable_dep2(compile,expect)
{
  const compiled = await compile(`mutable_dep_2 = {
  file;
  return q + 1;
}`);
  expect(compiled).toEqual([
    {
      _name: "mutable_dep_2",
      _inputs: ["file", "q"],
      _definition:
        "function _mutable_dep_2(file,q) {\n    file;\n    return q + 1;\n}"
    }
  ]);
  return "ok";
};
const _ql80wk = async function _test_compile_inline_viewof(compile,expect)
{
  const compiled = await compile(`viewofdep_inline = viewof view`);
  expect(compiled).toEqual([
    {
      _name: "viewofdep_inline",
      _inputs: ["viewof view"],
      _definition: "function _viewofdep_inline($0) {return ($0);}"
    }
  ]);
  return "ok";
};
const _1k420gu = async function _test_compile_view_dep(compile,expect)
{
  const compiled = await compile(`viewofdatadep = view`);
  expect(compiled).toEqual([
    {
      _name: "viewofdatadep",
      _inputs: ["view"],
      _definition: "function _viewofdatadep(view) {return (view);}"
    }
  ]);
  return "ok";
};
const _1y1h47u = async function _test_compile_dep(compile,expect)
{
  const compiled = await compile(`dep`);
  expect(compiled).toEqual([
    {
      _name: null,
      _inputs: ["dep"],
      _definition: "function _anonymous(dep) {return (dep);}"
    }
  ]);
  return "ok";
};
const _kwdsyz = async function _test_compile_class(compile,expect)
{
  const compiled = await compile(`v = class {}`);
  expect(compiled).toEqual([
    {
      _name: "v",
      _inputs: [],
      _definition: `function _v() {return (class {\n});}`
    }
  ]);
  return "ok";
};
const _33oop5 = async function _test_compile_event(compile,expect)
{
  const compiled = await compile(`event = new Event('input')`);
  expect(compiled).toEqual([
    {
      _name: "event",
      _inputs: ["Event"],
      _definition: `function _event(Event) {return (new Event('input'));}`
    }
  ]);
  return "ok";
};
const _9phvzk = async function _test_compile_tagged_literal(compile,expect)
{
  const compiled = await compile(`htl.html\`hi\``);
  expect(compiled).toEqual([
    {
      _name: null,
      _inputs: ["htl"],
      _definition: `function _anonymous(htl) {return (htl.html\`hi\`);}`
    }
  ]);
  return "ok";
};
const _1q0pie3 = function _compile_unit_test_template(Inputs,test_case,compiled){return(
Inputs.textarea({
  value: `test_compile_ = {
  const compiled = await compile(\`${test_case.value}\`);
  expect(compiled).toEqual(${JSON.stringify(compiled, null, 2)});
  return "ok";
}`,
  disabled: true,
  rows: 20,
  label: "compile test template"
})
)};
const _1lmax86 = async function _test_compile_import_plain_single(compile,expect)
{
  const compiled = await compile(
    `import {dep} from "@tomlarkworthy/dependancy";`
  );
  expect(compiled).toEqual([
    {
      _name: "module @tomlarkworthy/dependancy",
      _inputs: [],
      _definition: `async () => runtime.module((await import("@tomlarkworthy/dependancy")).default)`
    },
    {
      _name: "dep",
      _inputs: ["module @tomlarkworthy/dependancy", "@variable"],
      _definition: `(_, v) => v.import("dep", _)`
    }
  ]);
  return "ok";
};
const _17sgzdm = async function _test_compile_import_view_data_alias_single(compile,expect)
{
  const compiled = await compile(
    `import {viewdep as aslias_viewdep_data} from "@tomlarkworthy/dependancy";`
  );
  expect(compiled).toEqual([
    {
      _name: "module @tomlarkworthy/dependancy",
      _inputs: [],
      _definition: `async () => runtime.module((await import("@tomlarkworthy/dependancy")).default)`
    },
    {
      _name: "aslias_viewdep_data",
      _inputs: ["module @tomlarkworthy/dependancy", "@variable"],
      _definition: `(_, v) => v.import("viewdep", "aslias_viewdep_data", _)`
    }
  ]);
  return "ok";
};
const _1tqj4tp = async function _test_compile_import_mutable_data_alias_single(compile,expect)
{
  const compiled = await compile(
    `import {mutabledep as aslias_mutabledep_data} from "@tomlarkworthy/dependancy";`
  );
  expect(compiled).toEqual([
    {
      _name: "module @tomlarkworthy/dependancy",
      _inputs: [],
      _definition: `async () => runtime.module((await import("@tomlarkworthy/dependancy")).default)`
    },
    {
      _name: "aslias_mutabledep_data",
      _inputs: ["module @tomlarkworthy/dependancy", "@variable"],
      _definition: `(_, v) => v.import("mutabledep", "aslias_mutabledep_data", _)`
    }
  ]);
  return "ok";
};
const _hv0te2 = async function _test_compile_import_mutable_single(compile,expect)
{
  const compiled = await compile(
    `import {mutable mutabledep} from "@tomlarkworthy/dependancy";`
  );
  expect(compiled).toEqual([
    {
      _name: "module @tomlarkworthy/dependancy",
      _inputs: [],
      _definition: `async () => runtime.module((await import("@tomlarkworthy/dependancy")).default)`
    },
    {
      _name: "mutable mutabledep",
      _inputs: ["module @tomlarkworthy/dependancy", "@variable"],
      _definition: `(_, v) => v.import("mutable mutabledep", _)`
    }
  ]);
  return "ok";
};
const _1mltqmr = async function _test_compile_import_viewof_single(compile,expect)
{
  const compiled = await compile(
    `import {viewof viewdep} from "@tomlarkworthy/dependancy";`
  );
  expect(compiled).toEqual([
    {
      _name: "module @tomlarkworthy/dependancy",
      _inputs: [],
      _definition: `async () => runtime.module((await import("@tomlarkworthy/dependancy")).default)`
    },
    {
      _name: "viewof viewdep",
      _inputs: ["module @tomlarkworthy/dependancy", "@variable"],
      _definition: `(_, v) => v.import("viewof viewdep", _)`
    }
  ]);
  return "ok";
};
const _1d18obr = async function _test_compile_import_alias_single(compile,expect)
{
  const compiled = await compile(
    `import {dep as dep_alias} from "@tomlarkworthy/dependancy";`
  );
  expect(compiled).toEqual([
    {
      _name: "module @tomlarkworthy/dependancy",
      _inputs: [],
      _definition: `async () => runtime.module((await import("@tomlarkworthy/dependancy")).default)`
    },
    {
      _name: "dep_alias",
      _inputs: ["module @tomlarkworthy/dependancy", "@variable"],
      _definition: `(_, v) => v.import("dep", "dep_alias", _)`
    }
  ]);
  return "ok";
};
const _1b5ghef = async function _test_compile_import_notebook(compile,expect)
{
  const compiled = await compile(
    `import {escodegen} from "@tomlarkworthy/escodegen"`
  );
  expect(compiled).toEqual([
    {
      _name: `module @tomlarkworthy/escodegen`,
      _inputs: [],
      _definition:
        'async () => runtime.module((await import("@tomlarkworthy/escodegen")).default)'
    },
    {
      _name: `escodegen`,
      _inputs: ["module @tomlarkworthy/escodegen", "@variable"],
      _definition: '(_, v) => v.import("escodegen", _)'
    }
  ]);
  return "ok";
};
const _1nps9cr = function _test_case(Inputs,notebook_semantics_source){return(
Inputs.select(
  notebook_semantics_source.filter((s) => s.mode == "js"),
  {
    label: "compilation test case",
    format: (v) => v.value
  }
)
)};
const _1e5ax6f = (G, _) => G.input(_);
const _18e5b93 = function _153(test_case){return(
test_case.value
)};
const _16q6oyc = async function _compiled(compile,test_case){return(
await compile(test_case.value)
)};
const _1191170 = function _155(parser,test_case)
{
  const comments = [];
  const tokens = [];
  const ast = parser.parseCell(test_case.value, {
    ranges: true,
    onComment: comments,
    onToken: tokens
  });

  return {
    ast,
    comments,
    tokens
  };
};
const _1gh543z = function _compiled_selector(Inputs,compiled){return(
Inputs.radio(compiled, {
  format: (v) => v._name,
  value: compiled[0]
})
)};
const _1dmmuaf = (G, _) => G.input(_);
const _1klx74n = function _157(compiled_selector,normalizeJavascriptSource){return(
JSON.stringify(
  {
    ...compiled_selector,
    _definition: normalizeJavascriptSource(compiled_selector._definition)
  },
  null,
  2
)
)};
const _eom91x = function _158(compile,test_case){return(
compile(test_case.value)
)};
const _ttos3c = function _compile(parser,observableToJs){return(
function compile(source, {
  anonymousName = '_anonymous'
} = {}) {
  const comments = [], tokens = [];
  let cell;
  try {
    cell = parser.parseCell(source, {
      ranges: true,
      onComment: comments,
      onToken: tokens
    });
  } catch (e) {
    if (e instanceof SyntaxError) {
      const nameMatch = source.match(/^\s*(?:(viewof|mutable)\s+)?([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=/);
      let _name = null;
      let funcName = anonymousName;
      if (nameMatch) {
        const prefix = nameMatch[1] ? nameMatch[1] + ' ' : '';
        _name = prefix + nameMatch[2];
        funcName = '_' + nameMatch[2];
      }
      const escapedMsg = JSON.stringify(e.message);
      const escapedSource = JSON.stringify(source);
      return [{
          _name,
          _inputs: [],
          _definition: `function ${ funcName }() { throw Object.assign(new SyntaxError(${ escapedMsg }), {_sourceExpression: ${ escapedSource }}); }`
        }];
    }
    throw e;
  }
  if (!cell)
    throw new Error('Unable to parse cell');
  const parseImportSpecifierText = text => {
    const t = String(text ?? '').trim().replace(/,$/, '').trim();
    if (!t)
      throw new Error('Empty import specifier');
    const parts = t.split(/\s+as\s+/);
    const left = parts[0].trim();
    const right = parts[1]?.trim();
    const parseSide = (side, {
      defaultPrefix = ''
    } = {}) => {
      const s = String(side ?? '').trim();
      const m = s.match(/^(viewof|mutable)\s+(.+)$/);
      if (m)
        return {
          prefix: `${ m[1] } `,
          name: m[2].trim()
        };
      return {
        prefix: defaultPrefix,
        name: s
      };
    };
    const L = parseSide(left);
    const R = right ? parseSide(right, { defaultPrefix: L.prefix }) : L;
    const importedName = `${ L.prefix }${ L.name }`.trim();
    const localName = `${ R.prefix }${ R.name }`.trim();
    if (!importedName)
      throw new Error(`Could not parse imported name from: ${ t }`);
    if (!localName)
      throw new Error(`Could not parse local name from: ${ t }`);
    return {
      importedName,
      localName
    };
  };
  if (!cell.id && cell.body?.type === 'ImportDeclaration') {
    const module_name = cell.body.source.value;
    const cell_variables = [{
        _name: `module ${ module_name }`,
        _inputs: [],
        _definition: `async () => runtime.module((await import("/${ module_name }.js?v=4")).default)`
      }];
    for (const specifier of cell.body.specifiers ?? []) {
      const specText = typeof specifier?.start === 'number' && typeof specifier?.end === 'number' ? source.slice(specifier.start, specifier.end) : (() => {
        if (specifier?.imported?.name && specifier?.local?.name) {
          return specifier.imported.name === specifier.local.name ? specifier.local.name : `${ specifier.imported.name } as ${ specifier.local.name }`;
        }
        throw new Error('Import specifier missing range information');
      })();
      const {importedName, localName} = parseImportSpecifierText(specText);
      cell_variables.push({
        _name: localName,
        _inputs: [
          `module ${ module_name }`,
          '@variable'
        ],
        _definition: importedName === localName ? `(_, v) => v.import("${ importedName }", _)` : `(_, v) => v.import("${ importedName }", "${ localName }", _)`
      });
    }
    return cell_variables;
  }
  let dollarIdx = 0;
  const inputToArgMap = {};
  const dollarToMacro = {};
  const seen = new Set();
  const inputs = Array.from(cell.references || []).flatMap(i => {
    if (i.name) {
      if (seen.has(i.name))
        return [];
      seen.add(i.name);
      return i.name;
    } else {
      const dedupKey = i.type + ':' + i.id.name;
      if (seen.has(dedupKey))
        return [];
      seen.add(dedupKey);
      const dollarName = '$' + dollarIdx;
      inputToArgMap[i.id.name] = dollarName;
      dollarToMacro[dollarName] = i.type == 'ViewExpression' ? 'viewof ' + i.id.name : 'mutable ' + i.id.name;
      dollarIdx++;
      return dollarName;
    }
  });
  let variables;
  if (cell.id) {
    if (cell.id.type === 'Identifier') {
      variables = [{
          functionName: '_' + cell.id.name,
          name: cell.id.name,
          inputs,
          params: inputs.join(',')
        }];
    } else if (cell.id.type === 'ViewExpression') {
      variables = [
        {
          functionName: '_' + cell.id.id.name,
          name: 'viewof ' + cell.id.id.name,
          inputs,
          params: inputs.join(',')
        },
        {
          functionName: '_' + cell.id.id.name,
          name: cell.id.id.name,
          _definition: '(G, _) => G.input(_)',
          inputs: [
            'Generators',
            'viewof ' + cell.id.id.name
          ],
          params: inputs.join(',')
        }
      ];
    } else if (cell.id.type === 'MutableExpression') {
      variables = [
        {
          functionName: '_' + cell.id.id.name,
          name: 'initial ' + cell.id.id.name,
          inputs,
          params: inputs.join(',')
        },
        {
          functionName: '_' + cell.id.id.name,
          name: 'mutable ' + cell.id.id.name,
          _definition: '(M, _) => new M(_)',
          inputs: [
            'Mutable',
            'initial ' + cell.id.id.name
          ],
          params: inputs.join(',')
        },
        {
          functionName: '_' + cell.id.id.name,
          name: cell.id.id.name,
          _definition: '_ => _.generator',
          inputs: ['mutable ' + cell.id.id.name],
          params: inputs.join(',')
        }
      ];
    } else {
      throw new Error(`Unsupported cell id type: ${ cell.id.type }`);
    }
  } else {
    variables = [{
        functionName: anonymousName,
        name: null,
        inputs,
        params: inputs.join(',')
      }];
  }
  return variables.map(v => {
    let _definition = v._definition;
    if (!_definition) {
      let functionBody;
      if (cell.body.type === 'BlockStatement') {
        functionBody = observableToJs(cell.body, inputToArgMap, comments, tokens);
      } else {
        const bodyCode = observableToJs(cell.body, inputToArgMap, comments, tokens);
        functionBody = `{return (${ bodyCode });}`;
      }
      _definition = `${ cell.async ? 'async ' : '' }function${ cell.generator ? '*' : '' } ${ v.functionName }(${ v.inputs.join(',') }) ${ functionBody }`;
    }
    return {
      _name: v.name,
      _inputs: v.inputs.map(i => dollarToMacro[i] || (i === '$variable' ? '@variable' : i)),
      _definition
    };
  });
}
)};
const _1v1i7wl = function _observableToJs(acorn_walk,parser,escodegen){return(
(ast, inputMap, comments, tokens) => {
  // Replace ViewExpression with their id so they are removed from
  // source and replaced with a JS compatible one
  const offset = 0;
  acorn_walk.ancestor(
    ast,
    {
      ViewExpression(node, ancestors) {
        const reference = "viewof " + node.id.name;
        node.type = "Identifier";
        node.name = inputMap[node.id.name];
      },
      MutableExpression(node, ancestors) {
        const reference = "mutable " + node.id.name;
        node.type = "Identifier";
        // hack as ".value" is not valid identifier, but escodegen allows it
        node.name = inputMap[node.id.name] + ".value";
      }
    },
    parser.walk
  );
  escodegen.attachComments(ast, comments, tokens);
  const js = escodegen.generate(ast, { comment: true });
  return js;
}
)};
const _1ayjluu = function _161(md){return(
md`### Bundled deps`
)};
const _xhj6b8 = function _decompress_url(DecompressionStream,TextDecoderStream,TransformStream,TextEncoderStream,Response){return(
async (attachment, overrides) => {
  let decompressedStream;

  if (!overrides) {
    decompressedStream = (await attachment.stream()).pipeThrough(
      new DecompressionStream("gzip")
    );
  } else {
    decompressedStream = (await attachment.stream())
      .pipeThrough(new DecompressionStream("gzip"))
      .pipeThrough(new TextDecoderStream())
      .pipeThrough(
        new TransformStream({
          transform(chunk, controller) {
            // Rewrite URLs in the text
            let modifiedChunk = chunk;
            Object.entries(overrides).forEach(([override, replacement]) => {
              modifiedChunk = modifiedChunk.replace(override, replacement);
            });
            controller.enqueue(modifiedChunk);
          }
        })
      )
      .pipeThrough(new TextEncoderStream());
  }
  const arrayBuffer = await new Response(decompressedStream).arrayBuffer();

  // Create a Blob from the ArrayBuffer
  const blob = new Blob([arrayBuffer], { type: "application/javascript" });

  return URL.createObjectURL(blob);
}
)};
const _s9w7ha = async function _parser(decompress_url, FileAttachment, acorn_url, acorn_walk_url) {
    return import(await decompress_url(FileAttachment('parser-6.1.0.js.gz'), {
        '/npm/acorn@8.11.3/+esm': acorn_url,
        '/npm/acorn-walk@8.3.2/+esm': acorn_walk_url
    }));
};
const _1hiclbb = function _acorn_walk(acorn_walk_url) {
    return import(acorn_walk_url);
};
const _1cz8oe9 = function _acorn_walk_url(decompress_url,FileAttachment){return(
decompress_url(FileAttachment("acorn-walk-8.3.2.js.gz"))
)};
const _1rc67k0 = function _stageB_importFake()
{
  return // Builds a Stage B (pre-observation, API-loaded) import group as POJOs.
  // Mirrors what `runtime.define("name", ["module @X", "@variable"], (_, v) => v.import("name", _))`
  // produces structurally. Used by the test_decompileImport_stageB_* tests to
  // avoid spinning up a real Observable runtime per case.
  function stageB_importFake(module_name, specifiers) {
    const importerModule = { _scope: new Map() };
    const stitch = {
      _name: `module ${ module_name }`,
      _module: importerModule,
      _inputs: [],
      _definition: `async () => null`
    };
    const atVariable = {
      _name: '@variable',
      _module: importerModule
    };
    const aliases = specifiers.map(s => ({
      _name: s.local,
      _module: importerModule,
      _inputs: [
        stitch,
        atVariable
      ],
      _definition: s.imported === s.local ? `(_, v) => v.import("${ s.imported }", _)` : `(_, v) => v.import("${ s.imported }", "${ s.local }", _)`
    }));
    return [
      stitch,
      ...aliases
    ];
  };
};
const _1d53asg = async function _test_decompileImport_stageB_single(stageB_importFake,decompileImport,expect,formatImportDeclaration)
{
  const vars = stageB_importFake('@tomlarkworthy/visualizer', [{
      imported: 'visualize',
      local: 'visualize'
    }]);
  const info = await decompileImport(vars);
  expect(info.meta.detection.stage).toEqual('B');
  expect(formatImportDeclaration(info)).toEqual(`import {visualize} from "@tomlarkworthy/visualizer"`);
  return 'ok';
};
const _hv5gag = async function _test_decompileImport_stageB_aliased(stageB_importFake,decompileImport,expect,formatImportDeclaration)
{
  const vars = stageB_importFake('@user/y', [{
      imported: 'x',
      local: 'z'
    }]);
  const info = await decompileImport(vars);
  expect(info.meta.detection.stage).toEqual('B');
  expect(info.specifiers[0].alias).toEqual(true);
  expect(formatImportDeclaration(info)).toEqual(`import {x as z} from "@user/y"`);
  return 'ok';
};
const _avc18y = async function _test_decompileImport_stageB_multiple(stageB_importFake,decompileImport,expect,formatImportDeclaration)
{
  const vars = stageB_importFake('@user/y', [
    {
      imported: 'a',
      local: 'a'
    },
    {
      imported: 'b',
      local: 'b'
    },
    {
      imported: 'c',
      local: 'c'
    }
  ]);
  const info = await decompileImport(vars);
  expect(info.meta.detection.stage).toEqual('B');
  expect(formatImportDeclaration(info)).toEqual(`import {a, b, c} from "@user/y"`);
  return 'ok';
};
const _16gia7i = async function _test_decompileImport_stageB_mixed_alias(stageB_importFake,decompileImport,expect,formatImportDeclaration)
{
  const vars = stageB_importFake('@user/y', [
    {
      imported: 'a',
      local: 'a'
    },
    {
      imported: 'b',
      local: 'c'
    }
  ]);
  const info = await decompileImport(vars);
  expect(info.meta.detection.stage).toEqual('B');
  expect(formatImportDeclaration(info)).toEqual(`import {a, b as c} from "@user/y"`);
  return 'ok';
};
const _1slhdwo = async function _test_decompileImport_stageB_viewof(stageB_importFake,decompileImport,expect,formatImportDeclaration)
{
  const vars = stageB_importFake('@tomlarkworthy/module-map', [{
      imported: 'viewof currentModules',
      local: 'viewof currentModules'
    }]);
  const info = await decompileImport(vars);
  expect(info.meta.detection.stage).toEqual('B');
  expect(formatImportDeclaration(info)).toEqual(`import {viewof currentModules} from "@tomlarkworthy/module-map"`);
  return 'ok';
};
const _qwlsf2 = async function _test_decompileImport_stageB_mutable(stageB_importFake,decompileImport,expect,formatImportDeclaration)
{
  const vars = stageB_importFake('@user/y', [{
      imported: 'mutable counter',
      local: 'mutable counter'
    }]);
  const info = await decompileImport(vars);
  expect(info.meta.detection.stage).toEqual('B');
  expect(formatImportDeclaration(info)).toEqual(`import {mutable counter} from "@user/y"`);
  return 'ok';
};
const _sy7jfx = async function _test_decompileImport_returns_null_for_non_import(decompileImport,expect)
{
  // A regular cell — no stitch, no @variable input, no cross-module reference.
  const info = await decompileImport([{
      _name: 'x',
      _module: {},
      _inputs: [],
      _definition: `() => 42`
    }]);
  expect(info).toEqual(null);
  return 'ok';
};
const _rk7ku3 = async function _test_decompileImport_compile_roundtrip_single(compile,expect,stageB_importFake,decompileImport,formatImportDeclaration)
{
  // What `compile()` emits for `import {x} from "@user/y"` is structurally the
  // same as our stageB_importFake fixture (after runtime.define resolves the
  // input name strings to Variable refs). Verify the fixture matches the
  // shape compile() would produce.
  const pojos = compile(`import {visualize, Group} from "@tomlarkworthy/visualizer"`);
  expect(pojos.length).toEqual(3);
  expect(pojos[0]._name).toEqual('module @tomlarkworthy/visualizer');
  expect(pojos[1]._name).toEqual('visualize');
  expect(pojos[2]._name).toEqual('Group');
  expect(pojos[1]._inputs).toEqual([
    'module @tomlarkworthy/visualizer',
    '@variable'
  ]);
  // Now run our fixture through decompileImport — confirms the round-trip
  // shape compile()-output-shape-when-defined → decompileImport produces the
  // canonical import source string.
  const vars = stageB_importFake('@tomlarkworthy/visualizer', [
    {
      imported: 'visualize',
      local: 'visualize'
    },
    {
      imported: 'Group',
      local: 'Group'
    }
  ]);
  const info = await decompileImport(vars);
  expect(formatImportDeclaration(info)).toEqual(`import {visualize, Group} from "@tomlarkworthy/visualizer"`);
  return 'ok';
};
const _xynplo = async function _test_decompileImport_stageB_order_independent(stageB_importFake,decompileImport,expect,formatImportDeclaration)
{
  // The detection uses .find — it shouldn't matter whether the stitch is at
  // index 0 or the aliases come first. Verify by reversing the array.
  const vars = stageB_importFake('@user/y', [
    {
      imported: 'a',
      local: 'a'
    },
    {
      imported: 'b',
      local: 'b'
    }
  ]);
  const reversed = [...vars].reverse();
  const info = await decompileImport(reversed);
  expect(info.meta.detection.stage).toEqual('B');
  expect(formatImportDeclaration(info)).toEqual(`import {a, b} from "@user/y"`);
  return 'ok';
};
const _16fpgac = async function _test_decompileImport_stageB_notebook_id(stageB_importFake,decompileImport,expect,formatImportDeclaration)
{
  // Observable supports `import {x} from "d/<hash>@<version>"` notebook-id form.
  const vars = stageB_importFake('d/57d79353bac56631@44', [{
      imported: 'hash',
      local: 'hash'
    }]);
  const info = await decompileImport(vars);
  expect(info.meta.detection.stage).toEqual('B');
  expect(formatImportDeclaration(info)).toEqual(`import {hash} from "d/57d79353bac56631@44"`);
  return 'ok';
};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };
  const fileAttachments = new Map(["acorn-walk-8.3.2.js.gz","parser-6.1.0.js.gz"].map((name) => {
    const module_name = "@tomlarkworthy/observablejs-toolchain";
    const {status, mime, bytes} = window.lopecode.contentSync(module_name + "/" + encodeURIComponent(name));
    const blob_url = URL.createObjectURL(new Blob([bytes], { type: mime}));
    return [name, {url: blob_url, mimeType: mime}]
  }));
  main.builtin("FileAttachment", runtime.fileAttachments(name => fileAttachments.get(name)));

  main.define("module @tomlarkworthy/tests", async () => runtime.module((await import("/@tomlarkworthy/tests.js?v=4")).default));  
  main.define("module @tomlarkworthy/cell-map", async () => runtime.module((await import("/@tomlarkworthy/cell-map.js?v=4")).default));  
  main.define("module @tomlarkworthy/escodegen", async () => runtime.module((await import("/@tomlarkworthy/escodegen.js?v=4")).default));  
  main.define("module @tomlarkworthy/acorn-8-11-3", async () => runtime.module((await import("/@tomlarkworthy/acorn-8-11-3.js?v=4")).default));  
  main.define("module @tomlarkworthy/jest-expect-standalone", async () => runtime.module((await import("/@tomlarkworthy/jest-expect-standalone.js?v=4")).default));  
  main.define("module @tomlarkworthy/observable-runtime", async () => runtime.module((await import("/@tomlarkworthy/observable-runtime.js?v=4")).default));  
  $def("_lp77pf", null, ["md"], _lp77pf);  
  $def("_n0sc6u", null, ["md"], _n0sc6u);  
  $def("_sgo04r", null, ["md"], _sgo04r);  
  $def("_aivd6y", null, ["md"], _aivd6y);  
  $def("_1q8w8vr", null, ["md"], _1q8w8vr);  
  $def("_d17a1w", null, ["md"], _d17a1w);  
  $def("_1juriue", null, ["md"], _1juriue);  
  main.define("tests", ["module @tomlarkworthy/tests", "@variable"], (_, v) => v.import("tests", _));  
  main.define("viewof runtime_variables", ["module @tomlarkworthy/tests", "@variable"], (_, v) => v.import("viewof runtime_variables", _));  
  main.define("runtime_variables", ["module @tomlarkworthy/tests", "@variable"], (_, v) => v.import("runtime_variables", _));  
  main.define("modules", ["module @tomlarkworthy/tests", "@variable"], (_, v) => v.import("modules", _));  
  $def("_1k5oyj7", null, ["tests"], _1k5oyj7);  
  $def("_1jrpa13", null, ["md"], _1jrpa13);  
  $def("_1lc80et", "cellMaps", ["cellMap"], _1lc80et);  
  $def("_zki07o", "allCells", ["cellMaps"], _zki07o);  
  $def("_1nkhnnd", "all_decompiled", ["allCells","decompile"], _1nkhnnd);  
  $def("_1ip1war", "test_all_cells_decompilable", ["all_decompiled"], _1ip1war);  
  $def("_1w70b75", null, ["md"], _1w70b75);  
  $def("_uscpdn", "all_compiled", ["all_decompiled","compile"], _uscpdn);  
  $def("_x55zzr", "test_decompiled_cells_recompilable", ["all_compiled"], _x55zzr);  
  $def("_100n7xr", null, ["md"], _100n7xr);  
  $def("_1nm57o2", "roundtripped", ["all_compiled","decompile"], _1nm57o2);  
  $def("_18xo2td", "test_all_cells_roundtrippable", ["roundtripped"], _18xo2td);  
  $def("_14nox99", null, ["md"], _14nox99);  
  $def("_1d3zr3i", null, ["md"], _1d3zr3i);  
  $def("_12sqt9", "dependancy_document", [], _12sqt9);  
  $def("_13q8314", "dependancy_source", ["dependancy_document"], _13q8314);  
  $def("_ook1nq", null, ["md"], _ook1nq);  
  $def("_jmn84r", "notebook_semantics_document", [], _jmn84r);  
  $def("_1juj7i6", "notebook_semantics_source", ["notebook_semantics_document","parser"], _1juj7i6);  
  $def("_1oevsow", null, ["md"], _1oevsow);  
  $def("_11lfflk", "notebook_semantics_module", [], _11lfflk);  
  main.define("cellMap", ["module @tomlarkworthy/cell-map", "@variable"], (_, v) => v.import("cellMap", _));  
  main.define("moduleMap", ["module @tomlarkworthy/cell-map", "@variable"], (_, v) => v.import("moduleMap", _));  
  $def("_gjten6", null, ["md"], _gjten6);  
  $def("_n9rco8", null, ["md"], _n9rco8);  
  $def("_eog966", null, ["md"], _eog966);  
  $def("_n4ntwp", null, ["md"], _n4ntwp);  
  $def("_1lg9nnl", "importFake", ["Runtime"], _1lg9nnl);  
  $def("_25tjxa", "test_decompile_syntax_error_roundtrip", ["compile","decompile","expect"], _25tjxa);  
  $def("_1jyrnzq", "test_decompile_$variable", ["decompile","expect"], _1jyrnzq);  
  $def("_1v1d8m3", "test_decompile_import_variable", ["decompile","importFake","expect"], _1v1d8m3);  
  $def("_fiyb80", "test_decompile_dollar_in_string_literal", ["decompile","expect"], _fiyb80);  
  $def("_wgfrtq", "test_decompile_import_variable_alias", ["decompile","importFake","expect"], _wgfrtq);  
  $def("_1a8gnrc", "test_decompile_import_many", ["decompile","importFake","expect"], _1a8gnrc);  
  $def("_7stpu3", "test_decompile_markdown_cell", ["decompile","expect"], _7stpu3);  
  $def("_v4p1js", "test_decompile_constant", ["decompile","expect"], _v4p1js);  
  $def("_pcs4h", "test_decompile_string_literal", ["decompile","expect"], _pcs4h);  
  $def("_a2zh99", "test_decompile_html_cell", ["decompile","expect"], _a2zh99);  
  $def("_pyp280", "test_decompile_class", ["decompile","expect"], _pyp280);  
  $def("_kf8c3f", "test_decompile_class_with_property", ["decompile"], _kf8c3f);  
  $def("_4vunhm", "test_decompile_object_literal", ["decompile","expect"], _4vunhm);  
  $def("_s14e29", "test_decompile_reference", ["decompile","expect"], _s14e29);  
  $def("_4rsshj", "test_decompile_block", ["decompile","expect"], _4rsshj);  
  $def("_o7o1wl", "test_decompile_comments", ["decompile","expect"], _o7o1wl);  
  $def("_1yn35e3", "test_decompile_generator", ["decompile","expect"], _1yn35e3);  
  $def("_135eswd", "test_decompile_function", ["decompile","expect"], _135eswd);  
  $def("_1pitq2", "test_decompile_async_function", ["decompile","expect"], _1pitq2);  
  $def("_1kxe1b2", "test_decompile_named_function", ["decompile","expect"], _1kxe1b2);  
  $def("_1pghf4f", "test_decompile_this_reference", ["decompile","expect"], _1pghf4f);  
  $def("_4aeghn", "test_decompile_lambda", ["decompile","expect"], _4aeghn);  
  $def("_12ec5zd", "test_decompile_error", ["decompile","expect"], _12ec5zd);  
  $def("_3bj09h", "test_decompile_error_object", ["decompile","expect"], _3bj09h);  
  $def("_6iufw4", null, ["md"], _6iufw4);  
  $def("_15idqib", "test_decompile_anon_error_dep", ["decompile","expect"], _15idqib);  
  $def("_mhm98c", "test_decompile_viewof", ["decompile","expect"], _mhm98c);  
  $def("_15kgqrr", "test_decompile_mutable", ["decompile","expect"], _15kgqrr);  
  $def("_1onyv5c", "test_decompile_builtin", ["decompile","expect"], _1onyv5c);  
  $def("_1uv76xx", "test_decompile_fileattachment", ["decompile","expect"], _1uv76xx);  
  $def("_g4z6de", "test_decompile_mutable_dependancy", ["decompile","expect"], _g4z6de);  
  $def("_qo8sdl", "test_decompile_mutable_dependancy_2", ["decompile","expect"], _qo8sdl);  
  $def("_15kwaz1", "test_decompile_viewof_dep", ["decompile","expect"], _15kwaz1);  
  $def("_1qjzk2s", "test_decompile_viewof_data_dep", ["decompile","expect"], _1qjzk2s);  
  $def("_ehz2xk", "test_decompile_viewof_param", ["decompile","expect"], _ehz2xk);  
  $def("_oilkc0", "test_decompile_anon_dep", ["decompile","expect"], _oilkc0);  
  $def("_1jggajo", "test_decompile_import_mutable", ["decompile","expect"], _1jggajo);  
  $def("_di0abi", "test_decompile_import_viewof", ["decompile","expect"], _di0abi);  
  $def("_14o5oio", "test_decompile_viewof_data", ["decompile","expect"], _14o5oio);  
  $def("_1lv4syw", "test_decompile_import_alias", ["decompile","expect"], _1lv4syw);  
  $def("_l8b8hu", "test_decompile_import_mutable_alias", ["decompile","expect"], _l8b8hu);  
  $def("_1g5n3sa", "test_decompile_import_mutable_data_alias", ["decompile","expect"], _1g5n3sa);  
  $def("_1lnngk6", "test_decompile_import_viewof_alias", ["decompile","expect"], _1lnngk6);  
  $def("_1na1e5i", "test_decompile_import_viewof_data_alias", ["decompile","expect"], _1na1e5i);  
  $def("_17dwb6r", null, ["md"], _17dwb6r);  
  main.define("escodegen", ["module @tomlarkworthy/escodegen", "@variable"], (_, v) => v.import("escodegen", _));  
  $def("_1vs6mei", null, ["md"], _1vs6mei);  
  $def("_1g89k6a", "escodegenOptions", ["escodegen"], _1g89k6a);  
  $def("_llvq9s", "decompile", ["decompileImport","formatImportDeclaration","acorn","escodegen","escodegenOptions"], _llvq9s);  
  $def("_1pvis67", null, ["md"], _1pvis67);  
  $def("_183j58u", "extractModuleInfo", [], _183j58u);  
  $def("_w445v0", "test_extractModuleInfo_notebook_resolution", ["expect","extractModuleInfo"], _w445v0);  
  $def("_uzqj4w", "test_extractModuleInfo_id_version_resolution", ["expect","extractModuleInfo"], _uzqj4w);  
  $def("_1sruec2", "test_extractModuleInfo_id_version", ["expect","extractModuleInfo"], _1sruec2);  
  $def("_ipn8zp", "test_extractModuleInfo_test_4", ["expect","extractModuleInfo"], _ipn8zp);  
  $def("_iigmyv", "test_extractModuleInfo_alias_hack", ["expect","extractModuleInfo"], _iigmyv);  
  $def("_1tggbee", null, ["md"], _1tggbee);  
  $def("_kiaw33", "import_ast_example", ["parser"], _kiaw33);  
  $def("_1n7gw17", "findModuleName", ["extractModuleInfo"], _1n7gw17);  
  $def("_i47chb", "findImportedName", [], _i47chb);  
  $def("_1effqg", null, ["md"], _1effqg);  
  $def("_b7vai6", "decompileImport", ["findModuleName","findImportedName"], _b7vai6);  
  $def("_1sylz7j", "formatImportDeclaration", [], _1sylz7j);  
  $def("_13dctdn", "test_decompileImport_basic", ["importFake","decompileImport","expect"], _13dctdn);  
  $def("_ujr0xn", "test_formatImportDeclaration_roundtrip", ["importFake","decompileImport","expect","formatImportDeclaration","decompile"], _ujr0xn);  
  $def("_1u6sfri", "test_decompileImport_alias", ["importFake","decompileImport","expect","formatImportDeclaration"], _1u6sfri);  
  $def("_1lqhutp", null, ["md"], _1lqhutp);  
  $def("_ikzxev", "normalizeJavascriptSource", ["acorn","escodegen"], _ikzxev);  
  $def("_az8lo6", "normalizeVariables", ["variableToObject","normalizeJavascriptSource"], _az8lo6);  
  $def("_3knb9v", "variableToObject", [], _3knb9v);  
  $def("_263fcv", null, ["md"], _263fcv);  
  $def("_7zpsl9", "viewof normalizeObservableSourceSelector", ["Inputs","notebook_semantics_source"], _7zpsl9);  
  $def("_1ex8kus", "normalizeObservableSourceSelector", ["Generators","viewof normalizeObservableSourceSelector"], _1ex8kus);  
  $def("_17petbz", null, ["normalizeObservableSource","normalizeObservableSourceSelector"], _17petbz);  
  $def("_b2d0zc", "parsed", ["parser","normalizeObservableSourceSelector"], _b2d0zc);  
  $def("_qtgjo9", "generate", ["escodegen"], _qtgjo9);  
  $def("_104j23i", "normalizeObservableSource", ["parser","generate"], _104j23i);  
  $def("_vle3wv", null, ["md"], _vle3wv);  
  $def("_10ofthe", "test_async_interpolation", ["compile"], _10ofthe);  
  $def("_1gb7c3c", "test_compile_syntax_error_viewof", ["compile","expect"], _1gb7c3c);  
  $def("_69vyub", "test_compile_syntax_error_anonymous", ["compile","expect"], _69vyub);  
  $def("_1c9p3om", "test_compile_syntax_error_named", ["compile","expect"], _1c9p3om);  
  $def("_x7zc8w", "test_compile_integer", ["compile","expect"], _x7zc8w);  
  $def("_1u7hlem", "test_compile_string", ["compile","expect"], _1u7hlem);  
  $def("_151bijp", "test_compile_obj_literal", ["compile","expect"], _151bijp);  
  $def("_ti9okn", "test_compile_assignment", ["compile","expect"], _ti9okn);  
  $def("_1eb8vq", "test_compile_dependancy", ["compile","expect"], _1eb8vq);  
  $def("_acs4l0", "test_compile_block_dependancy", ["compile","expect"], _acs4l0);  
  $def("_125ljg9", "test_compile_comments", ["compile","expect"], _125ljg9);  
  $def("_li37je", "test_compile_generator", ["compile","expect"], _li37je);  
  $def("_em4em6", "test_compile_function", ["compile","expect"], _em4em6);  
  $def("_w3atfb", "test_compile_async_function", ["compile","expect"], _w3atfb);  
  $def("_14gl6yr", "test_compile_named_function", ["compile","expect"], _14gl6yr);  
  $def("_z3bqb8", "test_compile_this_reference", ["compile","expect"], _z3bqb8);  
  $def("_1sou7t0", "test_compile_lambda", ["compile","expect"], _1sou7t0);  
  $def("_1o1u737", "test_compile_error", ["compile","expect"], _1o1u737);  
  $def("_y271kb", "test_compile_viewof", ["compile","expect"], _y271kb);  
  $def("_1q4asyp", "test_compile_viewof_and_value_coexist", ["compile","expect"], _1q4asyp);  
  $def("_189jvkd", "test_compile_mutable", ["compile","expect"], _189jvkd);  
  $def("_78egw8", "test_compile_builtin", ["compile","expect"], _78egw8);  
  $def("_lflzev", "test_compile_fileattachment", ["compile","expect"], _lflzev);  
  $def("_1e555b1", "test_compile_mutable_dep", ["compile","expect"], _1e555b1);  
  $def("_1a2af6", "test_compile_mutable_dep2", ["compile","expect"], _1a2af6);  
  $def("_ql80wk", "test_compile_inline_viewof", ["compile","expect"], _ql80wk);  
  $def("_1k420gu", "test_compile_view_dep", ["compile","expect"], _1k420gu);  
  $def("_1y1h47u", "test_compile_dep", ["compile","expect"], _1y1h47u);  
  $def("_kwdsyz", "test_compile_class", ["compile","expect"], _kwdsyz);  
  $def("_33oop5", "test_compile_event", ["compile","expect"], _33oop5);  
  $def("_9phvzk", "test_compile_tagged_literal", ["compile","expect"], _9phvzk);  
  $def("_1q0pie3", "compile_unit_test_template", ["Inputs","test_case","compiled"], _1q0pie3);  
  $def("_1lmax86", "test_compile_import_plain_single", ["compile","expect"], _1lmax86);  
  $def("_17sgzdm", "test_compile_import_view_data_alias_single", ["compile","expect"], _17sgzdm);  
  $def("_1tqj4tp", "test_compile_import_mutable_data_alias_single", ["compile","expect"], _1tqj4tp);  
  $def("_hv0te2", "test_compile_import_mutable_single", ["compile","expect"], _hv0te2);  
  $def("_1mltqmr", "test_compile_import_viewof_single", ["compile","expect"], _1mltqmr);  
  $def("_1d18obr", "test_compile_import_alias_single", ["compile","expect"], _1d18obr);  
  $def("_1b5ghef", "test_compile_import_notebook", ["compile","expect"], _1b5ghef);  
  $def("_1nps9cr", "viewof test_case", ["Inputs","notebook_semantics_source"], _1nps9cr);  
  $def("_1e5ax6f", "test_case", ["Generators","viewof test_case"], _1e5ax6f);  
  $def("_18e5b93", null, ["test_case"], _18e5b93);  
  $def("_16q6oyc", "compiled", ["compile","test_case"], _16q6oyc);  
  $def("_1191170", null, ["parser","test_case"], _1191170);  
  $def("_1gh543z", "viewof compiled_selector", ["Inputs","compiled"], _1gh543z);  
  $def("_1dmmuaf", "compiled_selector", ["Generators","viewof compiled_selector"], _1dmmuaf);  
  $def("_1klx74n", null, ["compiled_selector","normalizeJavascriptSource"], _1klx74n);  
  $def("_eom91x", null, ["compile","test_case"], _eom91x);  
  $def("_ttos3c", "compile", ["parser","observableToJs"], _ttos3c);  
  $def("_1v1i7wl", "observableToJs", ["acorn_walk","parser","escodegen"], _1v1i7wl);  
  $def("_1ayjluu", null, ["md"], _1ayjluu);  
  $def("_xhj6b8", "decompress_url", ["DecompressionStream","TextDecoderStream","TransformStream","TextEncoderStream","Response"], _xhj6b8);  
  $def("_s9w7ha", "parser", ["decompress_url","FileAttachment","acorn_url","acorn_walk_url"], _s9w7ha);  
  $def("_1hiclbb", "acorn_walk", ["acorn_walk_url"], _1hiclbb);  
  main.define("acorn", ["module @tomlarkworthy/acorn-8-11-3", "@variable"], (_, v) => v.import("acorn", _));  
  main.define("acorn_url", ["module @tomlarkworthy/acorn-8-11-3", "@variable"], (_, v) => v.import("acorn_url", _));  
  $def("_1cz8oe9", "acorn_walk_url", ["decompress_url","FileAttachment"], _1cz8oe9);  
  main.define("expect", ["module @tomlarkworthy/jest-expect-standalone", "@variable"], (_, v) => v.import("expect", _));  
  main.define("Runtime", ["module @tomlarkworthy/observable-runtime", "@variable"], (_, v) => v.import("Runtime", _));  
  main.define("Inspector", ["module @tomlarkworthy/observable-runtime", "@variable"], (_, v) => v.import("Inspector", _));  
  main.define("Library", ["module @tomlarkworthy/observable-runtime", "@variable"], (_, v) => v.import("Library", _));  
  main.define("RuntimeError", ["module @tomlarkworthy/observable-runtime", "@variable"], (_, v) => v.import("RuntimeError", _));  
  $def("_1rc67k0", "stageB_importFake", [], _1rc67k0);  
  $def("_1d53asg", "test_decompileImport_stageB_single", ["stageB_importFake","decompileImport","expect","formatImportDeclaration"], _1d53asg);  
  $def("_hv5gag", "test_decompileImport_stageB_aliased", ["stageB_importFake","decompileImport","expect","formatImportDeclaration"], _hv5gag);  
  $def("_avc18y", "test_decompileImport_stageB_multiple", ["stageB_importFake","decompileImport","expect","formatImportDeclaration"], _avc18y);  
  $def("_16gia7i", "test_decompileImport_stageB_mixed_alias", ["stageB_importFake","decompileImport","expect","formatImportDeclaration"], _16gia7i);  
  $def("_1slhdwo", "test_decompileImport_stageB_viewof", ["stageB_importFake","decompileImport","expect","formatImportDeclaration"], _1slhdwo);  
  $def("_qwlsf2", "test_decompileImport_stageB_mutable", ["stageB_importFake","decompileImport","expect","formatImportDeclaration"], _qwlsf2);  
  $def("_sy7jfx", "test_decompileImport_returns_null_for_non_import", ["decompileImport","expect"], _sy7jfx);  
  $def("_rk7ku3", "test_decompileImport_compile_roundtrip_single", ["compile","expect","stageB_importFake","decompileImport","formatImportDeclaration"], _rk7ku3);  
  $def("_xynplo", "test_decompileImport_stageB_order_independent", ["stageB_importFake","decompileImport","expect","formatImportDeclaration"], _xynplo);  
  $def("_16fpgac", "test_decompileImport_stageB_notebook_id", ["stageB_importFake","decompileImport","expect","formatImportDeclaration"], _16fpgac);
  return main;
}