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
            Resize this window (or use your browser's device toolbar,
            then reload the page — see the note below). The banner
            above, the panel stacking, the grid's column count, and
            this heading's size all come from the same Fluida
            instance. The card backgrounds, borders, and colors around
            them are ordinary hand-written CSS — Fluida doesn't decide
            those, only the responsive layout values.
          </p>
          <p className="viewport-note">
            Fluida reacts to the browser's own viewport width, not to
            any individual element's size — there's no CSS container
            query or `ResizeObserver` here yet. Because the initial
            environment is read once and only updated by a real{' '}
            <code>resize</code> event, switching your browser's device
            emulation mode after this page has already loaded may not
            trigger an update on its own — reload the page after
            changing device or viewport size to guarantee a fresh
            read.
          </p>
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