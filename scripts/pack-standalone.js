const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.join(__dirname, '..');
const standaloneDir = path.join(rootDir, '.next', 'standalone');
const staticDir = path.join(rootDir, '.next', 'static');
const publicDir = path.join(rootDir, 'public');
const targetTar = path.join(rootDir, 'admin-standalone.tar.gz');

console.log('[pack-standalone] Verifying standalone build...');
if (!fs.existsSync(standaloneDir)) {
  console.error('[pack-standalone] .next/standalone does not exist! Please run "npm run build" first.');
  process.exit(1);
}

// 1. Copy public -> .next/standalone/public
const destPublic = path.join(standaloneDir, 'public');
if (fs.existsSync(publicDir)) {
  console.log('[pack-standalone] Copying public assets to standalone...');
  fs.cpSync(publicDir, destPublic, { recursive: true });
}

// 2. Copy .next/static -> .next/standalone/.next/static
const destStatic = path.join(standaloneDir, '.next', 'static');
if (fs.existsSync(staticDir)) {
  console.log('[pack-standalone] Copying .next/static assets to standalone...');
  fs.mkdirSync(path.dirname(destStatic), { recursive: true });
  fs.cpSync(staticDir, destStatic, { recursive: true });
}

// 3. Run fix-win-paths on standalone
console.log('[pack-standalone] Running fix-win-paths...');
try {
  execSync('node scripts/fix-win-paths.js', { cwd: rootDir, stdio: 'inherit' });
} catch (e) {
  console.warn('[pack-standalone] fix-win-paths warning:', e.message);
}

// 4. Create tar.gz of .next/standalone
console.log(`[pack-standalone] Creating ${targetTar}...`);
try {
  // Use bsdtar (supported on Windows 10+ and Linux)
  execSync(`tar -czf admin-standalone.tar.gz -C .next/standalone .`, { cwd: rootDir, stdio: 'inherit' });
  const stats = fs.statSync(targetTar);
  console.log(`[pack-standalone] Successfully created admin-standalone.tar.gz (${(stats.size / 1024 / 1024).toFixed(2)} MB)!`);
} catch (e) {
  console.error('[pack-standalone] Failed to create tar:', e.message);
}

