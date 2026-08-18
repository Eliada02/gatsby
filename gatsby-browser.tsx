/**
 * Global styles are imported here rather than in a layout component so they load
 * once for the whole app and are extracted into a single stylesheet at build
 * time, instead of being duplicated per page.
 */
// Self-hosted variable font (weights 200-800 in one file). Imported before the
// global stylesheet so the @font-face rules are registered first.
import '@fontsource-variable/plus-jakarta-sans/wght.css';

import './src/styles/global.css';
