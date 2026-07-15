import { getCurrentUser } from "@/lib/supabase/server";
import { SettingsForm } from "@/components/admin/settings-form";

export const dynamic = "force-dynamic";

const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL || "";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  const isSuperAdmin = !!SUPER_ADMIN_EMAIL && user?.email === SUPER_ADMIN_EMAIL;
  const userId = user!.id;

  // Webhook URLs for this user's Stripe / Whop dashboards
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  const webhookUrl = `${appUrl}/api/webhooks/stripe/${userId}`;
  const whopWebhookUrl = `${appUrl}/api/webhooks/whop/${userId}`;

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold mb-2">Configurações</h1>
      <p className="text-sm text-gray-500 mb-8">
        Configure suas chaves Stripe e/ou Whop para receber pagamentos.
      </p>
      <SettingsForm
        webhookUrl={webhookUrl}
        whopWebhookUrl={whopWebhookUrl}
        isSuperAdmin={isSuperAdmin}
      />
    </main>
  );
}
