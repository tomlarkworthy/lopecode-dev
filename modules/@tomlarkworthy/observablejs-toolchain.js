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
const _1shi9or = function _test_all_cells_roundtrippable(roundtripped)
{
  const errored = roundtripped.filter((cell) => cell.error);
  if (errored.length > 0) throw JSON.stringify(errored, null, 2);
  return `${roundtripped.length} cells decompiled, recompiled and decompiled again without error`;
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
const _11lfflk = function _notebook_semantics_module(){return(
import("https://api.observablehq.com/@tomlarkworthy/notebook-semantics.js?v=4")
)};
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
const _1ybjsqg = async function _test_decompile_dollar_in_string_literal(decompile,expect)
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
  expect(decompiled).toEqual(`demo = "x".replace(/x/, '$1y')`);
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
const _1puzspw = async function _test_decompile_string_literal(decompile,expect)
{
  const decompiled = await decompile([
    {
      _name: "v",
      _definition: `function _3() {\n  ("");\n}`,
      _inputs: []
    }
  ]);
  // decompile preserves the original expression verbatim (source-slicing), so the
  // parenthesized string and quote style survive — no escodegen re-quoting.
  expect(decompiled).toEqual(`v = {\n  ("");\n}`);
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
const _1pt67ao = async function _test_decompile_class(decompile,expect)
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
  expect(decompiled).toEqual(`myclass = class myclass {}`);
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
const _14nvmno = async function _test_decompile_block(decompile,expect)
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
  ("");
  return x + y;
}`);
  return "ok";
};
const _5kd9if = async function _test_decompile_comments(decompile,expect)
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
  return "";
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
const _10wf7cf = async function _test_decompile_function(decompile,expect)
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
  expect(decompiled).toEqual(`_function = function () {}`);
  return "ok";
};
const _1191zxm = async function _test_decompile_async_function(decompile,expect)
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
  expect(decompiled).toEqual(`asyncfunction = async function () {}`);
  return "ok";
};
const _vpu09i = async function _test_decompile_named_function(decompile,expect)
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
  expect(decompiled).toEqual(`named_function = function foo() {}`);
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
const _rajn7p = async function _test_decompile_lambda(decompile,expect)
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
  expect(decompiled).toEqual(`lambda = () => {}`);
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
const _1c93ef9 = async function _test_decompile_error_object(decompile,expect)
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
  throw { foo: "bar" };
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
const _4z1dnp = async function _test_decompile_fileattachment(decompile,expect)
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
  expect(decompiled).toEqual(`file = FileAttachment("empty")`);
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
const _b0y8zg = async function _test_decompile_viewof_param(decompile,expect)
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
  viewof bar.dispatchEvent(new Event("input"));
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
const _1eqf4jq = async function _test_decompile_import_mutable(decompile,expect)
{
  const decompiled = await decompile([
    {
      _name: "mutable mutabledep",
      _definition: `(_, v) => v.import("mutable mutabledep", _)`,
      _inputs: []
    }
  ]);
  expect(decompiled).toEqual(
    `mutable mutabledep = v.import("mutable mutabledep", _)`
  );
  return "ok";
};
const _3damo4 = async function _test_decompile_import_viewof(decompile,expect)
{
  const decompiled = await decompile([
    {
      _name: "viewof viewdep",
      _definition: `(_, v) => v.import("viewof viewdep", _)`,
      _inputs: []
    }
  ]);
  expect(decompiled).toEqual(`viewof viewdep = v.import("viewof viewdep", _)`);
  return "ok";
};
const _1l9xqsw = async function _test_decompile_viewof_data(decompile,expect)
{
  const decompiled = await decompile([
    {
      _name: "viewdep",
      _definition: `(_, v) => v.import("viewdep", _)`,
      _inputs: []
    }
  ]);
  expect(decompiled).toEqual(`viewdep = v.import("viewdep", _)`);
  return "ok";
};
const _1cggvdk = async function _test_decompile_import_alias(decompile,expect)
{
  const decompiled = await decompile([
    {
      _name: "dep_alias",
      _definition: `(_, v) => v.import("dep", "dep_alias", _)`,
      _inputs: []
    }
  ]);
  expect(decompiled).toEqual(`dep_alias = v.import("dep", "dep_alias", _)`);
  return "ok";
};
const _xcwq4 = async function _test_decompile_import_mutable_alias(decompile,expect)
{
  const decompiled = await decompile([
    {
      _name: "mutable aslias_mutabledep",
      _definition: `(_, v) => v.import("mutable mutabledep", "mutable aslias_mutabledep", _)`,
      _inputs: []
    }
  ]);
  expect(decompiled).toEqual(
    `mutable aslias_mutabledep = v.import("mutable mutabledep", "mutable aslias_mutabledep", _)`
  );
  return "ok";
};
const _1868h0w = async function _test_decompile_import_mutable_data_alias(decompile,expect)
{
  const decompiled = await decompile([
    {
      _name: "aslias_mutabledep",
      _definition: `(_, v) => v.import("mutabledep", "aslias_mutabledep", _)`,
      _inputs: []
    }
  ]);
  expect(decompiled).toEqual(
    `aslias_mutabledep = v.import("mutabledep", "aslias_mutabledep", _)`
  );
  return "ok";
};
const _1afcxhk = async function _test_decompile_import_viewof_alias(decompile,expect)
{
  const decompiled = await decompile([
    {
      _name: "viewof aslias_viewdep",
      _definition: `(_, v) => v.import("viewof viewdep", "viewof aslias_viewdep", _)`,
      _inputs: []
    }
  ]);
  expect(decompiled).toEqual(
    `viewof aslias_viewdep = v.import("viewof viewdep", "viewof aslias_viewdep", _)`
  );
  return "ok";
};
const _1sl510 = async function _test_decompile_import_viewof_data_alias(decompile,expect)
{
  const decompiled = await decompile([
    {
      _name: "aslias_viewdep",
      _definition: `(_, v) => v.import("viewdep", "aslias_viewdep", _)`,
      _inputs: []
    }
  ]);
  expect(decompiled).toEqual(
    `aslias_viewdep = v.import("viewdep", "aslias_viewdep", _)`
  );
  return "ok";
};
const _17dwb6r = function _80(md){return(
md`### The Decompiler`
)};
const _1ngipml = function _81(md){return(
md`### \`decompile\``
)};
const _2d5g1 = function _decompile(decompileImport,formatImportDeclaration,acorn){return(
async function decompile(variables) {
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
    const parsed = acorn.parse(wrappedCode, {
      ecmaVersion: 2022,
      sourceType: "module",
      ranges: true,
      onComment: comments,
      onToken: tokens
    });
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
    // Pick the source range to return: the single returned expression for a
    // normal `{ return <expr> }` cell, otherwise the whole body. We SLICE the
    // original text rather than regenerate via escodegen, so comments, quote
    // style, whitespace, ASI-sensitive grouping and class fields all survive
    // byte-for-byte. (Regeneration was the root of the ASI, quote-drift and
    // class-property-shim-gap bugs.)
    let sliceNode = body;
    let wrapObjectLiteral = false;
    if (
      body.type === "BlockStatement" &&
      body.body.length === 1 &&
      body.body[0].type === "ReturnStatement" &&
      body.body[0].argument
    ) {
      const arg = body.body[0].argument;
      // Unwrap `{ return <arg> }` to <arg> only when every comment lives INSIDE
      // <arg>, so it survives the arg slice (a returned function's own comments
      // are kept this way). A comment anywhere else in the block — before
      // `return`, in the compiler's `return( … )` auto-wrap slot, or trailing
      // after the value — would be dropped by unwrapping, so keep the (ASI-safe)
      // block form to preserve it and round-trip exactly.
      const hasCommentOutsideArg = comments.some(
        (c) =>
          c.start >= body.start &&
          c.end <= body.end &&
          (c.end <= arg.start || c.start >= arg.end)
      );
      if (!hasCommentOutsideArg) {
        sliceNode = arg;
        wrapObjectLiteral = wrappedCode[arg.start] === "{";
      }
    }
    const sliceStart = sliceNode.start;
    const sliceEnd = sliceNode.end;

    // $N → Observable name. Positional over the qualifying inputs, matching the
    // compiler's convention (same counting the old placeholder pass used).
    const dollarValue = new Map();
    {
      let id = 0;
      inputs.forEach((input) => {
        if (input && input.startsWith("mutable ")) {
          dollarValue.set(`$${id++}`, { name: input, mutable: true });
        } else if (
          input &&
          (input.startsWith("viewof ") || input === "@variable")
        ) {
          dollarValue.set(`$${id++}`, { name: input, mutable: false });
        }
      });
    }
    // Underscore-encoded viewof/mutable params (lopecode compiled form) → spaced.
    const underscoreParam = new Map();
    inputs.forEach((input, i) => {
      if (
        input &&
        (input.startsWith("viewof ") || input.startsWith("mutable "))
      ) {
        const underscoreForm = input.replace(" ", "_");
        if (params[i] === underscoreForm) underscoreParam.set(underscoreForm, input);
      }
    });

    // Collect identifier-node range rewrites within the sliced expression only.
    // Keyed on Identifier/MemberExpression nodes, so string, regex and template
    // text is never touched (this is what the old string replaceAll corrupted).
    const edits = [];
    const consumed = new Set();
    const collect = (node) => {
      if (!node || typeof node !== "object" || typeof node.type !== "string")
        return;
      // mutable `$N.value` → `mutable foo` (replace the whole member expression)
      if (
        node.type === "MemberExpression" &&
        !node.computed &&
        node.object &&
        node.object.type === "Identifier" &&
        node.property &&
        node.property.type === "Identifier" &&
        node.property.name === "value"
      ) {
        const dv = dollarValue.get(node.object.name);
        if (dv && dv.mutable) {
          edits.push({ start: node.start, end: node.end, text: dv.name });
          consumed.add(node.object);
        }
      } else if (node.type === "Identifier" && !consumed.has(node)) {
        const dv = dollarValue.get(node.name);
        if (dv) {
          // Non-mutable $N → input name. Bare mutable $N (no `.value`) stays $N.
          if (!dv.mutable) edits.push({ start: node.start, end: node.end, text: dv.name });
        } else if (underscoreParam.has(node.name)) {
          edits.push({ start: node.start, end: node.end, text: underscoreParam.get(node.name) });
        }
      }
      for (const k in node) {
        if (k === "loc" || k === "range" || k === "start" || k === "end")
          continue;
        const c = node[k];
        if (Array.isArray(c)) c.forEach(collect);
        else if (c && typeof c === "object" && typeof c.type === "string")
          collect(c);
      }
    };
    collect(sliceNode);

    // Apply edits right-to-left (descending start) so offsets stay valid.
    let expression = wrappedCode.slice(sliceStart, sliceEnd);
    edits
      .sort((a, b) => b.start - a.start)
      .forEach((e) => {
        const s = e.start - sliceStart;
        const t = e.end - sliceStart;
        expression = expression.slice(0, s) + e.text + expression.slice(t);
      });
    if (wrapObjectLiteral) expression = `(${expression})`;

    const source = `${varName ? `${prefix}${varName} = ` : ""}${expression}`;
    return source;
  }
)};
const _1x0pvrl = function _83(md){return(
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
const _7t42k8 = function _90(md){return(
md`### \`findModuleName\` and \`findImportedName\``
)};
const _kiaw33 = function _import_ast_example(parser){return(
parser.parseCell(
  'import {runtime, viewof main as foo} from "@mootari/access-runtime"'
)
)};
const _1n7gw17 = function _findModuleName(extractModuleInfo){return(
(scope, module, { unknown_id = Math.random() } = {}) => {
  try {
    const scopedVariables = [...scope.values()];

    // Prefer variables that *define* a module and have a real module-loader name.
    const candidates = scopedVariables.filter(
      (v) =>
        v &&
        v._value === module &&
        typeof v._name === "string" &&
        v._name.startsWith("module ") &&
        !v._name.startsWith("module <unknown")
    );

    const pickBestInfo = (dfn) => {
      // Avoid the parentUrl (2nd arg) confusing module identification.
      // Typical patterns:
      //   importShim("/d/<id>@<ver>.js?v=4", "https://api.observablehq.com/@ns/name.js?v=4")
      //   import("/d/<id>@<ver>.js?v=4")
      // Prefer the *first argument* inside importShim(...) / import(...) when present.
      const s = String(dfn ?? "");

      // Try to capture the first string literal argument to importShim(...) or import(...)
      // Tolerates quotes ", ', ` and both importShim and plain import.
      const m = s.match(
        /\bimport(?:Shim)?\(\s*(["'`])((?:\\.|(?!\1)[\s\S])*)\1/
      );
      const firstArg = m?.[2];

      const info1 = firstArg ? extractModuleInfo(firstArg) : {};
      if (info1?.id || info1?.notebook) return info1;

      // Fallback: parse the whole definition string.
      return extractModuleInfo(s);
    };

    // Try module loader cells first.
    for (const v of candidates) {
      const info = pickBestInfo(v._definition?.toString?.());
      if (info?.namespace) return `@${info.namespace}/${info.notebook}`;
      if (info?.id) return `d/${info.id}@${info.version}`;
    }

    // Fallback: any scoped variable with _value==module.
    const any = scopedVariables.find((v) => v && v._value === module);
    if (any) {
      const info = pickBestInfo(any._definition?.toString?.());
      if (info?.namespace) return `@${info.namespace}/${info.notebook}`;
      if (info?.id) return `d/${info.id}@${info.version}`;
    }

    return `<unknown ${unknown_id}>`;
  } catch (e) {
    debugger;
    return "error";
  }
}
)};
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
const _ed3cy2 = function _94(md){return(
md`### \`decompileImport\``
)};
const _1a4j4gm = function _decompileImport(findModuleName,findImportedName)
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
      return !!(i0 && typeof i0 === 'object' && typeof i0._name === 'string' && i0._name.startsWith('module ') && i1 && typeof i1 === 'object' && i1._name === '@variable');
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
const _1lti0tv = function _100(md){return(
md`## Javascript Source Normalization`
)};
const _3knb9v = function _variableToObject(){return(
(v) => ({
  _name: v._name,
  _definition: v._definition.toString(),
  _inputs: v._inputs.map((v) => v._name || v)
})
)};
const _autn1v = function _102(md){return(
md`## Observable Source Normalization`
)};
const _7zpsl9 = function _normalizeObservableSourceSelector(Inputs,notebook_semantics_source){return(
Inputs.select(
  notebook_semantics_source.map((s) => s.value),
  { label: "test case", value: "1" }
)
)};
const _1ex8kus = (G, _) => G.input(_);
const _b2d0zc = function _parsed(parser,normalizeObservableSourceSelector){return(
parser.parseCell(normalizeObservableSourceSelector)
)};
const _14qm8or = function _105(md){return(
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
const _1qp2ggw = async function _test_compile_string(compile,expect)
{
  const compiled = await compile(`""`);
  expect(compiled).toEqual([
    {
      _name: null,
      _inputs: [],
      _definition: `function _anonymous() {return ("");}`
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
const _17z4vyt = async function _test_compile_assignment(compile,expect)
{
  const compiled = await compile(`x = ""`);
  expect(compiled).toEqual([
    {
      _name: "x",
      _inputs: [],
      _definition: `function _x() {return ("");}`
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
const _5b8x33 = async function _test_compile_block_dependancy(compile,expect)
{
  const compiled = await compile(`z = {
  ("");
  return x + y;
}`);
  expect(compiled).toEqual([
    {
      _name: "z",
      _inputs: ["x", "y"],
      _definition: `function _z(x,y) {\n  ("");\n  return x + y;\n}`
    }
  ]);
  return "ok";
};
const _9s1umz = async function _test_compile_comments(compile,expect)
{
  const compiled = await compile(`comments = {
  // a comment
  return "";
}`);
  expect(compiled).toEqual([
    {
      _name: "comments",
      _inputs: [],
      _definition: `function _comments() {\n  // a comment\n  return "";\n}`
    }
  ]);
  return "ok";
};
const _1rbs7b6 = async function _test_compile_generator(compile,expect)
{
  const compiled = await compile(`generator = {
  yield x + y;
}`);
  expect(compiled).toEqual([
    {
      _name: "generator",
      _inputs: ["x", "y"],
      _definition: "function* _generator(x,y) {\n  yield x + y;\n}"
    }
  ]);
  return "ok";
};
const _1gaxmhs = async function _test_compile_function(compile,expect)
{
  const compiled = await compile(`_function = function () {}`);
  expect(compiled).toEqual([
    {
      _name: "_function",
      _inputs: [],
      _definition: "function __function() {return (function () {});}"
    }
  ]);
  return "ok";
};
const _2ozyn1 = async function _test_compile_async_function(compile,expect)
{
  const compiled = await compile(`asyncfunction = async function () {}`);
  expect(compiled).toEqual([
    {
      _name: "asyncfunction",
      _inputs: [],
      _definition:
        "function _asyncfunction() {return (async function () {});}"
    }
  ]);
  return "ok";
};
const _1jn3lk9 = async function _test_compile_named_function(compile,expect)
{
  const compiled = await compile(`named_function = function foo() {}`);
  expect(compiled).toEqual([
    {
      _name: "named_function",
      _inputs: [],
      _definition: "function _named_function() {return (function foo() {});}"
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
const _1lyze5m = async function _test_compile_lambda(compile,expect)
{
  const compiled = await compile(`lambda = () => {}`);
  expect(compiled).toEqual([
    {
      _name: "lambda",
      _inputs: [],
      _definition: "function _lambda() {return (() => {});}"
    }
  ]);
  return "ok";
};
const _12k1xub = async function _test_compile_error(compile,expect)
{
  const compiled = await compile(`error = {
  throw new Error();
}`);
  expect(compiled).toEqual([
    {
      _name: "error",
      _inputs: [],
      _definition: "function _error() {\n  throw new Error();\n}"
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
const _1o65727 = async function _test_compile_fileattachment(compile,expect)
{
  const compiled = await compile(`file = FileAttachment("empty")`);
  expect(compiled).toEqual([
    {
      _name: "file",
      _inputs: ["FileAttachment"],
      _definition:
        `function _file(FileAttachment) {return (FileAttachment("empty"));}`
    }
  ]);
  return "ok";
};
const _14c9yxp = async function _test_compile_mutable_dep(compile,expect)
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
        "function _mutable_dep($0,lambda,$1) {\n  $0;\n  lambda;\n  $1.value;\n  return $1.value;\n}"
    }
  ]);
  return "ok";
};
const _133w84q = async function _test_compile_mutable_dep2(compile,expect)
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
        "function _mutable_dep_2(file,q) {\n  file;\n  return q + 1;\n}"
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
const _1r711sh = async function _test_compile_class(compile,expect)
{
  const compiled = await compile(`v = class {}`);
  expect(compiled).toEqual([
    {
      _name: "v",
      _inputs: [],
      _definition: `function _v() {return (class {});}`
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
const _1vg114c = async function _test_compile_import_plain_single(compile,expect)
{
  const compiled = await compile(
    `import {dep} from "@tomlarkworthy/dependancy";`
  );
  expect(compiled).toEqual([
    {
      _name: "module @tomlarkworthy/dependancy",
      _inputs: [],
      _definition: `async () => runtime.module((await import("/@tomlarkworthy/dependancy.js?v=4")).default)`
    },
    {
      _name: "dep",
      _inputs: ["module @tomlarkworthy/dependancy", "@variable"],
      _definition: `(_, v) => v.import("dep", _)`
    }
  ]);
  return "ok";
};
const _18h6y38 = async function _test_compile_import_view_data_alias_single(compile,expect)
{
  const compiled = await compile(
    `import {viewdep as aslias_viewdep_data} from "@tomlarkworthy/dependancy";`
  );
  expect(compiled).toEqual([
    {
      _name: "module @tomlarkworthy/dependancy",
      _inputs: [],
      _definition: `async () => runtime.module((await import("/@tomlarkworthy/dependancy.js?v=4")).default)`
    },
    {
      _name: "aslias_viewdep_data",
      _inputs: ["module @tomlarkworthy/dependancy", "@variable"],
      _definition: `(_, v) => v.import("viewdep", "aslias_viewdep_data", _)`
    }
  ]);
  return "ok";
};
const _1svcdun = async function _test_compile_import_mutable_data_alias_single(compile,expect)
{
  const compiled = await compile(
    `import {mutabledep as aslias_mutabledep_data} from "@tomlarkworthy/dependancy";`
  );
  expect(compiled).toEqual([
    {
      _name: "module @tomlarkworthy/dependancy",
      _inputs: [],
      _definition: `async () => runtime.module((await import("/@tomlarkworthy/dependancy.js?v=4")).default)`
    },
    {
      _name: "aslias_mutabledep_data",
      _inputs: ["module @tomlarkworthy/dependancy", "@variable"],
      _definition: `(_, v) => v.import("mutabledep", "aslias_mutabledep_data", _)`
    }
  ]);
  return "ok";
};
const _tb4ops = async function _test_compile_import_mutable_single(compile,expect)
{
  const compiled = await compile(
    `import {mutable mutabledep} from "@tomlarkworthy/dependancy";`
  );
  expect(compiled).toEqual([
    {
      _name: "module @tomlarkworthy/dependancy",
      _inputs: [],
      _definition: `async () => runtime.module((await import("/@tomlarkworthy/dependancy.js?v=4")).default)`
    },
    {
      _name: "mutable mutabledep",
      _inputs: ["module @tomlarkworthy/dependancy", "@variable"],
      _definition: `(_, v) => v.import("mutable mutabledep", _)`
    }
  ]);
  return "ok";
};
const _vuzib9 = async function _test_compile_import_viewof_single(compile,expect)
{
  const compiled = await compile(
    `import {viewof viewdep} from "@tomlarkworthy/dependancy";`
  );
  expect(compiled).toEqual([
    {
      _name: "module @tomlarkworthy/dependancy",
      _inputs: [],
      _definition: `async () => runtime.module((await import("/@tomlarkworthy/dependancy.js?v=4")).default)`
    },
    {
      _name: "viewof viewdep",
      _inputs: ["module @tomlarkworthy/dependancy", "@variable"],
      _definition: `(_, v) => v.import("viewof viewdep", _)`
    }
  ]);
  return "ok";
};
const _6ewshd = async function _test_compile_import_alias_single(compile,expect)
{
  const compiled = await compile(
    `import {dep as dep_alias} from "@tomlarkworthy/dependancy";`
  );
  expect(compiled).toEqual([
    {
      _name: "module @tomlarkworthy/dependancy",
      _inputs: [],
      _definition: `async () => runtime.module((await import("/@tomlarkworthy/dependancy.js?v=4")).default)`
    },
    {
      _name: "dep_alias",
      _inputs: ["module @tomlarkworthy/dependancy", "@variable"],
      _definition: `(_, v) => v.import("dep", "dep_alias", _)`
    }
  ]);
  return "ok";
};
const _36migr = async function _test_compile_import_notebook(compile,expect)
{
  const compiled = await compile(
    `import {escodegen} from "@tomlarkworthy/escodegen"`
  );
  expect(compiled).toEqual([
    {
      _name: `module @tomlarkworthy/escodegen`,
      _inputs: [],
      _definition:
        'async () => runtime.module((await import("/@tomlarkworthy/escodegen.js?v=4")).default)'
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
const _7eic89 = function _146(test_case){return(
test_case.value
)};
const _16q6oyc = async function _compiled(compile,test_case){return(
await compile(test_case.value)
)};
const _61dayu = function _148(parser,test_case)
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
const _cevs6r = function _149(compile,test_case){return(
compile(test_case.value)
)};
const _mliwy8 = function _compile(parser,observableToJs){return(
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
        functionBody = observableToJs(cell.body, inputToArgMap, source);
      } else {
        const bodyCode = observableToJs(cell.body, inputToArgMap, source);
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
const _16p8atj = function _observableToJs(acorn_walk,parser){return(
(ast, inputMap, source) => {
  // Source-preserving: slice the original body text verbatim and splice only the
  // Observable-specific macro ranges (`viewof foo` → $N, `mutable foo` →
  // $N.value). Regenerating via escodegen used to drop the ASI-protecting paren
  // in `return( … )`, normalize quotes, respace `${ x }`, and reindent — all
  // avoided by never regenerating. Ranges are offsets into `source`.
  const edits = [];
  acorn_walk.ancestor(
    ast,
    {
      ViewExpression(node) {
        edits.push({ start: node.start, end: node.end, text: inputMap[node.id.name] });
      },
      MutableExpression(node) {
        // ".value" is not a valid identifier but is valid member access here.
        edits.push({ start: node.start, end: node.end, text: inputMap[node.id.name] + ".value" });
      }
    },
    parser.walk
  );
  const base = ast.start;
  let out = source.slice(ast.start, ast.end);
  edits
    .sort((a, b) => b.start - a.start)
    .forEach((e) => {
      out = out.slice(0, e.start - base) + e.text + out.slice(e.end - base);
    });
  return out;
}
)};
const _1hd7px0 = function _152(md){return(
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
const _s9w7ha = async function _parser(decompress_url,FileAttachment,acorn_url,acorn_walk_url){return(
import(await decompress_url(FileAttachment("parser-6.1.0.js.gz"), {
    "/npm/acorn@8.11.3/+esm": acorn_url,
    "/npm/acorn-walk@8.3.2/+esm": acorn_walk_url
  }))
)};
const _j9n5de = function _stageB_importFake()
{
  // Builds a Stage B (pre-observation, API-loaded) import group as POJOs.
  // Mirrors what `runtime.define("name", ["module @X", "@variable"], (_, v) => v.import("name", _))`
  // produces structurally. Used by the test_decompileImport_stageB_* tests to
  // avoid spinning up a real Observable runtime per case.
  return function stageB_importFake(module_name, specifiers) {
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
const _1numivw = async function _test_decompileImport_stageB_order_independent(stageB_importFake,decompileImport,expect,formatImportDeclaration)
{
  // The detection uses .find — it shouldn't matter whether the stitch is at
  // index 0 or the aliases come first. Verify by moving it to the end.
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
  const [stitch, ...aliases] = vars;
  const info = await decompileImport([
    ...aliases,
    stitch
  ]);
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
const _r2e0wl = function _test_extractModuleInfo_new_id_resolutions(expect,extractModuleInfo)
{
  // new.observablehq.com d/<id>@<ver> import with resolutions=.
  expect(
    extractModuleInfo(
      'async () => runtime.module((await import("/d/e1c39d41e8e944b0@939.js?v=4&resolutions=a6a56ee61aba9799@437")).default)'
    )
  ).toEqual({ id: "e1c39d41e8e944b0", version: "939" });
  return "ok";
};
const _1pg1y6s = function _test_extractModuleInfo_new_slug_resolutions(expect,extractModuleInfo)
{
  // new.observablehq.com slug import carries a resolutions= param.
  expect(
    extractModuleInfo(
      'async () => runtime.module((await import("/@mootari/access-runtime.js?v=4&resolutions=98f34e974bb2e4bc@1392")).default)'
    )
  ).toEqual({ namespace: "mootari", notebook: "access-runtime", version: "1392" });
  return "ok";
};
const _1vh26m0 = function _test_findModuleName_classic_bundle(expect,findModuleName)
{
  // classic observablehq.com bundles imports; the holder def is a bare slug import.
  const m = {}; // module sentinel
  const scope = new Map([
    ["module 1", { _name: "module 1", _value: m,
      _definition: 'async () => runtime.module((await import("@tomlarkworthy/flow-queue")).default)' }]
  ]);
  expect(findModuleName(scope, m)).toEqual("@tomlarkworthy/flow-queue");
  return "ok";
};
const _1ltqcwj = function _test_findModuleName_kit_slug(expect,findModuleName)
{
  // Notebook Kit compiles observable imports to import("https://api.observablehq.com/@u/nb.js?v=4").
  const m = {}; // module sentinel
  const scope = new Map([
    ["module 1", { _name: "module 1", _value: m,
      _definition: 'async (__ojs_runtime) => __ojs_runtime.module((await import("https://api.observablehq.com/@d3/color-legend.js?v=4")).default)' }]
  ]);
  expect(findModuleName(scope, m)).toEqual("@d3/color-legend");
  return "ok";
};
const _wq4poo = function _test_findModuleName_new_id(expect,findModuleName)
{
  const m = {}; // module sentinel
  const scope = new Map([
    ["module 1", { _name: "module 1", _value: m,
      _definition: 'async () => runtime.module((await import("/d/e1c39d41e8e944b0@939.js?v=4&resolutions=a6a56ee61aba9799@437")).default)' }]
  ]);
  expect(findModuleName(scope, m)).toEqual("d/e1c39d41e8e944b0@939");
  return "ok";
};
const _1j0hksu = function _test_findModuleName_new_slug(expect,findModuleName)
{
  const m = {}; // module sentinel
  const scope = new Map([
    ["module 1", { _name: "module 1", _value: m,
      _definition: 'async () => runtime.module((await import("/@mootari/access-runtime.js?v=4&resolutions=98f34e974bb2e4bc@1392")).default)' }]
  ]);
  expect(findModuleName(scope, m)).toEqual("@mootari/access-runtime");
  return "ok";
};
const _3en7eq = async function _test_decompile_leading_comment(decompile,expect,compile)
{
  // Regression: a comment in the compiler's auto-wrap slot (`return( // note\n42 )`)
  // is preserved in ASI-safe block form — never the hazardous `return` + comment
  // + newline WITHOUT the paren that evaluated to undefined on ObservableHQ.
  const src = await decompile([
    { _name: "c", _definition: `function _c(){return( // note\n42\n)}`, _inputs: [] }
  ]);
  expect(src).toEqual(`c = {return( // note\n42\n)}`);
  // It keeps the ASI-protecting paren and round-trips through compile to 42.
  const cell = compile(src);
  const first = Array.isArray(cell) ? cell[0] : cell;
  const def = first._definition || (first.cells && first.cells[0]._definition);
  expect(eval(`(${def})`)()).toEqual(42);
  return "ok";
};
const _z17nwa = async function _test_decompile_trailing_comment(decompile,expect)
{
  // Regression: a comment that survives compile inside the block (trailing on the
  // return line, or before the closing brace) must survive decompile too — don't
  // unwrap a single-return block when a comment sits outside the returned value.
  const trailing = await decompile([
    { _name: "x", _definition: `function _x(){\n  return 1; // done\n}`, _inputs: [] }
  ]);
  expect(trailing).toEqual(`x = {\n  return 1; // done\n}`);
  const tail = await decompile([
    { _name: "y", _definition: `function _y(){\n  return 1;\n  // tail\n}`, _inputs: [] }
  ]);
  expect(tail).toEqual(`y = {\n  return 1;\n  // tail\n}`);
  return "ok";
};
const _q5y9bo = async function _test_decompile_param_in_string(decompile,expect)
{
  // Regression: renaming an underscore-encoded viewof/mutable param must rewrite
  // only identifier references, never same-spelled text inside a string literal
  // (range-based splice, not the old source.replaceAll).
  const decompiled = await decompile([
    {
      _name: "u",
      _definition: `function _u(viewof_x){return(\n"viewof_x literal" + viewof_x\n)}`,
      _inputs: ["viewof x"]
    }
  ]);
  expect(decompiled).toEqual(`u = "viewof_x literal" + viewof x`);
  return "ok";
};
const _fm2sgc = async function _test_decompile_class_property_field(decompile,expect)
{
  // Regression: a class field declaration must decompile cleanly. Source-slicing
  // sidesteps the escodegen shim gap that threw "this[d] is not a function".
  const decompiled = await decompile([
    {
      _name: "Cls",
      _definition: `function _Cls(){return(\nclass Cls {\n  d;\n}\n)}`,
      _inputs: []
    }
  ]);
  expect(decompiled).toEqual(`Cls = class Cls {\n  d;\n}`);
  return "ok";
};
const _1xp8nli = async function _test_compile_preserves_formatting(compile,expect)
{
  // Source-preserving compile keeps quote style and template spacing verbatim;
  // escodegen used to re-quote ("h1" -> 'h1') and respace (${s} -> ${ s }).
  const compiled = await compile('x = { const s = "h1"; return `${s}`; }');
  expect(compiled[0]._definition).toEqual('function _x() { const s = "h1"; return `${s}`; }');
  return "ok";
};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };
  const fileAttachments = new Map(["parser-6.1.0.js.gz"].map((name) => {
    const module_name = "@tomlarkworthy/observablejs-toolchain";
    const {status, mime, bytes} = window.lopecode.contentSync(module_name + "/" + encodeURIComponent(name));
    const blob_url = URL.createObjectURL(new Blob([bytes], { type: mime}));
    return [name, {url: blob_url, mimeType: mime}]
  }));
  main.builtin("FileAttachment", runtime.fileAttachments(name => fileAttachments.get(name)));

  main.define("module @tomlarkworthy/tests", async () => runtime.module((await import("/@tomlarkworthy/tests.js?v=4")).default));  
  main.define("module @tomlarkworthy/cell-map", async () => runtime.module((await import("/@tomlarkworthy/cell-map.js?v=4")).default));  
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
  $def("_1shi9or", "test_all_cells_roundtrippable", ["roundtripped"], _1shi9or);  
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
  $def("_1ybjsqg", "test_decompile_dollar_in_string_literal", ["decompile","expect"], _1ybjsqg);  
  $def("_wgfrtq", "test_decompile_import_variable_alias", ["decompile","importFake","expect"], _wgfrtq);  
  $def("_1a8gnrc", "test_decompile_import_many", ["decompile","importFake","expect"], _1a8gnrc);  
  $def("_7stpu3", "test_decompile_markdown_cell", ["decompile","expect"], _7stpu3);  
  $def("_v4p1js", "test_decompile_constant", ["decompile","expect"], _v4p1js);  
  $def("_1puzspw", "test_decompile_string_literal", ["decompile","expect"], _1puzspw);  
  $def("_a2zh99", "test_decompile_html_cell", ["decompile","expect"], _a2zh99);  
  $def("_1pt67ao", "test_decompile_class", ["decompile","expect"], _1pt67ao);  
  $def("_kf8c3f", "test_decompile_class_with_property", ["decompile"], _kf8c3f);  
  $def("_4vunhm", "test_decompile_object_literal", ["decompile","expect"], _4vunhm);  
  $def("_s14e29", "test_decompile_reference", ["decompile","expect"], _s14e29);  
  $def("_14nvmno", "test_decompile_block", ["decompile","expect"], _14nvmno);  
  $def("_5kd9if", "test_decompile_comments", ["decompile","expect"], _5kd9if);  
  $def("_1yn35e3", "test_decompile_generator", ["decompile","expect"], _1yn35e3);  
  $def("_10wf7cf", "test_decompile_function", ["decompile","expect"], _10wf7cf);  
  $def("_1191zxm", "test_decompile_async_function", ["decompile","expect"], _1191zxm);  
  $def("_vpu09i", "test_decompile_named_function", ["decompile","expect"], _vpu09i);  
  $def("_1pghf4f", "test_decompile_this_reference", ["decompile","expect"], _1pghf4f);  
  $def("_rajn7p", "test_decompile_lambda", ["decompile","expect"], _rajn7p);  
  $def("_12ec5zd", "test_decompile_error", ["decompile","expect"], _12ec5zd);  
  $def("_1c93ef9", "test_decompile_error_object", ["decompile","expect"], _1c93ef9);  
  $def("_6iufw4", null, ["md"], _6iufw4);  
  $def("_15idqib", "test_decompile_anon_error_dep", ["decompile","expect"], _15idqib);  
  $def("_mhm98c", "test_decompile_viewof", ["decompile","expect"], _mhm98c);  
  $def("_15kgqrr", "test_decompile_mutable", ["decompile","expect"], _15kgqrr);  
  $def("_1onyv5c", "test_decompile_builtin", ["decompile","expect"], _1onyv5c);  
  $def("_4z1dnp", "test_decompile_fileattachment", ["decompile","expect"], _4z1dnp);  
  $def("_g4z6de", "test_decompile_mutable_dependancy", ["decompile","expect"], _g4z6de);  
  $def("_qo8sdl", "test_decompile_mutable_dependancy_2", ["decompile","expect"], _qo8sdl);  
  $def("_15kwaz1", "test_decompile_viewof_dep", ["decompile","expect"], _15kwaz1);  
  $def("_1qjzk2s", "test_decompile_viewof_data_dep", ["decompile","expect"], _1qjzk2s);  
  $def("_b0y8zg", "test_decompile_viewof_param", ["decompile","expect"], _b0y8zg);  
  $def("_oilkc0", "test_decompile_anon_dep", ["decompile","expect"], _oilkc0);  
  $def("_1eqf4jq", "test_decompile_import_mutable", ["decompile","expect"], _1eqf4jq);  
  $def("_3damo4", "test_decompile_import_viewof", ["decompile","expect"], _3damo4);  
  $def("_1l9xqsw", "test_decompile_viewof_data", ["decompile","expect"], _1l9xqsw);  
  $def("_1cggvdk", "test_decompile_import_alias", ["decompile","expect"], _1cggvdk);  
  $def("_xcwq4", "test_decompile_import_mutable_alias", ["decompile","expect"], _xcwq4);  
  $def("_1868h0w", "test_decompile_import_mutable_data_alias", ["decompile","expect"], _1868h0w);  
  $def("_1afcxhk", "test_decompile_import_viewof_alias", ["decompile","expect"], _1afcxhk);  
  $def("_1sl510", "test_decompile_import_viewof_data_alias", ["decompile","expect"], _1sl510);  
  $def("_17dwb6r", null, ["md"], _17dwb6r);  
  $def("_1ngipml", null, ["md"], _1ngipml);  
  $def("_2d5g1", "decompile", ["decompileImport","formatImportDeclaration","acorn"], _2d5g1);  
  $def("_1x0pvrl", null, ["md"], _1x0pvrl);  
  $def("_183j58u", "extractModuleInfo", [], _183j58u);  
  $def("_w445v0", "test_extractModuleInfo_notebook_resolution", ["expect","extractModuleInfo"], _w445v0);  
  $def("_uzqj4w", "test_extractModuleInfo_id_version_resolution", ["expect","extractModuleInfo"], _uzqj4w);  
  $def("_1sruec2", "test_extractModuleInfo_id_version", ["expect","extractModuleInfo"], _1sruec2);  
  $def("_ipn8zp", "test_extractModuleInfo_test_4", ["expect","extractModuleInfo"], _ipn8zp);  
  $def("_iigmyv", "test_extractModuleInfo_alias_hack", ["expect","extractModuleInfo"], _iigmyv);  
  $def("_7t42k8", null, ["md"], _7t42k8);  
  $def("_kiaw33", "import_ast_example", ["parser"], _kiaw33);  
  $def("_1n7gw17", "findModuleName", ["extractModuleInfo"], _1n7gw17);  
  $def("_i47chb", "findImportedName", [], _i47chb);  
  $def("_ed3cy2", null, ["md"], _ed3cy2);  
  $def("_1a4j4gm", "decompileImport", ["findModuleName","findImportedName"], _1a4j4gm);  
  $def("_1sylz7j", "formatImportDeclaration", [], _1sylz7j);  
  $def("_13dctdn", "test_decompileImport_basic", ["importFake","decompileImport","expect"], _13dctdn);  
  $def("_ujr0xn", "test_formatImportDeclaration_roundtrip", ["importFake","decompileImport","expect","formatImportDeclaration","decompile"], _ujr0xn);  
  $def("_1u6sfri", "test_decompileImport_alias", ["importFake","decompileImport","expect","formatImportDeclaration"], _1u6sfri);  
  $def("_1lti0tv", null, ["md"], _1lti0tv);  
  $def("_3knb9v", "variableToObject", [], _3knb9v);  
  $def("_autn1v", null, ["md"], _autn1v);  
  $def("_7zpsl9", "viewof normalizeObservableSourceSelector", ["Inputs","notebook_semantics_source"], _7zpsl9);  
  $def("_1ex8kus", "normalizeObservableSourceSelector", ["Generators","viewof normalizeObservableSourceSelector"], _1ex8kus);  
  $def("_b2d0zc", "parsed", ["parser","normalizeObservableSourceSelector"], _b2d0zc);  
  $def("_14qm8or", null, ["md"], _14qm8or);  
  $def("_10ofthe", "test_async_interpolation", ["compile"], _10ofthe);  
  $def("_1gb7c3c", "test_compile_syntax_error_viewof", ["compile","expect"], _1gb7c3c);  
  $def("_69vyub", "test_compile_syntax_error_anonymous", ["compile","expect"], _69vyub);  
  $def("_1c9p3om", "test_compile_syntax_error_named", ["compile","expect"], _1c9p3om);  
  $def("_x7zc8w", "test_compile_integer", ["compile","expect"], _x7zc8w);  
  $def("_1qp2ggw", "test_compile_string", ["compile","expect"], _1qp2ggw);  
  $def("_151bijp", "test_compile_obj_literal", ["compile","expect"], _151bijp);  
  $def("_17z4vyt", "test_compile_assignment", ["compile","expect"], _17z4vyt);  
  $def("_1eb8vq", "test_compile_dependancy", ["compile","expect"], _1eb8vq);  
  $def("_5b8x33", "test_compile_block_dependancy", ["compile","expect"], _5b8x33);  
  $def("_9s1umz", "test_compile_comments", ["compile","expect"], _9s1umz);  
  $def("_1rbs7b6", "test_compile_generator", ["compile","expect"], _1rbs7b6);  
  $def("_1gaxmhs", "test_compile_function", ["compile","expect"], _1gaxmhs);  
  $def("_2ozyn1", "test_compile_async_function", ["compile","expect"], _2ozyn1);  
  $def("_1jn3lk9", "test_compile_named_function", ["compile","expect"], _1jn3lk9);  
  $def("_z3bqb8", "test_compile_this_reference", ["compile","expect"], _z3bqb8);  
  $def("_1lyze5m", "test_compile_lambda", ["compile","expect"], _1lyze5m);  
  $def("_12k1xub", "test_compile_error", ["compile","expect"], _12k1xub);  
  $def("_y271kb", "test_compile_viewof", ["compile","expect"], _y271kb);  
  $def("_1q4asyp", "test_compile_viewof_and_value_coexist", ["compile","expect"], _1q4asyp);  
  $def("_189jvkd", "test_compile_mutable", ["compile","expect"], _189jvkd);  
  $def("_78egw8", "test_compile_builtin", ["compile","expect"], _78egw8);  
  $def("_1o65727", "test_compile_fileattachment", ["compile","expect"], _1o65727);  
  $def("_14c9yxp", "test_compile_mutable_dep", ["compile","expect"], _14c9yxp);  
  $def("_133w84q", "test_compile_mutable_dep2", ["compile","expect"], _133w84q);  
  $def("_ql80wk", "test_compile_inline_viewof", ["compile","expect"], _ql80wk);  
  $def("_1k420gu", "test_compile_view_dep", ["compile","expect"], _1k420gu);  
  $def("_1y1h47u", "test_compile_dep", ["compile","expect"], _1y1h47u);  
  $def("_1r711sh", "test_compile_class", ["compile","expect"], _1r711sh);  
  $def("_33oop5", "test_compile_event", ["compile","expect"], _33oop5);  
  $def("_9phvzk", "test_compile_tagged_literal", ["compile","expect"], _9phvzk);  
  $def("_1q0pie3", "compile_unit_test_template", ["Inputs","test_case","compiled"], _1q0pie3);  
  $def("_1vg114c", "test_compile_import_plain_single", ["compile","expect"], _1vg114c);  
  $def("_18h6y38", "test_compile_import_view_data_alias_single", ["compile","expect"], _18h6y38);  
  $def("_1svcdun", "test_compile_import_mutable_data_alias_single", ["compile","expect"], _1svcdun);  
  $def("_tb4ops", "test_compile_import_mutable_single", ["compile","expect"], _tb4ops);  
  $def("_vuzib9", "test_compile_import_viewof_single", ["compile","expect"], _vuzib9);  
  $def("_6ewshd", "test_compile_import_alias_single", ["compile","expect"], _6ewshd);  
  $def("_36migr", "test_compile_import_notebook", ["compile","expect"], _36migr);  
  $def("_1nps9cr", "viewof test_case", ["Inputs","notebook_semantics_source"], _1nps9cr);  
  $def("_1e5ax6f", "test_case", ["Generators","viewof test_case"], _1e5ax6f);  
  $def("_7eic89", null, ["test_case"], _7eic89);  
  $def("_16q6oyc", "compiled", ["compile","test_case"], _16q6oyc);  
  $def("_61dayu", null, ["parser","test_case"], _61dayu);  
  $def("_cevs6r", null, ["compile","test_case"], _cevs6r);  
  $def("_mliwy8", "compile", ["parser","observableToJs"], _mliwy8);  
  $def("_16p8atj", "observableToJs", ["acorn_walk","parser"], _16p8atj);  
  $def("_1hd7px0", null, ["md"], _1hd7px0);  
  $def("_xhj6b8", "decompress_url", ["DecompressionStream","TextDecoderStream","TransformStream","TextEncoderStream","Response"], _xhj6b8);  
  $def("_s9w7ha", "parser", ["decompress_url","FileAttachment","acorn_url","acorn_walk_url"], _s9w7ha);  
  main.define("acorn", ["module @tomlarkworthy/acorn-8-11-3", "@variable"], (_, v) => v.import("acorn", _));  
  main.define("acorn_url", ["module @tomlarkworthy/acorn-8-11-3", "@variable"], (_, v) => v.import("acorn_url", _));  
  main.define("acorn_walk", ["module @tomlarkworthy/acorn-8-11-3", "@variable"], (_, v) => v.import("acorn_walk", _));  
  main.define("acorn_walk_url", ["module @tomlarkworthy/acorn-8-11-3", "@variable"], (_, v) => v.import("acorn_walk_url", _));  
  main.define("expect", ["module @tomlarkworthy/jest-expect-standalone", "@variable"], (_, v) => v.import("expect", _));  
  main.define("Runtime", ["module @tomlarkworthy/observable-runtime", "@variable"], (_, v) => v.import("Runtime", _));  
  main.define("Inspector", ["module @tomlarkworthy/observable-runtime", "@variable"], (_, v) => v.import("Inspector", _));  
  main.define("Library", ["module @tomlarkworthy/observable-runtime", "@variable"], (_, v) => v.import("Library", _));  
  main.define("RuntimeError", ["module @tomlarkworthy/observable-runtime", "@variable"], (_, v) => v.import("RuntimeError", _));  
  $def("_j9n5de", "stageB_importFake", [], _j9n5de);  
  $def("_1d53asg", "test_decompileImport_stageB_single", ["stageB_importFake","decompileImport","expect","formatImportDeclaration"], _1d53asg);  
  $def("_hv5gag", "test_decompileImport_stageB_aliased", ["stageB_importFake","decompileImport","expect","formatImportDeclaration"], _hv5gag);  
  $def("_avc18y", "test_decompileImport_stageB_multiple", ["stageB_importFake","decompileImport","expect","formatImportDeclaration"], _avc18y);  
  $def("_16gia7i", "test_decompileImport_stageB_mixed_alias", ["stageB_importFake","decompileImport","expect","formatImportDeclaration"], _16gia7i);  
  $def("_1slhdwo", "test_decompileImport_stageB_viewof", ["stageB_importFake","decompileImport","expect","formatImportDeclaration"], _1slhdwo);  
  $def("_qwlsf2", "test_decompileImport_stageB_mutable", ["stageB_importFake","decompileImport","expect","formatImportDeclaration"], _qwlsf2);  
  $def("_sy7jfx", "test_decompileImport_returns_null_for_non_import", ["decompileImport","expect"], _sy7jfx);  
  $def("_rk7ku3", "test_decompileImport_compile_roundtrip_single", ["compile","expect","stageB_importFake","decompileImport","formatImportDeclaration"], _rk7ku3);  
  $def("_1numivw", "test_decompileImport_stageB_order_independent", ["stageB_importFake","decompileImport","expect","formatImportDeclaration"], _1numivw);  
  $def("_16fpgac", "test_decompileImport_stageB_notebook_id", ["stageB_importFake","decompileImport","expect","formatImportDeclaration"], _16fpgac);  
  $def("_r2e0wl", "test_extractModuleInfo_new_id_resolutions", ["expect","extractModuleInfo"], _r2e0wl);  
  $def("_1pg1y6s", "test_extractModuleInfo_new_slug_resolutions", ["expect","extractModuleInfo"], _1pg1y6s);  
  $def("_1vh26m0", "test_findModuleName_classic_bundle", ["expect","findModuleName"], _1vh26m0);  
  $def("_1ltqcwj", "test_findModuleName_kit_slug", ["expect","findModuleName"], _1ltqcwj);  
  $def("_wq4poo", "test_findModuleName_new_id", ["expect","findModuleName"], _wq4poo);  
  $def("_1j0hksu", "test_findModuleName_new_slug", ["expect","findModuleName"], _1j0hksu);  
  $def("_3en7eq", "test_decompile_leading_comment", ["decompile","expect","compile"], _3en7eq);  
  $def("_z17nwa", "test_decompile_trailing_comment", ["decompile","expect"], _z17nwa);  
  $def("_q5y9bo", "test_decompile_param_in_string", ["decompile","expect"], _q5y9bo);  
  $def("_fm2sgc", "test_decompile_class_property_field", ["decompile","expect"], _fm2sgc);  
  $def("_1xp8nli", "test_compile_preserves_formatting", ["compile","expect"], _1xp8nli);
  return main;
}