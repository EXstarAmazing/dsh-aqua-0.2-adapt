/**
 * Undo the Aqua (玻璃主题) installation in the desktop dsh profile.
 *
 * Removes the bundle selection, the dependency, the compatibility exemption and
 * the package directory itself. Safe to re-run. There is nothing to restore
 * inside node_modules: reinstall-aqua.cjs always unpacks the pristine 1.3.1
 * tarball again, so the patched copy is simply deleted.
 */
const fs = require('node:fs');
const path = require('node:path');

const PROFILE = 'C:\\Users\\Cenn123\\.dsh\\profiles\\desktop';
const PKG_DIR = path.join(PROFILE, 'node_modules', 'dsh-client-ui-aqua');
const BUNDLE = 'dsh-client-ui-aqua';

function writeAtomic(file, text) {
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, text);
  JSON.parse(fs.readFileSync(tmp, 'utf8'));
  fs.renameSync(tmp, file);
}

// 1. Drop the bundle selection and the dependency.
const manifestPath = path.join(PROFILE, 'package.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
manifest.dsh.profile.bundles = manifest.dsh.profile.bundles.filter((name) => name !== BUNDLE);
delete manifest.dependencies[BUNDLE];
writeAtomic(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log('bundles now:', manifest.dsh.profile.bundles.join(', '));
console.log('dependencies now:', Object.keys(manifest.dependencies).join(', ') || '(none)');

// 2. Revoke the compatibility exemption (remove the file when nothing is left).
const compatPath = path.join(PROFILE, 'compatibility.json');
if (fs.existsSync(compatPath)) {
  const compat = JSON.parse(fs.readFileSync(compatPath, 'utf8'));
  for (const key of Object.keys(compat)) {
    if (key.startsWith(`${BUNDLE}@`)) delete compat[key];
  }
  if (Object.keys(compat).length === 0) {
    fs.rmSync(compatPath, { force: true });
    console.log('compatibility.json removed (no exemptions left)');
  } else {
    writeAtomic(compatPath, JSON.stringify(compat, null, 2) + '\n');
    console.log('compatibility.json now:', JSON.stringify(compat));
  }
}

// 3. Remove the package directory.
fs.rmSync(PKG_DIR, { recursive: true, force: true });
console.log('removed', PKG_DIR);

console.log('\nRestart DeepSeek Harness, then hard-refresh the Web UI (Ctrl+Shift+R).');
console.log('The theme flag and knob values live in the Web UI localStorage under keys');
console.log('starting with "dsh.ui-aqua." — clear them there if you want a clean slate.');
