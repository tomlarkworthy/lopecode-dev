/**
 * llm.js - LLM API integration for lopecode opencode port
 *
 * Streaming fetch for OpenAI and Anthropic APIs.
 * Uses direct fetch with SSE parsing for streaming responses.
 */

import {
  generateId,
  createTextPart,
  createReasoningPart,
  createToolPart,
  toolStatePending,
  toolStateRunning
} from './message.js';

// ==================== Provider Configuration ====================

/**
 * OpenAI provider configuration
 * @param {Object} options
 * @param {string} options.apiKey - OpenAI API key
 * @param {string} [options.baseUrl] - API base URL
 * @returns {Object} Provider config
 */
export function openaiProvider({ apiKey, baseUrl = 'https://api.openai.com/v1' }) {
  return {
    id: 'openai',
    baseUrl,
    headers: () => ({
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }),
    chatEndpoint: `${baseUrl}/chat/completions`
  };
}

/**
 * Anthropic provider configuration
 * @param {Object} options
 * @param {string} options.apiKey - Anthropic API key
 * @param {string} [options.baseUrl] - API base URL
 * @param {string} [options.version] - API version
 * @returns {Object} Provider config
 */
export function anthropicProvider({
  apiKey,
  baseUrl = 'https://api.anthropic.com/v1',
  version = '2023-06-01'
}) {
  return {
    id: 'anthropic',
    baseUrl,
    headers: () => ({
      'x-api-key': apiKey,
      'anthropic-version': version,
      'anthropic-dangerous-direct-browser-access': 'true',
      'Content-Type': 'application/json'
    }),
    messagesEndpoint: `${baseUrl}/messages`
  };
}

// ==================== Message Formatting ====================

/**
 * Convert internal messages to OpenAI format
 * @param {Array} messages - Internal message format
 * @param {string} [systemPrompt] - System prompt
 * @returns {Array} OpenAI messages
 */
export function toOpenAIMessages(messages, systemPrompt) {
  const result = [];

  if (systemPrompt) {
    result.push({ role: 'system', content: systemPrompt });
  }

  for (const msg of messages) {
    if (msg.role === 'user') {
      result.push({ role: 'user', content: msg.content });
    } else if (msg.role === 'assistant') {
      // Handle text and tool calls
      const content = [];
      const toolCalls = [];

      for (const part of msg.parts || []) {
        if (part.type === 'text') {
          content.push(part.text);
        } else if (part.type === 'tool' && part.state?.status === 'completed') {
          toolCalls.push({
            id: part.callId,
            type: 'function',
            function: {
              name: part.tool,
              arguments: JSON.stringify(part.state.input)
            }
          });
        }
      }

      const assistantMsg = { role: 'assistant' };
      if (content.length > 0) {
        assistantMsg.content = content.join('\n');
      }
      if (toolCalls.length > 0) {
        assistantMsg.tool_calls = toolCalls;
      }
      result.push(assistantMsg);

      // Add tool results
      for (const part of msg.parts || []) {
        if (part.type === 'tool' && part.state?.status === 'completed') {
          result.push({
            role: 'tool',
            tool_call_id: part.callId,
            content: part.state.output
          });
        }
      }
    }
  }

  return result;
}

/**
 * Convert internal messages to Anthropic format
 * @param {Array} messages - Internal message format
 * @param {string} [systemPrompt] - System prompt (handled separately)
 * @returns {{system: string, messages: Array}} Anthropic format
 */
export function toAnthropicMessages(messages, systemPrompt) {
  const result = [];

  for (const msg of messages) {
    if (msg.role === 'user') {
      result.push({ role: 'user', content: msg.content });
    } else if (msg.role === 'assistant') {
      const content = [];

      for (const part of msg.parts || []) {
        if (part.type === 'text') {
          content.push({ type: 'text', text: part.text });
        } else if (part.type === 'tool') {
          content.push({
            type: 'tool_use',
            id: part.callId,
            name: part.tool,
            input: part.state?.input || {}
          });
        }
      }

      if (content.length > 0) {
        result.push({ role: 'assistant', content });
      }

      // Add tool results
      const toolResults = [];
      for (const part of msg.parts || []) {
        if (part.type === 'tool' && part.state?.status === 'completed') {
          toolResults.push({
            type: 'tool_result',
            tool_use_id: part.callId,
            content: part.state.output
          });
        }
      }
      if (toolResults.length > 0) {
        result.push({ role: 'user', content: toolResults });
      }
    }
  }

  return { system: systemPrompt || '', messages: result };
}

