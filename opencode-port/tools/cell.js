/**
 * cell.js - Notebook cell manipulation tools
 *
 * Tools for reading, writing, and managing Observable notebook cells/variables.
 * These tools interact with the lopecode runtime (window.__ojs_runtime).
 */

import { defineTool } from '../tool.js';

// ==================== Read Cell Tool ====================

/**
 * Tool to read information about a cell/variable
 */
export const readCellTool = defineTool({
  id: 'read_cell',
  description: 'Read information about a notebook cell/variable including its current value and error state.',
  parameters: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'The name of the cell/variable to read'
      }
    },
    required: ['name']
  },
  execute: async (args, ctx) => {
    const { name } = args;
    const runtime = ctx.runtime;

    if (!runtime) {
      return {
        title: `Read cell: ${name}`,
        output: 'Error: Observable runtime not found (window.__ojs_runtime)',
        metadata: { error: true }
      };
    }

    // Find the variable
    let found = null;
    for (const v of runtime._variables) {
      if (v._name === name) {
        found = v;
        break;
      }
    }

    if (!found) {
      return {
        title: `Read cell: ${name}`,
        output: `Error: Cell not found: ${name}`,
        metadata: { error: true, notFound: true }
      };
    }

    // Serialize the value
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

    const result = {
      name: found._name,
      hasValue: found._value !== undefined,
      hasError: found._error !== undefined,
      value: serialize(found._value),
      error: found._error?.message,
      reachable: found._reachable,
      inputs: found._inputs?.map(i => i._name).filter(Boolean) || []
    };

    return {
      title: `Read cell: ${name}`,
      output: JSON.stringify(result, null, 2),
      metadata: result
    };
  }
});

// ==================== List Cells Tool ====================

/**
 * Tool to list all cells/variables in the notebook
 */
export const listCellsTool = defineTool({
  id: 'list_cells',
  description: 'List all cells/variables in the notebook runtime with their names and states.',
  parameters: {
    type: 'object',
    properties: {
      filter: {
        type: 'string',
        description: 'Optional filter string to match cell names'
      },
      module: {
        type: 'string',
        description: 'Optional module name to filter by'
      }
    },
    required: []
  },
  execute: async (args, ctx) => {
    const { filter, module } = args;
    const runtime = ctx.runtime;

    if (!runtime) {
      return {
        title: 'List cells',
        output: 'Error: Observable runtime not found (window.__ojs_runtime)',
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

    const variables = [];
    for (const v of runtime._variables) {
      if (!v._name) continue;

      const moduleName = moduleNames.get(v._module) || 'main';

      // Apply filters
      if (filter && !v._name.includes(filter)) continue;
      if (module && moduleName !== module && !moduleName.includes(module)) continue;

      variables.push({
        name: v._name,
        module: moduleName,
        hasValue: v._value !== undefined,
        hasError: v._error !== undefined,
        reachable: v._reachable
      });
    }

    // Sort by module, then name
    variables.sort((a, b) => {
      const modCmp = a.module.localeCompare(b.module);
      if (modCmp !== 0) return modCmp;
      return a.name.localeCompare(b.name);
    });

    return {
      title: `List cells (${variables.length} found)`,
      output: variables.map(v =>
        `${v.module}#${v.name} [${v.hasValue ? 'value' : v.hasError ? 'error' : 'pending'}]`
      ).join('\n'),
      metadata: { count: variables.length, variables }
    };
  }
});

// ==================== Define Cell Tool ====================

/**
 * Tool to define or redefine a cell/variable
 */
export const defineCellTool = defineTool({
  id: 'define_cell',
  description: 'Define or redefine a notebook cell/variable with new code. The definition should be a JavaScript function string.',
  parameters: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'The name of the cell/variable to define'
      },
      definition: {
        type: 'string',
        description: 'JavaScript function definition, e.g., "() => 42" or "(x, y) => x + y"'
      },
      inputs: {
        type: 'array',
        items: { type: 'string' },
        description: 'Array of input variable names this cell depends on'
      },
      module: {
        type: 'string',
        description: 'Optional module name to define the cell in'
      }
    },
    required: ['name', 'definition']
  },
  execute: async (args, ctx) => {
    const { name, definition, inputs = [], module: moduleName } = args;
    const runtime = ctx.runtime;

    if (!runtime) {
      return {
        title: `Define cell: ${name}`,
        output: 'Error: Observable runtime not found (window.__ojs_runtime)',
        metadata: { error: true }
      };
    }

    // Find the target module
    let targetModule = null;
    if (!moduleName) {
      // Use main module (first variable's module)
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
        if (v._name === `module ${moduleName}`) {
          targetModule = v._module;
          break;
        }
      }
    }

    if (!targetModule) {
      return {
        title: `Define cell: ${name}`,
        output: `Error: Module not found: ${moduleName || 'main'}`,
        metadata: { error: true }
      };
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
        return {
          title: `Define cell: ${name}`,
          output: 'Error: Definition must evaluate to a function',
          metadata: { error: true }
        };
      }
    } catch (e) {
      return {
        title: `Define cell: ${name}`,
        output: `Error: Failed to parse definition: ${e.message}`,
        metadata: { error: true }
      };
    }

    // Define the variable
    try {
      if (existingVar) {
        existingVar.define(name, inputs, fn);
      } else {
        const newVar = targetModule.variable({});
        newVar.define(name, inputs, fn);
      }

      // Trigger recomputation
      const actualRuntime = targetModule._runtime;
      if (actualRuntime?._computeNow) {
        actualRuntime._computeNow();
      }

      return {
        title: `Define cell: ${name}`,
        output: `Successfully ${existingVar ? 'redefined' : 'defined'} cell "${name}" in module "${targetModule._name || 'main'}"`,
        metadata: {
          name,
          module: targetModule._name || 'main',
          redefined: !!existingVar,
          inputs
        }
      };
    } catch (e) {
      return {
        title: `Define cell: ${name}`,
        output: `Error: Failed to define variable: ${e.message}`,
        metadata: { error: true }
      };
    }
  }
});

