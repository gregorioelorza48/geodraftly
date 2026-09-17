"use client";

import { useCallback, useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { booleanPointInPolygon, point } from "@turf/turf";
import { featureBounds, ringToPolygon } from "@/lib/design/geo";
import { DEMO_SITE_CENTER } from "@/lib/design/demo-site";
import { CameraControls } from "@/components/workbench/camera-controls";
import { syncDesignObjects, syncImportOverlays } from "@/lib/design/map-overlays";
import { workbenchStyle } from "@/lib/design/map-style";
import { formatArea, parkingSpecs } from "@/lib/design/metrics";
import { useDesign } from "@/lib/design/store";
import { DesignThreeLayer } from "@/lib/design/three-layer";
import type { LngLat } from "@/lib/design/types";

function parkingCallout(feature: { name: string; ring: LngLat[] }) {
  const specs = parkingSpecs(feature.ring);
  const el = document.createElement("div");
  el.className =
    "pointer-events-none rounded-lg border border-amber-300/70 bg-zinc-950/90 px-2.5 py-1.5 text-left shadow-lg backdrop-blur-md";
  el.innerHTML = `
    <p class="text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-300">${feature.name}</p>
    <p class="mt-0.5 font-mono text-[12px] text-amber-50">${Math.round(specs.widthFt)} × ${Math.round(specs.depthFt)} ft</p>
    <p class="font-mono text-[12px] text-zinc-100">${formatArea(specs.areaSqFt)} · ${specs.stalls} stalls</p>
  `;
  return el;
}

function hitTest(lngLat: LngLat, features: ReturnType<typeof useDesign>["features"]) {
  for (const feature of [...features].reverse()) {
    const poly = ringToPolygon(feature.ring);
    if (poly && booleanPointInPolygon(point(lngLat), poly)) return feature.id;
  }
  return null;
}

export function DesignCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const layerRef = useRef<DesignThreeLayer | null>(null);
  const orbitRef = useRef<OrbitControls | null>(null);
  const calloutRef = useRef<maplibregl.Marker | null>(null);
  const fittedRef = useRef(false);
  const {
    project,
    tool,
    features,
    setback,
    padHeightFt,
    draftRing,
    addDraftVertex,
    closeDraft,
    cancelDraft,
    placePad,
    placeParking,
    select,
    setCursor,
    applySetbackTool,
    sourceName,
    overlays,
    selectedId,
    deleteSelected,
    undo,
  } = useDesign();

  const latest = useRef({ tool, features, draftRing, addDraftVertex, closeDraft, placePad, placeParking, select, applySetbackTool });
  latest.current = { tool, features, draftRing, addDraftVertex, closeDraft, placePad, placeParking, select, applySetbackTool };
  const getMap = useCallback(() => mapRef.current, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || mapRef.current) return;

    const center: LngLat = [
      project?.longitude ?? DEMO_SITE_CENTER[0],
      project?.latitude ?? DEMO_SITE_CENTER[1],
    ];
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    const map = new maplibregl.Map({
      container: el,
      style: workbenchStyle(token),
      center,
      zoom: 17,
      pitch: 52,
      bearing: -28,
      maxPitch: 80,
      attributionControl: false,
    });
    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");
    map.dragRotate.enable();
    map.touchPitch.enable();

    const layer = new DesignThreeLayer();
    layer.setOrigin(center);
    layerRef.current = layer;

    map.on("load", () => {
      map.addLayer(layer);
      layer.update([], null, 28, []);
    });

    const dummy = new THREE.PerspectiveCamera(45, 1, 0.1, 1e7);
    dummy.position.set(80, 70, 80);
    const orbit = new OrbitControls(dummy, map.getCanvas());
    orbit.enableDamping = true;
    orbit.dampingFactor = 0.08;
    orbit.rotateSpeed = 0.28;
    orbit.zoomSpeed = 0.55;
    orbit.panSpeed = 0.45;
    orbit.target.set(0, 0, 0);
    orbit.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.PAN,
    };
    orbit.enabled = false;
    orbitRef.current = orbit;

    orbit.addEventListener("change", () => {
      const p = dummy.position;
      const dist = p.length();
      const bearing = THREE.MathUtils.radToDeg(Math.atan2(p.x, p.z));
      const pitch = THREE.MathUtils.radToDeg(Math.atan2(p.y, Math.hypot(p.x, p.z)));
      const zoom = Math.min(19.5, Math.max(13, 19.2 - Math.log2(Math.max(dist, 20) / 28)));
      map.jumpTo({
        bearing,
        pitch: Math.min(80, Math.max(0, pitch)),
        zoom,
      });
    });

    map.on("mousemove", (event) => {
      setCursor([event.lngLat.lng, event.lngLat.lat]);
    });

    map.on("click", (event) => {
      const lngLat: LngLat = [event.lngLat.lng, event.lngLat.lat];
      const current = latest.current;
      if (current.tool === "polygon") {
        current.addDraftVertex(lngLat);
        return;
      }
      if (current.tool === "pad") {
        current.placePad(lngLat);
        return;
      }
      if (current.tool === "parking") {
        current.placeParking(lngLat);
        return;
      }
      if (current.tool === "setback") {
        current.applySetbackTool();
        return;
      }
      current.select(hitTest(lngLat, current.features));
    });

    map.on("dblclick", (event) => {
      if (latest.current.tool === "polygon") {
        event.preventDefault();
        latest.current.closeDraft();
      }
    });

    mapRef.current = map;
    return () => {
      orbit.dispose();
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
      orbitRef.current = null;
    };
    // map is created once; project center is initial only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || project?.latitude == null || project.longitude == null) return;
    fittedRef.current = false;
    map.easeTo({
      center: [project.longitude, project.latitude],
      zoom: 18,
      pitch: 52,
      bearing: -24,
      duration: 900,
    });
  }, [project?.id, project?.latitude, project?.longitude]);

  useEffect(() => {
    const map = mapRef.current;
    const orbit = orbitRef.current;
    if (!map || !orbit) return;
    const drawing = tool === "polygon" || tool === "pad" || tool === "parking";
    orbit.enabled = tool === "pan";
    map.dragPan.enable();
    map.scrollZoom.enable();
    map.dragRotate.enable();
    if (drawing) {
      map.dragPan.disable();
      map.doubleClickZoom.disable();
      map.getCanvas().style.cursor = "crosshair";
    } else if (tool === "pan") {
      map.dragPan.disable();
      map.doubleClickZoom.disable();
      map.getCanvas().style.cursor = "grab";
    } else {
      map.doubleClickZoom.enable();
      map.getCanvas().style.cursor = "default";
    }
  }, [tool]);

  useEffect(() => {
    const origin =
      features.find((f) => f.kind === "pad")?.ring[0] ??
      features.find((f) => f.kind === "parking")?.ring[0] ??
      features.find((f) => f.kind === "parcel")?.ring[0] ??
      (project?.longitude != null && project.latitude != null
        ? ([project.longitude, project.latitude] as LngLat)
        : null);
    if (origin) layerRef.current?.setOrigin(origin);
    layerRef.current?.update(features, setback, padHeightFt, draftRing);
    if (mapRef.current?.loaded()) syncDesignObjects(mapRef.current, features, selectedId, padHeightFt);

    const bounds = featureBounds(features);
    if (bounds && !fittedRef.current && mapRef.current) {
      fittedRef.current = true;
      mapRef.current.fitBounds(
        [
          [bounds[0], bounds[1]],
          [bounds[2], bounds[3]],
        ],
        { padding: 80, pitch: 52, bearing: -24, duration: 800 },
      );
    }
  }, [features, setback, padHeightFt, draftRing, project, selectedId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const apply = () => {
      syncImportOverlays(map, overlays);
      syncDesignObjects(map, features, selectedId, padHeightFt);
    };
    if (map.loaded()) apply();
    else map.once("load", apply);
  }, [overlays, features, selectedId, padHeightFt]);

  useEffect(() => {
    const map = mapRef.current;
    const selected = features.find((feature) => feature.id === selectedId);
    if (!map || !selected || (selected.kind !== "parking" && selected.kind !== "pad")) return;
    const bounds = featureBounds([selected]);
    if (!bounds) return;
    const needsTilt = map.getPitch() < 45;
    const needsZoom = map.getZoom() < 16.5;
    if (!needsTilt && !needsZoom && selected.kind !== "pad") return;
    map.fitBounds(
      [
        [bounds[0], bounds[1]],
        [bounds[2], bounds[3]],
      ],
      { padding: 160, maxZoom: 18, duration: 700, pitch: Math.max(map.getPitch(), 58), bearing: map.getBearing() },
    );
  }, [selectedId, features]);

  useEffect(() => {
    const map = mapRef.current;
    calloutRef.current?.remove();
    calloutRef.current = null;
    const selected = features.find((feature) => feature.id === selectedId);
    if (!map || selected?.kind !== "parking") return;
    const center = parkingSpecs(selected.ring).center;
    if (!center) return;
    calloutRef.current = new maplibregl.Marker({
      element: parkingCallout(selected),
      anchor: "bottom",
      offset: [0, -10],
    })
      .setLngLat(center)
      .addTo(map);
    return () => {
      calloutRef.current?.remove();
      calloutRef.current = null;
    };
  }, [selectedId, features]);

  useEffect(() => {
    fittedRef.current = false;
  }, [sourceName, project?.id]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target;
      const typing =
        target instanceof HTMLElement &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable);
      if (event.key === "Enter") closeDraft();
      if (event.key === "Escape") cancelDraft();
      if (typing) return;
      if ((event.key === "Delete" || event.key === "Backspace") && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        deleteSelected();
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z" && !event.shiftKey) {
        event.preventDefault();
        undo();
      }
      const map = mapRef.current;
      if (map && !event.metaKey && !event.ctrlKey && !event.altKey) {
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          map.setBearing(map.getBearing() - 1.2);
        }
        if (event.key === "ArrowRight") {
          event.preventDefault();
          map.setBearing(map.getBearing() + 1.2);
        }
        if (event.key === "ArrowUp") {
          event.preventDefault();
          map.setPitch(Math.min(80, map.getPitch() + 1.1));
        }
        if (event.key === "ArrowDown") {
          event.preventDefault();
          map.setPitch(Math.max(0, map.getPitch() - 1.1));
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closeDraft, cancelDraft, deleteSelected, undo]);

  return (
    <>
      <div ref={containerRef} className="absolute inset-0 h-full w-full bg-zinc-950" />
      <CameraControls getMap={getMap} />
    </>
  );
}
