import { useCallback, useEffect, useState } from "react";
import {
  getApps,
  getLogs,
  getStats,
  getSummary,
  getTopReferrers,
  getTopUrls,
} from "./api.js";
import Filters, {
  appFilterLabel,
  createInitialFilters,
  toAppFilter,
  toQueryFilters,
} from "./components/Filters.jsx";
import LogTable from "./components/LogTable.jsx";
import Summary from "./components/Summary.jsx";
import TopReferrers from "./components/TopReferrers.jsx";
import TopUrls from "./components/TopUrls.jsx";
import SmartyLogo from "./components/SmartyLogo.jsx";
import WorldMap from "./components/WorldMap.jsx";

const EMPTY_SUMMARY = { week: 0, month: 0, year: 0, allTime: 0 };
const TOP_LIST_COUNT = 10;

export default function App() {
  const [filters, setFilters] = useState(createInitialFilters);
  const [apps, setApps] = useState([]);
  const [rows, setRows] = useState([]);
  const [stats, setStats] = useState({ byCountry: {}, total: 0 });
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [topUrls, setTopUrls] = useState([]);
  const [topReferrers, setTopReferrers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadData = useCallback(async (nextFilters) => {
    setLoading(true);
    setError("");

    try {
      const query = toQueryFilters(nextFilters);
      const appQuery = toAppFilter(nextFilters);
      const [
        logsResponse,
        statsResponse,
        summaryResponse,
        topUrlsResponse,
        topReferrersResponse,
      ] = await Promise.all([
        getLogs(query),
        getStats(query),
        getSummary(appQuery),
        getTopUrls(query, TOP_LIST_COUNT),
        getTopReferrers(query, TOP_LIST_COUNT),
      ]);

      setRows(logsResponse.rows);
      setStats(statsResponse);
      setSummary(summaryResponse);
      setTopUrls(topUrlsResponse.rows);
      setTopReferrers(topReferrersResponse.rows);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    getApps()
      .then((response) => setApps(response.apps))
      .catch((err) => setError(err.message));

    loadData(filters);
  }, [loadData]);

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-brand">
          <SmartyLogo size={44} />
          <div>
            <h1>Smarty</h1>
          </div>
        </div>
      </header>

      <section className="panel">
        <h2>Filters</h2>
        <Filters
          apps={apps}
          filters={filters}
          loading={loading}
          onChange={(patch) => setFilters((current) => ({ ...current, ...patch }))}
          onSubmit={() => loadData(filters)}
        />
      </section>

      {error ? <div className="error">{error}</div> : null}

      <section className="panel">
        <h2>World map</h2>
        <WorldMap byCountry={stats.byCountry} total={stats.total} />
      </section>

      <section className="panel">
        <h2>Summary</h2>
        <Summary counts={summary} appLabel={appFilterLabel(filters)} />
      </section>

      <section className="panel">
        <h2>Top URLs</h2>
        <TopUrls rows={topUrls} topN={TOP_LIST_COUNT} />
      </section>

      <section className="panel">
        <h2>Top Referrers</h2>
        <TopReferrers rows={topReferrers} topN={TOP_LIST_COUNT} />
      </section>

      <section className="panel">
        <h2>Hits</h2>
        <LogTable rows={rows} />
      </section>
    </div>
  );
}
