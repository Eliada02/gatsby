import * as React from 'react';

/**
 * Automatic mock for the `gatsby` package (Jest applies root-level __mocks__ to
 * node_modules without an explicit jest.mock call).
 *
 * `Link` renders a real anchor with a real href rather than a stub, so keyboard
 * navigation tests and jest-axe checks exercise the same semantics a browser
 * would. Mocking it away as a <div> would make navigation tests meaningless.
 */

type LinkProps = {
  to: string;
  children?: React.ReactNode;
  // Gatsby-specific props are accepted and discarded so components can pass
  // them without breaking the mock.
  activeClassName?: string;
  activeStyle?: React.CSSProperties;
  partiallyActive?: boolean;
  replace?: boolean;
  state?: Record<string, unknown>;
} & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'>;

export const Link = React.forwardRef<HTMLAnchorElement, LinkProps>(function Link(
  {
    to,
    children,
    activeClassName: _activeClassName,
    activeStyle: _activeStyle,
    partiallyActive: _partiallyActive,
    replace: _replace,
    state: _state,
    ...rest
  },
  ref,
) {
  return (
    <a ref={ref} href={to} {...rest}>
      {children}
    </a>
  );
});

export const navigate = jest.fn();
export const graphql = jest.fn();
export const useStaticQuery = jest.fn();
export const withPrefix = (path: string) => path;
