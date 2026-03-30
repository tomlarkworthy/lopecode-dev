#!/usr/bin/env bun
/**
 * lope-browser-runner.ts - Run lopecode notebooks headlessly with Playwright
 *
 * Usage:
 *   bun tools/lope-browser-runner.ts <notebook.html> [options]
 *
 * Options:
 *   --list-cells          List all cells and their current values
 *   --get-cell <name>     Get a specific cell's value
 *   --run-tests           Run all test suites and report results
 *   --test-timeout <ms>   Per-test timeout (default: 30000)
 *   --suite <name>        Only run specific test suite (by variable name)
 *   --tap                 Output raw TAP format (default for tests)
 *   --json                Output JSON test results
 *   --fail-fast           Stop on first failure
 *   --wait <ms>           Wait time for notebook to stabilize (default: 3000)
 *   --timeout <ms>        Maximum execution time (default: 30000)
 *   --headed              Run with visible browser (for debugging)
 *   --verbose             Show console logs from notebook
 *
 * Exit Codes (for --run-tests):
 *   0 - All tests passed
 *   1 - One or more tests failed
 *   2 - Error (notebook load failed, no tests found, etc.)
 *
 * Examples:
 *   bun tools/lope-browser-runner.ts notebook.html --list-cells
 *   bun tools/lope-browser-runner.ts notebook.html --get-cell exportState
 *   bun tools/lope-browser-runner.ts notebook.html --run-tests
 *   bun tools/lope-browser-runner.ts notebook.html --run-tests --json
 */

import { chromium } from "playwright";
import { resolve, basename } from "path";
import { existsSync } from "fs";
import { runTestVariables, serializeValue, generateTAPReport } from "./tools.js";

interface Options {
  notebook: string | null;
  listCells: boolean;
  getCell: string | null;
  runTests: boolean;
  testTimeout: number;
  suiteName: string | null;
  outputFormat: "tap" | "json";
  failFast: boolean;
  wait: number;
  timeout: number;
  headed: boolean;
  verbose: boolean;
}

function parseArgs(args: string[]): Options {
  const options: Options = {
    notebook: null,
    listCells: false,
    getCell: null,
    runTests: false,
    testTimeout: 30000,
    suiteName: null,
    outputFormat: "tap",
    failFast: false,
    wait: 3000,
    timeout: 30000,
    headed: false,
    verbose: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--list-cells") {
      options.listCells = true;
    } else if (arg === "--get-cell" && args[i + 1]) {
      options.getCell = args[++i];
    } else if (arg === "--run-tests") {
      options.runTests = true;
    } else if (arg === "--test-timeout" && args[i + 1]) {
      options.testTimeout = parseInt(args[++i], 10);
    } else if (arg === "--suite" && args[i + 1]) {
      options.suiteName = args[++i];
    } else if (arg === "--tap") {
      options.outputFormat = "tap";
    } else if (arg === "--json") {
      options.outputFormat = "json";
    } else if (arg === "--fail-fast") {
      options.failFast = true;
    } else if (arg === "--wait" && args[i + 1]) {
      options.wait = parseInt(args[++i], 10);
    } else if (arg === "--timeout" && args[i + 1]) {
      options.timeout = parseInt(args[++i], 10);
    } else if (arg === "--headed") {
      options.headed = true;
    } else if (arg === "--verbose") {
      options.verbose = true;
    } else if (!arg.startsWith("--") && !options.notebook) {
      options.notebook = arg;
    }
  }

  return options;
}

function showHelp(): void {
  console.log(`
lope-browser-runner.ts - Run lopecode notebooks headlessly with Playwright

Usage:
  bun tools/lope-browser-runner.ts <notebook.html> [options]

Options:
  --list-cells          List all cells and their current values
  --get-cell <name>     Get a specific cell's value
  --run-tests           Run all test suites and report results
  --test-timeout <ms>   Per-test timeout (default: 30000)
  --suite <name>        Only run specific test suite (by variable name)
  --tap                 Output raw TAP format (default for tests)
  --json                Output JSON test results
  --fail-fast           Stop on first failure
  --wait <ms>           Wait time for notebook to stabilize (default: 3000)
  --timeout <ms>        Maximum execution time (default: 30000)
  --headed              Run with visible browser (for debugging)
  --verbose             Show console logs from notebook

Exit Codes (for --run-tests):
  0 - All tests passed
  1 - One or more tests failed
  2 - Error (notebook load failed, no tests found, etc.)
  `);
}

