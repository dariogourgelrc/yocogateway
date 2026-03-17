"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import type { ProductTracker, TrackerType } from "@/lib/supabase/types";

interface IntegrationConfig {
  type: TrackerType;
  label: string;
  description: string;
  fields: {
    key: string;
    label: string;
    placeholder: string;
    isConfig?: boolean;
  }[];
}

const INTEGRATIONS: IntegrationConfig[] = [
  {
    type: "facebook",
    label: "Facebook Pixel",
    description:
      "Track conversions with Meta Pixel. Add your Pixel ID to track events on the checkout page. For server-side tracking (CAPI), also fill in the access token and dataset ID.",
    fields: [
      { key: "tracker_id", label: "Pixel ID", placeholder: "e.g. 1234567890" },
      {
        key: "access_token",
        label: "CAPI Access Token (optional)",
        placeholder: "EAAx...",
        isConfig: true,
      },
      {
        key: "dataset_id",
        label: "CAPI Dataset ID (optional)",
        placeholder: "e.g. 1234567890",
        isConfig: true,
      },
    ],
  },
  {
    type: "google_ads",
    label: "Google Ads",
    description: "Track conversions with Google Ads pixel.",
    fields: [
      {
        key: "tracker_id",
        label: "Conversion ID",
        placeholder: "e.g. AW-123456789",
      },
    ],
  },
  {
    type: "tiktok",
    label: "TikTok Pixel",
    description: "Track conversions with TikTok pixel.",
    fields: [
      {
        key: "tracker_id",
        label: "Pixel ID",
        placeholder: "e.g. C1234567890",
      },
    ],
  },
  {
    type: "utmify",
    label: "UTMify",
    description: "Send conversion data to UTMify for attribution tracking.",
    fields: [
      {
        key: "tracker_id",
        label: "API Token",
        placeholder: "Your UTMify API token",
      },
    ],
  },
];

interface IntegrationsFormProps {
  productId: string;
  existingTrackers: ProductTracker[];
}

interface TrackerState {
  enabled: boolean;
  values: Record<string, string>;
  existingIds: string[]; // IDs of existing tracker rows for this type
}

function buildInitialState(
  existingTrackers: ProductTracker[]
): Record<TrackerType, TrackerState> {
  const state: Record<TrackerType, TrackerState> = {
    facebook: { enabled: false, values: {}, existingIds: [] },
    google_ads: { enabled: false, values: {}, existingIds: [] },
    tiktok: { enabled: false, values: {}, existingIds: [] },
    utmify: { enabled: false, values: {}, existingIds: [] },
  };

  for (const tracker of existingTrackers) {
    const s = state[tracker.type];
    s.enabled = true;
    s.existingIds.push(tracker.id);

    if (tracker.tracker_id) {
      s.values.tracker_id = tracker.tracker_id;
    }

    // Merge config fields
    if (tracker.config) {
      for (const [k, v] of Object.entries(tracker.config)) {
        s.values[k] = String(v || "");
      }
    }
  }

  return state;
}

export function IntegrationsForm({
  productId,
  existingTrackers,
}: IntegrationsFormProps) {
  const [trackers, setTrackers] = useState(() =>
    buildInitialState(existingTrackers)
  );
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const toggle = (type: TrackerType) => {
    setTrackers((prev) => ({
      ...prev,
      [type]: { ...prev[type], enabled: !prev[type].enabled },
    }));
  };

  const updateValue = (type: TrackerType, key: string, value: string) => {
    setTrackers((prev) => ({
      ...prev,
      [type]: {
        ...prev[type],
        values: { ...prev[type].values, [key]: value },
      },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setFeedback(null);

    // Build tracker list from enabled integrations
    const trackerList: {
      type: TrackerType;
      tracker_id: string;
      side: "client" | "server";
      config: Record<string, unknown> | null;
    }[] = [];

    for (const integration of INTEGRATIONS) {
      const state = trackers[integration.type];
      if (!state.enabled || !state.values.tracker_id) continue;

      const configFields = integration.fields.filter((f) => f.isConfig);
      const config: Record<string, unknown> = {};
      let hasConfig = false;
      for (const f of configFields) {
        if (state.values[f.key]) {
          config[f.key] = state.values[f.key];
          hasConfig = true;
        }
      }

      if (integration.type === "facebook") {
        // Always add client-side pixel
        trackerList.push({
          type: "facebook",
          tracker_id: state.values.tracker_id,
          side: "client",
          config: null,
        });
        // If CAPI configured, also add server-side
        if (config.access_token && config.dataset_id) {
          trackerList.push({
            type: "facebook",
            tracker_id: state.values.tracker_id,
            side: "server",
            config,
          });
        }
      } else if (integration.type === "utmify") {
        trackerList.push({
          type: integration.type,
          tracker_id: state.values.tracker_id,
          side: "server",
          config: hasConfig ? config : null,
        });
      } else {
        trackerList.push({
          type: integration.type,
          tracker_id: state.values.tracker_id,
          side: "client",
          config: hasConfig ? config : null,
        });
      }
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
      {INTEGRATIONS.map((integration) => {
        const state = trackers[integration.type];
        return (
          <Card key={integration.type}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h3 className="text-base font-semibold">{integration.label}</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {integration.description}
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                <input
                  type="checkbox"
                  checked={state.enabled}
                  onChange={() => toggle(integration.type)}
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
                      onChange={(e) =>
                        updateValue(
                          integration.type,
                          field.key,
                          e.target.value
                        )
                      }
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
            feedback.type === "success"
              ? "bg-green-50 text-green-800"
              : "bg-red-50 text-red-800"
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
