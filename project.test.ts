import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import config from './gatsby-config';

/**
 * Repository configuration.
 *
 * Three things here are easy to break and impossible to notice locally: the
 * Node version drifting between the places that declare it, a CI gate being
 * dropped from the workflow, and the SEO layer losing a field it reads out of
 * siteMetadata. None of them fail a build on the machine that made the change.
 *
 * These assertions are about contracts rather than formatting — the workflow is
 * read as text because adding a YAML parser to check four lines would cost more
 * than it protects.
 */

const read = (file: string) => readFileSync(join(__dirname, file), 'utf8');

const packageJson = JSON.parse(read('package.json')) as {
  engines: { node: string };
  scripts: Record<string, string>;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
};

const nvmrc = read('.nvmrc').trim();
const workflow = read('.github/workflows/ci.yml');
/** Comments explain the rules; the rules themselves are what is asserted. */
const workflowRules = workflow.replace(/^\s*#.*$/gm, '');

describe('Node version', () => {
  it('is pinned in .nvmrc', () => {
    expect(nvmrc).toMatch(/^\d+$/);
  });

  it('is the same major version in package.json engines', () => {
    // A repository that pins 22 for developers and accepts 20 in engines will
    // eventually be built on 20 by someone, and fail on something subtle.
    expect(packageJson.engines.node).toBe(`>=${nvmrc}.0.0`);
  });

  it('is taken from .nvmrc by CI rather than repeated in the workflow', () => {
    expect(workflow).toMatch(/node-version-file:\s*\.nvmrc/);
    expect(workflow).not.toMatch(/node-version:\s*['"]?\d/);
  });
});

describe('CI workflow', () => {
  it('runs on pull requests and on pushes to main', () => {
    expect(workflow).toMatch(/on:\s*\n\s*push:\s*\n\s*branches:\s*\[main\]/);
    expect(workflow).toMatch(/\n\s*pull_request:/);
  });

  it('installs from the lockfile', () => {
    // npm ci fails when package.json and the lockfile disagree; npm install
    // would quietly resolve something else.
    expect(workflow).toMatch(/run:\s*npm ci/);
    expect(workflow).not.toMatch(/run:\s*npm install/);
  });

  it.each(['npm run lint', 'npm run typecheck', 'npm test', 'npm run build'])(
    'gates merges on %s',
    (script) => {
      expect(workflow).toContain(script);
    },
  );

  it('asks for no more than read access', () => {
    // Nothing in the pipeline publishes, comments or tags.
    expect(workflowRules).toMatch(/permissions:\s*\n\s*contents:\s*read/);
    expect(workflowRules).not.toMatch(/write/);
  });

  it('uses only first-party actions, pinned to a major version', () => {
    const actions = [...workflow.matchAll(/uses:\s*(\S+)/g)].map((match) => match[1]!);

    expect(actions.length).toBeGreaterThan(0);
    for (const action of actions) {
      expect(action).toMatch(/^actions\/[a-z-]+@v\d+$/);
    }
  });

  it('exposes no secrets to the build', () => {
    expect(workflowRules).not.toMatch(/secrets\./);
  });
});

describe('scripts', () => {
  it.each(['lint', 'typecheck', 'test', 'build', 'format:check'])(
    'defines the %s script CI depends on',
    (script) => {
      expect(packageJson.scripts[script]).toBeDefined();
    },
  );
});

describe('site configuration', () => {
  const siteMetadata = config.siteMetadata as Record<string, unknown> | undefined;

  it.each([
    'title',
    'titleTemplate',
    'description',
    'siteUrl',
    'locale',
    'socialImage',
    'socialImageAlt',
  ])('provides %s, which the SEO layer reads', (field) => {
    expect(siteMetadata?.[field]).toBeTruthy();
  });

  it('takes the origin from the environment rather than hard-coding production', () => {
    // The only literal origin in the config is the localhost fallback, which
    // the SEO layer treats as "no origin configured".
    expect(String(siteMetadata?.siteUrl)).toMatch(/^http/);
    expect(read('gatsby-config.ts')).toMatch(/process\.env\.SITE_URL/);
  });

  it('generates the sitemap from built pages, excluding the 404', () => {
    const plugins = (config.plugins ?? []) as Array<
      string | { resolve: string; options?: { excludes?: string[] } }
    >;
    const sitemap = plugins.find(
      (plugin) => typeof plugin === 'object' && plugin.resolve === 'gatsby-plugin-sitemap',
    );

    expect(sitemap).toBeDefined();
    const excludes = (sitemap as { options?: { excludes?: string[] } }).options?.excludes ?? [];
    // An error page in a sitemap is an invitation to index an error page.
    expect(excludes.some((path) => path.includes('404'))).toBe(true);
  });

  it('declares sharp, which the build uses directly for the social card', () => {
    // It arrives transitively through gatsby-plugin-sharp too, but gatsby-node
    // imports it by name and an undeclared dependency is a build waiting to
    // break on a different install tree.
    expect(packageJson.devDependencies.sharp ?? packageJson.dependencies.sharp).toBeDefined();
  });
});
