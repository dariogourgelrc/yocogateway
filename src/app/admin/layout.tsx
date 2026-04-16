import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import { AdminHeader } from "@/components/admin/admin-header";

const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL || "";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const isSuperAdmin =
    !!SUPER_ADMIN_EMAIL && user.email === SUPER_ADMIN_EMAIL;

  return (
    <>
      <AdminHeader email={user.email!} isSuperAdmin={isSuperAdmin} />
      {children}
    </>
  );
}
