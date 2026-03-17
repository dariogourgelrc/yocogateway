"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CurrencyDisplay } from "@/components/ui/currency-display";
import { generateSlug } from "@/lib/utils/slug";
import type { ProductOffer } from "@/lib/supabase/types";

interface OffersFormProps {
  productId: string;
  productName: string;
  currency: string;
  existingOffers: ProductOffer[];
}

interface OfferDraft {
  id?: string;
  name: string;
  slug: string;
  price: string;
  back_redirect_url: string;
  slugManual: boolean;
}

function CopyOfferLink({ slug }: { slug: string }) {
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
      className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-200 transition-colors"
      title="Copy checkout link"
    >
      {copied ? (
        <span className="text-green-600">Copied!</span>
      ) : (
        <>
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          Copy
        </>
      )}
    </button>
  );
}

export function OffersForm({
  productId,
  productName,
  currency,
  existingOffers,
}: OffersFormProps) {
  const [offers, setOffers] = useState<ProductOffer[]>(existingOffers);
  const [editing, setEditing] = useState<OfferDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const startNew = () => {
    setEditing({
      name: "",
      slug: "",
      price: "",
      back_redirect_url: "",
      slugManual: false,
    });
    setFeedback(null);
  };

  const startEdit = (offer: ProductOffer) => {
    setEditing({
      id: offer.id,
      name: offer.name,
      slug: offer.slug,
      price: (offer.price / 100).toFixed(2),
      back_redirect_url: offer.back_redirect_url || "",
      slugManual: true,
    });
    setFeedback(null);
  };

  const handleNameChange = (value: string) => {
    if (!editing) return;
    setEditing({
      ...editing,
      name: value,
      slug: editing.slugManual ? editing.slug : generateSlug(value),
    });
  };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    setFeedback(null);

    const priceInCents = Math.round(parseFloat(editing.price || "0") * 100);

    try {
      if (editing.id) {
        // Update existing
        const res = await fetch(`/api/products/${productId}/offers`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            offer_id: editing.id,
            name: editing.name,
            slug: editing.slug,
            price: priceInCents,
            back_redirect_url: editing.back_redirect_url || null,
          }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to update offer");
        }
        const updated = await res.json();
        setOffers(offers.map((o) => (o.id === updated.id ? updated : o)));
      } else {
        // Create new
        const res = await fetch(`/api/products/${productId}/offers`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: editing.name,
            slug: editing.slug,
            price: priceInCents,
            back_redirect_url: editing.back_redirect_url || null,
            sort_order: offers.length,
          }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to create offer");
        }
        const created = await res.json();
        setOffers([...offers, created]);
      }

      setEditing(null);
      setFeedback({
        type: "success",
        message: editing.id ? "Offer updated!" : "Offer created!",
      });
    } catch (err) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Something went wrong",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (offerId: string) => {
    if (!confirm("Delete this offer?")) return;
    setDeleting(offerId);

    try {
      const res = await fetch(`/api/products/${productId}/offers`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offer_id: offerId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete offer");
      }
      setOffers(offers.filter((o) => o.id !== offerId));
      setFeedback({ type: "success", message: "Offer deleted!" });
    } catch (err) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Delete failed",
      });
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Existing offers list */}
      {offers.length > 0 && (
        <Card>
          <div className="divide-y divide-gray-100">
            {offers.map((offer) => (
              <div
                key={offer.id}
                className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
              >
                <div>
                  <p className="font-medium text-sm">{offer.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <CurrencyDisplay
                      amountCents={offer.price}
                      currency={currency}
                    />
                    <CopyOfferLink slug={offer.slug} />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => startEdit(offer)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={deleting === offer.id}
                    onClick={() => handleDelete(offer.id)}
                  >
                    {deleting === offer.id ? "..." : "Delete"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Edit / Create form */}
      {editing ? (
        <Card>
          <h3 className="text-sm font-semibold mb-4">
            {editing.id ? "Edit Offer" : "New Offer"}
          </h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Offer Name"
                value={editing.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder='e.g. 50% OFF'
                required
              />
              <Input
                label="Slug"
                value={editing.slug}
                onChange={(e) =>
                  setEditing({ ...editing, slug: e.target.value, slugManual: true })
                }
                placeholder="curso-marketing-50off"
                required
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label={`Price (${currency})`}
                type="number"
                min={0}
                step="0.01"
                value={editing.price}
                onChange={(e) =>
                  setEditing({ ...editing, price: e.target.value })
                }
                placeholder="74.99"
                required
              />
              <Input
                label="Back Redirect URL (optional)"
                type="url"
                value={editing.back_redirect_url}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    back_redirect_url: e.target.value,
                  })
                }
                placeholder="https://example.com/back"
              />
            </div>
            <div className="flex gap-3">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : editing.id ? "Update" : "Create"}
              </Button>
              <Button
                variant="secondary"
                onClick={() => setEditing(null)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <Button onClick={startNew}>Add Offer</Button>
      )}

      {/* Feedback */}
      {feedback && (
        <div
          className={`rounded-md p-3 text-sm ${
            feedback.type === "success"
              ? "bg-green-50 text-green-800"
              : "bg-red-50 text-red-800"
          }`}
        >
          {feedback.message}
        </div>
      )}
    </div>
  );
}
