import { PageHero } from '@/components/patterns/PageHero';

/** Page hero for the library. Copy lives here; the treatment is shared. */
export function ResourcesHero() {
  return (
    <PageHero
      eyebrow="Resource library"
      heading="Insights for a more connected healthcare experience"
      summary="Practical writing on patient experience, interoperability, clinical operations and the security decisions that sit underneath them."
    />
  );
}
