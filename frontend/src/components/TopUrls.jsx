export default function TopUrls({ rows, topN = 10 }) {
  if (!rows.length) {
    return (
      <p className="meta">
        No URLs recorded for the current filters. Pass{" "}
        <code>?page=...</code> from your app fetch to populate this list.
      </p>
    );
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <p className="meta">Top {topN} URLs by entry count</p>
      <table>
        <thead>
          <tr>
            <th>URL</th>
            <th>Count</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.page_url}>
              <td>{row.page_url}</td>
              <td>{row.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
