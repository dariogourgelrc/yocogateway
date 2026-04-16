"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface SettingsFormProps {
  webhookUrl: string;
  isSuperAdmin: boolean;
}

export function SettingsForm({ webhookUrl }: SettingsFormProps) {
  const [secretKey, setSecretKey] = useState("");
  const [publishableKey, setPublishableKey] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  // Load existing (masked) values
  useEffect(() => {
    fetch("/api/user/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data) {
          setSecretKey(data.stripe_secret_key || "");
          setPublishableKey(data.stripe_publishable_key || "");
          setWebhookSecret(data.stripe_webhook_secret || "");
        }
      })
      .catch(() => {});
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/user/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stripe_secret_key: secretKey,
          stripe_publishable_key: publishableKey,
          stripe_webhook_secret: webhookSecret,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Falha ao salvar");
      }

      const saved = await res.json();
      setSecretKey(saved.stripe_secret_key || "");
      setWebhookSecret(saved.stripe_webhook_secret || "");
      setFeedback({ type: "success", message: "Configurações salvas!" });
    } catch (err) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Erro ao salvar",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCopyWebhook = async () => {
    await navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="text-base font-semibold mb-4">Chaves Stripe</h2>
        <div className="space-y-4">
          <Input
            label="Chave Secreta (Secret Key)"
            type="password"
            value={secretKey}
            onChange={(e) => setSecretKey(e.target.value)}
            placeholder="sk_live_..."
          />
          <Input
            label="Chave Publicável (Publishable Key)"
            value={publishableKey}
            onChange={(e) => setPublishableKey(e.target.value)}
            placeholder="pk_live_..."
          />
          <Input
            label="Webhook Secret"
            type="password"
            value={webhookSecret}
            onChange={(e) => setWebhookSecret(e.target.value)}
            placeholder="whsec_..."
          />
        </div>
      </Card>

      <Card>
        <h2 className="text-base font-semibold mb-1">URL do Webhook</h2>
        <p className="text-sm text-gray-500 mb-3">
          Configure esta URL no painel da Stripe em{" "}
          <span className="font-medium">Developers → Webhooks → Add endpoint</span>.
          Ative o evento{" "}
          <span className="font-mono text-xs bg-gray-100 px-1 py-0.5 rounded">
            checkout.session.completed
          </span>
          .
        </p>
        <div className="flex items-center gap-2">
          <code className="flex-1 text-xs bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 break-all text-gray-700">
            {webhookUrl}
          </code>
          <button
            onClick={handleCopyWebhook}
            className="shrink-0 text-xs rounded-lg border border-gray-200 px-3 py-2 hover:bg-gray-50 transition-colors"
          >
            {copied ? "Copiado!" : "Copiar"}
          </button>
        </div>
      </Card>

      <div className="flex items-center gap-4">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Salvando..." : "Salvar"}
        </Button>
        {feedback && (
          <p
            className={`text-sm ${
              feedback.type === "success" ? "text-green-600" : "text-red-600"
            }`}
          >
            {feedback.message}
          </p>
        )}
      </div>
    </div>
  );
}
