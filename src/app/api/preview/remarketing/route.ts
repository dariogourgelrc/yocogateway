import { NextRequest, NextResponse } from "next/server";
import { buildRemarketingHtml } from "@/lib/notifications/remarketing-emails";

const SAMPLE_ORDER = {
  id: "preview-order-id",
  buyer_name: "Dario",
  buyer_email: "test@example.com",
  total_amount: 14999,
  currency: "NAD",
  product_name: "Digital Marketing Course",
  product_slug: "digital-marketing-course",
};

export async function GET(request: NextRequest) {
  const emailParam = request.nextUrl.searchParams.get("email") || "1";
  const emailNumber = Math.min(3, Math.max(1, parseInt(emailParam))) as
    | 1
    | 2
    | 3;

  const { html } = buildRemarketingHtml(SAMPLE_ORDER, emailNumber);

  // Wrap with navigation to switch between emails
  const nav = `
    <div style="position:fixed;top:0;left:0;right:0;background:#111;padding:10px 20px;display:flex;gap:12px;align-items:center;z-index:999;font-family:sans-serif;">
      <span style="color:#9ca3af;font-size:13px;">Preview:</span>
      <a href="?email=1" style="color:${emailNumber === 1 ? "#f59e0b" : "#fff"};text-decoration:none;font-size:13px;font-weight:${emailNumber === 1 ? "700" : "400"};">Email 1 (30min)</a>
      <a href="?email=2" style="color:${emailNumber === 2 ? "#f59e0b" : "#fff"};text-decoration:none;font-size:13px;font-weight:${emailNumber === 2 ? "700" : "400"};">Email 2 (24h)</a>
      <a href="?email=3" style="color:${emailNumber === 3 ? "#f59e0b" : "#fff"};text-decoration:none;font-size:13px;font-weight:${emailNumber === 3 ? "700" : "400"};">Email 3 (72h)</a>
    </div>
    <div style="padding-top:50px;">
  `;

  const fullHtml = html.replace("<body", `<body>${nav}<div`) + "</div>";

  return new NextResponse(fullHtml, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
