#!/usr/bin/env python3
"""
lope-utils.py - Utilities for working with lopecode HTML files

Commands:
  list-modules <file.html>              List all modules in a notebook
  list-cells <file.html> <module>       List cells in a specific module
  read-cell <file.html> <module> <cell> Read a specific cell's source
  read-module <file.html> <module>      Read entire module source
  manifest                              Generate manifest.json of all notebooks
  summary <file.html>                   Show notebook summary

These tools enable agents to work with large lopecode files by
extracting relevant portions without loading entire files.
"""

import json
import re
import sys
import os
from pathlib import Path
from html.parser import HTMLParser
from typing import Dict, List, Optional, Tuple

class LopeModuleParser(HTMLParser):
    """Parse lopecode HTML to extract modules and their content."""

    def __init__(self):
        super().__init__()
        self.modules: Dict[str, str] = {}
        self.files: List[Dict] = []
        self.current_tag = None
        self.current_attrs = {}
        self.current_data = []

    def handle_starttag(self, tag, attrs):
        self.current_tag = tag
        self.current_attrs = dict(attrs)
        self.current_data = []

    def handle_endtag(self, tag):
        if tag == "script" and self.current_tag == "script":
            script_type = self.current_attrs.get("type", "")
            content = "".join(self.current_data)

            if script_type == "lope-module":
                module_id = self.current_attrs.get("id", "unknown")
                self.modules[module_id] = content

            elif script_type == "lope-file":
                self.files.append({
                    "id": self.current_attrs.get("id", ""),
                    "module": self.current_attrs.get("module", ""),
                    "file": self.current_attrs.get("file", ""),
                    "mime": self.current_attrs.get("mime", ""),
                    "size": len(content)
                })

        self.current_tag = None
        self.current_attrs = {}
        self.current_data = []

    def handle_data(self, data):
        if self.current_tag == "script":
            self.current_data.append(data)


def parse_notebook(filepath: str) -> LopeModuleParser:
    """Parse a lopecode HTML file and return the parser with extracted data."""
    parser = LopeModuleParser()
    with open(filepath, 'r', encoding='utf-8') as f:
        parser.feed(f.read())
    return parser


def extract_cells(module_source: str) -> List[Dict]:
    """Extract cell definitions from module source code.

    Cells are defined as:
      const _name = function _name(deps){return(...)}
      or
      const _name = function*(deps){yield...}
    """
    cells = []

    # Pattern to match cell definitions
    # const _name = function _name(dep1,dep2){return(
    pattern = r'const\s+(_\w+)\s*=\s*function\*?\s*\w*\s*\(([^)]*)\)\s*\{'

    for match in re.finditer(pattern, module_source):
        cell_name = match.group(1)
        deps_str = match.group(2)
        deps = [d.strip() for d in deps_str.split(',') if d.strip()]

        # Find the cell content (approximate - until next const or end)
        start_pos = match.end()
        # Look for balanced braces to find end of function
        brace_count = 1
        pos = start_pos
        while pos < len(module_source) and brace_count > 0:
            if module_source[pos] == '{':
                brace_count += 1
            elif module_source[pos] == '}':
                brace_count -= 1
            pos += 1

        content = module_source[match.start():pos]

        cells.append({
            "name": cell_name,
            "dependencies": deps,
            "start": match.start(),
            "end": pos,
            "preview": content[:200] + "..." if len(content) > 200 else content
        })

    return cells


def list_modules(filepath: str) -> None:
    """List all modules in a notebook."""
    parser = parse_notebook(filepath)
    print(f"Modules in {os.path.basename(filepath)}:")
    for module_id in sorted(parser.modules.keys()):
        cell_count = len(extract_cells(parser.modules[module_id]))
        print(f"  {module_id} ({cell_count} cells)")
    print(f"\nFile attachments: {len(parser.files)}")


def list_cells(filepath: str, module: str) -> None:
    """List cells in a specific module."""
    parser = parse_notebook(filepath)
    if module not in parser.modules:
        print(f"Error: Module '{module}' not found")
        print(f"Available modules: {', '.join(sorted(parser.modules.keys()))}")
        sys.exit(1)

    cells = extract_cells(parser.modules[module])
    print(f"Cells in {module}:")
    for cell in cells:
        deps = ", ".join(cell["dependencies"][:3])
        if len(cell["dependencies"]) > 3:
            deps += f", ... (+{len(cell['dependencies']) - 3})"
        print(f"  {cell['name']}: ({deps})")


