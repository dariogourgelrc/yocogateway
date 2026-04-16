import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import { UsersManager } from "@/components/admin/users-manager";

export const dynamic = "force-dynamic";

const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL || "";

export default async function UsersPage() {
  const user = await getCurrentUser();

  // Only super admin can access this page
  if (!SUPER_ADMIN_EMAIL || user?.email !== SUPER_ADMIN_EMAIL) {
    redirect("/admin");
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold mb-2">Usuários</h1>
      <p className="text-sm text-gray-500 mb-8">
        Crie e gerencie contas de clientes.
      </p>
      <UsersManager />
    </main>
  );
}
