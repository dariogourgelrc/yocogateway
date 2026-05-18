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
    subject: `🚚 O seu pedido ${orderRef(info.orderId)} está a ser preparado!`,
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
      <body style="margin:0;padding:0;background-color:#f4f4f5;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
        <div style="max-width:600px;margin:0 auto;padding:20px;">

          <div style="background:linear-gradient(135deg,#0ea5e9,#0284c7);border-radius:12px 12px 0 0;padding:40px 30px;text-align:center;">
            <div style="font-size:48px;margin-bottom:10px;">🚚</div>
            <h1 style="color:#ffffff;font-size:22px;margin:0;font-weight:700;">Pedido em preparação!</h1>
            <p style="color:#e0f2fe;font-size:14px;margin:8px 0 0;">A nossa equipa já está a preparar o seu pedido</p>
          </div>

          <div style="background:#ffffff;padding:30px;border-radius:0 0 12px 12px;box-shadow:0 2px 8px rgba(0,0,0,0.06);">

            <p style="font-size:16px;color:#1f2937;margin:0 0 24px;">
              Olá <strong>${info.buyerName}</strong>! Temos uma ótima notícia para si! 🎉
            </p>

            <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:20px;margin-bottom:20px;">
              <h2 style="font-size:13px;color:#0369a1;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 12px;">📋 O seu Pedido</h2>
              <table style="width:100%;border-collapse:collapse;">
                <tr><td style="padding:6px 0;font-size:14px;color:#6b7280;">Produto</td><td style="padding:6px 0;font-size:14px;color:#111827;text-align:right;font-weight:600;">${info.productName}</td></tr>
                <tr><td style="padding:6px 0;font-size:14px;color:#6b7280;">Total Pago</td><td style="padding:6px 0;font-size:14px;color:#111827;text-align:right;font-weight:700;">${formatCurrency(info.totalAmount, info.currency)}</td></tr>
                <tr><td style="padding:6px 0;font-size:13px;color:#6b7280;">Referência</td><td style="padding:6px 0;font-size:13px;color:#0369a1;text-align:right;font-family:monospace;font-weight:700;">${orderRef(info.orderId)}</td></tr>
              </table>
            </div>

            <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:20px;margin-bottom:20px;">
              <h2 style="font-size:13px;color:#166534;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 10px;">📍 Endereço de Entrega Confirmado</h2>
              <p style="font-size:14px;color:#1f2937;margin:0;line-height:1.6;font-weight:500;">${addressBlock}</p>
            </div>

            <div style="background:#fafafa;border:1px solid #e5e7eb;border-radius:8px;padding:20px;margin-bottom:20px;">
              <h2 style="font-size:13px;color:#374151;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 12px;">🗓️ Próximos Passos</h2>
              <div style="display:flex;flex-direction:column;gap:10px;">
                <div style="padding:10px 0;border-bottom:1px solid #f3f4f6;font-size:14px;color:#374151;">
                  <strong style="color:#0284c7;">Agora:</strong> O seu pedido está a ser separado e embalado pela nossa equipa.
                </div>
                <div style="padding:10px 0;border-bottom:1px solid #f3f4f6;font-size:14px;color:#374151;">
                  <strong style="color:#0284c7;">Em breve:</strong> Receberá um email com os detalhes do envio e código de rastreamento.
                </div>
                <div style="padding:10px 0;font-size:14px;color:#374151;">
                  <strong style="color:#0284c7;">Entrega:</strong> Após o despacho, o pedido será entregue conforme o prazo acordado.
                </div>
              </div>
            </div>

            <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />

            <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:20px;margin-bottom:16px;">
              <h2 style="font-size:15px;color:#1e40af;margin:0 0 8px;font-weight:700;">Alguma questão?</h2>
              <p style="font-size:14px;color:#374151;margin:0 0 12px;line-height:1.5;">
                A nossa equipa de suporte está disponível para ajudar com qualquer dúvida sobre o seu pedido. Não hesite em contactar-nos diretamente!
              </p>
              <p style="font-size:14px;margin:4px 0;">
                <a href="mailto:${info.supportEmail}" style="color:#1e40af;font-weight:600;text-decoration:none;">✉ ${info.supportEmail}</a>
              </p>
              ${info.supportPhone ? `<p style="font-size:14px;margin:4px 0;"><a href="${info.whatsAppLink}" style="color:#16a34a;font-weight:600;text-decoration:none;">💬 ${info.supportPhone}</a></p>` : ""}
            </div>

          </div>

          <div style="text-align:center;padding:20px 0;">
            <p style="font-size:12px;color:#9ca3af;margin:0;">Pedido ${orderRef(info.orderId)} — ${info.storeName}</p>
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
    subject: `📦 Atualização do seu pedido ${orderRef(info.orderId)}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
      <body style="margin:0;padding:0;background-color:#f4f4f5;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
        <div style="max-width:600px;margin:0 auto;padding:20px;">

          <div style="background:linear-gradient(135deg,#f59e0b,#d97706);border-radius:12px 12px 0 0;padding:40px 30px;text-align:center;">
            <div style="font-size:48px;margin-bottom:10px;">📦</div>
            <h1 style="color:#ffffff;font-size:22px;margin:0;font-weight:700;">Atualização do seu pedido</h1>
            <p style="color:#fef3c7;font-size:14px;margin:8px 0 0;">Uma mensagem importante da equipa ${info.storeName}</p>
          </div>

          <div style="background:#ffffff;padding:30px;border-radius:0 0 12px 12px;box-shadow:0 2px 8px rgba(0,0,0,0.06);">

            <p style="font-size:16px;color:#1f2937;margin:0 0 20px;">
              Olá <strong>${info.buyerName}</strong>,
            </p>

            <p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 20px;">
              Gostaríamos de o manter informado sobre o estado do seu pedido <strong>${orderRef(info.orderId)}</strong>.
            </p>

            <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:20px;margin-bottom:20px;">
              <p style="font-size:15px;color:#78350f;margin:0 0 12px;line-height:1.7;">
                Verificámos um <strong>pequeno atraso no processamento</strong> do seu pedido devido ao elevado volume de encomendas que estamos a receber. Pedimos desculpa pelo inconveniente.
              </p>
              <p style="font-size:15px;color:#78350f;margin:0;line-height:1.7;">
                A nossa equipa já está a trabalhar com <strong>prioridade máxima</strong> para garantir que o seu pedido seja despachado o mais brevemente possível.
              </p>
            </div>

            <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:20px;margin-bottom:20px;">
              <h2 style="font-size:14px;color:#166534;font-weight:700;margin:0 0 12px;">O que garantimos:</h2>
              <p style="font-size:14px;color:#1f2937;margin:6px 0;line-height:1.6;">✅ O seu pedido está confirmado e será entregue</p>
              <p style="font-size:14px;color:#1f2937;margin:6px 0;line-height:1.6;">✅ Irá receber os detalhes do envio por email assim que o pedido for despachado</p>
              <p style="font-size:14px;color:#1f2937;margin:6px 0;line-height:1.6;">✅ A nossa equipa está à disposição para qualquer esclarecimento</p>
            </div>

            <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />

            <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:20px;margin-bottom:16px;">
              <h2 style="font-size:15px;color:#1e40af;margin:0 0 8px;font-weight:700;">Fale connosco diretamente</h2>
              <p style="font-size:14px;color:#374151;margin:0 0 12px;line-height:1.5;">
                Se tiver alguma dúvida ou precisar de mais informações, contacte a nossa equipa de suporte. Respondemos em menos de 24 horas!
              </p>
              <p style="font-size:14px;margin:4px 0;">
                <a href="mailto:${info.supportEmail}" style="color:#1e40af;font-weight:600;text-decoration:none;">✉ ${info.supportEmail}</a>
              </p>
              ${info.supportPhone ? `<p style="font-size:14px;margin:4px 0;"><a href="${info.whatsAppLink}" style="color:#16a34a;font-weight:600;text-decoration:none;">💬 ${info.supportPhone}</a></p>` : ""}
            </div>

            <p style="font-size:13px;color:#6b7280;text-align:center;line-height:1.6;margin:0;">
              Agradecemos sinceramente a sua paciência e compreensão.<br/>
              <strong>${info.storeName}</strong>
            </p>

          </div>

          <div style="text-align:center;padding:20px 0;">
            <p style="font-size:12px;color:#9ca3af;margin:0;">Pedido ${orderRef(info.orderId)} — ${info.storeName}</p>
          </div>
        </div>
      </body>
      </html>
    `,
  });

  if (error) console.error("sendPhysicalDelayEmail failed:", error);
}
