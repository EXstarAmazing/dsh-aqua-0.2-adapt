/**
 * Reinstall the patched Aqua glass theme into the desktop dsh profile from the
 * kit in this directory.
 *
 * Idempotent by construction: every run unpacks the pristine 1.3.1 tarball and
 * re-applies the patch, so patches never stack and a half-broken install is
 * always recoverable.
 *
 * Usage (from anywhere):
 *   node reinstall-aqua.cjs
 */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const zlib = require('node:zlib');
const { execFileSync } = require('node:child_process');

const KIT = __dirname;
const PROFILE = 'C:\\Users\\Cenn123\\.dsh\\profiles\\desktop';
const NODE_MODULES = path.join(PROFILE, 'node_modules');
const PKG_DIR = path.join(NODE_MODULES, 'dsh-client-ui-aqua');
const TARBALL = path.join(KIT, 'dsh-client-ui-aqua-1.3.1.tgz');

/** Minimal ustar reader (regular files only): the kit needs no npm to run. */
function extractTgz(tgz, outDir) {
  const buf = zlib.gunzipSync(fs.readFileSync(tgz));
  fs.mkdirSync(outDir, { recursive: true });
  let off = 0;
  let count = 0;
  while (off + 512 <= buf.length) {
    const header = buf.slice(off, off + 512);
    if (header.every((byte) => byte === 0)) break;
    const field = (start, end) => header.slice(start, end).toString('utf8').replace(/\0.*$/, '');
    let name = field(0, 100);
    const prefix = field(345, 500);
    if (prefix) name = `${prefix}/${name}`;
    const size = parseInt(field(124, 136).trim(), 8) || 0;
    const type = String.fromCharCode(header[156]);
    const dataStart = off + 512;
    if (type === '0' || type === '\0' || type === '') {
      const dest = path.join(outDir, name);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, buf.slice(dataStart, dataStart + size));
      count += 1;
    }
    off = dataStart + Math.ceil(size / 512) * 512;
  }
  return count;
}

// 1. Unpack the pristine published package somewhere throwaway.
const stage = fs.mkdtempSync(path.join(os.tmpdir(), 'aqua-stage-'));
const files = extractTgz(TARBALL, stage);
const staged = path.join(stage, 'package');
console.log(`unpacked ${files} files -> ${staged}`);

// 2. Re-apply the 0.2.0-rc.2 compatibility patch and syntax-check the result.
const bundle = path.join(staged, 'lib', 'client.js');
const patchScript = path.join(KIT, 'patch-aqua.mjs');
execFileSync(process.execPath, [patchScript, bundle], { stdio: 'inherit' });
execFileSync(process.execPath, ['--check', bundle], { stdio: 'inherit' });

// 2b. Stamp the adapted version, so the profile's exact-version exemption (keyed
//     on name@version) and the installed manifest always agree.
const repoManifest = path.join(KIT, '..', 'repo', 'package.json');
if (fs.existsSync(repoManifest)) {
  const adapted = JSON.parse(fs.readFileSync(repoManifest, 'utf8')).version;
  const stagedManifestPath = path.join(staged, 'package.json');
  const stagedManifest = JSON.parse(fs.readFileSync(stagedManifestPath, 'utf8'));
  stagedManifest.version = adapted;
  fs.writeFileSync(stagedManifestPath, JSON.stringify(stagedManifest, null, 2) + '\n');
  console.log('version stamped:', adapted);
}

// 3. Prove the patched bundle actually loads, registers its slot and renders
//    the master switch before anything is installed.
execFileSync(process.execPath, [path.join(KIT, 'smoke-aqua.cjs'), bundle], { stdio: 'inherit' });

// 4. Replace the installed package with the freshly patched copy.
fs.rmSync(PKG_DIR, { recursive: true, force: true });
fs.cpSync(staged, PKG_DIR, { recursive: true });
fs.rmSync(stage, { recursive: true, force: true });
console.log('installed', PKG_DIR);

// 5. Ensure the profile selects it and exempts it (no-op when already done).
execFileSync(process.execPath, [path.join(KIT, 'register-aqua.cjs')], { stdio: 'inherit' });

console.log('\nDone. Restart DeepSeek Harness so the host recomposes the profile,');
console.log('then hard-refresh the Web UI (Ctrl+Shift+R).');
