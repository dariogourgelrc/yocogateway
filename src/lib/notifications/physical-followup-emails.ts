import { Resend } from "resend";
import { formatCurrency } from "@/lib/utils/currency";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY!);
}

interface PhysicalOrderInfo {
  orderId: string;
  buyerName: string;
  buyerEmail: string;
  totalAmount: number;
  currency: string;
  shippingAddress: {
    address_line: string;
    city: string;
    postal_code: string;
    country: string;
  } | null;
  productName: string;
  storeName: string;
  supportEmail: string;
  supportPhone: string;
  whatsAppLink: string;
}

function orderRef(orderId: string) {
  return `#${orderId.slice(0, 8).toUpperCase()}`;
}

// ─── Email 2: Shipping update (sent ~3h after purchase) ───────────────────────

export async function sendPhysicalShippingEmail(info: PhysicalOrderInfo) {
  const from = process.env.EMAIL_FROM;
  if (!from) return;

  const addr = info.shippingAddress;
  const addressBlock = addr
    ? `${addr.address_line}, ${addr.city}, ${addr.postal_code}, ${addr.country}`
    : "—";

  const { error } = await getResend().emails.send({
    from,
    to: info.buyerEmail,
    subject: `🚚 Your order ${orderRef(info.orderId)} is being prepared!`,
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
      <body style="margin:0;padding:0;background-color:#f4f4f5;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
        <div style="max-width:600px;margin:0 auto;padding:20px;">

          <div style="background:linear-gradient(135deg,#0ea5e9,#0284c7);border-radius:12px 12px 0 0;padding:40px 30px;text-align:center;">
            <div style="font-size:48px;margin-bottom:10px;">🚚</div>
            <h1 style="color:#ffffff;font-size:22px;margin:0;font-weight:700;">Order Update!</h1>
            <p style="color:#e0f2fe;font-size:14px;margin:8px 0 0;">Our team is already preparing your order</p>
          </div>

          <div style="background:#ffffff;padding:30px;border-radius:0 0 12px 12px;box-shadow:0 2px 8px rgba(0,0,0,0.06);">

            <p style="font-size:16px;color:#1f2937;margin:0 0 24px;">
              Hi <strong>${info.buyerName}</strong>! We have great news for you! 🎉
            </p>

            <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:20px;margin-bottom:20px;">
              <h2 style="font-size:13px;color:#0369a1;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 12px;">📋 Your Order</h2>
              <table style="width:100%;border-collapse:collapse;">
                <tr><td style="padding:6px 0;font-size:14px;color:#6b7280;">Product</td><td style="padding:6px 0;font-size:14px;color:#111827;text-align:right;font-weight:600;">${info.productName}</td></tr>
                <tr><td style="padding:6px 0;font-size:14px;color:#6b7280;">Total Paid</td><td style="padding:6px 0;font-size:14px;color:#111827;text-align:right;font-weight:700;">${formatCurrency(info.totalAmount, info.currency)}</td></tr>
                <tr><td style="padding:6px 0;font-size:13px;color:#6b7280;">Reference</td><td style="padding:6px 0;font-size:13px;color:#0369a1;text-align:right;font-family:monospace;font-weight:700;">${orderRef(info.orderId)}</td></tr>
              </table>
            </div>

            <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:20px;margin-bottom:20px;">
              <h2 style="font-size:13px;color:#166534;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 10px;">📍 Confirmed Delivery Address</h2>
              <p style="font-size:14px;color:#1f2937;margin:0;line-height:1.6;font-weight:500;">${addressBlock}</p>
            </div>

            <div style="background:#fafafa;border:1px solid #e5e7eb;border-radius:8px;padding:20px;margin-bottom:20px;">
              <h2 style="font-size:13px;color:#374151;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 12px;">🗓️ Next Steps</h2>
              <div style="padding:10px 0;border-bottom:1px solid #f3f4f6;font-size:14px;color:#374151;">
                <strong style="color:#0284c7;">Now:</strong> Your order is being picked and packed by our team.
              </div>
              <div style="padding:10px 0;border-bottom:1px solid #f3f4f6;font-size:14px;color:#374151;">
                <strong style="color:#0284c7;">Soon:</strong> You will receive an email with your shipping details and tracking number.
              </div>
              <div style="padding:10px 0;font-size:14px;color:#374151;">
                <strong style="color:#0284c7;">Delivery:</strong> Your order will be delivered to the address above.
              </div>
            </div>

            <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />

            <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:20px;margin-bottom:16px;">
              <h2 style="font-size:15px;color:#1e40af;margin:0 0 8px;font-weight:700;">Any questions?</h2>
              <p style="font-size:14px;color:#374151;margin:0 0 12px;line-height:1.5;">
                Our support team is available to help with any questions about your order. Don't hesitate to reach out directly!
              </p>
              <p style="font-size:14px;margin:4px 0;">
                <a href="mailto:${info.supportEmail}" style="color:#1e40af;font-weight:600;text-decoration:none;">✉ ${info.supportEmail}</a>
              </p>
            </div>

          </div>

          <div style="text-align:center;padding:20px 0;">
            <p style="font-size:12px;color:#9ca3af;margin:0;">Order ${orderRef(info.orderId)} — ${info.storeName}</p>
          </div>
        </div>
      </body>
      </html>
    `,
  });

  if (error) console.error("sendPhysicalShippingEmail failed:", error);
}

// ─── Email 3: Delay notice (sent ~48h after purchase) ─────────────────────────

export async function sendPhysicalDelayEmail(info: PhysicalOrderInfo) {
  const from = process.env.EMAIL_FROM;
  if (!from) return;

  const { error } = await getResend().emails.send({
    from,
    to: info.buyerEmail,
    subject: `📦 Update on your order ${orderRef(info.orderId)}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
      <body style="margin:0;padding:0;background-color:#f4f4f5;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
        <div style="max-width:600px;margin:0 auto;padding:20px;">

          <div style="background:linear-gradient(135deg,#f59e0b,#d97706);border-radius:12px 12px 0 0;padding:40px 30px;text-align:center;">
            <div style="font-size:48px;margin-bottom:10px;">📦</div>
            <h1 style="color:#ffffff;font-size:22px;margin:0;font-weight:700;">Order Update</h1>
            <p style="color:#fef3c7;font-size:14px;margin:8px 0 0;">An important message from the ${info.storeName} team</p>
          </div>

          <div style="background:#ffffff;padding:30px;border-radius:0 0 12px 12px;box-shadow:0 2px 8px rgba(0,0,0,0.06);">

            <p style="font-size:16px;color:#1f2937;margin:0 0 20px;">
              Hi <strong>${info.buyerName}</strong>,
            </p>

            <p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 20px;">
              We want to keep you informed about the status of your order <strong>${orderRef(info.orderId)}</strong>.
            </p>

            <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:20px;margin-bottom:20px;">
              <p style="font-size:15px;color:#78350f;margin:0 0 12px;line-height:1.7;">
                We have identified a <strong>small delay in processing</strong> your order due to the high volume of orders we are currently receiving. We sincerely apologise for the inconvenience.
              </p>
              <p style="font-size:15px;color:#78350f;margin:0;line-height:1.7;">
                Our team is working with <strong>top priority</strong> to ensure your order is dispatched as soon as possible.
              </p>
            </div>

            <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:20px;margin-bottom:20px;">
              <h2 style="font-size:14px;color:#166534;font-weight:700;margin:0 0 12px;">Our commitment to you:</h2>
              <p style="font-size:14px;color:#1f2937;margin:6px 0;line-height:1.6;">✅ Your order is confirmed and will be delivered</p>
              <p style="font-size:14px;color:#1f2937;margin:6px 0;line-height:1.6;">✅ You will receive shipping details by email as soon as your order is dispatched</p>
              <p style="font-size:14px;color:#1f2937;margin:6px 0;line-height:1.6;">✅ Our team is available for any questions or concerns</p>
            </div>

            <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />

            <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:20px;margin-bottom:16px;">
              <h2 style="font-size:15px;color:#1e40af;margin:0 0 8px;font-weight:700;">Contact us directly</h2>
              <p style="font-size:14px;color:#374151;margin:0 0 12px;line-height:1.5;">
                If you have any questions or need further information, please contact our support team. We respond within 24 hours!
              </p>
              <p style="font-size:14px;margin:4px 0;">
                <a href="mailto:${info.supportEmail}" style="color:#1e40af;font-weight:600;text-decoration:none;">✉ ${info.supportEmail}</a>
              </p>
            </div>

            <p style="font-size:13px;color:#6b7280;text-align:center;line-height:1.6;margin:0;">
              We sincerely appreciate your patience and understanding.<br/>
              <strong>${info.storeName} Team</strong>
            </p>

          </div>

          <div style="text-align:center;padding:20px 0;">
            <p style="font-size:12px;color:#9ca3af;margin:0;">Order ${orderRef(info.orderId)} — ${info.storeName}</p>
          </div>
        </div>
      </body>
      </html>
    `,
  });

  if (error) console.error("sendPhysicalDelayEmail failed:", error);
}
