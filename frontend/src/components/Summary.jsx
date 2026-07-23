const PERIODS = [
  { key: "week", label: "Last 7 days" },
  { key: "month", label: "Last 30 days" },
  { key: "year", label: "Last 365 days" },
  { key: "allTime", label: "All time" },
];

export default function Summary({ counts, appLabel }) {
  return (
    <div>
      <p className="meta">Entry counts for {appLabel}</p>
      <div className="summary-grid">
        {PERIODS.map(({ key, label }) => (
          <div key={key} className="summary-card">
            <div className="summary-value">{counts[key] ?? 0}</div>
            <div className="summary-label">{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
