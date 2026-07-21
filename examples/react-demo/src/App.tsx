import {
  FluidaContainer,
  FluidaGrid,
  FluidaProvider,
  FluidaStack,
  FluidaText,
} from '@fluida/react';

import { BreakpointBanner } from './BreakpointBanner';
import { LayoutPanel } from './LayoutPanel';
import { SnapshotPanel } from './SnapshotPanel';

export function App() {
  const cellCount = 8;
  const cells = Array.from({ length: cellCount }, (_, index) => index + 1);

  return (
    <FluidaProvider>
      <BreakpointBanner />

      <FluidaContainer>
        <header>
          <FluidaText as="h1">Fluida — live demo</FluidaText>
          <p>
            Resize the window — the banner, panels, grid, and this
            heading all react automatically. Card colors and borders
            are ordinary CSS; Fluida only drives the layout values.
          </p>
          <details className="viewport-note">
            <summary>How this reacts to viewport changes</summary>
            <p>
              Fluida reacts to the browser's own viewport width, not to
              any individual element's size — there's no CSS container
              query or <code>ResizeObserver</code> here yet. It listens
              for <code>resize</code>, <code>visualViewport</code>{' '}
              resize, and <code>orientationchange</code> events; in the
              rare case none of those fire for a change you make (some
              DevTools device-emulation transitions), reloading the
              page forces a fresh read.
            </p>
          </details>
        </header>

        <FluidaStack direction="row" stackOnMobile>
          <SnapshotPanel />
          <LayoutPanel />
        </FluidaStack>

        <section className="panel">
          <h2>&lt;FluidaGrid&gt; — column count from Core, automatically</h2>
          <FluidaGrid className="grid">
            {cells.map((cellNumber) => (
              <div key={cellNumber} className="cell">
                {cellNumber}
              </div>
            ))}
          </FluidaGrid>
        </section>
      </FluidaContainer>
    </FluidaProvider>
  );
}