// ==================== SSE Parsing ====================

/**
 * Parse SSE (Server-Sent Events) stream
 * @param {ReadableStream} stream
 * @param {function} onEvent - Callback for each event
 * @param {AbortSignal} [signal]
 */
async function parseSSEStream(stream, onEvent, signal) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      if (signal?.aborted) break;

      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') {
            return;
          }
          try {
            const parsed = JSON.parse(data);
            onEvent(parsed);
          } catch (e) {
            // Ignore parse errors for incomplete JSON
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

// ==================== Streaming Chat ====================

/**
 * @typedef {Object} StreamCallbacks
 * @property {function} [onText] - Called with text chunks
 * @property {function} [onReasoning] - Called with reasoning chunks (extended thinking)
 * @property {function} [onToolCall] - Called when tool call starts
 * @property {function} [onToolCallDelta] - Called with tool call argument chunks
 * @property {function} [onFinish] - Called when stream completes
 * @property {function} [onError] - Called on error
 */

/**
 * Stream chat completion from OpenAI
 * @param {Object} options
 * @param {Object} options.provider - Provider config from openaiProvider()
 * @param {string} options.model - Model ID
 * @param {Array} options.messages - Messages in internal format
 * @param {string} [options.systemPrompt] - System prompt
 * @param {Array} [options.tools] - Tools in OpenAI format
 * @param {StreamCallbacks} options.callbacks - Stream callbacks
 * @param {AbortSignal} [options.signal]
 * @param {Object} [options.settings] - Additional model settings
 * @returns {Promise<Object>} Final response with usage
 */
export async function streamOpenAI({
  provider,
  model,
  messages,
  systemPrompt,
  tools,
  callbacks,
  signal,
  settings = {}
}) {
  const openaiMessages = toOpenAIMessages(messages, systemPrompt);

  const body = {
    model,
    messages: openaiMessages,
    stream: true,
    ...settings
  };

  if (tools && tools.length > 0) {
    body.tools = tools;
  }

  const response = await fetch(provider.chatEndpoint, {
    method: 'POST',
    headers: provider.headers(),
    body: JSON.stringify(body),
    signal
  });

  if (!response.ok) {
    const error = await response.text();
    callbacks.onError?.(new Error(`OpenAI API error: ${response.status} - ${error}`));
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  let currentToolCall = null;
  let finishReason = null;
  let usage = null;

  await parseSSEStream(response.body, (event) => {
    const delta = event.choices?.[0]?.delta;
    finishReason = event.choices?.[0]?.finish_reason || finishReason;
    usage = event.usage || usage;

    if (!delta) return;

    // Text content
    if (delta.content) {
      callbacks.onText?.(delta.content);
    }

    // Tool calls
    if (delta.tool_calls) {
      for (const tc of delta.tool_calls) {
        if (tc.id) {
          // New tool call
          currentToolCall = {
            id: tc.id,
            name: tc.function?.name || '',
            arguments: tc.function?.arguments || ''
          };
          callbacks.onToolCall?.(currentToolCall.id, currentToolCall.name);
        } else if (tc.function?.arguments && currentToolCall) {
          // Argument delta
          currentToolCall.arguments += tc.function.arguments;
          callbacks.onToolCallDelta?.(currentToolCall.id, tc.function.arguments);
        }
      }
    }
  }, signal);

  callbacks.onFinish?.({ finishReason, usage });

  return { finishReason, usage };
}

/**
 * Stream chat completion from Anthropic
 * @param {Object} options
 * @param {Object} options.provider - Provider config from anthropicProvider()
 * @param {string} options.model - Model ID
 * @param {Array} options.messages - Messages in internal format
 * @param {string} [options.systemPrompt] - System prompt
 * @param {Array} [options.tools] - Tools in Anthropic format
 * @param {StreamCallbacks} options.callbacks - Stream callbacks
 * @param {AbortSignal} [options.signal]
 * @param {Object} [options.settings] - Additional model settings
 * @returns {Promise<Object>} Final response with usage
 */
export async function streamAnthropic({
  provider,
  model,
  messages,
  systemPrompt,
  tools,
  callbacks,
  signal,
  settings = {}
}) {
  const { system, messages: anthropicMessages } = toAnthropicMessages(messages, systemPrompt);

  const body = {
    model,
    messages: anthropicMessages,
    max_tokens: settings.max_tokens || 4096,
    stream: true,
    ...settings
  };

  if (system) {
    body.system = system;
  }

  if (tools && tools.length > 0) {
    body.tools = tools;
  }

  const response = await fetch(provider.messagesEndpoint, {
    method: 'POST',
    headers: provider.headers(),
    body: JSON.stringify(body),
    signal
  });

  if (!response.ok) {
    const error = await response.text();
    callbacks.onError?.(new Error(`Anthropic API error: ${response.status} - ${error}`));
    throw new Error(`Anthropic API error: ${response.status}`);
  }

  let currentToolUse = null;
  let stopReason = null;
  let usage = null;

  await parseSSEStream(response.body, (event) => {
    // Message start
    if (event.type === 'message_start') {
      usage = event.message?.usage;
    }

    // Content block start
    if (event.type === 'content_block_start') {
      const block = event.content_block;
      if (block?.type === 'tool_use') {
        currentToolUse = {
          id: block.id,
          name: block.name,
          input: ''
        };
        callbacks.onToolCall?.(block.id, block.name);
      }
    }

    // Content block delta
    if (event.type === 'content_block_delta') {
      const delta = event.delta;

      if (delta?.type === 'text_delta') {
        callbacks.onText?.(delta.text);
      } else if (delta?.type === 'thinking_delta') {
        callbacks.onReasoning?.(delta.thinking);
      } else if (delta?.type === 'input_json_delta' && currentToolUse) {
        currentToolUse.input += delta.partial_json;
        callbacks.onToolCallDelta?.(currentToolUse.id, delta.partial_json);
      }
    }

    // Content block stop
    if (event.type === 'content_block_stop') {
      currentToolUse = null;
    }

    // Message delta (final)
    if (event.type === 'message_delta') {
      stopReason = event.delta?.stop_reason;
      if (event.usage) {
        usage = { ...usage, ...event.usage };
      }
    }
  }, signal);

  callbacks.onFinish?.({ finishReason: stopReason, usage });

  return { finishReason: stopReason, usage };
}

// ==================== Unified Interface ====================

/**
 * Stream chat completion from any provider
 * @param {Object} options
 * @param {Object} options.provider - Provider config
 * @param {string} options.model - Model ID
 * @param {Array} options.messages - Messages
 * @param {string} [options.systemPrompt] - System prompt
 * @param {Array} [options.tools] - Tools (will be converted to provider format)
 * @param {StreamCallbacks} options.callbacks - Callbacks
 * @param {AbortSignal} [options.signal]
 * @param {Object} [options.settings]
 */
export async function streamChat(options) {
  const { provider } = options;

  if (provider.id === 'anthropic') {
    return streamAnthropic(options);
  } else {
    // Default to OpenAI-compatible
    return streamOpenAI(options);
  }
}

// ==================== Non-Streaming (for simplicity) ====================

/**
 * Non-streaming chat completion
 * @param {Object} options - Same as streamChat
 * @returns {Promise<Object>} Complete response
 */
export async function chat(options) {
  let text = '';
  const toolCalls = [];
  let reasoning = '';

  const result = await streamChat({
    ...options,
    callbacks: {
      onText: (chunk) => { text += chunk; },
      onReasoning: (chunk) => { reasoning += chunk; },
      onToolCall: (id, name) => {
        toolCalls.push({ id, name, arguments: '' });
      },
      onToolCallDelta: (id, chunk) => {
        const tc = toolCalls.find(t => t.id === id);
        if (tc) tc.arguments += chunk;
      },
      onError: options.callbacks?.onError
    }
  });

  // Parse tool call arguments
  for (const tc of toolCalls) {
    try {
      tc.input = JSON.parse(tc.arguments);
    } catch {
      tc.input = {};
    }
  }

  return {
    text,
    reasoning,
    toolCalls,
    ...result
  };
}
