import { Link } from 'gatsby';
import { Container } from '@/components/primitives/Container';
import { FOOTER_NAV } from '@/lib/navigation';
import { Logo } from './Logo';
import styles from './Footer.module.css';

const CURRENT_YEAR = new Date().getFullYear();

/**
 * Site footer.
 *
 * <footer> is a contentinfo landmark only while it is a direct child of body,
 * so it is rendered by Layout rather than nested inside page content.
 *
 * The disclaimer is deliberately prominent. The site presents clinical-looking
 * content and a security capability list, and a reader arriving from a search
 * result should not have to infer that none of it describes a real company.
 */
export function Footer() {
  return (
    <footer className={`${styles.footer} nh-on-dark`}>
      <Container>
        <div className={styles.top}>
          <div className={styles.brand}>
            <Logo tone="inverse" />
            <p className={styles.blurb}>
              A connected digital health experience: scheduling, records and care team messaging in
              one place, built around the person receiving care.
            </p>
          </div>

          <nav aria-label="Footer" className={styles.navGroups}>
            {FOOTER_NAV.map((group) => (
              <div key={group.heading} className={styles.navGroup}>
                {/*
                 * A real heading rather than a styled div, so screen reader
                 * users can navigate the footer by heading and understand how
                 * the links are grouped.
                 */}
                <h2 className={styles.navHeading}>{group.heading}</h2>
                <ul className={styles.navList}>
                  {group.items.map((item) => (
                    <li key={item.to}>
                      <Link to={item.to} className={styles.navLink}>
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className={styles.bottom}>
          <p className={styles.legal}>
            &copy; {CURRENT_YEAR} NovaHealth.{' '}
            <strong className={styles.disclaimer}>NovaHealth is a fictional company.</strong> This
            site is a portfolio demonstration. The organisations, people, clinical data and product
            capabilities shown are illustrative examples, not real services, endorsements or
            certifications.
          </p>

          <a href="#main-content" className={styles.backToTop}>
            Back to top <span aria-hidden="true">&uarr;</span>
          </a>
        </div>
      </Container>
    </footer>
  );
}
