// Post-build fix for Windows-built bundles deployed to Linux.
// Next 14's webpack emits Node external requires with Windows separators
// (next/dist\client\...) which crash with MODULE_NOT_FOUND on Linux.
// Rewrites them to forward slashes. Safe no-op on Linux builds.
const fs = require('fs');
const path = require('path');

const fixes = [
  ['next/dist\\\\client\\\\components\\\\action-async-storage.external.js', 'next/dist/client/components/action-async-storage.external.js'],
  ['next/dist\\\\client\\\\components\\\\request-async-storage.external.js', 'next/dist/client/components/request-async-storage.external.js'],
  ['next/dist\\\\client\\\\components\\\\static-generation-async-storage.external.js', 'next/dist/client/components/static-generation-async-storage.external.js'],
];

const dir = path.join(__dirname, '..', '.next', 'server');
if (!fs.existsSync(dir)) {
  console.log('[fix-win-paths] no .next/server, skipping');
  process.exit(0);
}

let files = 0, repl = 0;
(function walk(d) {
  for (const f of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, f.name);
    if (f.isDirectory()) walk(p);
    else if (p.endsWith('.js')) {
      let s = fs.readFileSync(p, 'utf8');
      let n = 0;
      for (const [a, b] of fixes) {
        const c = s.split(a).length - 1;
        if (c) { s = s.split(a).join(b); n += c; }
      }
      if (n) { fs.writeFileSync(p, s); files++; repl += n; }
    }
  }
})(dir);
console.log(`[fix-win-paths] patched ${files} files, ${repl} replacements`);
