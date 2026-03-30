# Lopecode Development Guide

This guide covers the internal architecture and development patterns for working with lopecode notebooks.

## Observable Runtime Internals

Lopecode is built on the [Observable runtime](https://github.com/observablehq/runtime). Understanding its internals is crucial for tooling development.

### Lazy Evaluation

**The runtime is lazy** - cells only compute when they are *observed*. This has major implications:

```javascript
// A cell is only computed if:
// 1. It's directly observed (rendered in UI)
// 2. It's a dependency of an observed cell

variable._reachable  // true if cell will be computed
```

In headless/Playwright mode, most cells won't compute because there's no UI observer. To force computation:

```javascript
// 1. Get the actual runtime (not the module)
let actualRuntime = null;
for (const v of runtime._variables) {
  if (v._module?._runtime?._computeNow) {
    actualRuntime = v._module._runtime;
    break;
  }
}

// 2. Mark variable as reachable
variable._reachable = true;
actualRuntime._dirty.add(variable);

// 3. Trigger computation
actualRuntime._computeNow();
```

### Variable Structure

Each Observable variable has these key properties:

```javascript
variable._name        // Cell name (e.g., "myCell", "viewof slider")
variable._value       // Current computed value
variable._error       // Error if computation failed
variable._inputs      // Array of dependency variables
variable._module      // Parent module
variable._reachable   // Whether cell is in computation graph
variable._promise     // Promise for async computation
variable._observer    // Observer callbacks {fulfilled, rejected, pending}
```

### Observer Pattern

The proper way to trigger computation and capture results:

```javascript
const oldObserver = variable._observer;
variable._observer = {
  fulfilled: (value) => {
    // Cell computed successfully
    console.log('Value:', value);
    if (oldObserver?.fulfilled) oldObserver.fulfilled(value);
  },
  rejected: (error) => {
    // Cell threw an error
    console.log('Error:', error.message);
    if (oldObserver?.rejected) oldObserver.rejected(error);
  },
  pending: () => {
    // Cell is recomputing
    if (oldObserver?.pending) oldObserver.pending();
  }
};
```

### Runtime Access

Lopecode notebooks expose `window.__ojs_runtime` which provides access to:

```javascript
const runtime = window.__ojs_runtime;

runtime.mains         // Map<name, Module> — all registered modules
runtime._variables    // Set of ALL variables (last resort — prefer module._scope or lookupVariable)
runtime.fileAttachments  // File attachment resolver
```

## Runtime SDK Metaprogramming

`@tomlarkworthy/runtime-sdk` provides the correct, tested APIs for metaprogramming. **Always use these instead of scanning `runtime._variables`.**

### Getting Your Own Module Reference

```javascript
// Declare as a viewof cell — Observable resolves the module asynchronously
viewof myModule = thisModule()
// myModule is now the actual Module object for your module
```

Use this when you need to look up variables in your own module's scope.

### Finding Variables

```javascript
// By name within a known module (async, waits for scope to populate)
const variable = await lookupVariable("myCell", module)

// Synchronous check if you know it's already defined
const variable = module._scope.get("myCell")
```

**Do NOT** scan `runtime._variables` to find a variable by name. Use `lookupVariable` or `module._scope`.

### Finding Modules

```javascript
// By name from the mains registry
const mod = runtime.mains.get("@tomlarkworthy/my-module")
```

### Module CRUD

```javascript
// Create a new empty module (registered in runtime.mains)
const mod = createModule("@tomlarkworthy/my-module", runtime)

// Delete a module and all its variables
deleteModule("@tomlarkworthy/my-module", runtime)
// Uses runtime._variables iteration internally (correct — anonymous vars aren't in _scope)
```

### Defining Cells

```javascript
// Compile Observable JS source to a function
const [fn] = await realize(["(x) => x + 1"], runtime)

// Define on a module (redefine if exists, create if not)
const existing = module._scope.get("myCell")
if (existing) {
  existing.define("myCell", ["x"], fn)
} else {
  module.variable(observer).define("myCell", ["x"], fn)
}
```

### Observing Variables Reactively

```javascript
// Subscribe to a variable's value changes
const cancel = observe(variable, {
  fulfilled: (value) => console.log("value:", value),
  rejected: (error) => console.log("error:", error)
}, { invalidation })

// Later: cancel() to unsubscribe
```

### When `runtime._variables` Is Still Needed

A few operations genuinely require cross-module iteration:
- **Test discovery** — finding all `test_*` variables across all modules
- **Fork/export** — finding `_exportToHTML` regardless of which module defines it
- **`deleteModule`** — anonymous variables aren't in `_scope`, only in `runtime._variables`

For everything else, use `runtime.mains` + `lookupVariable` + `module._scope`.

## Testing Infrastructure

### The test_* Pattern

Lopecode uses a reactive testing pattern from `@tomlarkworthy/tests`:

1. **Test Discovery**: Any cell starting with `test_` is considered a test
2. **Pass/Fail**: Cell passes if it doesn't throw, fails if it throws
3. **Reactive**: Tests re-run automatically when dependencies change

```javascript
// Example test cell
test_addition = {
  const result = add(2, 2);
  if (result !== 4) throw new Error(`Expected 4, got ${result}`);
  return "2 + 2 = 4"; // Return value shown on success
}
```

### Running Tests Headlessly

Use `lope-browser-runner.ts --run-tests`:

```bash
# Run all tests
bun tools/lope-browser-runner.ts notebook.html --run-tests

# Filter by module/test name
bun tools/lope-browser-runner.ts notebook.html --run-tests --suite @tomlarkworthy/tests

# JSON output
bun tools/lope-browser-runner.ts notebook.html --run-tests --json

# Increase timeout for slow tests
bun tools/lope-browser-runner.ts notebook.html --run-tests --test-timeout 60000
```

The runner:
1. Finds all `test_*` variables
2. Installs observers on each
3. Marks them reachable and triggers computation
4. Collects results via observer callbacks
5. Outputs TAP format report

### Test Limitations

Some tests may timeout in headless mode:
- Tests depending on UI interactions (sliders, inputs)
- Tests requiring external services (API keys)
- Very slow integration tests

## Module System

### Module Structure

Each notebook contains multiple modules in `<script type="lope-module">` tags:

```javascript
// Module definition structure
{
  "name": "@tomlarkworthy/my-module",
  "cells": [
    {
      "name": "cellName",
      "dependencies": ["dep1", "dep2"],
      "source": "dep1 + dep2"
    }
  ]
}
```

### Finding Modules

```bash
# Get notebook spec (JSON: title, modules, files)
bun tools/lope-reader.ts notebook.html

# Get source for a specific module
bun tools/lope-reader.ts notebook.html --get-module @tomlarkworthy/tests
```

### Module Dependencies

Modules import from each other:

```javascript
// In Observable JS
import {myFunction} from "@tomlarkworthy/utils"

// Compiles to runtime call
runtime.module((await importShim("@tomlarkworthy/utils")).default)
```

## Cell Compilation/Decompilation

### Observable JS → JavaScript

The toolchain converts Observable JS syntax to standard JavaScript:

```javascript
// Observable JS
x = 42
viewof slider = Inputs.range([0, 100])
mutable counter = 0

// Compiles to
const _x = function _x(){return 42};
const _slider = function _slider(Inputs){return Inputs.range([0, 100])};
// (viewof handled specially)
```

### Decompilation

Going from runtime back to Observable JS source:

```javascript
// The decompiler must handle:
// - viewof/mutable prefixes
// - Import statements
// - Generator functions
// - Class definitions
// - Error expressions
```

Key tests: `test_decompile_*` and `test_compile_*` in `@tomlarkworthy/tests`

## Development Tools

### lope-reader.ts (Fast, Static)

For exploring notebook structure without running code:

```bash
bun tools/lope-reader.ts notebook.html
bun tools/lope-reader.ts notebook.html --get-module @tomlarkworthy/view
```

### lope-browser-runner.ts (Slow, Dynamic)

For runtime values and test execution:

```bash
bun tools/lope-browser-runner.ts notebook.html --list-cells
bun tools/lope-browser-runner.ts notebook.html --get-cell myVariable
bun tools/lope-browser-runner.ts notebook.html --run-tests
```

### When to Use Which

| Task | Tool |
|------|------|
| List modules, read source | lope-reader.ts |
| Get computed values | lope-browser-runner.ts |
| Run tests | lope-browser-runner.ts |
| Check file attachments | lope-reader.ts |

## Common Patterns

### Reactive Dependencies

Cells automatically re-run when dependencies change:

```javascript
a = 1
b = 2
sum = a + b  // Re-runs when a or b changes
```

### Viewof Pattern

Separates UI element from its value:

```javascript
viewof slider = Inputs.range([0, 100])
// Creates two cells:
// - "viewof slider" = the DOM element
// - "slider" = the current value
```

### Mutable Pattern

For cells that can be imperatively updated:

```javascript
mutable counter = 0

increment = {
  mutable counter++;
  return counter;
}
```

### Generators

For streaming/animated values:

```javascript
ticker = {
  let i = 0;
  while (true) {
    yield i++;
    await Promises.delay(1000);
  }
}
```

## Debugging Tips

1. **Cell not computing?** Check `variable._reachable` - may need observer
2. **Value undefined?** Check `variable._error` for thrown errors
3. **Import failing?** Check module name matches exactly
4. **Test timing out?** May have UI dependencies that don't work headlessly

### Inspecting Runtime State

```javascript
// Preferred: use runtime-sdk lookupVariable
const mod = runtime.mains.get("@tomlarkworthy/my-module");
const myVar = await lookupVariable("myCell", mod);

// Or synchronously via module scope
const myVar = mod._scope.get("myCell");

// Check its state
console.log({
  value: myVar._value,
  error: myVar._error,
  reachable: myVar._reachable,
  inputs: myVar._inputs?.map(i => i._name)
});
```

## Lopepage Architecture

Lopepage is the multi-notebook UI system that allows multiple modules to be displayed simultaneously in a configurable layout. Understanding lopepages is crucial for headless testing.

### What is a Lopepage?

A lopepage is an HTML file that:
1. Contains multiple `<script type="lope-module">` blocks (Observable modules)
2. Uses `@tomlarkworthy/lopepage` to render a dynamic multi-panel UI
3. Controls which modules are visible via the URL hash fragment

### Bootconf and Mains

Each notebook has a `bootconf.json` script block that configures startup:

```json
{
  "mains": ["@tomlarkworthy/lopepage", "@tomlarkworthy/my-notebook"],
  "hash": "#view=R100(S70(@tomlarkworthy/my-notebook),S30(@tomlarkworthy/module-selection))",
  "headless": true
}
```

**`mains`** lists modules that are eagerly loaded as top-level entry points at startup. Only modules that need to run immediately should be in mains — typically `lopepage` and the notebook's own content module. **Dependency modules should NOT be in mains.** They are imported on-demand by the cells that need them via the Observable runtime's `import()` mechanism. Adding a dependency like `@tomlarkworthy/runtime-sdk` to mains would cause it to load as a visible top-level module unnecessarily.

**`hash`** is the default hash URL that controls the visible layout (see Hash URL DSL below). This is an intentional author choice and should not be modified by automated tools like sync-module.

**Key rule for sync-module**: When syncing a module's content across notebooks, never modify bootconf. The module content is a dependency — it gets replaced in its `<script>` block, but bootconf (mains list and hash URL) reflects the author's intended startup behavior and layout.

### Hash URL DSL

The hash URL controls which modules are displayed and their layout arrangement:

```
#view=<layout-expression>
```

**Basic module reference:**
```
@tomlarkworthy/module-name
```

**With optional weight (size ratio):**
```
50@tomlarkworthy/module-name
```

**Layout containers:**
- `S` - Stack (vertical arrangement)
- `C` - Column (horizontal arrangement)
- `R` - Row (horizontal, similar to C)

**Examples:**

```bash
# Single module
#view=@tomlarkworthy/my-module

# Two modules stacked vertically (default)
#view=@tomlarkworthy/module-a,@tomlarkworthy/module-b

# Two modules side by side with weights
#view=C100(S50(@tomlarkworthy/left),S50(@tomlarkworthy/right))

# Complex 4-panel layout
#view=R100(S50(@tomlarkworthy/module-selection),S25(@tomlarkworthy/reactive-reflective-testing),S13(@tomlarkworthy/observablejs-toolchain),S13(@tomlarkworthy/tests))
```

### Why Layout Matters for Testing

**Key insight**: The Observable runtime is lazy. Modules only compute their cells when they are *rendered* in the UI.

When running tests headlessly, opening the notebook without a hash URL means:
- Only the default view renders
- Test modules may not be rendered
- `test_*` cells won't compute naturally

**Solution**: Use a hash URL that includes the tests module:

```javascript
// Load with tests module visible
{"cmd": "load",
 "notebook": "notebook.html",
 "hash": "view=R100(S50(@tomlarkworthy/module-selection),S25(@tomlarkworthy/main),S13(@tomlarkworthy/toolchain),S13(@tomlarkworthy/tests))"}
```

### The Tests Module and latest_state

The `@tomlarkworthy/tests` module provides reactive test infrastructure:

1. **Automatic Discovery**: Finds all `test_*` cells across all loaded modules
2. **Observation**: Installs observers on test cells when the tests UI renders
3. **State Tracking**: Stores results in `latest_state` Map

```javascript
// latest_state structure
Map {
  "@tomlarkworthy/module#test_foo" => {
    state: "fulfilled",  // or "rejected", "pending", "paused"
    value: "test passed",
    error: null
  },
  // ...
}
```

### Two Approaches to Headless Testing

**1. Force Reachability (works without tests module UI)**
```javascript
// Manually mark tests as reachable and trigger computation
variable._reachable = true;
actualRuntime._dirty.add(variable);
actualRuntime._computeNow();
```

**2. Natural Observation (requires tests module rendered)**
```javascript
// Read from latest_state after tests module UI observes
const latestState = [...runtime._variables]
  .find(v => v._name === 'latest_state' && v._value instanceof Map)
  ._value;

for (const [name, result] of latestState) {
  console.log(name, result.state);
}
```

### Key Modules

| Module | Purpose |
|--------|---------|
| `@tomlarkworthy/lopepage` | Main UI container, Golden Layout integration |
| `@tomlarkworthy/lopepage-urls` | Hash URL DSL parser and serializer |
| `@tomlarkworthy/module-selection` | Module picker UI, persistence |
| `@tomlarkworthy/tests` | Test discovery and observation |
| `@tomlarkworthy/visualizer` | Renders module cells as interactive UI |

### Creating Layout URLs

The DSL parser in `@tomlarkworthy/lopepage-urls` handles:

```javascript
parseViewDSL("R100(S50(@owner/left),S50(@owner/right))")
// Returns AST:
{
  nodeType: "group",
  groupType: "R",
  weight: 100,
  children: [
    { nodeType: "group", groupType: "S", weight: 50, children: [...] },
    { nodeType: "group", groupType: "S", weight: 50, children: [...] }
  ]
}
```

### Best Practices

1. **For testing**: Include the tests module in your hash URL
2. **For development**: Use module-selection to interactively choose modules
3. **For CI**: Use `read-tests` with a split layout that shows the tests module
4. **Weights**: Use relative weights (they sum and divide proportionally)
