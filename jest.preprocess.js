const babelJest = require('babel-jest').default;

/**
 * babel-preset-gatsby matches the transform Gatsby applies in a real build, so
 * tests exercise the same output the site ships.
 *
 * reactRuntime must be set explicitly: the preset defaults to the classic
 * runtime (React.createElement), while tsconfig uses the automatic runtime.
 * Without this, components that correctly omit the React import fail with
 * "React is not defined" in tests but build fine.
 *
 * targets node:current skips downlevelling that the test runner does not need.
 */
module.exports = babelJest.createTransformer({
  presets: [
    ['babel-preset-gatsby', { reactRuntime: 'automatic', targets: { node: 'current' } }],
    '@babel/preset-typescript',
  ],
});
