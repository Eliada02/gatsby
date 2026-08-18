import '@testing-library/jest-dom';
import { toHaveNoViolations } from 'jest-axe';

// Adds `expect(...).toHaveNoViolations()` so accessibility assertions read like
// any other expectation rather than living in a separate tool.
expect.extend(toHaveNoViolations);
