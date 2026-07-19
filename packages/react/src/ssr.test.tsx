// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';

import { FluidaProvider } from './FluidaProvider';
import { useFluidaLayout } from './useFluidaLayout';
import { useFluidaSnapshot } from './useFluidaSnapshot';

function Debug() {
  const snapshot = useFluidaSnapshot();
  const layout = useFluidaLayout();

  return (
    <div data-testid="debug">
      {JSON.stringify({ snapshot, layout })}
    </div>
  );
}

function extractPayload(html: string): {
  snapshot: { width: number; height: number; orientation: string; pixelRatio: number };
  layout: { breakpoint: string; spacing: { page: number } };
} {
  const match = html.match(/<div data-testid="debug">(.*?)<\/div>/);
  const rawJson = (match?.[1] ?? '').replace(/&quot;/g, '"');
  return JSON.parse(rawJson);
}

describe('FluidaProvider (server-side rendering)', () => {
  it('renders using the server fallback when there is no window', () => {
    expect(typeof window).toBe('undefined');

    const html = renderToString(
      <FluidaProvider>
        <Debug />
      </FluidaProvider>,
    );

    const payload = extractPayload(html);

    expect(payload.snapshot).toEqual({
      width: 0,
      height: 0,
      orientation: 'portrait',
      pixelRatio: 1,
    });
    expect(payload.layout.breakpoint).toBe('mobile');
  });

  it("reflects the instance's own config in the server-rendered output", () => {
    const html = renderToString(
      <FluidaProvider config={{ spacing: { minimumPadding: 4 } }}>
        <Debug />
      </FluidaProvider>,
    );

    const payload = extractPayload(html);

    expect(payload.layout.spacing.page).toBe(4);
  });
});