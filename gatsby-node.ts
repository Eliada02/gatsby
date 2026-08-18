import * as path from 'node:path';
import type { GatsbyNode } from 'gatsby';

/**
 * Mirrors the `@/*` path alias from tsconfig.json into webpack.
 *
 * TypeScript's `paths` only affects type resolution; the bundler needs the same
 * mapping or imports fail at build time. Jest needs a third copy in its
 * moduleNameMapper. All three must stay in sync.
 */
export const onCreateWebpackConfig: GatsbyNode['onCreateWebpackConfig'] = ({ actions }) => {
  actions.setWebpackConfig({
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
  });
};
