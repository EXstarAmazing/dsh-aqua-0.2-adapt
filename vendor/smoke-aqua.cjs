/**
 * Load the patched Aqua client bundle with stubbed DSH modules and render its
 * settings row, so a broken patch fails here instead of in the running UI.
 *
 * Usage:
 *   node smoke-aqua.cjs <path-to-lib/client.js>
 */
const { Module } = require('node:module');
const path = require('node:path');

const bundle = process.argv[2];
if (!bundle) {
  console.error('usage: node smoke-aqua.cjs <path-to-lib/client.js>');
  process.exit(2);
}

const MOCKS = path.join(__dirname, 'smoke-mocks');
const STUBS = {
  '@deepseek-ai/dsh-client-store': path.join(MOCKS, 'runtime-client.cjs'),
  '@deepseek-ai/dsh-client-ui-primitives': path.join(MOCKS, 'primitives.cjs'),
  '@deepseek-ai/dsh-client-ui-theme/client': path.join(MOCKS, 'empty.cjs'),
  '@deepseek-ai/dsh-client-locale/client': path.join(MOCKS, 'empty.cjs'),
  '@deepseek-ai/dsh-client-ui-settings/client': path.join(MOCKS, 'empty.cjs'),
  '@deepseek-ai/dsh-client-ui-settings-plugins/client': path.join(MOCKS, 'empty.cjs'),
  'react/jsx-runtime': path.join(MOCKS, 'jsx-runtime.cjs'),
  react: path.join(MOCKS, 'react.cjs'),
};

const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  const from = parent ?? module.parent;
  const stub = STUBS[request];
  if (stub !== undefined) return originalLoad.call(this, stub, from, isMain);
  return originalLoad.call(this, request, from, isMain);
};

// Renderer/plugin environment stubs.
const storage = new Map();
globalThis.localStorage = {
  getItem: (key) => (storage.has(key) ? storage.get(key) : null),
  setItem: (key, value) => storage.set(key, String(value)),
  removeItem: (key) => storage.delete(key),
};
const makeElement = (tag = 'div') => {
  const children = [];
  const base = globalThis.HTMLElement === undefined ? Object.prototype : globalThis.HTMLElement.prototype;
  const element = Object.create(base);
  Object.assign(element, {
    tagName: String(tag).toUpperCase(),
    style: { setProperty() {}, removeProperty() {} },
    dataset: {},
    children,
    firstElementChild: null,
    parentNode: null,
    className: '',
    _innerHTML: '',
    prepend(child) { children.unshift(child); if (child) child.parentNode = this; },
    setAttribute() {},
    removeAttribute() {},
    toggleAttribute() {},
    hasAttribute: () => false,
    appendChild(child) { children.push(child); if (child) child.parentNode = this; return child; },
    append(...nodes) { for (const node of nodes) children.push(node); },
    remove() {},
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener() {},
    removeEventListener() {},
    setPointerCapture() {},
  });
  Object.defineProperty(element, 'innerHTML', {
    get() { return this._innerHTML; },
    // The plugin parses a markup string and asserts the parsed node exists.
    set(value) {
      this._innerHTML = value;
      this.firstElementChild = makeElement('div');
    },
  });
  return element;
};

globalThis.document = {
  documentElement: makeElement('html'),
  body: makeElement('body'),
  createElement: (tag) => makeElement(tag),
  createElementNS: (_ns, tag) => makeElement(tag),
  createTextNode: (text) => ({ textContent: text }),
  createDocumentFragment: () => makeElement('fragment'),
  querySelector: () => null,
  querySelectorAll: () => [],
  addEventListener() {},
  removeEventListener() {},
  head: makeElement('head'),
};

globalThis.document.documentElement.hasAttribute = () => false;

globalThis.requestAnimationFrame = (fn) => setTimeout(() => fn(Date.now()), 0);
globalThis.cancelAnimationFrame = () => {};
globalThis.ResizeObserver = class ResizeObserver { observe() {} unobserve() {} disconnect() {} };
globalThis.IntersectionObserver = class IntersectionObserver { observe() {} unobserve() {} disconnect() {} };
globalThis.MutationObserver = class MutationObserver {
  constructor(callback) { this.callback = callback; }
  observe() {}
  disconnect() {}
  takeRecords() { return []; }
};
globalThis.getComputedStyle = () => ({ getPropertyValue: () => '' });
globalThis.devicePixelRatio = 1;
globalThis.window = { addEventListener() {}, removeEventListener() {}, matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }) };
globalThis.HTMLElement = class HTMLElement {};
globalThis.HTMLCanvasElement = class HTMLCanvasElement extends globalThis.HTMLElement {};
globalThis.HTMLVideoElement = class HTMLVideoElement extends globalThis.HTMLElement {};
globalThis.HTMLImageElement = class HTMLImageElement extends globalThis.HTMLElement {};
globalThis.StorageEvent = class StorageEvent {};
globalThis.URL.createObjectURL = () => 'blob:smoke';
globalThis.URL.revokeObjectURL = () => {};
globalThis.requestAnimationFrame = (fn) => setTimeout(fn, 0);
globalThis.cancelAnimationFrame = () => {};

