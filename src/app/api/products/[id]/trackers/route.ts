import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/supabase/server";
import { verifyProductOwnership } from "@/lib/db/products";
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
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const owns = await verifyProductOwnership(id, user.id);
    if (!owns) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body: TrackerBody = await request.json();

    const existing = await getProductTrackers(id);
    for (const tracker of existing) {
      await deleteTracker(tracker.id);
    }

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
