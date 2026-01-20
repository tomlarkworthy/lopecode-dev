/**
 * tools.js - Shared Observable runtime utilities
 *
 * Functions here are designed to run in page context via page.evaluate().
 * They're exported as regular functions and serialized with .toString() when needed.
 */

/**
 * Find the actual runtime instance (the one with _computeNow)
 * @param {Object} runtime - window.__ojs_runtime
 * @returns {Object|null} The actual runtime or null
 */
export function findActualRuntime(runtime) {
  for (const v of runtime._variables) {
    if (v._module?._runtime?._computeNow) {
      return v._module._runtime;
    }
  }
  return null;
}

/**
 * Build a Map of module -> module name for all variables
 * @param {Object} runtime - window.__ojs_runtime
 * @returns {Map} module -> name
 */
export function buildModuleNames(runtime) {
  const moduleNames = new Map();
  for (const v of runtime._variables) {
    if (v._module && !moduleNames.has(v._module)) {
      const modName = v._module._name ||
        (v._name?.startsWith('module ') ? v._name : null);
      if (modName) moduleNames.set(v._module, modName);
    }
  }
  return moduleNames;
}

/**
 * Find all test_* variables in the runtime
 * @param {Object} runtime - window.__ojs_runtime
 * @param {string|null} filter - Optional filter string
 * @param {Map} moduleNames - Module name lookup from buildModuleNames
 * @returns {Array} Array of test variables
 */
export function findTestVariables(runtime, filter, moduleNames) {
  const testVars = [];
  for (const variable of runtime._variables) {
    const name = variable._name;
    if (typeof name === 'string' && name.startsWith('test_')) {
      if (filter) {
        const moduleName = moduleNames.get(variable._module) || '';
        if (!name.includes(filter) && !moduleName.includes(filter)) {
          continue;
        }
      }
      testVars.push(variable);
    }
  }
  return testVars;
}

/**
 * Run test_* variables using observer pattern
 * Designed to be called via page.evaluate()
 *
 * @param {Object} options - { testTimeout, filterStr, force }
 * @returns {Object} { tests, summary } or { error }
 */
export async function runTestVariables({ testTimeout, filterStr, force }) {
  const runtime = window.__ojs_runtime;
  if (!runtime) return { error: 'Runtime not found' };

  const results = new Map();
  const pendingPromises = [];

  // Find actual runtime
  let actualRuntime = null;
  for (const v of runtime._variables) {
    if (v._module?._runtime?._computeNow) {
      actualRuntime = v._module._runtime;
      break;
    }
  }

  if (!actualRuntime) {
    return { error: 'Could not find actual runtime' };
  }

  // Build module name lookup
  const moduleNames = new Map();
  for (const v of runtime._variables) {
    if (v._module && !moduleNames.has(v._module)) {
      const modName = v._module._name ||
        (v._name?.startsWith('module ') ? v._name : null);
      if (modName) moduleNames.set(v._module, modName);
    }
  }

  // Find test variables
  const testVars = [];
  for (const variable of runtime._variables) {
    const name = variable._name;
    if (typeof name === 'string' && name.startsWith('test_')) {
      if (filterStr) {
        const moduleName = moduleNames.get(variable._module) || '';
        if (!name.includes(filterStr) && !moduleName.includes(filterStr)) {
          continue;
        }
      }
      testVars.push(variable);
    }
  }

  if (testVars.length === 0) {
    return { error: 'No test variables found' };
  }

  // Install observers
  for (const v of testVars) {
    const name = v._name;
    const moduleName = moduleNames.get(v._module) || 'main';
    const fullName = `${moduleName}#${name}`;

    const p = new Promise((resolve) => {
      const timeoutId = setTimeout(() => {
        results.set(fullName, { state: 'timeout', name, module: moduleName });
        resolve();
      }, testTimeout);

      // Only force reachable if requested
      if (force && !v._reachable) {
        v._reachable = true;
        actualRuntime._dirty.add(v);
      }

      const oldObserver = v._observer;
      v._observer = {
        fulfilled: (value) => {
          clearTimeout(timeoutId);
          results.set(fullName, {
            state: 'passed',
            name,
            module: moduleName,
            value: value === undefined ? 'undefined' : String(value).slice(0, 200)
          });
          resolve();
          if (oldObserver?.fulfilled) oldObserver.fulfilled(value);
        },
        rejected: (error) => {
          clearTimeout(timeoutId);
          results.set(fullName, {
            state: 'failed',
            name,
            module: moduleName,
            error: error?.message || String(error)
          });
          resolve();
          if (oldObserver?.rejected) oldObserver.rejected(error);
        },
        pending: () => {
          if (oldObserver?.pending) oldObserver.pending();
        }
      };
    });

    pendingPromises.push(p);
  }

  // Trigger computation
  actualRuntime._computeNow();

  // Wait for completion
  await Promise.race([
    Promise.all(pendingPromises),
    new Promise(resolve => setTimeout(resolve, testTimeout + 5000))
  ]);

  const tests = [...results.values()];
  const passed = tests.filter(t => t.state === 'passed').length;
  const failed = tests.filter(t => t.state === 'failed').length;
  const timeout_count = tests.filter(t => t.state === 'timeout').length;

  return { tests, summary: { total: tests.length, passed, failed, timeout: timeout_count } };
}

