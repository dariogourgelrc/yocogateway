"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function WhopTestPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startTestCheckout() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/whop/test-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountInCents: 100, currency: "usd" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create checkout");
      window.location.href = data.purchase_url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setLoading(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto mt-16 p-6 space-y-4">
      <h1 className="text-xl font-semibold">Whop Integration — Local Test</h1>
      <p className="text-sm text-gray-600">
        Creates a $1.00 one-time Whop checkout configuration and redirects you to
        Whop&apos;s hosted checkout page. Complete or cancel it, then check your
        terminal logs and the Whop dashboard for the corresponding webhook event.
      </p>
      <Button onClick={startTestCheckout} disabled={loading}>
        {loading ? "Creating checkout..." : "Start test checkout"}
      </Button>
      {error && <p className="text-sm text-red-600">Error: {error}</p>}
    </div>
  );
}
