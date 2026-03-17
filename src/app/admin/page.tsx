import Link from "next/link";
import { getAllProducts } from "@/lib/db/products";
import { ProductList } from "@/components/admin/product-list";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const products = await getAllProducts();

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Products</h1>
        <Link href="/admin/create">
          <Button>Create Product</Button>
        </Link>
      </div>
      <ProductList initialProducts={products} />
    </main>
  );
}
