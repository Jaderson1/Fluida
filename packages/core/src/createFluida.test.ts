import { describe, expect, it } from 'vitest';

import { createFluida } from './createFluida';

// Runs under Vitest's default Node environment, where `window` doesn't
// exist — createFluida() always resolves to the server EnvironmentReader
// here. Anything depending on a real `resize` event needs jsdom, and is
// left for a later browser integration test suite.

describe('createFluida (server/Node mode)', () => {
  it('returns the server fallback snapshot', () => {
    const instance = createFluida();
    expect(instance.getSnapshot()).toEqual({
      width: 0,
      height: 0,
      orientation: 'portrait',
      pixelRatio: 1,
    });
    instance.destroy();
  });

  it('getSnapshot() returns a stable reference across repeated calls', () => {
    const instance = createFluida();
    expect(instance.getSnapshot()).toBe(instance.getSnapshot());
    instance.destroy();
  });

  it('getServerSnapshot() returns a stable reference and matches getSnapshot() by value in Node', () => {
    const instance = createFluida();
    expect(instance.getServerSnapshot()).toBe(instance.getServerSnapshot());
    expect(instance.getServerSnapshot()).toEqual(instance.getSnapshot());
    instance.destroy();
  });

  it('getLayout() returns a stable reference across repeated calls', () => {
    const instance = createFluida();
    expect(instance.getLayout()).toBe(instance.getLayout());
    instance.destroy();
  });

  it('getLayout() reflects the default mobile layout at the server fallback width', () => {
    const instance = createFluida();
    const layout = instance.getLayout();
    expect(layout.breakpoint).toBe('mobile');
    expect(layout.grid.columns).toBe(4);
    instance.destroy();
  });

  it('getServerLayout() returns a stable reference across repeated calls', () => {
    const instance = createFluida();
    expect(instance.getServerLayout()).toBe(instance.getServerLayout());
    instance.destroy();
  });

  it("getServerLayout() reflects this instance's own configuration, not a shared default", () => {
    const defaultInstance = createFluida();
    const customInstance = createFluida({
      spacing: { minimumPadding: 4, maximumPadding: 8 },
    });

    expect(defaultInstance.getServerLayout().spacing.page).toBe(16);
    expect(customInstance.getServerLayout().spacing.page).toBe(4);

    defaultInstance.destroy();
    customInstance.destroy();
  });

  it('subscribe() returns an unsubscribe function that can be called without throwing', () => {
    const instance = createFluida();
    const unsubscribe = instance.subscribe(() => {});
    expect(typeof unsubscribe).toBe('function');
    expect(() => unsubscribe()).not.toThrow();
    instance.destroy();
  });

  it('independent subscriptions can each be unsubscribed without affecting the other', () => {
    const instance = createFluida();
    const unsubscribeA = instance.subscribe(() => {});
    const unsubscribeB = instance.subscribe(() => {});
    expect(() => unsubscribeA()).not.toThrow();
    expect(() => unsubscribeB()).not.toThrow();
    instance.destroy();
  });

  it('subscribe() after destroy() does not throw and returns a no-op', () => {
    const instance = createFluida();
    instance.destroy();
    const unsubscribe = instance.subscribe(() => {});
    expect(typeof unsubscribe).toBe('function');
    expect(() => unsubscribe()).not.toThrow();
  });

  it('destroy() is idempotent', () => {
    const instance = createFluida();
    expect(() => {
      instance.destroy();
      instance.destroy();
    }).not.toThrow();
  });

  it('getSnapshot() and getLayout() keep working after destroy()', () => {
    const instance = createFluida();
    instance.destroy();
    expect(() => instance.getSnapshot()).not.toThrow();
    expect(() => instance.getLayout()).not.toThrow();
    expect(instance.getLayout().breakpoint).toBe('mobile');
  });
});