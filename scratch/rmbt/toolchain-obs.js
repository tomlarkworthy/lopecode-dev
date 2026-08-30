function _1(md){return(
md`# Bidirectional Observable JS <=> Runtime Toolchain

\`\`\`js
import {decompile, compile, cellMap} from "@tomlarkworthy/observablejs-toolchain"
\`\`\``
)}

function _2(md){return(
md`### Compilation, source to runtime variable(s)

Compilation takes notebook source cells written in \`Observable Javascript\` and turns them into reactive variables for execution in the \`Observable Runtime\`. A cell is usually compiled to one runtime variable, however, mutable variables are more complicated and are represented as three runtime variables.

ObservableHQ does the compilation process as part of the hosted notebook experience but in this notebook we provide a way to do it in userspace.`
)}

function _3(md){return(
md`### Decompilation, Runtime variables(s) to source
The aim of decompilation is to go from the live runtime variable definitions, back to the source as best as possible. ObseervableHQ does not have this feature. In this notebook we implement it in userspace.
`
)}

function _4(md){return(
md`### Codeveloped with AI

This notebook is setup for was AI collaboration. Important runtime values, such as the test suite report, are highlighted to the LLM, which helps it decide how to fix test cases.`
)}

function _5(md){return(
md`### Prior work

_Alex Garcia_ pioneered the first third-party Observable **_compiler_** [[asg017/unofficial-observablehq-compiler](https://github.com/asg017/unofficial-observablehq-compiler)]. The compiler here differs by being entirely text/data based, _i.e._ the output is a string/JSON, not hydrated variables and functions.

This is the first **_decompiler_**.`
)}

function _6(md){return(
md`## TODO
- Tagged templates (decompilation works, but there is no source compile for them)
- notebook imports (WIP some decompilation works)
   - need to dedupe some of the implied imports, e.g. \`viewof foo\` also imports \`foo\` but we don't need to explicitly import \`foo\`, it's implied
- anonymous variables work, but the test cases fail due to naming mismatches
- Bug with unobserved module imports, moduleSource does not resolve, we just adjusted source to avoid that problem now 
- class body assignments can't be decompiled`
)}

function _7(md){return(
md`## Continuous Integration Testing

We sniff the entire runtime to test that each cell is de-compilable`
)}

function _9(tests){return(
tests()
)}

function _10(md){return(
md`### All cells are decompileable`
)}

function _cellMaps(cellMap){return(
cellMap()
)}

function _allCells(cellMaps){return(
[...cellMaps.values()]
  .map((cells) =>
    [...cells.values()]
      .filter((c) => c.module !== "builtin")
      .map((c) => c.variables)
  )
  .flat()
)}

function _all_decompiled(allCells,decompile){return(
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
)}

function _test_all_cells_decompilable(all_decompiled)
{
  const errors = all_decompiled.filter((s) => s.error);
  if (errors.length > 0) throw errors;
  return `${all_decompiled.length} cells decompiled without error`;
}


function _15(md){return(
md`### All decompiled cells can be recompiled`
)}

function _all_compiled(all_decompiled,compile){return(
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
)}

function _test_decompiled_cells_recompilable(all_compiled)
{
  const errored = all_compiled.filter((cell) => cell.error);
  if (errored.length > 0) throw JSON.stringify(errored, null, 2);
  return `${all_compiled.length} cells recompiled without error`;
}


function _18(md){return(
md`### All cells roundtrip compile`
)}

function _roundtripped(all_compiled,decompile){return(
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
)}

function _test_all_cells_roundtrippable(roundtripped)
{
  const errored = roundtripped.filter((cell) => cell.error);
  if (errored.length > 0) throw JSON.stringify(errored, null, 2);
  return `${roundtripped.length} cells decompiled, recompiled and decompiled again without error`;
}


function _21(md){return(
md`## Reference Data`
)}

function _22(md){return(
md`### Source code
The source code of a [reference notebook](https://observablehq.com/@tomlarkworthy/notebook-semantics?collection=@tomlarkworthy/lopebook) is extracted directly from the \`https://api.observablehq.com/document/...\` endpoint
`
)}

function _dependancy_document(){return(
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
)}

function _dependancy_source(dependancy_document){return(
dependancy_document.nodes.map((s) => ({
  value: s.value,
  name: s.name
}))
)}

function _25(md){return(
md`
\`\`\`
curl https://api.observablehq.com/document/@tomlarkworthy/notebook-semantics
\`\`\``
)}

function _notebook_semantics_document(){return(
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
)}

function _notebook_semantics_source(notebook_semantics_document,parser){return(
notebook_semantics_document.nodes.map((s) => ({
  value: s.value,
  name: s.mode == "js" ? parser.parseCell(s.value)?.id?.name : null,
  mode: s.mode
}))
)}

function _28(md){return(
md`### Runtime Representation (v4)`
)}

function _notebook_semantics_module(){return(
import(
  "https://api.observablehq.com/@tomlarkworthy/notebook-semantics.js?v=4"
)
)}

function _31(md){return(
md`### Imports`
)}

function _32(md){return(
md`observed modules are variables in the parent notebook, so their module is the main, however, their dependency is something else. -- this holds even for live notebook. They can only have one dependancy (inputs.length = 1)`
)}

function _33(md){return(
md`### runtime in observable`
)}

function _34(md){return(
md`## Test cases`
)}

function _importFake(Runtime){return(
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
)}

async function _test_decompile_syntax_error_roundtrip(compile,decompile,expect)
{
  const compiled = await compile(`foo = () => return ""`);
  const decompiled = await decompile(compiled);
  expect(decompiled).toEqual(`foo = () => return ""`);
  return "ok";
}


async function _test_decompile_$variable(decompile,expect)
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
}


async function _test_decompile_import_variable(decompile,importFake,expect)
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
}


async function _test_decompile_dollar_in_string_literal(decompile,expect)
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
}


async function _test_decompile_import_variable_alias(decompile,importFake,expect)
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
}


