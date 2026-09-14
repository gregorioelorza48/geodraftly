declare module "shpjs" {
  import type { FeatureCollection } from "geojson";
  export default function shp(data: ArrayBuffer | string | { shp: ArrayBuffer; dbf?: ArrayBuffer; prj?: string }): Promise<
    FeatureCollection | FeatureCollection[]
  >;
}
