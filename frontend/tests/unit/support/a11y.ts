import { expect } from "vitest";
import { axe } from "vitest-axe";
import type AxeCore from "axe-core";

/**
 * Shared accessibility assertion helper (constitution VI: WCAG 2.1 AA floor, checked
 * with axe-core in CI) reused by component tests across this feature.
 */
export async function expectNoA11yViolations(container: Element): Promise<void> {
  const results: AxeCore.AxeResults = await axe(container);
  expect(results.violations).toHaveLength(0);
}
