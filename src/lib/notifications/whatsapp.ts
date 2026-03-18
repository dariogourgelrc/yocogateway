import type { OrderWithItems, Product } from "@/lib/supabase/types";

export async function sendWhatsAppConfirmation(
  order: OrderWithItems,
  product: Product
) {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!accessToken || !phoneNumberId) {
    console.error("sendWhatsAppConfirmation: WhatsApp env vars not set");
    return;
  }

  // Format phone number: ensure it starts with country code, no + prefix
  const phone = order.buyer_phone.replace(/^\+/, "").replace(/\D/g, "");

  const message = [
    `Hi ${order.buyer_name}! ✅`,
    ``,
    `Your purchase of *${product.name}* has been confirmed.`,
    product.delivery_url
      ? `\nAccess your product here:\n${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/delivery/${product.slug}`
      : "",
    ``,
    `Thank you for your purchase!`,
  ]
    .filter(Boolean)
    .join("\n");

  const res = await fetch(
    `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: phone,
        type: "text",
        text: { body: message },
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    console.error(`WhatsApp send failed: ${res.status} ${err}`);
  }
}
