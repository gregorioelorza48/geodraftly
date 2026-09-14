import maplibregl from "maplibre-gl";
import * as THREE from "three";
import { closeRing, lngLatToLocalMeters } from "./geo";
import type { LngLat, Ring, SiteFeature } from "./types";

const CYAN = 0x22d3ee;
const YELLOW = 0xfacc15;
const PAD = 0x8b9aab;
const PARKING = 0xf59e0b;

type ModelTransform = {
  translateX: number;
  translateY: number;
  translateZ: number;
  scale: number;
};

export class DesignThreeLayer implements maplibregl.CustomLayerInterface {
  id = "geodraftly-3d";
  type = "custom" as const;
  renderingMode = "2d" as const;

  private map?: maplibregl.Map;
  private camera = new THREE.Camera();
  private scene = new THREE.Scene();
  private group = new THREE.Group();
  private renderer?: THREE.WebGLRenderer;
  private transform: ModelTransform | null = null;
  origin: LngLat = [-87.673, 42.0412];

  constructor() {
    this.group.rotation.x = Math.PI / 2;
    this.scene.add(this.group);
    this.scene.add(new THREE.AmbientLight(0xd6d3d1, 0.7));
    const sun = new THREE.DirectionalLight(0xfff7ed, 1.15);
    sun.position.set(120, 180, 90);
    this.scene.add(sun);
    const fill = new THREE.DirectionalLight(0x38bdf8, 0.25);
    fill.position.set(-80, 40, -60);
    this.scene.add(fill);
    this.onAdd = this.onAdd.bind(this);
    this.onRemove = this.onRemove.bind(this);
    this.render = this.render.bind(this);
  }

  setOrigin(origin: LngLat) {
    this.origin = origin;
    const mc = maplibregl.MercatorCoordinate.fromLngLat({ lng: origin[0], lat: origin[1] }, 0);
    this.transform = {
      translateX: mc.x,
      translateY: mc.y,
      translateZ: mc.z,
      scale: mc.meterInMercatorCoordinateUnits(),
    };
  }

  onAdd(map: maplibregl.Map, gl: WebGLRenderingContext | WebGL2RenderingContext) {
    this.map = map;
    this.renderer = new THREE.WebGLRenderer({
      canvas: map.getCanvas(),
      context: gl,
      antialias: true,
    });
    this.renderer.autoClear = false;
  }

  onRemove() {
    this.clearGroup();
    this.renderer?.dispose();
    this.renderer = undefined;
    this.map = undefined;
  }

  update(features: SiteFeature[], setback: Ring | null, padHeightFt: number, draft: LngLat[]) {
    this.clearGroup();
    const origin = this.origin;
    const parcel = features.find((f) => f.kind === "parcel");
    if (parcel && parcel.ring.length < 240) this.addOutline(parcel.ring, origin, CYAN, false, 1.2);
    if (setback) this.addOutline(setback, origin, YELLOW, true, 1);
    if (draft.length) this.addOutline(draft, origin, 0xe2e8f0, false, 1);
    this.map?.triggerRepaint();
  }

  render(_gl: WebGLRenderingContext | WebGL2RenderingContext, matrix: ArrayLike<number>) {
    if (!this.renderer || !this.transform || !this.map) return;
    const t = this.transform;
    const local = new THREE.Matrix4()
      .makeTranslation(t.translateX, t.translateY, t.translateZ)
      .scale(new THREE.Vector3(t.scale, -t.scale, t.scale));
    this.camera.projectionMatrix = new THREE.Matrix4().fromArray(matrix).multiply(local);
    this.renderer.resetState();
    this.renderer.clearDepth();
    this.renderer.render(this.scene, this.camera);
    this.map.triggerRepaint();
  }

  private addOutline(ring: Ring, origin: LngLat, color: number, dashed: boolean, y: number) {
    const pts = (dashed ? closeRing(ring) : ring).map(([lng, lat]) => {
      const [x, north] = lngLatToLocalMeters(lng, lat, origin);
      return new THREE.Vector3(x, north, y);
    });
    if (pts.length < 2) return;
    const geom = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = dashed
      ? new THREE.LineDashedMaterial({ color, dashSize: 3, gapSize: 1.6, linewidth: 1 })
      : new THREE.LineBasicMaterial({ color, linewidth: 2 });
    const line = new THREE.Line(geom, mat);
    if (dashed) line.computeLineDistances();
    this.group.add(line);
  }

  private addExtrusion(ring: Ring, origin: LngLat, heightM: number, color: number, edged: boolean) {
    const closed = closeRing(ring);
    if (closed.length < 4) return;
    const shape = new THREE.Shape();
    closed.slice(0, -1).forEach(([lng, lat], index) => {
      const [x, y] = lngLatToLocalMeters(lng, lat, origin);
      if (index === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    });
    const geom = new THREE.ExtrudeGeometry(shape, {
      depth: Math.max(heightM, 0.15),
      bevelEnabled: false,
    });
    const mesh = new THREE.Mesh(
      geom,
      new THREE.MeshStandardMaterial({
        color,
        metalness: 0.28,
        roughness: 0.42,
        transparent: false,
        opacity: 1,
        emissive: color === PAD ? 0x164e63 : 0x78350f,
        emissiveIntensity: color === PAD ? 0.18 : 0.08,
      }),
    );
    this.group.add(mesh);
    if (edged) {
      this.group.add(
        new THREE.LineSegments(
          new THREE.EdgesGeometry(geom, 25),
          new THREE.LineBasicMaterial({ color: 0xf8fafc, transparent: true, opacity: 0.7 }),
        ),
      );
    }
  }

  private clearGroup() {
    while (this.group.children.length) {
      const child = this.group.children[0];
      this.group.remove(child);
      if (child instanceof THREE.Mesh || child instanceof THREE.Line || child instanceof THREE.LineSegments) {
        child.geometry.dispose();
        const material = child.material;
        if (Array.isArray(material)) material.forEach((m) => m.dispose());
        else material.dispose();
      }
    }
  }
}
