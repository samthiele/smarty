import { useMemo, useState } from "react";
import { canonicalAppName } from "../appGroups.js";

const COLUMNS = [
  { key: "count", label: "Count" },
  { key: "app_name", label: "App" },
  { key: "country", label: "Country" },
  { key: "log_date", label: "Day" },
  { key: "referrer_url", label: "Referrer" },
];

function truncate(value, maxLength = 48) {
  if (!value) {
    return "—";
  }
  return value.length > maxLength ? `${value.slice(0, maxLength)}…` : value;
}

function rowKey(row) {
  return [
    row.app_name,
    row.country,
    row.log_date,
    row.page_url,
    row.referrer_url,
  ].join("|");
}

function compareValues(a, b, column) {
  if (column === "count") {
    return a - b;
  }

  const left = String(a ?? "");
  const right = String(b ?? "");
  return left.localeCompare(right, undefined, { sensitivity: "base" });
}

function sortIndicator(direction) {
  return direction === "asc" ? " ↑" : " ↓";
}

export default function LogTable({ rows }) {
  const [tooltip, setTooltip] = useState(null);
  const [sort, setSort] = useState({ column: "log_date", direction: "desc" });

  const sortedRows = useMemo(() => {
    const next = [...rows];
    const { column, direction } = sort;
    const factor = direction === "asc" ? 1 : -1;

    next.sort((left, right) => {
      const result = compareValues(left[column], right[column], column);
      return result * factor;
    });

    return next;
  }, [rows, sort]);

  if (!rows.length) {
    return <p className="meta">No log entries match the current filters.</p>;
  }

  function showTooltip(event, label) {
    setTooltip({
      x: event.clientX,
      y: event.clientY,
      label,
    });
  }

  function handleSort(column) {
    setSort((current) => {
      if (current.column === column) {
        return {
          column,
          direction: current.direction === "asc" ? "desc" : "asc",
        };
      }

      const defaultDesc = column === "count" || column === "log_date";
      return { column, direction: defaultDesc ? "desc" : "asc" };
    });
  }

  return (
    <>
      <p className="meta">Page hits grouped by time and place</p>
      <div style={{ overflowX: "auto" }}>
        <table>
          <thead>
            <tr>
              {COLUMNS.map(({ key, label }) => (
                <th key={key}>
                  <button
                    type="button"
                    className="sortable-header"
                    onClick={() => handleSort(key)}
                    aria-sort={
                      sort.column === key
                        ? sort.direction === "asc"
                          ? "ascending"
                          : "descending"
                        : "none"
                    }
                  >
                    {label}
                    {sort.column === key ? sortIndicator(sort.direction) : null}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row) => (
              <tr key={rowKey(row)}>
                <td>{row.count}</td>
                <td
                  onMouseEnter={
                    row.page_url
                      ? (event) => showTooltip(event, row.page_url)
                      : undefined
                  }
                  onMouseMove={
                    row.page_url
                      ? (event) => showTooltip(event, row.page_url)
                      : undefined
                  }
                  onMouseLeave={row.page_url ? () => setTooltip(null) : undefined}
                >
                  {canonicalAppName(row.app_name)}
                </td>
                <td>{row.country}</td>
                <td>{row.log_date ?? "—"}</td>
                <td
                  className={row.referrer_url ? "referrer-cell" : undefined}
                  onMouseEnter={
                    row.referrer_url
                      ? (event) => showTooltip(event, row.referrer_url)
                      : undefined
                  }
                  onMouseMove={
                    row.referrer_url
                      ? (event) => showTooltip(event, row.referrer_url)
                      : undefined
                  }
                  onMouseLeave={
                    row.referrer_url ? () => setTooltip(null) : undefined
                  }
                >
                  {truncate(row.referrer_url)}
                </td>
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
