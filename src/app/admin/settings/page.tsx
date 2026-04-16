import { getCurrentUser } from "@/lib/supabase/server";
import { SettingsForm } from "@/components/admin/settings-form";

export const dynamic = "force-dynamic";

const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL || "";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  const isSuperAdmin = !!SUPER_ADMIN_EMAIL && user?.email === SUPER_ADMIN_EMAIL;
  const userId = user!.id;

  // Webhook URL for this user's Stripe dashboard
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  const webhookUrl = `${appUrl}/api/webhooks/stripe/${userId}`;

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold mb-2">Configurações</h1>
      <p className="text-sm text-gray-500 mb-8">
        Configure suas chaves Stripe para receber pagamentos.
      </p>
      <SettingsForm webhookUrl={webhookUrl} isSuperAdmin={isSuperAdmin} />
    </main>
  );
}
