import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import type { ContainerLayoutOptions, ContainerLayoutResult } from './types';
import { computeContainerLayout } from './computeContainerLayout';
import { FluidaConfigError } from '../resolveFluidaConfig';

/**
 * Loads spec/conformance/layout-cases.json — shared cases checked by
 * both this TypeScript engine and fluida-core's Python port, so the
 * two stay behaviorally aligned. Read at runtime via fs, not a static
 * `import`: the file lives outside this package's rootDir ("src"),
 * which a module-level JSON import of a file outside rootDir risks
 * breaking under tsup/tsc.
 */

interface ConformanceCase {
  readonly id: string;
  readonly description: string;
  readonly covers: readonly string[];
  readonly input: {
    readonly containerWidth: number | string;
    readonly containerHeight: number | string | null;
    readonly options: ContainerLayoutOptions;
  };
  readonly expected: ContainerLayoutResult;
}

interface InvalidConformanceCase {
  readonly id: string;
  readonly description?: string;
  readonly covers: readonly string[];
  readonly input: {
    readonly containerWidth: number | string;
    readonly containerHeight: number | string | null;
    readonly options: ContainerLayoutOptions;
  };
  readonly expectedError: {
    readonly category: 'config';
  };
}

interface ConformanceFile {
  readonly description: string;
  readonly tolerance: {
    readonly relative: number;
    readonly absoluteMinimum: number;
  };
  readonly cases: readonly ConformanceCase[];
  readonly invalidCases: readonly InvalidConformanceCase[];
}

const conformanceFilePath = fileURLToPath(
  new URL('../../../../spec/conformance/layout-cases.json', import.meta.url),
);

const conformanceFile = JSON.parse(
  readFileSync(conformanceFilePath, 'utf-8'),
) as ConformanceFile;

/**
 * JSON has no representation for NaN/Infinity/-Infinity, so the
 * conformance file spells them as the strings "NaN"/"Infinity"/
 * "-Infinity" wherever an invalid case needs one — this turns those
 * specific sentinel strings back into the real values before calling
 * computeContainerLayout with them. Any other value (a real number,
 * or a string that isn't one of these three) passes through
 * unchanged — that's this function correctly not touching strings
 * that are meant to be tested as strings.
 */
function resolveSentinel(value: number | string | null): number | null {
  if (value === 'NaN') return NaN;
  if (value === 'Infinity') return Infinity;
  if (value === '-Infinity') return -Infinity;
  return value as number | null;
}

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
  it('loads at least 15 valid cases and several invalid ones', () => {
    expect(conformanceFile.cases.length).toBeGreaterThanOrEqual(15);
    expect(conformanceFile.invalidCases.length).toBeGreaterThanOrEqual(5);
  });

  const { tolerance, cases, invalidCases } = conformanceFile;

  it.each(cases)('$id — $description', (testCase) => {
    const result = computeContainerLayout(
      resolveSentinel(testCase.input.containerWidth) as number,
      testCase.input.containerHeight === null
        ? undefined
        : (resolveSentinel(testCase.input.containerHeight) as number),
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

  it.each(invalidCases)('$id (invalid)', (testCase) => {
    expect(() =>
      computeContainerLayout(
        resolveSentinel(testCase.input.containerWidth) as number,
        testCase.input.containerHeight === null
          ? undefined
          : (resolveSentinel(testCase.input.containerHeight) as number),
        testCase.input.options,
      ),
    ).toThrow(FluidaConfigError);
  });
});