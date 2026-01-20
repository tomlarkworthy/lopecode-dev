/**
 * Lopecode Opencode Port - Tools
 *
 * Tools for notebook manipulation and runtime interaction.
 */

// Cell tools
export {
  readCellTool,
  listCellsTool,
  defineCellTool,
  deleteCellTool,
  getCellValueTool,
  registerCellTools,
  getCellTools
} from './cell.js';

// Runtime tools
export {
  listModulesTool,
  runTestsTool,
  evalTool,
  searchCellsTool,
  registerRuntimeTools,
  getRuntimeTools
} from './runtime.js';

// Register all tools
import { registerCellTools, getCellTools } from './cell.js';
import { registerRuntimeTools, getRuntimeTools } from './runtime.js';

/**
 * Register all notebook tools with a registry
 * @param {Object} registry - Tool registry
 */
export function registerAllTools(registry) {
  registerCellTools(registry);
  registerRuntimeTools(registry);
}

/**
 * Get all notebook tools as an array
 * @returns {Array} Array of tool definitions
 */
export function getAllTools() {
  return [...getCellTools(), ...getRuntimeTools()];
}
