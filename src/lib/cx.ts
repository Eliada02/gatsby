/**
 * Joins class names, dropping falsy values so conditional classes read as
 * `condition && styles.thing`.
 *
 * This is the entirety of what clsx/classnames provide for our usage, so a
 * dependency is not warranted.
 */
export function cx(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(' ');
}