/**
 * Read test results from latest_state Map (natural observation)
 * Designed to be called via page.evaluate()
 *
 * @param {string|null} filterStr - Optional filter
 * @returns {Object} { tests, counts, total } or { error }
 */
export function readLatestState(filterStr) {
  const runtime = window.__ojs_runtime;
  if (!runtime) return { error: 'Runtime not found' };

  // Find latest_state variable
  let latestState = null;
  for (const v of runtime._variables) {
    if (v._name === 'latest_state' && v._value instanceof Map) {
      latestState = v._value;
      break;
    }
  }

  if (!latestState) {
    return { error: 'latest_state not found - is the tests module rendered?' };
  }

  const tests = [];
  const counts = { fulfilled: 0, rejected: 0, pending: 0, paused: 0 };

  for (const [key, val] of latestState) {
    if (filterStr && !key.includes(filterStr)) {
      continue;
    }

    counts[val.state] = (counts[val.state] || 0) + 1;
    tests.push({
      name: key,
      state: val.state === 'fulfilled' ? 'passed' :
             val.state === 'rejected' ? 'failed' : val.state,
      error: val.error?.message || val.error,
      value: val.value === undefined ? undefined :
             typeof val.value === 'object' ? JSON.stringify(val.value).slice(0, 200) :
             String(val.value).slice(0, 200)
    });
  }

  return { tests, counts, total: latestState.size };
}

/**
 * Get info about a specific cell
 * Designed to be called via page.evaluate()
 *
 * @param {string} cellName - Name of cell to find
 * @returns {Object} Cell info or { error }
 */
export function getCellInfo(cellName) {
  const runtime = window.__ojs_runtime;
  if (!runtime) return { error: 'Runtime not found' };

  // Inline serialize to avoid dependency issues in page context
  const serialize = (value, maxLen = 500) => {
    if (value === undefined) return 'undefined';
    if (value === null) return 'null';
    if (value instanceof Error) return `Error: ${value.message}`;
    if (typeof value === 'function') return value.toString().slice(0, maxLen);
    if (value instanceof HTMLElement) {
      return `<${value.tagName.toLowerCase()}> (${value.outerHTML.slice(0, 100)}...)`;
    }
    if (typeof value === 'object') {
      try {
        return JSON.stringify(value, null, 2).slice(0, maxLen);
      } catch {
        return String(value);
      }
    }
    return String(value).slice(0, maxLen);
  };

  for (const v of runtime._variables) {
    if (v._name === cellName) {
      return {
        name: v._name,
        hasValue: v._value !== undefined,
        hasError: v._error !== undefined,
        value: serialize(v._value),
        error: v._error?.message,
        reachable: v._reachable
      };
    }
  }
  return { error: `Cell not found: ${cellName}` };
}

