/**
 * Faithful stand-in for @deepseek-ai/dsh-client-store.
 *
 * `defineStore(decl)` returns a HANDLE only — `{ spec, create() }` — exactly
 * like the real package. The declared actions live on the instance that
 * `create()` returns, which is the detail the bundle patch has to respect.
 */
exports.defineStore = (decl) => ({
  spec: decl,
  create(scopeKey) {
    let state = decl.init();
    const listeners = new Set();
    const actions = {};
    for (const [name, mutate] of Object.entries(decl.actions ?? {})) {
      actions[name] = (...args) => {
        mutate(state, ...args);
        for (const listener of listeners) listener();
      };
    }
    return {
      actions,
      getSnapshot: () => state,
      subscribe: (fn) => {
        listeners.add(fn);
        return () => listeners.delete(fn);
      },
      store: { get: () => state, subscribe: (fn) => { listeners.add(fn); } },
      clearPersisted: () => {},
    };
  },
});
exports.createSnapshotStore = () => ({ get: () => ({}), subscribe: () => () => {}, update: () => {} });
exports.notifySubscribers = () => {};
exports.shallowEqual = (a, b) => a === b;
