/** Minimal React stand-in — enough for hooks the plugin calls during render. */
const ref = () => ({ current: null });
exports.useRef = ref;
exports.useState = (initial) => [typeof initial === 'function' ? initial() : initial, () => {}];
exports.useEffect = () => {};
exports.useMemo = (fn) => fn();
exports.useCallback = (fn) => fn;
exports.useSyncExternalStore = (_subscribe, getSnapshot) => getSnapshot();
exports.createContext = () => ({ Provider: function Provider() {}, Consumer: function Consumer() {} });
exports.Fragment = Symbol.for('react.fragment');
exports.createElement = (type, props) => ({ type, props });
