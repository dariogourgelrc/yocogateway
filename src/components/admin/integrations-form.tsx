"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import type { ProductTracker, TrackerType } from "@/lib/supabase/types";

// ── Facebook: multiple pixels ──────────────────────────────────────────────

interface FbPixelEntry {
  pixelId: string;
  accessToken: string;
  datasetId: string;
}

function buildFbState(existingTrackers: ProductTracker[]): {
  enabled: boolean;
  pixels: FbPixelEntry[];
} {
  const clientTrackers = existingTrackers.filter(
    (t) => t.type === "facebook" && t.side === "client"
  );
  const serverTrackers = existingTrackers.filter(
    (t) => t.type === "facebook" && t.side === "server"
  );

  if (clientTrackers.length === 0) {
    return { enabled: false, pixels: [{ pixelId: "", accessToken: "", datasetId: "" }] };
  }

  return {
    enabled: true,
    pixels: clientTrackers.map((ct) => {
      const server = serverTrackers.find((st) => st.tracker_id === ct.tracker_id);
      return {
        pixelId: ct.tracker_id,
        accessToken: (server?.config as Record<string, string>)?.access_token || "",
        datasetId: (server?.config as Record<string, string>)?.dataset_id || "",
      };
    }),
  };
}

// ── Other integrations (single-entry) ─────────────────────────────────────

type OtherTrackerType = "google_ads" | "tiktok" | "utmify";

interface OtherIntegrationConfig {
  type: OtherTrackerType;
  label: string;
  description: string;
  fields: { key: string; label: string; placeholder: string; isConfig?: boolean }[];
}

const OTHER_INTEGRATIONS: OtherIntegrationConfig[] = [
  {
    type: "google_ads",
    label: "Google Ads",
    description: "Track conversions with Google Ads pixel.",
    fields: [{ key: "tracker_id", label: "Conversion ID", placeholder: "e.g. AW-123456789" }],
  },
  {
    type: "tiktok",
    label: "TikTok Pixel",
    description: "Track conversions with TikTok pixel.",
    fields: [{ key: "tracker_id", label: "Pixel ID", placeholder: "e.g. C1234567890" }],
  },
  {
    type: "utmify",
    label: "UTMify",
    description: "Send conversion data to UTMify for attribution tracking.",
    fields: [{ key: "tracker_id", label: "API Token", placeholder: "Your UTMify API token" }],
  },
];

interface OtherTrackerState {
  enabled: boolean;
  values: Record<string, string>;
}

function buildOtherState(
  existingTrackers: ProductTracker[]
): Record<OtherTrackerType, OtherTrackerState> {
  const state: Record<OtherTrackerType, OtherTrackerState> = {
    google_ads: { enabled: false, values: {} },
    tiktok: { enabled: false, values: {} },
    utmify: { enabled: false, values: {} },
  };

  for (const tracker of existingTrackers) {
    if (tracker.type === "facebook") continue;
    const s = state[tracker.type as OtherTrackerType];
    if (!s) continue;
    s.enabled = true;
    if (tracker.tracker_id) s.values.tracker_id = tracker.tracker_id;
    if (tracker.config) {
      for (const [k, v] of Object.entries(tracker.config)) {
        s.values[k] = String(v || "");
      }
    }
  }

  return state;
}

// ── Component ──────────────────────────────────────────────────────────────

interface IntegrationsFormProps {
  productId: string;
  existingTrackers: ProductTracker[];
}

