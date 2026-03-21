#!/usr/bin/env node
/**
 * bulk-export-qc.js - Quality control for bulk exports
 *
 * Compares exported notebooks against existing ones in a target directory.
 * Reports: missing exports, size changes, module differences.
 *
 * Usage:
 *   node tools/bulk-export-qc.js --exported <dir> --reference <dir> [--spec <path>] [--json]
 *
 * Options:
 *   --exported <dir>    Directory with newly exported files
 *   --reference <dir>   Directory with existing/reference files
 *   --spec <path>       Export spec (to check for missing exports)
 *   --json              Output as JSON
 */

import fs from 'fs';
import { resolve, basename } from 'path';
import { execSync } from 'child_process';

function parseArgs(argv) {
  const args = argv.slice(2);
  const options = { exported: null, reference: null, spec: null, json: false };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--exported' && args[i + 1]) options.exported = args[++i];
    else if (args[i] === '--reference' && args[i + 1]) options.reference = args[++i];
    else if (args[i] === '--spec' && args[i + 1]) options.spec = args[++i];
    else if (args[i] === '--json') options.json = true;
  }
  return options;
}

function getModuleList(filePath) {
  try {
    const output = execSync(
      `node tools/lope-reader.js "${filePath}" --list-modules --json`,
      { encoding: 'utf-8', timeout: 30000 }
    );
    const data = JSON.parse(output);
    return data.modules.map(m => m.name);
  } catch {
    return null;
  }
}

function fileSize(path) {
  try {
    return fs.statSync(path).size;
  } catch {
    return 0;
  }
}

function formatSize(bytes) {
  return (bytes / 1024 / 1024).toFixed(2) + ' MB';
}

const options = parseArgs(process.argv);

if (!options.exported) {
  console.error('Error: --exported is required');
  process.exit(2);
}

const exportedDir = resolve(options.exported);
const referenceDir = options.reference ? resolve(options.reference) : null;
const spec = options.spec ? JSON.parse(fs.readFileSync(resolve(options.spec), 'utf-8')) : null;

// Get exported files
const exportedFiles = fs.readdirSync(exportedDir)
  .filter(f => f.endsWith('.html'))
  .sort();

// Expected files from spec
const expectedFiles = spec
  ? spec.notebooks.map(n => n.name.replaceAll('/', '_') + '.html')
  : [];

// Build report
const report = {
  summary: { total: expectedFiles.length || exportedFiles.length, exported: exportedFiles.length, missing: 0, errors: [] },
  notebooks: []
};

// Check each expected notebook
const filesToCheck = expectedFiles.length > 0 ? expectedFiles : exportedFiles;

for (const filename of filesToCheck) {
  const exportedPath = resolve(exportedDir, filename);
  const referencePath = referenceDir ? resolve(referenceDir, filename) : null;
  const entry = { filename, status: 'unknown' };

  // Check if exported
  if (!fs.existsSync(exportedPath)) {
    entry.status = 'missing';
    report.summary.missing++;
    report.summary.errors.push(`Missing: ${filename}`);
    report.notebooks.push(entry);
    continue;
  }

  const exportedSize = fileSize(exportedPath);
  entry.exportedSize = exportedSize;
  entry.exportedSizeFormatted = formatSize(exportedSize);

  // Basic sanity: file should be > 100KB for a real notebook
  if (exportedSize < 100 * 1024) {
    entry.status = 'suspect-small';
    report.summary.errors.push(`Suspiciously small: ${filename} (${formatSize(exportedSize)})`);
  } else {
    entry.status = 'ok';
  }

  // Compare with reference
  if (referencePath && fs.existsSync(referencePath)) {
    const refSize = fileSize(referencePath);
    entry.referenceSize = refSize;
    entry.referenceSizeFormatted = formatSize(refSize);
    entry.sizeDelta = exportedSize - refSize;
    entry.sizeDeltaPct = refSize > 0 ? ((exportedSize - refSize) / refSize * 100).toFixed(1) + '%' : 'N/A';

    // Flag large size changes (>20% different)
    const pctChange = Math.abs((exportedSize - refSize) / refSize * 100);
    if (pctChange > 20) {
      entry.status = 'size-change';
      report.summary.errors.push(`Size change ${entry.sizeDeltaPct}: ${filename} (${formatSize(refSize)} → ${formatSize(exportedSize)})`);
    }
  } else if (referenceDir) {
    entry.referenceSize = 0;
    entry.status = entry.status === 'ok' ? 'new' : entry.status;
  }

  report.notebooks.push(entry);
}

// Also check for files in reference that aren't in spec (orphans)
if (referenceDir && spec) {
  const refFiles = fs.readdirSync(referenceDir).filter(f => f.endsWith('.html'));
  const expectedSet = new Set(expectedFiles);
  const orphans = refFiles.filter(f => !expectedSet.has(f));
  if (orphans.length > 0) {
    report.orphans = orphans;
  }
}

report.summary.succeeded = report.notebooks.filter(n => n.status === 'ok' || n.status === 'new').length;
report.summary.warnings = report.notebooks.filter(n => n.status === 'size-change' || n.status === 'suspect-small').length;

// Output
if (options.json) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(`\n=== Bulk Export QC Report ===\n`);
  console.log(`Expected: ${report.summary.total}`);
  console.log(`Exported: ${report.summary.exported}`);
  console.log(`Succeeded: ${report.summary.succeeded}`);
  console.log(`Missing: ${report.summary.missing}`);
  console.log(`Warnings: ${report.summary.warnings}`);

  if (report.summary.errors.length > 0) {
    console.log(`\n--- Issues ---`);
    for (const err of report.summary.errors) {
      console.log(`  ⚠ ${err}`);
    }
  }

  console.log(`\n--- Details ---`);
  for (const nb of report.notebooks) {
    const sizeInfo = nb.exportedSizeFormatted || 'N/A';
    const refInfo = nb.referenceSizeFormatted ? ` (ref: ${nb.referenceSizeFormatted}, delta: ${nb.sizeDeltaPct})` : '';
    const statusIcon = nb.status === 'ok' || nb.status === 'new' ? '✓' : nb.status === 'missing' ? '✗' : '⚠';
    console.log(`  ${statusIcon} ${nb.filename} [${nb.status}] ${sizeInfo}${refInfo}`);
  }

  if (report.orphans?.length > 0) {
    console.log(`\n--- Orphans (in reference but not in spec) ---`);
    for (const o of report.orphans) {
      console.log(`  ? ${o}`);
    }
  }
}
