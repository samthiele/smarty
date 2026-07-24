export default function TopReferrers({ rows, topN = 10 }) {
  if (!rows.length) {
    return (
      <p className="meta">
        No referrers recorded for the current filters. Pass{" "}
        <code>?referrer=...</code> from your app fetch to populate this list.
      </p>
    );
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <p className="meta">Top {topN} referrers by entry count</p>
      <table>
        <thead>
          <tr>
            <th>Referrer</th>
            <th>Count</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.referrer_url}>
              <td>{row.referrer_url}</td>
              <td>{row.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
