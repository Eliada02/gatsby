import * as React from 'react';
import type { HeadFC, PageProps } from 'gatsby';

const IndexPage: React.FC<PageProps> = () => (
  <main>
    <h1>NovaHealth</h1>
    <p>Advancing science. Improving lives.</p>
  </main>
);

export default IndexPage;

export const Head: HeadFC = () => <title>NovaHealth</title>;
