/**
 * The site's social card.
 *
 * One image for the whole site, drawn as SVG and rasterised to PNG at build
 * time by the sharp instance gatsby-plugin-sharp already installs. Facebook,
 * LinkedIn and X will not render an SVG, so a bitmap has to exist somewhere —
 * generating it from source beats committing a binary that silently goes stale
 * when the wording changes.
 *
 * A per-page card was considered and rejected: it would mean one rasterisation
 * per route for a site whose pages differ by a heading, and nothing about a
 * shared card is misleading.
 *
 * This module is pure markup so it can be tested without rasterising anything.
 * gatsby-node.ts renders it in onPostBuild.
 */

/** 1.91:1, the aspect ratio every major platform crops to. */
export const OG_IMAGE_WIDTH = 1200;
export const OG_IMAGE_HEIGHT = 630;

/** Written to the root of public/, so its URL is stable across builds. */
export const OG_IMAGE_FILENAME = 'og-image.png';

/*
 * Palette copied from src/styles/tokens.css. An SVG rendered outside the
 * browser cannot read CSS custom properties, so these are the one place in the
 * codebase where token values are repeated — the card is checked visually and
 * changes roughly never.
 */
const COLOURS = {
  background: '#060b17', // --nh-navy-950
  panel: '#0f172a', // --nh-slate-900
  text: '#ffffff', // --nh-color-text-inverse
  muted: '#cbd5e1', // --nh-slate-300
  subtle: '#94a3b8', // --nh-slate-400
  accent: '#7dd3fc', // --nh-sky-300, the on-dark accent
  mark: '#10b981', // --nh-emerald-500
};

export interface OgImageContent {
  /** Brand wordmark, top left. */
  siteName: string;
  /** The headline, supplied as pre-wrapped lines: no text layout at build time. */
  headlineLines: readonly string[];
  /** One supporting sentence under the headline. */
  summary: string;
  /** The standing disclaimer. Always drawn — a card is shared out of context. */
  footnote: string;
}

/** XML-escapes text so an ampersand in the copy cannot break the document. */
function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Returns the card as SVG markup.
 *
 * The font stack is generic on purpose. The brand webfont is not installed on
 * the machine doing the rasterising — locally or in CI — so naming it would
 * produce a silent fallback that differs between environments. A generic
 * grotesque renders identically everywhere and the card is typographic
 * furniture, not the site.
 */
export function buildOgImageSvg(content: OgImageContent): string {
  const { siteName, headlineLines, summary, footnote } = content;

  const headline = headlineLines
    .map((line, index) => `<tspan x="80" dy="${index === 0 ? 0 : 84}">${escapeXml(line)}</tspan>`)
    .join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${OG_IMAGE_WIDTH}" height="${OG_IMAGE_HEIGHT}" viewBox="0 0 ${OG_IMAGE_WIDTH} ${OG_IMAGE_HEIGHT}" role="img" aria-label="${escapeXml(siteName)}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${COLOURS.background}"/>
      <stop offset="100%" stop-color="${COLOURS.panel}"/>
    </linearGradient>
  </defs>

  <rect width="${OG_IMAGE_WIDTH}" height="${OG_IMAGE_HEIGHT}" fill="url(#bg)"/>
  <rect x="0" y="0" width="${OG_IMAGE_WIDTH}" height="8" fill="${COLOURS.accent}"/>

  <g transform="translate(80, 84)">
    <path d="M0 -14 V14 M-14 0 H14" stroke="${COLOURS.accent}" stroke-width="3" stroke-linecap="round"/>
    <circle cx="0" cy="0" r="4.5" fill="${COLOURS.mark}"/>
    <text x="34" y="8" font-family="Arial, Helvetica, sans-serif" font-size="26" font-weight="700" fill="${COLOURS.text}" letter-spacing="0.5">${escapeXml(siteName)}</text>
  </g>

  <text font-family="Arial, Helvetica, sans-serif" font-size="72" font-weight="700" fill="${COLOURS.text}" y="266" letter-spacing="-1.5">${headline}</text>

  <text x="80" y="${266 + (headlineLines.length - 1) * 84 + 78}" font-family="Arial, Helvetica, sans-serif" font-size="30" fill="${COLOURS.muted}">${escapeXml(summary)}</text>

  <text x="80" y="${OG_IMAGE_HEIGHT - 64}" font-family="Arial, Helvetica, sans-serif" font-size="22" fill="${COLOURS.subtle}">${escapeXml(footnote)}</text>
</svg>`;
}
