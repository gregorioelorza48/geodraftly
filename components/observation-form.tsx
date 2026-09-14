"use client";

import { useActionState, useState } from "react";
import { createObservationAction } from "@/lib/actions/observations";
import { CATEGORIES, PRIORITIES } from "@/lib/labels";
import { CATEGORY_LABELS, PRIORITY_LABELS } from "@/lib/labels";
import { FieldError, Input, Label, Select, Textarea } from "@/components/ui";
import { FormSubmit } from "@/components/form-submit";
import dynamic from "next/dynamic";

const SiteMap = dynamic(() => import("@/components/site-map").then((m) => m.SiteMap), { ssr: false });

export function ObservationForm({
  visitId,
  defaultCenter,
}: {
  visitId: string;
  defaultCenter?: [number, number];
}) {
  const [state, formAction] = useActionState(
    async (_: unknown, data: FormData) => createObservationAction(visitId, data),
    undefined,
  );
  const [lat, setLat] = useState<string>("");
  const [lng, setLng] = useState<string>("");

  function useDeviceLocation() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      setLat(pos.coords.latitude.toFixed(6));
      setLng(pos.coords.longitude.toFixed(6));
    });
  }

  const points =
    lat && lng
      ? [{ id: "draft", lat: Number(lat), lng: Number(lng), title: "New observation" }]
      : [];

  return (
    <form action={formAction} className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-4">
        <div>
          <Label htmlFor="title">Title</Label>
          <Input id="title" name="title" required placeholder="North swale erosion" />
        </div>
        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea id="description" name="description" placeholder="What did you see, and why does it matter?" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="category">Category</Label>
            <Select id="category" name="category" defaultValue="GENERAL">
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c]}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="priority">Priority</Label>
            <Select id="priority" name="priority" defaultValue="MEDIUM">
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {PRIORITY_LABELS[p]}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div>
          <Label htmlFor="photos">Photographs</Label>
          <Input id="photos" name="photos" type="file" accept="image/*" capture="environment" multiple />
          <p className="mt-1 text-xs text-ink-soft">Up to 12 images, 15 MB each. Use the camera on a tablet or phone.</p>
        </div>
        <FieldError message={state && "error" in state ? state.error : undefined} />
        <FormSubmit>Save observation</FormSubmit>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Map location</Label>
          <button type="button" className="text-sm font-medium text-field underline" onClick={useDeviceLocation}>
            Use current GPS
          </button>
        </div>
        <p className="text-xs text-ink-soft">Tap the map to drop a pin, or capture GPS from this device.</p>
        <SiteMap
          points={points}
          center={defaultCenter}
          onPick={(nextLat, nextLng) => {
            setLat(nextLat.toFixed(6));
            setLng(nextLng.toFixed(6));
          }}
          className="h-64 overflow-hidden rounded-2xl border border-line"
        />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="latitude">Latitude</Label>
            <Input id="latitude" name="latitude" value={lat} onChange={(e) => setLat(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="longitude">Longitude</Label>
            <Input id="longitude" name="longitude" value={lng} onChange={(e) => setLng(e.target.value)} />
          </div>
        </div>
      </div>
    </form>
  );
}
