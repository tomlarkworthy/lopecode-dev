/**
 * Lopecode Opencode Port
 *
 * Browser-based agentic loop for AI-assisted notebook development.
 * Ported from opencode (https://github.com/anthropics/opencode).
 */

// Message types
export {
  // ID generation
  generateId,

  // Message creators
  createUserMessage,
  createAssistantMessage,
  completeAssistantMessage,

  // Part creators
  createTextPart,
  createReasoningPart,
  createToolPart,
  createStepStartPart,
  createStepFinishPart,

  // Tool state creators
  toolStatePending,
  toolStateRunning,
  toolStateCompleted,
  toolStateError,

  // Part updates
  updateToolPartState,

  // Message with parts
  createMessageWithParts,
  addPart,
  updatePart,

  // Conversation
  createConversation,
  addMessage,
  getLastAssistantMessage,

  // Type guards
  isUserMessage,
  isAssistantMessage,
  isTextPart,
  isToolPart,
  isReasoningPart,
  isStepStartPart,
  isStepFinishPart,
  isToolCompleted,
  isToolError,
  isToolPending,
  isToolRunning
} from './message.js';

// Tool interface
export {
  // Tool context
  createToolContext,

  // Tool definition
  defineTool,
  validateParameters,

  // API format converters
  toolToApiFormat,
  toolToAnthropicFormat,

  // Registry
  createToolRegistry,
  getDefaultRegistry,
  registerTool,
  executeTool
} from './tool.js';

// LLM integration
export {
  // Provider configuration
  openaiProvider,
  anthropicProvider,

  // Message formatting
  toOpenAIMessages,
  toAnthropicMessages,

  // Streaming
  streamOpenAI,
  streamAnthropic,
  streamChat,

  // Non-streaming
  chat
} from './llm.js';

// Agentic loop
export {
  createLoop,
  runLoop
} from './loop.js';
