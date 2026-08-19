import { Link } from 'gatsby';
import { ButtonLink } from '@/components/primitives/Button';
import { PRIMARY_NAV } from '@/lib/navigation';
import type { MobileMenu } from './useMobileMenu';
import * as styles from './MobileNav.module.css';

/**
 * The control that opens the navigation panel.
 *
 * Rendered outside the navigation landmark: a disclosure button is a control,
 * not a destination, and including it would put a button inside the list of
 * navigation links that screen reader users step through.
 */
export function MobileMenuToggle({ menu }: { menu: MobileMenu }) {
  return (
    <button
      type="button"
      ref={menu.toggleRef}
      className={styles.toggle}
      aria-expanded={menu.open}
      aria-controls={menu.panelId}
      onClick={menu.toggle}
    >
      {/*
       * The accessible name changes with state rather than relying on
       * aria-expanded alone, which older screen reader and browser pairings
       * announce inconsistently.
       */}
      <span className="nh-visually-hidden">{menu.open ? 'Close main menu' : 'Open main menu'}</span>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        aria-hidden="true"
        focusable="false"
      >
        {menu.open ? <path d="M6 6L18 18M18 6L6 18" /> : <path d="M3 6H21M3 12H21M3 18H21" />}
      </svg>
    </button>
  );
}

/**
 * The navigation panel itself.
 *
 * Stays mounted and is hidden with the `hidden` attribute rather than being
 * unmounted, so the toggle's aria-controls always references a real element.
 */
export function MobileMenuPanel({ menu }: { menu: MobileMenu }) {
  return (
    <>
      {menu.open && <div className={styles.scrim} aria-hidden="true" />}

      <div id={menu.panelId} ref={menu.panelRef} className={styles.panel} hidden={!menu.open}>
        <ul className={styles.list}>
          {PRIMARY_NAV.map((item) => (
            <li key={item.to}>
              <Link
                to={item.to}
                className={styles.link}
                activeClassName={styles.linkActive}
                onClick={menu.close}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>

        <ButtonLink
          to="/about#contact"
          variant="primary"
          size="md"
          shape="pill"
          fullWidth
          tracking={{ name: 'Contact us', location: 'header' }}
          onClick={menu.close}
        >
          Contact us
        </ButtonLink>
      </div>
    </>
  );
}
