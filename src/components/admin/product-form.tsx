"use client";

import { FormEvent, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ImageUpload } from "@/components/ui/image-upload";
import { Label } from "@/components/ui/label";
import { OrderBumpForm, type OrderBumpData } from "./order-bump-form";
import { generateSlug } from "@/lib/utils/slug";
import type {
  ProductOffer,
  ProductWithBumpsAndTrackers,
} from "@/lib/supabase/types";

interface ProductFormProps {
  mode: "create" | "edit";
  initialData?: ProductWithBumpsAndTrackers;
  offers?: ProductOffer[];
}

export function ProductForm({ mode, initialData, offers = [] }: ProductFormProps) {
  const router = useRouter();

  const [name, setName] = useState(initialData?.name || "");
  const [slug, setSlug] = useState(initialData?.slug || "");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [description, setDescription] = useState(
    initialData?.description || ""
  );
  const [price, setPrice] = useState(
    initialData?.price ? (initialData.price / 100).toFixed(2) : ""
  );
  const [currency, setCurrency] = useState(initialData?.currency || "NAD");
  const [imageUrl, setImageUrl] = useState(initialData?.image_url || "");
  const [deliveryUrl, setDeliveryUrl] = useState(
    initialData?.delivery_url || ""
  );
  const [upsellUrl, setUpsellUrl] = useState(initialData?.upsell_url || "");
  const [backRedirectUrl, setBackRedirectUrl] = useState(
    initialData?.back_redirect_url || ""
  );

  const [regionalPricing, setRegionalPricing] = useState<Record<string, string>>(() => {
    const rp = initialData?.regional_pricing || {};
    return {
      ZAR: rp.ZAR ? (rp.ZAR / 100).toFixed(2) : "",
      BWP: rp.BWP ? (rp.BWP / 100).toFixed(2) : "",
    };
  });

  const [remarketingEnabled, setRemarketingEnabled] = useState(
    initialData?.remarketing_enabled || false
  );
  const [remarketingOffer1, setRemarketingOffer1] = useState(
    initialData?.remarketing_offer_1 || ""
  );
  const [remarketingOffer2, setRemarketingOffer2] = useState(
    initialData?.remarketing_offer_2 || ""
  );
  const [remarketingOffer3, setRemarketingOffer3] = useState(
    initialData?.remarketing_offer_3 || ""
  );

  const [productType, setProductType] = useState<"digital" | "physical">(
    initialData?.type || "digital"
  );
  const [storeName, setStoreName] = useState(initialData?.store_name || "");
  const [supportEmail, setSupportEmail] = useState(initialData?.support_email || "");
  const [supportPhone, setSupportPhone] = useState(initialData?.support_phone || "");

  const [orderBumps, setOrderBumps] = useState<OrderBumpData[]>(
    initialData?.order_bumps?.map((b) => ({
      id: b.id,
      name: b.name,
      description: b.description,
      price: b.price ? (b.price / 100).toFixed(2) : "",
      image_url: b.image_url,
      sort_order: b.sort_order,
    })) || []
  );

  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const handleNameChange = useCallback(
    (value: string) => {
      setName(value);
      if (!slugManuallyEdited) {
        setSlug(generateSlug(value));
      }
    },
    [slugManuallyEdited]
  );

  const handleSlugChange = useCallback((value: string) => {
    setSlug(value);
    setSlugManuallyEdited(true);
  }, []);

  const addOrderBump = () => {
    setOrderBumps([
      ...orderBumps,
      {
        name: "",
        description: "",
        price: "",
        image_url: "",
        sort_order: orderBumps.length,
      },
    ]);
  };

  const updateOrderBump = (index: number, data: OrderBumpData) => {
    setOrderBumps(orderBumps.map((b, i) => (i === index ? data : b)));
  };

  const removeOrderBump = (index: number) => {
    setOrderBumps(orderBumps.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);

    const body = {
      type: productType,
      name,
      slug,
      description,
      price: Math.round(parseFloat(price || "0") * 100),
      currency,
      image_url: imageUrl,
      delivery_url: productType === "digital" ? deliveryUrl : "",
      upsell_url: upsellUrl || null,
      back_redirect_url: backRedirectUrl || null,
      regional_pricing: Object.fromEntries(
        Object.entries(regionalPricing)
          .filter(([, v]) => v && parseFloat(v) > 0)
          .map(([k, v]) => [k, Math.round(parseFloat(v) * 100)])
      ),
      store_name: storeName,
      support_email: supportEmail,
      support_phone: supportPhone,
      remarketing_enabled: remarketingEnabled,
      remarketing_offer_1: remarketingOffer1 || null,
      remarketing_offer_2: remarketingOffer2 || null,
      remarketing_offer_3: remarketingOffer3 || null,
      order_bumps: orderBumps.map((b) => ({
        ...b,
        price: Math.round(parseFloat(b.price as unknown as string || "0") * 100),
      })),
    };

    try {
      const url =
        mode === "create"
          ? "/api/products"
          : `/api/products/${initialData!.id}`;
      const method = mode === "create" ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save product");
      }

      setFeedback({
        type: "success",
        message:
          mode === "create"
            ? "Product created successfully!"
            : "Product updated successfully!",
      });

      if (mode === "create") {
        router.push("/admin");
      }
    } catch (err) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Something went wrong",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Product type toggle */}
      <Card>
        <h2 className="mb-3 text-lg font-semibold">Tipo de Produto</h2>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setProductType("digital")}
            className={`flex-1 rounded-lg border-2 py-3 text-sm font-medium transition-colors ${
              productType === "digital"
                ? "border-black bg-black text-white"
                : "border-gray-200 text-gray-600 hover:border-gray-400"
            }`}
          >
            Digital
          </button>
          <button
            type="button"
            onClick={() => setProductType("physical")}
            className={`flex-1 rounded-lg border-2 py-3 text-sm font-medium transition-colors ${
              productType === "physical"
                ? "border-black bg-black text-white"
                : "border-gray-200 text-gray-600 hover:border-gray-400"
            }`}
          >
            Físico
          </button>
        </div>
      </Card>

      {/* Product info */}
      <Card>
        <h2 className="mb-4 text-lg font-semibold">Product Details</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Name"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g. Digital Marketing Course"
              required
            />
            <Input
              label="Slug"
              value={slug}
              onChange={(e) => handleSlugChange(e.target.value)}
              placeholder="digital-marketing-course"
              required
            />
          </div>

          <Textarea
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What the buyer gets"
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Price"
              type="number"
              min={0}
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="149.99"
              required
            />
            <div className="space-y-1">
              <Label>Currency</Label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-black focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-1"
              >
                <option value="NAD">NAD (Namibian Dollar)</option>
                <option value="ZAR">ZAR (South African Rand)</option>
              </select>
            </div>
          </div>

          {/* Regional Pricing */}
          <div className="border-t border-gray-100 pt-4 mt-2">
            <p className="text-sm font-semibold text-gray-700 mb-2">Regional Pricing (optional)</p>
            <p className="text-xs text-gray-500 mb-3">
              Set prices for other countries. Leave empty to use the base price above.
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="ZAR Price (South Africa)"
                type="number"
                min={0}
                step="0.01"
                value={regionalPricing.ZAR}
                onChange={(e) => setRegionalPricing({ ...regionalPricing, ZAR: e.target.value })}
                placeholder="149.99"
              />
              <Input
                label="BWP Price (Botswana)"
                type="number"
                min={0}
                step="0.01"
                value={regionalPricing.BWP}
                onChange={(e) => setRegionalPricing({ ...regionalPricing, BWP: e.target.value })}
                placeholder="129.99"
              />
            </div>
          </div>

          <ImageUpload
            label="Product Image"
            value={imageUrl}
            onChange={setImageUrl}
          />

          {productType === "digital" && (
            <Input
              label="Delivery URL"
              type="url"
              value={deliveryUrl}
              onChange={(e) => setDeliveryUrl(e.target.value)}
              placeholder="https://course.example.com/access"
            />
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Upsell URL (optional)"
              type="url"
              value={upsellUrl}
              onChange={(e) => setUpsellUrl(e.target.value)}
              placeholder="https://example.com/upsell"
            />
            <Input
              label="Back Redirect URL (optional)"
              type="url"
              value={backRedirectUrl}
              onChange={(e) => setBackRedirectUrl(e.target.value)}
              placeholder="https://example.com/back"
            />
          </div>
        </div>
      </Card>

      {/* Store info — shown for physical products, recommended for digital */}
      <Card>
        <h2 className="mb-1 text-lg font-semibold">Informações da Loja</h2>
        <p className="text-sm text-gray-500 mb-4">
          {productType === "physical"
            ? "Aparece no email de confirmação do pedido."
            : "Aparece no email de suporte ao comprador."}
        </p>
        <div className="space-y-4">
          <Input
            label="Nome da Loja"
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
            placeholder="Minha Loja"
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Email de Suporte"
              type="email"
              value={supportEmail}
              onChange={(e) => setSupportEmail(e.target.value)}
              placeholder="suporte@minhaloja.com"
            />
            <Input
              label="Telefone / WhatsApp de Suporte"
              value={supportPhone}
              onChange={(e) => setSupportPhone(e.target.value)}
              placeholder="+264 81 000 0000"
            />
          </div>
        </div>
      </Card>

      {/* Smart Recovery Funnel */}
      {mode === "edit" && (
        <Card>
          <h2 className="mb-4 text-lg font-semibold">Smart Recovery Funnel</h2>
          <div className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={remarketingEnabled}
                onChange={(e) => setRemarketingEnabled(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black"
              />
              <span className="text-sm font-medium text-gray-700">
                Enable smart recovery funnel
              </span>
            </label>
            <p className="text-xs text-gray-500">
              Send up to 3 recovery emails to buyers who didn&apos;t complete payment.
              Choose which offer to include in each email.
            </p>

            {remarketingEnabled && (
              <div className="space-y-3 border-t border-gray-100 pt-4">
                {[
                  { label: "Email 1 (30 min)", value: remarketingOffer1, setter: setRemarketingOffer1 },
                  { label: "Email 2 (24 hours)", value: remarketingOffer2, setter: setRemarketingOffer2 },
                  { label: "Email 3 (72 hours)", value: remarketingOffer3, setter: setRemarketingOffer3 },
                ].map((email) => (
                  <div key={email.label} className="grid grid-cols-1 gap-2 sm:grid-cols-2 items-center">
                    <Label>{email.label}</Label>
                    <select
                      value={email.value}
                      onChange={(e) => email.setter(e.target.value)}
                      className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-black focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-1"
                    >
                      <option value="">Original price</option>
                      {offers.map((offer) => (
                        <option key={offer.id} value={offer.id}>
                          {offer.name} ({(offer.price / 100).toFixed(2)})
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
                {offers.length === 0 && (
                  <p className="text-xs text-amber-600">
                    No offers created yet. Create offers first to assign them to recovery emails.
                  </p>
                )}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Order bumps */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Order Bumps</h2>
          <Button type="button" variant="secondary" size="sm" onClick={addOrderBump}>
            Add Order Bump
          </Button>
        </div>
        <div className="space-y-4">
          {orderBumps.map((bump, index) => (
            <OrderBumpForm
              key={index}
              index={index}
              data={bump}
              onChange={updateOrderBump}
              onRemove={removeOrderBump}
            />
          ))}
          {orderBumps.length === 0 && (
            <p className="text-sm text-gray-500">
              No order bumps. Click &quot;Add Order Bump&quot; to add one.
            </p>
          )}
        </div>
      </Card>

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

      {/* Submit */}
      <div className="flex gap-3">
        <Button type="submit" size="lg" disabled={submitting}>
          {submitting
            ? "Saving..."
            : mode === "create"
              ? "Create Product"
              : "Update Product"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="lg"
          onClick={() => router.push("/admin")}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
