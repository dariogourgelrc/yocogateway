"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { TrackerType } from "@/lib/supabase/types";

export interface TrackerData {
  id?: string;
  type: TrackerType;
  tracker_id: string;
  side: "client" | "server";
  config: Record<string, unknown> | null;
}

interface TrackerConfigFormProps {
  trackers: TrackerData[];
  onChange: (trackers: TrackerData[]) => void;
}

const TRACKER_TYPES: { value: TrackerType; label: string }[] = [
  { value: "facebook", label: "Facebook" },
  { value: "utmify", label: "UTMify" },
  { value: "google_ads", label: "Google Ads" },
  { value: "tiktok", label: "TikTok" },
];

const DEFAULT_SIDES: Record<TrackerType, "client" | "server"> = {
  facebook: "client",
  utmify: "server",
  google_ads: "client",
  tiktok: "client",
};

export function TrackerConfigForm({
  trackers,
  onChange,
}: TrackerConfigFormProps) {
  const addTracker = () => {
    onChange([
      ...trackers,
      {
        type: "facebook",
        tracker_id: "",
        side: "client",
        config: null,
      },
    ]);
  };

  const updateTracker = (index: number, updates: Partial<TrackerData>) => {
    const updated = trackers.map((t, i) =>
      i === index ? { ...t, ...updates } : t
    );
    onChange(updated);
  };

  const removeTracker = (index: number) => {
    onChange(trackers.filter((_, i) => i !== index));
  };

  const handleTypeChange = (index: number, type: TrackerType) => {
    const side = DEFAULT_SIDES[type];
    // Facebook CAPI needs server side entry too
    updateTracker(index, { type, side, config: null });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-900">Trackers</h3>
        <Button type="button" variant="secondary" size="sm" onClick={addTracker}>
          Add Tracker
        </Button>
      </div>

      {trackers.map((tracker, index) => (
        <div
          key={index}
          className="rounded-md border border-gray-200 bg-gray-50 p-4 space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">
              Tracker #{index + 1}
            </span>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => removeTracker(index)}
            >
              Remove
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <Label>Type</Label>
              <select
                value={tracker.type}
                onChange={(e) =>
                  handleTypeChange(index, e.target.value as TrackerType)
                }
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-black focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-1"
              >
                {TRACKER_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <Input
              label={tracker.type === "utmify" ? "API Token" : "Pixel ID"}
              value={tracker.tracker_id}
              onChange={(e) =>
                updateTracker(index, { tracker_id: e.target.value })
              }
              placeholder={
                tracker.type === "utmify"
                  ? "Your UTMify API token"
                  : "e.g. 1234567890"
              }
            />

            <div className="space-y-1">
              <Label>Side</Label>
              <select
                value={tracker.side}
                onChange={(e) =>
                  updateTracker(index, {
                    side: e.target.value as "client" | "server",
                  })
                }
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-black focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-1"
              >
                <option value="client">Client</option>
                <option value="server">Server</option>
              </select>
            </div>
          </div>

          {/* Facebook CAPI-specific config fields */}
          {tracker.type === "facebook" && tracker.side === "server" && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input
                label="CAPI Access Token"
                value={
                  (tracker.config as Record<string, string>)?.access_token || ""
                }
                onChange={(e) =>
                  updateTracker(index, {
                    config: {
                      ...(tracker.config || {}),
                      access_token: e.target.value,
                    },
                  })
                }
                placeholder="EAAx..."
              />
              <Input
                label="Dataset ID"
                value={
                  (tracker.config as Record<string, string>)?.dataset_id || ""
                }
                onChange={(e) =>
                  updateTracker(index, {
                    config: {
                      ...(tracker.config || {}),
                      dataset_id: e.target.value,
                    },
                  })
                }
                placeholder="e.g. 1234567890"
              />
            </div>
          )}
        </div>
      ))}

      {trackers.length === 0 && (
        <p className="text-sm text-gray-500">
          No trackers configured. Click &quot;Add Tracker&quot; to add one.
        </p>
      )}
    </div>
  );
}
