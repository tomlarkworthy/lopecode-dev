#!/bin/bash
# lope-extract.sh - Extract modules from lopecode HTML files for agent-friendly reading
#
# Usage:
#   ./tools/lope-extract.sh <notebook.html>           # Extract all modules
#   ./tools/lope-extract.sh <notebook.html> <module>  # Extract specific module
#   ./tools/lope-extract.sh --manifest                # Generate manifest of all notebooks
#
# Output goes to .lope-extracted/<notebook>/<module>.js

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
EXTRACT_DIR="$REPO_ROOT/.lope-extracted"

extract_modules() {
    local html_file="$1"
    local target_module="$2"
    local basename=$(basename "$html_file" .html)
    local out_dir="$EXTRACT_DIR/$basename"

    mkdir -p "$out_dir"

    # Extract lope-module blocks using awk
    awk '
    BEGIN { in_module = 0; module_id = ""; content = "" }
    /<script type="lope-module"/ {
        in_module = 1
        match($0, /id="([^"]+)"/, arr)
        if (arr[1] != "") {
            module_id = arr[1]
            gsub(/[@\/]/, "_", module_id)  # Sanitize for filename
        }
        content = ""
        # Check if target specified and skip if not matching
        next
    }
    /<\/script>/ && in_module {
        if (content != "" && module_id != "") {
            filename = "'"$out_dir"'/" module_id ".js"
            print content > filename
            print "  Extracted: " module_id
        }
        in_module = 0
        module_id = ""
        content = ""
        next
    }
    in_module {
        content = content $0 "\n"
    }
    ' "$html_file"

    echo "Extracted modules to: $out_dir"
}

generate_manifest() {
    local manifest="$EXTRACT_DIR/manifest.json"

    echo "Generating manifest..."
    echo "{" > "$manifest"
    echo '  "notebooks": {' >> "$manifest"

    local first_notebook=1
    for html_file in "$REPO_ROOT"/lopecode/notebooks/*.html "$REPO_ROOT"/lopecode/src/*.html; do
        [ -f "$html_file" ] || continue
        local basename=$(basename "$html_file" .html)
        local relpath="${html_file#$REPO_ROOT/}"

        if [ $first_notebook -eq 0 ]; then
            echo "," >> "$manifest"
        fi
        first_notebook=0

        echo -n "    \"$basename\": {" >> "$manifest"
        echo "" >> "$manifest"
        echo "      \"path\": \"$relpath\"," >> "$manifest"
        echo "      \"modules\": [" >> "$manifest"

        # Extract module IDs
        local modules=$(grep -o '<script type="lope-module" id="[^"]*"' "$html_file" 2>/dev/null | sed 's/.*id="\([^"]*\)".*/\1/' | sort -u)
        local first_mod=1
        while IFS= read -r mod; do
            [ -z "$mod" ] && continue
            if [ $first_mod -eq 0 ]; then
                echo "," >> "$manifest"
            fi
            first_mod=0
            echo -n "        \"$mod\"" >> "$manifest"
        done <<< "$modules"

        echo "" >> "$manifest"
        echo -n "      ]" >> "$manifest"
        echo "" >> "$manifest"
        echo -n "    }" >> "$manifest"
    done

    echo "" >> "$manifest"
    echo "  }," >> "$manifest"

    # Add module index (which notebooks contain which modules)
    echo '  "module_index": {' >> "$manifest"

    # Collect all unique modules
    local all_modules=$(for html_file in "$REPO_ROOT"/lopecode/notebooks/*.html "$REPO_ROOT"/lopecode/src/*.html; do
        [ -f "$html_file" ] || continue
        grep -o '<script type="lope-module" id="[^"]*"' "$html_file" 2>/dev/null | sed 's/.*id="\([^"]*\)".*/\1/'
    done | sort -u)

    local first_idx=1
    while IFS= read -r mod; do
        [ -z "$mod" ] && continue
        if [ $first_idx -eq 0 ]; then
            echo "," >> "$manifest"
        fi
        first_idx=0

        echo -n "    \"$mod\": [" >> "$manifest"

        local notebooks_with_mod=""
        local first_nb=1
        for html_file in "$REPO_ROOT"/lopecode/notebooks/*.html "$REPO_ROOT"/lopecode/src/*.html; do
            [ -f "$html_file" ] || continue
            if grep -q "lope-module\" id=\"$mod\"" "$html_file" 2>/dev/null; then
                local nb=$(basename "$html_file" .html)
                if [ $first_nb -eq 0 ]; then
                    echo -n ", " >> "$manifest"
                fi
                first_nb=0
                echo -n "\"$nb\"" >> "$manifest"
            fi
        done
        echo -n "]" >> "$manifest"
    done <<< "$all_modules"

    echo "" >> "$manifest"
    echo "  }" >> "$manifest"
    echo "}" >> "$manifest"

    echo "Manifest written to: $manifest"
}

# Add to .gitignore if not present
if ! grep -q "^\.lope-extracted" "$REPO_ROOT/.gitignore" 2>/dev/null; then
    echo ".lope-extracted" >> "$REPO_ROOT/.gitignore"
fi

case "${1:-}" in
    --manifest)
        generate_manifest
        ;;
    --help|-h)
        echo "Usage:"
        echo "  $0 <notebook.html>    Extract all modules from a notebook"
        echo "  $0 --manifest         Generate manifest of all notebooks/modules"
        echo ""
        echo "Extracted files go to .lope-extracted/"
        ;;
    "")
        echo "Extracting all notebooks and generating manifest..."
        for f in "$REPO_ROOT"/lopecode/notebooks/*.html "$REPO_ROOT"/lopecode/src/*.html; do
            [ -f "$f" ] && extract_modules "$f"
        done
        generate_manifest
        ;;
    *)
        if [ -f "$1" ]; then
            extract_modules "$1"
        else
            echo "Error: File not found: $1"
            exit 1
        fi
        ;;
esac