async function _test_decompile_import_many(decompile,importFake,expect)
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
}


async function _test_decompile_markdown_cell(decompile,expect)
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
}


async function _test_decompile_constant(decompile,expect)
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
}


async function _test_decompile_string_literal(decompile,expect)
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
}


async function _test_decompile_html_cell(decompile,expect)
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
}


async function _test_decompile_class(decompile,expect)
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
}


function _test_decompile_class_with_property(decompile){return(
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
)}

async function _test_decompile_object_literal(decompile,expect)
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
}


async function _test_decompile_reference(decompile,expect)
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
}


async function _test_decompile_block(decompile,expect)
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
}


async function _test_decompile_comments(decompile,expect)
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
}


async function _test_decompile_generator(decompile,expect)
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
}


async function _test_decompile_function(decompile,expect)
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
}


async function _test_decompile_async_function(decompile,expect)
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
}


async function _test_decompile_named_function(decompile,expect)
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
}


async function _test_decompile_this_reference(decompile,expect)
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
}


async function _test_decompile_lambda(decompile,expect)
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
}


async function _test_decompile_error(decompile,expect)
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
}


async function _test_decompile_error_object(decompile,expect)
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
}


function _60(md){return(
md`⚠️ This cells have not been grouped correctly, should be a single import being decompiled`
)}

async function _test_decompile_anon_error_dep(decompile,expect)
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
}


async function _test_decompile_viewof(decompile,expect)
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
}


async function _test_decompile_mutable(decompile,expect)
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
}


async function _test_decompile_builtin(decompile,expect)
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
}


async function _test_decompile_fileattachment(decompile,expect)
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
}


async function _test_decompile_mutable_dependancy(decompile,expect)
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
}


async function _test_decompile_mutable_dependancy_2(decompile,expect)
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
}


async function _test_decompile_viewof_dep(decompile,expect)
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
}


async function _test_decompile_viewof_data_dep(decompile,expect)
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
}


async function _test_decompile_viewof_param(decompile,expect)
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
}


async function _test_decompile_anon_dep(decompile,expect)
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
}


async function _test_decompile_import_mutable(decompile,expect)
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
}


async function _test_decompile_import_viewof(decompile,expect)
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
}


async function _test_decompile_viewof_data(decompile,expect)
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
}


async function _test_decompile_import_alias(decompile,expect)
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
}


async function _test_decompile_import_mutable_alias(decompile,expect)
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
}


async function _test_decompile_import_mutable_data_alias(decompile,expect)
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
}


async function _test_decompile_import_viewof_alias(decompile,expect)
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
}


async function _test_decompile_import_viewof_data_alias(decompile,expect)
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
}


function _80(md){return(
md`### The Decompiler`
)}

function _81(md){return(
md`### \`decompile\``
)}

function _decompile(decompileImport,formatImportDeclaration,acorn){return(
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
)}

function _83(md){return(
md`### \`extractModuleInfo\` 
static analysis of module imports`
)}

function _extractModuleInfo(){return(
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
)}

function _test_extractModuleInfo_notebook_resolution(expect,extractModuleInfo)
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
}


function _test_extractModuleInfo_id_version_resolution(expect,extractModuleInfo)
{
  expect(
    extractModuleInfo(
      'async () => runtime.module((await import("/d/c2dae147641e012a@46.js?v=4&resolutions=03dda470c56b93ff@4883")).default)'
    )
  ).toEqual({ id: "c2dae147641e012a", version: "46" });
  return "ok";
}


function _test_extractModuleInfo_id_version(expect,extractModuleInfo)
{
  expect(
    extractModuleInfo(
      'async () => runtime.module((await import("d/58f3eb7334551ae6@215")).default)'
    )
  ).toEqual({ id: "58f3eb7334551ae6", version: "215" });
  return "ok";
}


function _test_extractModuleInfo_test_4(expect,extractModuleInfo)
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
}


function _test_extractModuleInfo_alias_hack(expect,extractModuleInfo)
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
}


function _90(md){return(
md`### \`findModuleName\` and \`findImportedName\``
)}

function _import_ast_example(parser){return(
parser.parseCell(
  'import {runtime, viewof main as foo} from "@mootari/access-runtime"'
)
)}

function _findModuleName(extractModuleInfo){return(
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
)}

function _findImportedName(){return(
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
)}

function _94(md){return(
md`### \`decompileImport\``
)}

function _decompileImport(findModuleName,findImportedName)
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
}


function _formatImportDeclaration(){return(
function formatImportDeclaration(importInfo) {
  if (!importInfo || importInfo.type !== "import")
    throw new Error("not an importInfo object");
  const specifiers = (importInfo.specifiers || []).map((s) =>
    s.imported === s.local ? s.local : `${s.imported} as ${s.local}`
  );
  return `import {${specifiers.join(", ")}} from "${importInfo.from}"`;
}
)}

async function _test_decompileImport_basic(importFake,decompileImport,expect)
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
}


async function _test_formatImportDeclaration_roundtrip(importFake,decompileImport,expect,formatImportDeclaration,decompile)
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
}


async function _test_decompileImport_alias(importFake,decompileImport,expect,formatImportDeclaration)
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
}


function _100(md){return(
md`## Javascript Source Normalization`
)}

function _variableToObject(){return(
(v) => ({
  _name: v._name,
  _definition: v._definition.toString(),
  _inputs: v._inputs.map((v) => v._name || v)
})
)}

function _102(md){return(
md`## Observable Source Normalization`
)}

function _normalizeObservableSourceSelector(Inputs,notebook_semantics_source){return(
Inputs.select(
  notebook_semantics_source.map((s) => s.value),
  { label: "test case", value: "1" }
)
)}

function _parsed(parser,normalizeObservableSourceSelector){return(
parser.parseCell(normalizeObservableSourceSelector)
)}

function _105(md){return(
md`## The Compiler

`
)}

function _test_async_interpolation(compile){return(
eval(
  "let _fn = " +
    compile("md`${await FileAttachment('image@1.png').url() }`")[0]._definition
)
)}