const registered = [];
const fakeCtx = {
  effect: (run) => {
    try {
      const dispose = run();
      return typeof dispose === 'function' ? dispose : () => {};
    } catch {
      return () => {};
    }
  },
  on: () => () => {},
  logger: { info() {}, warn() {}, error() {}, debug() {} },
  locale: { register: () => () => {} },
  theme: {
    getTheme: () => ({ active: { colorScheme: 'dark' } }),
    overrideTokens: () => () => {},
  },
  slots: {
    inject: (name, callback) => {
      registered.push({ name, entry: callback() });
      return () => {};
    },
    register: (options, component) => ({ options, component }),
  },
};

(async () => {
  // The DSH client plugin format is `window.__ModuleLoader__.load({ id, factory })`
  // driven from a browser `<script>` tag; evaluate it here so the factory (and
  // therefore the whole plugin body) really runs.
  let mod;
  try {
    const factoryResult = await new Promise((resolve) => {
      globalThis.window.__ModuleLoader__ = {
        load: (definition) => resolve(definition.factory((request) => require(request))),
      };
      require(bundle);
    });
    if (factoryResult === undefined) throw new Error('__ModuleLoader__.load did not hand back module exports');
    mod = factoryResult;
  } catch (error) {
    console.error('load failed:', error && error.stack ? error.stack : error);
    throw error;
  }
  if (typeof mod.apply !== 'function') throw new Error('bundle exports no apply()');
  console.log('exports:', Object.keys(mod).join(', '));

  mod.apply(fakeCtx);
  console.log('registered slots:', registered.map((item) => item.name).join(', ') || '(none)');

  const row = registered.find((item) => item.name === 'settings.general.item');
  if (!row) throw new Error('settings.general.item was not registered');
  if (!row.entry || typeof row.entry.component !== 'function') throw new Error('row registration carries no component');

  const store = row.entry.options.store;
  // The registered handle is a `defineStore` handle, so the component only gets
  // real usability once the renderer's inject pass hands it bound actions -
  // reproduce that here the way the renderer's `runInject` does.
  const instance = store.create();
  const injected = typeof row.entry.options.inject === 'function'
    ? row.entry.options.inject(instance.actions)
    : row.entry.options.inject;
  console.log('injected actions:', typeof injected === 'object' && injected !== null ? Object.keys(injected).length : `(not an object: ${typeof injected})`);

  const render = () => row.entry.component({
    t: (key) => key,
    useStore: (selector) => selector(instance.getSnapshot()),
    ...injected,
  });

  const tree = render();
  if (tree === null) throw new Error('row rendered null while the layer is enabled');

  let switchNode = null;
  const walk = (node) => {
    if (node === null || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      for (const child of node) walk(child);
      return;
    }
    if (node.type === 'button' && node.props?.['aria-pressed'] !== undefined && switchNode === null) switchNode = node;
    walk(node.props?.children);
  };
  walk(tree);

  if (switchNode === null) throw new Error('master switch button not found in the rendered row');
  const labelOf = (node) => (Array.isArray(node.props.children) ? node.props.children[1] : node.props.children);
  console.log('master switch:', JSON.stringify(labelOf(switchNode)), 'aria-pressed =', switchNode.props['aria-pressed']);

  switchNode.props.onClick();
  const after = render();
  let nextSwitch = null;
  const findSwitch = (node) => {
    if (node === null || typeof node !== 'object') return;
    if (Array.isArray(node)) { for (const child of node) findSwitch(child); return; }
    if (node.type === 'button' && node.props?.['aria-pressed'] !== undefined && nextSwitch === null) nextSwitch = node;
    findSwitch(node.props?.children);
  };
  findSwitch(after);
  console.log('after toggle: ', JSON.stringify(labelOf(nextSwitch)), 'aria-pressed =', nextSwitch.props['aria-pressed']);
  if (nextSwitch.props['aria-pressed'] !== false) throw new Error('toggle did not flip the enabled state');

  console.log('\nSMOKE OK: the patched bundle loads, registers settings.general.item,');
  console.log('renders the master switch, and the switch flips the layer state.');
})().catch((error) => {
  console.error('\nSMOKE FAILED:', error.message);
  process.exit(1);
});
