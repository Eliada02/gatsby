/**
 * Date formatting for the resource library.
 *
 * Intl.DateTimeFormat rather than a date library: it is built into every target
 * browser and Node, and this project needs one format.
 *
 * The formatter is created once at module scope. Constructing one per render is
 * a known performance trap, because each construction reloads locale data.
 *
 * timeZone is pinned to UTC deliberately. Publication dates are plain calendar
 * dates ("2026-07-22") with no time component; parsing one as a Date yields
 * midnight UTC, which formats as the previous day for anyone west of Greenwich.
 */
const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

export function formatPublishedDate(isoDate: string): string {
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) return isoDate;
  return dateFormatter.format(parsed);
}
