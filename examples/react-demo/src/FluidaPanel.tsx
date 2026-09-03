import { useFluida } from '@fluida/react';

import { useRenderCount } from './useRenderCount';

export function FluidaPanel() {
  const { viewport, display } = useFluida();
  const renderCount = useRenderCount();

  return (
    <section className="panel">
      <h2>
        useFluida() <span className="count">renders: {renderCount}</span>
      </h2>
      <dl>
        <dt>Width</dt>
        <dd>{viewport.width}px</dd>
        <dt>Display</dt>
        <dd>{display}</dd>
      </dl>
      <p>
        Renders every resize, same as useFluidaSnapshot() above — it includes
        viewport. Use useFluidaLayout() alone to render only when layout
        actually changes.
      </p>
    </section>
  );
}
