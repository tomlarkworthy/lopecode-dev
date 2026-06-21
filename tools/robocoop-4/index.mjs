// Public core surface re-exports.

export { createOpenRouterClient, recordClient } from './openrouter.mjs';
export { createScriptedClient } from './scriptedClient.mjs';
export { createAgentLoop } from './agentLoop.mjs';
export { createAgentSession } from './agentSession.mjs';
export { createBashTool } from './bashTool.mjs';
export { defineTool, validateParameters } from './defineTool.mjs';
// NOTE: createNodeSession is NOT re-exported here — it statically imports the node-only just-bash
// bundle and would break the browser core import. The node eval imports nodeSession.mjs directly.
export { idToPath, pathToId, listModuleFiles } from './fsmap.mjs';
export { formatResult, truncate } from './render.mjs';
export { systemPrompt, composeFooter } from './systemPrompt.mjs';
