import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Colour contrast is asserted against the token file itself.
 *
 * The usual failure mode for accessible colour is drift: a palette is checked
 * once in a design tool, then a token is nudged months later and nobody
 * re-measures. This test parses tokens.css, resolves the var() chains and
 * computes real WCAG 2.1 ratios, so lowering a colour's contrast fails CI.
 *
 * It also documents which threshold applies where, which is the part teams
 * usually get wrong: 4.5:1 for body text, 3:1 for large text and for non-text
 * elements such as focus rings and form borders.
 */

const TOKENS_CSS = readFileSync(join(__dirname, 'tokens.css'), 'utf8');

/** Extracts every `--nh-*: value;` declaration, ignoring comments. */
function parseTokens(css: string): Map<string, string> {
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const tokens = new Map<string, string>();
  const declaration = /(--nh-[a-z0-9-]+)\s*:\s*([^;]+);/gi;

  let match = declaration.exec(withoutComments);
  while (match !== null) {
    const [, name, value] = match;
    if (name && value) tokens.set(name, value.trim());
    match = declaration.exec(withoutComments);
  }
  return tokens;
}

const TOKENS = parseTokens(TOKENS_CSS);

/** Follows `var(--x)` indirection until a literal hex colour is reached. */
function resolveColor(name: string, seen = new Set<string>()): string {
  if (seen.has(name)) throw new Error(`Circular token reference at ${name}`);
  seen.add(name);

  const value = TOKENS.get(name);
  if (value === undefined) throw new Error(`Token ${name} is not defined in tokens.css`);

  const reference = /^var\((--nh-[a-z0-9-]+)\)$/i.exec(value);
  if (reference?.[1]) return resolveColor(reference[1], seen);

  if (!/^#[0-9a-f]{6}$/i.test(value)) {
    throw new Error(`Token ${name} resolves to "${value}", which is not a 6-digit hex colour`);
  }
  return value;
}

