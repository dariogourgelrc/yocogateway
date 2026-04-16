import Link from "next/link";
import { getCurrentUser } from "@/lib/supabase/server";
import { getProductsByUserId } from "@/lib/db/products";
import { ProductList } from "@/components/admin/product-list";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await getCurrentUser();
  const products = await getProductsByUserId(user!.id);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Produtos</h1>
        <Link href="/admin/create">
          <Button>Criar Produto</Button>
        </Link>
      </div>
      <ProductList initialProducts={products} />
    </main>
  );
}
