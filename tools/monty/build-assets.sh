#!/usr/bin/env bash
# Bundle @pydantic/monty's browser build into tools/monty/assets/*.gz.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
work="$(mktemp -d)"
cd "$work"
echo '{"name":"mb","type":"module","private":true}' > package.json
npm i --silent esbuild @pydantic/monty@0.0.23
P=./node_modules/@pydantic/monty/dist/worker
echo "export * from '$P/index.js';" > lib.js
echo "import '$P/browserWorkerEntry.js';" > worker.js
for n in lib worker; do
  fmt=esm; [ $n = worker ] && fmt=iife  # a module worker from a blob: URL fails on file:// pages
  npx esbuild $n.js --bundle --format=$fmt --platform=browser --minify --external:'node:*' --log-override:empty-import-meta=silent --outfile=out/monty-$n.js
done
mkdir -p "$here/assets"
gzip -9c out/monty-lib.js > "$here/assets/monty-lib-0.0.23.js.gz"
gzip -9c out/monty-worker.js > "$here/assets/monty-worker-0.0.23.js.gz"
for n in core core2 core3 core4; do
  gzip -9c $P/component/monty.component.$n.wasm > "$here/assets/monty.component.$n.wasm.gz"
done
ls -la "$here/assets"
