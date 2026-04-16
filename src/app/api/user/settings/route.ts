import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/supabase/server";
import { getUserSettings, upsertUserSettings } from "@/lib/db/user-settings";

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const settings = await getUserSettings(user.id);
    // Never expose the full secret key — mask it
    if (settings) {
      return NextResponse.json({
        ...settings,
        stripe_secret_key: settings.stripe_secret_key
          ? maskKey(settings.stripe_secret_key)
          : "",
        stripe_webhook_secret: settings.stripe_webhook_secret
          ? maskKey(settings.stripe_webhook_secret)
          : "",
      });
    }

    return NextResponse.json(null);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Only update keys that were actually provided (non-masked, non-empty)
    const updates: Record<string, string> = {};
    if (body.stripe_secret_key && !body.stripe_secret_key.includes("•")) {
      updates.stripe_secret_key = body.stripe_secret_key;
    }
    if (body.stripe_publishable_key) {
      updates.stripe_publishable_key = body.stripe_publishable_key;
    }
    if (body.stripe_webhook_secret && !body.stripe_webhook_secret.includes("•")) {
      updates.stripe_webhook_secret = body.stripe_webhook_secret;
    }

    // Merge with existing settings so masked fields aren't overwritten
    const existing = await getUserSettings(user.id);
    const merged = {
      stripe_secret_key: updates.stripe_secret_key ?? existing?.stripe_secret_key ?? "",
      stripe_publishable_key:
        updates.stripe_publishable_key ?? existing?.stripe_publishable_key ?? "",
      stripe_webhook_secret:
        updates.stripe_webhook_secret ?? existing?.stripe_webhook_secret ?? "",
    };

    const saved = await upsertUserSettings(user.id, merged);

    return NextResponse.json({
      ...saved,
      stripe_secret_key: saved.stripe_secret_key ? maskKey(saved.stripe_secret_key) : "",
      stripe_webhook_secret: saved.stripe_webhook_secret
        ? maskKey(saved.stripe_webhook_secret)
        : "",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function maskKey(key: string): string {
  if (key.length <= 8) return "••••••••";
  return key.slice(0, 7) + "•".repeat(Math.min(key.length - 11, 20)) + key.slice(-4);
}
