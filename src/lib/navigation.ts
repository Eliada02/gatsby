export interface NavItem {
  label: string;
  to: string;
}

/**
 * Single source of truth for the primary navigation.
 *
 * The desktop bar and the mobile panel are two presentations of this list, not
 * two copies of it. Duplicating the links is how navigation drifts out of sync
 * between breakpoints — a bug that only shows on the viewport nobody tested.
 */
export const PRIMARY_NAV: readonly NavItem[] = [
  { label: 'Platform', to: '/platform' },
  { label: 'Patient Experience', to: '/patient-experience' },
  { label: 'Resources', to: '/resources' },
  { label: 'Security & Trust', to: '/security' },
  { label: 'About', to: '/about' },
];

/** Grouped links for the footer. */
export const FOOTER_NAV: ReadonlyArray<{ heading: string; items: readonly NavItem[] }> = [
  {
    heading: 'Product',
    items: [
      { label: 'Platform', to: '/platform' },
      { label: 'Patient Experience', to: '/patient-experience' },
      { label: 'Security & Trust', to: '/security' },
    ],
  },
  {
    heading: 'Resources',
    items: [
      { label: 'Resource library', to: '/resources' },
      { label: 'Digital health', to: '/resources?category=digital-health' },
      { label: 'Patient experience', to: '/resources?category=patient-experience' },
    ],
  },
  {
    heading: 'Company',
    items: [
      { label: 'About NovaHealth', to: '/about' },
      { label: 'Contact', to: '/about#contact' },
    ],
  },
];
