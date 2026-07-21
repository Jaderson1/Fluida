import { useFluidaLayout } from '@fluida/react';

const BREAKPOINT_COLORS: Record<string, string> = {
  mobile: '#d1495b',
  tablet: '#edae49',
  desktop: '#2e933c',
};

export function BreakpointBanner() {
  const layout = useFluidaLayout();
  const color = BREAKPOINT_COLORS[layout.breakpoint] ?? '#3b4ccf';

  return (
    <div
      className="breakpoint-banner"
      style={{ backgroundColor: color }}
      data-testid="breakpoint-banner"
    >
      {layout.breakpoint.toUpperCase()} · {layout.grid.columns} columns
    </div>
  );
}