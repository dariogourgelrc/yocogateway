import { NextRequest, NextResponse } from "next/server";
import { constructWhopEvent } from "@/lib/whop/verify-webhook";

// Isolated test endpoint for the local Whop integration (see SETUP.md section 13).
// It verifies the signature and logs the event — it does not touch orders/products yet.
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const headers = Object.fromEntries(request.headers);

  const event = constructWhopEvent(rawBody, headers);
  if (!event) {
    console.error("Whop webhook: invalid signature or missing WHOP_WEBHOOK_SECRET");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  console.log(`Whop webhook received: type=${event.type} id=${event.id}`, event.data);

  return NextResponse.json({ received: true, type: event.type, id: event.id });
}
