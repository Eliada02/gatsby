import { useEffect, useRef } from 'react';

/**
 * Elements that can receive keyboard focus.
 *
 * `[tabindex="-1"]` is excluded: such elements are focusable programmatically
 * but are deliberately outside the tab order, so including them would let Tab
 * land somewhere a keyboard user cannot reach by other means.
 */
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

/**
 * Confines Tab focus to a container while it is open, then returns focus to
 * wherever it came from.
 *
 * Without this, tabbing out of an open menu moves focus to page content that is
 * visually behind an overlay. Sighted keyboard users watch the focus ring
 * disappear; screen reader users are read content they cannot see.
 *
 * Focus restoration matters just as much: closing the menu must return focus to
 * the control that opened it, or the user is dropped back at the top of the
 * document having lost their place.
 */
export function useFocusTrap<T extends HTMLElement>(active: boolean) {
  const containerRef = useRef<T>(null);

  useEffect(() => {
    if (!active) return;

    const container = containerRef.current;
    if (!container) return;

    // Captured before focus moves, so it can be restored on close.
    const previouslyFocused = document.activeElement as HTMLElement | null;

    const getFocusable = (): HTMLElement[] =>
      Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));

    getFocusable()[0]?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;

      const focusable = getFocusable();
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      // Nothing focusable: keep focus where it is rather than letting it escape.
      if (!first || !last) {
        event.preventDefault();
        return;
      }

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [active]);

  return containerRef;
}
