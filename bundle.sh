#!/usr/bin/env bash
# ==============================================================================
# bundle.sh - Automates building and packaging the Next.js standalone bundle
# ==============================================================================
set -e

echo "--------------------------------------------------------"
echo "  [bundle.sh] 1/2 Building Next.js (with auto-versioning)"
echo "--------------------------------------------------------"
npm run build

echo "--------------------------------------------------------"
echo "  [bundle.sh] 2/2 Packaging standalone bundle"
echo "--------------------------------------------------------"
node scripts/pack-standalone.js

echo "--------------------------------------------------------"
echo "  [bundle.sh] Done! admin-standalone.tar.gz is ready."
echo "--------------------------------------------------------"
if [ -f "admin-standalone.tar.gz" ]; then
  ls -lh admin-standalone.tar.gz 2>/dev/null || dir admin-standalone.tar.gz 2>/dev/null || true
fi

