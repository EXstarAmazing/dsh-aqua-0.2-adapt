/**
 * Register the (patched) Aqua client plugin in the desktop dsh profile: select
 * the bundle, correct the package's browser declaration, and grant the
 * exact-version compatibility exemption DSH 0.2.0-rc.2 demands for a package
 * whose peers still name the 0.1.x client line.
 *
 * Every file is rewritten atomically (temp file + JSON validation + rename).
 */
const fs = require('node:fs');
const path = require('node:path');

const PROFILE = 'C:\\Users\\Cenn123\\.dsh\\profiles\\desktop';
const PKG_DIR = path.join(PROFILE, 'node_modules', 'dsh-client-ui-aqua');
const RUNTIME = '0.2.0-rc.2';
const BUNDLE = 'dsh-client-ui-aqua';
/**
 * Read from the installed package instead of hard-coding: the exemption is
 * keyed on the exact `name@version`, so it must follow the package manifest.
 */
const VERSION = fs.existsSync(path.join(PKG_DIR, 'package.json'))
  ? JSON.parse(fs.readFileSync(path.join(PKG_DIR, 'package.json'), 'utf8')).version
  : '1.3.2';

function writeAtomic(file, text) {
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, text);
  JSON.parse(fs.readFileSync(tmp, 'utf8')); // fail before replacing anything
  fs.renameSync(tmp, file);
}

// 1. Profile manifest: dependency + bundle selection.
const manifestPath = path.join(PROFILE, 'package.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
manifest.dependencies = { ...manifest.dependencies, [BUNDLE]: `^${VERSION}` };
const bundles = manifest.dsh.profile.bundles;
if (!bundles.includes(BUNDLE)) bundles.push(BUNDLE);
writeAtomic(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log('manifest bundles:', bundles.join(', '));

// 2. The package's own browser declaration. Its shipped list names
//    `@deepseek-ai/dsh-client-runtime`, a package 0.2.0-rc.2 does not ship at
//    all; `@deepseek-ai/dsh-client-store` is what every shipped client bundle
//    (and the patched bundle) actually takes `defineStore` from.
const pkgPath = path.join(PKG_DIR, 'package.json');
if (fs.existsSync(pkgPath)) {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const inject = pkg.dsh?.client?.inject;
  if (Array.isArray(inject)) {
    const runtime = '@deepseek-ai/dsh-client-runtime';
    const store = '@deepseek-ai/dsh-client-store';
    const withoutRuntime = inject.filter((name) => name !== runtime);
    const patched = withoutRuntime.includes(store) ? withoutRuntime : [...withoutRuntime, store];
    if (patched.join() !== inject.join()) {
      pkg.dsh.client.inject = patched;
      writeAtomic(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
      console.log('dsh.client.inject:', patched.join(', '));
    } else {
      console.log('dsh.client.inject already correct');
    }
  } else {
    console.log('WARNING: package declares no dsh.client.inject list');
  }
} else {
  console.log('WARNING: package not installed yet; run reinstall-aqua.cjs first');
}

// 3. Compatibility exemption: exact package@version -> exact DSH versions.
const compatPath = path.join(PROFILE, 'compatibility.json');
let compat = {};
if (fs.existsSync(compatPath)) compat = JSON.parse(fs.readFileSync(compatPath, 'utf8'));
const key = `${BUNDLE}@${VERSION}`;
compat[key] = [...new Set([...(compat[key] ?? []), RUNTIME])];
writeAtomic(compatPath, JSON.stringify(compat, null, 2) + '\n');
console.log('exemptions:', JSON.stringify(compat));
