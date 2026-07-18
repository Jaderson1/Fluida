// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createFluida } from './createFluida';
import type { FluidaInstance } from './types';

function setViewport(width: number, height: number, pixelRatio = 1): void {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: height });
  Object.defineProperty(window, 'devicePixelRatio', { configurable: true, value: pixelRatio });
}

function fireResize(): void {
  window.dispatchEvent(new Event('resize'));
}

let instance: FluidaInstance | undefined;

beforeEach(() => {
  setViewport(800, 600, 1);
});

afterEach(() => {
  instance?.destroy();
  instance = undefined;
  vi.restoreAllMocks();
});

describe('createFluida (browser mode)', () => {
  it('reads the initial snapshot from window.innerWidth, innerHeight and devicePixelRatio', () => {
    setViewport(1024, 768, 2);
    instance = createFluida();

    expect(instance.getSnapshot()).toEqual({
      width: 1024,
      height: 768,
      orientation: 'landscape',
      pixelRatio: 2,
    });
  });

  it('computes orientation from the initial width and height', () => {
    setViewport(400, 900, 1);
    instance = createFluida();

    expect(instance.getSnapshot().orientation).toBe('portrait');
  });

  it('notifies a subscribed listener after a real resize event', () => {
    instance = createFluida();
    const listener = vi.fn();
    instance.subscribe(listener);

    setViewport(1200, 800, 1);
    fireResize();

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('gives getSnapshot() a new reference after a real environment change', () => {
    instance = createFluida();
    instance.subscribe(() => {});

    const before = instance.getSnapshot();
    setViewport(1200, 800, 1);
    fireResize();

    expect(instance.getSnapshot()).not.toBe(before);
    expect(instance.getSnapshot().width).toBe(1200);
  });

  it('gives getLayout() a new reference when the width change affects the Engine', () => {
    setViewport(390, 800, 1); // mobile
    instance = createFluida();
    instance.subscribe(() => {});

    const before = instance.getLayout();
    setViewport(1200, 800, 1); // desktop
    fireResize();

    expect(instance.getLayout()).not.toBe(before);
    expect(instance.getLayout().breakpoint).toBe('desktop');
  });

  it('keeps getLayout() stable when only a field irrelevant to the Engine changes', () => {
    instance = createFluida(); // 800x600 from beforeEach
    instance.subscribe(() => {});

    const beforeSnapshot = instance.getSnapshot();
    const beforeLayout = instance.getLayout();

    // Same width and height — only pixelRatio changes, which
    // computeLayout does not read at all today.
    setViewport(800, 600, 2);
    fireResize();

    expect(instance.getSnapshot()).not.toBe(beforeSnapshot);
    expect(instance.getSnapshot().pixelRatio).toBe(2);
    expect(instance.getLayout()).toBe(beforeLayout);
  });

  it('stops notifying after unsubscribe', () => {
    instance = createFluida();
    const listener = vi.fn();
    const unsubscribe = instance.subscribe(listener);

    unsubscribe();
    setViewport(1200, 800, 1);
    fireResize();

    expect(listener).not.toHaveBeenCalled();
  });

  it('destroy() removes the resize listener and stops the store from updating', () => {
    instance = createFluida();
    instance.subscribe(() => {});

    const beforeSnapshot = instance.getSnapshot();
    instance.destroy();

    setViewport(1200, 800, 1);
    fireResize();

    expect(instance.getSnapshot()).toBe(beforeSnapshot);
  });

  it('destroy() is idempotent after actually attaching a resize listener', () => {
    instance = createFluida();
    instance.subscribe(() => {});

    expect(() => {
      instance?.destroy();
      instance?.destroy();
    }).not.toThrow();
  });

  it('does not register a resize listener before the first subscription', () => {
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener');

    instance = createFluida();
    expect(addEventListenerSpy).not.toHaveBeenCalledWith('resize', expect.any(Function));

    instance.subscribe(() => {});
    expect(addEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
  });
});