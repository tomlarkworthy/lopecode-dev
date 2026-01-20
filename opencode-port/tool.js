/**
 * tool.js - Tool interface for lopecode opencode port
 *
 * Simplified from opencode's tool.ts for browser use.
 * Uses JSON Schema instead of Zod for parameter validation.
 */

import { generateId } from './message.js';

/**
 * @typedef {Object} ToolContext
 * @property {string} sessionId - Session identifier
 * @property {string} messageId - Message identifier
 * @property {string} agent - Agent executing the tool
 * @property {AbortSignal} [abort] - Signal to abort execution
 * @property {string} [callId] - Tool call identifier
 * @property {function} metadata - Function to update execution metadata
 * @property {Object} runtime - Lopecode runtime reference (window.__ojs_runtime)
 */

/**
 * @typedef {Object} ToolResult
 * @property {string} title - Result title for display
 * @property {string} output - Tool output text
 * @property {Object} [metadata] - Additional metadata
 */

/**
 * @typedef {Object} ToolDefinition
 * @property {string} id - Unique tool identifier
 * @property {string} description - Tool description for LLM
 * @property {Object} parameters - JSON Schema for parameters
 * @property {function} execute - Execution function (args, ctx) => Promise<ToolResult>
 */

/**
 * Create a tool context for execution
 * @param {Object} options
 * @param {string} options.sessionId
 * @param {string} options.messageId
 * @param {string} options.agent
 * @param {string} [options.callId]
 * @param {AbortSignal} [options.abort]
 * @param {Object} [options.runtime]
 * @returns {ToolContext}
 */
export function createToolContext({ sessionId, messageId, agent, callId, abort, runtime }) {
  let currentMetadata = {};

  return {
    sessionId,
    messageId,
    agent,
    callId: callId || generateId(),
    abort: abort || new AbortController().signal,
    runtime: runtime || (typeof window !== 'undefined' ? window.__ojs_runtime : null),

    /**
     * Update execution metadata
     * @param {Object} update - Metadata to merge
     */
    metadata(update) {
      currentMetadata = { ...currentMetadata, ...update };
    },

    /**
     * Get current metadata
     * @returns {Object}
     */
    getMetadata() {
      return currentMetadata;
    }
  };
}

/**
 * Define a tool with validation
 * @param {ToolDefinition} definition
 * @returns {ToolDefinition} Validated tool definition
 */
export function defineTool({ id, description, parameters, execute }) {
  if (!id || typeof id !== 'string') {
    throw new Error('Tool must have a string id');
  }
  if (!description || typeof description !== 'string') {
    throw new Error('Tool must have a string description');
  }
  if (!parameters || typeof parameters !== 'object') {
    throw new Error('Tool must have a parameters object (JSON Schema)');
  }
  if (!execute || typeof execute !== 'function') {
    throw new Error('Tool must have an execute function');
  }

  return {
    id,
    description,
    parameters,
    execute: async (args, ctx) => {
      try {
        // Check for abort before execution
        if (ctx.abort?.aborted) {
          return {
            title: `${id} aborted`,
            output: 'Execution was aborted',
            metadata: { aborted: true }
          };
        }

        const result = await execute(args, ctx);

        // Ensure result has required fields
        return {
          title: result.title || `${id} completed`,
          output: typeof result.output === 'string' ? result.output : JSON.stringify(result.output),
          metadata: {
            ...ctx.getMetadata(),
            ...result.metadata
          }
        };
      } catch (error) {
        return {
          title: `${id} failed`,
          output: `Error: ${error.message}`,
          metadata: {
            error: true,
            errorMessage: error.message
          }
        };
      }
    }
  };
}

/**
 * Simple JSON Schema validator
 * Validates basic types and required fields
 * @param {Object} schema - JSON Schema
 * @param {*} value - Value to validate
 * @returns {{valid: boolean, errors: string[]}}
 */
