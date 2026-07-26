import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import type { ContainerLayoutOptions, ContainerLayoutResult } from './types';
import { computeContainerLayout } from './computeContainerLayout';

/**
 * Loads spec/conformance/layout-cases.json — a shared, language-neutral
 * set of computeContainerLayout inputs and expected outputs, meant to
 * eventually be checked against non-TypeScript implementations too
 * (Dash's Python side, or others, later). Read at runtime via fs,
 * deliberately not a static `import` of the JSON file: the file lives
 * outside this package's rootDir ("src"), and a module-level import of
 * something outside rootDir risks tsup/tsc build issues. A plain
 * runtime file read has no such constraint and needs no tsconfig
 * change — resolveJsonModule is already enabled here, but doesn't
 * apply to a file that's never imported as a module in the first
 * place.
 */

interface ConformanceCase {
  readonly id: string;
  readonly description: string;
  readonly covers: readonly string[];
  readonly input: {
    readonly containerWidth: number;
    readonly containerHeight: number;
    readonly options: ContainerLayoutOptions;
  };
  readonly expected: ContainerLayoutResult;
}

interface ConformanceFile {
  readonly description: string;
  readonly tolerance: {
    readonly relative: number;
    readonly absoluteMinimum: number;
  };
  readonly cases: readonly ConformanceCase[];
}

const conformanceFilePath = fileURLToPath(
  new URL('../../../../spec/conformance/layout-cases.json', import.meta.url),
);

const conformanceFile = JSON.parse(
  readFileSync(conformanceFilePath, 'utf-8'),
) as ConformanceFile;

/**
 * A relative tolerance with an absolute floor: allows up to
 * max(absoluteMinimum, |expected| * relative) of difference. The
 * floor matters specifically for expected values of exactly 0 (the
 * not-yet-fitting fallback's cellWidth/cellHeight) — a purely
 * relative tolerance would demand bit-exact equality there, which
 * floating-point arithmetic across different language runtimes
 * shouldn't be expected to guarantee.
 */
function isWithinTolerance(
  actual: number,
  expected: number,
  relative: number,
  absoluteMinimum: number,
): boolean {
  const allowedDifference = Math.max(absoluteMinimum, Math.abs(expected) * relative);
  return Math.abs(actual - expected) <= allowedDifference;
}

describe('layout conformance cases (spec/conformance/layout-cases.json)', () => {
  it('loads at least 15 cases', () => {
    expect(conformanceFile.cases.length).toBeGreaterThanOrEqual(15);
  });

  const { tolerance, cases } = conformanceFile;

  it.each(cases)('$id — $description', (testCase) => {
    const result = computeContainerLayout(
      testCase.input.containerWidth,
      testCase.input.containerHeight,
      testCase.input.options,
    );

    // columns and rows: exact equality, per the conformance file's
    // own stated rule — these are discrete counts, not measurements.
    expect(result.columns).toBe(testCase.expected.columns);
    expect(result.rows).toBe(testCase.expected.rows);

    // cellWidth and cellHeight: relative tolerance with an absolute
    // floor, per the conformance file's own stated tolerance.
    expect(
      isWithinTolerance(
        result.cellWidth,
        testCase.expected.cellWidth,
        tolerance.relative,
        tolerance.absoluteMinimum,
      ),
    ).toBe(true);

    expect(
      isWithinTolerance(
        result.cellHeight,
        testCase.expected.cellHeight,
        tolerance.relative,
        tolerance.absoluteMinimum,
      ),
    ).toBe(true);
  });
});