async function _test_compile_syntax_error_viewof(compile,expect)
{
  const compiled = await compile(`viewof bar = () => return ""`);
  expect(compiled.length).toEqual(1);
  expect(compiled[0]._name).toEqual("viewof bar");
  return "ok";
}


async function _test_compile_syntax_error_anonymous(compile,expect)
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
}


async function _test_compile_syntax_error_named(compile,expect)
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
}


async function _test_compile_integer(compile,expect)
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
}


async function _test_compile_string(compile,expect)
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
}


async function _test_compile_obj_literal(compile,expect)
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
}


async function _test_compile_assignment(compile,expect)
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
}


async function _test_compile_dependancy(compile,expect)
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
}


async function _test_compile_block_dependancy(compile,expect)
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
}


async function _test_compile_comments(compile,expect)
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
}


async function _test_compile_generator(compile,expect)
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
}


async function _test_compile_function(compile,expect)
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
}


async function _test_compile_async_function(compile,expect)
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
}


async function _test_compile_named_function(compile,expect)
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
}


async function _test_compile_this_reference(compile,expect)
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
}


async function _test_compile_lambda(compile,expect)
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
}


async function _test_compile_error(compile,expect)
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
}


async function _test_compile_viewof(compile,expect)
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
}


function _test_compile_viewof_and_value_coexist(compile,expect)
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
}


async function _test_compile_mutable(compile,expect)
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
}


async function _test_compile_builtin(compile,expect)
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
}


async function _test_compile_fileattachment(compile,expect)
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
}


async function _test_compile_mutable_dep(compile,expect)
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
}


async function _test_compile_mutable_dep2(compile,expect)
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
}


async function _test_compile_inline_viewof(compile,expect)
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
}


async function _test_compile_view_dep(compile,expect)
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
}


async function _test_compile_dep(compile,expect)
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
}


async function _test_compile_class(compile,expect)
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
}


async function _test_compile_event(compile,expect)
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
}


async function _test_compile_tagged_literal(compile,expect)
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
}


function _compile_unit_test_template(Inputs,test_case,compiled){return(
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
)}

async function _test_compile_import_plain_single(compile,expect)
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
}


async function _test_compile_import_view_data_alias_single(compile,expect)
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
}


async function _test_compile_import_mutable_data_alias_single(compile,expect)
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
}


async function _test_compile_import_mutable_single(compile,expect)
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
}


async function _test_compile_import_viewof_single(compile,expect)
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
}


async function _test_compile_import_alias_single(compile,expect)
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
}


async function _test_compile_import_notebook(compile,expect)
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
}


function _test_case(Inputs,notebook_semantics_source){return(
Inputs.select(
  notebook_semantics_source.filter((s) => s.mode == "js"),
  {
    label: "compilation test case",
    format: (v) => v.value
  }
)
)}

function _146(test_case){return(
test_case.value
)}

async function _compiled(compile,test_case){return(
await compile(test_case.value)
)}

function _148(parser,test_case)
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
}


function _149(compile,test_case){return(
compile(test_case.value)
)}

function _compile(parser,observableToJs){return(
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
)}

function _observableToJs(acorn_walk,parser){return(
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
)}

function _152(md){return(
md`### Bundled deps`
)}

function _decompress_url(DecompressionStream,TextDecoderStream,TransformStream,TextEncoderStream,Response){return(
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
)}

async function _parser(decompress_url,FileAttachment,acorn_url,acorn_walk_url){return(
import(
  await decompress_url(FileAttachment("parser-6.1.0.js.gz"), {
    "/npm/acorn@8.11.3/+esm": acorn_url,
    "/npm/acorn-walk@8.3.2/+esm": acorn_walk_url
  })
)
)}

function _stageB_importFake()
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
}


async function _test_decompileImport_stageB_single(stageB_importFake,decompileImport,expect,formatImportDeclaration)
{
  const vars = stageB_importFake('@tomlarkworthy/visualizer', [{
      imported: 'visualize',
      local: 'visualize'
    }]);
  const info = await decompileImport(vars);
  expect(info.meta.detection.stage).toEqual('B');
  expect(formatImportDeclaration(info)).toEqual(`import {visualize} from "@tomlarkworthy/visualizer"`);
  return 'ok';
}


async function _test_decompileImport_stageB_aliased(stageB_importFake,decompileImport,expect,formatImportDeclaration)
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
}


async function _test_decompileImport_stageB_multiple(stageB_importFake,decompileImport,expect,formatImportDeclaration)
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
}


async function _test_decompileImport_stageB_mixed_alias(stageB_importFake,decompileImport,expect,formatImportDeclaration)
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
}


async function _test_decompileImport_stageB_viewof(stageB_importFake,decompileImport,expect,formatImportDeclaration)
{
  const vars = stageB_importFake('@tomlarkworthy/module-map', [{
      imported: 'viewof currentModules',
      local: 'viewof currentModules'
    }]);
  const info = await decompileImport(vars);
  expect(info.meta.detection.stage).toEqual('B');
  expect(formatImportDeclaration(info)).toEqual(`import {viewof currentModules} from "@tomlarkworthy/module-map"`);
  return 'ok';
}


async function _test_decompileImport_stageB_mutable(stageB_importFake,decompileImport,expect,formatImportDeclaration)
{
  const vars = stageB_importFake('@user/y', [{
      imported: 'mutable counter',
      local: 'mutable counter'
    }]);
  const info = await decompileImport(vars);
  expect(info.meta.detection.stage).toEqual('B');
  expect(formatImportDeclaration(info)).toEqual(`import {mutable counter} from "@user/y"`);
  return 'ok';
}


async function _test_decompileImport_returns_null_for_non_import(decompileImport,expect)
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
}


async function _test_decompileImport_compile_roundtrip_single(compile,expect,stageB_importFake,decompileImport,formatImportDeclaration)
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
}


async function _test_decompileImport_stageB_order_independent(stageB_importFake,decompileImport,expect,formatImportDeclaration)
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
}


