import { cleanup, render } from '@testing-library/react';
import { StrictMode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createFluida } from '@fluida/core';

import { FluidaProvider } from './FluidaProvider';

vi.mock('@fluida/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@fluida/core')>();

  return {
    ...actual,
    createFluida: vi.fn(actual.createFluida),
  };
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
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

  it('destroys the Core instance it created when unmounted', () => {
    const { unmount } = render(
      <FluidaProvider>
        <span>content</span>
      </FluidaProvider>,
    );

    const mockedCreateFluida = vi.mocked(createFluida);
    const createdInstance = mockedCreateFluida.mock.results[0]?.value;

    expect(createdInstance).toBeDefined();

    const destroySpy = vi.spyOn(createdInstance!, 'destroy');

    unmount();

    expect(destroySpy).toHaveBeenCalledTimes(1);
  });

  it('creates one instance per Provider, never a shared singleton', () => {
    const first = render(
      <FluidaProvider>
        <span>a</span>
      </FluidaProvider>,
    );

    first.unmount();

    render(
      <FluidaProvider>
        <span>b</span>
      </FluidaProvider>,
    );

    const mockedCreateFluida = vi.mocked(createFluida);

    expect(mockedCreateFluida).toHaveBeenCalledTimes(2);
  });

  it('survives React StrictMode double-invocation without throwing', () => {
    const { getByText, unmount } = render(
      <StrictMode>
        <FluidaProvider>
          <span>strict mode content</span>
        </FluidaProvider>
      </StrictMode>,
    );

    expect(getByText('strict mode content')).toBeTruthy();
    expect(() => unmount()).not.toThrow();
  });
});