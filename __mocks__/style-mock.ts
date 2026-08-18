/**
 * CSS Modules compile to an object of hashed class names. Tests never assert on
 * those names, they only need the import to resolve, so this Proxy returns the
 * requested key: `styles.button` -> "button".
 *
 * A three-line Proxy replaces the identity-obj-proxy dependency.
 */
const styleMock = new Proxy(
  {},
  {
    get: (_target, key) => (typeof key === 'string' ? key : undefined),
  },
);

export default styleMock;
