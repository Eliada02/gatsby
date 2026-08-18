import '@testing-library/jest-dom';
import { toHaveNoViolations } from 'jest-axe';

// Adds `expect(...).toHaveNoViolations()` so accessibility assertions read like
// any other expectation rather than living in a separate tool.
expect.extend(toHaveNoViolations);

/**
 * jsdom implements no navigation, so activating an anchor with a real href
 * prints "Not implemented: navigation (except hash changes)".
 *
 * This is a jsdom limitation rather than a defect: the gatsby mock renders real
 * anchors on purpose, because a stub element would make the role, accessible
 * name and keyboard assertions meaningless. The filter is deliberately narrow —
 * every other console.error still surfaces, so genuine React warnings are not
 * hidden.
 */
const NAVIGATION_NOT_IMPLEMENTED = 'Not implemented: navigation';
const originalConsoleError = console.error.bind(console);

beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
    const [first] = args;
    const text = first instanceof Error ? first.message : String(first);
    if (text.includes(NAVIGATION_NOT_IMPLEMENTED)) return;
    originalConsoleError(...args);
  });
});

afterAll(() => {
  jest.restoreAllMocks();
});
