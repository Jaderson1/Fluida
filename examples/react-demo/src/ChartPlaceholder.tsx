const BAR_HEIGHTS = [40, 70, 55, 90, 35, 60];

export function BarChartPlaceholder() {
  return (
    <div className="chart-placeholder">
      <span className="chart-label">Monthly signups</span>
      <div className="bar-chart">
        {BAR_HEIGHTS.map((height, index) => (
          <div
            key={index}
            className="bar-chart-bar"
            style={{ height: `${height}%` }}
          />
        ))}
      </div>
    </div>
  );
}

const LINE_POINTS = '0,80 20,55 40,60 60,30 80,42 100,10';

export function LineChartPlaceholder() {
  return (
    <div className="chart-placeholder">
      <span className="chart-label">Response time (ms)</span>
      <svg
        className="line-chart"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <polyline points={LINE_POINTS} fill="none" stroke="currentColor" strokeWidth="3" />
      </svg>
    </div>
  );
}