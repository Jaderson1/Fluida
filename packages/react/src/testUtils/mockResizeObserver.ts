export interface MockResizeObserverEntry {
  readonly contentRect: { readonly width: number; readonly height: number };
}

export class MockResizeObserver {
  static instances: MockResizeObserver[] = [];

  readonly callback: (entries: MockResizeObserverEntry[]) => void;
  observedElement: Element | null = null;
  disconnected = false;

  constructor(callback: (entries: MockResizeObserverEntry[]) => void) {
    this.callback = callback;
    MockResizeObserver.instances.push(this);
  }

  observe(element: Element): void {
    this.observedElement = element;
  }

  unobserve(): void {
    this.observedElement = null;
  }

  disconnect(): void {
    this.disconnected = true;
  }

  trigger(width: number, height: number): void {
    this.callback([{ contentRect: { width, height } }]);
  }
}

export function installMockResizeObserver(): void {
  MockResizeObserver.instances = [];
  (globalThis as { ResizeObserver?: unknown }).ResizeObserver = MockResizeObserver;
}

export function removeMockResizeObserver(): void {
  MockResizeObserver.instances = [];
  delete (globalThis as { ResizeObserver?: unknown }).ResizeObserver;
}

/** The observer instance still connected to a given element, if any — the one a real ResizeObserver.observe(element) call would currently be tracking. */
export function getLiveObserverFor(element: Element): MockResizeObserver | undefined {
  return MockResizeObserver.instances.find(
    (instance) => instance.observedElement === element && !instance.disconnected,
  );
}