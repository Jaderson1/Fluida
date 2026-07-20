import { useFluidaSnapshot } from '@fluida/react';

import { useRenderCount } from './useRenderCount';

export function SnapshotPanel() {
  const snapshot = useFluidaSnapshot();
  const renderCount = useRenderCount();

  return (
    <section className="panel">
      <h2>
        useFluidaSnapshot() <span className="count">renders: {renderCount}</span>
      </h2>
      <dl>
        <dt>Width</dt>
        <dd>{snapshot.width}px</dd>
        <dt>Height</dt>
        <dd>{snapshot.height}px</dd>
        <dt>Orientation</dt>
        <dd>{snapshot.orientation}</dd>
        <dt>Pixel ratio</dt>
        <dd>{snapshot.pixelRatio}</dd>
      </dl>
    </section>
  );
}