/**
 * loop.js - Agentic loop for lopecode opencode port
 *
 * Simplified from opencode's prompt.ts for browser use.
 * Manages the conversation loop, tool execution, and streaming.
 */

import {
  generateId,
  createUserMessage,
  createAssistantMessage,
  completeAssistantMessage,
  createTextPart,
  createReasoningPart,
  createToolPart,
  createStepStartPart,
  createStepFinishPart,
  toolStatePending,
  toolStateRunning,
  toolStateCompleted,
  toolStateError,
  createMessageWithParts,
  addPart,
  updatePart,
  createConversation,
  addMessage,
  isToolPart,
  isToolPending
} from './message.js';

import { createToolContext, toolToAnthropicFormat, toolToApiFormat } from './tool.js';
import { streamChat, openaiProvider, anthropicProvider } from './llm.js';

// ==================== Loop Configuration ====================

/**
 * @typedef {Object} LoopConfig
 * @property {string} providerId - Provider ID ('openai' or 'anthropic')
 * @property {string} modelId - Model ID
 * @property {string} apiKey - API key
 * @property {string} [systemPrompt] - System prompt
 * @property {Object} registry - Tool registry
 * @property {number} [maxSteps=10] - Maximum loop iterations
 * @property {Object} [settings] - Model settings (temperature, etc.)
 */

/**
 * @typedef {Object} LoopCallbacks
 * @property {function} [onStepStart] - Called at start of each step
 * @property {function} [onStepFinish] - Called at end of each step
 * @property {function} [onText] - Called with text chunks
 * @property {function} [onReasoning] - Called with reasoning chunks
 * @property {function} [onToolStart] - Called when tool execution starts
 * @property {function} [onToolFinish] - Called when tool execution finishes
 * @property {function} [onMessage] - Called when message is updated
 * @property {function} [onFinish] - Called when loop completes
 * @property {function} [onError] - Called on error
 */

// ==================== Agentic Loop ====================

/**
 * Create an agentic loop
 * @param {LoopConfig} config
 * @returns {Object} Loop controller
 */
