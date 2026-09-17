import type { StyleSpecification } from "maplibre-gl";

export function workbenchStyle(mapboxToken?: string): StyleSpecification {
  const tiles = mapboxToken
    ? [`https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/tiles/{z}/{x}/{y}@2x?access_token=${mapboxToken}`]
    : ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"];

  return {
    version: 8,
    name: "Geodraftly Workbench",
    sources: {
      satellite: {
        type: "raster",
        tiles,
        tileSize: mapboxToken ? 512 : 256,
        maxzoom: 19,
        attribution: mapboxToken ? "© Mapbox © Maxar" : "Tiles © Esri — Maxar, Earthstar Geographics",
      },
    },
    layers: [
      { id: "background", type: "background", paint: { "background-color": "#09090b" } },
      {
        id: "satellite",
        type: "raster",
        source: "satellite",
        paint: {
          "raster-saturation": -0.12,
          "raster-contrast": 0.08,
          "raster-brightness-min": 0,
          "raster-brightness-max": 1,
          "raster-opacity": 1,
        },
      },
    ],
  };
}