export function validateParameters(schema, value) {
  const errors = [];

  if (schema.type === 'object') {
    if (typeof value !== 'object' || value === null) {
      errors.push('Expected object');
      return { valid: false, errors };
    }

    // Check required fields
    if (schema.required) {
      for (const field of schema.required) {
        if (!(field in value)) {
          errors.push(`Missing required field: ${field}`);
        }
      }
    }

    // Validate properties
    if (schema.properties) {
      for (const [key, propSchema] of Object.entries(schema.properties)) {
        if (key in value) {
          const propResult = validateParameters(propSchema, value[key]);
          if (!propResult.valid) {
            errors.push(...propResult.errors.map(e => `${key}: ${e}`));
          }
        }
      }
    }
  } else if (schema.type === 'string') {
    if (typeof value !== 'string') {
      errors.push(`Expected string, got ${typeof value}`);
    }
  } else if (schema.type === 'number' || schema.type === 'integer') {
    if (typeof value !== 'number') {
      errors.push(`Expected number, got ${typeof value}`);
    }
  } else if (schema.type === 'boolean') {
    if (typeof value !== 'boolean') {
      errors.push(`Expected boolean, got ${typeof value}`);
    }
  } else if (schema.type === 'array') {
    if (!Array.isArray(value)) {
      errors.push(`Expected array, got ${typeof value}`);
    } else if (schema.items) {
      value.forEach((item, i) => {
        const itemResult = validateParameters(schema.items, item);
        if (!itemResult.valid) {
          errors.push(...itemResult.errors.map(e => `[${i}]: ${e}`));
        }
      });
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Convert tool definition to OpenAI/Anthropic function format
 * @param {ToolDefinition} tool
 * @returns {Object} Tool in API format
 */
export function toolToApiFormat(tool) {
  return {
    type: 'function',
    function: {
      name: tool.id,
      description: tool.description,
      parameters: tool.parameters
    }
  };
}

/**
 * Convert tool definition to Anthropic tool format
 * @param {ToolDefinition} tool
 * @returns {Object} Tool in Anthropic format
 */
export function toolToAnthropicFormat(tool) {
  return {
    name: tool.id,
    description: tool.description,
    input_schema: tool.parameters
  };
}

// ==================== Tool Registry ====================

/**
 * @typedef {Object} ToolRegistry
 * @property {Map<string, ToolDefinition>} tools - Registered tools
 */

/**
 * Create a tool registry
 * @returns {Object} Registry with register/get/list methods
 */
export function createToolRegistry() {
  const tools = new Map();

  return {
    /**
     * Register a tool
     * @param {ToolDefinition} tool
     */
    register(tool) {
      if (tools.has(tool.id)) {
        console.warn(`Tool ${tool.id} already registered, replacing`);
      }
      tools.set(tool.id, tool);
    },

    /**
     * Unregister a tool
     * @param {string} id
     * @returns {boolean} True if tool was removed
     */
    unregister(id) {
      return tools.delete(id);
    },

    /**
     * Get a tool by ID
     * @param {string} id
     * @returns {ToolDefinition|undefined}
     */
    get(id) {
      return tools.get(id);
    },

    /**
     * Check if a tool exists
     * @param {string} id
     * @returns {boolean}
     */
    has(id) {
      return tools.has(id);
    },

    /**
     * Get all tool IDs
     * @returns {string[]}
     */
    ids() {
      return [...tools.keys()];
    },

    /**
     * Get all tools
     * @returns {ToolDefinition[]}
     */
    all() {
      return [...tools.values()];
    },

    /**
     * Get tools in OpenAI API format
     * @returns {Object[]}
     */
    toOpenAIFormat() {
      return this.all().map(toolToApiFormat);
    },

    /**
     * Get tools in Anthropic API format
     * @returns {Object[]}
     */
    toAnthropicFormat() {
      return this.all().map(toolToAnthropicFormat);
    },

    /**
     * Execute a tool by ID
     * @param {string} id - Tool ID
     * @param {Object} args - Tool arguments
     * @param {ToolContext} ctx - Execution context
     * @returns {Promise<ToolResult>}
     */
    async execute(id, args, ctx) {
      const tool = tools.get(id);
      if (!tool) {
        return {
          title: 'Tool not found',
          output: `Unknown tool: ${id}`,
          metadata: { error: true }
        };
      }

      // Validate parameters
      const validation = validateParameters(tool.parameters, args);
      if (!validation.valid) {
        return {
          title: 'Invalid parameters',
          output: `Parameter validation failed:\n${validation.errors.join('\n')}`,
          metadata: { error: true, validationErrors: validation.errors }
        };
      }

      return tool.execute(args, ctx);
    }
  };
}

// ==================== Default Global Registry ====================

let defaultRegistry = null;

/**
 * Get the default tool registry (creates one if needed)
 * @returns {Object} Default registry
 */
export function getDefaultRegistry() {
  if (!defaultRegistry) {
    defaultRegistry = createToolRegistry();
  }
  return defaultRegistry;
}

/**
 * Register a tool in the default registry
 * @param {ToolDefinition} tool
 */
export function registerTool(tool) {
  getDefaultRegistry().register(tool);
}

/**
 * Execute a tool from the default registry
 * @param {string} id
 * @param {Object} args
 * @param {ToolContext} ctx
 * @returns {Promise<ToolResult>}
 */
export function executeTool(id, args, ctx) {
  return getDefaultRegistry().execute(id, args, ctx);
}
