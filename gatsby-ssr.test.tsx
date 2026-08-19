import type { GatsbySSR } from 'gatsby';
import { onRenderBody } from './gatsby-ssr';

/**
 * The document shell.
 *
 * `<html lang>` cannot be set from a page: Gatsby's Head API renders into
 * <head> and never touches the html element, so the attribute has to come from
 * here. It is asserted rather than assumed because nothing in the rendered
 * React tree would reveal its absence — the page looks identical, and a screen
 * reader reads English prose with whatever voice the user's synthesiser
 * defaults to (WCAG 3.1.1, level A).
 */

type RenderBody = NonNullable<GatsbySSR['onRenderBody']>;
type RenderBodyArgs = Parameters<RenderBody>[0];
type PluginOptions = Parameters<RenderBody>[1];

function renderShell() {
  const setHtmlAttributes = jest.fn();
  const setHeadComponents = jest.fn();
  const setPreBodyComponents = jest.fn();

  onRenderBody?.(
    {
      setHtmlAttributes,
      setHeadComponents,
      setPreBodyComponents,
    } as unknown as RenderBodyArgs,
    { plugins: [] } as PluginOptions,
  );

  return { setHtmlAttributes, setHeadComponents, setPreBodyComponents };
}

describe('onRenderBody', () => {
  it('declares the document language', () => {
    const { setHtmlAttributes } = renderShell();

    expect(setHtmlAttributes).toHaveBeenCalledWith({ lang: 'en' });
  });

  it('creates the dataLayer before anything can push to it', () => {
    const { setHeadComponents } = renderShell();

    const head = setHeadComponents.mock.calls[0]?.[0] as Array<{ key: string }>;
    const scripts = head.filter((node) => node.key.startsWith('nh-datalayer'));
    expect(scripts).toHaveLength(1);
  });

  it('declares the site icons, so no page requests a favicon that does not exist', () => {
    // Without these the browser asks for /favicon.ico unprompted, gets a 404,
    // and logs an error on every page view.
    const { setHeadComponents } = renderShell();
    const head = setHeadComponents.mock.calls[0]?.[0] as Array<{
      key: string;
      props: Record<string, string>;
    }>;

    const icons = head.filter((node) => node.props?.rel?.includes('icon'));
    expect(icons.map((icon) => icon.props.href)).toEqual([
      '/favicon.svg',
      '/favicon-32.png',
      '/apple-touch-icon.png',
    ]);
    expect(icons[0]?.props.type).toBe('image/svg+xml');
  });

  it('loads no third-party script when no container is configured', () => {
    // No GATSBY_GTM_ID in this repository: no request, no cookie, and nothing
    // for a consent gate to have to hold back.
    const { setHeadComponents, setPreBodyComponents } = renderShell();

    const head = setHeadComponents.mock.calls[0]?.[0] as Array<{ key: string }>;
    expect(head.some((node) => node.key === 'nh-gtm')).toBe(false);
    expect(setPreBodyComponents).not.toHaveBeenCalled();
  });
});
