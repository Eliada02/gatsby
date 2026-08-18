import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { useFocusTrap } from '@/hooks/useFocusTrap';

export const MOBILE_MENU_PANEL_ID = 'mobile-nav-panel';

export interface MobileMenu {
  open: boolean;
  toggle: () => void;
  close: () => void;
  // React 18 types: RefObject<T>.current is already T | null. Writing
  // RefObject<T | null> is the React 19 shape and is rejected by the ref prop.
  panelRef: RefObject<HTMLDivElement>;
  toggleRef: RefObject<HTMLButtonElement>;
  panelId: string;
}

/**
 * Disclosure state and behaviour for the mobile navigation panel.
 *
 * Extracted from the components because the toggle and the panel live in
 * different parts of the header tree: the panel sits inside the single
 * navigation landmark, while the toggle sits with the header actions. A button
 * that opens navigation is a control, not navigation, so it does not belong
 * inside the landmark.
 */
export function useMobileMenu(): MobileMenu {
  const [open, setOpen] = useState(false);
  const panelRef = useFocusTrap<HTMLDivElement>(open);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    const handlePointerDown = (event: Event) => {
      const target = event.target as Node;
      // The toggle manages its own state; ignoring it prevents a close/open race.
      if (panelRef.current?.contains(target) || toggleRef.current?.contains(target)) return;
      setOpen(false);
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('pointerdown', handlePointerDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [open, panelRef]);

  // Stops the page behind the panel scrolling under the user's finger.
  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return {
    open,
    toggle: () => setOpen((isOpen) => !isOpen),
    close: () => setOpen(false),
    panelRef,
    toggleRef,
    panelId: MOBILE_MENU_PANEL_ID,
  };
}
