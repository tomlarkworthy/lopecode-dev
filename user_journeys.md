# Lopecode User Journeys

Common workflows for agent-driven lopecode development.

## Export Modified Notebook

The core lopecode workflow: load a notebook, modify it, and export a new version.

### Steps

1. **Load notebook with exporter module visible**
   ```json
   {"cmd": "load", "notebook": "path/to/notebook.html", "hash": "view=@tomlarkworthy/exporter-2"}
   ```

2. **Make modifications** (optional)
   ```json
   {"cmd": "define-variable", "name": "myConfig", "definition": "() => ({enabled: true})", "inputs": []}
   ```

3. **Click Download to export**
   ```json
   {"cmd": "download", "selector": "text=Download", "path": "output/modified-notebook.html"}
   ```

### Complete Example

```bash
echo '{"cmd": "load", "notebook": "lopecode/lopebooks/notebooks/@tomlarkworthy_reactive-reflective-testing.html", "hash": "view=@tomlarkworthy/exporter-2"}
{"cmd": "define-variable", "name": "agent_marker", "definition": "() => \"Modified by agent\"", "inputs": []}
{"cmd": "download", "selector": "text=Download", "path": "tools/exported.html"}
{"cmd": "quit"}' | node tools/lope-repl.js
```

### Notes

- The exporter module must be visible (`hash=view=@tomlarkworthy/exporter-2`) for the Download button to appear
- Downloaded files include a timestamp in the suggested filename
- The exported notebook is self-contained (includes all dependencies)
- Variable modifications persist in the exported file

## Run Tests and Export Results

Run tests, verify they pass, then export the notebook.

### Steps

1. **Load notebook with tests and exporter visible**
   ```json
   {"cmd": "load", "notebook": "notebook.html", "hash": "view=R100(S50(@tomlarkworthy/exporter-2),S50(@tomlarkworthy/tests))"}
   ```

2. **Run tests**
   ```json
   {"cmd": "run-tests", "timeout": 60000}
   ```

3. **Check results** - proceed only if tests pass

4. **Export**
   ```json
   {"cmd": "download", "selector": "text=Download", "path": "output/tested-notebook.html"}
   ```

## Iterate on a Cell

Repeatedly modify and test a variable until it works.

### Steps

1. **Load notebook**
   ```json
   {"cmd": "load", "notebook": "notebook.html", "hash": "view=@tomlarkworthy/tests"}
   ```

2. **Define/redefine variable**
   ```json
   {"cmd": "define-variable", "name": "myFunc", "definition": "(x) => x * 2", "inputs": ["x"]}
   ```

3. **Check the result**
   ```json
   {"cmd": "get-variable", "name": "myFunc"}
   ```

4. **Run related tests**
   ```json
   {"cmd": "run-tests", "filter": "test_myFunc"}
   ```

5. **Repeat steps 2-4 until tests pass**

6. **Export when done**
   ```json
   {"cmd": "download", "selector": "text=Download", "path": "output/fixed-notebook.html"}
   ```

## Inspect UI State

Understand the current page state before interacting.

### Steps

1. **Take a screenshot**
   ```json
   {"cmd": "screenshot", "path": "tools/current-state.png"}
   ```

2. **Query for elements**
   ```json
   {"cmd": "query", "selector": "button", "limit": 20}
   ```

3. **Find specific elements**
   ```json
   {"cmd": "query", "selector": "input[type='text']", "limit": 10}
   ```

4. **Interact based on findings**
   ```json
   {"cmd": "fill", "selector": "input[type='text']", "value": "new value"}
   {"cmd": "click", "selector": "button:visible"}
   ```
