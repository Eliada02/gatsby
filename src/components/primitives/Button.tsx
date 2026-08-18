import { Link } from 'gatsby';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cx } from '@/lib/cx';
import { VisuallyHidden } from './VisuallyHidden';
import styles from './Button.module.css';

export type ButtonVariant =
  'primary' | 'accent' | 'secondary' | 'ghost' | 'inverse' | 'inverseOutline';

export type ButtonSize = 'sm' | 'md' | 'lg';

interface SharedProps {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  shape?: 'rounded' | 'pill';
  fullWidth?: boolean;
  /** Appends the trailing arrow used on primary calls to action. */
  withArrow?: boolean;
  className?: string;
}

type StyleProps = Pick<SharedProps, 'variant' | 'size' | 'shape' | 'fullWidth' | 'className'>;

function buildClassName({
  variant = 'primary',
  size = 'md',
  shape = 'rounded',
  fullWidth,
  className,
}: StyleProps): string {
  return cx(
    styles.base,
    styles[variant],
    styles[size],
    styles[shape],
    fullWidth && styles.fullWidth,
    className,
  );
}

/** Decorative: the arrow repeats the label's meaning, so it is hidden from AT. */
function Arrow() {
  return (
    <span aria-hidden="true" className={styles.arrow}>
      &rarr;
    </span>
  );
}

type ButtonProps = SharedProps & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'>;

/**
 * An action: submits, opens, toggles, filters.
 *
 * `type` defaults to "button". HTML defaults it to "submit", so a button placed
 * inside a form submits it by accident — a bug that only shows up once the
 * component is reused inside a form.
 *
 * For navigation use ButtonLink. Keeping them separate means the correct
 * element is chosen at the call site rather than inferred from props, and a
 * link never ends up as a <button> that screen reader users cannot recognise.
 */
export function Button({
  children,
  variant,
  size,
  shape,
  fullWidth,
  withArrow,
  className,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buildClassName({ variant, size, shape, fullWidth, className })}
      {...rest}
    >
      {children}
      {withArrow && <Arrow />}
    </button>
  );
}

interface ButtonLinkProps extends SharedProps {
  to: string;
  /** Side effects on activation, e.g. closing a menu. Navigation still happens. */
  onClick?: () => void;
}

/** Matches a protocol-qualified URL, a protocol-relative URL, or mailto/tel. */
const EXTERNAL_HREF = /^([a-z][a-z0-9+.-]*:|\/\/)/i;

/**
 * Navigation styled as a button.
 *
 * Internal destinations use Gatsby's Link so routing stays client-side and
 * prefetching works; external ones fall back to a plain anchor.
 *
 * External links open in a new tab with rel="noopener noreferrer" and announce
 * that fact to screen reader users, because an unannounced context switch
 * leaves them unsure why the back button stopped working.
 */
export function ButtonLink({
  children,
  to,
  variant,
  size,
  shape,
  fullWidth,
  withArrow,
  className,
  onClick,
}: ButtonLinkProps) {
  const classes = buildClassName({ variant, size, shape, fullWidth, className });

  if (EXTERNAL_HREF.test(to)) {
    const opensInNewTab = /^https?:/i.test(to);

    return (
      <a
        href={to}
        className={classes}
        onClick={onClick}
        {...(opensInNewTab ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      >
        {children}
        {opensInNewTab && <VisuallyHidden> (opens in a new tab)</VisuallyHidden>}
        {withArrow && <Arrow />}
      </a>
    );
  }

  return (
    <Link to={to} className={classes} onClick={onClick}>
      {children}
      {withArrow && <Arrow />}
    </Link>
  );
}
