#!/usr/bin/env python3
"""Strip orphan <script id="..."> blocks from a lopecode HTML notebook.

Usage: python3 strip-orphans.py <file.html> <id1> <id2> ...

Also strips file attachments matching <id>/* (e.g., @x/y/foo.png when @x/y is given).
"""
import re
import sys
from pathlib import Path

def main():
    if len(sys.argv) < 3:
        print("Usage: strip-orphans.py <file.html> <id1> [<id2>...]", file=sys.stderr)
        sys.exit(1)
    path = Path(sys.argv[1])
    ids = sys.argv[2:]
    html = path.read_text()

    removed = 0
    for orphan_id in ids:
        escaped = re.escape(orphan_id)
        # Match <script id="ID" ...> ... </script> and ID/*
        pat = re.compile(
            r'\n?<script\s+id="(?:' + escaped + r'|' + escaped + r'/[^"]*)"[^>]*>[\s\S]*?</script>\n?',
            re.MULTILINE
        )
        matches = pat.findall(html)
        n = len(matches)
        html2 = pat.sub('\n', html)
        if n == 0:
            print(f"  WARN: {orphan_id}: no script blocks found")
        else:
            print(f"  removed {n} block(s) for {orphan_id}")
            removed += n
        html = html2

    path.write_text(html)
    print(f"Done. Stripped {removed} script block(s). New size: {path.stat().st_size / 1024 / 1024:.2f} MB")

if __name__ == "__main__":
    main()
