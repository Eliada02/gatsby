import type { GatsbySSR } from 'gatsby';

/**
 * Initialises the dataLayer and, when a container is configured, loads Google
 * Tag Manager.
 *
 * The dataLayer array is created before the container script so events fired
 * during page initialisation are queued rather than lost. That ordering is the
 * usual cause of a missing first page_view.
 *
 * No container ID is set in this repository, so no third-party script is
 * loaded. The site is GTM-ready rather than GTM-connected: loading someone
 * else's container would add a request, a cookie and a privacy obligation for
 * a demonstration project. Setting GATSBY_GTM_ID switches it on.
 */
const GTM_ID = process.env.GATSBY_GTM_ID;

export const onRenderBody: GatsbySSR['onRenderBody'] = ({
  setHeadComponents,
  setPreBodyComponents,
}) => {
  const head = [
    <script
      key="nh-datalayer-init"
      dangerouslySetInnerHTML={{ __html: 'window.dataLayer = window.dataLayer || [];' }}
    />,
  ];

  if (GTM_ID) {
    head.push(
      <script
        key="nh-gtm"
        dangerouslySetInnerHTML={{
          __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${GTM_ID}');`,
        }}
      />,
    );

    // The noscript iframe is part of the standard snippet. It is title-less in
    // Google's version, which fails axe; the title makes it describable.
    setPreBodyComponents([
      <noscript key="nh-gtm-noscript">
        <iframe
          src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
          height="0"
          width="0"
          style={{ display: 'none', visibility: 'hidden' }}
          title="Google Tag Manager"
        />
      </noscript>,
    ]);
  }

  setHeadComponents(head);
};
