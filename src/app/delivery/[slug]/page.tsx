import { notFound } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import type { Product } from "@/lib/supabase/types";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

async function getProductBySlug(slug: string): Promise<Product | null> {
  const supabase = createServerClient();
  const { data } = await supabase
    .from("products")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  return data as Product | null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  return {
    title: product ? `Access — ${product.name}` : "Access Your Product",
  };
}

export default async function DeliveryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product || !product.delivery_url) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-md px-4 py-12">
        <div className="overflow-hidden rounded-xl bg-white shadow-sm">
          {/* Header */}
          <div
            className="px-6 py-10 text-center"
            style={{
              background: "linear-gradient(135deg, #10b981, #059669)",
            }}
          >
            <div className="text-5xl mb-3">🎉</div>
            <h1 className="text-2xl font-bold text-white">
              Thank You for Your Purchase!
            </h1>
            <p className="mt-2 text-emerald-100 text-sm">
              Your access to {product.name} is ready
            </p>
          </div>

          {/* Body */}
          <div className="px-6 py-8">
            {product.image_url && (
              <img
                src={product.image_url}
                alt={product.name}
                className="mx-auto mb-6 h-24 w-24 rounded-lg object-cover shadow-sm"
              />
            )}

            <p className="text-center text-gray-600 text-sm mb-8">
              Click the button below to access your product. You can also find
              this link in your confirmation email.
            </p>

            {/* Access button */}
            <a
              href={product.delivery_url}
              className="block w-full rounded-lg bg-black px-6 py-4 text-center text-base font-bold text-white hover:bg-gray-800 transition-colors"
            >
              Access Your Product →
            </a>

            {/* Support */}
            <div className="mt-8 rounded-lg bg-gray-50 border border-gray-200 p-4">
              <p className="text-xs text-gray-500 text-center">
                Having trouble? Contact us at{" "}
                <a
                  href={`mailto:${process.env.SUPPORT_EMAIL || ""}`}
                  className="text-black font-medium underline"
                >
                  {process.env.SUPPORT_EMAIL || "support"}
                </a>
                {process.env.SUPPORT_WHATSAPP && (
                  <>
                    {" "}
                    or{" "}
                    <a
                      href={`https://wa.me/${process.env.SUPPORT_WHATSAPP?.replace(/[^0-9]/g, "")}`}
                      className="text-black font-medium underline"
                    >
                      WhatsApp
                    </a>
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
