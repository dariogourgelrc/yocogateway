import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import { getProductBySlug } from "@/lib/db/products";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function CancelPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  let product;
  try {
    product = await getProductBySlug(slug);
  } catch {
    notFound();
  }

  // If back redirect URL is set, redirect immediately
  if (product.back_redirect_url) {
    redirect(product.back_redirect_url);
  }

  // Otherwise show a simple cancel message
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="text-center max-w-md">
        <h1 className="text-2xl font-bold text-gray-900">Payment cancelled</h1>
        <p className="mt-2 text-gray-600">
          Your payment was not completed. No charges were made.
        </p>
        <Link
          href={`/checkout/${slug}`}
          className="mt-6 inline-block rounded-md bg-black px-6 py-3 text-sm font-medium text-white hover:bg-gray-800"
        >
          Return to checkout
        </Link>
      </div>
    </div>
  );
}
