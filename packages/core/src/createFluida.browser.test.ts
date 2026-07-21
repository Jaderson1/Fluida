// @vitest-environment jsdom

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import { createFluida } from './createFluida';
import type { FluidaInstance } from './types';

function setViewport(
  width: number,
  height: number,
  pixelRatio = 1,
): void {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    value: width,
  });

  Object.defineProperty(window, 'innerHeight', {
    configurable: true,
    value: height,
  });

  Object.defineProperty(window, 'devicePixelRatio', {
    configurable: true,
    value: pixelRatio,
  });
}

function fireResize(): void {
  window.dispatchEvent(new Event('resize'));
}

function fireOrientationChange(): void {
  window.dispatchEvent(new Event('orientationchange'));
}

function installVisualViewportMock(): EventTarget {
  const mock = new EventTarget();

  Object.defineProperty(window, 'visualViewport', {
    configurable: true,
    value: mock,
  });

  return mock;
}

function removeVisualViewportMock(): void {
  Object.defineProperty(window, 'visualViewport', {
    configurable: true,
    value: undefined,
  });
}

let instance: FluidaInstance | undefined;

beforeEach(() => {
  setViewport(800, 600, 1);
});

afterEach(() => {
  instance?.destroy();
  instance = undefined;

  removeVisualViewportMock();
  vi.useRealTimers();
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
    setViewport(390, 800, 1);
    instance = createFluida();
    instance.subscribe(() => {});

    const before = instance.getLayout();

    setViewport(1200, 800, 1);
    fireResize();

    expect(instance.getLayout()).not.toBe(before);
    expect(instance.getLayout().breakpoint).toBe('desktop');
  });

  it('updates container.maxWidth via a real resize event', () => {
    setViewport(320, 600, 1);
    instance = createFluida();
    instance.subscribe(() => {});

    expect(instance.getLayout().container.maxWidth).toBe(480);

    setViewport(1024, 700, 1);
    fireResize();

    expect(instance.getLayout().container.maxWidth).toBe(960);
  });

  it('returns a fixed server fallback for getServerSnapshot(), regardless of the real viewport', () => {
    setViewport(1920, 1080, 3);
    instance = createFluida();

    expect(instance.getServerSnapshot()).toEqual({
      width: 0,
      height: 0,
      orientation: 'portrait',
      pixelRatio: 1,
    });
  });

  it('getServerSnapshot() stays the same reference across a real resize event', () => {
    instance = createFluida();
    instance.subscribe(() => {});

    const before = instance.getServerSnapshot();

    setViewport(1200, 800, 1);
    fireResize();

    expect(instance.getServerSnapshot()).toBe(before);
  });

  it('getServerLayout() stays the same reference across a real resize event', () => {
    instance = createFluida();
    instance.subscribe(() => {});

    const before = instance.getServerLayout();

    setViewport(1200, 800, 1);
    fireResize();

    expect(instance.getServerLayout()).toBe(before);
  });

  it("getServerLayout() reflects this instance's own config even in browser mode", () => {
    instance = createFluida({
      spacing: {
        minimumPadding: 4,
        maximumPadding: 8,
      },
    });

    expect(instance.getServerLayout().spacing.page).toBe(4);
  });

  it('keeps getLayout() stable when only a field irrelevant to the Engine changes', () => {
    instance = createFluida();
    instance.subscribe(() => {});

    const beforeSnapshot = instance.getSnapshot();
    const beforeLayout = instance.getLayout();

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

    expect(addEventListenerSpy).not.toHaveBeenCalledWith(
      'resize',
      expect.any(Function),
    );

    instance.subscribe(() => {});

    expect(addEventListenerSpy).toHaveBeenCalledWith(
      'resize',
      expect.any(Function),
    );
  });

  it('updates the snapshot from a visualViewport resize event, independent of window resize', () => {
    const mockViewport = installVisualViewportMock();

    instance = createFluida();
    instance.subscribe(() => {});

    const before = instance.getSnapshot();

    setViewport(390, 800, 1);
    mockViewport.dispatchEvent(new Event('resize'));

    expect(instance.getSnapshot()).not.toBe(before);
    expect(instance.getSnapshot().width).toBe(390);
  });

  it('updates the snapshot from an orientationchange event', () => {
    instance = createFluida();
    instance.subscribe(() => {});

    const before = instance.getSnapshot();

    setViewport(768, 1024, 1);
    fireOrientationChange();

    expect(instance.getSnapshot()).not.toBe(before);
    expect(instance.getSnapshot().width).toBe(768);
  });

  it('does not attach to visualViewport when it is unavailable', () => {
    expect(window.visualViewport).toBeUndefined();

    expect(() => {
      instance = createFluida();
      instance.subscribe(() => {});
    }).not.toThrow();
  });

  it('notifies once for one underlying change, even when resize, visualViewport resize, and orientationchange all fire for it', () => {
    const mockViewport = installVisualViewportMock();

    instance = createFluida();

    const listener = vi.fn();
    instance.subscribe(listener);

    setViewport(1200, 800, 1);

    fireResize();
    mockViewport.dispatchEvent(new Event('resize'));
    fireOrientationChange();

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('does not notify when an event fires but nothing in the environment actually changed', () => {
    const mockViewport = installVisualViewportMock();

    instance = createFluida();

    const listener = vi.fn();
    instance.subscribe(listener);

    fireResize();
    mockViewport.dispatchEvent(new Event('resize'));
    fireOrientationChange();

    expect(listener).not.toHaveBeenCalled();
  });

  it('destroy() removes the resize, orientationchange, and visualViewport listeners', () => {
    const mockViewport = installVisualViewportMock();

    const windowRemoveSpy = vi.spyOn(window, 'removeEventListener');
    const viewportRemoveSpy = vi.spyOn(
      mockViewport,
      'removeEventListener',
    );

    instance = createFluida();
    instance.subscribe(() => {});

    instance.destroy();

    expect(windowRemoveSpy).toHaveBeenCalledWith(
      'resize',
      expect.any(Function),
    );

    expect(windowRemoveSpy).toHaveBeenCalledWith(
      'orientationchange',
      expect.any(Function),
    );

    expect(viewportRemoveSpy).toHaveBeenCalledWith(
      'resize',
      expect.any(Function),
    );
  });

  it('after destroy(), none of the three signals updates the store any further', () => {
    const mockViewport = installVisualViewportMock();

    instance = createFluida();
    instance.subscribe(() => {});

    instance.destroy();

    const afterDestroy = instance.getSnapshot();

    setViewport(1536, 900, 1);

    fireResize();
    mockViewport.dispatchEvent(new Event('resize'));
    fireOrientationChange();

    expect(instance.getSnapshot()).toBe(afterDestroy);
  });

  it('catches drift between construction and the first subscriber with a single deferred re-read', async () => {
    vi.useFakeTimers();

    instance = createFluida();

    const constructionTimeSnapshot = instance.getSnapshot();

    setViewport(414, 800, 1);

    instance.subscribe(() => {});

    expect(instance.getSnapshot()).toBe(
      constructionTimeSnapshot,
    );

    await vi.runAllTimersAsync();

    expect(instance.getSnapshot()).not.toBe(
      constructionTimeSnapshot,
    );

    expect(instance.getSnapshot().width).toBe(414);
  });

  it('the deferred re-read runs only once, not on every subscribe() call', async () => {
    vi.useFakeTimers();

    const setTimeoutSpy = vi.spyOn(
      globalThis,
      'setTimeout',
    );

    instance = createFluida();

    instance.subscribe(() => {});
    instance.subscribe(() => {});
    instance.subscribe(() => {});

    await vi.runAllTimersAsync();

    const deferredReadCalls = setTimeoutSpy.mock.calls.filter(
      (call) => call[1] === 0,
    );

    expect(deferredReadCalls).toHaveLength(1);
  });
});