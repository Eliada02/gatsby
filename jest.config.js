/**
 * Jest is configured in JS rather than TS on purpose: a jest.config.ts file
 * requires ts-node at runtime, and the JSDoc type annotation below gives the
 * same editor autocomplete without adding a dependency.
 *
 * @type {import('jest').Config}
 */
const config = {
  testEnvironment: 'jsdom',

  // Gatsby compiles with Babel, not tsc. Tests must use the same pipeline or
  // they would pass against code the real build cannot compile.
  transform: {
    '^.+\\.[jt]sx?$': '<rootDir>/jest.preprocess.js',
  },

  moduleNameMapper: {
    '\\.(css|scss)$': '<rootDir>/__mocks__/style-mock.ts',
    '\\.(jpg|jpeg|png|gif|svg|webp|avif)$': '<rootDir>/__mocks__/file-mock.ts',
    // Third copy of the `@/*` alias, after tsconfig.json and gatsby-node.ts.
    '^@/(.*)$': '<rootDir>/src/$1',
  },

  setupFiles: ['<rootDir>/jest.loadershim.ts'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],

  testPathIgnorePatterns: ['/node_modules/', '/\\.cache/', '/public/'],

  // Gatsby publishes untranspiled ESM; it must be transformed, not skipped.
  transformIgnorePatterns: ['node_modules/(?!(gatsby|gatsby-script|gatsby-link)/)'],

  globals: { __PATH_PREFIX__: '' },

  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.d.ts'],
};

module.exports = config;
