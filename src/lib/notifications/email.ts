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
  const orderDate = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const deliveryLink = getDeliveryLink(product);

  const { error } = await getResend().emails.send({
    from,
    to: order.buyer_email,
    subject: `Compra Confirmada — ${product.name}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
      <body style="margin:0;padding:0;background-color:#f4f4f5;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
        <div style="max-width:600px;margin:0 auto;padding:20px;">

          <div style="background:linear-gradient(135deg,#10b981,#059669);border-radius:12px 12px 0 0;padding:40px 30px;text-align:center;">
            <div style="font-size:48px;margin-bottom:10px;">✓</div>
            <h1 style="color:#ffffff;font-size:24px;margin:0;font-weight:700;">Pagamento Confirmado!</h1>
            <p style="color:#d1fae5;font-size:14px;margin:8px 0 0;">Sua compra foi realizada com sucesso</p>
          </div>

          <div style="background:#ffffff;padding:30px;border-radius:0 0 12px 12px;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
            <p style="font-size:16px;color:#1f2937;margin:0 0 20px;">
              Olá <strong>${order.buyer_name}</strong>, obrigado pela sua compra!
            </p>

            <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:20px;margin-bottom:24px;">
              <h2 style="font-size:13px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 12px;">Detalhes do Pedido</h2>
              <table style="width:100%;border-collapse:collapse;">
                <tr><td style="padding:6px 0;font-size:14px;color:#6b7280;">Loja</td><td style="padding:6px 0;font-size:14px;color:#111827;text-align:right;font-weight:600;">${storeName}</td></tr>
                <tr><td style="padding:6px 0;font-size:14px;color:#6b7280;">Produto</td><td style="padding:6px 0;font-size:14px;color:#111827;text-align:right;font-weight:600;">${product.name}</td></tr>
                <tr><td style="padding:6px 0;font-size:14px;color:#6b7280;">Total Pago</td><td style="padding:6px 0;font-size:14px;color:#111827;text-align:right;font-weight:600;">${totalFormatted}</td></tr>
                <tr><td style="padding:6px 0;font-size:14px;color:#6b7280;">Data</td><td style="padding:6px 0;font-size:14px;color:#111827;text-align:right;">${orderDate}</td></tr>
                <tr><td style="padding:6px 0;font-size:14px;color:#6b7280;">Nº do Pedido</td><td style="padding:6px 0;font-size:12px;color:#9ca3af;text-align:right;font-family:monospace;">${order.id.slice(0, 8).toUpperCase()}</td></tr>
              </table>
            </div>

            ${deliveryLink ? `
            <div style="text-align:center;margin:28px 0;">
              <a href="${deliveryLink}" style="display:inline-block;padding:16px 40px;background-color:#10b981;color:#ffffff;text-decoration:none;border-radius:8px;font-size:16px;font-weight:700;">
                Acessar Produto
              </a>
            </div>
            <p style="font-size:13px;color:#9ca3af;text-align:center;margin:0 0 24px;word-break:break-all;">${deliveryLink}</p>
            ` : ""}

            <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />

            <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:20px;margin-bottom:20px;">
              <h2 style="font-size:15px;color:#1e40af;margin:0 0 8px;font-weight:700;">Precisa de ajuda?</h2>
              <p style="font-size:14px;color:#374151;margin:0 0 14px;line-height:1.5;">
                Em caso de dúvidas, entre em contato diretamente conosco. Estamos aqui para ajudar!
              </p>
              <p style="font-size:14px;margin:4px 0;">
                <a href="mailto:${supportEmail}" style="color:#1e40af;font-weight:600;text-decoration:none;">✉ ${supportEmail}</a>
              </p>
              ${supportPhone ? `<p style="font-size:14px;margin:4px 0;"><a href="${whatsAppLink}" style="color:#16a34a;font-weight:600;text-decoration:none;">💬 ${supportPhone}</a></p>` : ""}
            </div>

            <p style="font-size:12px;color:#9ca3af;text-align:center;line-height:1.6;margin:0;">
              Guarde este email como comprovante da sua compra.<br/>
              Em caso de qualquer dúvida, entre em contato conosco <strong>antes</strong> de acionar seu banco ou operadora de cartão — resolveremos rapidamente!
            </p>
          </div>

          <div style="text-align:center;padding:20px 0;">
            <p style="font-size:12px;color:#9ca3af;margin:0;">Recibo automático de compra — ${product.name}</p>
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
  const orderDate = new Date().toLocaleDateString("pt-BR", {
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
    subject: `Pedido Confirmado — ${product.name} | ${order.id.slice(0, 8).toUpperCase()}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
      <body style="margin:0;padding:0;background-color:#f4f4f5;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
        <div style="max-width:600px;margin:0 auto;padding:20px;">

          <!-- Header -->
          <div style="background:linear-gradient(135deg,#6366f1,#4f46e5);border-radius:12px 12px 0 0;padding:40px 30px;text-align:center;">
            <div style="font-size:48px;margin-bottom:10px;">📦</div>
            <h1 style="color:#ffffff;font-size:24px;margin:0;font-weight:700;">Pedido Confirmado!</h1>
            <p style="color:#e0e7ff;font-size:14px;margin:8px 0 0;">Seu pagamento foi recebido e seu pedido está sendo preparado</p>
          </div>

          <!-- Body -->
          <div style="background:#ffffff;padding:30px;border-radius:0 0 12px 12px;box-shadow:0 2px 8px rgba(0,0,0,0.06);">

            <p style="font-size:16px;color:#1f2937;margin:0 0 24px;">
              Olá <strong>${order.buyer_name}</strong>! Recebemos seu pedido com sucesso. 🎉
            </p>

            <!-- Order Summary -->
            <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:20px;margin-bottom:20px;">
              <h2 style="font-size:13px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 14px;">Resumo do Pedido</h2>
              <table style="width:100%;border-collapse:collapse;">
                <tr><td style="padding:7px 0;font-size:14px;color:#6b7280;border-bottom:1px solid #f3f4f6;">Loja</td><td style="padding:7px 0;font-size:14px;color:#111827;text-align:right;font-weight:600;border-bottom:1px solid #f3f4f6;">${storeName}</td></tr>
                <tr><td style="padding:7px 0;font-size:14px;color:#6b7280;border-bottom:1px solid #f3f4f6;">Produto</td><td style="padding:7px 0;font-size:14px;color:#111827;text-align:right;font-weight:600;border-bottom:1px solid #f3f4f6;">${product.name}</td></tr>
                <tr><td style="padding:7px 0;font-size:14px;color:#6b7280;border-bottom:1px solid #f3f4f6;">Total Pago</td><td style="padding:7px 0;font-size:15px;color:#111827;text-align:right;font-weight:700;border-bottom:1px solid #f3f4f6;">${totalFormatted}</td></tr>
                <tr><td style="padding:7px 0;font-size:14px;color:#6b7280;border-bottom:1px solid #f3f4f6;">Data</td><td style="padding:7px 0;font-size:14px;color:#111827;text-align:right;border-bottom:1px solid #f3f4f6;">${orderDate}</td></tr>
                <tr><td style="padding:7px 0;font-size:13px;color:#6b7280;">Nº do Pedido</td><td style="padding:7px 0;font-size:13px;color:#6366f1;text-align:right;font-family:monospace;font-weight:700;">#${order.id.slice(0, 8).toUpperCase()}</td></tr>
              </table>
            </div>

            <!-- Shipping Address -->
            <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:20px;margin-bottom:20px;">
              <h2 style="font-size:13px;color:#166534;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 10px;">📍 Endereço de Entrega</h2>
              <p style="font-size:14px;color:#1f2937;margin:0;line-height:1.6;font-weight:500;">${addressBlock}</p>
              <p style="font-size:12px;color:#4ade80;margin:10px 0 0;">
                Confirme que o endereço acima está correto. Em caso de erro, entre em contato imediatamente.
              </p>
            </div>

            <!-- What happens next -->
            <div style="background:#fafafa;border:1px solid #e5e7eb;border-radius:8px;padding:20px;margin-bottom:20px;">
              <h2 style="font-size:13px;color:#374151;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 12px;">🚀 Próximos Passos</h2>
              <table style="width:100%;border-collapse:collapse;">
                <tr>
                  <td style="padding:6px 0;font-size:14px;color:#374151;vertical-align:top;">
                    <span style="color:#6366f1;font-weight:700;margin-right:8px;">1.</span>
                    Seu pedido será processado e preparado para envio.
                  </td>
                </tr>
                <tr>
                  <td style="padding:6px 0;font-size:14px;color:#374151;vertical-align:top;">
                    <span style="color:#6366f1;font-weight:700;margin-right:8px;">2.</span>
                    Você receberá uma notificação quando o pedido for despachado.
                  </td>
                </tr>
                <tr>
                  <td style="padding:6px 0;font-size:14px;color:#374151;vertical-align:top;">
                    <span style="color:#6366f1;font-weight:700;margin-right:8px;">3.</span>
                    Em caso de dúvidas, entre em contato pelo suporte abaixo.
                  </td>
                </tr>
              </table>
            </div>

            <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />

            <!-- Support -->
            <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:20px;margin-bottom:20px;">
              <h2 style="font-size:15px;color:#1e40af;margin:0 0 8px;font-weight:700;">Precisa de ajuda?</h2>
              <p style="font-size:14px;color:#374151;margin:0 0 12px;line-height:1.5;">
                Nossa equipe está disponível para resolver qualquer questão sobre seu pedido.
              </p>
              <p style="font-size:14px;margin:4px 0;">
                <a href="mailto:${supportEmail}" style="color:#1e40af;font-weight:600;text-decoration:none;">✉ ${supportEmail}</a>
              </p>
              ${supportPhone ? `<p style="font-size:14px;margin:4px 0;"><a href="${whatsAppLink}" style="color:#16a34a;font-weight:600;text-decoration:none;">💬 ${supportPhone}</a></p>` : ""}
            </div>

            <!-- Anti-chargeback -->
            <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:16px;">
              <p style="font-size:13px;color:#92400e;margin:0;line-height:1.6;text-align:center;">
                <strong>Guarde este email como comprovante do seu pedido.</strong><br/>
                Em caso de qualquer dúvida ou problema, entre em contato conosco <strong>antes</strong> de acionar seu banco ou operadora de cartão.<br/>
                Prometemos resolver rapidamente! 😊
              </p>
            </div>

          </div>

          <!-- Footer -->
          <div style="text-align:center;padding:20px 0;">
            <p style="font-size:12px;color:#9ca3af;margin:0;">
              Pedido <strong>#${order.id.slice(0, 8).toUpperCase()}</strong> — ${storeName}
            </p>
          </div>
        </div>
      </body>
      </html>
    `,
  });

  if (error) console.error("sendPhysicalConfirmationEmail failed:", error);
}