async function runNotebook(options: Options): Promise<void> {
  if (!options.notebook) {
    console.error("Usage: bun tools/lope-browser-runner.ts <notebook.html> [options]");
    console.error("Run with --help for more information");
    process.exit(1);
  }

  const notebookPath = resolve(options.notebook);
  if (!existsSync(notebookPath)) {
    console.error(`Error: Notebook not found: ${notebookPath}`);
    process.exit(1);
  }

  const browser = await chromium.launch({
    headless: !options.headed,
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  if (options.verbose) {
    page.on("console", (msg) => {
      console.log(`[BROWSER ${msg.type()}] ${msg.text()}`);
    });
  }

  page.on("pageerror", (err) => {
    console.error(`[BROWSER ERROR] ${err.message}`);
  });

  try {
    await page.addInitScript(() => {
      const originalRuntime = (window as any).Runtime;
      let runtimeCaptured = false;

      Object.defineProperty(window, "Runtime", {
        get() {
          return originalRuntime;
        },
        set(NewRuntime: any) {
          const WrappedRuntime = function (this: any, ...args: any[]) {
            const instance = new NewRuntime(...args);
            if (!runtimeCaptured) {
              (window as any).__ojs_runtime = instance;
              runtimeCaptured = true;
            }
            return instance;
          };
          WrappedRuntime.prototype = NewRuntime.prototype;
          Object.assign(WrappedRuntime, NewRuntime);
          (window as any)._OriginalRuntime = NewRuntime;
          return WrappedRuntime;
        },
      });
    });

    const fileUrl = `file://${notebookPath}`;
    console.error(`Loading: ${fileUrl}`);

    await page.goto(fileUrl, {
      timeout: options.timeout,
      waitUntil: "networkidle",
    });

    await page.waitForFunction(
      () => {
        if ((window as any).__ojs_runtime) return true;
        for (const key in window) {
          try {
            const val = (window as any)[key];
            if (val && typeof val === "object" && val._variables && val.module) {
              (window as any).__ojs_runtime = val;
              return true;
            }
          } catch {}
        }
        return false;
      },
      { timeout: options.timeout }
    );

    console.error("Runtime initialized, waiting for cells to stabilize...");
    await page.waitForTimeout(options.wait);

    const cellData = await page.evaluate((serializeValueFn: string) => {
      const runtime = (window as any).__ojs_runtime;
      if (!runtime) return { error: "Runtime not found" };

      const serializeValue = new Function("return " + serializeValueFn)();
      const cells: Record<string, any> = {};
      const errors: string[] = [];

      for (const variable of runtime._variables) {
        try {
          const name = variable._name;
          if (!name) continue;

          let value = variable._value;
          let type = typeof value;
          let serialized;

          try {
            if (value instanceof Error) {
              serialized = `Error: ${value.message}`;
              type = "error";
            } else if (value instanceof HTMLElement) {
              serialized = `<${value.tagName.toLowerCase()}> (${value.outerHTML.slice(0, 100)}...)`;
              type = "HTMLElement";
            } else {
              serialized = serializeValue(value);
            }
          } catch (e: any) {
            serialized = `[Serialization error: ${e.message}]`;
          }

          cells[name] = {
            name,
            type,
            value: serialized,
            hasError: variable._error !== undefined,
            error: variable._error ? String(variable._error) : null,
          };
        } catch (e: any) {
          errors.push(`Error processing variable: ${e.message}`);
        }
      }

      return { cells, errors, variableCount: runtime._variables.size };
    }, serializeValue.toString());

    if (cellData.error) {
      console.error(`Error: ${cellData.error}`);
      process.exit(1);
    }

    if (options.listCells) {
      console.log(`\nNotebook: ${basename(notebookPath)}`);
      console.log(`Variables: ${cellData.variableCount}`);
      console.log(`\nCells:`);

      const sortedCells = Object.values(cellData.cells!).sort((a: any, b: any) =>
        a.name.localeCompare(b.name)
      );

      for (const cell of sortedCells as any[]) {
        const status = cell.hasError ? "X" : "ok";
        const preview = cell.value
          ? cell.value.slice(0, 60).replace(/\n/g, "\\n")
          : "";
        console.log(`  ${status} ${cell.name} (${cell.type}): ${preview}...`);
      }

      if (cellData.errors!.length > 0) {
        console.log(`\nErrors during extraction:`);
        for (const err of cellData.errors!) {
          console.log(`  - ${err}`);
        }
      }
    } else if (options.getCell) {
      const cell = cellData.cells![options.getCell];
      if (!cell) {
        const matches = Object.keys(cellData.cells!).filter((k) =>
          k.includes(options.getCell!)
        );
        if (matches.length > 0) {
          console.error(`Cell '${options.getCell}' not found. Similar cells:`);
          for (const m of matches.slice(0, 5)) {
            console.error(`  - ${m}`);
          }
        } else {
          console.error(`Cell '${options.getCell}' not found`);
        }
        process.exit(1);
      }
      console.log(JSON.stringify(cell, null, 2));
    } else if (options.runTests) {
      console.error("Running tests (test_* variables)...");

      const testData = await page.evaluate(runTestVariables, {
        testTimeout: options.testTimeout,
        filterStr: options.suiteName,
        force: true,
      });

      if (testData.error) {
        console.error(`Error: ${testData.error}`);
        process.exit(2);
      }

      const tests = testData.tests;
      const passed = tests.filter((t: any) => t.state === "passed").length;
      const failed = tests.filter((t: any) => t.state === "failed").length;
      const timeout = tests.filter((t: any) => t.state === "timeout").length;
      console.error(
        `Found ${tests.length} test(s): ${passed} passed, ${failed} failed, ${timeout} timeout`
      );

      if (options.outputFormat === "json") {
        console.log(JSON.stringify(tests, null, 2));
      } else {
        const report = generateTAPReport(tests);
        console.log(report.output);
      }

      const report = generateTAPReport(tests);
      await browser.close();
      process.exit(report.failed > 0 ? 1 : 0);
    } else {
      console.log(JSON.stringify(cellData, null, 2));
    }
  } catch (error: any) {
    console.error(`Error running notebook: ${error.message}`);
    if (options.verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    await browser.close();
  }
}

const args = process.argv.slice(2);

if (args.includes("--help") || args.includes("-h")) {
  showHelp();
  process.exit(0);
}

const options = parseArgs(args);
runNotebook(options);
