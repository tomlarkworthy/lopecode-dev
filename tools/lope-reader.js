#!/usr/bin/env node
/**
 * lope-reader.js - Read lopecode notebook source without running it
 *
 * Usage:
 *   node lope-reader.js <notebook.html> [options]
 *
 * Options:
 *   --list-modules        List all modules in the notebook
 *   --get-module <name>   Get source code for a specific module
 *   --list-files          List all file attachments (names only)
 *   --json                Output as JSON
 *
 * Examples:
 *   node lope-reader.js notebook.html --list-modules
 *   node lope-reader.js notebook.html --get-module @tomlarkworthy/tests
 *   node lope-reader.js notebook.html --list-files
 */

import fs from 'fs';
import path from 'path';
import * as cheerio from 'cheerio';

function parseArgs(args) {
  const options = {
    notebook: null,
    listModules: false,
    getModule: null,
    listFiles: false,
    json: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--list-modules') {
      options.listModules = true;
    } else if (arg === '--get-module' && args[i + 1]) {
      options.getModule = args[++i];
    } else if (arg === '--list-files') {
      options.listFiles = true;
    } else if (arg === '--json') {
      options.json = true;
    } else if (arg === '--help' || arg === '-h') {
      showHelp();
      process.exit(0);
    } else if (!arg.startsWith('--') && !options.notebook) {
      options.notebook = arg;
    }
  }

  return options;
}

function showHelp() {
  console.log(`
lope-reader.js - Read lopecode notebook source without running it

Usage:
  node lope-reader.js <notebook.html> [options]

Options:
  --list-modules        List all modules in the notebook
  --get-module <name>   Get source code for a specific module
  --list-files          List all file attachments (names only)
  --json                Output as JSON

Examples:
  node lope-reader.js notebook.html --list-modules
  node lope-reader.js notebook.html --get-module @tomlarkworthy/tests
  node lope-reader.js notebook.html --list-files
  `);
}

/**
 * Parse the notebook HTML and extract script tags using cheerio
 */
function parseNotebook(html) {
  const $ = cheerio.load(html);
  const modules = new Map();
  const files = [];

  // Select all script tags with an id attribute
  $('script[id]').each((_, el) => {
    const $el = $(el);
    const id = $el.attr('id');
    const content = $el.text().trim();
    const dataMime = $el.attr('data-mime');
    const dataEncoding = $el.attr('data-encoding');

    // Skip empty content
    if (!content) return;

    // Categorize by id pattern
    if (id.startsWith('@')) {
      // Module: @username/notebook
      modules.set(id, {
        id,
        type: 'module',
        mime: dataMime,
        encoding: dataEncoding,
        content,
        cells: parseModuleCells(content)
      });
    } else if (id.startsWith('file://')) {
      // File attachment - just record name and size, not content
      files.push({
        id,
        name: id.replace('file://', ''),
        size: content.length,
        encoding: dataEncoding
      });
    }
  });

  return { modules, files };
}

/**
 * Parse cells from a module's JavaScript content
 */
function parseModuleCells(content) {
  const cells = [];

  // Match cell definitions: const _name = function _displayName(deps){return( ... )}
  const cellRegex = /const\s+(_[a-zA-Z0-9_]+)\s*=\s*function\s+([a-zA-Z0-9_]+)\s*\(([^)]*)\)\s*\{/g;

  let match;
  while ((match = cellRegex.exec(content)) !== null) {
    const internalName = match[1];
    const displayName = match[2];
    const deps = match[3].split(',').map(d => d.trim()).filter(d => d);

    // Find the function body by matching balanced braces
    const startIndex = match.index + match[0].length;
    let braceCount = 1;
    let endIndex = startIndex;

    while (braceCount > 0 && endIndex < content.length) {
      const char = content[endIndex];
      if (char === '{') braceCount++;
      else if (char === '}') braceCount--;
      endIndex++;
    }

    const body = content.slice(startIndex, endIndex - 1).trim();

    cells.push({
      internalName,
      displayName,
      dependencies: deps,
      body,
      source: extractSource(body)
    });
  }

  return cells;
}

/**
 * Extract readable source from cell body
 */
function extractSource(body) {
  // If body starts with "return(" and ends with ")", extract the content
  const returnMatch = body.match(/^return\s*\(\s*([\s\S]*)\s*\)$/);
  if (returnMatch) {
    return returnMatch[1].trim();
  }

  // If body contains md` or html` template literal, extract it
  const templateMatch = body.match(/(md|html|htl\.html)`[\s\S]*`/);
  if (templateMatch) {
    return templateMatch[0];
  }

  return body;
}

/**
 * Format module for display
 */
function formatModule(module, json) {
  if (json) {
    return JSON.stringify(module, null, 2);
  }

  let output = `Module: ${module.id}\n`;
  output += `${'='.repeat(module.id.length + 8)}\n\n`;
  output += `Cells: ${module.cells.length}\n\n`;

  for (const cell of module.cells) {
    output += `--- ${cell.displayName} ---\n`;
    if (cell.dependencies.length > 0) {
      output += `Dependencies: ${cell.dependencies.join(', ')}\n`;
    }
    output += `\n${cell.source}\n\n`;
  }

  return output;
}

async function main() {
  const args = process.argv.slice(2);
  const options = parseArgs(args);

  if (!options.notebook) {
    console.error('Usage: node lope-reader.js <notebook.html> [options]');
    console.error('Run with --help for more information');
    process.exit(1);
  }

  const notebookPath = path.resolve(options.notebook);
  if (!fs.existsSync(notebookPath)) {
    console.error(`Error: Notebook not found: ${notebookPath}`);
    process.exit(1);
  }

  const html = fs.readFileSync(notebookPath, 'utf-8');
  const { modules, files } = parseNotebook(html);

  if (options.listModules) {
    if (options.json) {
      const list = [...modules.keys()].map(id => ({
        id,
        cellCount: modules.get(id).cells.length
      }));
      console.log(JSON.stringify(list, null, 2));
    } else {
      console.log('Modules:\n');
      for (const [id, mod] of modules) {
        console.log(`  ${id} (${mod.cells.length} cells)`);
      }
    }
  } else if (options.getModule) {
    // Try exact match first, then partial match
    let module = modules.get(options.getModule);
    if (!module) {
      for (const [id, mod] of modules) {
        if (id.includes(options.getModule)) {
          module = mod;
          break;
        }
      }
    }

    if (!module) {
      console.error(`Module not found: ${options.getModule}`);
      console.error(`Available modules: ${[...modules.keys()].join(', ')}`);
      process.exit(1);
    }

    console.log(formatModule(module, options.json));
  } else if (options.listFiles) {
    if (options.json) {
      console.log(JSON.stringify(files, null, 2));
    } else {
      console.log('File Attachments:\n');
      for (const file of files) {
        console.log(`  ${file.name} (${file.size} bytes encoded)`);
      }
    }
  } else {
    // Default: show summary
    console.log(`Notebook: ${path.basename(notebookPath)}\n`);
    console.log(`Modules: ${modules.size}`);
    for (const [id, mod] of modules) {
      console.log(`  ${id} (${mod.cells.length} cells)`);
    }
    console.log(`\nFile Attachments: ${files.length}`);
    for (const file of files) {
      console.log(`  ${file.name}`);
    }
  }
}

main().catch(err => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});