/**
 * List all variables in the runtime
 * Note: This lists runtime variables, not cells. A cell like "viewof foo"
 * creates multiple variables ("viewof foo" and "foo").
 *
 * Designed to be called via page.evaluate()
 *
 * @returns {Array} Array of variable info objects
 */
export function listAllVariables() {
  const runtime = window.__ojs_runtime;
  if (!runtime) return { error: 'Runtime not found' };

  const variables = [];
  for (const v of runtime._variables) {
    if (!v._name) continue;
    variables.push({
      name: v._name,
      hasValue: v._value !== undefined,
      hasError: v._error !== undefined,
      reachable: v._reachable
    });
  }

  return variables.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Serialize a value for output (handles various types)
 * @param {*} value - Value to serialize
 * @param {number} maxLen - Max string length
 * @returns {string} Serialized value
 */
export function serializeValue(value, maxLen = 500) {
  if (value === undefined) return 'undefined';
  if (value === null) return 'null';
  if (value instanceof Error) return `Error: ${value.message}`;
  if (typeof value === 'function') return value.toString().slice(0, maxLen);
  if (value instanceof HTMLElement) {
    return `<${value.tagName.toLowerCase()}> (${value.outerHTML.slice(0, 100)}...)`;
  }
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value, null, 2).slice(0, maxLen);
    } catch {
      return String(value);
    }
  }
  return String(value).slice(0, maxLen);
}

/**
 * Find a module by name in the runtime
 * @param {Object} runtime - window.__ojs_runtime
 * @param {string|null} moduleName - Module name to find, or null for main
 * @returns {Object|null} The module or null
 */
export function findModule(runtime, moduleName) {
  if (!moduleName) {
    // Return main module (first variable's module)
    for (const v of runtime._variables) {
      if (v._module) return v._module;
    }
    return null;
  }

  // Find module by name
  for (const v of runtime._variables) {
    if (v._module?._name === moduleName) {
      return v._module;
    }
    // Also check for "module @..." naming pattern
    if (v._name?.startsWith('module ') && v._name === `module ${moduleName}`) {
      return v._module;
    }
  }
  return null;
}

/**
 * Define or redefine a single variable in the runtime
 * Note: This creates ONE runtime variable. Observable cells like "viewof foo"
 * actually create multiple variables (viewof foo, foo). For complex cells,
 * use the compile() function from @tomlarkworthy/observablejs-toolchain.
 *
 * Designed to be called via page.evaluate()
 *
 * @param {Object} options - { name, inputs, definition, moduleName }
 *   - name: Variable name (string)
 *   - inputs: Array of input variable names (default [])
 *   - definition: Function definition as string, e.g. "() => 'hello'"
 *   - moduleName: Optional module name (null for main module)
 * @returns {Object} { success, name, module } or { error }
 */
