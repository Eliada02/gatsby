import { Badge } from '@/components/patterns/Badge';
import type { PortalPreview as PortalPreviewContent } from '@/types/site';
import * as styles from './PortalPreview.module.css';

/**
 * Illustrative preview of the patient portal, shown beside the hero.
 *
 * Marked up as a <figure> with a caption rather than hidden from assistive
 * technology. The alternative would be aria-hidden with a summary label, but
 * that withholds the content from screen reader users for no reason.
 *
 * The caption comes first in the accessibility tree, so the invented names and
 * clinical values are framed as demo data before they are read out. That
 * matters here specifically: unlabelled fake vitals and prescriptions could
 * reasonably be mistaken for a real record.
 *
 * Text inside the card uses paragraphs, not headings. The card depicts an
 * interface; its labels are not document structure, and marking them up as
 * headings both broke heading order (h1 straight to h3) and would drop someone
 * navigating by heading into the middle of a fake patient record.
 *
 * The browser chrome — traffic-light dots and the address chip — is decoration
 * and is hidden.
 */
export function PortalPreview({ content }: { content: PortalPreviewContent }) {
  return (
    <figure className={styles.figure}>
      <figcaption className={styles.caption}>
        <Badge tone="success">Demo data</Badge>
        <span className={styles.captionText}>{content.caption}</span>
      </figcaption>

      <div className={styles.card}>
        <div className={styles.chrome}>
          <div className={styles.dots} aria-hidden="true">
            <span className={styles.dotRose} />
            <span className={styles.dotAmber} />
            <span className={styles.dotEmerald} />
            <span className={styles.address}>patient-portal.novahealth.example</span>
          </div>
          <p className={styles.sync}>
            <span className={styles.syncDot} aria-hidden="true" />
            {content.syncLabel}
          </p>
        </div>

        <div className={styles.greeting}>
          <div>
            <p className={styles.patient}>Welcome back, {content.patientName}</p>
            <p className={styles.record}>{content.recordLine}</p>
          </div>
          <span className={styles.coverage}>{content.coverage}</span>
        </div>

        <div className={styles.panels}>
          <div className={styles.panelSky}>
            <p className={styles.panelLabel}>{content.appointment.label}</p>
            <p className={styles.panelTitle}>{content.appointment.clinician}</p>
            <p className={styles.panelDetail}>{content.appointment.detail}</p>
            <ul className={styles.tags}>
              {content.appointment.tags.map((tag) => (
                <li key={tag} className={styles.tag}>
                  {tag}
                </li>
              ))}
            </ul>
          </div>

          <div className={styles.panelEmerald}>
            <p className={styles.panelLabelSuccess}>{content.vitals.label}</p>
            <p className={styles.panelTitle}>{content.vitals.status}</p>
            <p className={styles.panelDetail}>{content.vitals.detail}</p>
            <p className={styles.panelNote}>{content.vitals.note}</p>
          </div>
        </div>

        <div>
          <p className={styles.listHeading}>Active prescriptions</p>
          <ul className={styles.prescriptions}>
            {content.prescriptions.map((prescription) => (
              <li key={prescription.id} className={styles.prescription}>
                <span className={styles.rx} aria-hidden="true">
                  Rx
                </span>
                <span className={styles.prescriptionText}>
                  <span className={styles.prescriptionName}>{prescription.name}</span>
                  <span className={styles.prescriptionDetail}>{prescription.detail}</span>
                </span>
                <span className={styles.prescriptionStatus}>{prescription.status}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </figure>
  );
}
