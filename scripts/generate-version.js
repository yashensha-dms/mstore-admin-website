const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.join(__dirname, '..');
const packageJsonPath = path.join(rootDir, 'package.json');
const versionJsonPath = path.join(rootDir, 'src', 'version.json');

// 1. Read package.json
let pkg = {};
try {
  pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
} catch (e) {
  pkg = { version: '1.3.0' };
}

let version = pkg.version || '1.3.0';

// 2. If --bump flag is passed, increment the patch version (e.g. 1.3.0 -> 1.3.1)
const shouldBump = process.argv.includes('--bump');
if (shouldBump) {
  const parts = version.split('.').map((p) => parseInt(p, 10) || 0);
  while (parts.length < 3) parts.push(0);
  parts[parts.length - 1] += 1;
  version = parts.join('.');
  pkg.version = version;
  fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
  console.log(`[generate-version] Bumped package version to ${version}`);
}

// 3. Git commit & branch details
let gitCommit = 'dev';
let gitBranch = 'main';
try {
  gitCommit = execSync('git rev-parse --short HEAD', { cwd: rootDir, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  gitBranch = execSync('git rev-parse --abbrev-ref HEAD', { cwd: rootDir, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
} catch (e) {
  // Git not available (e.g. inside an extracted container or clean dir)
}

// 4. Formatted build date & time
const now = new Date();
const pad = (n) => String(n).padStart(2, '0');
const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const formattedDate = `${pad(now.getDate())} ${months[now.getMonth()]} ${now.getFullYear()}`;
const hours = now.getHours();
const ampm = hours >= 12 ? 'PM' : 'AM';
const formattedTime = `${pad(hours % 12 || 12)}:${pad(now.getMinutes())} ${ampm}`;

// 5. Build counter tracking
let buildNumber = 1;
try {
  if (fs.existsSync(versionJsonPath)) {
    const prev = JSON.parse(fs.readFileSync(versionJsonPath, 'utf8'));
    if (prev.buildNumber) {
      buildNumber = Number(prev.buildNumber) + (shouldBump ? 1 : 0);
    }
  }
} catch (e) {}

const versionInfo = {
  version,
  displayVersion: `v${version}`,
  gitCommit,
  gitBranch,
  buildNumber,
  buildDate: formattedDate,
  buildTime: formattedTime,
  timestamp: now.toISOString(),
  fullVersion: `v${version} (${gitCommit} • ${formattedDate})`
};

fs.writeFileSync(versionJsonPath, JSON.stringify(versionInfo, null, 2) + '\n', 'utf8');
console.log(`[generate-version] Generated version info: ${versionInfo.fullVersion}`);