export function defineVariable({ name, inputs = [], definition, moduleName = null }) {
  const runtime = window.__ojs_runtime;
  if (!runtime) return { error: 'Runtime not found' };

  // Find the module
  let targetModule = null;
  if (!moduleName) {
    // Use main module
    for (const v of runtime._variables) {
      if (v._module) {
        targetModule = v._module;
        break;
      }
    }
  } else {
    // Find by name
    for (const v of runtime._variables) {
      if (v._module?._name === moduleName) {
        targetModule = v._module;
        break;
      }
      // Also check "module @..." naming
      if (v._name === `module ${moduleName}`) {
        targetModule = v._module;
        break;
      }
    }
  }

  if (!targetModule) {
    return { error: `Module not found: ${moduleName || 'main'}` };
  }

  // Check if variable already exists
  let existingVar = null;
  for (const v of runtime._variables) {
    if (v._name === name && v._module === targetModule) {
      existingVar = v;
      break;
    }
  }

  // Parse the definition string into a function
  let fn;
  try {
    eval('fn = ' + definition);
    if (typeof fn !== 'function') {
      return { error: 'Definition must evaluate to a function' };
    }
  } catch (e) {
    return { error: `Failed to parse definition: ${e.message}` };
  }

  // Define the variable
  try {
    if (existingVar) {
      // Redefine existing variable
      existingVar.define(name, inputs, fn);
    } else {
      // Create new variable
      const newVar = targetModule.variable({});
      newVar.define(name, inputs, fn);
    }

    // Trigger recomputation
    const actualRuntime = targetModule._runtime;
    if (actualRuntime?._computeNow) {
      actualRuntime._computeNow();
    }

    return {
      success: true,
      name,
      module: targetModule._name || 'main',
      redefined: !!existingVar
    };
  } catch (e) {
    return { error: `Failed to define variable: ${e.message}` };
  }
}

/**
 * Delete a variable from the runtime
 * Designed to be called via page.evaluate()
 *
 * @param {Object} options - { name, moduleName }
 *   - name: Variable name to delete (string)
 *   - moduleName: Optional module name (null for main module)
 * @returns {Object} { success, name, module } or { error }
 */
export function deleteVariable({ name, moduleName = null }) {
  const runtime = window.__ojs_runtime;
  if (!runtime) return { error: 'Runtime not found' };

  // Find the module
  let targetModule = null;
  if (!moduleName) {
    for (const v of runtime._variables) {
      if (v._module) {
        targetModule = v._module;
        break;
      }
    }
  } else {
    for (const v of runtime._variables) {
      if (v._module?._name === moduleName) {
        targetModule = v._module;
        break;
      }
      if (v._name === `module ${moduleName}`) {
        targetModule = v._module;
        break;
      }
    }
  }

  if (!targetModule) {
    return { error: `Module not found: ${moduleName || 'main'}` };
  }

  // Find and delete the variable
  for (const v of runtime._variables) {
    if (v._name === name && v._module === targetModule) {
      v.delete();
      return {
        success: true,
        name,
        module: targetModule._name || 'main'
      };
    }
  }

  return { error: `Variable not found: ${name} in module ${moduleName || 'main'}` };
}

/**
 * Generate TAP format report from test results
 * @param {Array} tests - Array of test result objects
 * @returns {Object} { output, passed, failed, total }
 */
export function generateTAPReport(tests) {
  const totalTests = tests.length;

  let output = 'TAP version 13\n';
  output += `1..${totalTests}\n`;

  let testIndex = 0;
  let passed = 0;
  let failed = 0;

  // Sort by module then name
  const sortedTests = [...tests].sort((a, b) => {
    const modCmp = (a.module || '').localeCompare(b.module || '');
    if (modCmp !== 0) return modCmp;
    return (a.name || '').localeCompare(b.name || '');
  });

  for (const test of sortedTests) {
    testIndex++;
    const fullName = test.module ? `${test.module}#${test.name}` : test.name;

    if (test.state === 'passed') {
      output += `ok ${testIndex} - ${fullName}\n`;
      passed++;
    } else if (test.state === 'timeout') {
      output += `not ok ${testIndex} - ${fullName} # TIMEOUT\n`;
      failed++;
    } else {
      output += `not ok ${testIndex} - ${fullName}\n`;
      if (test.error) {
        output += `  ---\n`;
        output += `  message: ${test.error.slice(0, 500)}\n`;
        output += `  ...\n`;
      }
      failed++;
    }
  }

  output += `# tests ${totalTests}\n`;
  output += `# pass ${passed}\n`;
  output += `# fail ${failed}\n`;

  return { output, passed, failed, total: totalTests };
}
