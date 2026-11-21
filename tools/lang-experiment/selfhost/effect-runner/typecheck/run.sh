# tsc on each control alone; ok.ts must give no error in typecheck/, the others must give one
cd "$(dirname "$0")"
TSC=../../../node_modules/.bin/tsc
for f in ok missing field event extra; do
  n=$($TSC --noEmit --ignoreConfig --strict --target esnext --module esnext --moduleResolution bundler --allowImportingTsExtensions --skipLibCheck --lib esnext,dom $f.ts 2>&1 | grep -c "^$f.ts(")
  echo "$f.ts: $n errors in the file"
done
