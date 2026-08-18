import { Link } from 'gatsby';
import { ButtonLink } from '@/components/primitives/Button';
import { Container } from '@/components/primitives/Container';
import { PRIMARY_NAV } from '@/lib/navigation';
import { Logo } from './Logo';
import { MobileMenuPanel, MobileMenuToggle } from './MobileNav';
import { useMobileMenu } from './useMobileMenu';
import styles from './Header.module.css';

/**
 * Fixed site header.
 *
 * There is exactly one navigation landmark. It contains both presentations of
 * PRIMARY_NAV: the horizontal bar shown from 64rem up, and the panel shown
 * below it. An earlier version used a separate <nav> for each, which axe
 * flagged as duplicate landmarks — correct, because keeping them unique then
 * depended on a media query, and moving a breakpoint would silently produce two
 * "Main" landmarks. Structure now guarantees uniqueness rather than CSS.
 *
 * Links sit in a list so screen readers announce the number of destinations
 * before the user steps through them.
 */
export function Header() {
  const menu = useMobileMenu();

  return (
    <header className={styles.header}>
      <Container>
        <div className={styles.inner}>
          <Logo />

          <nav aria-label="Main" className={styles.nav}>
            <ul className={styles.navList}>
              {PRIMARY_NAV.map((item) => (
                <li key={item.to}>
                  {/*
                   * Gatsby's Link sets aria-current="page" on the active route,
                   * so the current page reaches assistive technology as well as
                   * being shown visually.
                   */}
                  <Link
                    to={item.to}
                    className={styles.navLink}
                    activeClassName={styles.navLinkActive}
                    partiallyActive
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>

            <MobileMenuPanel menu={menu} />
          </nav>

          <div className={styles.actions}>
            <ButtonLink
              to="/about#contact"
              variant="primary"
              size="sm"
              shape="pill"
              className={styles.contactCta}
            >
              Contact us
            </ButtonLink>

            <MobileMenuToggle menu={menu} />
          </div>
        </div>
      </Container>
    </header>
  );
}
