import type { ElementType, ReactNode } from 'react';

interface VisuallyHiddenProps {
  children: ReactNode;
  /** Defaults to a span; use `as="h2"` when a section needs an unseen heading. */
  as?: ElementType;
}

/**
 * Content available to screen readers but not shown on screen.
 *
 * Uses the clip technique from global.css rather than `display: none` or
 * `visibility: hidden`, both of which remove the element from the accessibility
 * tree entirely and would defeat the purpose.
 *
 * Typical uses: naming a section whose heading is implied visually, and adding
 * context to a link whose visible text ("Read more") is ambiguous out of
 * context.
 */
export function VisuallyHidden({ children, as: Component = 'span' }: VisuallyHiddenProps) {
  return <Component className="nh-visually-hidden">{children}</Component>;
}
