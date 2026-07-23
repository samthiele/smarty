import { useState } from "react";

export default function LogTable({ rows }) {
  const [tooltip, setTooltip] = useState(null);

  if (!rows.length) {
    return <p className="meta">No log entries match the current filters.</p>;
  }

  return (
    <>
      <div style={{ overflowX: "auto" }}>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>App</th>
              <th>Country</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.id}</td>
                <td
                  onMouseEnter={
                    row.page_url
                      ? (event) => {
                          setTooltip({
                            x: event.clientX,
                            y: event.clientY,
                            label: row.page_url,
                          });
                        }
                      : undefined
                  }
                  onMouseMove={
                    row.page_url
                      ? (event) => {
                          setTooltip({
                            x: event.clientX,
                            y: event.clientY,
                            label: row.page_url,
                          });
                        }
                      : undefined
                  }
                  onMouseLeave={row.page_url ? () => setTooltip(null) : undefined}
                >
                  {row.app_name}
                </td>
                <td>{row.country}</td>
                <td>{row.created_at ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {tooltip ? (
        <div
          className="tooltip tooltip--url"
          style={{ left: tooltip.x + 12, top: tooltip.y + 12 }}
        >
          {tooltip.label}
        </div>
      ) : null}
    </>
  );
}
