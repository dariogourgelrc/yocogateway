import { Resend } from "resend";
import type { OrderWithItems, Product } from "@/lib/supabase/types";
import { formatCurrency } from "@/lib/utils/currency";

function getDeliveryLink(product: Product): string | null {
  if (!product.delivery_url) return null;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return `${appUrl}/delivery/${product.slug}`;
}

function getResend() {
  return new Resend(process.env.RESEND_API_KEY!);
}

export async function sendConfirmationEmail(
  order: OrderWithItems,
  product: Product
) {
  const from = process.env.EMAIL_FROM;
  if (!from) {
    console.error("sendConfirmationEmail: EMAIL_FROM not set");
    return;
  }

  if (product.type === "physical") {
    return sendPhysicalConfirmationEmail(order, product, from);
  }
  return sendDigitalConfirmationEmail(order, product, from);
}

// ─── Digital product email ────────────────────────────────────────────────────

async function sendDigitalConfirmationEmail(
  order: OrderWithItems,
  product: Product,
  from: string
) {
  const supportEmail = product.support_email || process.env.SUPPORT_EMAIL || from;
  const supportPhone = product.support_phone || process.env.SUPPORT_WHATSAPP || "";
  const storeName = product.store_name || product.name;
  const whatsAppLink = supportPhone
    ? `https://wa.me/${supportPhone.replace(/[^0-9]/g, "")}`
    : "";

  const totalFormatted = formatCurrency(order.total_amount, order.currency);
  const orderDate = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const deliveryLink = getDeliveryLink(product);

  const { error } = await getResend().emails.send({
    from,
    to: order.buyer_email,
    subject: `Purchase Confirmed — ${product.name}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
      <body style="margin:0;padding:0;background-color:#f4f4f5;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
        <div style="max-width:600px;margin:0 auto;padding:20px;">

          <div style="background:linear-gradient(135deg,#10b981,#059669);border-radius:12px 12px 0 0;padding:40px 30px;text-align:center;">
            <div style="font-size:48px;margin-bottom:10px;">✓</div>
            <h1 style="color:#ffffff;font-size:24px;margin:0;font-weight:700;">Payment Confirmed!</h1>
            <p style="color:#d1fae5;font-size:14px;margin:8px 0 0;">Your purchase was completed successfully</p>
          </div>

          <div style="background:#ffffff;padding:30px;border-radius:0 0 12px 12px;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
            <p style="font-size:16px;color:#1f2937;margin:0 0 20px;">
              Hi <strong>${order.buyer_name}</strong>, thank you for your purchase!
            </p>

            <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:20px;margin-bottom:24px;">
              <h2 style="font-size:13px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 12px;">Order Details</h2>
              <table style="width:100%;border-collapse:collapse;">
                <tr><td style="padding:6px 0;font-size:14px;color:#6b7280;">Store</td><td style="padding:6px 0;font-size:14px;color:#111827;text-align:right;font-weight:600;">${storeName}</td></tr>
                <tr><td style="padding:6px 0;font-size:14px;color:#6b7280;">Product</td><td style="padding:6px 0;font-size:14px;color:#111827;text-align:right;font-weight:600;">${product.name}</td></tr>
                <tr><td style="padding:6px 0;font-size:14px;color:#6b7280;">Total Paid</td><td style="padding:6px 0;font-size:14px;color:#111827;text-align:right;font-weight:600;">${totalFormatted}</td></tr>
                <tr><td style="padding:6px 0;font-size:14px;color:#6b7280;">Date</td><td style="padding:6px 0;font-size:14px;color:#111827;text-align:right;">${orderDate}</td></tr>
                <tr><td style="padding:6px 0;font-size:14px;color:#6b7280;">Order No.</td><td style="padding:6px 0;font-size:12px;color:#9ca3af;text-align:right;font-family:monospace;">${order.id.slice(0, 8).toUpperCase()}</td></tr>
              </table>
            </div>

            ${deliveryLink ? `
            <div style="text-align:center;margin:28px 0;">
              <a href="${deliveryLink}" style="display:inline-block;padding:16px 40px;background-color:#10b981;color:#ffffff;text-decoration:none;border-radius:8px;font-size:16px;font-weight:700;">
                Access Your Product
              </a>
            </div>
            <p style="font-size:13px;color:#9ca3af;text-align:center;margin:0 0 24px;word-break:break-all;">${deliveryLink}</p>
            ` : ""}

            <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />

            <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:20px;margin-bottom:20px;">
              <h2 style="font-size:15px;color:#1e40af;margin:0 0 8px;font-weight:700;">Need help?</h2>
              <p style="font-size:14px;color:#374151;margin:0 0 14px;line-height:1.5;">
                If you have any questions, contact us directly. We're here to help!
              </p>
              <p style="font-size:14px;margin:4px 0;">
                <a href="mailto:${supportEmail}" style="color:#1e40af;font-weight:600;text-decoration:none;">✉ ${supportEmail}</a>
              </p>
            </div>

            <p style="font-size:12px;color:#9ca3af;text-align:center;line-height:1.6;margin:0;">
              Keep this email as proof of your purchase.<br/>
              For any questions or concerns, contact us <strong>directly</strong> — we resolve everything quickly!
            </p>
          </div>

          <div style="text-align:center;padding:20px 0;">
            <p style="font-size:12px;color:#9ca3af;margin:0;">Automatic purchase receipt — ${product.name}</p>
          </div>
        </div>
      </body>
      </html>
    `,
  });

  if (error) console.error("sendDigitalConfirmationEmail failed:", error);
}

