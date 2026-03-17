import { Resend } from "resend";
import { formatCurrency } from "@/lib/utils/currency";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY!);
}

interface RemarketingOrder {
  id: string;
  buyer_name: string;
  buyer_email: string;
  total_amount: number;
  currency: string;
  product_name: string;
  product_slug: string;
}

const EMAIL_CONFIGS = [
  {
    number: 1,
    subject: (productName: string) =>
      `Did you forget something? — ${productName}`,
    heading: "You left something behind!",
    message: (name: string, productName: string) =>
      `Hi ${name}, we noticed you started your purchase of <strong>${productName}</strong> but didn't finish. No worries — your order is still waiting for you.`,
    cta: "Complete Your Purchase",
    footer:
      "This is just a friendly reminder. If you changed your mind, no action is needed.",
  },
  {
    number: 2,
    subject: (productName: string) =>
      `Your order is still waiting — ${productName}`,
    heading: "Don't miss out!",
    message: (name: string, productName: string) =>
      `Hi ${name}, your purchase of <strong>${productName}</strong> is still waiting for you. Complete your order now and get instant access.`,
    cta: "Finish My Order",
    footer:
      "Many customers who come back love their purchase. Don't let this slip away.",
  },
  {
    number: 3,
    subject: (productName: string) =>
      `Last chance — ${productName}`,
    heading: "Final reminder",
    message: (name: string, productName: string) =>
      `Hi ${name}, this is your last reminder about <strong>${productName}</strong>. After this, we won't send any more emails about this order.`,
    cta: "Get It Now",
    footer:
      "This is the last email we'll send about this order. We hope to see you!",
  },
];

export function buildRemarketingHtml(
  order: RemarketingOrder,
  emailNumber: 1 | 2 | 3
): { subject: string; html: string } {
  const supportEmail =
    process.env.SUPPORT_EMAIL || process.env.EMAIL_FROM || "support@example.com";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const config = EMAIL_CONFIGS[emailNumber - 1];
  const totalFormatted = formatCurrency(order.total_amount, order.currency);
  const checkoutUrl = `${appUrl}/checkout/${order.product_slug}?recover=${order.id}`;

  return {
    subject: config.subject(order.product_name),
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
      <body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">

          <!-- Header -->
          <div style="background: linear-gradient(135deg, #f59e0b, #d97706); border-radius: 12px 12px 0 0; padding: 40px 30px; text-align: center;">
            <div style="font-size: 48px; margin-bottom: 10px;">&#128722;</div>
            <h1 style="color: #ffffff; font-size: 22px; margin: 0; font-weight: 700;">${config.heading}</h1>
          </div>

          <!-- Body -->
          <div style="background-color: #ffffff; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">

            <p style="font-size: 15px; color: #374151; line-height: 1.6; margin: 0 0 20px;">
              ${config.message(order.buyer_name, order.product_name)}
            </p>

            <!-- Order reminder -->
            <div style="background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 4px 0; font-size: 14px; color: #92400e;">Product</td>
                  <td style="padding: 4px 0; font-size: 14px; color: #92400e; text-align: right; font-weight: 600;">${order.product_name}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; font-size: 14px; color: #92400e;">Total</td>
                  <td style="padding: 4px 0; font-size: 14px; color: #92400e; text-align: right; font-weight: 600;">${totalFormatted}</td>
                </tr>
              </table>
            </div>

            <!-- CTA Button -->
            <div style="text-align: center; margin: 28px 0;">
              <a href="${checkoutUrl}"
                 style="display: inline-block; padding: 16px 40px; background-color: #f59e0b; color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 700;">
                ${config.cta}
              </a>
            </div>

            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />

            <p style="font-size: 13px; color: #9ca3af; text-align: center; line-height: 1.5; margin: 0 0 16px;">
              ${config.footer}
            </p>

            <p style="font-size: 13px; color: #9ca3af; text-align: center; margin: 0;">
              Questions? Contact us at
              <a href="mailto:${supportEmail}" style="color: #6b7280;">${supportEmail}</a>
            </p>
          </div>
        </div>
      </body>
      </html>
    `,
  };
}

export async function sendRemarketingEmail(
  order: RemarketingOrder,
  emailNumber: 1 | 2 | 3
): Promise<boolean> {
  const from = process.env.EMAIL_FROM;
  if (!from) {
    console.error("sendRemarketingEmail: EMAIL_FROM not set");
    return false;
  }

  const { subject, html } = buildRemarketingHtml(order, emailNumber);

  const { error } = await getResend().emails.send({
    from,
    to: order.buyer_email,
    subject,
    html,
  });

  if (error) {
    console.error(
      `Remarketing email ${emailNumber} failed for order ${order.id}:`,
      error
    );
    return false;
  }

  return true;
}
