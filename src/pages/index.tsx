import type { HeadFC } from 'gatsby';

/**
 * Placeholder boot page. Replaced by the real home page in Phase 4.
 *
 * No React import is required: `jsx: "react-jsx"` in tsconfig enables the
 * automatic JSX runtime, so the compiler injects the factory itself.
 */
const IndexPage = () => (
  <main>
    <h1>NovaHealth</h1>
    <p>Advancing science. Improving lives.</p>
  </main>
);

export default IndexPage;

export const Head: HeadFC = () => <title>NovaHealth</title>;
