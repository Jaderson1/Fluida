import {
  FluidaContainer,
  FluidaGrid,
  FluidaProvider,
  FluidaStack,
} from '@fluida/react';

import { LayoutPanel } from './LayoutPanel';
import { SnapshotPanel } from './SnapshotPanel';

export function App() {
  const cellCount = 8;
  const cells = Array.from({ length: cellCount }, (_, index) => index + 1);

  return (
    <FluidaProvider>
      <FluidaContainer>
        <header>
          <h1>Fluida — live demo</h1>
          <p>
            Resize this window. Every layout decision below — the
            container's width and padding, the panels stacking on
            mobile, and the grid's column count — comes automatically
            from Fluida. Nothing here reimplements the calculations.
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