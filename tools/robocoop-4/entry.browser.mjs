// Browser bundle entry: the full robocoop-4 core surface + window-aware adapters, as one ESM.
export * from './index.mjs';
export { createNotebookRunner } from './notebookAdapter.mjs';
export { createHostBridge } from './hostBridge.mjs';
