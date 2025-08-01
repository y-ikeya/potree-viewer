import React, { useRef, useEffect, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import "./Map.css";

const Map = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [lng] = useState(127.68);
  const [lat] = useState(26.21);
  const [zoom] = useState(10);
  const [API_KEY] = useState("eR02eaSGwGgy6qN46wz9");

  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: `https://api.maptiler.com/maps/satellite/style.json?key=${API_KEY}`,
      center: [lng, lat],
      zoom: zoom,
    });

    map.current.on("load", () => {
      if (!map.current) return;
      map.current.addSource("okinawa", {
        type: "geojson",
        data: "/cont.geojson",
      });

      map.current.addLayer({
        id: "okinawa-line",
        type: "line",
        source: "okinawa",
        layout: {
          "line-join": "round",
          "line-cap": "round",
        },
        paint: {
          "line-color": "#ff0000",
          "line-width": 1,
        },
      });
    });
  }, [API_KEY, lng, lat, zoom]);

  return (
    <div className="map-wrap">
      <div ref={mapContainer} className="map" />
    </div>
  );
};

export default Map;
