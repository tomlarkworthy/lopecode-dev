// Environment-agnostic bash tool. The only env-specific seam is ctx.runCommand.

import { defineTool } from './defineTool.mjs';
import { formatResult } from './render.mjs';

export function createBashTool() {
  return defineTool({
    id: 'bash',
    description:
      'Run a bash command in a sandboxed shell over an in-memory project filesystem ' +
      '(cat, grep, sed, ls, awk, head, tail, etc.). cwd and env persist across calls ' +
      '(they are threaded for you); only filesystem writes persist between commands. ' +
      'exitCode != 0 is normal tool output, not a crash — the full stdout, stderr and ' +
      'exit code are returned to you.',
    parameters: {
      type: 'object',
      properties: {
        command: {
          type: 'string',
          description: 'The bash command line to execute, e.g. "sed -n \'1,40p\' /notebook/@user/mod.js"',
        },
      },
      required: ['command'],
      additionalProperties: false,
    },
    execute: async ({ command }, ctx) => {
      const r = await ctx.runCommand(command);
      return {
        title: '$ ' + String(command).split('\n')[0],
        output: formatResult(r),
        metadata: { exitCode: r?.exitCode ?? 0 },
      };
    },
  });
}
