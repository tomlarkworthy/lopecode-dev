# Opencode to Lopecode Port Plan

Port opencode's agentic loop into lopecode for browser-based AI-assisted notebook development.

## Goals

1. Enable AI agents to modify lopecode notebooks in the browser
2. Provide tool-use capabilities adapted for notebook context
3. Support streaming responses for better UX
4. Reuse lopecode's existing API key management and fetch patterns

## Architecture Overview

### Opencode Components to Port

```
opencode/packages/opencode/src/
├── session/
│   ├── prompt.ts      → Core agentic loop (PORT)
│   ├── processor.ts   → Stream processing (PORT)
│   ├── llm.ts         → LLM API calls (ADAPT - use fetch)
│   ├── message-v2.ts  → Message types (PORT)
│   └── system.ts      → System prompts (PORT)
├── tool/
│   ├── tool.ts        → Tool interface (PORT)
│   └── registry.ts    → Tool discovery (SIMPLIFY)
└── agent/
    └── agent.ts       → Agent config (SIMPLIFY)
```

### Lopecode Patterns to Reuse

From `@tomlarkworthy/robocoop-2`:
- API key storage via `localStorageView()`
- Direct `fetch()` to OpenAI/Anthropic APIs
- `modelConfig()` factory for provider settings
- Observable reactive cells for state management

## Tool Mapping

### Direct Port (Browser Compatible)

| Opencode Tool | Lopecode Implementation |
|---------------|------------------------|
| `question` | Prompt user via `Inputs.text()` modal |
| `todoread` | Read from reactive todo cell |
| `todowrite` | Write to reactive todo cell |
| `task` | Spawn sub-agent (nested loop) |
| `websearch` | Fetch search API (may need proxy for CORS) |
| `webfetch` | `fetch()` with CORS considerations |

### Adapted for Notebook Context

| Opencode Tool | Notebook Equivalent | Implementation |
|---------------|---------------------|----------------|
| `read` | Read cell/variable | `getCellInfo()` or `decompile()` |
| `write` | Create variable | `defineVariable()` |
| `edit` | Redefine variable | `defineVariable()` (with existing) |
| `glob` | List cells/modules | `listAllVariables()` / `lope-reader.js` patterns |
| `grep` | Search cell content | Search decompiled source |
| `bash` | Eval in runtime | `page.evaluate()` or direct `eval` |

### Not Applicable

| Tool | Reason |
|------|--------|
| `lsp` | No language server in browser |
| `codesearch` | No repository access |
| `apply_patch` | File system based |

## Implementation Phases

### Phase 1: Core Loop Infrastructure

**Goal**: Minimal agentic loop that can call tools

1. **Message Types** (`message.js`)
   - Port `MessageV2` types (User, Assistant)
   - Port message parts (Text, Tool, Reasoning)
   - Adapt for Observable cell format

2. **Tool Interface** (`tool.js`)
   - Port `Tool.Info` interface
   - Implement `Tool.Context` for notebook
   - Create tool registry

3. **LLM Integration** (`llm.js`)
   - Adapt streaming fetch for OpenAI/Anthropic
   - Handle SSE parsing for streaming
   - Reuse `modelConfig()` pattern

4. **Agentic Loop** (`loop.js`)
   - Port `SessionPrompt.loop()` logic
   - Implement step limits and finish detection
   - Handle tool execution cycle

### Phase 2: Notebook Tools

**Goal**: Tools that manipulate notebook state

5. **Cell Tools**
   - `read_cell` - Get cell source/value
   - `write_cell` - Define new variable
   - `edit_cell` - Redefine existing variable
   - `delete_cell` - Remove variable
   - `list_cells` - List all variables with metadata

6. **Module Tools**
   - `list_modules` - List available modules
   - `read_module` - Get module source
   - `search_cells` - Grep through cell content

7. **Runtime Tools**
   - `eval` - Execute JS in runtime context
   - `get_value` - Get computed cell value
   - `run_tests` - Execute test_* variables

### Phase 3: UI Integration

**Goal**: Integrate with lopecode notebook UI

8. **Conversation UI**
   - Chat interface cell
   - Message history display
   - Streaming response rendering

9. **Tool Approval UI**
   - Permission prompts for destructive actions
   - Tool execution status display
   - Error handling and retry UI

10. **Export Integration**
    - Save conversation to notebook
    - Export modified notebook

### Phase 4: Advanced Features

11. **Multi-agent Support**
    - Task delegation to sub-agents
    - Agent configuration

12. **Context Management**
    - Token counting and truncation
    - Smart context selection

## File Structure

```
lopecode/src/opencode/
├── index.js           # Main exports
├── message.js         # Message types
├── tool.js            # Tool interface
├── registry.js        # Tool registry
├── llm.js             # LLM API integration
├── loop.js            # Agentic loop
├── system.js          # System prompts
└── tools/
    ├── cell.js        # Cell manipulation tools
    ├── module.js      # Module tools
    ├── runtime.js     # Runtime tools
    ├── question.js    # User interaction
    └── todo.js        # Task tracking
```

## Key Differences from Opencode

| Aspect | Opencode | Lopecode Port |
|--------|----------|---------------|
| Runtime | Node.js | Browser |
| LLM SDK | Vercel AI SDK | Direct fetch |
| Storage | File system | localStorage + cells |
| Tools | File-based | Cell-based |
| Permissions | File path rules | Simplified allow/deny |
| Streaming | SDK streams | SSE parsing |

## API Design

### Tool Interface

```javascript
const Tool = {
  id: "read_cell",
  description: "Read the source code of a notebook cell",
  parameters: {
    type: "object",
    properties: {
      name: { type: "string", description: "Cell/variable name" },
      module: { type: "string", description: "Module name (optional)" }
    },
    required: ["name"]
  },
  execute: async (args, ctx) => {
    const result = await ctx.runtime.getCellInfo(args.name);
    return {
      title: `Read cell: ${args.name}`,
      output: result.value || result.error
    };
  }
};
```

### Loop Usage

```javascript
import { AgentLoop } from "@tomlarkworthy/opencode";

const loop = AgentLoop.create({
  runtime: window.__ojs_runtime,
  apiKey: OPENAI_API_KEY,
  model: "gpt-4",
  tools: [readCell, writeCell, editCell, listCells],
  systemPrompt: "You are a notebook assistant..."
});

const response = await loop.run("Add a cell that calculates fibonacci");
```

## Success Criteria

1. Agent can read existing cells
2. Agent can create new variables
3. Agent can modify existing variables
4. Agent can run tests and see results
5. Streaming responses display incrementally
6. Tool calls show execution status
7. Exported notebook includes agent's changes

## Open Questions

1. **CORS**: How to handle webfetch/websearch without proxy?
2. **Permissions**: Simple allow/deny or full permission system?
3. **Context**: How much notebook context to include by default?
4. **Streaming**: SSE vs WebSocket vs polling for streaming?
5. **State**: Store conversation in cell or separate storage?

## References

- Opencode source: `opencode/packages/opencode/src/`
- Robocoop-2 patterns: `lopecode/notebooks/@tomlarkworthy_robocoop-2.html`
- Tool implementations: `tools/tools.js`, `tools/lope-repl.js`
