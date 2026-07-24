import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createFluida } from '@fluida/core';

import { FluidaProvider } from './FluidaProvider';
import { useFluidaLayout } from './useFluidaLayout';

// This file covers the Provider's basic contract — rendering,
// instance ownership, and cleanup — outside of React Strict Mode's
// development-only replay, which has its own dedicated file
// (FluidaProvider.strictmode.test.tsx) precisely because that
// scenario needed its own careful, separate treatment. Nothing here
// duplicates those tests; this is the plain, non-replayed case.
vi.mock('@fluida/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@fluida/core')>();
  return {
    ...actual,
    createFluida: vi.fn(actual.createFluida),
  };
});

function LayoutDebug() {
  const layout = useFluidaLayout();
  return <span data-testid="breakpoint">{layout.breakpoint}</span>;
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.useRealTimers();
});

describe('FluidaProvider', () => {
  it('renders its children', () => {
    const { getByText } = render(
      <FluidaProvider>
        <span>hello from Fluida</span>
      </FluidaProvider>,
    );

    expect(getByText('hello from Fluida')).toBeTruthy();
  });

  it('renders children that read from it through a hook', () => {
    const { getByTestId } = render(
      <FluidaProvider>
        <LayoutDebug />
      </FluidaProvider>,
    );

    expect(getByTestId('breakpoint').textContent).toBeTruthy();
  });

  it('creates exactly one Core instance for a single Provider (outside Strict Mode)', () => {
    render(
      <FluidaProvider>
        <span>content</span>
      </FluidaProvider>,
    );

    const mockedCreateFluida = createFluida as unknown as ReturnType<typeof vi.fn>;
    expect(mockedCreateFluida).toHaveBeenCalledTimes(1);
  });

  it('gives two separate Providers two separate, independent instances — never a shared singleton', () => {
    const { unmount: unmountFirst } = render(
      <FluidaProvider>
        <span>a</span>
      </FluidaProvider>,
    );

    const { unmount: unmountSecond } = render(
      <FluidaProvider>
        <span>b</span>
      </FluidaProvider>,
    );

    const mockedCreateFluida = createFluida as unknown as ReturnType<typeof vi.fn>;
    expect(mockedCreateFluida).toHaveBeenCalledTimes(2);

    const firstInstance = mockedCreateFluida.mock.results[0]?.value;
    const secondInstance = mockedCreateFluida.mock.results[1]?.value;
    expect(firstInstance).not.toBe(secondInstance);

    unmountFirst();
    unmountSecond();
  });

  it('destroys its own Core instance on a genuine unmount, after the deferred delay', () => {
    vi.useFakeTimers();

    const { unmount } = render(
      <FluidaProvider>
        <span>content</span>
      </FluidaProvider>,
    );

    const mockedCreateFluida = createFluida as unknown as ReturnType<typeof vi.fn>;
    const createdInstance = mockedCreateFluida.mock.results[0]?.value;
    const destroySpy = vi.spyOn(createdInstance, 'destroy');

    unmount();
    expect(destroySpy).not.toHaveBeenCalled();

    vi.runAllTimers();
    expect(destroySpy).toHaveBeenCalledTimes(1);
  });

  it('unmounting one Provider does not destroy a sibling Provider still mounted', () => {
    vi.useFakeTimers();

    const first = render(
      <FluidaProvider>
        <span>a</span>
      </FluidaProvider>,
    );
    render(
      <FluidaProvider>
        <span>b</span>
      </FluidaProvider>,
    );

    const mockedCreateFluida = createFluida as unknown as ReturnType<typeof vi.fn>;
    const firstInstance = mockedCreateFluida.mock.results[0]?.value;
    const secondInstance = mockedCreateFluida.mock.results[1]?.value;
    const firstDestroySpy = vi.spyOn(firstInstance, 'destroy');
    const secondDestroySpy = vi.spyOn(secondInstance, 'destroy');

    first.unmount();
    vi.runAllTimers();

    expect(firstDestroySpy).toHaveBeenCalledTimes(1);
    expect(secondDestroySpy).not.toHaveBeenCalled();
  });
});