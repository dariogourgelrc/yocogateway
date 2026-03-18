import { NextResponse } from "next/server";

/**
 * Temporary debug route: tests UTMify create → update flow
 * DELETE THIS FILE after debugging
 */

const UTMIFY_ENDPOINT = "https://api.utmify.com.br/api-credentials/orders";

export async function GET() {
  const apiToken = "b75KQlUCA6WkssSZihUQEDPvfuWAli8rKcPx";

  const fakeOrderId = `test-${Date.now()}`;
  const now = new Date().toISOString().replace("T", " ").substring(0, 19);

  const basePayload = {
    orderId: fakeOrderId,
    platform: "YocoGateway",
    paymentMethod: "credit_card",
    createdAt: now,
    refundedAt: null,
    customer: {
      name: "Teste Debug",
      email: "teste@debug.com",
      phone: "1234567890",
      document: null,
    },
    products: [
      {
        id: "test-product",
        name: "Produto Teste",
        planId: null,
        planName: null,
        quantity: 1,
        priceInCents: 100,
      },
    ],
    trackingParameters: {
      src: null,
      sck: null,
      utm_source: null,
      utm_campaign: null,
      utm_medium: null,
      utm_content: null,
      utm_term: null,
    },
    commission: {
      totalPriceInCents: 100,
      gatewayFeeInCents: 0,
      userCommissionInCents: 100,
      currency: "USD",
    },
  };

  // Step 1: Create with waiting_payment
  const createPayload = { ...basePayload, status: "waiting_payment", approvedDate: null };
  const createRes = await fetch(UTMIFY_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-token": apiToken },
    body: JSON.stringify(createPayload),
  });
  const createBody = await createRes.text();

  // Step 2: Update to paid (same orderId)
  const paidPayload = { ...basePayload, status: "paid", approvedDate: now };
  const paidRes = await fetch(UTMIFY_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-token": apiToken },
    body: JSON.stringify(paidPayload),
  });
  const paidBody = await paidRes.text();

  return NextResponse.json({
    orderId: fakeOrderId,
    step1_create: { status: createRes.status, body: createBody },
    step2_paid: { status: paidRes.status, body: paidBody },
  });
}
