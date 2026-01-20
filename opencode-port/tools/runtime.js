/**
 * runtime.js - Runtime and module tools
 *
 * Tools for working with the Observable runtime and modules.
 */

import { defineTool } from '../tool.js';

// ==================== List Modules Tool ====================

/**
 * Tool to list all modules in the notebook
 */
export const listModulesTool = defineTool({
  id: 'list_modules',
  description: 'List all modules loaded in the notebook runtime.',
  parameters: {
    type: 'object',
    properties: {},
    required: []
  },
  execute: async (args, ctx) => {
    const runtime = ctx.runtime;

    if (!runtime) {
      return {
        title: 'List modules',
        output: 'Error: Observable runtime not found (window.__ojs_runtime)',
        metadata: { error: true }
      };
    }

    // Build module map
    const modules = new Map();
    for (const v of runtime._variables) {
      if (v._module && !modules.has(v._module)) {
        const modName = v._module._name ||
          (v._name?.startsWith('module ') ? v._name.replace('module ', '') : null) ||
          'main';
        modules.set(v._module, { name: modName, variables: 0 });
      }
      if (v._module && v._name) {
        const mod = modules.get(v._module);
        if (mod) mod.variables++;
      }
    }

    const moduleList = [...modules.values()].sort((a, b) => a.name.localeCompare(b.name));

    return {
      title: `List modules (${moduleList.length} found)`,
      output: moduleList.map(m => `${m.name} (${m.variables} variables)`).join('\n'),
      metadata: { count: moduleList.length, modules: moduleList }
    };
  }
});

// ==================== Run Tests Tool ====================

/**
 * Tool to run test_* variables in the notebook
 */
