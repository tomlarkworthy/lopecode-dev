#!/usr/bin/env bun
// Standalone claude-runner for robocoop-5 work. The runner itself lives in the channel server's repo
// (lopecode-plugin/src/claude-runner.ts), which also mounts it when LOPECODE_LLM_RUNNER=1.
//
//   bun tools/robocoop-5/claude-runner.ts [--port 8765] [--token T] [--model claude-sonnet-5-5] [--verbose]
import "../../lopecode-plugin/src/claude-runner-cli.ts";
