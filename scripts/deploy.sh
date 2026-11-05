#!/usr/bin/env bash
# ==============================================================================
# deploy.sh - Pull latest code, install dependencies, build, and restart service
# ==============================================================================
set -e

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$APP_DIR"

echo "========================================================"
echo "  [Deploy] Starting Live Deployment on Server"
echo "  Target Directory: $APP_DIR"
echo "========================================================"

# 1. Pull latest commits from GitHub
echo ""
echo "--> 1/5 Pulling latest code from GitHub..."
git fetch origin main
git reset --hard origin/main

# 2. Install dependencies
echo ""
echo "--> 2/5 Checking and installing npm dependencies..."
npm install --legacy-peer-deps --no-audit --prefer-offline

# 3. Build Next.js application (with auto-versioning)
echo ""
echo "--> 3/5 Building Next.js application..."
# Allocate 2GB memory heap for Node build on VPS/EC2
export NODE_OPTIONS="--max-old-space-size=2048"
npm run build

# 4. If using standalone mode, ensure static assets are synced
if [ -d ".next/standalone" ]; then
  echo ""
  echo "--> 4/5 Syncing static and public assets for standalone..."
  mkdir -p .next/standalone/.next/static
  cp -r .next/static/* .next/standalone/.next/static/ 2>/dev/null || true
  mkdir -p .next/standalone/public
  cp -r public/* .next/standalone/public/ 2>/dev/null || true
fi

# 5. Restart systemd / PM2 service
echo ""
echo "--> 5/5 Restarting admin dashboard service..."
if command -v systemctl >/dev/null 2>&1; then
  sudo systemctl restart admin.service || true
  echo "--> Checking service status..."
  sudo systemctl status admin.service --no-pager || true
elif command -v pm2 >/dev/null 2>&1; then
  pm2 restart admin 2>/dev/null || pm2 restart all 2>/dev/null || true
fi

echo ""
echo "========================================================"
echo "  [Deploy] Deployment Complete! New changes are LIVE."
echo "========================================================"

