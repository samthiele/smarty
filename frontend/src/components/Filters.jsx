export default function Filters({ apps, filters, onChange, onSubmit, loading }) {
  return (
    <form
      className="filters"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <label>
        App
        <select
          value={filters.app}
          onChange={(event) => onChange({ app: event.target.value })}
        >
          <option value="all">All apps</option>
          {apps.map((app) => (
            <option key={app} value={app}>
              {app}
            </option>
          ))}
        </select>
      </label>

      <label>
        From
        <input
          type="date"
          value={filters.from}
          onChange={(event) => onChange({ from: event.target.value })}
        />
      </label>

      <label>
        To
        <input
          type="date"
          value={filters.to}
          onChange={(event) => onChange({ to: event.target.value })}
        />
      </label>

      <label>
        Row limit
        <input
          type="number"
          min="1"
          max="1000"
          value={filters.limit}
          onChange={(event) => onChange({ limit: event.target.value })}
        />
      </label>

      <button type="submit" disabled={loading}>
        {loading ? "Loading..." : "Apply filters"}
      </button>
    </form>
  );
}

export function createInitialFilters() {
  return {
    app: "all",
    from: "",
    to: "",
    limit: "100",
  };
}

export function toQueryFilters(filters) {
  return {
    app: filters.app === "all" ? undefined : filters.app,
    from: filters.from || undefined,
    to: filters.to || undefined,
    limit: filters.limit || undefined,
  };
}

export function toAppFilter(filters) {
  return {
    app: filters.app === "all" ? undefined : filters.app,
  };
}

export function appFilterLabel(filters) {
  return filters.app === "all" ? "all apps" : `app "${filters.app}"`;
}
