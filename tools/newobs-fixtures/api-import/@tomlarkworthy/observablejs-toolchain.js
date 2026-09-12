const _5809 = async (__variable) => {
const {tests, runtime_variables, viewof$runtime_variables, modules} = await (import("./tests").then((_) => {
  const module = __variable._module._runtime.module(_.default);
  const outputs = new Map(Array.from(__variable._outputs, (v) => [v._name, v]));
  outputs.get("tests")?.import("tests", module);
  outputs.get("runtime_variables")?.import("runtime_variables", module);
  outputs.get("viewof$runtime_variables")?.import("viewof runtime_variables", "viewof$runtime_variables", module);
  outputs.get("modules")?.import("modules", module);
  return {};
}));

return {tests,runtime_variables,viewof$runtime_variables,modules};
};

const _5812 = function(tests){return(
tests()
)};

const _5840 = function cellMaps(cellMap){return(
cellMap()
)};

const _5852 = function allCells(cellMaps){return(
[...cellMaps.values()]
  .map((cells) =>
    [...cells.values()]
      .filter((c) => c.module !== "builtin")
      .map((c) => c.variables)
  )
  .flat()
)};

const _5992 = function all_decompiled(allCells,decompile){return(
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

const _5822 = function test_all_cells_decompilable(all_decompiled)
{
  const errors = all_decompiled.filter((s) => s.error);
  if (errors.length > 0) throw errors;
  return `${all_decompiled.length} cells decompiled without error`;
}
;

const _5967 = function all_compiled(all_decompiled,compile){return(
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

const _5881 = function test_decompiled_cells_recompilable(all_compiled)
{
  const errored = all_compiled.filter((cell) => cell.error);
  if (errored.length > 0) throw JSON.stringify(errored, null, 2);
  return `${all_compiled.length} cells recompiled without error`;
}
;

const _5896 = function roundtripped(all_compiled,decompile){return(
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

const _5950 = function test_all_cells_roundtrippable(roundtripped)
{
  const errored = roundtripped.filter((cell) => cell.error);
  if (errored.length > 0) throw JSON.stringify(errored, null, 2);
  return `${roundtripped.length} cells decompiled, recompiled and decompiled again without error`;
}
;

const _3302 = function dependancy_document(){return(
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

const _3379 = function dependancy_source(dependancy_document){return(
dependancy_document.nodes.map((s) => ({
  value: s.value,
  name: s.name
}))
)};

const _3304 = function notebook_semantics_document(){return(
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

const _3375 = function notebook_semantics_source(notebook_semantics_document,parser){return(
notebook_semantics_document.nodes.map((s) => ({
  value: s.value,
  name: s.mode == "js" ? parser.parseCell(s.value)?.id?.name : null,
  mode: s.mode
}))
)};

const _3340 = function notebook_semantics_module(){return(
import(
  "https://api.observablehq.com/@tomlarkworthy/notebook-semantics.js?v=4"
)
)};

const _6475 = async (__variable) => {
const {cellMap, moduleMap} = await (import("./cell-map").then((_) => {
  const module = __variable._module._runtime.module(_.default);
  const outputs = new Map(Array.from(__variable._outputs, (v) => [v._name, v]));
  outputs.get("cellMap")?.import("cellMap", module);
  outputs.get("moduleMap")?.import("moduleMap", module);
  return {};
}));

return {cellMap,moduleMap};
};

const _6519 = function importFake(Runtime){return(
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

const _6888 = async function test_decompile_syntax_error_roundtrip(compile,decompile,expect)
{
  const compiled = await compile(`foo = () => return ""`);
  const decompiled = await decompile(compiled);
  expect(decompiled).toEqual(`foo = () => return ""`);
  return "ok";
}
;

const _6083 = async function test_decompile_$variable(decompile,expect)
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
;

const _6579 = async function test_decompile_import_variable(decompile,importFake,expect)
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
;

const _7694 = async function test_decompile_dollar_in_string_literal(decompile,expect)
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
;

const _6587 = async function test_decompile_import_variable_alias(decompile,importFake,expect)
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
;

const _6091 = async function test_decompile_import_many(decompile,importFake,expect)
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
;

const _6098 = async function test_decompile_markdown_cell(decompile,expect)
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
;

const _6103 = async function test_decompile_constant(decompile,expect)
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
;

const _6109 = async function test_decompile_string_literal(decompile,expect)
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
;

const _6113 = async function test_decompile_html_cell(decompile,expect)
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
;

const _6143 = async function test_decompile_class(decompile,expect)
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
;

const _6007 = function test_decompile_class_with_property(decompile){return(
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

const _6146 = async function test_decompile_object_literal(decompile,expect)
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
;

const _6153 = async function test_decompile_reference(decompile,expect)
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
;

const _6155 = async function test_decompile_block(decompile,expect)
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
;

const _6162 = async function test_decompile_comments(decompile,expect)
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
;

const _6171 = async function test_decompile_generator(decompile,expect)
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
;

const _6184 = async function test_decompile_function(decompile,expect)
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
;

const _6186 = async function test_decompile_async_function(decompile,expect)
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
;

const _6188 = async function test_decompile_named_function(decompile,expect)
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
;

const _6190 = async function test_decompile_this_reference(decompile,expect)
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
;

const _6192 = async function test_decompile_lambda(decompile,expect)
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
;

const _6195 = async function test_decompile_error(decompile,expect)
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
;

const _6197 = async function test_decompile_error_object(decompile,expect)
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
;

const _6199 = async function test_decompile_anon_error_dep(decompile,expect)
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
;

const _6206 = async function test_decompile_viewof(decompile,expect)
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
;

const _6210 = async function test_decompile_mutable(decompile,expect)
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
;

const _6213 = async function test_decompile_builtin(decompile,expect)
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
;

const _6215 = async function test_decompile_fileattachment(decompile,expect)
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
;

const _6217 = async function test_decompile_mutable_dependancy(decompile,expect)
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
;

const _6221 = async function test_decompile_mutable_dependancy_2(decompile,expect)
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
;

const _6242 = async function test_decompile_viewof_dep(decompile,expect)
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
;

const _6244 = async function test_decompile_viewof_data_dep(decompile,expect)
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
;

const _6905 = async function test_decompile_viewof_param(decompile,expect)
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
;

const _6246 = async function test_decompile_anon_dep(decompile,expect)
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
;

const _6248 = async function test_decompile_import_mutable(decompile,expect)
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
;

const _6257 = async function test_decompile_import_viewof(decompile,expect)
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
;

const _6260 = async function test_decompile_viewof_data(decompile,expect)
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
;

const _6264 = async function test_decompile_import_alias(decompile,expect)
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
;

const _6266 = async function test_decompile_import_mutable_alias(decompile,expect)
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
;

const _6268 = async function test_decompile_import_mutable_data_alias(decompile,expect)
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
;

const _6270 = async function test_decompile_import_viewof_alias(decompile,expect)
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
;

const _6272 = async function test_decompile_import_viewof_data_alias(decompile,expect)
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
;

const _2964 = function decompile(decompileImport,formatImportDeclaration,acorn){return(
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

const _5086 = function extractModuleInfo(){return(
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

const _5419 = function test_extractModuleInfo_notebook_resolution(expect,extractModuleInfo)
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
;

const _5407 = function test_extractModuleInfo_id_version_resolution(expect,extractModuleInfo)
{
  expect(
    extractModuleInfo(
      'async () => runtime.module((await import("/d/c2dae147641e012a@46.js?v=4&resolutions=03dda470c56b93ff@4883")).default)'
    )
  ).toEqual({ id: "c2dae147641e012a", version: "46" });
  return "ok";
}
;

const _5574 = function test_extractModuleInfo_id_version(expect,extractModuleInfo)
{
  expect(
    extractModuleInfo(
      'async () => runtime.module((await import("d/58f3eb7334551ae6@215")).default)'
    )
  ).toEqual({ id: "58f3eb7334551ae6", version: "215" });
  return "ok";
}
;

const _5472 = function test_extractModuleInfo_test_4(expect,extractModuleInfo)
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
;

const _6075 = function test_extractModuleInfo_alias_hack(expect,extractModuleInfo)
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
;

const _5258 = function import_ast_example(parser){return(
parser.parseCell(
  'import {runtime, viewof main as foo} from "@mootari/access-runtime"'
)
)};

const _5074 = function findModuleName(extractModuleInfo){return(
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

const _5322 = function findImportedName(){return(
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

const _6800 = function decompileImport(findModuleName,findImportedName)
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
;

const _6803 = function formatImportDeclaration(){return(
function formatImportDeclaration(importInfo) {
  if (!importInfo || importInfo.type !== "import")
    throw new Error("not an importInfo object");
  const specifiers = (importInfo.specifiers || []).map((s) =>
    s.imported === s.local ? s.local : `${s.imported} as ${s.local}`
  );
  return `import {${specifiers.join(", ")}} from "${importInfo.from}"`;
}
)};

const _6807 = async function test_decompileImport_basic(importFake,decompileImport,expect)
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
;

const _6810 = async function test_formatImportDeclaration_roundtrip(importFake,decompileImport,expect,formatImportDeclaration,decompile)
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
;

const _6813 = async function test_decompileImport_alias(importFake,decompileImport,expect,formatImportDeclaration)
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
;

const _4163 = function variableToObject(){return(
(v) => ({
  _name: v._name,
  _definition: v._definition.toString(),
  _inputs: v._inputs.map((v) => v._name || v)
})
)};

const _3715 = function viewof$normalizeObservableSourceSelector(Inputs,notebook_semantics_source){return(
Inputs.select(
  notebook_semantics_source.map((s) => s.value),
  { label: "test case", value: "1" }
)
)};

const _3728 = function parsed(parser,normalizeObservableSourceSelector){return(
parser.parseCell(normalizeObservableSourceSelector)
)};

const _6037 = function test_async_interpolation(compile){return(
eval(
  "let _fn = " +
    compile("md`${await FileAttachment('image@1.png').url() }`")[0]._definition
)
)};

const _6890 = async function test_compile_syntax_error_viewof(compile,expect)
{
  const compiled = await compile(`viewof bar = () => return ""`);
  expect(compiled.length).toEqual(1);
  expect(compiled[0]._name).toEqual("viewof bar");
  return "ok";
}
;

const _6899 = async function test_compile_syntax_error_anonymous(compile,expect)
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
;

const _6897 = async function test_compile_syntax_error_named(compile,expect)
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
;

const _6328 = async function test_compile_integer(compile,expect)
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
;

const _6354 = async function test_compile_string(compile,expect)
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
;

const _6384 = async function test_compile_obj_literal(compile,expect)
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
;

const _6387 = async function test_compile_assignment(compile,expect)
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
;

const _6390 = async function test_compile_dependancy(compile,expect)
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
;

const _6393 = async function test_compile_block_dependancy(compile,expect)
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
;

const _6396 = async function test_compile_comments(compile,expect)
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
;

const _6399 = async function test_compile_generator(compile,expect)
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
;

const _6402 = async function test_compile_function(compile,expect)
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
;

const _6405 = async function test_compile_async_function(compile,expect)
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
;

const _6408 = async function test_compile_named_function(compile,expect)
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
;

const _6411 = async function test_compile_this_reference(compile,expect)
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
;

const _6414 = async function test_compile_lambda(compile,expect)
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
;

const _6417 = async function test_compile_error(compile,expect)
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
;

const _6420 = async function test_compile_viewof(compile,expect)
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
;

const _7687 = function test_compile_viewof_and_value_coexist(compile,expect)
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
;

const _6423 = async function test_compile_mutable(compile,expect)
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
;

const _6426 = async function test_compile_builtin(compile,expect)
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
;

const _6429 = async function test_compile_fileattachment(compile,expect)
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
;

const _6432 = async function test_compile_mutable_dep(compile,expect)
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
;

const _6435 = async function test_compile_mutable_dep2(compile,expect)
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
;

const _6438 = async function test_compile_inline_viewof(compile,expect)
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
;

const _6441 = async function test_compile_view_dep(compile,expect)
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
;

const _6444 = async function test_compile_dep(compile,expect)
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
;

const _6699 = async function test_compile_class(compile,expect)
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
;

const _6722 = async function test_compile_event(compile,expect)
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
;

const _6728 = async function test_compile_tagged_literal(compile,expect)
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
;

const _6343 = function compile_unit_test_template(Inputs,test_case,compiled){return(
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

const _6756 = async function test_compile_import_plain_single(compile,expect)
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
;

const _6766 = async function test_compile_import_view_data_alias_single(compile,expect)
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
;

const _6764 = async function test_compile_import_mutable_data_alias_single(compile,expect)
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
;

const _6762 = async function test_compile_import_mutable_single(compile,expect)
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
;

const _6760 = async function test_compile_import_viewof_single(compile,expect)
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
;

const _6758 = async function test_compile_import_alias_single(compile,expect)
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
;

const _6615 = async function test_compile_import_notebook(compile,expect)
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
;

const _3997 = function viewof$test_case(Inputs,notebook_semantics_source){return(
Inputs.select(
  notebook_semantics_source.filter((s) => s.mode == "js"),
  {
    label: "compilation test case",
    format: (v) => v.value
  }
)
)};

const _6377 = function(test_case){return(
test_case.value
)};

const _4225 = async function compiled(compile,test_case){return(
await compile(test_case.value)
)};

const _4744 = function(parser,test_case)
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
;

const _4282 = function(compile,test_case){return(
compile(test_case.value)
)};

const _4104 = function compile(parser,observableToJs){return(
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

const _4569 = function observableToJs(acorn_walk,parser){return(
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

const _5495 = function decompress_url(DecompressionStream,TextDecoderStream,TransformStream,TextEncoderStream,Response){return(
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

const _3859 = async function parser(decompress_url,FileAttachment,acorn_url,acorn_walk_url){return(
import(
  await decompress_url(FileAttachment("parser-6.1.0.js.gz"), {
    "/npm/acorn@8.11.3/+esm": acorn_url,
    "/npm/acorn-walk@8.3.2/+esm": acorn_walk_url
  })
)
)};

const _5527 = async (__variable) => {
const {acorn, acorn_url, acorn_walk, acorn_walk_url} = await (import("./acorn-8-11-3").then((_) => {
  const module = __variable._module._runtime.module(_.default);
  const outputs = new Map(Array.from(__variable._outputs, (v) => [v._name, v]));
  outputs.get("acorn")?.import("acorn", module);
  outputs.get("acorn_url")?.import("acorn_url", module);
  outputs.get("acorn_walk")?.import("acorn_walk", module);
  outputs.get("acorn_walk_url")?.import("acorn_walk_url", module);
  return {};
}));

return {acorn,acorn_url,acorn_walk,acorn_walk_url};
};

const _2660 = async (__variable) => {
const {expect} = await (import("./jest-expect-standalone").then((_) => {
  const module = __variable._module._runtime.module(_.default);
  const outputs = new Map(Array.from(__variable._outputs, (v) => [v._name, v]));
  outputs.get("expect")?.import("expect", module);
  return {};
}));

return {expect};
};

const _7735 = async (__variable) => {
const {Runtime, Inspector, Library, RuntimeError} = await (import("./observable-runtime").then((_) => {
  const module = __variable._module._runtime.module(_.default);
  const outputs = new Map(Array.from(__variable._outputs, (v) => [v._name, v]));
  outputs.get("Runtime")?.import("Runtime", module);
  outputs.get("Inspector")?.import("Inspector", module);
  outputs.get("Library")?.import("Library", module);
  outputs.get("RuntimeError")?.import("RuntimeError", module);
  return {};
}));

return {Runtime,Inspector,Library,RuntimeError};
};

const _7764 = function stageB_importFake()
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
;

const _7765 = async function test_decompileImport_stageB_single(stageB_importFake,decompileImport,expect,formatImportDeclaration)
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
;

const _7766 = async function test_decompileImport_stageB_aliased(stageB_importFake,decompileImport,expect,formatImportDeclaration)
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
;

const _7767 = async function test_decompileImport_stageB_multiple(stageB_importFake,decompileImport,expect,formatImportDeclaration)
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
;

const _7768 = async function test_decompileImport_stageB_mixed_alias(stageB_importFake,decompileImport,expect,formatImportDeclaration)
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
;

const _7769 = async function test_decompileImport_stageB_viewof(stageB_importFake,decompileImport,expect,formatImportDeclaration)
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
;

const _7770 = async function test_decompileImport_stageB_mutable(stageB_importFake,decompileImport,expect,formatImportDeclaration)
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
;

const _7771 = async function test_decompileImport_returns_null_for_non_import(decompileImport,expect)
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
;

const _7772 = async function test_decompileImport_compile_roundtrip_single(compile,expect,stageB_importFake,decompileImport,formatImportDeclaration)
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
;

const _7773 = async function test_decompileImport_stageB_order_independent(stageB_importFake,decompileImport,expect,formatImportDeclaration)
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
;

const _7774 = async function test_decompileImport_stageB_notebook_id(stageB_importFake,decompileImport,expect,formatImportDeclaration)
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
;

const _7779 = function test_extractModuleInfo_new_id_resolutions(expect,extractModuleInfo)
{
  // new.observablehq.com d/<id>@<ver> import with resolutions=.
  expect(
    extractModuleInfo(
      'async () => runtime.module((await import("/d/e1c39d41e8e944b0@939.js?v=4&resolutions=a6a56ee61aba9799@437")).default)'
    )
  ).toEqual({ id: "e1c39d41e8e944b0", version: "939" });
  return "ok";
}
;

const _7780 = function test_extractModuleInfo_new_slug_resolutions(expect,extractModuleInfo)
{
  // new.observablehq.com slug import carries a resolutions= param.
  expect(
    extractModuleInfo(
      'async () => runtime.module((await import("/@mootari/access-runtime.js?v=4&resolutions=98f34e974bb2e4bc@1392")).default)'
    )
  ).toEqual({ namespace: "mootari", notebook: "access-runtime", version: "1392" });
  return "ok";
}
;

const _7781 = function test_findModuleName_classic_bundle(expect,findModuleName)
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
;

const _7782 = function test_findModuleName_kit_slug(expect,findModuleName)
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
;

const _7783 = function test_findModuleName_new_id(expect,findModuleName)
{
  const m = {}; // module sentinel
  const scope = new Map([
    ["module 1", { _name: "module 1", _value: m,
      _definition: 'async () => runtime.module((await import("/d/e1c39d41e8e944b0@939.js?v=4&resolutions=a6a56ee61aba9799@437")).default)' }]
  ]);
  expect(findModuleName(scope, m)).toEqual("d/e1c39d41e8e944b0@939");
  return "ok";
}
;

const _7784 = function test_findModuleName_new_slug(expect,findModuleName)
{
  const m = {}; // module sentinel
  const scope = new Map([
    ["module 1", { _name: "module 1", _value: m,
      _definition: 'async () => runtime.module((await import("/@mootari/access-runtime.js?v=4&resolutions=98f34e974bb2e4bc@1392")).default)' }]
  ]);
  expect(findModuleName(scope, m)).toEqual("@mootari/access-runtime");
  return "ok";
}
;

const _7822 = async function test_decompile_leading_comment(decompile,expect,compile)
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
;

const _7823 = async function test_decompile_trailing_comment(decompile,expect)
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
;

const _7824 = async function test_decompile_param_in_string(decompile,expect)
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
;

const _7825 = async function test_decompile_class_property_field(decompile,expect)
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
;

const _7826 = async function test_compile_preserves_formatting(compile,expect)
{
  // Source-preserving compile keeps quote style and template spacing verbatim;
  // escodegen used to re-quote ("h1" -> 'h1') and respace (${s} -> ${ s }).
  const compiled = await compile('x = { const s = "h1"; return `${s}`; }');
  expect(compiled[0]._definition).toEqual('function _x() { const s = "h1"; return `${s}`; }');
  return "ok";
}
;

export default function define(runtime) {
  const main = runtime.module();
  const fileAttachments = new Map([
    ["parser-6.1.0.js.gz", {url: "https://static.observableusercontent.com/files/36c11e4bac3ebe9047f79a4b9f2ed1554e7d684bbb421e5e466a888e8cb074e5e466e67930075ad8887e2281609649c21f7f7ce7484771268670298c77bd6dbc", mimeType: "application/gzip", lastModified: 1731012381498.867, size: 4035}]
  ]);
  main.builtin("FileAttachment", runtime.fileAttachments((name) => fileAttachments.get(name)));
  main.define("cell 5809", ["@variable"], _5809);
  main.define("tests", ["cell 5809"], (_) => _.tests);
  main.define("runtime_variables", ["cell 5809"], (_) => _.runtime_variables);
  main.define("viewof$runtime_variables", ["cell 5809"], (_) => _.viewof$runtime_variables);
  main.define("modules", ["cell 5809"], (_) => _.modules);
  main.define("cell 5812", ["tests"], _5812);
  main.define("cellMaps", ["cellMap"], _5840);
  main.define("allCells", ["cellMaps"], _5852);
  main.define("all_decompiled", ["allCells","decompile"], _5992);
  main.define("test_all_cells_decompilable", ["all_decompiled"], _5822);
  main.define("all_compiled", ["all_decompiled","compile"], _5967);
  main.define("test_decompiled_cells_recompilable", ["all_compiled"], _5881);
  main.define("roundtripped", ["all_compiled","decompile"], _5896);
  main.define("test_all_cells_roundtrippable", ["roundtripped"], _5950);
  main.define("dependancy_document", [], _3302);
  main.define("dependancy_source", ["dependancy_document"], _3379);
  main.define("notebook_semantics_document", [], _3304);
  main.define("notebook_semantics_source", ["notebook_semantics_document","parser"], _3375);
  main.define("notebook_semantics_module", [], _3340);
  main.define("cell 6475", ["@variable"], _6475);
  main.define("cellMap", ["cell 6475"], (_) => _.cellMap);
  main.define("moduleMap", ["cell 6475"], (_) => _.moduleMap);
  main.define("importFake", ["Runtime"], _6519);
  main.define("test_decompile_syntax_error_roundtrip", ["compile","decompile","expect"], _6888);
  main.define("test_decompile_$variable", ["decompile","expect"], _6083);
  main.define("test_decompile_import_variable", ["decompile","importFake","expect"], _6579);
  main.define("test_decompile_dollar_in_string_literal", ["decompile","expect"], _7694);
  main.define("test_decompile_import_variable_alias", ["decompile","importFake","expect"], _6587);
  main.define("test_decompile_import_many", ["decompile","importFake","expect"], _6091);
  main.define("test_decompile_markdown_cell", ["decompile","expect"], _6098);
  main.define("test_decompile_constant", ["decompile","expect"], _6103);
  main.define("test_decompile_string_literal", ["decompile","expect"], _6109);
  main.define("test_decompile_html_cell", ["decompile","expect"], _6113);
  main.define("test_decompile_class", ["decompile","expect"], _6143);
  main.define("test_decompile_class_with_property", ["decompile"], _6007);
  main.define("test_decompile_object_literal", ["decompile","expect"], _6146);
  main.define("test_decompile_reference", ["decompile","expect"], _6153);
  main.define("test_decompile_block", ["decompile","expect"], _6155);
  main.define("test_decompile_comments", ["decompile","expect"], _6162);
  main.define("test_decompile_generator", ["decompile","expect"], _6171);
  main.define("test_decompile_function", ["decompile","expect"], _6184);
  main.define("test_decompile_async_function", ["decompile","expect"], _6186);
  main.define("test_decompile_named_function", ["decompile","expect"], _6188);
  main.define("test_decompile_this_reference", ["decompile","expect"], _6190);
  main.define("test_decompile_lambda", ["decompile","expect"], _6192);
  main.define("test_decompile_error", ["decompile","expect"], _6195);
  main.define("test_decompile_error_object", ["decompile","expect"], _6197);
  main.define("test_decompile_anon_error_dep", ["decompile","expect"], _6199);
  main.define("test_decompile_viewof", ["decompile","expect"], _6206);
  main.define("test_decompile_mutable", ["decompile","expect"], _6210);
  main.define("test_decompile_builtin", ["decompile","expect"], _6213);
  main.define("test_decompile_fileattachment", ["decompile","expect"], _6215);
  main.define("test_decompile_mutable_dependancy", ["decompile","expect"], _6217);
  main.define("test_decompile_mutable_dependancy_2", ["decompile","expect"], _6221);
  main.define("test_decompile_viewof_dep", ["decompile","expect"], _6242);
  main.define("test_decompile_viewof_data_dep", ["decompile","expect"], _6244);
  main.define("test_decompile_viewof_param", ["decompile","expect"], _6905);
  main.define("test_decompile_anon_dep", ["decompile","expect"], _6246);
  main.define("test_decompile_import_mutable", ["decompile","expect"], _6248);
  main.define("test_decompile_import_viewof", ["decompile","expect"], _6257);
  main.define("test_decompile_viewof_data", ["decompile","expect"], _6260);
  main.define("test_decompile_import_alias", ["decompile","expect"], _6264);
  main.define("test_decompile_import_mutable_alias", ["decompile","expect"], _6266);
  main.define("test_decompile_import_mutable_data_alias", ["decompile","expect"], _6268);
  main.define("test_decompile_import_viewof_alias", ["decompile","expect"], _6270);
  main.define("test_decompile_import_viewof_data_alias", ["decompile","expect"], _6272);
  main.define("decompile", ["decompileImport","formatImportDeclaration","acorn"], _2964);
  main.define("extractModuleInfo", [], _5086);
  main.define("test_extractModuleInfo_notebook_resolution", ["expect","extractModuleInfo"], _5419);
  main.define("test_extractModuleInfo_id_version_resolution", ["expect","extractModuleInfo"], _5407);
  main.define("test_extractModuleInfo_id_version", ["expect","extractModuleInfo"], _5574);
  main.define("test_extractModuleInfo_test_4", ["expect","extractModuleInfo"], _5472);
  main.define("test_extractModuleInfo_alias_hack", ["expect","extractModuleInfo"], _6075);
  main.define("import_ast_example", ["parser"], _5258);
  main.define("findModuleName", ["extractModuleInfo"], _5074);
  main.define("findImportedName", [], _5322);
  main.define("decompileImport", ["findModuleName","findImportedName"], _6800);
  main.define("formatImportDeclaration", [], _6803);
  main.define("test_decompileImport_basic", ["importFake","decompileImport","expect"], _6807);
  main.define("test_formatImportDeclaration_roundtrip", ["importFake","decompileImport","expect","formatImportDeclaration","decompile"], _6810);
  main.define("test_decompileImport_alias", ["importFake","decompileImport","expect","formatImportDeclaration"], _6813);
  main.define("variableToObject", [], _4163);
  main.define("viewof normalizeObservableSourceSelector", ["Inputs","notebook_semantics_source"], _3715);
  main.define("normalizeObservableSourceSelector", ["Generators", "viewof normalizeObservableSourceSelector"], (G, _) => G.input(_));
  main.define("parsed", ["parser","normalizeObservableSourceSelector"], _3728);
  main.define("test_async_interpolation", ["compile"], _6037);
  main.define("test_compile_syntax_error_viewof", ["compile","expect"], _6890);
  main.define("test_compile_syntax_error_anonymous", ["compile","expect"], _6899);
  main.define("test_compile_syntax_error_named", ["compile","expect"], _6897);
  main.define("test_compile_integer", ["compile","expect"], _6328);
  main.define("test_compile_string", ["compile","expect"], _6354);
  main.define("test_compile_obj_literal", ["compile","expect"], _6384);
  main.define("test_compile_assignment", ["compile","expect"], _6387);
  main.define("test_compile_dependancy", ["compile","expect"], _6390);
  main.define("test_compile_block_dependancy", ["compile","expect"], _6393);
  main.define("test_compile_comments", ["compile","expect"], _6396);
  main.define("test_compile_generator", ["compile","expect"], _6399);
  main.define("test_compile_function", ["compile","expect"], _6402);
  main.define("test_compile_async_function", ["compile","expect"], _6405);
  main.define("test_compile_named_function", ["compile","expect"], _6408);
  main.define("test_compile_this_reference", ["compile","expect"], _6411);
  main.define("test_compile_lambda", ["compile","expect"], _6414);
  main.define("test_compile_error", ["compile","expect"], _6417);
  main.define("test_compile_viewof", ["compile","expect"], _6420);
  main.define("test_compile_viewof_and_value_coexist", ["compile","expect"], _7687);
  main.define("test_compile_mutable", ["compile","expect"], _6423);
  main.define("test_compile_builtin", ["compile","expect"], _6426);
  main.define("test_compile_fileattachment", ["compile","expect"], _6429);
  main.define("test_compile_mutable_dep", ["compile","expect"], _6432);
  main.define("test_compile_mutable_dep2", ["compile","expect"], _6435);
  main.define("test_compile_inline_viewof", ["compile","expect"], _6438);
  main.define("test_compile_view_dep", ["compile","expect"], _6441);
  main.define("test_compile_dep", ["compile","expect"], _6444);
  main.define("test_compile_class", ["compile","expect"], _6699);
  main.define("test_compile_event", ["compile","expect"], _6722);
  main.define("test_compile_tagged_literal", ["compile","expect"], _6728);
  main.define("compile_unit_test_template", ["Inputs","test_case","compiled"], _6343);
  main.define("test_compile_import_plain_single", ["compile","expect"], _6756);
  main.define("test_compile_import_view_data_alias_single", ["compile","expect"], _6766);
  main.define("test_compile_import_mutable_data_alias_single", ["compile","expect"], _6764);
  main.define("test_compile_import_mutable_single", ["compile","expect"], _6762);
  main.define("test_compile_import_viewof_single", ["compile","expect"], _6760);
  main.define("test_compile_import_alias_single", ["compile","expect"], _6758);
  main.define("test_compile_import_notebook", ["compile","expect"], _6615);
  main.define("viewof test_case", ["Inputs","notebook_semantics_source"], _3997);
  main.define("test_case", ["Generators", "viewof test_case"], (G, _) => G.input(_));
  main.define("cell 6377", ["test_case"], _6377);
  main.define("compiled", ["compile","test_case"], _4225);
  main.define("cell 4744", ["parser","test_case"], _4744);
  main.define("cell 4282", ["compile","test_case"], _4282);
  main.define("compile", ["parser","observableToJs"], _4104);
  main.define("observableToJs", ["acorn_walk","parser"], _4569);
  main.define("decompress_url", ["DecompressionStream","TextDecoderStream","TransformStream","TextEncoderStream","Response"], _5495);
  main.define("parser", ["decompress_url","FileAttachment","acorn_url","acorn_walk_url"], _3859);
  main.define("cell 5527", ["@variable"], _5527);
  main.define("acorn", ["cell 5527"], (_) => _.acorn);
  main.define("acorn_url", ["cell 5527"], (_) => _.acorn_url);
  main.define("acorn_walk", ["cell 5527"], (_) => _.acorn_walk);
  main.define("acorn_walk_url", ["cell 5527"], (_) => _.acorn_walk_url);
  main.define("cell 2660", ["@variable"], _2660);
  main.define("expect", ["cell 2660"], (_) => _.expect);
  main.define("cell 7735", ["@variable"], _7735);
  main.define("Runtime", ["cell 7735"], (_) => _.Runtime);
  main.define("Inspector", ["cell 7735"], (_) => _.Inspector);
  main.define("Library", ["cell 7735"], (_) => _.Library);
  main.define("RuntimeError", ["cell 7735"], (_) => _.RuntimeError);
  main.define("stageB_importFake", [], _7764);
  main.define("test_decompileImport_stageB_single", ["stageB_importFake","decompileImport","expect","formatImportDeclaration"], _7765);
  main.define("test_decompileImport_stageB_aliased", ["stageB_importFake","decompileImport","expect","formatImportDeclaration"], _7766);
  main.define("test_decompileImport_stageB_multiple", ["stageB_importFake","decompileImport","expect","formatImportDeclaration"], _7767);
  main.define("test_decompileImport_stageB_mixed_alias", ["stageB_importFake","decompileImport","expect","formatImportDeclaration"], _7768);
  main.define("test_decompileImport_stageB_viewof", ["stageB_importFake","decompileImport","expect","formatImportDeclaration"], _7769);
  main.define("test_decompileImport_stageB_mutable", ["stageB_importFake","decompileImport","expect","formatImportDeclaration"], _7770);
  main.define("test_decompileImport_returns_null_for_non_import", ["decompileImport","expect"], _7771);
  main.define("test_decompileImport_compile_roundtrip_single", ["compile","expect","stageB_importFake","decompileImport","formatImportDeclaration"], _7772);
  main.define("test_decompileImport_stageB_order_independent", ["stageB_importFake","decompileImport","expect","formatImportDeclaration"], _7773);
  main.define("test_decompileImport_stageB_notebook_id", ["stageB_importFake","decompileImport","expect","formatImportDeclaration"], _7774);
  main.define("test_extractModuleInfo_new_id_resolutions", ["expect","extractModuleInfo"], _7779);
  main.define("test_extractModuleInfo_new_slug_resolutions", ["expect","extractModuleInfo"], _7780);
  main.define("test_findModuleName_classic_bundle", ["expect","findModuleName"], _7781);
  main.define("test_findModuleName_kit_slug", ["expect","findModuleName"], _7782);
  main.define("test_findModuleName_new_id", ["expect","findModuleName"], _7783);
  main.define("test_findModuleName_new_slug", ["expect","findModuleName"], _7784);
  main.define("test_decompile_leading_comment", ["decompile","expect","compile"], _7822);
  main.define("test_decompile_trailing_comment", ["decompile","expect"], _7823);
  main.define("test_decompile_param_in_string", ["decompile","expect"], _7824);
  main.define("test_decompile_class_property_field", ["decompile","expect"], _7825);
  main.define("test_compile_preserves_formatting", ["compile","expect"], _7826);
  return main;
}