def read_cell(filepath: str, module: str, cell_name: str) -> None:
    """Read a specific cell's source code."""
    parser = parse_notebook(filepath)
    if module not in parser.modules:
        print(f"Error: Module '{module}' not found")
        sys.exit(1)

    cells = extract_cells(parser.modules[module])
    for cell in cells:
        if cell["name"] == cell_name or cell_name in cell["name"]:
            source = parser.modules[module]
            print(source[cell["start"]:cell["end"]])
            return

    print(f"Error: Cell '{cell_name}' not found in module '{module}'")
    print(f"Available cells: {', '.join(c['name'] for c in cells)}")
    sys.exit(1)


def read_module(filepath: str, module: str) -> None:
    """Read entire module source."""
    parser = parse_notebook(filepath)
    if module not in parser.modules:
        print(f"Error: Module '{module}' not found")
        sys.exit(1)
    print(parser.modules[module])


def summary(filepath: str) -> None:
    """Show notebook summary."""
    parser = parse_notebook(filepath)

    print(f"Notebook: {os.path.basename(filepath)}")
    print(f"Size: {os.path.getsize(filepath) / 1024 / 1024:.1f} MB")
    print(f"Modules: {len(parser.modules)}")
    print(f"File attachments: {len(parser.files)}")
    print()

    total_cells = 0
    for module_id in sorted(parser.modules.keys()):
        cells = extract_cells(parser.modules[module_id])
        total_cells += len(cells)
        print(f"  {module_id}: {len(cells)} cells")

    print(f"\nTotal cells: {total_cells}")


def generate_manifest(repo_root: str) -> None:
    """Generate manifest.json of all notebooks."""
    notebooks_dir = Path(repo_root) / "lopecode" / "notebooks"
    src_dir = Path(repo_root) / "lopecode" / "src"

    manifest = {
        "notebooks": {},
        "module_index": {}
    }

    # Process all HTML files
    for html_file in list(notebooks_dir.glob("*.html")) + list(src_dir.glob("*.html")):
        parser = parse_notebook(str(html_file))
        basename = html_file.stem
        relpath = str(html_file.relative_to(repo_root))

        modules_info = {}
        for module_id, content in parser.modules.items():
            cells = extract_cells(content)
            modules_info[module_id] = {
                "cells": [c["name"] for c in cells],
                "cell_count": len(cells)
            }

            # Update module index
            if module_id not in manifest["module_index"]:
                manifest["module_index"][module_id] = []
            manifest["module_index"][module_id].append(basename)

        manifest["notebooks"][basename] = {
            "path": relpath,
            "size_mb": html_file.stat().st_size / 1024 / 1024,
            "modules": modules_info,
            "file_attachments": len(parser.files)
        }

    # Write manifest
    output_dir = Path(repo_root) / ".lope-extracted"
    output_dir.mkdir(exist_ok=True)
    manifest_path = output_dir / "manifest.json"

    with open(manifest_path, 'w') as f:
        json.dump(manifest, f, indent=2)

    print(f"Manifest written to: {manifest_path}")
    print(f"Notebooks: {len(manifest['notebooks'])}")
    print(f"Unique modules: {len(manifest['module_index'])}")


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    cmd = sys.argv[1]

    if cmd == "list-modules" and len(sys.argv) == 3:
        list_modules(sys.argv[2])
    elif cmd == "list-cells" and len(sys.argv) == 4:
        list_cells(sys.argv[2], sys.argv[3])
    elif cmd == "read-cell" and len(sys.argv) == 5:
        read_cell(sys.argv[2], sys.argv[3], sys.argv[4])
    elif cmd == "read-module" and len(sys.argv) == 4:
        read_module(sys.argv[2], sys.argv[3])
    elif cmd == "summary" and len(sys.argv) == 3:
        summary(sys.argv[2])
    elif cmd == "manifest":
        # Find repo root
        script_dir = Path(__file__).parent
        repo_root = script_dir.parent
        generate_manifest(str(repo_root))
    else:
        print(__doc__)
        sys.exit(1)


if __name__ == "__main__":
    main()