async function _test_decompileImport_stageB_notebook_id(stageB_importFake,decompileImport,expect,formatImportDeclaration)
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
}


function _test_extractModuleInfo_new_id_resolutions(expect,extractModuleInfo)
{
  // new.observablehq.com d/<id>@<ver> import with resolutions=.
  expect(
    extractModuleInfo(
      'async () => runtime.module((await import("/d/e1c39d41e8e944b0@939.js?v=4&resolutions=a6a56ee61aba9799@437")).default)'
    )
  ).toEqual({ id: "e1c39d41e8e944b0", version: "939" });
  return "ok";
}


function _test_extractModuleInfo_new_slug_resolutions(expect,extractModuleInfo)
{
  // new.observablehq.com slug import carries a resolutions= param.
  expect(
    extractModuleInfo(
      'async () => runtime.module((await import("/@mootari/access-runtime.js?v=4&resolutions=98f34e974bb2e4bc@1392")).default)'
    )
  ).toEqual({ namespace: "mootari", notebook: "access-runtime", version: "1392" });
  return "ok";
}


function _test_findModuleName_classic_bundle(expect,findModuleName)
{
  // classic observablehq.com bundles imports; the holder def is a bare slug import.
  const m = {}; // module sentinel
  const scope = new Map([
    ["module 1", { _name: "module 1", _value: m,
      _definition: 'async () => runtime.module((await import("@tomlarkworthy/flow-queue")).default)' }]
  ]);
  expect(findModuleName(scope, m)).toEqual("@tomlarkworthy/flow-queue");
  return "ok";
}


function _test_findModuleName_kit_slug(expect,findModuleName)
{
  // Notebook Kit compiles observable imports to import("https://api.observablehq.com/@u/nb.js?v=4").
  const m = {}; // module sentinel
  const scope = new Map([
    ["module 1", { _name: "module 1", _value: m,
      _definition: 'async (__ojs_runtime) => __ojs_runtime.module((await import("https://api.observablehq.com/@d3/color-legend.js?v=4")).default)' }]
  ]);
  expect(findModuleName(scope, m)).toEqual("@d3/color-legend");
  return "ok";
}


function _test_findModuleName_new_id(expect,findModuleName)
{
  const m = {}; // module sentinel
  const scope = new Map([
    ["module 1", { _name: "module 1", _value: m,
      _definition: 'async () => runtime.module((await import("/d/e1c39d41e8e944b0@939.js?v=4&resolutions=a6a56ee61aba9799@437")).default)' }]
  ]);
  expect(findModuleName(scope, m)).toEqual("d/e1c39d41e8e944b0@939");
  return "ok";
}


function _test_findModuleName_new_slug(expect,findModuleName)
{
  const m = {}; // module sentinel
  const scope = new Map([
    ["module 1", { _name: "module 1", _value: m,
      _definition: 'async () => runtime.module((await import("/@mootari/access-runtime.js?v=4&resolutions=98f34e974bb2e4bc@1392")).default)' }]
  ]);
  expect(findModuleName(scope, m)).toEqual("@mootari/access-runtime");
  return "ok";
}


async function _test_decompile_leading_comment(decompile,expect,compile)
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
}


async function _test_decompile_trailing_comment(decompile,expect)
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
}


async function _test_decompile_param_in_string(decompile,expect)
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
}


async function _test_decompile_class_property_field(decompile,expect)
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
}


async function _test_compile_preserves_formatting(compile,expect)
{
  // Source-preserving compile keeps quote style and template spacing verbatim;
  // escodegen used to re-quote ("h1" -> 'h1') and respace (${s} -> ${ s }).
  const compiled = await compile('x = { const s = "h1"; return `${s}`; }');
  expect(compiled[0]._definition).toEqual('function _x() { const s = "h1"; return `${s}`; }');
  return "ok";
}