export function createLoop(config) {
  const {
    providerId,
    modelId,
    apiKey,
    systemPrompt,
    registry,
    maxSteps = 10,
    settings = {}
  } = config;

  // Create provider
  const provider = providerId === 'anthropic'
    ? anthropicProvider({ apiKey })
    : openaiProvider({ apiKey });

  // Get tools in provider format
  const tools = providerId === 'anthropic'
    ? registry.toAnthropicFormat()
    : registry.toOpenAIFormat();

  // State
  let conversation = createConversation();
  let abortController = null;
  let isRunning = false;

  /**
   * Run the agentic loop with a user prompt
   * @param {string} userPrompt - User's message
   * @param {LoopCallbacks} callbacks - Event callbacks
   * @returns {Promise<Object>} Final conversation state
   */
  async function run(userPrompt, callbacks = {}) {
    if (isRunning) {
      throw new Error('Loop is already running');
    }

    isRunning = true;
    abortController = new AbortController();

    try {
      // Add user message
      const userMessage = createUserMessage({
        sessionId: conversation.id,
        agent: 'user',
        providerId,
        modelId,
        system: systemPrompt
      });

      const userWithParts = createMessageWithParts(userMessage, [
        createTextPart({
          sessionId: conversation.id,
          messageId: userMessage.id,
          text: userPrompt
        })
      ]);

      conversation = addMessage(conversation, userWithParts);

      // Run the loop
      let step = 0;
      while (step < maxSteps) {
        if (abortController.signal.aborted) {
          break;
        }

        callbacks.onStepStart?.(step);

        // Create assistant message
        const assistantMessage = createAssistantMessage({
          sessionId: conversation.id,
          parentId: userMessage.id,
          agent: 'assistant',
          providerId,
          modelId
        });

        let currentMessage = createMessageWithParts(assistantMessage, [
          createStepStartPart({
            sessionId: conversation.id,
            messageId: assistantMessage.id
          })
        ]);

        // Track current state
        let currentText = '';
        let currentReasoning = '';
        let currentTextPartId = null;
        let currentReasoningPartId = null;
        const pendingToolCalls = new Map();

        // Stream the response
        const result = await streamChat({
          provider,
          model: modelId,
          messages: conversationToMessages(conversation),
          systemPrompt,
          tools,
          signal: abortController.signal,
          settings,
          callbacks: {
            onText: (chunk) => {
              currentText += chunk;

              if (!currentTextPartId) {
                const textPart = createTextPart({
                  sessionId: conversation.id,
                  messageId: assistantMessage.id,
                  text: currentText
                });
                currentTextPartId = textPart.id;
                currentMessage = addPart(currentMessage, textPart);
              } else {
                currentMessage = updatePart(currentMessage, currentTextPartId, {
                  text: currentText
                });
              }

              callbacks.onText?.(chunk);
              callbacks.onMessage?.(currentMessage);
            },

            onReasoning: (chunk) => {
              currentReasoning += chunk;

              if (!currentReasoningPartId) {
                const reasoningPart = createReasoningPart({
                  sessionId: conversation.id,
                  messageId: assistantMessage.id,
                  text: currentReasoning
                });
                currentReasoningPartId = reasoningPart.id;
                currentMessage = addPart(currentMessage, reasoningPart);
              } else {
                currentMessage = updatePart(currentMessage, currentReasoningPartId, {
                  text: currentReasoning
                });
              }

              callbacks.onReasoning?.(chunk);
              callbacks.onMessage?.(currentMessage);
            },

            onToolCall: (callId, toolName) => {
              const toolPart = createToolPart({
                sessionId: conversation.id,
                messageId: assistantMessage.id,
                callId,
                tool: toolName,
                state: toolStatePending({}, '')
              });
              pendingToolCalls.set(callId, { toolName, args: '' });
              currentMessage = addPart(currentMessage, toolPart);
              callbacks.onMessage?.(currentMessage);
            },

            onToolCallDelta: (callId, chunk) => {
              const tc = pendingToolCalls.get(callId);
              if (tc) {
                tc.args += chunk;
              }
            },

            onError: (error) => {
              callbacks.onError?.(error);
            }
          }
        });

        // Finalize text part timing
        if (currentTextPartId) {
          currentMessage = updatePart(currentMessage, currentTextPartId, {
            time: { ...currentMessage.parts.find(p => p.id === currentTextPartId)?.time, end: Date.now() }
          });
        }

        // Execute pending tool calls
        let hasToolCalls = false;
        for (const [callId, tc] of pendingToolCalls) {
          hasToolCalls = true;

          // Parse arguments
          let input = {};
          try {
            input = JSON.parse(tc.args);
          } catch {
            // Keep empty object if parse fails
          }

          // Update to running state
          const startTime = Date.now();
          currentMessage = updateToolPart(currentMessage, callId, {
            state: toolStateRunning(input, `Running ${tc.toolName}`)
          });
          callbacks.onToolStart?.(callId, tc.toolName, input);
          callbacks.onMessage?.(currentMessage);

          // Execute tool
          const ctx = createToolContext({
            sessionId: conversation.id,
            messageId: assistantMessage.id,
            agent: 'assistant',
            callId,
            abort: abortController.signal,
            runtime: typeof window !== 'undefined' ? window.__ojs_runtime : null
          });

          const toolResult = await registry.execute(tc.toolName, input, ctx);

          // Update to completed/error state
          if (toolResult.metadata?.error) {
            currentMessage = updateToolPart(currentMessage, callId, {
              state: toolStateError({
                input,
                error: toolResult.output,
                startTime
              })
            });
          } else {
            currentMessage = updateToolPart(currentMessage, callId, {
              state: toolStateCompleted({
                input,
                output: toolResult.output,
                title: toolResult.title,
                metadata: toolResult.metadata,
                startTime
              })
            });
          }

          callbacks.onToolFinish?.(callId, tc.toolName, toolResult);
          callbacks.onMessage?.(currentMessage);
        }

        // Add step finish part
        const stepFinishPart = createStepFinishPart({
          sessionId: conversation.id,
          messageId: assistantMessage.id,
          reason: result.finishReason || 'unknown',
          tokens: result.usage || { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
          cost: 0
        });
        currentMessage = addPart(currentMessage, stepFinishPart);

        // Complete the assistant message
        currentMessage = {
          ...currentMessage,
          info: completeAssistantMessage(currentMessage.info, {
            finish: result.finishReason,
            tokens: result.usage,
            cost: 0
          })
        };

        // Add to conversation
        conversation = addMessage(conversation, currentMessage);

        callbacks.onStepFinish?.(step, currentMessage);

        // Decide whether to continue
        const shouldContinue = hasToolCalls && result.finishReason !== 'end_turn';

        if (!shouldContinue) {
          break;
        }

        step++;
      }

      callbacks.onFinish?.(conversation);
      return conversation;

    } finally {
      isRunning = false;
      abortController = null;
    }
  }

  /**
   * Cancel the current loop execution
   */
  function cancel() {
    if (abortController) {
      abortController.abort();
    }
  }

  /**
   * Get the current conversation state
   * @returns {Object}
   */
  function getConversation() {
    return conversation;
  }

  /**
   * Reset the conversation
   */
  function reset() {
    if (isRunning) {
      throw new Error('Cannot reset while running');
    }
    conversation = createConversation();
  }

  /**
   * Check if the loop is currently running
   * @returns {boolean}
   */
  function running() {
    return isRunning;
  }

  return {
    run,
    cancel,
    getConversation,
    reset,
    running
  };
}

// ==================== Helper Functions ====================

/**
 * Update a tool part in a message
 * @param {Object} message - Message with parts
 * @param {string} callId - Tool call ID
 * @param {Object} updates - Updates to apply
 * @returns {Object} Updated message
 */
function updateToolPart(message, callId, updates) {
  return {
    ...message,
    parts: message.parts.map(p =>
      isToolPart(p) && p.callId === callId ? { ...p, ...updates } : p
    )
  };
}

/**
 * Convert conversation to messages format for LLM
 * @param {Object} conversation
 * @returns {Array} Messages array
 */
function conversationToMessages(conversation) {
  return conversation.messages.map(msg => {
    const role = msg.info.role;

    if (role === 'user') {
      // Extract text from parts
      const textParts = msg.parts.filter(p => p.type === 'text');
      return {
        role: 'user',
        content: textParts.map(p => p.text).join('\n')
      };
    } else if (role === 'assistant') {
      return {
        role: 'assistant',
        parts: msg.parts
      };
    }

    return { role, content: '' };
  });
}

// ==================== Simple Run Function ====================

/**
 * Simple one-shot run of the agentic loop
 * @param {Object} options
 * @param {string} options.prompt - User prompt
 * @param {string} options.providerId - Provider ID
 * @param {string} options.modelId - Model ID
 * @param {string} options.apiKey - API key
 * @param {string} [options.systemPrompt] - System prompt
 * @param {Object} options.registry - Tool registry
 * @param {LoopCallbacks} [options.callbacks] - Callbacks
 * @returns {Promise<Object>} Conversation
 */
export async function runLoop(options) {
  const { prompt, callbacks, ...config } = options;
  const loop = createLoop(config);
  return loop.run(prompt, callbacks);
}
