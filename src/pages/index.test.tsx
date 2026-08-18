import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import IndexPage from './index';

/**
 * Smoke test for the toolchain: proves the Babel/TypeScript transform, JSX
 * runtime, Testing Library and jest-axe are wired correctly. Replaced by real
 * home page tests in Phase 4.
 */
describe('boot page', () => {
  it('exposes the site name as the top-level heading', () => {
    render(<IndexPage />);

    expect(screen.getByRole('heading', { level: 1, name: 'NovaHealth' })).toBeInTheDocument();
  });

  it('has no detectable accessibility violations', async () => {
    const { container } = render(<IndexPage />);

    expect(await axe(container)).toHaveNoViolations();
  });
});
