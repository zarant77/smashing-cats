#!/usr/bin/env bash

set -euo pipefail

echo "Cleaning generated TypeScript files from src directories..."

find . -path "*/src/*" -type f \( \
  -name "*.js" -o \
  -name "*.js.map" -o \
  -name "*.d.ts" -o \
  -name "*.d.ts.map" \
\) \
-not -path "*/node_modules/*" \
-delete

find . -type f -name "*.tsbuildinfo" \
-not -path "*/node_modules/*" \
-not -path "*/dist/*" \
-delete

echo "Done."