/** WCAG 2.1 relative luminance. */
function luminance(hex: string): number {
  const channel = (eightBit: number): number => {
    const v = eightBit / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  const r = channel(parseInt(hex.slice(1, 3), 16));
  const g = channel(parseInt(hex.slice(3, 5), 16));
  const b = channel(parseInt(hex.slice(5, 7), 16));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(foreground: string, background: string): number {
  const [lighter, darker] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (lighter! + 0.05) / (darker! + 0.05);
}

/** 4.5:1 body text, 3:1 large text (>=24px, or >=18.66px bold) and non-text. */
const AA_NORMAL = 4.5;
const AA_LARGE_OR_NON_TEXT = 3;

const COMBINATIONS: ReadonlyArray<{
  what: string;
  fg: string;
  bg: string;
  min: number;
}> = [
  // Light surfaces
  { what: 'body text on canvas', fg: '--nh-color-text', bg: '--nh-color-canvas', min: AA_NORMAL },
  { what: 'body text on white', fg: '--nh-color-text', bg: '--nh-color-surface', min: AA_NORMAL },
  {
    what: 'muted text on canvas',
    fg: '--nh-color-text-muted',
    bg: '--nh-color-canvas',
    min: AA_NORMAL,
  },
  {
    what: 'subtle text on canvas',
    fg: '--nh-color-text-subtle',
    bg: '--nh-color-canvas',
    min: AA_NORMAL,
  },
  {
    what: 'muted text on subtle surface',
    fg: '--nh-color-text-muted',
    bg: '--nh-color-surface-subtle',
    min: AA_NORMAL,
  },

  // Accent
  {
    what: 'accent text on white',
    fg: '--nh-color-accent-text',
    bg: '--nh-color-surface',
    min: AA_NORMAL,
  },
  {
    what: 'accent display text on white (large only)',
    fg: '--nh-color-accent-display',
    bg: '--nh-color-surface',
    min: AA_LARGE_OR_NON_TEXT,
  },
  {
    what: 'accent badge text on accent badge background',
    fg: '--nh-color-accent-soft-text',
    bg: '--nh-color-accent-soft-bg',
    min: AA_NORMAL,
  },
  {
    what: 'success badge text on success badge background',
    fg: '--nh-color-success-soft-text',
    bg: '--nh-color-success-soft-bg',
    min: AA_NORMAL,
  },

  // Dark surfaces
  {
    what: 'inverse text on dark surface',
    fg: '--nh-color-text-inverse',
    bg: '--nh-color-surface-dark',
    min: AA_NORMAL,
  },
  {
    what: 'inverse muted text on dark surface',
    fg: '--nh-color-text-inverse-muted',
    bg: '--nh-color-surface-dark',
    min: AA_NORMAL,
  },
  {
    what: 'inverse subtle text on dark surface',
    fg: '--nh-color-text-inverse-subtle',
    bg: '--nh-color-surface-dark',
    min: AA_NORMAL,
  },
  {
    what: 'inverse text on darker surface',
    fg: '--nh-color-text-inverse',
    bg: '--nh-color-surface-darker',
    min: AA_NORMAL,
  },
  {
    what: 'accent text on dark surface',
    fg: '--nh-color-accent-inverse',
    bg: '--nh-color-surface-dark',
    min: AA_NORMAL,
  },
  {
    what: 'success text on dark surface',
    fg: '--nh-color-success-inverse',
    bg: '--nh-color-surface-dark',
    min: AA_NORMAL,
  },

  // Solid buttons
  {
    what: 'primary button label',
    fg: '--nh-color-text-inverse',
    bg: '--nh-color-action',
    min: AA_NORMAL,
  },
  {
    what: 'accent button label',
    fg: '--nh-color-text-inverse',
    bg: '--nh-color-accent-solid',
    min: AA_NORMAL,
  },

  // Non-text: WCAG 1.4.11
  { what: 'focus ring on canvas', fg: '--nh-color-focus', bg: '--nh-color-canvas', min: 3 },
  { what: 'focus ring on white', fg: '--nh-color-focus', bg: '--nh-color-surface', min: 3 },
  {
    what: 'inverse focus ring on dark surface',
    fg: '--nh-color-focus-inverse',
    bg: '--nh-color-surface-dark',
    min: 3,
  },
  {
    what: 'control border on white',
    fg: '--nh-color-border-control',
    bg: '--nh-color-surface',
    min: 3,
  },
  {
    what: 'control border on canvas',
    fg: '--nh-color-border-control',
    bg: '--nh-color-canvas',
    min: 3,
  },
  {
    what: 'interactive border on white',
    fg: '--nh-color-border-interactive',
    bg: '--nh-color-surface',
    min: 3,
  },
];

describe('design token contrast', () => {
  it('parses the token file', () => {
    expect(TOKENS.size).toBeGreaterThan(50);
  });

  it('resolves every semantic colour token to a real hex value', () => {
    // Catches typos in var() chains, which would otherwise render as an
    // inherited or transparent colour rather than throwing.
    const semanticColors = [...TOKENS.keys()].filter((name) => name.startsWith('--nh-color-'));

    expect(semanticColors.length).toBeGreaterThan(20);
    for (const token of semanticColors) {
      expect(() => resolveColor(token)).not.toThrow();
    }
  });

  describe.each(COMBINATIONS)('$what', ({ fg, bg, min }) => {
    it(`meets ${min}:1`, () => {
      const ratio = contrastRatio(resolveColor(fg), resolveColor(bg));

      // Reported to 2dp so a failure message states the actual measurement.
      expect(Number(ratio.toFixed(2))).toBeGreaterThanOrEqual(min);
    });
  });

  it('keeps the decorative grey out of the text tokens', () => {
    // slate-400 is 2.56:1 on white. The design reference used it for metadata
    // text; this asserts it never becomes a text colour here by accident.
    const decorative = resolveColor('--nh-color-decorative');
    const textTokens = [
      '--nh-color-text',
      '--nh-color-text-muted',
      '--nh-color-text-subtle',
      '--nh-color-accent-text',
    ];

    for (const token of textTokens) {
      expect(resolveColor(token)).not.toBe(decorative);
    }
  });
});
