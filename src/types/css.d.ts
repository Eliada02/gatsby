/**
 * CSS Modules return an object of generated class names.
 *
 * Declared with `export =` rather than a default export because Gatsby compiles
 * CSS Modules differently for the browser and for SSR: the SSR pass uses
 * css-loader's exportOnlyLocals mode, which emits named exports and no default.
 * A default import therefore type-checks, works in the browser, and is
 * undefined during static HTML generation.
 *
 * Consumers must use `import * as styles from './x.module.css'`.
 */
declare module '*.module.css' {
  const classes: { readonly [key: string]: string };
  export = classes;
}

/** Plain stylesheets are imported for their side effect only. */
declare module '*.css';