// ==================== Delete Cell Tool ====================

/**
 * Tool to delete a cell/variable
 */
export const deleteCellTool = defineTool({
  id: 'delete_cell',
  description: 'Delete a cell/variable from the notebook runtime.',
  parameters: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'The name of the cell/variable to delete'
      },
      module: {
        type: 'string',
        description: 'Optional module name containing the cell'
      }
    },
    required: ['name']
  },
  execute: async (args, ctx) => {
    const { name, module: moduleName } = args;
    const runtime = ctx.runtime;

    if (!runtime) {
      return {
        title: `Delete cell: ${name}`,
        output: 'Error: Observable runtime not found (window.__ojs_runtime)',
        metadata: { error: true }
      };
    }

    // Find the target module
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
      return {
        title: `Delete cell: ${name}`,
        output: `Error: Module not found: ${moduleName || 'main'}`,
        metadata: { error: true }
      };
    }

    // Find and delete the variable
    for (const v of runtime._variables) {
      if (v._name === name && v._module === targetModule) {
        v.delete();
        return {
          title: `Delete cell: ${name}`,
          output: `Successfully deleted cell "${name}" from module "${targetModule._name || 'main'}"`,
          metadata: {
            name,
            module: targetModule._name || 'main'
          }
        };
      }
    }

    return {
      title: `Delete cell: ${name}`,
      output: `Error: Variable not found: ${name} in module ${moduleName || 'main'}`,
      metadata: { error: true, notFound: true }
    };
  }
});

// ==================== Get Cell Value Tool ====================

/**
 * Tool to get the computed value of a cell (forces computation if needed)
 */
export const getCellValueTool = defineTool({
  id: 'get_cell_value',
  description: 'Get the computed value of a cell, forcing computation if needed.',
  parameters: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'The name of the cell/variable'
      },
      timeout: {
        type: 'number',
        description: 'Timeout in milliseconds (default 5000)'
      }
    },
    required: ['name']
  },
  execute: async (args, ctx) => {
    const { name, timeout = 5000 } = args;
    const runtime = ctx.runtime;

    if (!runtime) {
      return {
        title: `Get value: ${name}`,
        output: 'Error: Observable runtime not found (window.__ojs_runtime)',
        metadata: { error: true }
      };
    }

    // Find the variable
    let found = null;
    for (const v of runtime._variables) {
      if (v._name === name) {
        found = v;
        break;
      }
    }

    if (!found) {
      return {
        title: `Get value: ${name}`,
        output: `Error: Cell not found: ${name}`,
        metadata: { error: true, notFound: true }
      };
    }

    // Find actual runtime for _computeNow
    let actualRuntime = null;
    for (const v of runtime._variables) {
      if (v._module?._runtime?._computeNow) {
        actualRuntime = v._module._runtime;
        break;
      }
    }

    // Force reachability and compute
    if (!found._reachable && actualRuntime) {
      found._reachable = true;
      actualRuntime._dirty.add(found);
      actualRuntime._computeNow();
    }

    // Wait for value with timeout
    return new Promise((resolve) => {
      const timeoutId = setTimeout(() => {
        resolve({
          title: `Get value: ${name}`,
          output: 'Error: Timeout waiting for cell value',
          metadata: { error: true, timeout: true }
        });
      }, timeout);

      // If already has value or error, return immediately
      if (found._value !== undefined || found._error !== undefined) {
        clearTimeout(timeoutId);

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

        if (found._error) {
          resolve({
            title: `Get value: ${name}`,
            output: `Error: ${found._error.message}`,
            metadata: { error: true, cellError: found._error.message }
          });
        } else {
          resolve({
            title: `Get value: ${name}`,
            output: serialize(found._value),
            metadata: { value: found._value }
          });
        }
        return;
      }

      // Install observer to wait for value
      const oldObserver = found._observer;
      found._observer = {
        fulfilled: (value) => {
          clearTimeout(timeoutId);
          found._observer = oldObserver;

          const serialize = (value, maxLen = 2000) => {
            if (value === undefined) return 'undefined';
            if (value === null) return 'null';
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

          resolve({
            title: `Get value: ${name}`,
            output: serialize(value),
            metadata: { value }
          });

          if (oldObserver?.fulfilled) oldObserver.fulfilled(value);
        },
        rejected: (error) => {
          clearTimeout(timeoutId);
          found._observer = oldObserver;
          resolve({
            title: `Get value: ${name}`,
            output: `Error: ${error?.message || String(error)}`,
            metadata: { error: true, cellError: error?.message }
          });
          if (oldObserver?.rejected) oldObserver.rejected(error);
        },
        pending: () => {
          if (oldObserver?.pending) oldObserver.pending();
        }
      };

      // Trigger computation
      if (actualRuntime?._computeNow) {
        actualRuntime._computeNow();
      }
    });
  }
});

// ==================== Register All Cell Tools ====================

/**
 * Register all cell tools with a registry
 * @param {Object} registry - Tool registry
 */
export function registerCellTools(registry) {
  registry.register(readCellTool);
  registry.register(listCellsTool);
  registry.register(defineCellTool);
  registry.register(deleteCellTool);
  registry.register(getCellValueTool);
}

/**
 * Get all cell tools as an array
 * @returns {Array} Array of tool definitions
 */
export function getCellTools() {
  return [
    readCellTool,
    listCellsTool,
    defineCellTool,
    deleteCellTool,
    getCellValueTool
  ];
}
