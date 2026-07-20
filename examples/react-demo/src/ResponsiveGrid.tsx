import type { CSSProperties } from 'react';

import { useFluidaLayout } from '@fluida/react';

export function ResponsiveGrid() {
  const layout = useFluidaLayout();

  const gridStyle: CSSProperties = {
    gridTemplateColumns: `repeat(${layout.grid.columns}, 1fr)`,
    maxWidth: layout.container.maxWidth,
    padding: layout.spacing.page,
    fontSize: `${layout.typography.scale}rem`,
  };

  const cellCount = layout.grid.columns * 2;
  const cells = Array.from({ length: cellCount }, (_, index) => index + 1);

  return (
    <section className="panel">
      <h2>Visual grid — driven entirely by useFluidaLayout()</h2>
      <div className="grid" style={gridStyle}>
        {cells.map((cellNumber) => (
          <div key={cellNumber} className="cell">
            {cellNumber}
          </div>
        ))}
      </div>
    </section>
  );
}