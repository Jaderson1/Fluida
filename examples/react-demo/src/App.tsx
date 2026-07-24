import {
  FluidaAdaptiveGrid,
  FluidaContainer,
  FluidaGrid,
  FluidaProvider,
  FluidaStack,
  FluidaText,
} from '@fluida/react';

import {
  BarChartPlaceholder,
  LineChartPlaceholder,
} from './ChartPlaceholder';

import { BreakpointBanner } from './BreakpointBanner';
import { LayoutPanel } from './LayoutPanel';
import { SnapshotPanel } from './SnapshotPanel';

export function App() {
  const cellCount = 8;
  const cells = Array.from({ length: cellCount }, (_, index) => index + 1);

  return (
    <FluidaProvider
      config={{
        container: {
          tiers: [
            { minimumWidth: 0, containerMaxWidth: 480 },
            { minimumWidth: 640, containerMaxWidth: 640 },
            { minimumWidth: 768, containerMaxWidth: 720 },
            { minimumWidth: 1024, containerMaxWidth: 960 },
            { minimumWidth: 1280, containerMaxWidth: 1140 },
            { minimumWidth: 1536, containerMaxWidth: 1320 },
            { minimumWidth: 1800, containerMaxWidth: 1600 },
            { minimumWidth: 2400, containerMaxWidth: 2000 },
          ],
        },
      }}
    >
      <BreakpointBanner />

      <FluidaContainer className="dashboard-shell">
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
              Fluida reacts to the browser&apos;s own viewport width, not to
              any individual element&apos;s size. The components above listen
              for <code>resize</code>, <code>visualViewport</code> resize and{' '}
              <code>orientationchange</code>. The adaptive grid below is
              different: it measures its own container with{' '}
              <code>ResizeObserver</code>.
            </p>
          </details>
        </header>

        <FluidaStack direction="row" stackOnMobile className="panels-row">
          <SnapshotPanel />
          <LayoutPanel />
        </FluidaStack>

        <section className="panel grid-section">
          <h2>&lt;FluidaGrid&gt; — column count from Core, automatically</h2>

          <FluidaGrid className="grid">
            {cells.map((cellNumber) => (
              <div key={cellNumber} className="cell">
                {cellNumber}
              </div>
            ))}
          </FluidaGrid>
        </section>

        <section className="panel adaptive-panel">
          <h2>
            &lt;FluidaAdaptiveGrid&gt; — measures its real container, not the
            viewport
          </h2>

          <p className="adaptive-note">
            These two charts are laid out by <code>FluidaAdaptiveGrid</code>,
            which measures this panel&apos;s own size with{' '}
            <code>ResizeObserver</code> and uses the{' '}
            <code>preserve-ratio</code> strategy to keep each chart at a 16:9
            shape.
          </p>

          <FluidaAdaptiveGrid
            itemCount={2}
            strategy="preserve-ratio"
            aspectRatio={16 / 9}
            gap={16}
            className="adaptive-grid"
          >
            <BarChartPlaceholder />
            <LineChartPlaceholder />
          </FluidaAdaptiveGrid>
        </section>
      </FluidaContainer>
    </FluidaProvider>
  );
}