import { useFluidaLayout } from '@fluida/react';

import { useRenderCount } from './useRenderCount';

export function LayoutPanel() {
  const layout = useFluidaLayout();
  const renderCount = useRenderCount();

  return (
    <section className="panel">
      <h2>
        useFluidaLayout() <span className="count">renders: {renderCount}</span>
      </h2>
      <dl>
        <dt>Breakpoint</dt>
        <dd>{layout.breakpoint}</dd>
        <dt>Grid columns</dt>
        <dd>{layout.grid.columns}</dd>
        <dt>Page padding</dt>
        <dd>{layout.spacing.page.toFixed(1)}px</dd>
        <dt>Typography scale</dt>
        <dd>{layout.typography.scale.toFixed(3)}</dd>
        <dt>Container max-width</dt>
        <dd>{layout.container.maxWidth}px</dd>
      </dl>
    </section>
  );
}