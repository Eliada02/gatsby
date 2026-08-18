import type { ReactNode } from 'react';
import { MAIN_CONTENT_ID } from './constants';
import { Footer } from './Footer';
import { Header } from './Header';
import { SkipLink } from './SkipLink';
import * as styles from './Layout.module.css';

export { MAIN_CONTENT_ID };

interface LayoutProps {
  children: ReactNode;
}

/**
 * Page chrome shared by every route.
 *
 * The landmark structure is fixed here so no page can get it wrong: one banner
 * (header), one main, one contentinfo (footer). <footer> only counts as a
 * contentinfo landmark when it is not nested inside another sectioning element,
 * which is why it lives here rather than inside page content.
 *
 * `tabIndex={-1}` on main makes it a valid target for the skip link. Without
 * it, several browsers move the scroll position but leave focus at the top of
 * the document, so the next Tab returns the user to the navigation they were
 * trying to skip — the bug that makes most skip links useless in practice.
 */
export function Layout({ children }: LayoutProps) {
  return (
    <>
      <SkipLink />
      <Header />
      <main id={MAIN_CONTENT_ID} tabIndex={-1} className={styles.main}>
        {children}
      </main>
      <Footer />
    </>
  );
}
