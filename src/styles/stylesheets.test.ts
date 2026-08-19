import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Accessibility invariants that live in CSS.
 *
 * jsdom applies no stylesheets, so nothing a component test does can catch a
 * motion or reflow regression: an infinite animation that ignores
 * `prefers-reduced-motion`, or a grid column wide enough to force horizontal
 * scrolling, renders identically in the test environment and only appears on a
 * real device.
 *
 * These assertions read the stylesheets themselves, in the same spirit as
 * contrast.test.ts. They check rules that are easy to state and easy to forget,
 * not the whole cascade.
 */

const SRC = join(__dirname, '..');

function stylesheets(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) return stylesheets(path);
    return path.endsWith('.css') ? [path] : [];
  });
}

const FILES = stylesheets(SRC).map((path) => ({
  path: path.slice(SRC.length + 1).replace(/\\/g, '/'),
  css: readFileSync(path, 'utf8'),
}));

/** Strips comments so prose about a rule is never mistaken for the rule. */
const withoutComments = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '');

describe('stylesheets', () => {
  it('finds the stylesheets to check', () => {
    expect(FILES.length).toBeGreaterThan(10);
  });

  describe('reduced motion', () => {
    const global = FILES.find((file) => file.path === 'styles/global.css')!;

    it('neutralises animation and transition globally when reduced motion is requested', () => {
      const reduced = withoutComments(global.css).match(
        /@media \(prefers-reduced-motion: reduce\)\s*\{[\s\S]*?\n\}/,
      )?.[0];

      expect(reduced).toBeDefined();
      expect(reduced).toMatch(/animation-duration:\s*0\.01ms\s*!important/);
      expect(reduced).toMatch(/transition-duration:\s*0\.01ms\s*!important/);
      expect(reduced).toMatch(/scroll-behavior:\s*auto\s*!important/);
    });

    it('makes smooth scrolling conditional rather than global', () => {
      // Smooth scrolling triggers nausea for some users with vestibular
      // disorders, so it is opt-in through the media query rather than a
      // default that reduced motion then has to undo.
      const css = withoutComments(global.css);
      const optIn = css.match(
        /@media \(prefers-reduced-motion: no-preference\)\s*\{[\s\S]*?\n\}/,
      )?.[0];

      expect(optIn).toMatch(/scroll-behavior:\s*smooth/);
      // Every occurrence in the file is the one inside that block.
      expect(css.match(/scroll-behavior:\s*smooth/g)).toHaveLength(1);
    });

    it.each(
      FILES.filter((file) => /animation:[^;]*infinite/.test(withoutComments(file.css))).map(
        (file) => file.path,
      ),
    )('%s stops its looping animation under reduced motion', (path) => {
      // The global rule collapses durations to 0.01ms, which for an infinite
      // alternating animation leaves the element frozen at an arbitrary point
      // of its cycle. A looping animation has to be switched off by name.
      const file = FILES.find((entry) => entry.path === path)!;
      const css = withoutComments(file.css);

      expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)/);
      expect(css).toMatch(/animation:\s*none/);
    });
  });

  describe('reflow', () => {
    /** `repeat(auto-fill | auto-fit, minmax(<track>, ...))` declarations. */
    const AUTO_GRID = /repeat\(\s*auto-(?:fill|fit)\s*,\s*minmax\(\s*([^,]+?)\s*,/g;

    it('never demands a grid column wider than a 320px viewport can hold', () => {
      /*
       * WCAG 1.4.10 requires content to reflow at 320 CSS px without horizontal
       * scrolling. A container at that width offers 18rem of content once the
       * page gutter is removed, so a fixed minmax track at or above that is one
       * rounding error away from a horizontal scrollbar. Wrapping the track in
       * min(..., 100%) removes the risk entirely.
       */
      const offenders: string[] = [];

      for (const file of FILES) {
        const css = withoutComments(file.css);
        for (const [, track] of css.matchAll(AUTO_GRID)) {
          if (track === undefined) continue;
          if (track.startsWith('min(')) continue;

          const rem = /^([\d.]+)rem$/.exec(track);
          if (rem?.[1] && Number(rem[1]) > 17) {
            offenders.push(`${file.path}: minmax(${track}, …)`);
          }
        }
      }

      expect(offenders).toEqual([]);
    });

    it('sets no layout width in pixels', () => {
      // Pixel widths do not grow with the user's text size, so a 200% zoom
      // clips the content instead of reflowing it (WCAG 1.4.4).
      const offenders = FILES.filter((file) =>
        /(?:^|[\s;{])(?:inline-size|width|max-inline-size|max-width):\s*\d{2,}px/m.test(
          withoutComments(file.css),
        ),
      ).map((file) => file.path);

      expect(offenders).toEqual([]);
    });
  });

  describe('focus', () => {
    it('never removes an outline without replacing it', () => {
      /*
       * `outline: none` is the single most common way keyboard users are locked
       * out of an interface. It is allowed here only where the ring is drawn
       * somewhere more useful — the card that a stretched link covers, the
       * slider thumb rather than the whole row, the main landmark that the skip
       * link targets and that is not an interactive control at all.
       */
      const allowed = new Set([
        'components/layout/Layout.module.css',
        'components/resources/ResourceCard.module.css',
        'components/sections/ImpactCalculator.module.css',
      ]);

      const offenders = FILES.filter(
        (file) => /outline:\s*(none|0)/.test(withoutComments(file.css)) && !allowed.has(file.path),
      ).map((file) => file.path);

      expect(offenders).toEqual([]);
    });

    it('draws a replacement ring wherever the outline is suppressed on a control', () => {
      const card = FILES.find(
        (file) => file.path === 'components/resources/ResourceCard.module.css',
      )!;
      const slider = FILES.find(
        (file) => file.path === 'components/sections/ImpactCalculator.module.css',
      )!;

      expect(withoutComments(card.css)).toMatch(/\.card:focus-within\s*\{[^}]*outline:/);
      expect(withoutComments(slider.css)).toMatch(
        /\.slider:focus-visible::-webkit-slider-thumb\s*\{[^}]*outline:/,
      );
    });
  });
});
