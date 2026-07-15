import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { createWhopSession, WhopCurrency } from "@/lib/whop/create-session";

// Isolated test endpoint for the local Whop integration (see SETUP.md section 13).
// Creates a one-off, low-value checkout so the flow + webhook can be exercised
// end-to-end without touching the real products/orders schema.
export async function POST(request: NextRequest) {
  const companyId = process.env.WHOP_COMPANY_ID;
  const apiKey = process.env.WHOP_API_KEY;
  if (!companyId || !apiKey) {
    return NextResponse.json(
      { error: "WHOP_COMPANY_ID / WHOP_API_KEY is not configured" },
      { status: 500 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const amountInCents: number = body.amountInCents ?? 100; // default $1.00
  const currency: WhopCurrency = body.currency ?? "usd";

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const externalIdentifier = `whop-test-${nanoid()}`;

  try {
    const session = await createWhopSession({
      apiKey,
      companyId,
      amountInCents,
      currency,
      redirectUrl: `${appUrl}/whop-test?status=done`,
      productTitle: "Whop Test Checkout",
      externalIdentifier,
      metadata: { externalIdentifier },
    });

    return NextResponse.json({
      checkout_id: session.id,
      purchase_url: session.purchaseUrl,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Whop test-checkout error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
