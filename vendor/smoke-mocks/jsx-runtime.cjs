/** Minimal React 18 automatic-runtime stand-in: elements are plain objects. */
exports.jsx = (type, props) => ({ type, props });
exports.jsxs = (type, props) => ({ type, props });
exports.Fragment = Symbol.for('react.fragment');
exports.jsxDEV = (type, props) => ({ type, props });
