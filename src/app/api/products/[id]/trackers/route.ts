import { NextRequest, NextResponse } from "next/server";
import {
  getProductTrackers,
  createTracker,
  deleteTracker,
} from "@/lib/db/product-trackers";
import type { ProductTrackerInsert } from "@/lib/supabase/types";

interface TrackerBody {
  trackers: Omit<ProductTrackerInsert, "product_id">[];
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body: TrackerBody = await request.json();

    // Delete all existing trackers
    const existing = await getProductTrackers(id);
    for (const tracker of existing) {
      await deleteTracker(tracker.id);
    }

    // Create new ones
    const created = await Promise.all(
      (body.trackers || []).map((tracker) =>
        createTracker({
          product_id: id,
          type: tracker.type,
          tracker_id: tracker.tracker_id,
          side: tracker.side,
          config: tracker.config || null,
        })
      )
    );

    return NextResponse.json({ trackers: created });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
