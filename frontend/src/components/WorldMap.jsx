import { useMemo, useState } from "react";
import { scaleLinear } from "d3-scale";
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup,
} from "react-simple-maps";

const GEO_URL =
  "https://cdn.jsdelivr.net/gh/datasets/geo-countries@master/data/countries.geojson";

const DEFAULT_POSITION = { coordinates: [0, 20], zoom: 1 };

function normalizeCountryCode(code) {
  return String(code || "").toUpperCase();
}

function geographyIso2(geo) {
  return normalizeCountryCode(
    geo.properties?.["ISO3166-1-Alpha-2"] ??
      geo.properties?.ISO_A2 ??
      geo.properties?.iso_a2
  );
}

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
                  const iso2 = geographyIso2(geo);
                  const count = Number(normalizedCounts[iso2] || 0);
                  const name = geo.properties?.name || iso2;

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
                          label: `${name} (${iso2}): ${count}`,
                        });
                      }}
                      onMouseMove={(event) => {
                        setTooltip({
                          x: event.clientX,
                          y: event.clientY,
                          label: `${name} (${iso2}): ${count}`,
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