// ─── Physical product email ───────────────────────────────────────────────────

async function sendPhysicalConfirmationEmail(
  order: OrderWithItems,
  product: Product,
  from: string
) {
  const supportEmail = product.support_email || process.env.SUPPORT_EMAIL || from;
  const supportPhone = product.support_phone || process.env.SUPPORT_WHATSAPP || "";
  const storeName = product.store_name || product.name;
  const whatsAppLink = supportPhone
    ? `https://wa.me/${supportPhone.replace(/[^0-9]/g, "")}`
    : "";

  const totalFormatted = formatCurrency(order.total_amount, order.currency);
  const orderDate = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const addr = order.shipping_address;
  const addressBlock = addr
    ? `${addr.address_line}, ${addr.city}, ${addr.postal_code}, ${addr.country}`
    : "—";

  const { error } = await getResend().emails.send({
    from,
    to: order.buyer_email,
    subject: `🎉 Order Confirmed — ${product.name} | #${order.id.slice(0, 8).toUpperCase()}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
      <body style="margin:0;padding:0;background-color:#f4f4f5;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
        <div style="max-width:600px;margin:0 auto;padding:20px;">

          <!-- Header -->
          <div style="background:linear-gradient(135deg,#6366f1,#4f46e5);border-radius:12px 12px 0 0;padding:40px 30px;text-align:center;">
            <div style="font-size:52px;margin-bottom:12px;">🎉</div>
            <h1 style="color:#ffffff;font-size:26px;margin:0;font-weight:700;">Congratulations, ${order.buyer_name}!</h1>
            <p style="color:#e0e7ff;font-size:15px;margin:10px 0 0;">Your order has been confirmed. Get ready!</p>
          </div>

          <!-- Body -->
          <div style="background:#ffffff;padding:30px;border-radius:0 0 12px 12px;box-shadow:0 2px 8px rgba(0,0,0,0.06);">

            <p style="font-size:16px;color:#1f2937;margin:0 0 8px;line-height:1.6;">
              We're thrilled about your purchase! Your order is now registered in our system and our team will start preparing everything for you.
            </p>
            <p style="font-size:15px;color:#6366f1;font-weight:600;margin:0 0 24px;">
              You'll receive email updates at every step. Keep an eye on your inbox! 📬
            </p>

            <!-- Order Summary -->
            <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:20px;margin-bottom:20px;">
              <h2 style="font-size:13px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 14px;">Order Summary</h2>
              <table style="width:100%;border-collapse:collapse;">
                <tr><td style="padding:7px 0;font-size:14px;color:#6b7280;border-bottom:1px solid #f3f4f6;">Store</td><td style="padding:7px 0;font-size:14px;color:#111827;text-align:right;font-weight:600;border-bottom:1px solid #f3f4f6;">${storeName}</td></tr>
                <tr><td style="padding:7px 0;font-size:14px;color:#6b7280;border-bottom:1px solid #f3f4f6;">Product</td><td style="padding:7px 0;font-size:14px;color:#111827;text-align:right;font-weight:600;border-bottom:1px solid #f3f4f6;">${product.name}</td></tr>
                <tr><td style="padding:7px 0;font-size:14px;color:#6b7280;border-bottom:1px solid #f3f4f6;">Total Paid</td><td style="padding:7px 0;font-size:15px;color:#111827;text-align:right;font-weight:700;border-bottom:1px solid #f3f4f6;">${totalFormatted}</td></tr>
                <tr><td style="padding:7px 0;font-size:14px;color:#6b7280;border-bottom:1px solid #f3f4f6;">Date</td><td style="padding:7px 0;font-size:14px;color:#111827;text-align:right;border-bottom:1px solid #f3f4f6;">${orderDate}</td></tr>
                <tr><td style="padding:7px 0;font-size:13px;color:#6b7280;">Order No.</td><td style="padding:7px 0;font-size:13px;color:#6366f1;text-align:right;font-family:monospace;font-weight:700;">#${order.id.slice(0, 8).toUpperCase()}</td></tr>
              </table>
            </div>

            <!-- Shipping Address -->
            <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:20px;margin-bottom:20px;">
              <h2 style="font-size:13px;color:#166534;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 10px;">📍 Delivery Address</h2>
              <p style="font-size:14px;color:#1f2937;margin:0 0 8px;line-height:1.6;font-weight:500;">${addressBlock}</p>
              <p style="font-size:12px;color:#16a34a;margin:0;">If you need to correct this address, please contact us immediately using the details below.</p>
            </div>

            <!-- What happens next -->
            <div style="background:#fafafa;border:1px solid #e5e7eb;border-radius:8px;padding:20px;margin-bottom:20px;">
              <h2 style="font-size:13px;color:#374151;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 14px;">🚀 What happens next</h2>
              <div style="padding:10px 0;border-bottom:1px solid #f3f4f6;">
                <p style="font-size:14px;color:#374151;margin:0;"><span style="color:#6366f1;font-weight:700;">1.</span> Our team will carefully prepare and pack your order.</p>
              </div>
              <div style="padding:10px 0;border-bottom:1px solid #f3f4f6;">
                <p style="font-size:14px;color:#374151;margin:0;"><span style="color:#6366f1;font-weight:700;">2.</span> You will receive an email with shipping details within the next few hours.</p>
              </div>
              <div style="padding:10px 0;">
                <p style="font-size:14px;color:#374151;margin:0;"><span style="color:#6366f1;font-weight:700;">3.</span> Your order will be delivered to the address above.</p>
              </div>
            </div>

            <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />

            <!-- Support -->
            <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:20px;margin-bottom:16px;">
              <h2 style="font-size:15px;color:#1e40af;margin:0 0 8px;font-weight:700;">Any questions about your order?</h2>
              <p style="font-size:14px;color:#374151;margin:0 0 14px;line-height:1.5;">
                Our support team is always available for you. Guaranteed response within 24 hours!
              </p>
              <p style="font-size:14px;margin:6px 0;">
                <a href="mailto:${supportEmail}" style="color:#1e40af;font-weight:600;text-decoration:none;">✉ ${supportEmail}</a>
              </p>
            </div>

            <!-- Anti-chargeback -->
            <div style="background:#f5f3ff;border:1px solid #ddd6fe;border-radius:8px;padding:16px;">
              <p style="font-size:13px;color:#4c1d95;margin:0;line-height:1.7;text-align:center;">
                <strong>Keep this email as proof of your purchase.</strong><br/>
                For any question, issue or change request — contact us <strong>directly</strong>.<br/>
                Our team resolves everything quickly! 😊
              </p>
            </div>

          </div>

          <!-- Footer -->
          <div style="text-align:center;padding:20px 0;">
            <p style="font-size:12px;color:#9ca3af;margin:0;">
              Order <strong>#${order.id.slice(0, 8).toUpperCase()}</strong> — ${storeName}
            </p>
          </div>
        </div>
      </body>
      </html>
    `,
  });

  if (error) console.error("sendPhysicalConfirmationEmail failed:", error);
}
