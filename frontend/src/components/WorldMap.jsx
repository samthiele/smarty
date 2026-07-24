import { useMemo, useState } from "react";
import { scaleLinear } from "d3-scale";
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup,
} from "react-simple-maps";
import {
  normalizeCountryCode,
  resolveGeographyIso2,
} from "../data/countryCodes.js";

const GEO_URL =
  "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

const DEFAULT_POSITION = { coordinates: [0, 20], zoom: 1 };

export default function WorldMap({ byCountry, total }) {
  const [tooltip, setTooltip] = useState(null);
  const [position, setPosition] = useState(DEFAULT_POSITION);
  const normalizedCounts = useMemo(() => {
    const entries = Object.entries(byCountry || {});
    return Object.fromEntries(
      entries.map(([code, count]) => [normalizeCountryCode(code), Number(count)])
    );
  }, [byCountry]);

  const counts = useMemo(
    () => Object.values(normalizedCounts),
    [normalizedCounts]
  );
  const maxCount = counts.length ? Math.max(...counts) : 0;

  const colorScale = useMemo(
    () =>
      scaleLinear()
        .domain([0, maxCount || 1])
        .range(["#dbeafe", "#1d4ed8"]),
    [maxCount]
  );

  function zoomBy(factor) {
    setPosition((current) => ({
      ...current,
      zoom: Math.min(Math.max(current.zoom * factor, 1), 8),
    }));
  }

  return (
    <div>
      <p className="meta">
        {total} entries across {Object.keys(normalizedCounts).length} countries
        (scroll or pinch to zoom, drag to pan)
      </p>
      <div className="map-controls">
        <button type="button" onClick={() => zoomBy(1.5)} aria-label="Zoom in">
          +
        </button>
        <button type="button" onClick={() => zoomBy(1 / 1.5)} aria-label="Zoom out">
          −
        </button>
        <button type="button" onClick={() => setPosition(DEFAULT_POSITION)}>
          Reset
        </button>
      </div>
      <div className="map-wrap">
        <ComposableMap projectionConfig={{ scale: 145 }}>
          <ZoomableGroup
            zoom={position.zoom}
            center={position.coordinates}
            onMoveEnd={setPosition}
          >
            <Geographies geography={GEO_URL}>
              {({ geographies }) =>
                geographies.map((geo) => {
                  const iso2 = resolveGeographyIso2(geo);
                  const count = iso2 ? Number(normalizedCounts[iso2] || 0) : 0;
                  const name = geo.properties?.name || iso2 || "Unknown";
                  const label = iso2
                    ? `${name} (${iso2}): ${count}`
                    : `${name}: ${count}`;

                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      fill={count ? colorScale(count) : "#e2e8f0"}
                      stroke="#fff"
                      strokeWidth={0.4 / position.zoom}
                      style={{
                        default: { outline: "none" },
                        hover: { outline: "none", opacity: 0.85 },
                        pressed: { outline: "none" },
                      }}
                      onMouseEnter={(event) => {
                        setTooltip({
                          x: event.clientX,
                          y: event.clientY,
                          label,
                        });
                      }}
                      onMouseMove={(event) => {
                        setTooltip({
                          x: event.clientX,
                          y: event.clientY,
                          label,
                        });
                      }}
                      onMouseLeave={() => setTooltip(null)}
                    />
                  );
                })
              }
            </Geographies>
          </ZoomableGroup>
        </ComposableMap>
      </div>
      <div className="legend">
        <span>0</span>
        <div className="legend-bar" />
        <span>{maxCount}</span>
      </div>
      {tooltip ? (
        <div
          className="tooltip"
          style={{ left: tooltip.x + 12, top: tooltip.y + 12 }}
        >
          {tooltip.label}
        </div>
      ) : null}
    </div>
  );
}
