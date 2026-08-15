/**
 * Simple, reproducible microbenchmarks — not a performance promise,
 * just a way to catch an absurd regression (an accidental O(n²), a
 * loop that shouldn't be there) before it ships. Not wired into CI:
 * timing numbers are inherently noisy across machines, and a
 * benchmark that fails CI on unrelated hardware variance is worse
 * than no benchmark at all.
 *
 * Run: npx tsx packages/core/benchmark/computeLayout.bench.ts
 */
import { computeContainerLayout } from '../src/engine/computeContainerLayout';
import { computeLayout } from '../src/engine/computeLayout';

function timeIt(label: string, iterations: number, fn: () => void): void {
  // One untimed pass first, so JIT warm-up doesn't inflate the first
  // real measurement.
  fn();

  const start = performance.now();
  for (let i = 0; i < iterations; i += 1) {
    fn();
  }
  const elapsedMs = performance.now() - start;
  const perCallUs = (elapsedMs / iterations) * 1000;

  console.log(
    `${label.padEnd(46)} ${iterations.toString().padStart(8)} calls  ${elapsedMs.toFixed(1).padStart(9)}ms total  ${perCallUs.toFixed(2).padStart(8)}µs/call`,
  );
}

console.log('computeContainerLayout — varying itemCount, fixed 1920x1080 container\n');

for (const itemCount of [4, 20, 100, 500]) {
  timeIt(`itemCount=${itemCount}, strategy=fit`, 2000, () => {
    computeContainerLayout(1920, 1080, { itemCount, strategy: 'fit', gap: 16 });
  });
}

console.log('\ncomputeContainerLayout — varying container width, fixed itemCount=20\n');

for (const width of [320, 1920, 3840, 10000]) {
  timeIt(`width=${width}, strategy=balanced`, 2000, () => {
    computeContainerLayout(width, 1080, { itemCount: 20, strategy: 'balanced', gap: 16 });
  });
}

console.log('\ncomputeContainerLayout — every strategy, itemCount=100\n');

for (const strategy of ['fit', 'fill', 'balanced', 'preserve-ratio'] as const) {
  timeIt(`strategy=${strategy}`, 2000, () => {
    computeContainerLayout(1920, 1080, {
      itemCount: 100,
      strategy,
      gap: 16,
      aspectRatio: strategy === 'preserve-ratio' ? 16 / 9 : undefined,
    });
  });
}

console.log('\ncomputeLayout (viewport-based, includes the height-aware bonus)\n');

for (const [label, width, height] of [
  ['mobile', 390, 844],
  ['1080p', 1920, 1080],
  ['4K', 3840, 2160],
] as const) {
  timeIt(`${label} (${width}x${height})`, 5000, () => {
    computeLayout(width, height);
  });
}
