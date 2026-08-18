import * as path from 'node:path';
import type { GatsbyNode } from 'gatsby';
import { queryResources } from './src/lib/content/resource-query';
import { resources } from './src/lib/content/source';

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

/**
 * Renders the first page of the library into the static HTML.
 *
 * The library is interactive and fetches from /api/resources as filters change,
 * but the unfiltered first page never changes between builds. Injecting it as
 * page context means the served HTML contains real resource cards, so search
 * engines and readers without JavaScript get content rather than a skeleton,
 * and returning visitors see no loading flash on first paint.
 *
 * The component still receives it through the same typed response shape the API
 * returns, so there is one rendering path rather than two.
 */
export const onCreatePage: GatsbyNode['onCreatePage'] = ({ page, actions }) => {
  if (page.path !== '/resources/') return;

  const { createPage, deletePage } = actions;

  // createPage on an existing path would be a duplicate; the page has to be
  // replaced rather than added to.
  deletePage(page);
  createPage({
    ...page,
    context: {
      ...page.context,
      initialResources: queryResources(resources),
    },
  });
};

/**
 * One statically generated page per resource.
 *
 * Built from the content source directly rather than through the REST endpoint:
 * the endpoint does not exist during a build, and going over HTTP to reach data
 * already in memory would be indirection with no benefit.
 */
export const createPages: GatsbyNode['createPages'] = ({ actions }) => {
  const template = path.resolve(__dirname, 'src/templates/ResourceDetail.tsx');

  for (const resource of resources) {
    /*
     * Related resources are chosen at build time: same category, most recent
     * first, excluding the resource itself. Computing this here keeps the
     * template free of selection logic and costs nothing at runtime.
     */
    const related = resources
      .filter((other) => other.category === resource.category && other.id !== resource.id)
      .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
      .slice(0, 3);

    actions.createPage({
      path: `/resources/${resource.slug}`,
      component: template,
      context: { resource, related },
    });
  }
};
