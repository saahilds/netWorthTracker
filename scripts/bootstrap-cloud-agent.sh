#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "Running cloud agent workspace bootstrap in $ROOT_DIR"
echo "Node: $(node --version)"
echo "npm:  $(npm --version)"

npm install
npm run typecheck
npm run build
