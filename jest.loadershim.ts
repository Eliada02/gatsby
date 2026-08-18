/**
 * Gatsby's Link component calls into the client-side resource loader, which
 * does not exist in jsdom. Stubbing it keeps navigation components renderable
 * in tests without pulling in Gatsby's runtime.
 */
(globalThis as unknown as Record<string, unknown>).___loader = {
  enqueue: jest.fn(),
  hovering: jest.fn(),
};