export function IntegrationsForm({ productId, existingTrackers }: IntegrationsFormProps) {
  const [fb, setFb] = useState(() => buildFbState(existingTrackers));
  const [others, setOthers] = useState(() => buildOtherState(existingTrackers));
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Facebook helpers
  const toggleFb = () =>
    setFb((prev) => ({ ...prev, enabled: !prev.enabled }));

  const updateFbPixel = (index: number, field: keyof FbPixelEntry, value: string) =>
    setFb((prev) => {
      const pixels = [...prev.pixels];
      pixels[index] = { ...pixels[index], [field]: value };
      return { ...prev, pixels };
    });

  const addFbPixel = () =>
    setFb((prev) => ({
      ...prev,
      pixels: [...prev.pixels, { pixelId: "", accessToken: "", datasetId: "" }],
    }));

  const removeFbPixel = (index: number) =>
    setFb((prev) => ({
      ...prev,
      pixels: prev.pixels.filter((_, i) => i !== index),
    }));

  // Other tracker helpers
  const toggleOther = (type: OtherTrackerType) =>
    setOthers((prev) => ({
      ...prev,
      [type]: { ...prev[type], enabled: !prev[type].enabled },
    }));

  const updateOther = (type: OtherTrackerType, key: string, value: string) =>
    setOthers((prev) => ({
      ...prev,
      [type]: { ...prev[type], values: { ...prev[type].values, [key]: value } },
    }));

  const handleSave = async () => {
    setSaving(true);
    setFeedback(null);

    const trackerList: {
      type: TrackerType;
      tracker_id: string;
      side: "client" | "server";
      config: Record<string, unknown> | null;
    }[] = [];

    // Facebook: one row per pixel (client) + optional server row (CAPI)
    if (fb.enabled) {
      for (const entry of fb.pixels) {
        if (!entry.pixelId.trim()) continue;
        trackerList.push({ type: "facebook", tracker_id: entry.pixelId.trim(), side: "client", config: null });
        if (entry.accessToken.trim() && entry.datasetId.trim()) {
          trackerList.push({
            type: "facebook",
            tracker_id: entry.pixelId.trim(),
            side: "server",
            config: { access_token: entry.accessToken.trim(), dataset_id: entry.datasetId.trim() },
          });
        }
      }
    }

    // Other integrations
    for (const integration of OTHER_INTEGRATIONS) {
      const state = others[integration.type];
      if (!state.enabled || !state.values.tracker_id?.trim()) continue;

      trackerList.push({
        type: integration.type,
        tracker_id: state.values.tracker_id.trim(),
        side: integration.type === "utmify" ? "server" : "client",
        config: null,
      });
    }

    try {
      const res = await fetch(`/api/products/${productId}/trackers`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackers: trackerList }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save integrations");
      }

      setFeedback({ type: "success", message: "Integrations saved!" });
    } catch (err) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Something went wrong",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Facebook — multiple pixels */}
      <Card>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h3 className="text-base font-semibold">Facebook Pixel</h3>
            <p className="text-sm text-gray-500 mt-1">
              Track conversions with Meta Pixel. Add one or more Pixel IDs. For
              server-side tracking (CAPI), also fill in the access token and dataset ID
              per pixel.
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
            <input
              type="checkbox"
              checked={fb.enabled}
              onChange={toggleFb}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-black peer-focus:ring-offset-1 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-black" />
          </label>
        </div>

        {fb.enabled && (
          <div className="mt-4 space-y-4">
            {fb.pixels.map((entry, i) => (
              <div key={i} className="rounded-lg border border-gray-200 p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    Pixel {fb.pixels.length > 1 ? `#${i + 1}` : ""}
                  </span>
                  {fb.pixels.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeFbPixel(i)}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <div>
                  <Label>Pixel ID</Label>
                  <Input
                    value={entry.pixelId}
                    onChange={(e) => updateFbPixel(i, "pixelId", e.target.value)}
                    placeholder="e.g. 1234567890"
                  />
                </div>
                <div>
                  <Label>CAPI Access Token (optional)</Label>
                  <Input
                    value={entry.accessToken}
                    onChange={(e) => updateFbPixel(i, "accessToken", e.target.value)}
                    placeholder="EAAx..."
                  />
                </div>
                <div>
                  <Label>CAPI Dataset ID (optional)</Label>
                  <Input
                    value={entry.datasetId}
                    onChange={(e) => updateFbPixel(i, "datasetId", e.target.value)}
                    placeholder="e.g. 1234567890"
                  />
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={addFbPixel}
              className="text-sm text-gray-600 hover:text-gray-900 underline"
            >
              + Add another Pixel
            </button>
          </div>
        )}
      </Card>

      {/* Other integrations */}
      {OTHER_INTEGRATIONS.map((integration) => {
        const state = others[integration.type];
        return (
          <Card key={integration.type}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h3 className="text-base font-semibold">{integration.label}</h3>
                <p className="text-sm text-gray-500 mt-1">{integration.description}</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                <input
                  type="checkbox"
                  checked={state.enabled}
                  onChange={() => toggleOther(integration.type)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-black peer-focus:ring-offset-1 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-black" />
              </label>
            </div>

            {state.enabled && (
              <div className="mt-4 space-y-3">
                {integration.fields.map((field) => (
                  <div key={field.key}>
                    <Label>{field.label}</Label>
                    <Input
                      value={state.values[field.key] || ""}
                      onChange={(e) => updateOther(integration.type, field.key, e.target.value)}
                      placeholder={field.placeholder}
                    />
                  </div>
                ))}
              </div>
            )}
          </Card>
        );
      })}

      {feedback && (
        <div
          className={`rounded-md p-3 text-sm ${
            feedback.type === "success" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"
          }`}
        >
          {feedback.message}
        </div>
      )}

      <Button size="lg" onClick={handleSave} disabled={saving}>
        {saving ? "Saving..." : "Save Integrations"}
      </Button>
    </div>
  );
}
