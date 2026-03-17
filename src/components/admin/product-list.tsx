"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CurrencyDisplay } from "@/components/ui/currency-display";
import type { Product } from "@/lib/supabase/types";

interface ProductListProps {
  initialProducts: Product[];
}

function CopyLinkButton({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const url = `${window.location.origin}/checkout/${slug}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200 transition-colors"
      title="Copy checkout link"
    >
      {copied ? (
        <>
          <svg className="h-3.5 w-3.5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-green-600">Copied!</span>
        </>
      ) : (
        <>
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          Copy Link
        </>
      )}
    </button>
  );
}

export function ProductList({ initialProducts }: ProductListProps) {
  const router = useRouter();
  const [products, setProducts] = useState(initialProducts);
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;

    setDeleting(id);
    try {
      const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Delete failed");
      }
      setProducts(products.filter((p) => p.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeleting(null);
    }
  };

  if (products.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">No products yet.</p>
        <Button onClick={() => router.push("/admin/create")}>
          Create your first product
        </Button>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left">
            <th className="pb-3 pr-4 font-medium text-gray-500">Name</th>
            <th className="pb-3 pr-4 font-medium text-gray-500">Checkout Link</th>
            <th className="pb-3 pr-4 font-medium text-gray-500">Price</th>
            <th className="pb-3 pr-4 font-medium text-gray-500">Created</th>
            <th className="pb-3 font-medium text-gray-500">Actions</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr key={product.id} className="border-b border-gray-100">
              <td className="py-3 pr-4 font-medium">{product.name}</td>
              <td className="py-3 pr-4">
                <CopyLinkButton slug={product.slug} />
              </td>
              <td className="py-3 pr-4">
                <CurrencyDisplay
                  amountCents={product.price}
                  currency={product.currency}
                />
              </td>
              <td className="py-3 pr-4 text-gray-500">
                {new Date(product.created_at).toLocaleDateString()}
              </td>
              <td className="py-3">
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      router.push(`/admin/${product.id}/edit`)
                    }
                  >
                    Edit
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      router.push(`/admin/${product.id}/offers`)
                    }
                  >
                    Offers
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      router.push(`/admin/${product.id}/integrations`)
                    }
                  >
                    Integrations
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={deleting === product.id}
                    onClick={() => handleDelete(product.id)}
                  >
                    {deleting === product.id ? "..." : "Delete"}
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
