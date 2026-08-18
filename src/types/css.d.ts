/**
 * CSS Modules return an object of generated class names. Without this
 * declaration TypeScript cannot resolve the import at all.
 *
 * The index signature is `string` rather than a generated union of the actual
 * class names: generating exact types needs an extra build tool, and the value
 * is small when component styles live beside the component that uses them.
 */
declare module '*.module.css' {
  const classes: { readonly [key: string]: string };
  export default classes;
}

/** Plain stylesheets are imported for their side effect only. */
declare module '*.css';
