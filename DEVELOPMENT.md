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

runtime._variables    // Set of all variables across all modules
runtime.mains         // Main module definitions
runtime.fileAttachments  // File attachment resolver
```

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

Use `lope-runner.js --run-tests`:

```bash
# Run all tests
node tools/lope-runner.js notebook.html --run-tests

# Filter by module/test name
node tools/lope-runner.js notebook.html --run-tests --suite @tomlarkworthy/tests

# JSON output
node tools/lope-runner.js notebook.html --run-tests --json

# Increase timeout for slow tests
node tools/lope-runner.js notebook.html --run-tests --test-timeout 60000
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
# List all modules in a notebook
node tools/lope-reader.js notebook.html --list-modules

# Get source for a specific module
node tools/lope-reader.js notebook.html --get-module @tomlarkworthy/tests
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

### lope-reader.js (Fast, Static)

For exploring notebook structure without running code:

```bash
node tools/lope-reader.js notebook.html --list-modules
node tools/lope-reader.js notebook.html --get-module @tomlarkworthy/view
node tools/lope-reader.js notebook.html --list-files
```

### lope-runner.js (Slow, Dynamic)

For runtime values and test execution:

```bash
node tools/lope-runner.js notebook.html --list-cells
node tools/lope-runner.js notebook.html --get-cell myVariable
node tools/lope-runner.js notebook.html --run-tests
```

### When to Use Which

| Task | Tool |
|------|------|
| List modules/cells | lope-reader.js |
| Read cell source | lope-reader.js |
| Get computed values | lope-runner.js |
| Run tests | lope-runner.js |
| Check file attachments | lope-reader.js |

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
// In browser console with notebook open
const runtime = window.__ojs_runtime;

// Find a variable by name
const myVar = [...runtime._variables].find(v => v._name === 'myCell');

// Check its state
console.log({
  value: myVar._value,
  error: myVar._error,
  reachable: myVar._reachable,
  inputs: myVar._inputs?.map(i => i._name)
});
```