export default function define(runtime, observer) {
  const main = runtime.module();
  main.define("module 1", async () => runtime.module((await import("/@tomlarkworthy/tests.js?v=4&resolutions=e3a019069a130d79@7847")).default));
  main.define("module 2", async () => runtime.module((await import("/@tomlarkworthy/cell-map.js?v=4&resolutions=e3a019069a130d79@7847")).default));
  main.define("module 3", async () => runtime.module((await import("/@tomlarkworthy/acorn-8-11-3.js?v=4&resolutions=e3a019069a130d79@7847")).default));
  main.define("module 4", async () => runtime.module((await import("/@tomlarkworthy/jest-expect-standalone.js?v=4&resolutions=e3a019069a130d79@7847")).default));
  main.define("module 5", async () => runtime.module((await import("/@tomlarkworthy/observable-runtime.js?v=4&resolutions=e3a019069a130d79@7847")).default));
  const fileAttachments = new Map([
    ["parser-6.1.0.js.gz", {url: "https://static.observableusercontent.com/files/36c11e4bac3ebe9047f79a4b9f2ed1554e7d684bbb421e5e466a888e8cb074e5e466e67930075ad8887e2281609649c21f7f7ce7484771268670298c77bd6dbc", mimeType: "application/gzip"}]
  ]);
  main.builtin("FileAttachment", runtime.fileAttachments(name => fileAttachments.get(name)));
  main.variable(observer()).define(["md"], _1);
  main.variable(observer()).define(["md"], _2);
  main.variable(observer()).define(["md"], _3);
  main.variable(observer()).define(["md"], _4);
  main.variable(observer()).define(["md"], _5);
  main.variable(observer()).define(["md"], _6);
  main.variable(observer()).define(["md"], _7);
  main.define("tests", ["module 1", "@variable"], (_, v) => v.import("tests", _));
  main.define("viewof runtime_variables", ["module 1", "@variable"], (_, v) => v.import("viewof runtime_variables", _));
  main.define("runtime_variables", ["module 1", "@variable"], (_, v) => v.import("runtime_variables", _));
  main.define("modules", ["module 1", "@variable"], (_, v) => v.import("modules", _));
  main.variable(observer()).define(["tests"], _9);
  main.variable(observer()).define(["md"], _10);
  main.variable(observer("cellMaps")).define("cellMaps", ["cellMap"], _cellMaps);
  main.variable(observer("allCells")).define("allCells", ["cellMaps"], _allCells);
  main.variable(observer("all_decompiled")).define("all_decompiled", ["allCells","decompile"], _all_decompiled);
  main.variable(observer("test_all_cells_decompilable")).define("test_all_cells_decompilable", ["all_decompiled"], _test_all_cells_decompilable);
  main.variable(observer()).define(["md"], _15);
  main.variable(observer("all_compiled")).define("all_compiled", ["all_decompiled","compile"], _all_compiled);
  main.variable(observer("test_decompiled_cells_recompilable")).define("test_decompiled_cells_recompilable", ["all_compiled"], _test_decompiled_cells_recompilable);
  main.variable(observer()).define(["md"], _18);
  main.variable(observer("roundtripped")).define("roundtripped", ["all_compiled","decompile"], _roundtripped);
  main.variable(observer("test_all_cells_roundtrippable")).define("test_all_cells_roundtrippable", ["roundtripped"], _test_all_cells_roundtrippable);
  main.variable(observer()).define(["md"], _21);
  main.variable(observer()).define(["md"], _22);
  main.variable(observer("dependancy_document")).define("dependancy_document", _dependancy_document);
  main.variable(observer("dependancy_source")).define("dependancy_source", ["dependancy_document"], _dependancy_source);
  main.variable(observer()).define(["md"], _25);
  main.variable(observer("notebook_semantics_document")).define("notebook_semantics_document", _notebook_semantics_document);
  main.variable(observer("notebook_semantics_source")).define("notebook_semantics_source", ["notebook_semantics_document","parser"], _notebook_semantics_source);
  main.variable(observer()).define(["md"], _28);
  main.variable(observer("notebook_semantics_module")).define("notebook_semantics_module", _notebook_semantics_module);
  main.define("cellMap", ["module 2", "@variable"], (_, v) => v.import("cellMap", _));
  main.define("moduleMap", ["module 2", "@variable"], (_, v) => v.import("moduleMap", _));
  main.variable(observer()).define(["md"], _31);
  main.variable(observer()).define(["md"], _32);
  main.variable(observer()).define(["md"], _33);
  main.variable(observer()).define(["md"], _34);
  main.variable(observer("importFake")).define("importFake", ["Runtime"], _importFake);
  main.variable(observer("test_decompile_syntax_error_roundtrip")).define("test_decompile_syntax_error_roundtrip", ["compile","decompile","expect"], _test_decompile_syntax_error_roundtrip);
  main.variable(observer("test_decompile_$variable")).define("test_decompile_$variable", ["decompile","expect"], _test_decompile_$variable);
  main.variable(observer("test_decompile_import_variable")).define("test_decompile_import_variable", ["decompile","importFake","expect"], _test_decompile_import_variable);
  main.variable(observer("test_decompile_dollar_in_string_literal")).define("test_decompile_dollar_in_string_literal", ["decompile","expect"], _test_decompile_dollar_in_string_literal);
  main.variable(observer("test_decompile_import_variable_alias")).define("test_decompile_import_variable_alias", ["decompile","importFake","expect"], _test_decompile_import_variable_alias);
  main.variable(observer("test_decompile_import_many")).define("test_decompile_import_many", ["decompile","importFake","expect"], _test_decompile_import_many);
  main.variable(observer("test_decompile_markdown_cell")).define("test_decompile_markdown_cell", ["decompile","expect"], _test_decompile_markdown_cell);
  main.variable(observer("test_decompile_constant")).define("test_decompile_constant", ["decompile","expect"], _test_decompile_constant);
  main.variable(observer("test_decompile_string_literal")).define("test_decompile_string_literal", ["decompile","expect"], _test_decompile_string_literal);
  main.variable(observer("test_decompile_html_cell")).define("test_decompile_html_cell", ["decompile","expect"], _test_decompile_html_cell);
  main.variable(observer("test_decompile_class")).define("test_decompile_class", ["decompile","expect"], _test_decompile_class);
  main.variable(observer("test_decompile_class_with_property")).define("test_decompile_class_with_property", ["decompile"], _test_decompile_class_with_property);
  main.variable(observer("test_decompile_object_literal")).define("test_decompile_object_literal", ["decompile","expect"], _test_decompile_object_literal);
  main.variable(observer("test_decompile_reference")).define("test_decompile_reference", ["decompile","expect"], _test_decompile_reference);
  main.variable(observer("test_decompile_block")).define("test_decompile_block", ["decompile","expect"], _test_decompile_block);
  main.variable(observer("test_decompile_comments")).define("test_decompile_comments", ["decompile","expect"], _test_decompile_comments);
  main.variable(observer("test_decompile_generator")).define("test_decompile_generator", ["decompile","expect"], _test_decompile_generator);
  main.variable(observer("test_decompile_function")).define("test_decompile_function", ["decompile","expect"], _test_decompile_function);
  main.variable(observer("test_decompile_async_function")).define("test_decompile_async_function", ["decompile","expect"], _test_decompile_async_function);
  main.variable(observer("test_decompile_named_function")).define("test_decompile_named_function", ["decompile","expect"], _test_decompile_named_function);
  main.variable(observer("test_decompile_this_reference")).define("test_decompile_this_reference", ["decompile","expect"], _test_decompile_this_reference);
  main.variable(observer("test_decompile_lambda")).define("test_decompile_lambda", ["decompile","expect"], _test_decompile_lambda);
  main.variable(observer("test_decompile_error")).define("test_decompile_error", ["decompile","expect"], _test_decompile_error);
  main.variable(observer("test_decompile_error_object")).define("test_decompile_error_object", ["decompile","expect"], _test_decompile_error_object);
  main.variable(observer()).define(["md"], _60);
  main.variable(observer("test_decompile_anon_error_dep")).define("test_decompile_anon_error_dep", ["decompile","expect"], _test_decompile_anon_error_dep);
  main.variable(observer("test_decompile_viewof")).define("test_decompile_viewof", ["decompile","expect"], _test_decompile_viewof);
  main.variable(observer("test_decompile_mutable")).define("test_decompile_mutable", ["decompile","expect"], _test_decompile_mutable);
  main.variable(observer("test_decompile_builtin")).define("test_decompile_builtin", ["decompile","expect"], _test_decompile_builtin);
  main.variable(observer("test_decompile_fileattachment")).define("test_decompile_fileattachment", ["decompile","expect"], _test_decompile_fileattachment);
  main.variable(observer("test_decompile_mutable_dependancy")).define("test_decompile_mutable_dependancy", ["decompile","expect"], _test_decompile_mutable_dependancy);
  main.variable(observer("test_decompile_mutable_dependancy_2")).define("test_decompile_mutable_dependancy_2", ["decompile","expect"], _test_decompile_mutable_dependancy_2);
  main.variable(observer("test_decompile_viewof_dep")).define("test_decompile_viewof_dep", ["decompile","expect"], _test_decompile_viewof_dep);
  main.variable(observer("test_decompile_viewof_data_dep")).define("test_decompile_viewof_data_dep", ["decompile","expect"], _test_decompile_viewof_data_dep);
  main.variable(observer("test_decompile_viewof_param")).define("test_decompile_viewof_param", ["decompile","expect"], _test_decompile_viewof_param);
  main.variable(observer("test_decompile_anon_dep")).define("test_decompile_anon_dep", ["decompile","expect"], _test_decompile_anon_dep);
  main.variable(observer("test_decompile_import_mutable")).define("test_decompile_import_mutable", ["decompile","expect"], _test_decompile_import_mutable);
  main.variable(observer("test_decompile_import_viewof")).define("test_decompile_import_viewof", ["decompile","expect"], _test_decompile_import_viewof);
  main.variable(observer("test_decompile_viewof_data")).define("test_decompile_viewof_data", ["decompile","expect"], _test_decompile_viewof_data);
  main.variable(observer("test_decompile_import_alias")).define("test_decompile_import_alias", ["decompile","expect"], _test_decompile_import_alias);
  main.variable(observer("test_decompile_import_mutable_alias")).define("test_decompile_import_mutable_alias", ["decompile","expect"], _test_decompile_import_mutable_alias);
  main.variable(observer("test_decompile_import_mutable_data_alias")).define("test_decompile_import_mutable_data_alias", ["decompile","expect"], _test_decompile_import_mutable_data_alias);
  main.variable(observer("test_decompile_import_viewof_alias")).define("test_decompile_import_viewof_alias", ["decompile","expect"], _test_decompile_import_viewof_alias);
  main.variable(observer("test_decompile_import_viewof_data_alias")).define("test_decompile_import_viewof_data_alias", ["decompile","expect"], _test_decompile_import_viewof_data_alias);
  main.variable(observer()).define(["md"], _80);
  main.variable(observer()).define(["md"], _81);
  main.variable(observer("decompile")).define("decompile", ["decompileImport","formatImportDeclaration","acorn"], _decompile);
  main.variable(observer()).define(["md"], _83);
  main.variable(observer("extractModuleInfo")).define("extractModuleInfo", _extractModuleInfo);
  main.variable(observer("test_extractModuleInfo_notebook_resolution")).define("test_extractModuleInfo_notebook_resolution", ["expect","extractModuleInfo"], _test_extractModuleInfo_notebook_resolution);
  main.variable(observer("test_extractModuleInfo_id_version_resolution")).define("test_extractModuleInfo_id_version_resolution", ["expect","extractModuleInfo"], _test_extractModuleInfo_id_version_resolution);
  main.variable(observer("test_extractModuleInfo_id_version")).define("test_extractModuleInfo_id_version", ["expect","extractModuleInfo"], _test_extractModuleInfo_id_version);
  main.variable(observer("test_extractModuleInfo_test_4")).define("test_extractModuleInfo_test_4", ["expect","extractModuleInfo"], _test_extractModuleInfo_test_4);
  main.variable(observer("test_extractModuleInfo_alias_hack")).define("test_extractModuleInfo_alias_hack", ["expect","extractModuleInfo"], _test_extractModuleInfo_alias_hack);
  main.variable(observer()).define(["md"], _90);
  main.variable(observer("import_ast_example")).define("import_ast_example", ["parser"], _import_ast_example);
  main.variable(observer("findModuleName")).define("findModuleName", ["extractModuleInfo"], _findModuleName);
  main.variable(observer("findImportedName")).define("findImportedName", _findImportedName);
  main.variable(observer()).define(["md"], _94);
  main.variable(observer("decompileImport")).define("decompileImport", ["findModuleName","findImportedName"], _decompileImport);
  main.variable(observer("formatImportDeclaration")).define("formatImportDeclaration", _formatImportDeclaration);
  main.variable(observer("test_decompileImport_basic")).define("test_decompileImport_basic", ["importFake","decompileImport","expect"], _test_decompileImport_basic);
  main.variable(observer("test_formatImportDeclaration_roundtrip")).define("test_formatImportDeclaration_roundtrip", ["importFake","decompileImport","expect","formatImportDeclaration","decompile"], _test_formatImportDeclaration_roundtrip);
  main.variable(observer("test_decompileImport_alias")).define("test_decompileImport_alias", ["importFake","decompileImport","expect","formatImportDeclaration"], _test_decompileImport_alias);
  main.variable(observer()).define(["md"], _100);
  main.variable(observer("variableToObject")).define("variableToObject", _variableToObject);
  main.variable(observer()).define(["md"], _102);
  main.variable(observer("viewof normalizeObservableSourceSelector")).define("viewof normalizeObservableSourceSelector", ["Inputs","notebook_semantics_source"], _normalizeObservableSourceSelector);
  main.variable(observer("normalizeObservableSourceSelector")).define("normalizeObservableSourceSelector", ["Generators", "viewof normalizeObservableSourceSelector"], (G, _) => G.input(_));
  main.variable(observer("parsed")).define("parsed", ["parser","normalizeObservableSourceSelector"], _parsed);
  main.variable(observer()).define(["md"], _105);
  main.variable(observer("test_async_interpolation")).define("test_async_interpolation", ["compile"], _test_async_interpolation);
  main.variable(observer("test_compile_syntax_error_viewof")).define("test_compile_syntax_error_viewof", ["compile","expect"], _test_compile_syntax_error_viewof);
  main.variable(observer("test_compile_syntax_error_anonymous")).define("test_compile_syntax_error_anonymous", ["compile","expect"], _test_compile_syntax_error_anonymous);
  main.variable(observer("test_compile_syntax_error_named")).define("test_compile_syntax_error_named", ["compile","expect"], _test_compile_syntax_error_named);
  main.variable(observer("test_compile_integer")).define("test_compile_integer", ["compile","expect"], _test_compile_integer);
  main.variable(observer("test_compile_string")).define("test_compile_string", ["compile","expect"], _test_compile_string);
  main.variable(observer("test_compile_obj_literal")).define("test_compile_obj_literal", ["compile","expect"], _test_compile_obj_literal);
  main.variable(observer("test_compile_assignment")).define("test_compile_assignment", ["compile","expect"], _test_compile_assignment);
  main.variable(observer("test_compile_dependancy")).define("test_compile_dependancy", ["compile","expect"], _test_compile_dependancy);
  main.variable(observer("test_compile_block_dependancy")).define("test_compile_block_dependancy", ["compile","expect"], _test_compile_block_dependancy);
  main.variable(observer("test_compile_comments")).define("test_compile_comments", ["compile","expect"], _test_compile_comments);
  main.variable(observer("test_compile_generator")).define("test_compile_generator", ["compile","expect"], _test_compile_generator);
  main.variable(observer("test_compile_function")).define("test_compile_function", ["compile","expect"], _test_compile_function);
  main.variable(observer("test_compile_async_function")).define("test_compile_async_function", ["compile","expect"], _test_compile_async_function);
  main.variable(observer("test_compile_named_function")).define("test_compile_named_function", ["compile","expect"], _test_compile_named_function);
  main.variable(observer("test_compile_this_reference")).define("test_compile_this_reference", ["compile","expect"], _test_compile_this_reference);
  main.variable(observer("test_compile_lambda")).define("test_compile_lambda", ["compile","expect"], _test_compile_lambda);
  main.variable(observer("test_compile_error")).define("test_compile_error", ["compile","expect"], _test_compile_error);
  main.variable(observer("test_compile_viewof")).define("test_compile_viewof", ["compile","expect"], _test_compile_viewof);
  main.variable(observer("test_compile_viewof_and_value_coexist")).define("test_compile_viewof_and_value_coexist", ["compile","expect"], _test_compile_viewof_and_value_coexist);
  main.variable(observer("test_compile_mutable")).define("test_compile_mutable", ["compile","expect"], _test_compile_mutable);
  main.variable(observer("test_compile_builtin")).define("test_compile_builtin", ["compile","expect"], _test_compile_builtin);
  main.variable(observer("test_compile_fileattachment")).define("test_compile_fileattachment", ["compile","expect"], _test_compile_fileattachment);
  main.variable(observer("test_compile_mutable_dep")).define("test_compile_mutable_dep", ["compile","expect"], _test_compile_mutable_dep);
  main.variable(observer("test_compile_mutable_dep2")).define("test_compile_mutable_dep2", ["compile","expect"], _test_compile_mutable_dep2);
  main.variable(observer("test_compile_inline_viewof")).define("test_compile_inline_viewof", ["compile","expect"], _test_compile_inline_viewof);
  main.variable(observer("test_compile_view_dep")).define("test_compile_view_dep", ["compile","expect"], _test_compile_view_dep);
  main.variable(observer("test_compile_dep")).define("test_compile_dep", ["compile","expect"], _test_compile_dep);
  main.variable(observer("test_compile_class")).define("test_compile_class", ["compile","expect"], _test_compile_class);
  main.variable(observer("test_compile_event")).define("test_compile_event", ["compile","expect"], _test_compile_event);
  main.variable(observer("test_compile_tagged_literal")).define("test_compile_tagged_literal", ["compile","expect"], _test_compile_tagged_literal);
  main.variable(observer("compile_unit_test_template")).define("compile_unit_test_template", ["Inputs","test_case","compiled"], _compile_unit_test_template);
  main.variable(observer("test_compile_import_plain_single")).define("test_compile_import_plain_single", ["compile","expect"], _test_compile_import_plain_single);
  main.variable(observer("test_compile_import_view_data_alias_single")).define("test_compile_import_view_data_alias_single", ["compile","expect"], _test_compile_import_view_data_alias_single);
  main.variable(observer("test_compile_import_mutable_data_alias_single")).define("test_compile_import_mutable_data_alias_single", ["compile","expect"], _test_compile_import_mutable_data_alias_single);
  main.variable(observer("test_compile_import_mutable_single")).define("test_compile_import_mutable_single", ["compile","expect"], _test_compile_import_mutable_single);
  main.variable(observer("test_compile_import_viewof_single")).define("test_compile_import_viewof_single", ["compile","expect"], _test_compile_import_viewof_single);
  main.variable(observer("test_compile_import_alias_single")).define("test_compile_import_alias_single", ["compile","expect"], _test_compile_import_alias_single);
  main.variable(observer("test_compile_import_notebook")).define("test_compile_import_notebook", ["compile","expect"], _test_compile_import_notebook);
  main.variable(observer("viewof test_case")).define("viewof test_case", ["Inputs","notebook_semantics_source"], _test_case);
  main.variable(observer("test_case")).define("test_case", ["Generators", "viewof test_case"], (G, _) => G.input(_));
  main.variable(observer()).define(["test_case"], _146);
  main.variable(observer("compiled")).define("compiled", ["compile","test_case"], _compiled);
  main.variable(observer()).define(["parser","test_case"], _148);
  main.variable(observer()).define(["compile","test_case"], _149);
  main.variable(observer("compile")).define("compile", ["parser","observableToJs"], _compile);
  main.variable(observer("observableToJs")).define("observableToJs", ["acorn_walk","parser"], _observableToJs);
  main.variable(observer()).define(["md"], _152);
  main.variable(observer("decompress_url")).define("decompress_url", ["DecompressionStream","TextDecoderStream","TransformStream","TextEncoderStream","Response"], _decompress_url);
  main.variable(observer("parser")).define("parser", ["decompress_url","FileAttachment","acorn_url","acorn_walk_url"], _parser);
  main.define("acorn", ["module 3", "@variable"], (_, v) => v.import("acorn", _));
  main.define("acorn_url", ["module 3", "@variable"], (_, v) => v.import("acorn_url", _));
  main.define("acorn_walk", ["module 3", "@variable"], (_, v) => v.import("acorn_walk", _));
  main.define("acorn_walk_url", ["module 3", "@variable"], (_, v) => v.import("acorn_walk_url", _));
  main.define("expect", ["module 4", "@variable"], (_, v) => v.import("expect", _));
  main.define("Runtime", ["module 5", "@variable"], (_, v) => v.import("Runtime", _));
  main.define("Inspector", ["module 5", "@variable"], (_, v) => v.import("Inspector", _));
  main.define("Library", ["module 5", "@variable"], (_, v) => v.import("Library", _));
  main.define("RuntimeError", ["module 5", "@variable"], (_, v) => v.import("RuntimeError", _));
  main.variable(observer("stageB_importFake")).define("stageB_importFake", _stageB_importFake);
  main.variable(observer("test_decompileImport_stageB_single")).define("test_decompileImport_stageB_single", ["stageB_importFake","decompileImport","expect","formatImportDeclaration"], _test_decompileImport_stageB_single);
  main.variable(observer("test_decompileImport_stageB_aliased")).define("test_decompileImport_stageB_aliased", ["stageB_importFake","decompileImport","expect","formatImportDeclaration"], _test_decompileImport_stageB_aliased);
  main.variable(observer("test_decompileImport_stageB_multiple")).define("test_decompileImport_stageB_multiple", ["stageB_importFake","decompileImport","expect","formatImportDeclaration"], _test_decompileImport_stageB_multiple);
  main.variable(observer("test_decompileImport_stageB_mixed_alias")).define("test_decompileImport_stageB_mixed_alias", ["stageB_importFake","decompileImport","expect","formatImportDeclaration"], _test_decompileImport_stageB_mixed_alias);
  main.variable(observer("test_decompileImport_stageB_viewof")).define("test_decompileImport_stageB_viewof", ["stageB_importFake","decompileImport","expect","formatImportDeclaration"], _test_decompileImport_stageB_viewof);
  main.variable(observer("test_decompileImport_stageB_mutable")).define("test_decompileImport_stageB_mutable", ["stageB_importFake","decompileImport","expect","formatImportDeclaration"], _test_decompileImport_stageB_mutable);
  main.variable(observer("test_decompileImport_returns_null_for_non_import")).define("test_decompileImport_returns_null_for_non_import", ["decompileImport","expect"], _test_decompileImport_returns_null_for_non_import);
  main.variable(observer("test_decompileImport_compile_roundtrip_single")).define("test_decompileImport_compile_roundtrip_single", ["compile","expect","stageB_importFake","decompileImport","formatImportDeclaration"], _test_decompileImport_compile_roundtrip_single);
  main.variable(observer("test_decompileImport_stageB_order_independent")).define("test_decompileImport_stageB_order_independent", ["stageB_importFake","decompileImport","expect","formatImportDeclaration"], _test_decompileImport_stageB_order_independent);
  main.variable(observer("test_decompileImport_stageB_notebook_id")).define("test_decompileImport_stageB_notebook_id", ["stageB_importFake","decompileImport","expect","formatImportDeclaration"], _test_decompileImport_stageB_notebook_id);
  main.variable(observer("test_extractModuleInfo_new_id_resolutions")).define("test_extractModuleInfo_new_id_resolutions", ["expect","extractModuleInfo"], _test_extractModuleInfo_new_id_resolutions);
  main.variable(observer("test_extractModuleInfo_new_slug_resolutions")).define("test_extractModuleInfo_new_slug_resolutions", ["expect","extractModuleInfo"], _test_extractModuleInfo_new_slug_resolutions);
  main.variable(observer("test_findModuleName_classic_bundle")).define("test_findModuleName_classic_bundle", ["expect","findModuleName"], _test_findModuleName_classic_bundle);
  main.variable(observer("test_findModuleName_kit_slug")).define("test_findModuleName_kit_slug", ["expect","findModuleName"], _test_findModuleName_kit_slug);
  main.variable(observer("test_findModuleName_new_id")).define("test_findModuleName_new_id", ["expect","findModuleName"], _test_findModuleName_new_id);
  main.variable(observer("test_findModuleName_new_slug")).define("test_findModuleName_new_slug", ["expect","findModuleName"], _test_findModuleName_new_slug);
  main.variable(observer("test_decompile_leading_comment")).define("test_decompile_leading_comment", ["decompile","expect","compile"], _test_decompile_leading_comment);
  main.variable(observer("test_decompile_trailing_comment")).define("test_decompile_trailing_comment", ["decompile","expect"], _test_decompile_trailing_comment);
  main.variable(observer("test_decompile_param_in_string")).define("test_decompile_param_in_string", ["decompile","expect"], _test_decompile_param_in_string);
  main.variable(observer("test_decompile_class_property_field")).define("test_decompile_class_property_field", ["decompile","expect"], _test_decompile_class_property_field);
  main.variable(observer("test_compile_preserves_formatting")).define("test_compile_preserves_formatting", ["compile","expect"], _test_compile_preserves_formatting);
  return main;
}