export const runTestsTool = defineTool({
  id: 'run_tests',
  description: 'Run all test_* variables in the notebook and return results.',
  parameters: {
    type: 'object',
    properties: {
      filter: {
        type: 'string',
        description: 'Optional filter to match test names or module names'
      },
      timeout: {
        type: 'number',
        description: 'Timeout per test in milliseconds (default 10000)'
      }
    },
    required: []
  },
  execute: async (args, ctx) => {
    const { filter, timeout = 10000 } = args;
    const runtime = ctx.runtime;

    if (!runtime) {
      return {
        title: 'Run tests',
        output: 'Error: Observable runtime not found (window.__ojs_runtime)',
        metadata: { error: true }
      };
    }

    // Find actual runtime
    let actualRuntime = null;
    for (const v of runtime._variables) {
      if (v._module?._runtime?._computeNow) {
        actualRuntime = v._module._runtime;
        break;
      }
    }

    if (!actualRuntime) {
      return {
        title: 'Run tests',
        output: 'Error: Could not find actual runtime',
        metadata: { error: true }
      };
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
        if (filter) {
          const moduleName = moduleNames.get(variable._module) || '';
          if (!name.includes(filter) && !moduleName.includes(filter)) {
            continue;
          }
        }
        testVars.push(variable);
      }
    }

    if (testVars.length === 0) {
      return {
        title: 'Run tests',
        output: filter ? `No tests found matching "${filter}"` : 'No test_* variables found',
        metadata: { count: 0, tests: [] }
      };
    }

    // Run tests
    const results = new Map();
    const pendingPromises = [];

    for (const v of testVars) {
      const name = v._name;
      const moduleName = moduleNames.get(v._module) || 'main';
      const fullName = `${moduleName}#${name}`;

      const p = new Promise((resolve) => {
        const timeoutId = setTimeout(() => {
          results.set(fullName, { state: 'timeout', name, module: moduleName });
          resolve();
        }, timeout);

        // Force reachable
        if (!v._reachable) {
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

    // Wait for all tests
    await Promise.race([
      Promise.all(pendingPromises),
      new Promise(resolve => setTimeout(resolve, timeout + 5000))
    ]);

    const tests = [...results.values()];
    const passed = tests.filter(t => t.state === 'passed').length;
    const failed = tests.filter(t => t.state === 'failed').length;
    const timedOut = tests.filter(t => t.state === 'timeout').length;

    // Format output
    const output = tests.map(t => {
      if (t.state === 'passed') {
        return `✓ ${t.module}#${t.name}`;
      } else if (t.state === 'failed') {
        return `✗ ${t.module}#${t.name}: ${t.error}`;
      } else {
        return `⏱ ${t.module}#${t.name}: timeout`;
      }
    }).join('\n');

    const summary = `\n---\nTotal: ${tests.length}, Passed: ${passed}, Failed: ${failed}, Timeout: ${timedOut}`;

    return {
      title: `Run tests (${passed}/${tests.length} passed)`,
      output: output + summary,
      metadata: {
        total: tests.length,
        passed,
        failed,
        timeout: timedOut,
        tests
      }
    };
  }
});

// ==================== Eval Tool ====================

/**
 * Tool to evaluate JavaScript in the runtime context
 */
export const evalTool = defineTool({
  id: 'eval',
  description: 'Evaluate JavaScript code in the notebook runtime context. Has access to window.__ojs_runtime.',
  parameters: {
    type: 'object',
    properties: {
      code: {
        type: 'string',
        description: 'JavaScript code to evaluate'
      }
    },
    required: ['code']
  },
  execute: async (args, ctx) => {
    const { code } = args;

    try {
      // This runs in browser context where eval has access to the runtime
      const result = eval(code);

      // Serialize result
      const serialize = (value, maxLen = 2000) => {
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

      return {
        title: 'Eval',
        output: serialize(result),
        metadata: { type: typeof result }
      };
    } catch (e) {
      return {
        title: 'Eval',
        output: `Error: ${e.message}`,
        metadata: { error: true }
      };
    }
  }
});

// ==================== Search Cells Tool ====================

/**
 * Tool to search for cells by content
 */
export const searchCellsTool = defineTool({
  id: 'search_cells',
  description: 'Search for cells containing specific text in their source code or values.',
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Text to search for'
      },
      limit: {
        type: 'number',
        description: 'Maximum number of results (default 20)'
      }
    },
    required: ['query']
  },
  execute: async (args, ctx) => {
    const { query, limit = 20 } = args;
    const runtime = ctx.runtime;

    if (!runtime) {
      return {
        title: `Search: ${query}`,
        output: 'Error: Observable runtime not found (window.__ojs_runtime)',
        metadata: { error: true }
      };
    }

    const queryLower = query.toLowerCase();
    const matches = [];

    // Build module name lookup
    const moduleNames = new Map();
    for (const v of runtime._variables) {
      if (v._module && !moduleNames.has(v._module)) {
        const modName = v._module._name ||
          (v._name?.startsWith('module ') ? v._name.replace('module ', '') : null) ||
          'main';
        moduleNames.set(v._module, modName);
      }
    }

    for (const v of runtime._variables) {
      if (!v._name) continue;

      const moduleName = moduleNames.get(v._module) || 'main';
      let matchReason = null;

      // Search in name
      if (v._name.toLowerCase().includes(queryLower)) {
        matchReason = 'name';
      }

      // Search in definition (if it's a function)
      if (!matchReason && v._definition && typeof v._definition === 'function') {
        const defStr = v._definition.toString();
        if (defStr.toLowerCase().includes(queryLower)) {
          matchReason = 'definition';
        }
      }

      // Search in value (if string)
      if (!matchReason && typeof v._value === 'string') {
        if (v._value.toLowerCase().includes(queryLower)) {
          matchReason = 'value';
        }
      }

      if (matchReason) {
        matches.push({
          name: v._name,
          module: moduleName,
          matchReason,
          hasValue: v._value !== undefined,
          hasError: v._error !== undefined
        });

        if (matches.length >= limit) break;
      }
    }

    return {
      title: `Search: ${query} (${matches.length} found)`,
      output: matches.map(m =>
        `${m.module}#${m.name} [matched ${m.matchReason}]`
      ).join('\n') || 'No matches found',
      metadata: { count: matches.length, matches }
    };
  }
});

// ==================== Register All Runtime Tools ====================

/**
 * Register all runtime tools with a registry
 * @param {Object} registry - Tool registry
 */
export function registerRuntimeTools(registry) {
  registry.register(listModulesTool);
  registry.register(runTestsTool);
  registry.register(evalTool);
  registry.register(searchCellsTool);
}

/**
 * Get all runtime tools as an array
 * @returns {Array} Array of tool definitions
 */
export function getRuntimeTools() {
  return [
    listModulesTool,
    runTestsTool,
    evalTool,
    searchCellsTool
  ];
}
