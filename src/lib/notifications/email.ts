import { Resend } from "resend";
import type { OrderWithItems, Product } from "@/lib/supabase/types";
import { formatCurrency } from "@/lib/utils/currency";

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

  const supportEmail = process.env.SUPPORT_EMAIL || from;
  const supportWhatsApp = process.env.SUPPORT_WHATSAPP || "";
  const whatsAppLink = supportWhatsApp
    ? `https://wa.me/${supportWhatsApp.replace(/[^0-9]/g, "")}`
    : "";

  const totalFormatted = formatCurrency(order.total_amount, order.currency);
  const orderDate = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const { error } = await getResend().emails.send({
    from,
    to: order.buyer_email,
    subject: `Purchase Confirmed — ${product.name}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
      <body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">

          <!-- Header -->
          <div style="background: linear-gradient(135deg, #10b981, #059669); border-radius: 12px 12px 0 0; padding: 40px 30px; text-align: center;">
            <div style="font-size: 48px; margin-bottom: 10px;">&#10003;</div>
            <h1 style="color: #ffffff; font-size: 24px; margin: 0; font-weight: 700;">Payment Confirmed!</h1>
            <p style="color: #d1fae5; font-size: 14px; margin: 8px 0 0;">Your purchase was successful</p>
          </div>

          <!-- Body -->
          <div style="background-color: #ffffff; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">

            <p style="font-size: 16px; color: #1f2937; margin: 0 0 20px;">
              Hi <strong>${order.buyer_name}</strong>, thank you for your purchase!
            </p>

            <!-- Order Details -->
            <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
              <h2 style="font-size: 14px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 12px;">Order Details</h2>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 6px 0; font-size: 14px; color: #6b7280;">Product</td>
                  <td style="padding: 6px 0; font-size: 14px; color: #111827; text-align: right; font-weight: 600;">${product.name}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-size: 14px; color: #6b7280;">Total Paid</td>
                  <td style="padding: 6px 0; font-size: 14px; color: #111827; text-align: right; font-weight: 600;">${totalFormatted}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-size: 14px; color: #6b7280;">Date</td>
                  <td style="padding: 6px 0; font-size: 14px; color: #111827; text-align: right;">${orderDate}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-size: 14px; color: #6b7280;">Order ID</td>
                  <td style="padding: 6px 0; font-size: 12px; color: #9ca3af; text-align: right; font-family: monospace;">${order.id.slice(0, 8).toUpperCase()}</td>
                </tr>
              </table>
            </div>

            ${
              product.delivery_url
                ? `
            <!-- Access Product -->
            <div style="text-align: center; margin: 28px 0;">
              <a href="${product.delivery_url}"
                 style="display: inline-block; padding: 16px 40px; background-color: #10b981; color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 700; letter-spacing: 0.3px;">
                Access Your Product
              </a>
            </div>
            <p style="font-size: 13px; color: #9ca3af; text-align: center; margin: 0 0 24px; word-break: break-all;">
              ${product.delivery_url}
            </p>
            `
                : ""
            }

            <!-- Divider -->
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />

            <!-- Support Section -->
            <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
              <h2 style="font-size: 15px; color: #1e40af; margin: 0 0 10px; font-weight: 700;">Need Help? We're Here for You!</h2>
              <p style="font-size: 14px; color: #374151; margin: 0 0 14px; line-height: 1.5;">
                If you have any questions about your purchase, need assistance accessing your product, or want a refund, please contact us directly. We're happy to help!
              </p>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0;">
                    <a href="mailto:${supportEmail}" style="display: inline-flex; align-items: center; text-decoration: none; font-size: 14px; color: #1e40af; font-weight: 600;">
                      &#9993; ${supportEmail}
                    </a>
                  </td>
                </tr>
                ${
                  whatsAppLink
                    ? `
                <tr>
                  <td style="padding: 8px 0;">
                    <a href="${whatsAppLink}" style="display: inline-block; padding: 10px 24px; background-color: #25d366; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 700;">
                      &#128172; Chat on WhatsApp
                    </a>
                  </td>
                </tr>
                `
                    : ""
                }
              </table>
            </div>

            <p style="font-size: 13px; color: #9ca3af; text-align: center; line-height: 1.6; margin: 0;">
              Please contact us before disputing the charge with your bank.<br/>
              We will resolve any issue quickly and hassle-free.
            </p>
          </div>

          <!-- Footer -->
          <div style="text-align: center; padding: 20px 0;">
            <p style="font-size: 12px; color: #9ca3af; margin: 0;">
              This is an automated receipt for your purchase of ${product.name}.
            </p>
          </div>
        </div>
      </body>
      </html>
    `,
  });

  if (error) {
    console.error("sendConfirmationEmail failed:", error);
  }
}
